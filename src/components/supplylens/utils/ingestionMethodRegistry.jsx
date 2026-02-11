/**
 * Contract 1 Ingestion Method Registry
 * Single source of truth for all ingestion method behaviors
 */

export const INGESTION_METHODS = {
  MANUAL_ENTRY: {
    id: 'MANUAL_ENTRY',
    label: 'Manual Entry',
    description: 'Structured data entry via forms',
    
    allowedEvidenceTypes: ['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM', 'CERTIFICATE', 'TEST_REPORT', 'TRANSACTION_LOG', 'OTHER'],
    allowedScopeTypes: ['PRODUCT_FAMILY', 'SKU', 'BOM', 'SUPPLIER', 'SITE', 'SHIPMENT', 'LEGAL_ENTITY', 'OTHER'],
    
    step1Required: [
      'evidence_type',
      'declared_scope',
      'scope_target',
      'why_this_evidence',
      'purpose_tags',
      'retention_policy',
      'contains_personal_data'
    ],
    
    step2Required: [
      'attestation_notes',
      'payload_data_json'
    ],
    
    forbiddenFields: [
      'file_uploader',
      'collaboration_submission_id',
      'supplier_portal_request_id',
      'payload_digest_sha256',
      'connector_id',
      'snapshot_datetime_utc'
    ],
    
    defaults: {
      trust_level: 'LOW',
      review_status: 'NOT_REVIEWED',
      source_system: 'Manual'
    },
    
    stepGating: {
      step1ToStep2: (draft) => {
        return draft?.evidence_type && 
               draft?.declared_scope && 
               (draft?.declared_scope === 'UNKNOWN' || draft?.scope_target) &&
               draft?.why_this_evidence?.length >= 20;
      },
      step2ToStep3: (draft) => {
        return draft?.attestation_notes?.length >= 20 && 
               draft?.payload_data_json;
      },
      canSeal: (draft, mode) => {
        return mode === 'production' && 
               draft?.status !== 'SEALED' &&
               draft?.attestation_notes?.length >= 20;
      }
    },
    
    hashBehavior: {
      computedBy: 'server',
      displayInStep2: false,
      displayInStep3: true,
      source: 'canonical_json',
      requiresAttachments: false
    }
  },

  FILE_UPLOAD: {
    id: 'FILE_UPLOAD',
    label: 'File Upload',
    description: 'Upload documents and files',
    
    allowedEvidenceTypes: ['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM', 'CERTIFICATE', 'TEST_REPORT', 'TRANSACTION_LOG', 'OTHER'],
    allowedScopeTypes: ['PRODUCT_FAMILY', 'SKU', 'BOM', 'SUPPLIER', 'SITE', 'SHIPMENT', 'LEGAL_ENTITY', 'OTHER'],
    
    step1Required: [
      'evidence_type',
      'declared_scope',
      'scope_target',
      'why_this_evidence',
      'purpose_tags',
      'retention_policy',
      'contains_personal_data'
    ],
    
    step2Required: [
      'attachments_min_1'
    ],
    
    forbiddenFields: [
      'payload_digest_sha256',
      'connector_id',
      'external_reference_id'
    ],
    
    defaults: {
      trust_level: 'MEDIUM',
      review_status: 'NOT_REVIEWED',
      source_system: 'File Upload'
    },
    
    stepGating: {
      step1ToStep2: (draft) => {
        return draft?.evidence_type && 
               draft?.declared_scope && 
               (draft?.declared_scope === 'UNKNOWN' || draft?.scope_target) &&
               draft?.why_this_evidence?.length >= 20;
      },
      step2ToStep3: (draft, attachments) => {
        return attachments?.length >= 1;
      },
      canSeal: (draft, mode, attachments) => {
        return mode === 'production' && 
               draft?.status !== 'SEALED' &&
               attachments?.length >= 1;
      }
    },
    
    hashBehavior: {
      computedBy: 'server',
      displayInStep2: true,
      displayInStep3: true,
      source: 'file_bytes',
      requiresAttachments: true
    }
  },

  API_PUSH_DIGEST: {
    id: 'API_PUSH_DIGEST',
    label: 'API Push Digest',
    description: 'External system pushes hash digest',
    
    allowedEvidenceTypes: ['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM', 'CERTIFICATE', 'TEST_REPORT', 'TRANSACTION_LOG', 'OTHER'],
    allowedScopeTypes: ['PRODUCT_FAMILY', 'SKU', 'BOM', 'SUPPLIER', 'SITE', 'SHIPMENT', 'LEGAL_ENTITY', 'OTHER'],
    
    step1Required: [
      'evidence_type',
      'declared_scope',
      'scope_target',
      'why_this_evidence',
      'purpose_tags',
      'retention_policy',
      'contains_personal_data',
      'external_reference_id'
    ],
    
    step2Required: [
      'payload_digest_sha256',
      'received_at_utc'
    ],
    
    forbiddenFields: [
      'file_uploader',
      'attestation_notes',
      'collaboration_submission_id'
    ],
    
    defaults: {
      trust_level: 'LOW',
      review_status: 'NOT_REVIEWED',
      source_system: 'API'
    },
    
    stepGating: {
      step1ToStep2: (draft) => {
        return draft?.evidence_type && 
               draft?.declared_scope && 
               (draft?.declared_scope === 'UNKNOWN' || draft?.scope_target) &&
               draft?.why_this_evidence?.length >= 20 &&
               draft?.external_reference_id;
      },
      step2ToStep3: (draft) => {
        return draft?.payload_digest_sha256?.length === 64 && 
               draft?.received_at_utc;
      },
      canSeal: (draft, mode) => {
        return mode === 'production' && 
               draft?.status !== 'SEALED' &&
               draft?.payload_digest_sha256?.length === 64;
      }
    },
    
    hashBehavior: {
      computedBy: 'external',
      displayInStep2: true,
      displayInStep3: true,
      source: 'provided_digest',
      requiresAttachments: false
    },
    
    idempotency: {
      enforced: true,
      key: 'external_reference_id',
      scope: 'tenant'
    }
  },

  ERP_EXPORT_FILE: {
    id: 'ERP_EXPORT_FILE',
    label: 'ERP Export File',
    description: 'Uploaded ERP export file',
    
    allowedEvidenceTypes: ['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM', 'TRANSACTION_LOG'],
    allowedScopeTypes: ['SUPPLIER', 'SITE', 'SKU', 'BOM', 'SHIPMENT', 'LEGAL_ENTITY'],
    
    step1Required: [
      'evidence_type',
      'declared_scope',
      'scope_target',
      'why_this_evidence',
      'purpose_tags',
      'retention_policy',
      'contains_personal_data'
    ],
    
    step2Required: [
      'attachments_min_1',
      'snapshot_datetime_utc',
      'erp_instance_name'
    ],
    
    forbiddenFields: [
      'payload_digest_sha256',
      'connector_id'
    ],
    
    defaults: {
      trust_level: 'HIGH',
      review_status: 'NOT_REVIEWED',
      source_system: 'ERP Export'
    },
    
    stepGating: {
      step1ToStep2: (draft) => {
        return draft?.evidence_type && 
               draft?.declared_scope && 
               (draft?.declared_scope === 'UNKNOWN' || draft?.scope_target) &&
               draft?.why_this_evidence?.length >= 20;
      },
      step2ToStep3: (draft, attachments) => {
        return attachments?.length >= 1 && 
               draft?.snapshot_datetime_utc &&
               draft?.erp_instance_name;
      },
      canSeal: (draft, mode, attachments) => {
        return mode === 'production' && 
               draft?.status !== 'SEALED' &&
               attachments?.length >= 1 &&
               draft?.snapshot_datetime_utc;
      }
    },
    
    hashBehavior: {
      computedBy: 'server',
      displayInStep2: true,
      displayInStep3: true,
      source: 'file_bytes',
      requiresAttachments: true
    }
  },

  ERP_API_PULL: {
    id: 'ERP_API_PULL',
    label: 'ERP API Pull',
    description: 'Real-time pull from ERP connector',
    
    allowedEvidenceTypes: ['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM', 'TRANSACTION_LOG'],
    allowedScopeTypes: ['SUPPLIER', 'SITE', 'SKU', 'BOM', 'SHIPMENT', 'LEGAL_ENTITY'],
    
    step1Required: [
      'evidence_type',
      'declared_scope',
      'scope_target',
      'why_this_evidence',
      'purpose_tags',
      'retention_policy',
      'contains_personal_data'
    ],
    
    step2Required: [
      'connector_id',
      'snapshot_datetime_utc',
      'sync_run_id'
    ],
    
    forbiddenFields: [
      'file_uploader',
      'attestation_notes',
      'payload_digest_sha256'
    ],
    
    defaults: {
      trust_level: 'HIGH',
      review_status: 'NOT_REVIEWED',
      source_system: 'ERP API'
    },
    
    stepGating: {
      step1ToStep2: (draft) => {
        return draft?.evidence_type && 
               draft?.declared_scope && 
               (draft?.declared_scope === 'UNKNOWN' || draft?.scope_target) &&
               draft?.why_this_evidence?.length >= 20;
      },
      step2ToStep3: (draft) => {
        return draft?.connector_id && 
               draft?.snapshot_datetime_utc &&
               draft?.sync_run_id;
      },
      canSeal: (draft, mode) => {
        return mode === 'production' && 
               draft?.status !== 'SEALED' &&
               draft?.connector_id &&
               draft?.snapshot_datetime_utc;
      }
    },
    
    hashBehavior: {
      computedBy: 'server',
      displayInStep2: false,
      displayInStep3: true,
      source: 'api_response_canonical',
      requiresAttachments: false
    }
  }
};

