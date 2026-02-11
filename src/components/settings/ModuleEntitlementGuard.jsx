import React, { useEffect, useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lock, Calendar, Mail } from "lucide-react";

/**
 * FRONTEND ENTITLEMENT GUARD
 * Wraps module pages and enforces subscription + permission checks
 * 
 * Features:
 * - Checks SubscriptionModule status
 * - Checks user RolePermission
 * - Shows expired/inactive states with read-only mode
 * - Hides write actions when expired
 */
export default function ModuleEntitlementGuard({ 
  moduleCode, 
  permissionRequired = 'WRITE',
  children 
}) {
  const [readOnlyMode, setReadOnlyMode] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: moduleSubscription, isLoading: loadingSub } = useQuery({
    queryKey: ['subscription-module', moduleCode],
    queryFn: async () => {
      const subs = await base44.entities.SubscriptionModule.filter({
        tenant_id: user.tenant_id,
        module_code: moduleCode
      });
      return subs[0];
    },
    enabled: !!user?.tenant_id
  });

  const { data: rolePermissions = [], isLoading: loadingPerms } = useQuery({
    queryKey: ['role-permissions', moduleCode],
    queryFn: async () => {
      const userRole = user.role || 'USER';
      return base44.entities.RolePermission.filter({
        tenant_id: user.tenant_id,
        role_name: userRole,
        module_code: moduleCode
      });
    },
    enabled: !!user?.tenant_id
  });

  useEffect(() => {
    if (!moduleSubscription) return;

    // Check if expired or inactive
    if (moduleSubscription.status === 'EXPIRED' || moduleSubscription.status === 'INACTIVE') {
      setReadOnlyMode(true);
    }

    // Check end date
    if (moduleSubscription.end_date) {
      const endDate = new Date(moduleSubscription.end_date);
      if (endDate < new Date()) {
        setReadOnlyMode(true);
      }
    }
  }, [moduleSubscription]);

  if (loadingSub || loadingPerms) {
    return <div className="p-8 text-center text-slate-400">Loading...</div>;
  }

  // No subscription found
  if (!moduleSubscription) {
    return (
      <div className="p-8">
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-8 text-center">
            <Lock className="w-12 h-12 mx-auto mb-4 text-rose-600" />
            <h3 className="text-xl font-bold mb-2">Module Not Subscribed</h3>
            <p className="text-slate-600 mb-4">
              Your organization does not have access to the {moduleCode} module.
            </p>
            <Button className="bg-[#86b027] hover:bg-[#769c22]">
              <Mail className="w-4 h-4 mr-2" />
              Contact Sales
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Module inactive
  if (moduleSubscription.status === 'INACTIVE') {
    return (
      <div className="p-8">
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-8 text-center">
            <Lock className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <h3 className="text-xl font-bold mb-2">Module Inactive</h3>
            <p className="text-slate-600 mb-4">
              The {moduleCode} module is currently inactive.
            </p>
            <p className="text-sm text-slate-500">
              Contact your administrator to activate this module.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Module expired - allow read-only
  if (moduleSubscription.status === 'EXPIRED' || 
      (moduleSubscription.end_date && new Date(moduleSubscription.end_date) < new Date())) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-amber-900">Subscription Expired</h4>
              <p className="text-sm text-amber-800 mt-1">
                Your {moduleCode} subscription ended on{' '}
                {new Date(moduleSubscription.end_date).toLocaleDateString()}.
                Data is preserved in read-only mode.
              </p>
              <Button size="sm" className="mt-3 bg-[#86b027] hover:bg-[#769c22]">
                Renew Subscription
              </Button>
            </div>
          </div>
        </div>
        {React.cloneElement(children, { readOnlyMode: true, moduleStatus: 'EXPIRED' })}
      </div>
    );
  }

  // Check permissions
  const userRole = user?.role || 'USER';
  const hasPermission = rolePermissions.some(perm => 
    perm.permission_code === permissionRequired || 
    perm.permission_code === 'ADMIN'
  ) || userRole === 'ADMIN'; // Admins always have access

  if (!hasPermission) {
    return (
      <div className="p-8">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-600" />
            <h3 className="text-xl font-bold mb-2">Insufficient Permissions</h3>
            <p className="text-slate-600 mb-4">
              Your role ({userRole}) does not have {permissionRequired} access to this module.
            </p>
            <p className="text-sm text-slate-500">
              Contact your administrator to request access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Trial warning
  if (moduleSubscription.status === 'TRIAL' && moduleSubscription.trial_days_remaining) {
    return (
      <div className="space-y-4">
        {moduleSubscription.trial_days_remaining <= 7 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-blue-900">Trial Period</h4>
                <p className="text-sm text-blue-800 mt-1">
                  {moduleSubscription.trial_days_remaining} days remaining in your trial.
                </p>
                <Button size="sm" className="mt-3 bg-[#86b027] hover:bg-[#769c22]">
                  Upgrade Now
                </Button>
              </div>
            </div>
          </div>
        )}
        {React.cloneElement(children, { readOnlyMode: false, moduleStatus: 'TRIAL' })}
      </div>
    );
  }

  // Active subscription - full access
  return React.cloneElement(children, { 
    readOnlyMode: false, 
    moduleStatus: 'ACTIVE',
    scopeLimits: rolePermissions[0]?.scope_limit_json 
  });
}