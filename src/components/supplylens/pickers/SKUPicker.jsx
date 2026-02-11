import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Check } from 'lucide-react';

export default function SKUPicker({ value, onChange }) {
  const [search, setSearch] = useState('');

  const { data: skus = [] } = useQuery({
    queryKey: ['skus', search],
    queryFn: async () => {
      const allSKUs = await base44.entities.SKU.list();
      return allSKUs.filter(s => 
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.sku_code?.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 10);
    }
  });

  const { data: selectedSKU } = useQuery({
    queryKey: ['sku', value],
    queryFn: async () => {
      if (!value) return null;
      const allSKUs = await base44.entities.SKU.list();
      return allSKUs.find(s => s.id === value) || null;
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
          placeholder="Search SKUs..."
          className="pl-10"
        />
      </div>

      {selectedSKU && (
        <Card className="p-3 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <Check className="w-4 h-4 text-green-600" />
            <div className="flex-1">
              <div className="font-medium text-sm text-slate-900">{selectedSKU.name}</div>
              <div className="text-xs text-slate-600">{selectedSKU.sku_code}</div>
              <div className="text-xs text-slate-600 font-mono">{selectedSKU.id}</div>
            </div>
            <Badge className="bg-green-100 text-green-700">Selected</Badge>
          </div>
        </Card>
      )}

      {search && skus.length > 0 && !selectedSKU && (
        <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-2 bg-white">
          {skus.map((sku) => (
            <button
              key={sku.id}
              onClick={() => {
                // DETERMINISTIC: Only set value on explicit selection, never from typed text
                onChange(sku.id);
                setSearch('');
              }}
              className="w-full text-left p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-slate-400" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-slate-900">{sku.name}</div>
                  <div className="text-xs text-slate-600">{sku.sku_code}</div>
                  <div className="text-xs text-slate-600 font-mono">{sku.id}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {search && skus.length === 0 && (
        <div className="text-sm text-slate-500 text-center py-4 border border-slate-200 rounded-lg bg-slate-50">
          <p className="mb-2">No SKUs found</p>
          <p className="text-xs text-slate-600">
            Switch to "Enter code instead" to provide a component code
          </p>
        </div>
      )}
    </div>
  );
}