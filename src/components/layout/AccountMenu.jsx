import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LogOut, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ContextSwitchModal } from '@/components/context/ContextSwitchModal';

export default function AccountMenu() {
  const [user, setUser] = useState(null);
  const [isInternalAdmin, setIsInternalAdmin] = useState(false);
  const [contextModalOpen, setContextModalOpen] = useState(false);

  useEffect(() => {
    base44.auth.me()
      .then(u => {
        setUser(u);
        setIsInternalAdmin(u?.role === 'INTERNAL_ADMIN');
      })
      .catch(() => {});
  }, []);

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
        >
          <span className="text-xs truncate">{user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-700">
        {isInternalAdmin && (
          <>
            <DropdownMenuItem
              onClick={() => setContextModalOpen(true)}
              className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white hover:bg-white/10"
            >
              <Monitor className="w-4 h-4" />
              <span>Switch Context</span>
            </DropdownMenuItem>
            <div className="border-t border-slate-700 my-1"></div>
          </>
        )}
        <DropdownMenuItem
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-red-400"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>

      <ContextSwitchModal open={contextModalOpen} onOpenChange={setContextModalOpen} />
    </DropdownMenu>
  );
}