export const SUBMISSION_CHANNELS = {
  INTERNAL_USER: { id: 'INTERNAL_USER', label: 'Internal User', isDefault: true },
  SUPPLIER: { id: 'SUPPLIER', label: 'Supplier' },
  CONSULTANT: { id: 'CONSULTANT', label: 'Consultant' },
  SYSTEM: { id: 'SYSTEM', label: 'System' }
};

export const SCOPE_TYPES = {
  PRODUCT_FAMILY: { id: 'PRODUCT_FAMILY', label: 'Product Family', requiresTarget: true },
  SKU: { id: 'SKU', label: 'SKU', requiresTarget: true },
  BOM: { id: 'BOM', label: 'Bill of Materials', requiresTarget: true },
  SUPPLIER: { id: 'SUPPLIER', label: 'Supplier', requiresTarget: true },
  SITE: { id: 'SITE', label: 'Site/Facility', requiresTarget: true },
  SHIPMENT: { id: 'SHIPMENT', label: 'Shipment', requiresTarget: true },
  LEGAL_ENTITY: { id: 'LEGAL_ENTITY', label: 'Legal Entity', requiresTarget: true },
  OTHER: { id: 'OTHER', label: 'Other', requiresTarget: true },
  UNKNOWN: { id: 'UNKNOWN', label: 'Unknown/Unlinked', requiresTarget: false }
};

