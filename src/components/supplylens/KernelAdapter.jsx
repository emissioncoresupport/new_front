/**
 * Evidence Engine Adapter - Server Authoritative
 * 
 * Abstraction layer for evidence ingestion backend.
 * UI calls only these functions. When migrating to external backend,
 * swap Base44 function calls with HTTP fetch to backend endpoints.
 * 
 * CONTRACT VERSION: contract_ingest_v1
 * BUILD VERSIONING: All responses include build_id + contract_version
 * 
 * INTERNAL NAMING: Function names prefixed with "kernel_" are internal implementation details.
 * User-facing UI displays all operations as "Draft Management" or "Evidence Sealing".
 * No "kernel" terminology should ever appear in user-facing UI text, error messages, or labels.
 */

import { base44 } from '@/api/base44Client';

const CLIENT_BUILD_ID = import.meta.env.VITE_BUILD_ID || 'dev-local';
export const CONTRACT_VERSION = 'contract_ingest_v1';

/**
 * Create draft
 * @param {object} declaration - Draft metadata
 * @returns {Promise<{draft_id, correlation_id} | {error_code, message, field_errors, correlation_id}>}
 */
export async function kernel_createDraft(declaration, correlationId = null) {
  const cid = correlationId || `CREATE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  try {
    const res = await base44.functions.invoke('kernelCreateDraft', { declaration });
    
    if (res.data?.error_code) {
      return {
        error_code: res.data.error_code,
        message: res.data.message,
        field_errors: res.data.field_errors || [],
        correlation_id: res.data.correlation_id
      };
    }
    
    return {
      draft_id: res.data.draft_id,
      status: res.data.status,
      correlation_id: res.data.correlation_id,
      build_id: res.data.build_id || 'unknown',
      contract_version: res.data.contract_version || CONTRACT_VERSION
    };
  } catch (error) {
    return {
      error_code: 'SYSTEM_ERROR',
      message: error.message,
      field_errors: error.response?.data?.field_errors || [],
      correlation_id: error.response?.data?.correlation_id || null
    };
  }
}

/**
 * Update draft
 * @param {string} draft_id - Draft ID (REQUIRED - must be valid, non-empty string)
 * @param {object} patch - Fields to update
 * @returns {Promise<{draft_id, updated_at_utc, correlation_id} | {error_code, message, field_errors, correlation_id}>}
 */
export async function kernel_updateDraft(draft_id, patch) {
  // CRITICAL: Validate draftId before making backend call
  if (!draft_id || draft_id === 'undefined' || draft_id === 'null' || typeof draft_id !== 'string' || draft_id.trim().length === 0) {
    console.error('[EvidenceEngine] kernel_updateDraft called with invalid draft_id:', draft_id);
    return {
      error_code: 'INVALID_DRAFT_ID',
      message: 'Draft ID is missing or invalid. Cannot update draft.',
      field_errors: [{ field: 'draft_id', message: 'Draft ID is required and must be a valid string' }],
      correlation_id: `ERR_${Date.now()}`
    };
  }

  try {
    const res = await base44.functions.invoke('kernelUpdateDraft', { draft_id, patch });
    
    if (res.data?.error_code) {
      return {
        error_code: res.data.error_code,
        message: res.data.message,
        field_errors: res.data.field_errors || [],
        correlation_id: res.data.correlation_id
      };
    }
    
    return {
      draft_id: res.data.draft_id,
      updated_at_utc: res.data.updated_at_utc,
      correlation_id: res.data.correlation_id,
      build_id: res.data.build_id || 'unknown',
      contract_version: res.data.contract_version || CONTRACT_VERSION
    };
  } catch (error) {
    return {
      error_code: 'SYSTEM_ERROR',
      message: error.message || 'Network error during draft update',
      field_errors: error.response?.data?.field_errors || [],
      correlation_id: error.response?.data?.correlation_id || `NET_ERR_${Date.now()}`
    };
  }
}

/**
 * Attach file to draft
 * @param {string} draft_id - Draft ID (REQUIRED - must be valid, non-empty string)
 * @param {File} file - File to attach
 * @returns {Promise<{attachment_id, filename, size_bytes, content_type, sha256, storage_ref, correlation_id} | {error_code, message, field_errors, correlation_id}>}
 */
export async function kernel_attachFile(draft_id, file) {
  // CRITICAL: Validate draftId before making backend call
  if (!draft_id || draft_id === 'undefined' || draft_id === 'null' || typeof draft_id !== 'string' || draft_id.trim().length === 0) {
    console.error('[EvidenceEngine] kernel_attachFile called with invalid draft_id:', draft_id);
    return {
      error_code: 'INVALID_DRAFT_ID',
      message: 'Draft ID is missing or invalid. Cannot attach file.',
      field_errors: [{ field: 'draft_id', message: 'Draft ID is required and must be a valid string' }],
      correlation_id: `ERR_${Date.now()}`
    };
  }

  try {
    const formData = new FormData();
    formData.append('draft_id', draft_id);
    formData.append('file', file);
    
    const res = await base44.functions.invoke('kernelAttachFile', formData);
    
    if (res.data?.error_code) {
      return {
        error_code: res.data.error_code,
        message: res.data.message,
        field_errors: res.data.field_errors || [],
        correlation_id: res.data.correlation_id
      };
    }
    
    return {
      attachment_id: res.data.attachment_id,
      filename: res.data.filename,
      size_bytes: res.data.size_bytes,
      content_type: res.data.content_type,
      sha256: res.data.sha256,
      storage_ref: res.data.storage_ref,
      correlation_id: res.data.correlation_id,
      build_id: res.data.build_id || 'unknown',
      contract_version: res.data.contract_version || CONTRACT_VERSION
    };
  } catch (error) {
    return {
      error_code: 'SYSTEM_ERROR',
      message: error.message || 'Network error during file attachment',
      field_errors: error.response?.data?.field_errors || [],
      correlation_id: error.response?.data?.correlation_id || `NET_ERR_${Date.now()}`
    };
  }
}

/**
 * Simulate file attachment (Simulation Mode)
 * @param {string} draft_id - Draft ID
 * @param {string} filename - File name
 * @param {string} content_type - MIME type
 * @param {number} size_bytes - File size
 * @returns {Promise<{attachment_id, sha256, simulated, correlation_id} | {error_code}>}
 */
export async function kernel_simulateAttachFile(draft_id, filename, content_type, size_bytes) {
  try {
    const res = await base44.functions.invoke('simulateAttachFileToDraft', {
      draft_id,
      filename,
      content_type,
      size_bytes
    });
    
    if (res.data?.error_code) {
      return {
        error_code: res.data.error_code,
        message: res.data.message,
        field_errors: res.data.field_errors || [],
        correlation_id: res.data.correlation_id
      };
    }
    
    return {
      attachment_id: res.data.attachment_id || res.data.file_id,
      filename: res.data.filename,
      size_bytes: res.data.size_bytes,
      content_type: res.data.content_type,
      sha256: res.data.sha256 || res.data.payload_hash_sha256,
      storage_ref: res.data.storage_ref,
      simulated: true,
      correlation_id: res.data.correlation_id,
      build_id: res.data.build_id || 'unknown',
      contract_version: res.data.contract_version || CONTRACT_VERSION
    };
  } catch (error) {
    return {
      error_code: 'SYSTEM_ERROR',
      message: error.message,
      field_errors: error.response?.data?.field_errors || [],
      correlation_id: error.response?.data?.correlation_id || null
    };
  }
}

/**
 * Attach raw payload to draft (DEPRECATED for MANUAL_ENTRY)
 * 
 * CRITICAL: DO NOT use this for MANUAL_ENTRY.
 * For MANUAL_ENTRY, store JSON in draft.manual_json_data and let server hash at seal time.
 * This function is for other methods that need raw payload attachment.
 * 
 * @param {string} draft_id - Draft ID (REQUIRED - must be valid, non-empty string)
 * @param {string} payload_text - Raw payload text
 * @returns {Promise<{attachment_id, sha256, correlation_id} | {error_code, message, field_errors, correlation_id}>}
 */
export async function kernel_attachPayload(draft_id, payload_text) {
  // CRITICAL: Validate draftId before making backend call
  if (!draft_id || draft_id === 'undefined' || draft_id === 'null' || typeof draft_id !== 'string' || draft_id.trim().length === 0) {
    console.error('[EvidenceEngine] kernel_attachPayload called with invalid draft_id:', draft_id);
    return {
      error_code: 'INVALID_DRAFT_ID',
      message: 'Draft ID is missing or invalid. Cannot attach payload.',
      field_errors: [{ field: 'draft_id', message: 'Draft ID is required and must be a valid string' }],
      correlation_id: `ERR_${Date.now()}`
    };
  }

  try {
    const res = await base44.functions.invoke('kernelAttachRawPayload', { draft_id, payload_text });
    
    if (res.data?.error_code) {
      return {
        error_code: res.data.error_code,
        message: res.data.message,
        field_errors: res.data.field_errors || [],
        correlation_id: res.data.correlation_id
      };
    }
    
    return {
      attachment_id: res.data.attachment_id,
      attachment_kind: res.data.attachment_kind,
      size_bytes: res.data.size_bytes,
      sha256: res.data.sha256,
      storage_ref: res.data.storage_ref,
      correlation_id: res.data.correlation_id,
      build_id: res.data.build_id || 'unknown',
      contract_version: res.data.contract_version || CONTRACT_VERSION
    };
  } catch (error) {
    return {
      error_code: 'SYSTEM_ERROR',
      message: error.message || 'Network error during payload attachment',
      field_errors: error.response?.data?.field_errors || [],
      correlation_id: error.response?.data?.correlation_id || `NET_ERR_${Date.now()}`
    };
  }
}

/**
 * Get draft snapshot (server-authoritative)
 * @param {string} draft_id - Draft ID
 * @returns {Promise<{draft, attachments, can_seal, missing_fields, field_errors, correlation_id} | {error_code, message, field_errors, correlation_id}>}
 */
export async function kernel_getDraft(draft_id) {
  try {
    const res = await base44.functions.invoke('kernelGetDraftSnapshot', { draft_id });
    
    if (res.data?.error_code) {
      return {
        error_code: res.data.error_code,
        message: res.data.message,
        field_errors: res.data.field_errors || [],
        correlation_id: res.data.correlation_id,
        build_id: res.data.build_id || 'unknown',
        contract_version: res.data.contract_version || CONTRACT_VERSION
      };
    }
    
    return {
      draft: res.data.draft,
      attachments: res.data.attachments,
      can_seal: res.data.can_seal,
      missing_fields: res.data.missing_fields || [],
      field_errors: res.data.field_errors || [],
      validation_errors: res.data.validation_errors || [],
      correlation_id: res.data.correlation_id,
      build_id: res.data.build_id || 'unknown',
      contract_version: res.data.contract_version || CONTRACT_VERSION
    };
  } catch (error) {
    return {
      error_code: 'SYSTEM_ERROR',
      message: error.message,
      field_errors: error.response?.data?.field_errors || [],
      correlation_id: error.response?.data?.correlation_id || null,
      build_id: 'error',
      contract_version: CONTRACT_VERSION
    };
  }
}

/**
 * Get draft for seal (Step 3 canonical endpoint)
 * @param {string} draft_id - Draft ID (REQUIRED - must be valid, non-empty string)
 * @returns {Promise<{draft_id, metadata, files, validation, correlation_id} | {error_code, message, field_errors, correlation_id}>}
 */
export async function kernel_getDraftForSeal(draft_id) {
  // CRITICAL: Validate draftId before making backend call
  if (!draft_id || draft_id === 'undefined' || draft_id === 'null' || typeof draft_id !== 'string' || draft_id.trim().length === 0) {
    console.error('[EvidenceEngine] kernel_getDraftForSeal called with invalid draft_id:', draft_id);
    return {
      error_code: 'INVALID_DRAFT_ID',
      message: 'Draft ID is missing or invalid. Cannot retrieve draft for seal.',
      field_errors: [{ field: 'draft_id', message: 'Draft ID is required and must be a valid string' }],
      correlation_id: `ERR_${Date.now()}`,
      build_id: 'validation-error',
      contract_version: CONTRACT_VERSION
    };
  }

  try {
    const res = await base44.functions.invoke('kernelGetDraftForSeal', { draft_id });
    
    if (res.data?.error_code) {
      return {
        error_code: res.data.error_code,
        message: res.data.message,
        field_errors: res.data.field_errors || [],
        correlation_id: res.data.correlation_id,
        build_id: res.data.build_id || 'unknown',
        contract_version: res.data.contract_version || CONTRACT_VERSION
      };
    }
    
    return {
      draft_id: res.data.draft_id,
      metadata: res.data.metadata,
      files: res.data.files || [],
      validation: res.data.validation || { ready_to_seal: false, missing_fields: [] },
      correlation_id: res.data.correlation_id,
      build_id: res.data.build_id || 'unknown',
      contract_version: res.data.contract_version || CONTRACT_VERSION
    };
  } catch (error) {
    return {
      error_code: 'SYSTEM_ERROR',
      message: error.message || 'Network error retrieving draft for seal',
      field_errors: error.response?.data?.field_errors || [],
      correlation_id: error.response?.data?.correlation_id || `NET_ERR_${Date.now()}`,
      build_id: 'error',
      contract_version: CONTRACT_VERSION
    };
  }
}

/**
 * Seal draft (hardened)
 * @param {string} draft_id - Draft ID (REQUIRED - must be valid, non-empty string)
 * @returns {Promise<{evidence_id, ledger_state, hashes, retention_ends_utc} | {error_code}>}
 */
export async function kernel_sealDraftHardened(draft_id) {
  // CRITICAL: Validate draftId before making backend call
  if (!draft_id || draft_id === 'undefined' || draft_id === 'null' || typeof draft_id !== 'string' || draft_id.trim().length === 0) {
    console.error('[EvidenceEngine] kernel_sealDraftHardened called with invalid draft_id:', draft_id);
    return {
      error_code: 'INVALID_DRAFT_ID',
      message: 'Draft ID is missing or invalid. Cannot seal draft.',
      field_errors: [{ field: 'draft_id', message: 'Draft ID is required and must be a valid string' }],
      correlation_id: `ERR_${Date.now()}`,
      build_id: 'validation-error',
      contract_version: CONTRACT_VERSION
    };
  }

  try {
    const res = await base44.functions.invoke('ingestKernelSealHardened', { draft_id });
    
    if (res.data?.error_code) {
      return {
        error_code: res.data.error_code,
        message: res.data.message,
        field_errors: res.data.field_errors || [],
        correlation_id: res.data.correlation_id,
        build_id: res.data.build_id || 'unknown',
        contract_version: res.data.contract_version || CONTRACT_VERSION
      };
    }
    
    return {
      evidence_id: res.data.evidence_id,
      ledger_state: res.data.ledger_state,
      payload_hash_sha256: res.data.payload_hash_sha256,
      metadata_hash_sha256: res.data.metadata_hash_sha256,
      sealed_at_utc: res.data.sealed_at_utc,
      retention_ends_utc: res.data.retention_ends_utc,
      trust_level: res.data.trust_level,
      review_status: res.data.review_status || 'PENDING_REVIEW',
      quarantine_reason: res.data.quarantine_reason || null,
      correlation_id: res.data.correlation_id,
      build_id: res.data.build_id || 'unknown',
      contract_version: res.data.contract_version || CONTRACT_VERSION
    };
  } catch (error) {
    return {
      error_code: 'SYSTEM_ERROR',
      message: error.message || 'Network error occurred during seal operation',
      field_errors: error.response?.data?.field_errors || [],
      correlation_id: error.response?.data?.correlation_id || `NET_ERR_${Date.now()}`,
      build_id: 'error',
      contract_version: CONTRACT_VERSION
    };
  }
}

/**
 * Seal draft (finalize evidence)
 * @param {string} draft_id - Draft ID
 * @returns {Promise<{evidence_id, ledger_state, payload_hash_sha256, metadata_hash_sha256, sealed_at_utc, retention_ends_utc, trust_level, review_status, correlation_id} | {error_code, message, field_errors, correlation_id}>}
 */
export async function kernel_sealDraft(draft_id) {
  try {
    const res = await base44.functions.invoke('kernelSealDraft', { draft_id });
    
    if (res.data?.error_code) {
      return {
        error_code: res.data.error_code,
        message: res.data.message,
        field_errors: res.data.field_errors || [],
        correlation_id: res.data.correlation_id
      };
    }
    
    return {
      evidence_id: res.data.evidence_id,
      ledger_state: res.data.ledger_state,
      payload_hash_sha256: res.data.payload_hash_sha256,
      metadata_hash_sha256: res.data.metadata_hash_sha256,
      sealed_at_utc: res.data.sealed_at_utc,
      retention_ends_utc: res.data.retention_ends_utc,
      trust_level: res.data.trust_level,
      review_status: res.data.review_status || 'PENDING_REVIEW',
      quarantine_reason: res.data.quarantine_reason || null,
      correlation_id: res.data.correlation_id,
      build_id: res.data.build_id || 'unknown',
      contract_version: res.data.contract_version || CONTRACT_VERSION
    };
  } catch (error) {
    return {
      error_code: 'SYSTEM_ERROR',
      message: error.message,
      field_errors: error.response?.data?.field_errors || [],
      correlation_id: error.response?.data?.correlation_id || null
    };
  }
}