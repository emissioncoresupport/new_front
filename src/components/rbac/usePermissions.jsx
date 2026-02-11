import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Hook to check user permissions
 * @returns {Object} - { hasPermission, isLoading, userRole, permissions }
 */
export function usePermissions() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch user's role assignment
  const { data: userRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['user-roles', currentUser?.email],
    queryFn: () => base44.entities.UserRole.filter({ 
      user_email: currentUser?.email,
      active: true 
    }),
    enabled: !!currentUser?.email,
    initialData: []
  });

  // Fetch the actual role details
  const { data: roles = [], isLoading: roleDetailsLoading } = useQuery({
    queryKey: ['roles', userRoles?.[0]?.role_id],
    queryFn: () => {
      if (!userRoles?.[0]?.role_id) return Promise.resolve([]);
      return base44.entities.Role.filter({ id: userRoles[0].role_id });
    },
    enabled: !!userRoles?.[0]?.role_id,
    initialData: []
  });

  const userRole = roles[0];
  const permissions = userRole?.permissions || {};

  /**
   * Check if user has a specific permission
   * @param {string} module - Module name (e.g., 'supplylens', 'cbam')
   * @param {string} action - Action name (e.g., 'view', 'create_supplier')
   * @returns {boolean}
   */
  const hasPermission = (module, action) => {
    // Super admin (built-in) has all permissions
    if (currentUser?.role === 'admin') return true;
    
    // Check specific permission
    return permissions?.[module]?.[action] === true;
  };

  /**
   * Check if user can access a module at all
   * @param {string} module - Module name
   * @returns {boolean}
   */
  const canAccessModule = (module) => {
    if (currentUser?.role === 'admin') return true;
    return permissions?.[module]?.view === true;
  };

  return {
    hasPermission,
    canAccessModule,
    isLoading: rolesLoading || roleDetailsLoading,
    userRole,
    permissions,
    currentUser
  };
}