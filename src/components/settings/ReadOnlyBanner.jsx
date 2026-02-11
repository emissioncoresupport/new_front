import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEntitlement } from './useEntitlement';

/**
 * Read-Only Mode Banner
 * Shows when module is expired but data is still accessible
 * Usage: <ReadOnlyBanner moduleCode="PFAS" />
 */
export default function ReadOnlyBanner({ moduleCode }) {
  const { readOnly, subscription } = useEntitlement(moduleCode, 'WRITE');

  if (!readOnly) return null;

  return (
    <Alert variant="warning" className="mb-6 border-amber-300 bg-amber-50">
      <Lock className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900 font-semibold">Read-Only Mode</AlertTitle>
      <AlertDescription className="text-amber-800">
        {subscription?.status === 'EXPIRED' ? (
          <>
            Your {moduleCode} module subscription has expired. You can view existing data but cannot create or modify records. 
            <Button variant="link" className="px-2 text-amber-900 underline">
              Contact sales to reactivate
            </Button>
          </>
        ) : subscription?.status === 'TRIAL' ? (
          <>
            You are in trial mode for {moduleCode}. 
            {subscription.trial_days_remaining && ` ${subscription.trial_days_remaining} days remaining.`}
            <Button variant="link" className="px-2 text-amber-900 underline">
              Upgrade to full access
            </Button>
          </>
        ) : (
          'Your access to this module is limited. Contact your administrator.'
        )}
      </AlertDescription>
    </Alert>
  );
}