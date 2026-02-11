import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Frontend entitlement hook
 * Usage: const { allowed, readOnly, loading } = useEntitlement('PFAS', 'WRITE');
 */
export function useEntitlement(moduleCode, permissionCode = 'READ') {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: result, isLoading } = useQuery({
    queryKey: ['entitlement', moduleCode, permissionCode],
    queryFn: async () => {
      const moduleSubscriptions = await base44.entities.SubscriptionModule.filter({
        tenant_id: user.tenant_id,
        module_code: moduleCode
      });

      if (moduleSubscriptions.length === 0) {
        return { allowed: false, reason: 'Module not subscribed' };
      }

      const subscription = moduleSubscriptions[0];

      // Check status
      if (subscription.status === 'INACTIVE') {
        return { allowed: false, reason: 'Module inactive' };
      }

      // Allow READ for expired/trial, block WRITE
      if (subscription.status === 'EXPIRED' && permissionCode !== 'READ') {
        return { allowed: false, readOnly: true, reason: 'Module expired - read-only' };
      }

      // Check end date
      if (subscription.end_date && new Date(subscription.end_date) < new Date() && permissionCode !== 'READ') {
        return { allowed: false, readOnly: true, reason: 'Subscription ended - read-only' };
      }

      // Check role permissions
      const rolePermissions = await base44.entities.RolePermission.filter({
        tenant_id: user.tenant_id,
        role_name: user.role?.toUpperCase() || 'USER',
        module_code: moduleCode,
        permission_code: permissionCode
      });

      if (rolePermissions.length === 0 && user.role?.toLowerCase() !== 'admin') {
        return { allowed: false, reason: 'Insufficient permissions' };
      }

      return { 
        allowed: true, 
        readOnly: subscription.status === 'TRIAL' || subscription.status === 'EXPIRED',
        subscription 
      };
    },
    enabled: !!user?.tenant_id
  });

  return {
    allowed: result?.allowed || false,
    readOnly: result?.readOnly || false,
    loading: isLoading,
    reason: result?.reason,
    subscription: result?.subscription
  };
}