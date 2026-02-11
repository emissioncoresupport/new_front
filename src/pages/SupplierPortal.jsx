import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContextGuard } from '@/components/context/ContextGuard';

const ALLOWED_ROLES = ['SUPPLIER_OWNER', 'SUPPLIER_ADMIN', 'SUPPLIER_CONTRIBUTOR', 'SUPPLIER_VIEWER', 'INTERNAL_ADMIN'];

function SupplierPortalContent() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(u => {
        setUser(u);
        const hasAccess = ALLOWED_ROLES.includes(u?.role);
        setIsAuthorized(hasAccess);
      })
      .catch(() => {
        setIsAuthorized(false);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center">
            <Lock className="w-8 h-8 text-slate-400" />
          </div>
          <h1 className="text-2xl font-light text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 font-light mb-6">
            Your current role does not have access to the Supplier Portal. Please contact your administrator.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="flex-1 border-white/20 text-slate-300 hover:bg-white/10"
            >
              Go Back
            </Button>
            <Button
              onClick={() => base44.auth.logout()}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-white mb-2">Supplier Portal</h1>
          <p className="text-slate-400 font-light">Manage supplier data and compliance workflows</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-400" />
          <p className="text-slate-300 font-light mb-2">Portal in Development</p>
          <p className="text-slate-500 text-sm">Supplier Portal features are coming soon</p>
        </div>
      </div>
    </div>
  );
}

export default function SupplierPortal() {
  return (
    <ContextGuard requiredContext="SUPPLIER">
      <SupplierPortalContent />
    </ContextGuard>
  );
}