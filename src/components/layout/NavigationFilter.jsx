import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * NAVIGATION FILTER
 * Returns list of modules user has access to
 * Used by Sidebar to hide unsubscribed modules
 */
export function useModuleAccess() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: moduleSubscriptions = [] } = useQuery({
    queryKey: ['module-subscriptions'],
    queryFn: async () => {
      return base44.entities.SubscriptionModule.filter({
        tenant_id: user.tenant_id
      });
    },
    enabled: !!user?.tenant_id
  });

  /**
   * Check if user has access to a module
   * Returns: { hasAccess, status, isExpired, isTrial, readOnly }
   */
  const checkModuleAccess = (moduleCode) => {
    // If no subscription records exist at all, show everything (backward compatibility)
    if (moduleSubscriptions.length === 0) {
      return { hasAccess: true, status: 'ACTIVE', readOnly: false };
    }

    const subscription = moduleSubscriptions.find(sub => sub.module_code === moduleCode);

    if (!subscription) {
      return { hasAccess: false, status: 'NOT_SUBSCRIBED' };
    }

    if (subscription.status === 'INACTIVE') {
      return { hasAccess: false, status: 'INACTIVE' };
    }

    // Allow access to expired modules (read-only mode)
    if (subscription.status === 'EXPIRED') {
      return { hasAccess: true, status: 'EXPIRED', isExpired: true, readOnly: true };
    }

    if (subscription.end_date && new Date(subscription.end_date) < new Date()) {
      return { hasAccess: true, status: 'EXPIRED', isExpired: true, readOnly: true };
    }

    if (subscription.status === 'TRIAL') {
      return { hasAccess: true, status: 'TRIAL', isTrial: true, readOnly: false };
    }

    return { hasAccess: true, status: 'ACTIVE', readOnly: false };
  };

  /**
   * Get list of accessible modules for navigation
   */
  const getAccessibleModules = () => {
    const moduleList = [
      'SUPPLYLENS', 'PFAS', 'PPWR', 'PCF', 'LCA', 'CBAM', 
      'CSRD', 'EUDR', 'DPP', 'CCF', 'VSME', 'EUDAMED', 'LOGISTICS'
    ];

    return moduleList.map(code => ({
      code,
      ...checkModuleAccess(code)
    })).filter(m => m.hasAccess);
  };

  return {
    checkModuleAccess,
    getAccessibleModules,
    moduleSubscriptions
  };
}