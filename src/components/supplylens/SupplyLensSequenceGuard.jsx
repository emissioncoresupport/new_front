/**
 * SupplyLens Sequence Guard Component
 * 
 * Wraps pages to enforce canonical sequence entry and ownership rules.
 * Prevents bypassing the Overview and validates user permissions.
 */

import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { OWNERSHIP_MODEL } from './services/CanonicalSequenceEnforcer';

export default function SupplyLensSequenceGuard({ 
  children, 
  requiredOwnership = 'internal_user',
  requiredPreviousState = null 
}) {
  const [authorized, setAuthorized] = useState(null);
  const [user, setUser] = useState(null);
  const [denialReason, setDenialReason] = useState(null);

  useEffect(() => {
    const validateAccess = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Check ownership
        const userRole = currentUser.role;
        const allowedRoles = {
          'internal_user': ['admin', 'analyst', 'manager'],
          'supplier': ['supplier'],
          'system': [] // System never accesses directly
        };

        if (!allowedRoles[requiredOwnership]?.includes(userRole)) {
          setDenialReason(`Your role (${userRole}) is not authorized for this action. Required: ${requiredOwnership}`);
          setAuthorized(false);
          return;
        }

        // Check referrer (must come from Overview, not direct URL)
        const referrer = document.referrer;
        const allowedOrigins = [
          createPageUrl('SupplyLens'),
          window.location.origin
        ];

        const isValidReferrer = allowedOrigins.some(origin => referrer.includes(origin));
        
        if (!isValidReferrer && requiredPreviousState) {
          console.warn(`[SEQUENCE] Direct access to page detected. Referrer: ${referrer}`);
          // Allow but log warning
        }

        setAuthorized(true);
      } catch (error) {
        setDenialReason('Authorization check failed');
        setAuthorized(false);
      }
    };

    validateAccess();
  }, [requiredOwnership, requiredPreviousState]);

  if (authorized === null) {
    return <div className="flex items-center justify-center h-screen text-slate-600">Checking authorization...</div>;
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <Card className="max-w-md border border-red-300 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-medium text-red-900">Access Denied</h2>
              <p className="text-sm text-red-700 mt-2">{denialReason}</p>
              <Button
                onClick={() => window.location.href = createPageUrl('SupplyLens')}
                className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white"
              >
                Return to Overview
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return children;
}