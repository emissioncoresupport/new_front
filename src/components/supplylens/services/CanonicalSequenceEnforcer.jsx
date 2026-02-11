/**
 * SupplyLens Canonical Sequence Enforcer
 * 
 * Prevents out-of-order operations and logs sequence violations.
 * Every page checks: "Am I authorized to run given current state?"
 */

export const CANONICAL_SEQUENCE = [
  { step: 1, name: 'OVERVIEW', page: 'SupplyLens', description: 'Action discovery' },
  { step: 2, name: 'EVIDENCE_CREATION', page: 'SupplyLensEvidenceCreation', description: 'Contextual upload' },
  { step: 3, name: 'EVIDENCE_STORAGE', page: 'SupplyLensEvidenceVault', description: 'Immutable vault' },
  { step: 4, name: 'STRUCTURING', page: 'SupplyLensStructuredEvidence', description: 'Discipline & schema' },
  { step: 5, name: 'MAPPING', page: 'SupplyLensMapping', description: 'Readiness assessment' },
  { step: 6, name: 'SUPPLIER_REQUESTS', page: 'SupplyLensRequests', description: 'Gap closure' },
  { step: 7, name: 'AUDIT_LOG', page: 'SupplyLensAuditLog', description: 'Legal memory' }
];

/**
 * Enforces that users enter SupplyLens ONLY through Overview
 * and follow the canonical sequence.
 */
export const enforceCanonicalEntry = (currentPage) => {
  const allowedFirstPages = ['SupplyLens'];
  
  if (!allowedFirstPages.includes(currentPage)) {
    console.warn(`[SEQUENCE] Direct entry to ${currentPage} bypasses Overview. Redirecting...`);
    return false;
  }
  return true;
};

/**
 * Validates that a user can perform an action based on Evidence state.
 * Maps Evidence state to allowed next steps.
 */
export const getNextAllowedSteps = (evidenceState) => {
  const stateMap = {
    'RAW': ['STRUCTURING'], // RAW → must classify/structure
    'CLASSIFIED': ['STRUCTURING', 'MAPPING'], // CLASSIFIED → can structure or evaluate mapping
    'STRUCTURED': ['MAPPING', 'SUPPLIER_REQUESTS'], // STRUCTURED → can evaluate mapping or request data
    'REJECTED': ['EVIDENCE_CREATION'] // REJECTED → create new evidence
  };
  return stateMap[evidenceState] || [];
};

/**
 * Determines if an Evidence is "stuck" and needs intervention.
 */
export const detectStuckEvidence = (evidence) => {
  if (evidence.state === 'RAW') {
    const hoursOld = (Date.now() - new Date(evidence.uploaded_at)) / (1000 * 60 * 60);
    if (hoursOld > 24) {
      return { stuck: true, reason: 'RAW for > 24 hours', action: 'CLASSIFY' };
    }
  }
  if (evidence.state === 'CLASSIFIED') {
    const hoursOld = (Date.now() - new Date(evidence.uploaded_at)) / (1000 * 60 * 60);
    if (hoursOld > 48) {
      return { stuck: true, reason: 'CLASSIFIED for > 48 hours', action: 'STRUCTURE' };
    }
  }
  return { stuck: false };
};

/**
 * Ownership model: defines who can perform which action
 */
export const OWNERSHIP_MODEL = {
  'internal_user': {
    can: [
      'upload_evidence',
      'classify_evidence',
      'structure_evidence',
      'request_supplier_data',
      'evaluate_mapping',
      'view_audit_log',
      'reject_evidence'
    ],
    cannot: [
      'modify_evidence_file',
      'delete_evidence',
      'merge_canonical_data',
      'override_audit_log'
    ]
  },
  'supplier': {
    can: [
      'submit_evidence_response',
      'view_request_details',
      'track_response_status'
    ],
    cannot: [
      'upload_arbitrary_evidence',
      'view_mapping',
      'view_compliance_logic',
      'see_canonical_data'
    ]
  },
  'system': {
    can: [
      'enforce_sequence',
      'enforce_immutability',
      'log_audit_trail',
      'validate_schema',
      'transition_state'
    ],
    cannot: [
      'bypass_audit_log',
      'delete_evidence',
      'approve_mappings_silently'
    ]
  }
};

/**
 * AI usage restrictions: what AI can and cannot do
 */
export const AI_CONSTRAINTS = {
  can: [
    'suggest_classification',
    'suggest_field_extraction',
    'detect_duplicates',
    'flag_anomalies',
    'recommend_mapping'
  ],
  cannot: [
    'change_evidence_state',
    'approve_structure',
    'create_canonical_data',
    'resolve_conflicts_silently',
    'bypass_user_decision'
  ],
  must_label: 'SUGGESTION — NOT APPLIED'
};

/**
 * Immutability enforcement: which fields can never change
 */
export const IMMUTABLE_EVIDENCE_FIELDS = [
  'file_url',
  'file_hash_sha256',
  'file_hash_sha512',
  'file_size_bytes',
  'uploaded_at',
  'hashed_at',
  'created_by',
  'tenant_id'
];

/**
 * Validates that a field update respects immutability rules
 */
export const validateImmutability = (field, evidenceState) => {
  if (IMMUTABLE_EVIDENCE_FIELDS.includes(field)) {
    return { allowed: false, reason: `Field '${field}' is immutable post-creation` };
  }
  // State transitions have rules
  if (field === 'state') {
    const validTransitions = {
      'RAW': ['CLASSIFIED', 'REJECTED'],
      'CLASSIFIED': ['STRUCTURED', 'REJECTED'],
      'STRUCTURED': [],
      'REJECTED': []
    };
    return { allowed: true, validNextStates: validTransitions[evidenceState] };
  }
  return { allowed: true };
};