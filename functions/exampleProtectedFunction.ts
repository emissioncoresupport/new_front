import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * EXAMPLE: Protected Backend Function with Entitlement Guard
 * This demonstrates how to protect any backend function with subscription checks
 */

// Inline guard function (same as entitlementGuard.js)
async function checkEntitlement(base44, user, moduleCode, permissionCode = 'READ') {
  if (!user?.tenant_id) {
    return { allowed: false, reason: 'User not authenticated', status: 401 };
  }

  const moduleSubscriptions = await base44.asServiceRole.entities.SubscriptionModule.filter({
    tenant_id: user.tenant_id,
    module_code: moduleCode
  });

  if (moduleSubscriptions.length === 0) {
    return { allowed: false, reason: `Module ${moduleCode} not subscribed`, status: 403 };
  }

  const subscription = moduleSubscriptions[0];

  if (subscription.status === 'INACTIVE') {
    return { allowed: false, reason: `Module ${moduleCode} is inactive`, status: 403 };
  }

  // Allow READ for expired, block WRITE
  if (subscription.status === 'EXPIRED' && permissionCode !== 'READ') {
    return { allowed: false, reason: `Module expired - read-only`, readOnly: true, status: 403 };
  }

  if (subscription.end_date && new Date(subscription.end_date) < new Date() && permissionCode !== 'READ') {
    return { allowed: false, reason: `Subscription ended - read-only`, readOnly: true, status: 403 };
  }

  const rolePermissions = await base44.asServiceRole.entities.RolePermission.filter({
    tenant_id: user.tenant_id,
    role_name: user.role?.toUpperCase() || 'USER',
    module_code: moduleCode,
    permission_code: permissionCode
  });

  if (rolePermissions.length === 0 && user.role?.toLowerCase() !== 'admin') {
    return { allowed: false, reason: `Insufficient permissions`, status: 403 };
  }

  return { allowed: true, subscription };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // STEP 1: Check entitlement (WRITE permission for PFAS module)
    const guard = await checkEntitlement(base44, user, 'PFAS', 'WRITE');
    
    if (!guard.allowed) {
      return Response.json({ 
        error: guard.reason,
        readOnly: guard.readOnly || false
      }, { status: guard.status || 403 });
    }

    // STEP 2: Check usage limits if defined
    if (guard.subscription?.limits_json) {
      const limits = guard.subscription.limits_json;
      
      // Example: Check max_records limit
      if (limits.max_records) {
        const existingRecords = await base44.asServiceRole.entities.PFASComplianceAssessment.filter({
          tenant_id: user.tenant_id
        });
        
        if (existingRecords.length >= limits.max_records) {
          return Response.json({ 
            error: `Record limit reached (${limits.max_records}). Upgrade to add more.`
          }, { status: 403 });
        }
      }
    }

    // STEP 3: Perform the actual operation
    const { data } = await req.json();
    
    const result = await base44.asServiceRole.entities.PFASComplianceAssessment.create({
      ...data,
      tenant_id: user.tenant_id,
      created_by: user.email
    });

    return Response.json({ success: true, data: result });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});