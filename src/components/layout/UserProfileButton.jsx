import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Settings, Building2, Briefcase } from 'lucide-react';
import UserProfileModal from './UserProfileModal';
import { ContextSwitchModal } from '@/components/context/ContextSwitchModal';
import { cn } from "@/lib/utils";
import { getCurrentCompany, getCurrentUser, getUserMe, getUserListByCompany } from '@/components/utils/multiTenant';

export default function UserProfileButton({ collapsed }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [contextModalOpen, setContextModalOpen] = useState(false);

  const { data: user1 } = useQuery({
    queryKey: ['auth-user-sidebar'],
    queryFn: () => getUserMe
  });

  const { data: user, isLoading: loadingMe } = useQuery({
        queryKey: ['auth-user'],
        queryFn: getUserMe
      });

  const initials = user?.full_name 
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <>
      <div className="p-4 border-t border-white/5 space-y-2">
        {user?.role === 'admin' && (
          <button
            onClick={() => setContextModalOpen(true)}
            className="w-full px-3 py-2 text-xs font-light text-slate-400 hover:text-white rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all text-left"
          >
            {collapsed ? (
              <div className="text-center">⚙️</div>
            ) : (
              <p>Switch Context</p>
            )}
          </button>
        )}
        
        <div 
          onClick={() => setModalOpen(true)}
          title={collapsed ? (user?.full_name || user?.email) : ''}
          className={cn(
            "flex items-center rounded-lg hover:bg-white/5 cursor-pointer transition-colors",
            collapsed ? "justify-center px-2 py-2" : "gap-3 px-2 py-2"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-[#86b027] flex items-center justify-center text-xs font-bold shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.full_name || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email || ''}</p>
              </div>
              <Settings className="w-4 h-4 text-slate-400" />
            </>
          )}
        </div>
      </div>

      <UserProfileModal open={modalOpen} onOpenChange={setModalOpen} />
      <ContextSwitchModal open={contextModalOpen} onOpenChange={setContextModalOpen} />
    </>
  );
}