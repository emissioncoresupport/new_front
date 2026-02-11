import { createPageUrl } from '@/utils';

/**
 * Routing utility for Contract 2 navigation
 * Ensures all evidence and entity links route to existing pages with auto-open
 */

/**
 * Route to Evidence Vault page with auto-focus on a specific evidence record.
 * Always prefer routing by recordId (primary key) when available.
 * @param {Object|string} evidence - Evidence object with recordId/displayId, or just the ID string
 * @param {string} evidence.recordId - Primary key (UUID) - PREFERRED
 * @param {string} evidence.displayId - Display ID (e.g., "EV-2024-004")
 * @returns {string} - URL with focus parameter
 */
export function routeToEvidenceDetail(evidence) {
  if (!evidence) {
    console.warn('[routingUtils] routeToEvidenceDetail called with no evidence');
    return createPageUrl('EvidenceVault');
  }

  // Handle string input (legacy support)
  if (typeof evidence === 'string') {
    const id = evidence.trim();
    if (id.startsWith('EV-')) {
      return createPageUrl('EvidenceVault') + `?focusDisplayId=${encodeURIComponent(id)}`;
    }
    return createPageUrl('EvidenceVault') + `?focus=${encodeURIComponent(id)}`;
  }

  // Handle object input - prefer recordId
  if (evidence.recordId) {
    return createPageUrl('EvidenceVault') + `?focus=${encodeURIComponent(evidence.recordId)}`;
  }
  
  if (evidence.displayId) {
    return createPageUrl('EvidenceVault') + `?focusDisplayId=${encodeURIComponent(evidence.displayId)}`;
  }

  console.warn('[routingUtils] Evidence object missing both recordId and displayId:', evidence);
  return createPageUrl('EvidenceVault');
}

/**
 * Route to Entity Detail in SupplyLens Network with auto-open
 * @param {string} entityType - Entity type (SUPPLIER, SKU, PRODUCT, BOM)
 * @param {string} entityId - Entity ID
 * @returns {string} Route URL
 */
export function routeToEntityDetail(entityType, entityId) {
  if (!entityType || !entityId) {
    return createPageUrl('SupplyLensNetwork');
  }
  
  // Map entity type to correct Network tab
  const tabMap = {
    'SUPPLIER': 'suppliers',
    'Supplier': 'suppliers',
    'SKU': 'skus',
    'PRODUCT': 'skus',
    'Product': 'skus',
    'ProductFamily': 'skus',
    'PRODUCT_FAMILY': 'skus',
    'BOM': 'bom'
  };
  
  const tab = tabMap[entityType] || 'suppliers';
  // Include both tab and entityId to enable auto-open in Network page
  return createPageUrl('SupplyLensNetwork', `tab=${tab}&entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`);
}

/**
 * Route to Evidence Vault with search prefilled
 * @param {string} searchQuery - Search query
 * @returns {string} Route URL
 */
export function routeToEvidenceVaultSearch(searchQuery) {
  if (!searchQuery || searchQuery.trim() === '') {
    return createPageUrl('EvidenceVault');
  }
  return createPageUrl('EvidenceVault', `search=${encodeURIComponent(searchQuery)}`);
}

/**
 * Validate evidence ID format
 * @param {string} evidenceId 
 * @returns {boolean}
 */
export function isValidEvidenceId(evidenceId) {
  if (!evidenceId || typeof evidenceId !== 'string') return false;
  // Basic validation: should start with EV- or be a valid UUID format
  return evidenceId.startsWith('EV-') || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(evidenceId);
}

// Backward compatibility aliases
export const routeToEvidence = routeToEvidenceDetail;
export const routeToEntity = routeToEntityDetail;