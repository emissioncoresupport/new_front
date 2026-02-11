/**
 * METHOD × DATASET COMPATIBILITY MATRIX
 * Enforces which evidence types can be ingested via which methods
 * Contract 1 regulator-grade rules
 */

export const METHOD_DATASET_MATRIX = {
  FILE_UPLOAD: {
    allowed_datasets: ['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM', 'CERTIFICATE', 'TEST_REPORT', 'TRANSACTION_LOG', 'OTHER'],
    description: 'File upload supports all evidence types'
  },
  MANUAL_ENTRY: {
    allowed_datasets: ['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM', 'OTHER'],
    blocked_datasets: ['CERTIFICATE', 'TEST_REPORT', 'TRANSACTION_LOG'],
    description: 'Manual entry limited to master data and BOMs',
    block_reason: 'Certificates, test reports, and transaction logs require file or system export'
  },
  API_PUSH: {
    allowed_datasets: ['TRANSACTION_LOG', 'BOM', 'SUPPLIER_MASTER', 'PRODUCT_MASTER', 'OTHER'],
    description: 'API push for transactional and master data'
  },
  ERP_EXPORT: {
    allowed_datasets: ['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM', 'TRANSACTION_LOG'],
    description: 'ERP export for master data and transactions'
  },
  ERP_API: {
    allowed_datasets: ['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM', 'TRANSACTION_LOG'],
    description: 'ERP API connector for real-time master data and transactions'
  },
  SUPPLIER_PORTAL: {
    allowed_datasets: ['CERTIFICATE', 'TEST_REPORT', 'BOM', 'OTHER'],
    description: 'Supplier portal for compliance documents and BOMs'
  }
};

export function isMethodDatasetCompatible(method, dataset) {
  if (!method || !dataset) return true;
  const config = METHOD_DATASET_MATRIX[method];
  if (!config) return true;
  return config.allowed_datasets.includes(dataset);
}

export function getCompatibilityError(method, dataset) {
  if (isMethodDatasetCompatible(method, dataset)) return null;
  
  const config = METHOD_DATASET_MATRIX[method];
  const recommendedMethods = Object.keys(METHOD_DATASET_MATRIX)
    .filter(m => METHOD_DATASET_MATRIX[m].allowed_datasets.includes(dataset));
  
  return {
    message: `${dataset} cannot be ingested via ${method}`,
    reason: config.block_reason || 'Method-dataset incompatibility',
    allowed_datasets: config.allowed_datasets,
    recommended_methods: recommendedMethods,
    recommended_method: recommendedMethods[0]
  };
}

export function getRecommendedMethod(dataset) {
  // Prioritize methods for each dataset type
  const priorities = {
    CERTIFICATE: ['SUPPLIER_PORTAL', 'FILE_UPLOAD'],
    TEST_REPORT: ['SUPPLIER_PORTAL', 'FILE_UPLOAD'],
    TRANSACTION_LOG: ['API_PUSH', 'ERP_EXPORT', 'ERP_API'],
    SUPPLIER_MASTER: ['ERP_API', 'ERP_EXPORT', 'FILE_UPLOAD'],
    PRODUCT_MASTER: ['ERP_API', 'ERP_EXPORT', 'FILE_UPLOAD'],
    BOM: ['ERP_API', 'ERP_EXPORT', 'FILE_UPLOAD', 'API_PUSH'],
    OTHER: ['FILE_UPLOAD']
  };
  
  return priorities[dataset]?.[0] || 'FILE_UPLOAD';
}