/**
 * DATASET × SCOPE COMPATIBILITY MATRIX
 * Hard rules for which scopes are allowed for each dataset type
 * Server-enforced, blocking incompatible combinations
 */

export const DATASET_SCOPE_MATRIX = {
  SUPPLIER_MASTER: {
    allowed_scopes: ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY'],
    recommended_scope: 'LEGAL_ENTITY',
    description: 'Supplier master data best scoped to Legal Entity (multiple entities may have different supplier lists)'
  },
  PRODUCT_MASTER: {
    allowed_scopes: ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY', 'PRODUCT_FAMILY'],
    recommended_scope: 'PRODUCT_FAMILY',
    description: 'Product master data can be org-wide, entity-specific, or product-family-specific'
  },
  BOM: {
    allowed_scopes: ['LEGAL_ENTITY', 'PRODUCT_FAMILY', 'SITE'],
    recommended_scope: 'PRODUCT_FAMILY',
    description: 'Bill of Materials scoped to product family, legal entity, or manufacturing site'
  },
  CERTIFICATE: {
    allowed_scopes: ['LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY'],
    recommended_scope: 'SITE',
    description: 'Certificates (ISO, compliance) scoped to manufacturing site, legal entity, or product line'
  },
  TEST_REPORT: {
    allowed_scopes: ['LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY'],
    recommended_scope: 'PRODUCT_FAMILY',
    description: 'Test reports scoped to product, site, or legal entity'
  },
  // Allow UNKNOWN for all types (triggers QUARANTINE)
};

/**
 * Check if a dataset/scope combination is valid
 * @param {string} dataset_type
 * @param {string} declared_scope
 * @returns {object} { valid: boolean, error?: string, recommended?: string }
 */
export function validateDatasetScopeCompatibility(dataset_type, declared_scope) {
  // UNKNOWN/UNLINKED always allowed (triggers quarantine)
  if (declared_scope === 'UNKNOWN') {
    return { valid: true };
  }

  const config = DATASET_SCOPE_MATRIX[dataset_type];
  if (!config) {
    return { valid: false, error: `Unknown dataset type: ${dataset_type}` };
  }

  if (!config.allowed_scopes.includes(declared_scope)) {
    return {
      valid: false,
      error: `${declared_scope} scope not allowed for ${dataset_type}. Allowed: ${config.allowed_scopes.join(', ')}`,
      recommended: config.recommended_scope
    };
  }

  return { valid: true, recommended: config.recommended_scope };
}

/**
 * Get allowed scopes for a dataset type
 */
export function getAllowedScopes(dataset_type) {
  const config = DATASET_SCOPE_MATRIX[dataset_type];
  if (!config) return [];
  return config.allowed_scopes;
}

/**
 * Get recommended scope for a dataset type
 */
export function getRecommendedScope(dataset_type) {
  const config = DATASET_SCOPE_MATRIX[dataset_type];
  if (!config) return 'ENTIRE_ORGANIZATION';
  return config.recommended_scope;
}