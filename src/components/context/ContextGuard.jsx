import React from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useTenantContext } from './useTenantContext';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ContextGuard({ children, requiredContext }) {
  const navigate = useNavigate();
  const { context, isLoading } = useTenantContext();
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  // INTERNAL_ADMIN can access everything
  if (user?.role === 'INTERNAL_ADMIN') {
    return children;
  }

  // Check if current context matches required context
  const isAuthorized = context.active_context_type === requiredContext;

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center">
            <Lock className="w-8 h-8 text-slate-400" />
          </div>
          <h1 className="text-2xl font-light text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 font-light mb-6">
            Your current context is {context.active_context_type}. This page requires {requiredContext} context.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="flex-1 border-white/20 text-slate-300 hover:bg-white/10"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}