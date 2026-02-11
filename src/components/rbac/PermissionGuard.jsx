import React from 'react';
import { usePermissions } from './usePermissions';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

/**
 * Component to guard content based on permissions
 */
export function PermissionGuard({ module, action, fallback, children }) {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) {
    return <div className="animate-pulse bg-slate-200 h-20 rounded-lg"></div>;
  }

  if (!hasPermission(module, action)) {
    if (fallback) return fallback;
    
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <p className="font-semibold">Access Restricted</p>
              <p className="text-sm">You don't have permission to access this feature.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

/**
 * Hide element if no permission
 */
export function PermissionHide({ module, action, children }) {
  const { hasPermission } = usePermissions();
  
  if (!hasPermission(module, action)) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Disable element if no permission
 */
export function PermissionDisable({ module, action, children }) {
  const { hasPermission } = usePermissions();
  const canAccess = hasPermission(module, action);

  return React.cloneElement(children, {
    disabled: !canAccess,
    className: `${children.props.className || ''} ${!canAccess ? 'opacity-50 cursor-not-allowed' : ''}`
  });
}