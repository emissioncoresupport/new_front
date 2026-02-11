import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Database, CheckCircle2, ArrowRight, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SupplyLensProductImporter({ open, onOpenChange, onProductCreated }) {
  const [step, setStep] = useState(1);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedSKU, setSelectedSKU] = useState(null);
  const [productData, setProductData] = useState({
    name: '',
    sku: '',
    category: '',
    weight_kg: '',
    manufacturer: ''
  });

  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-import'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: skus = [] } = useQuery({
    queryKey: ['skus-import'],
    queryFn: () => base44.entities.SKU.list()
  });

  const { data: supplierMappings = [] } = useQuery({
    queryKey: ['supplier-mappings-import'],
    queryFn: () => base44.entities.SupplierSKUMapping.list()
  });

  // Filter SKUs that are mapped to selected supplier
  const mappedSKUs = selectedSupplier 
    ? supplierMappings
        .filter(m => m.supplier_id === selectedSupplier.id)
        .map(m => skus.find(s => s.id === m.sku_id))
        .filter(Boolean)
    : [];

  const createProductMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: ['products-dpp'] });
      toast.success('Product created from Supply Lens data!');
      onProductCreated?.(newProduct);
      onOpenChange(false);
      setStep(1);
      setSelectedSupplier(null);
      setSelectedSKU(null);
    },
    onError: () => {
      toast.error('Failed to create product');
    }
  });

  const handleSupplierSelect = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    setSelectedSupplier(supplier);
    setProductData({
      ...productData,
      manufacturer: supplier.legal_name
    });
  };

  const handleSKUSelect = (skuId) => {
    const sku = skus.find(s => s.id === skuId);
    setSelectedSKU(sku);
    setProductData({
      name: sku.description || sku.sku_code,
      sku: sku.sku_code,
      category: sku.category || '',
      weight_kg: sku.weight_kg || '',
      manufacturer: productData.manufacturer
    });
    setStep(2);
  };

  const handleCreate = () => {
    if (!productData.name || !productData.sku) {
      toast.error('Product name and SKU are required');
      return;
    }
    createProductMutation.mutate(productData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            Import Product from Supply Lens
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6 py-4">
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
              <p className="text-sm text-indigo-900">
                <CheckCircle2 className="w-4 h-4 inline mr-2" />
                Pull product data from your existing supplier and SKU mappings
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Select Supplier *</Label>
                <Select value={selectedSupplier?.id} onValueChange={handleSupplierSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose supplier from Supply Lens..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{s.legal_name}</span>
                          <span className="text-xs text-slate-400">{s.country}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSupplier && (
                <div>
                  <Label>Select SKU *</Label>
                  <Select onValueChange={handleSKUSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose SKU..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mappedSKUs.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-400">
                          No SKUs mapped to this supplier
                        </div>
                      ) : (
                        mappedSKUs.map(sku => (
                          <SelectItem key={sku.id} value={sku.id}>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{sku.sku_code}</span>
                              {sku.description && <span className="text-xs text-slate-400">{sku.description}</span>}
                              {sku.category && <Badge variant="outline" className="text-xs w-fit">{sku.category}</Badge>}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedSupplier && (
                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="p-4">
                    <h4 className="font-bold text-slate-900 text-sm mb-2">Selected Supplier</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">Name:</span>
                        <p className="font-medium">{selectedSupplier.legal_name}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Country:</span>
                        <p className="font-medium">{selectedSupplier.country}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Tier:</span>
                        <Badge variant="outline" className="text-xs">{selectedSupplier.tier}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 py-4">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
              <p className="text-sm text-emerald-900">
                <CheckCircle2 className="w-4 h-4 inline mr-2" />
                Data auto-filled from Supply Lens. Review and adjust before creating.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Product Name *</Label>
                <Input 
                  value={productData.name} 
                  onChange={(e) => setProductData({...productData, name: e.target.value})}
                />
              </div>
              <div>
                <Label>SKU *</Label>
                <Input 
                  value={productData.sku} 
                  onChange={(e) => setProductData({...productData, sku: e.target.value})}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select 
                  value={productData.category} 
                  onValueChange={(v) => setProductData({...productData, category: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Electronics">Electronics</SelectItem>
                    <SelectItem value="Textile & Apparel">Textile & Apparel</SelectItem>
                    <SelectItem value="Footwear">Footwear</SelectItem>
                    <SelectItem value="Furniture">Furniture</SelectItem>
                    <SelectItem value="EV Batteries">EV Batteries</SelectItem>
                    <SelectItem value="Packaging">Packaging</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input 
                  type="number"
                  value={productData.weight_kg} 
                  onChange={(e) => setProductData({...productData, weight_kg: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <Label>Manufacturer</Label>
                <Input 
                  value={productData.manufacturer} 
                  onChange={(e) => setProductData({...productData, manufacturer: e.target.value})}
                />
              </div>
            </div>

            <Card className="bg-indigo-50 border-indigo-200">
              <CardContent className="p-4">
                <h4 className="font-bold text-indigo-900 text-sm mb-2">Supply Chain Info</h4>
                <div className="text-xs space-y-1">
                  <p><span className="text-indigo-700">Source:</span> Supply Lens SKU Mapping</p>
                  <p><span className="text-indigo-700">Supplier:</span> {selectedSupplier?.legal_name}</p>
                  <p><span className="text-indigo-700">Original SKU:</span> {selectedSKU?.sku_code}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step === 2 && (
            <Button 
              onClick={handleCreate}
              disabled={createProductMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {createProductMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...</>
              ) : (
                <><Package className="w-4 h-4 mr-2" /> Create Product & Continue</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}