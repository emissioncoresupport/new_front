/**
 * Defensive Tenant Isolation Guard
 * Validates that user can access target tenant's data
 * Used before all cross-tenant data operations
 * CRITICAL: Must be called before any entity access
 */

export function tenantGuard(userTenantId, targetTenantId, context) {
  if (!userTenantId || !targetTenantId) {
    throw new Error('tenantGuard: Missing tenant IDs', { status: 403, context });
  }

  if (userTenantId !== targetTenantId) {
    console.error(`[TENANT_VIOLATION] User ${userTenantId} attempted access to tenant ${targetTenantId}`, { context });
    throw new Error('Access denied: tenant mismatch', { status: 403 });
  }

  return true;
}

export default tenantGuard;