export function getMethodConfig(methodId) {
  return INGESTION_METHODS[methodId];
}

export function validateStep(methodId, step, draft, attachments = []) {
  const config = getMethodConfig(methodId);
  if (!config) return { valid: false, errors: ['Invalid method'] };

  const errors = [];

  if (step === 1) {
    config.step1Required.forEach(field => {
      if (field === 'scope_target') {
        if (draft?.declared_scope !== 'UNKNOWN' && !draft?.scope_target) {
          errors.push('Scope target is required for known scopes');
        }
      } else if (field === 'why_this_evidence') {
        if (!draft?.why_this_evidence || draft.why_this_evidence.length < 20) {
          errors.push('Purpose explanation must be at least 20 characters');
        }
      } else if (!draft?.[field]) {
        errors.push(`${field} is required`);
      }
    });
  }

  if (step === 2) {
    config.step2Required.forEach(field => {
      if (field === 'attachments_min_1' && attachments.length === 0) {
        errors.push('At least one file attachment is required');
      } else if (field === 'attestation_notes') {
        if (!draft?.attestation_notes || draft.attestation_notes.length < 20) {
          errors.push('Attestation notes must be at least 20 characters');
        }
      } else if (field === 'payload_digest_sha256') {
        if (!draft?.payload_digest_sha256 || draft.payload_digest_sha256.length !== 64) {
          errors.push('Valid 64-character hex digest required');
        }
      } else if (!draft?.[field]) {
        errors.push(`${field} is required`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

export function canProceedToNextStep(methodId, currentStep, draft, attachments = []) {
  const config = getMethodConfig(methodId);
  if (!config) return false;

  if (currentStep === 1) {
    return config.stepGating.step1ToStep2(draft);
  }
  
  if (currentStep === 2) {
    return config.stepGating.step2ToStep3(draft, attachments);
  }

  return false;
}

export function canSeal(methodId, draft, mode = 'production', attachments = []) {
  const config = getMethodConfig(methodId);
  if (!config) return false;
  
  return config.stepGating.canSeal(draft, mode, attachments);
}

export function shouldShowField(methodId, fieldName) {
  const config = getMethodConfig(methodId);
  if (!config) return false;
  
  return !config.forbiddenFields.includes(fieldName);
}