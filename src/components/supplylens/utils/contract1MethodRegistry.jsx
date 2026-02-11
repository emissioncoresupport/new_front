/**
 * CONTRACT-1 METHOD REGISTRY (REFACTORED 2026-01-29)
 * 
 * Defines INGESTION MECHANISMS (how evidence bytes/data arrived at system).
 * NOTE: "Who submitted" (channel) is now separate from "how" (method).
 * 
 * SINGLE SOURCE OF TRUTH for method capabilities and constraints.
 */

export const METHOD_CONFIG = {
  FILE_UPLOAD: {
    value: 'FILE_UPLOAD',
    label: 'File Upload',
    description: 'File-based ingestion - server hashes file bytes',
    payload_type: 'BYTES',
    requires_file: true,
    requires_external_ref: false,
    requires_digest: false,
    requires_api_reference: false,
    requires_export_job: false,
    requires_connector: false,
    requires_erp_instance: false,
    requires_snapshot: false,
    requires_entry_notes: false,
    requires_pii_confirmation: false,
    default_trust_level: 'MEDIUM',
    default_review_status: 'PENDING_REVIEW',
    step2_label: 'Upload File',
    step2_description: 'Upload 1+ files - server computes SHA-256 on exact bytes',
    what_happens_next: 'Server stores file bytes, computes SHA-256 hash, creates immutable evidence record with metadata.',
    allowed_evidence_types: ['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM', 'CERTIFICATE_OR_DECLARATION', 'TEST_REPORT_OR_LAB_RESULT', 'TRANSACTION_OR_MOVEMENT_LOG', 'OTHER']
  },
  MANUAL_ENTRY: {
    value: 'MANUAL_ENTRY',
    label: 'Manual Entry',
    description: 'Structured data entry with attestation - JSON canonicalized',
    payload_type: 'JSON',
    requires_file: false,
    requires_external_ref: false,
    requires_digest: false,
    requires_api_reference: false,
    requires_export_job: false,
    requires_connector: false,
    requires_erp_instance: false,
    requires_snapshot: false,
    requires_entry_notes: true,
    requires_pii_confirmation: false,
    default_trust_level: 'LOW',
    default_review_status: 'NOT_REVIEWED',
    step2_label: 'Enter Structured Data',
    step2_description: 'Fill dataset-specific form - data canonicalized to JSON',
    what_happens_next: 'Server canonicalizes JSON (RFC 8785), hashes canonical bytes, marks trust=LOW and review=NOT_REVIEWED. Human approval required.',
    allowed_evidence_types: ['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'TRANSACTION_OR_MOVEMENT_LOG']
  },
  API_PUSH: {
    value: 'API_PUSH',
    label: 'API Push (Digest Only)',
    description: 'External system provides digest - no bytes stored',
    payload_type: 'DIGEST_ONLY',
    requires_file: false,
    requires_external_ref: true,
    requires_digest: true,
    requires_api_reference: false,
    requires_export_job: false,
    requires_connector: false,
    requires_erp_instance: false,
    requires_snapshot: false,
    requires_entry_notes: false,
    requires_pii_confirmation: false,
    default_trust_level: 'LOW',
    default_review_status: 'NOT_REVIEWED',
    step2_label: 'API Receipt Details',
    step2_description: 'Enter external reference (idempotency key) + payload digest',
    what_happens_next: 'Server stores digest + provenance metadata only. NO payload bytes stored. External system must retain original for audit.',
    allowed_evidence_types: ['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM', 'CERTIFICATE_OR_DECLARATION', 'TEST_REPORT_OR_LAB_RESULT', 'TRANSACTION_OR_MOVEMENT_LOG', 'OTHER']
  },
  ERP_EXPORT: {
    value: 'ERP_EXPORT',
    label: 'ERP Export (File)',
    description: 'Scheduled batch export file from ERP system',
    payload_type: 'BYTES',
    requires_file: true,
    requires_external_ref: false,
    requires_digest: false,
    requires_api_reference: false,
    requires_export_job: true,
    requires_connector: false,
    requires_erp_instance: true,
    requires_snapshot: true,
    requires_entry_notes: false,
    requires_pii_confirmation: false,
    default_trust_level: 'HIGH',
    default_review_status: 'PENDING_REVIEW',
    step2_label: 'Upload Export File',
    step2_description: 'Upload ERP export file with job ID and timestamp',
    what_happens_next: 'Server hashes export file bytes, validates job metadata, creates evidence with export provenance.',
    allowed_evidence_types: ['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM', 'TRANSACTION_OR_MOVEMENT_LOG', 'OTHER']
  },
  ERP_API: {
    value: 'ERP_API',
    label: 'ERP API (System Pull)',
    description: 'Real-time system-to-system data pull via connector',
    payload_type: 'JSON',
    requires_file: false,
    requires_external_ref: false,
    requires_digest: false,
    requires_api_reference: true,
    requires_export_job: false,
    requires_connector: true,
    requires_erp_instance: false,
    requires_snapshot: true,
    requires_entry_notes: false,
    requires_pii_confirmation: false,
    default_trust_level: 'HIGH',
    default_review_status: 'APPROVED',
    step2_label: 'Connector Reference',
    step2_description: 'Reference API extraction with connector ID and sync run',
    what_happens_next: 'Server pulls data via authenticated connector, canonicalizes JSON, hashes, creates evidence with API provenance.',
    allowed_evidence_types: ['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM', 'TRANSACTION_OR_MOVEMENT_LOG', 'OTHER']
  }
};

/**
 * SUBMISSION CHANNEL OPTIONS
 * Describes WHO submitted evidence (context only, not ingestion mechanism)
 */
export const SUBMISSION_CHANNELS = {
  INTERNAL_USER: {
    value: 'INTERNAL_USER',
    label: 'Internal User',
    description: 'Submitted by company employee/authorized user'
  },
  SUPPLIER_PORTAL: {
    value: 'SUPPLIER_PORTAL',
    label: 'Supplier Portal',
    description: 'Submitted by supplier via external portal',
    requires_supplier_submission_id: true
  },
  CONSULTANT_PORTAL: {
    value: 'CONSULTANT_PORTAL',
    label: 'Consultant Portal',
    description: 'Submitted by third-party consultant/auditor'
  }
};

/**
 * CANONICAL EVIDENCE TYPES (small, non-overlapping set)
 */
export const EVIDENCE_TYPES = {
  SUPPLIER_MASTER: {
    value: 'SUPPLIER_MASTER',
    label: 'Supplier Master Data',
    description: 'Supplier identity, address, certifications'
  },
  PRODUCT_MASTER: {
    value: 'PRODUCT_MASTER',
    label: 'Product Master Data',
    description: 'Product/material specifications, classifications'
  },
  BOM: {
    value: 'BOM',
    label: 'Bill of Materials',
    description: 'Product composition, sub-assemblies, material breakdown'
  },
  CERTIFICATE_OR_DECLARATION: {
    value: 'CERTIFICATE_OR_DECLARATION',
    label: 'Certificate or Declaration',
    description: 'ISO certs, compliance declarations, attestations'
  },
  TEST_REPORT_OR_LAB_RESULT: {
    value: 'TEST_REPORT_OR_LAB_RESULT',
    label: 'Test Report or Lab Result',
    description: 'Lab analysis, quality tests, emissions measurements'
  },
  TRANSACTION_OR_MOVEMENT_LOG: {
    value: 'TRANSACTION_OR_MOVEMENT_LOG',
    label: 'Transaction or Movement Log',
    description: 'Shipments, invoices, inventory movements'
  },
  OTHER: {
    value: 'OTHER',
    label: 'Other',
    description: 'Other evidence type (requires description)'
  }
};

/**
 * Get method config by key
 */
export function getMethodConfig(method) {
  return METHOD_CONFIG[method] || null;
}

/**
 * Get all methods as dropdown options (ingestion mechanisms only)
 */
export function getAllMethodOptions() {
  return Object.values(METHOD_CONFIG).map(config => ({
    value: config.value,
    label: config.label,
    description: config.description
  }));
}

/**
 * Get all submission channels as dropdown options
 */
export function getAllChannelOptions() {
  return Object.values(SUBMISSION_CHANNELS).map(channel => ({
    value: channel.value,
    label: channel.label,
    description: channel.description
  }));
}

/**
 * Get all evidence types as dropdown options
 */
export function getAllEvidenceTypeOptions() {
  return Object.values(EVIDENCE_TYPES).map(type => ({
    value: type.value,
    label: type.label,
    description: type.description
  }));
}

/**
 * Check if a method allows a specific evidence type
 */
export function isMethodEvidenceTypeCompatible(method, evidenceType) {
  const config = getMethodConfig(method);
  if (!config || !config.allowed_evidence_types) return true; // Allow if not restricted
  return config.allowed_evidence_types.includes(evidenceType);
}

/**
 * Get allowed evidence types for a method
 */
export function getAllowedEvidenceTypes(method) {
  const config = getMethodConfig(method);
  return config?.allowed_evidence_types || Object.keys(EVIDENCE_TYPES);
}

/**
 * Check if submission channel requires supplier submission ID
 */
export function channelRequiresSupplierSubmissionId(channel) {
  const channelConfig = SUBMISSION_CHANNELS[channel];
  return channelConfig?.requires_supplier_submission_id === true;
}

/**
 * Check if method requires files
 */
export function methodRequiresFiles(method) {
  const config = getMethodConfig(method);
  return config?.requires_file ?? false;
}

/**
 * Check if method requires digest
 */
export function methodRequiresDigest(method) {
  const config = getMethodConfig(method);
  return config?.requires_digest ?? false;
}

/**
 * Get payload type for method
 */
export function getPayloadType(method) {
  const config = getMethodConfig(method);
  return config?.payload_type || null;
}

/**
 * Validate declaration against method requirements
 * Returns array of error objects: {field, message}
 */
export function getMethodRequiredFieldErrors(method, declaration) {
  const config = getMethodConfig(method);
  if (!config) return [{field: 'ingestion_method', message: 'Unknown method'}];
  
  const errors = [];
  
  // Method-specific field requirements
  if (config.requires_entry_notes && (!declaration.entry_notes || declaration.entry_notes.trim().length < 20)) {
    errors.push({field: 'entry_notes', message: 'Minimum 20 characters required for attestation'});
  }
  
  if (config.requires_external_ref && !declaration.external_reference_id) {
    errors.push({field: 'external_reference_id', message: 'External reference ID required for idempotency'});
  }
  
  if (config.requires_api_reference && !declaration.api_event_reference) {
    errors.push({field: 'api_event_reference', message: 'API event reference required'});
  }
  
  if (config.requires_export_job && !declaration.export_job_id) {
    errors.push({field: 'export_job_id', message: 'Export job ID required'});
  }
  
  if (config.requires_connector && !declaration.connector_reference) {
    errors.push({field: 'connector_reference', message: 'Connector reference required'});
  }
  
  if (config.requires_erp_instance && !declaration.erp_instance_friendly_name) {
    errors.push({field: 'erp_instance_friendly_name', message: 'ERP instance name required'});
  }
  
  if (config.requires_snapshot && !declaration.snapshot_at_utc) {
    errors.push({field: 'snapshot_at_utc', message: 'Snapshot timestamp required'});
  }
  
  // Evidence type compatibility check
  if (declaration.evidence_type && !isMethodEvidenceTypeCompatible(method, declaration.evidence_type)) {
    errors.push({field: 'evidence_type', message: `Evidence type ${declaration.evidence_type} not allowed for ${config.label}`});
  }
  
  // Submission channel requirements
  if (declaration.submission_channel === 'SUPPLIER_PORTAL' && !declaration.supplier_submission_id) {
    errors.push({field: 'supplier_submission_id', message: 'Supplier Submission ID required when channel is Supplier Portal'});
  }
  
  // PII confirmation
  if (declaration.contains_personal_data && !declaration.pii_confirmation) {
    errors.push({field: 'pii_confirmation', message: 'Must confirm PII handling policy when personal data is present'});
  }
  
  // Source system lock for MANUAL_ENTRY
  if (method === 'MANUAL_ENTRY' && declaration.source_system && declaration.source_system !== 'INTERNAL_MANUAL') {
    errors.push({field: 'source_system', message: 'MANUAL_ENTRY must use INTERNAL_MANUAL as source system'});
  }
  
  return errors;
}

/**
 * Check if step 2 can proceed (depends on draft_id availability)
 */
export function canProceedToStep2(draftId, method) {
  if (!draftId) return false;
  if (typeof draftId !== 'string' || draftId.length === 0) return false;
  if (draftId.trim().length === 0) return false;
  return true;
}

/**
 * Check if step 3 can proceed (depends on draft_id and simulation mode)
 */
export function canProceedToStep3(draftId, simulationMode) {
  if (!canProceedToStep2(draftId)) return false;
  if (!simulationMode && draftId.startsWith('SIM-')) return false;
  return true;
}