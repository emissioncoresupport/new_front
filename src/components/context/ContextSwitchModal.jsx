import React from 'react';
import { useTenantContext } from './useTenantContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Briefcase } from 'lucide-react';

export function ContextSwitchModal({ open, onOpenChange }) {
  const { context, switchToBuyer, switchToSupplier } = useTenantContext();

  const isBuyerContext = context.active_context_type === 'BUYER';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-950 border border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white font-light text-lg">
            Switch Role
          </DialogTitle>
          <DialogDescription className="text-slate-400 font-light">
            Current: <Badge className="ml-1 bg-white/10 text-white border-white/20">
              {context.active_context_type === 'BUYER' ? 'Administrator' : 'Supplier'}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <button
            onClick={() => {
              switchToBuyer('TENANT_DSV_DEMO');
              onOpenChange(false);
            }}
            className={`w-full p-4 rounded-lg border transition-all flex items-center gap-3 ${
              isBuyerContext
                ? 'bg-white/10 border-white/30 text-white'
                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Building2 className="w-5 h-5" />
            <div className="text-left">
              <p className="font-light text-sm">Administrator</p>
              <p className="text-xs text-slate-500">Full system access</p>
            </div>
          </button>

          <button
            onClick={() => {
              switchToSupplier('SUP_ORG_DEMO');
              onOpenChange(false);
            }}
            className={`w-full p-4 rounded-lg border transition-all flex items-center gap-3 ${
              !isBuyerContext
                ? 'bg-white/10 border-white/30 text-white'
                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Briefcase className="w-5 h-5" />
            <div className="text-left">
              <p className="font-light text-sm">Supplier</p>
              <p className="text-xs text-slate-500">Supplier portal access</p>
            </div>
          </button>
        </div>

        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-slate-500 font-light">
            Switch between roles to access different workflows and features.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}