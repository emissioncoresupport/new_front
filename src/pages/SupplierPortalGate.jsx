import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle } from 'lucide-react';

const ALLOWED_ROLES = ['SUPPLIER_OWNER', 'SUPPLIER_ADMIN', 'SUPPLIER_CONTRIBUTOR', 'SUPPLIER_VIEWER', 'INTERNAL_ADMIN'];

export default function SupplierPortalGate({ children }) {
  const [hasAccess, setHasAccess] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me()
      .then(u => {
        setUser(u);
        setHasAccess(u && ALLOWED_ROLES.includes(u.role));
      })
      .catch(() => setHasAccess(false));
  }, []);

  if (hasAccess === null) return <div className="flex items-center justify-center h-screen bg-slate-950 text-white">Loading...</div>;

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4 opacity-60" />
          <h1 className="text-3xl font-light text-white mb-2">Access Denied</h1>
          <p className="text-slate-400">You don't have permission to access the supplier portal.</p>
          {user?.role && <p className="text-xs text-slate-500 mt-4">Role: {user.role}</p>}
        </div>
      </div>
    );
  }

  return children;
}