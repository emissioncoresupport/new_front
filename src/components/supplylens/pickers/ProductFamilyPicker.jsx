import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Check } from 'lucide-react';

export default function ProductFamilyPicker({ value, onChange }) {
  const [search, setSearch] = useState('');

  const { data: products = [] } = useQuery({
    queryKey: ['product-families', search],
    queryFn: async () => {
      const allProducts = await base44.entities.Product.list();
      return allProducts.filter(p => 
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 10);
    }
  });

  const { data: selectedProduct } = useQuery({
    queryKey: ['product-family', value],
    queryFn: async () => {
      if (!value) return null;
      const allProducts = await base44.entities.Product.list();
      return allProducts.find(p => p.id === value) || null;
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
          placeholder="Search product families..."
          className="pl-10"
        />
      </div>

      {selectedProduct && (
        <Card className="p-3 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <Check className="w-4 h-4 text-green-600" />
            <div className="flex-1">
              <div className="font-medium text-sm text-slate-900">{selectedProduct.name}</div>
              <div className="text-xs text-slate-600 font-mono">{selectedProduct.id}</div>
            </div>
            <Badge className="bg-green-100 text-green-700">Selected</Badge>
          </div>
        </Card>
      )}

      {search && products.length > 0 && !selectedProduct && (
        <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-2 bg-white">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => {
                onChange(product.id);
                setSearch('');
              }}
              className="w-full text-left p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-slate-400" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-slate-900">{product.name}</div>
                  <div className="text-xs text-slate-600 font-mono">{product.id}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {search && products.length === 0 && (
        <div className="text-sm text-slate-500 text-center py-4">
          No product families found
        </div>
      )}
    </div>
  );
}