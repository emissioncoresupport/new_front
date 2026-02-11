/**
 * BACKEND EVIDENCE MUTATION ENGINE - COMMAND HANDLER
 * 
 * SOLE AUTHORITY for Evidence state mutations.
 * Event-sourced, append-only, audit-grade.
 * 
 * Enforces:
 * - Strict state machine (RAW → CLASSIFIED → STRUCTURED)
 * - Role-based authorization
 * - Idempotency on command_id
 * - AI safety (human-in-loop required)
 * - Multi-tenant isolation
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// State machine definitions
const VALID_STATES = ['RAW', 'CLASSIFIED', 'STRUCTURED', 'REJECTED'];

const STATE_MACHINE = {
  RAW: ['CLASSIFIED', 'REJECTED'],
  CLASSIFIED: ['STRUCTURED', 'REJECTED'],
  STRUCTURED: [], // Terminal state
  REJECTED: [] // Terminal state
};

const COMMAND_TO_STATE = {
  ClassifyEvidenceCommand: 'CLASSIFIED',
  ApproveStructuringCommand: 'STRUCTURED',
  RejectEvidenceCommand: 'REJECTED'
};

const REQUIRED_ROLES = {
  ClassifyEvidenceCommand: ['admin', 'legal', 'compliance', 'procurement'],
  ApproveStructuringCommand: ['admin', 'legal', 'compliance'],
  RejectEvidenceCommand: ['admin', 'legal', 'compliance']
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ 
        error_code: 'UNAUTHORIZED',
        error_message: 'Authentication required',
        http_status: 401
      }, { status: 401 });
    }

    // Parse command
    const command = await req.json();
    
    // Validate command structure
    const validationError = validateCommandStructure(command);
    if (validationError) {
      await emitBlockedEvent(base44, command, validationError, user);
      return Response.json({
        error_code: 'INVALID_COMMAND',
        error_message: validationError.message,
        validation_errors: validationError.errors,
        http_status: 400
      }, { status: 400 });
    }

    // Check idempotency - if command_id already processed, return original event
    const existingEvent = await checkIdempotency(base44, command.command_id, command.tenant_id);
    if (existingEvent) {
      return Response.json({
        event_id: existingEvent.id,
        event_type: existingEvent.event_type,
        previous_state: existingEvent.previous_state,
        new_state: existingEvent.new_state,
        timestamp: existingEvent.timestamp,
        sequence_number: existingEvent.sequence_number,
        idempotent: true
      });
    }

    // Load current Evidence state
    const evidence = await loadEvidenceState(base44, command.evidence_id, command.tenant_id);
    if (!evidence) {
      await emitBlockedEvent(base44, command, { 
        code: 'EVIDENCE_NOT_FOUND',
        message: 'Evidence record not found'
      }, user);
      return Response.json({
        error_code: 'EVIDENCE_NOT_FOUND',
        error_message: 'Evidence record not found',
        http_status: 404
      }, { status: 404 });
    }

    // Enforce multi-tenant isolation
    if (evidence.tenant_id !== command.tenant_id) {
      await emitBlockedEvent(base44, command, {
        code: 'TENANT_MISMATCH',
        message: 'Cross-tenant command rejected'
      }, user);
      return Response.json({
        error_code: 'TENANT_MISMATCH',
        error_message: 'Cross-tenant operations forbidden',
        http_status: 403
      }, { status: 403 });
    }

    // Validate actor authorization
    const authError = validateAuthorization(command, user);
    if (authError) {
      await emitBlockedEvent(base44, command, authError, user);
      return Response.json({
        error_code: 'UNAUTHORIZED_ROLE',
        error_message: authError.message,
        http_status: 403
      }, { status: 403 });
    }

    // Validate state machine transition
    const targetState = COMMAND_TO_STATE[command.command_type];
    const transitionError = validateStateTransition(evidence.state, targetState);
    if (transitionError) {
      await emitBlockedEvent(base44, command, transitionError, user);
      return Response.json({
        error_code: 'INVALID_STATE_TRANSITION',
        error_message: transitionError.message,
        blocked_reason: transitionError.reason,
        current_state: evidence.state,
        attempted_state: targetState,
        http_status: 409
      }, { status: 409 });
    }

    // Validate AI safety constraints
    const aiSafetyError = validateAISafety(command);
    if (aiSafetyError) {
      await emitBlockedEvent(base44, command, aiSafetyError, user);
      return Response.json({
        error_code: 'AI_SAFETY_VIOLATION',
        error_message: aiSafetyError.message,
        http_status: 403
      }, { status: 403 });
    }

    // Validate payload schema
    const payloadError = validatePayloadSchema(command);
    if (payloadError) {
      await emitBlockedEvent(base44, command, payloadError, user);
      return Response.json({
        error_code: 'INVALID_PAYLOAD',
        error_message: payloadError.message,
        validation_errors: payloadError.errors,
        http_status: 400
      }, { status: 400 });
    }

    // EMIT EVENT (append-only)
    const event = await emitEvent(base44, command, evidence, user, targetState);

    // Update Evidence projection (derived from event)
    await updateEvidenceProjection(base44, evidence.id, targetState, event);

    // Return success
    return Response.json({
      event_id: event.id,
      event_type: event.event_type,
      previous_state: evidence.state,
      new_state: targetState,
      timestamp: event.timestamp,
      sequence_number: event.sequence_number
    });

  } catch (error) {
    console.error('Command processing error:', error);
    return Response.json({
      error_code: 'INTERNAL_ERROR',
      error_message: error.message,
      http_status: 500
    }, { status: 500 });
  }
});

// ===== VALIDATION FUNCTIONS =====

function validateCommandStructure(command) {
  const errors = [];
  
  if (!command.command_id) errors.push('command_id required');
  if (!command.command_type) errors.push('command_type required');
  if (!command.tenant_id) errors.push('tenant_id required');
  if (!command.evidence_id) errors.push('evidence_id required');
  if (!command.actor_id) errors.push('actor_id required');
  if (!command.actor_role) errors.push('actor_role required');
  if (!command.issued_at) errors.push('issued_at required');
  if (!command.payload) errors.push('payload required');
  
  if (!['ClassifyEvidenceCommand', 'ApproveStructuringCommand', 'RejectEvidenceCommand'].includes(command.command_type)) {
    errors.push('Invalid command_type');
  }
  
  if (errors.length > 0) {
    return { message: 'Invalid command structure', errors };
  }
  return null;
}

function validateAuthorization(command, user) {
  const requiredRoles = REQUIRED_ROLES[command.command_type];
  if (!requiredRoles.includes(user.role)) {
    return {
      code: 'UNAUTHORIZED_ROLE',
      message: `Role '${user.role}' not authorized for ${command.command_type}`,
      reason: `Required roles: ${requiredRoles.join(', ')}`
    };
  }
  return null;
}

function validateStateTransition(currentState, targetState) {
  if (!VALID_STATES.includes(targetState)) {
    return {
      code: 'INVALID_TARGET_STATE',
      message: `Invalid target state: ${targetState}`,
      reason: `Valid states: ${VALID_STATES.join(', ')}`
    };
  }
  
  const allowedTransitions = STATE_MACHINE[currentState];
  if (!allowedTransitions.includes(targetState)) {
    return {
      code: 'FORBIDDEN_TRANSITION',
      message: `Cannot transition from ${currentState} to ${targetState}`,
      reason: `Allowed transitions from ${currentState}: ${allowedTransitions.join(', ') || 'none (terminal state)'}`
    };
  }
  
  return null;
}

function validateAISafety(command) {
  if (command.command_type === 'ApproveStructuringCommand') {
    const { extraction_source } = command.payload;
    
    // AI-only structuring forbidden
    if (extraction_source === 'ai_suggestion' && !command.payload.approver_role) {
      return {
        code: 'AI_ONLY_FORBIDDEN',
        message: 'AI-only structuring forbidden - human approver required',
        reason: 'extraction_source=ai_suggestion requires explicit human approver_role'
      };
    }
  }
  return null;
}

function validatePayloadSchema(command) {
  const errors = [];
  
  if (command.command_type === 'ClassifyEvidenceCommand') {
    const p = command.payload;
    if (!p.evidence_type) errors.push('payload.evidence_type required');
    if (!p.claimed_scope) errors.push('payload.claimed_scope required');
    if (!Array.isArray(p.claimed_frameworks)) errors.push('payload.claimed_frameworks must be array');
    if (!p.classifier_role) errors.push('payload.classifier_role required');
  }
  
  if (command.command_type === 'ApproveStructuringCommand') {
    const p = command.payload;
    if (!p.schema_type) errors.push('payload.schema_type required');
    if (!p.extracted_fields) errors.push('payload.extracted_fields required');
    if (!p.extraction_source) errors.push('payload.extraction_source required');
    if (!p.approver_role) errors.push('payload.approver_role required');
  }
  
  if (command.command_type === 'RejectEvidenceCommand') {
    const p = command.payload;
    if (!p.rejection_reason) errors.push('payload.rejection_reason required');
  }
  
  if (errors.length > 0) {
    return { message: 'Invalid payload schema', errors };
  }
  return null;
}

// ===== EVENT STORE FUNCTIONS =====

async function checkIdempotency(base44, command_id, tenant_id) {
  const events = await base44.asServiceRole.entities.LedgerEvent.filter({
    command_id,
    tenant_id
  });
  return events.length > 0 ? events[0] : null;
}

async function loadEvidenceState(base44, evidence_id, tenant_id) {
  const evidenceList = await base44.asServiceRole.entities.Evidence.filter({
    id: evidence_id,
    tenant_id
  });
  return evidenceList.length > 0 ? evidenceList[0] : null;
}

async function emitEvent(base44, command, evidence, user, targetState) {
  const eventType = {
    ClassifyEvidenceCommand: 'EvidenceClassified',
    ApproveStructuringCommand: 'EvidenceStructured',
    RejectEvidenceCommand: 'EvidenceRejected'
  }[command.command_type];

  // Get sequence number (count existing events + 1)
  const existingEvents = await base44.asServiceRole.entities.LedgerEvent.filter({
    evidence_id: command.evidence_id,
    tenant_id: command.tenant_id
  });
  const sequenceNumber = existingEvents.length + 1;

  const event = await base44.asServiceRole.entities.LedgerEvent.create({
    tenant_id: command.tenant_id,
    event_type: eventType,
    aggregate_type: 'Evidence',
    aggregate_id: command.evidence_id,
    command_id: command.command_id,
    actor_id: user.email,
    actor_role: user.role,
    payload: command.payload,
    previous_state: evidence.state,
    new_state: targetState,
    timestamp: new Date().toISOString(),
    sequence_number: sequenceNumber,
    schema_version: '1.0'
  });

  return event;
}

async function emitBlockedEvent(base44, command, error, user) {
  try {
    await base44.asServiceRole.entities.LedgerEvent.create({
      tenant_id: command.tenant_id || 'unknown',
      event_type: 'EvidenceStateTransitionBlocked',
      aggregate_type: 'Evidence',
      aggregate_id: command.evidence_id || 'unknown',
      command_id: command.command_id || crypto.randomUUID(),
      actor_id: user?.email || command.actor_id || 'unknown',
      actor_role: user?.role || command.actor_role || 'unknown',
      payload: {
        attempted_command: command.command_type,
        blocked_reason: error.code || error.error_code || 'UNKNOWN',
        blocked_message: error.message,
        blocked_details: error.reason || error.errors
      },
      previous_state: null,
      new_state: null,
      timestamp: new Date().toISOString(),
      schema_version: '1.0'
    });
  } catch (err) {
    console.error('Failed to emit blocked event:', err);
  }
}

async function updateEvidenceProjection(base44, evidenceId, newState, event) {
  // Update Evidence entity (projection derived from event)
  await base44.asServiceRole.entities.Evidence.update(evidenceId, {
    state: newState,
    // Append to state_history
    state_history: {
      from_state: event.previous_state,
      to_state: newState,
      transitioned_at: event.timestamp,
      transitioned_by: event.actor_id,
      reason: event.event_type
    }
  });
}