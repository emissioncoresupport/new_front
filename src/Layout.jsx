import React, { useState, useEffect } from 'react';
import '@/globals.css';
import Sidebar from '@/components/layout/Sidebar';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import AccountMenu from '@/components/layout/AccountMenu';
import { TenantContextProvider } from '@/components/context/TenantContext';

export default function Layout({ children }) {
  const [selectedScope, setSelectedScope] = useState(null);

  // Broadcast scope changes to all components
  useEffect(() => {
    if (selectedScope) {
      window.dispatchEvent(new CustomEvent('scopeChanged', { detail: selectedScope }));
    }
  }, [selectedScope]);

  return (
    <TenantContextProvider>
      <div className="flex h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-[#86b027]/10 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto h-full w-full relative">
        {/* Top Right Menu */}
        <div className="absolute top-4 right-6 z-50 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/50 backdrop-blur-sm">
            <Bell className="w-4 h-4 text-slate-600" />
          </Button>
          <AccountMenu />
        </div>
        <div data-selected-scope={selectedScope?.id}>
          {children}
        </div>
        </main>
      </div>
    </TenantContextProvider>
  );
}