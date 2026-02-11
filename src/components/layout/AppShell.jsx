import React, { useState } from 'react';
import { navConfig } from './navConfig';
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

export default function AppShell({ children, currentPageName }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (itemPage) => {
    return currentPageName === itemPage;
  };

  const getBreadcrumb = () => {
    const map = {
      'SupplyLens': 'Overview',
      'EvidenceVault': 'Evidence Vault',
      'EvidenceRecordDetail': 'Evidence Detail',
      'EvidenceDrafts': 'Drafts',
      'EvidenceReviewQueue': 'Review Queue',
      'Contract2DecisionLog': 'Decision Log',
      'IntegrationHub': 'Integrations',
      'Contract2ExtractionJobs': 'Extraction Jobs',
      'Contract2MappingSessions': 'Mapping Sessions',
      'Contract2MappingSessionDetail': 'Mapping Detail',
      'Contract2Readiness': 'Readiness Dashboard',
    };
    return map[currentPageName] || 'SupplyLens';
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b-2 border-slate-200/50 bg-white/40">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="font-bold text-lg text-slate-900">SupplyLens</div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5 text-slate-600" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        {navConfig.map((section, idx) => (
          <div key={idx}>
            {!collapsed && (
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
                {section.section}
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.page);
                
                return (
                  <a
                    key={item.page}
                    href={createPageUrl(item.page)}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                      ${active 
                        ? 'bg-gradient-to-r from-[#86b027]/20 to-[#86b027]/10 border-2 border-[#86b027]/30 text-[#86b027] font-semibold shadow-sm' 
                        : 'hover:bg-slate-100/80 text-slate-700 hover:text-slate-900 border-2 border-transparent'
                      }
                      ${collapsed ? 'justify-center' : ''}
                    `}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#86b027]' : 'text-slate-500'}`} />
                    {!collapsed && (
                      <span className="text-sm">{item.label}</span>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t-2 border-slate-200/50 bg-white/40">
          <div className="text-xs text-slate-500">
            © 2026 SupplyLens
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden lg:block
          ${collapsed ? 'w-20' : 'w-64'}
          border-r-2 border-slate-200/50 
          bg-gradient-to-b from-white/90 to-white/70
          backdrop-blur-xl
          transition-all duration-300
          shadow-[4px_0_24px_rgba(0,0,0,0.06)]
        `}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-white z-50 lg:hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b-2 border-slate-200">
              <div className="font-bold text-lg text-slate-900">SupplyLens</div>
              <button onClick={() => setMobileOpen(false)}>
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b-2 border-slate-200/50 bg-white/90 backdrop-blur-xl shadow-sm flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div className="text-sm font-medium text-slate-900">{getBreadcrumb()}</div>
          </div>
          <Badge className="bg-slate-100 text-slate-700 border-2 border-slate-300 font-mono text-xs">
            Preview (Base44)
          </Badge>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}