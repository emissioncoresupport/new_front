import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Building, Check } from 'lucide-react';

export default function LegalEntityPicker({ value, onChange }) {
  const [search, setSearch] = useState('');

  const { data: entities = [] } = useQuery({
    queryKey: ['legal-entities', search],
    queryFn: async () => {
      const allEntities = await base44.entities.LegalEntity.list();
      return allEntities.filter(e => 
        e.legal_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.id.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 10);
    }
  });

  const { data: selectedEntity } = useQuery({
    queryKey: ['legal-entity', value],
    queryFn: async () => {
      if (!value) return null;
      const allEntities = await base44.entities.LegalEntity.list();
      return allEntities.find(e => e.id === value) || null;
    },
    enabled: !!value
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search legal entities..."
          className="pl-10"
        />
      </div>

      {selectedEntity && (
        <Card className="p-3 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <Check className="w-4 h-4 text-green-600" />
            <div className="flex-1">
              <div className="font-medium text-sm text-slate-900">{selectedEntity.legal_name}</div>
              <div className="text-xs text-slate-600 font-mono">{selectedEntity.id}</div>
            </div>
            <Badge className="bg-green-100 text-green-700">Selected</Badge>
          </div>
        </Card>
      )}

      {search && entities.length > 0 && !selectedEntity && (
        <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-2 bg-white">
          {entities.map((entity) => (
            <button
              key={entity.id}
              onClick={() => {
                onChange(entity.id);
                setSearch('');
              }}
              className="w-full text-left p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Building className="w-4 h-4 text-slate-400" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-slate-900">{entity.legal_name}</div>
                  <div className="text-xs text-slate-600 font-mono">{entity.id}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {search && entities.length === 0 && (
        <div className="text-sm text-slate-500 text-center py-4">
          No legal entities found
        </div>
      )}
    </div>
  );
}