import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Check } from 'lucide-react';
import { MockEvidenceApiAdapter } from '../adapters/EvidenceApiAdapter';

export default function SupplierPicker({ value, onChange, adapter = null }) {
  const [search, setSearch] = useState('');
  const adapterInstance = adapter || new MockEvidenceApiAdapter(new Set(), () => {});

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: async () => {
      try {
        // Use unified entities interface if available
        if (adapterInstance?.entities?.Supplier?.search) {
          const results = await adapterInstance.entities.Supplier.search(search);
          return (results || []).slice(0, 10);
        }
        // Fallback to legacy method
        const results = await adapterInstance.searchSuppliers(search);
        return (results || []).slice(0, 10);
      } catch (err) {
        console.error('[SupplierPicker] Search failed:', err);
        return [];
      }
    }
  });

  const { data: selectedSupplier } = useQuery({
    queryKey: ['supplier', value],
    queryFn: async () => {
      if (!value) return null;
      try {
        // Use unified entities interface if available
        if (adapterInstance?.entities?.Supplier?.read) {
          return await adapterInstance.entities.Supplier.read(value);
        }
        // Fallback to legacy method
        return await adapterInstance.getSupplierById(value);
      } catch (err) {
        console.error('[SupplierPicker] Get supplier failed:', err);
        return null;
      }
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
          placeholder="Search suppliers..."
          className="pl-10"
        />
      </div>

      {selectedSupplier && (
         <Card className="p-3 bg-green-50 border-green-200">
           <div className="flex items-center gap-3">
             <Check className="w-4 h-4 text-green-600" />
             <div className="flex-1">
               <div className="font-medium text-sm text-slate-900">{String(selectedSupplier.name || selectedSupplier.legal_name || '')}</div>
               <div className="text-xs text-slate-600">{String(selectedSupplier.country_code || '')}</div>
               <div className="text-xs text-slate-600 font-mono">{String(selectedSupplier.id || '')}</div>
             </div>
             <Badge className="bg-green-100 text-green-700">Selected</Badge>
           </div>
         </Card>
       )}

      {search && suppliers.length > 0 && !selectedSupplier && (
         <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-2 bg-white">
           {suppliers.map((supplier) => (
             <button
               key={supplier.id}
               onClick={() => {
                 onChange(supplier.id, supplier);
                 setSearch('');
               }}
               className="w-full text-left p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-colors"
             >
               <div className="flex items-center gap-3">
                 <Users className="w-4 h-4 text-slate-400" />
                 <div className="flex-1">
                   <div className="font-medium text-sm text-slate-900">{String(supplier.name || supplier.legal_name || '')}</div>
                   <div className="text-xs text-slate-600">{String(supplier.country_code || '')}</div>
                   <div className="text-xs text-slate-600 font-mono">{String(supplier.id || '')}</div>
                 </div>
               </div>
             </button>
           ))}
         </div>
       )}

      {search && suppliers.length === 0 && (
        <div className="text-sm text-slate-500 text-center py-4">
          No suppliers found
        </div>
      )}
    </div>
  );
}