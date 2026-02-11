/**
 * Tenant context validation middleware.
 * 
 * MANDATORY: All Evidence operations must have explicit tenant_id.
 * NO implicit user.id fallback. NO SDK-layer guessing.
 * 
 * Tenant must be:
 * 1. Provided in request payload
 * 2. Validated against user's authorized tenants
 * 3. Included in all queries
 */

export async function validateTenantContext(base44, requestTenantId, user) {
  if (!requestTenantId) {
    throw new Error('Missing required tenant_id in request');
  }

  if (typeof requestTenantId !== 'string' || requestTenantId.trim() === '') {
    throw new Error('Invalid tenant_id: must be non-empty string');
  }

  // Validate user has access to this tenant
  // For now: user.id is the tenant (single-tenant per user)
  // TODO: Future multi-tenancy: check against user's authorized_tenants list
  if (requestTenantId !== user.id) {
    throw new Error('Forbidden: User not authorized for this tenant');
  }

  return requestTenantId;
}

/**
 * Build Evidence query with explicit tenant filter.
 * 
 * @param {string} tenantId - Explicit tenant context
 * @param {Object} additionalFilters - Any other query filters
 * @returns {Object} Query object with tenant_id included
 */
export function buildTenantFilteredQuery(tenantId, additionalFilters = {}) {
  return {
    ...additionalFilters,
    tenant_id: tenantId
  };
}

/**
 * Assert tenant isolation on Evidence record.
 * 
 * @param {Object} evidence - Evidence record
 * @param {string} requestTenantId - Tenant from request
 * @throws {Error} If tenant mismatch
 */
export function assertTenantMatch(evidence, requestTenantId) {
  if (evidence.tenant_id !== requestTenantId) {
    throw new Error('Forbidden: Tenant mismatch. Cross-tenant access denied.');
  }
}