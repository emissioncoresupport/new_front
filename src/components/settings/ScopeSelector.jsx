import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target } from "lucide-react";

export default function ScopeSelector({ onScopeChange }) {
  const [selectedScopeId, setSelectedScopeId] = useState(null);

  const { data: scopes = [] } = useQuery({
    queryKey: ['reporting-scopes'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.ReportingScope.filter({ 
        tenant_id: user.tenant_id,
        active: true 
      });
    }
  });

  useEffect(() => {
    if (scopes.length > 0 && !selectedScopeId) {
      const defaultScope = scopes.find(s => s.name === "Default Scope") || scopes[0];
      setSelectedScopeId(defaultScope.id);
      onScopeChange?.(defaultScope);
      
      // Persist to localStorage
      localStorage.setItem('selectedScopeId', defaultScope.id);
    }
  }, [scopes, selectedScopeId, onScopeChange]);

  // Restore from localStorage on mount
  useEffect(() => {
    const savedScopeId = localStorage.getItem('selectedScopeId');
    if (savedScopeId && scopes.length > 0) {
      const scope = scopes.find(s => s.id === savedScopeId);
      if (scope) {
        setSelectedScopeId(savedScopeId);
        onScopeChange?.(scope);
      }
    }
  }, [scopes]);

  const handleScopeChange = (scopeId) => {
    setSelectedScopeId(scopeId);
    const scope = scopes.find(s => s.id === scopeId);
    localStorage.setItem('selectedScopeId', scopeId);
    onScopeChange?.(scope);
  };

  if (scopes.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#86b027]/10 to-transparent rounded-lg border border-[#86b027]/20">
      <Target className="w-4 h-4 text-[#86b027]" />
      <Select value={selectedScopeId} onValueChange={handleScopeChange}>
        <SelectTrigger className="border-none shadow-none h-auto p-0 focus:ring-0 min-w-[200px]">
          <SelectValue placeholder="Select reporting scope" />
        </SelectTrigger>
        <SelectContent align="end">
          {scopes.map(scope => (
            <SelectItem key={scope.id} value={scope.id}>
              <div className="flex flex-col items-start py-1">
                <span className="font-semibold text-sm">{scope.name}</span>
                <span className="text-xs text-slate-500">
                  {scope.scope_type} • {scope.legal_entity_ids?.length || 0} entities • {scope.site_ids?.length || 0} sites
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}