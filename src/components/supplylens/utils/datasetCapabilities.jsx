/**
 * DATASET CAPABILITY REGISTRY
 * 
 * Defines which ingestion methods are allowed per dataset_type,
 * whether structured manual forms exist, and alternative recommendations.
 * 
 * This is the SOURCE OF TRUTH for method-dataset compatibility.
 * Must be mirrored in backend validation logic.
 */

export const DATASET_CAPABILITIES = {
  SUPPLIER_MASTER: {
    dataset_type: 'SUPPLIER_MASTER',
    manual_form_supported: true,
    allowed_methods: ['MANUAL_ENTRY', 'FILE_UPLOAD', 'ERP_EXPORT', 'ERP_API', 'API_PUSH'],
    recommended_method: 'MANUAL_ENTRY',
    requires_file_for_seal: false,
    description: 'Supplier master data (name, identifiers, contacts, sites)'
  },
  PRODUCT_MASTER: {
    dataset_type: 'PRODUCT_MASTER',
    manual_form_supported: true,
    allowed_methods: ['MANUAL_ENTRY', 'FILE_UPLOAD', 'ERP_EXPORT', 'ERP_API', 'API_PUSH'],
    recommended_method: 'MANUAL_ENTRY',
    requires_file_for_seal: false,
    description: 'Product/SKU master data'
  },
  BOM: {
    dataset_type: 'BOM',
    manual_form_supported: true,
    allowed_methods: ['MANUAL_ENTRY', 'FILE_UPLOAD', 'ERP_EXPORT', 'ERP_API', 'API_PUSH'],
    recommended_method: 'MANUAL_ENTRY',
    requires_file_for_seal: false,
    description: 'Bill of Materials with component lines'
  },
  CERTIFICATE: {
    dataset_type: 'CERTIFICATE',
    manual_form_supported: false,
    allowed_methods: ['FILE_UPLOAD', 'SUPPLIER_PORTAL'],
    recommended_method: 'FILE_UPLOAD',
    requires_file_for_seal: true,
    description: 'Certificates (ISO, compliance, etc.) must be uploaded as files',
    why_no_manual: 'Certificates require file evidence (PDF, image) for audit trail and legal validity'
  },
  TRANSACTION_LOG: {
    dataset_type: 'TRANSACTION_LOG',
    manual_form_supported: false,
    allowed_methods: ['API_PUSH', 'FILE_UPLOAD', 'ERP_EXPORT', 'ERP_API'],
    recommended_method: 'ERP_API',
    requires_file_for_seal: false,
    description: 'Transaction logs from ERP systems',
    why_no_manual: 'Transaction logs must be system-generated for audit integrity'
  },
  TEST_REPORT: {
    dataset_type: 'TEST_REPORT',
    manual_form_supported: false,
    allowed_methods: ['FILE_UPLOAD', 'SUPPLIER_PORTAL'],
    recommended_method: 'FILE_UPLOAD',
    requires_file_for_seal: true,
    description: 'Lab test reports, compliance reports',
    why_no_manual: 'Test reports require file evidence for regulatory acceptance'
  }
};

/**
 * Get capability record for a dataset type
 */
export function getDatasetCapability(datasetType) {
  return DATASET_CAPABILITIES[datasetType] || null;
}

/**
 * Check if a method is allowed for a dataset
 */
export function isMethodAllowedForDataset(datasetType, ingestionMethod) {
  const capability = getDatasetCapability(datasetType);
  if (!capability) return false;
  return capability.allowed_methods.includes(ingestionMethod);
}

/**
 * Get validation error for unsupported method-dataset combo
 */
export function getMethodDatasetError(datasetType, ingestionMethod) {
  const capability = getDatasetCapability(datasetType);
  
  if (!capability) {
    return {
      valid: false,
      error_code: 'UNKNOWN_DATASET_TYPE',
      message: `Unknown dataset type: ${datasetType}`,
      suggested_action: null
    };
  }

  if (!capability.allowed_methods.includes(ingestionMethod)) {
    return {
      valid: false,
      error_code: 'UNSUPPORTED_METHOD_DATASET_COMBINATION',
      message: `${ingestionMethod} is not supported for ${datasetType}.`,
      details: capability.why_no_manual || `This dataset requires one of: ${capability.allowed_methods.join(', ')}`,
      allowed_methods: capability.allowed_methods,
      recommended_method: capability.recommended_method,
      dataset_type: datasetType,
      suggested_action: `Switch to ${capability.recommended_method} for ${datasetType}`,
      suggestion_html: buildMethodSuggestion(datasetType, capability)
    };
  }

  return { valid: true };
}

/**
 * Build human-readable suggestion for business users
 */
function buildMethodSuggestion(datasetType, capability) {
  const methods = {
    'FILE_UPLOAD': 'Upload a file (CSV, Excel, PDF) with the data',
    'ERP_API': 'Connect to your ERP system (SAP, Oracle, NetSuite) to fetch live data',
    'ERP_EXPORT': 'Export data from your ERP system and upload the export file',
    'API_PUSH': 'Push data via API integration from a third-party system',
    'SUPPLIER_PORTAL': 'Invite supplier to submit data via secure portal'
  };

  const allowed = capability.allowed_methods
    .map(m => `• ${m}: ${methods[m] || m}`)
    .join('\n');

  return `
For **${datasetType}**, use one of these methods:

${allowed}

**Recommended:** ${capability.recommended_method}
  `.trim();
}

/**
 * Get all datasets that support manual entry
 */
export function getManualEntryDatasets() {
  return Object.values(DATASET_CAPABILITIES)
    .filter(cap => cap.manual_form_supported)
    .map(cap => cap.dataset_type);
}

/**
 * Export matrix for backend consumption
 */
export const METHOD_DATASET_MATRIX = Object.entries(DATASET_CAPABILITIES).reduce((acc, [key, cap]) => {
  acc[key] = {
    allowed_methods: cap.allowed_methods,
    manual_form_supported: cap.manual_form_supported
  };
  return acc;
}, {});