/**
 * Evidence Type to Allowed Scopes Matrix
 * Enforces which scope types are valid for each evidence type
 */

export const EVIDENCE_TYPE_SCOPE_MATRIX = {
  PRODUCT_MASTER: {
    allowedScopes: ['ENTIRE_ORG', 'LEGAL_ENTITY', 'PRODUCT_FAMILY'],
    requiresTarget: {
      ENTIRE_ORG: false,
      LEGAL_ENTITY: true,
      PRODUCT_FAMILY: true
    }
  },
  SUPPLIER_MASTER: {
    allowedScopes: ['ENTIRE_ORG', 'LEGAL_ENTITY', 'SUPPLIER'],
    requiresTarget: {
      ENTIRE_ORG: false,
      LEGAL_ENTITY: true,
      SUPPLIER: true
    }
  },
  BOM: {
    allowedScopes: ['PRODUCT_FAMILY', 'SKU', 'BOM'],
    requiresTarget: {
      PRODUCT_FAMILY: true,
      SKU: true,
      BOM: true
    }
  },
  CERTIFICATE: {
    allowedScopes: ['SUPPLIER', 'SITE', 'PRODUCT_FAMILY', 'LEGAL_ENTITY'],
    requiresTarget: {
      SUPPLIER: true,
      SITE: true,
      PRODUCT_FAMILY: true,
      LEGAL_ENTITY: true
    }
  },
  TEST_REPORT: {
    allowedScopes: ['PRODUCT_FAMILY', 'SKU', 'SUPPLIER', 'SITE'],
    requiresTarget: {
      PRODUCT_FAMILY: true,
      SKU: true,
      SUPPLIER: true,
      SITE: true
    }
  },
  TRANSACTION_LOG: {
    allowedScopes: ['SHIPMENT', 'LEGAL_ENTITY', 'SUPPLIER'],
    requiresTarget: {
      SHIPMENT: true,
      LEGAL_ENTITY: true,
      SUPPLIER: true
    }
  },
  OTHER: {
    allowedScopes: ['ENTIRE_ORG', 'LEGAL_ENTITY', 'PRODUCT_FAMILY', 'SKU', 'SUPPLIER', 'SITE', 'SHIPMENT', 'OTHER'],
    requiresTarget: {
      ENTIRE_ORG: false,
      LEGAL_ENTITY: true,
      PRODUCT_FAMILY: true,
      SKU: true,
      SUPPLIER: true,
      SITE: true,
      SHIPMENT: true,
      OTHER: true
    }
  }
};

export function getAllowedScopes(evidenceType) {
  return EVIDENCE_TYPE_SCOPE_MATRIX[evidenceType]?.allowedScopes || [];
}

export function requiresScopeTarget(evidenceType, scope) {
  return EVIDENCE_TYPE_SCOPE_MATRIX[evidenceType]?.requiresTarget?.[scope] || false;
}

export function isValidScopeCombination(evidenceType, scope) {
  const allowed = getAllowedScopes(evidenceType);
  return allowed.includes(scope);
}