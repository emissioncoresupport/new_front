/**
 * BACKEND COMMAND SERVICE - ZERO TRUST WIRING
 * 
 * Base44 acts as CLIENT ONLY.
 * Backend is sole authority for mutations.
 * No optimistic updates.
 * No local fallbacks.
 * No state caching.
 * 
 * All endpoints are EXTERNAL and authoritative.
 */

import { base44 } from '@/api/base44Client';

// Backend endpoint configuration
const BACKEND_ENDPOINTS = {
  // WRITE (Commands)
  CLASSIFY_EVIDENCE: '/commands/classify-evidence',
  APPROVE_STRUCTURING: '/commands/approve-structuring',
  REJECT_EVIDENCE: '/commands/reject-evidence',
  
  // READ (Projections)
  GET_EVIDENCE: '/evidence',
  GET_EVIDENCE_HISTORY: '/evidence/{evidence_id}/history',
  GET_EVIDENCE_AUDIT: '/evidence/{evidence_id}/audit'
};

/**
 * Submit classification command to backend
 * Returns ACCEPTED or REJECTED
 */
export async function submitClassificationCommand(payload) {
  try {
    const response = await base44.functions.invoke('submitEvidenceCommand', {
      command_type: 'ClassifyEvidenceCommand',
      endpoint: BACKEND_ENDPOINTS.CLASSIFY_EVIDENCE,
      ...payload
    });

    return parseBackendResponse(response);
  } catch (error) {
    return handleBackendError(error);
  }
}

/**
 * Submit structuring approval command to backend
 * Returns ACCEPTED or REJECTED
 */
export async function submitStructuringCommand(payload) {
  try {
    const response = await base44.functions.invoke('submitEvidenceCommand', {
      command_type: 'ApproveStructuringCommand',
      endpoint: BACKEND_ENDPOINTS.APPROVE_STRUCTURING,
      ...payload
    });

    return parseBackendResponse(response);
  } catch (error) {
    return handleBackendError(error);
  }
}

/**
 * Submit rejection command to backend
 * Returns ACCEPTED or REJECTED
 */
export async function submitRejectionCommand(payload) {
  try {
    const response = await base44.functions.invoke('submitEvidenceCommand', {
      command_type: 'RejectEvidenceCommand',
      endpoint: BACKEND_ENDPOINTS.REJECT_EVIDENCE,
      ...payload
    });

    return parseBackendResponse(response);
  } catch (error) {
    return handleBackendError(error);
  }
}

/**
 * Get Evidence current state from backend projection
 * AUTHORITATIVE SOURCE ONLY
 */
export async function getEvidenceState(evidenceId) {
  try {
    const response = await base44.functions.invoke('getEvidenceState', {
      evidence_id: evidenceId,
      endpoint: `${BACKEND_ENDPOINTS.GET_EVIDENCE}/${evidenceId}`
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      error_code: 'READ_FAILED'
    };
  }
}

/**
 * Get Evidence event history from backend
 * AUTHORITATIVE SOURCE ONLY
 */
export async function getEvidenceHistory(evidenceId) {
  try {
    const response = await base44.functions.invoke('getEvidenceHistory', {
      evidence_id: evidenceId,
      endpoint: BACKEND_ENDPOINTS.GET_EVIDENCE_HISTORY.replace('{evidence_id}', evidenceId)
    });

    return {
      success: true,
      events: response.data.events || []
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      events: []
    };
  }
}

/**
 * Parse backend response into standard format
 */
function parseBackendResponse(response) {
  const data = response.data;

  // ACCEPTED - event emitted
  if (data.event_id && data.event_type) {
    return {
      status: 'ACCEPTED',
      event_id: data.event_id,
      event_type: data.event_type,
      previous_state: data.previous_state,
      new_state: data.new_state,
      timestamp: data.timestamp,
      sequence_number: data.sequence_number
    };
  }

  // REJECTED - validation or invariant violation
  if (data.error_code) {
    return {
      status: 'REJECTED',
      error_code: data.error_code,
      error_message: data.error_message,
      validation_errors: data.validation_errors || [],
      blocked_event_id: data.blocked_event_id,
      blocked_reason: data.blocked_reason,
      http_status: data.http_status
    };
  }

  // PARTIAL or UNKNOWN - treat as error
  return {
    status: 'ERROR',
    error_message: 'Backend returned unexpected response format',
    raw_response: data
  };
}

/**
 * Handle backend errors (network, timeout, 5xx)
 */
function handleBackendError(error) {
  // HTTP status-based handling
  if (error.response) {
    const status = error.response.status;

    // 4xx - client error (validation, authorization)
    if (status >= 400 && status < 500) {
      return {
        status: 'REJECTED',
        error_code: error.response.data?.error_code || 'CLIENT_ERROR',
        error_message: error.response.data?.error_message || error.message,
        validation_errors: error.response.data?.validation_errors || [],
        http_status: status
      };
    }

    // 5xx - server error
    if (status >= 500) {
      return {
        status: 'ERROR',
        error_code: 'BACKEND_UNAVAILABLE',
        error_message: 'Backend mutation engine unavailable. Command not executed.',
        http_status: status
      };
    }
  }

  // Network timeout
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return {
      status: 'ERROR',
      error_code: 'TIMEOUT',
      error_message: 'Command submission timeout. Backend did not respond. Command execution status unknown.'
    };
  }

  // Function not found (backend not deployed)
  if (error.message.includes('not found') || error.message.includes('404')) {
    return {
      status: 'ERROR',
      error_code: 'BACKEND_NOT_DEPLOYED',
      error_message: 'Backend mutation engine not deployed. See Developer Console DCE-2026-C0-002.',
      console_reference: 'DCE-2026-C0-002'
    };
  }

  // Generic network error
  return {
    status: 'ERROR',
    error_code: 'NETWORK_ERROR',
    error_message: error.message || 'Unknown error connecting to backend'
  };
}

/**
 * Generate command_id for idempotency
 */
export function generateCommandId() {
  return crypto.randomUUID();
}

/**
 * Log command failure to Developer Console (if persistent logging enabled)
 */
export async function logCommandFailure(commandType, errorCode, errorMessage) {
  try {
    // Create audit log entry for command failure
    await base44.entities.AuditLogEntry.create({
      entity_type: 'Evidence',
      action: `${commandType}_FAILED`,
      actor_id: (await base44.auth.me()).email,
      actor_role: (await base44.auth.me()).role,
      action_timestamp: new Date().toISOString(),
      details: {
        error_code: errorCode,
        error_message: errorMessage,
        backend_wiring: 'EXTERNAL_COMMAND_API'
      }
    });
  } catch (error) {
    // Silent failure on logging - do not block UI
    console.error('Failed to log command failure:', error);
  }
}