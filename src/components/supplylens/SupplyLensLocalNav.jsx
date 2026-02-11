import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Inbox, FileText, Network, Settings, Shield, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'inbox', label: 'Inbox', icon: Inbox, path: createPageUrl('SupplyLens?tab=inbox') },
  { id: 'evidence', label: 'Evidence', icon: FileText, path: createPageUrl('SupplyLens?tab=evidence') },
  { id: 'network', label: 'Network', icon: Network, path: createPageUrl('SupplyLens?tab=network') },
  { id: 'integrations', label: 'Integrations', icon: Settings, path: createPageUrl('SupplyLens?tab=integrations') },
  { id: 'controls', label: 'Controls', icon: Shield, path: createPageUrl('SupplyLens?tab=controls') },
  { id: 'readiness', label: 'Readiness', icon: Target, path: createPageUrl('SupplyLens?tab=readiness') }
];

export default function SupplyLensLocalNav({ activeTab }) {
  const location = useLocation();

  const isActive = (itemId) => {
    return activeTab === itemId;
  };

  return (
    <div className="bg-white border-b-2 border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)] sticky top-0 z-40 backdrop-blur-xl bg-white/95">
      <div className="max-w-[1920px] mx-auto px-8">
        <div className="flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.id);
            
            return (
              <Link
                key={item.id}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-6 py-4 border-b-2 transition-all duration-200 relative group",
                  active
                    ? "border-[#86b027] text-[#86b027]"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-200"
                )}
              >
                <Icon className={cn("w-4 h-4 transition-transform", active && "scale-110")} />
                <span className={cn("text-sm font-medium tracking-wide", active && "font-semibold")}>
                  {item.label}
                </span>
                {active && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#86b027]/0 via-[#86b027] to-[#86b027]/0"></div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}