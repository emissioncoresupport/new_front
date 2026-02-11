import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, Plus, Search, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function BOMManagementTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [expandedBOMs, setExpandedBOMs] = useState(new Set());
  const [formData, setFormData] = useState({
    parent_sku_id: '',
    child_sku_id: '',
    quantity: '',
    unit: 'pieces',
    bom_level: 1
  });

  const queryClient = useQueryClient();

  const { data: bomItems = [], isLoading } = useQuery({
    queryKey: ['bom-items'],
    queryFn: () => base44.entities.BOMItem.list(),
    initialData: []
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['material-skus'],
    queryFn: () => base44.entities.MaterialSKU.list(),
    initialData: []
  });

  const { data: products = [] } = useQuery({
    queryKey: ['product-skus'],
    queryFn: () => base44.entities.ProductSKU.list(),
    initialData: []
  });

  const allSKUs = [...materials, ...products];

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.BOMItem.create({
        tenant_id: user.tenant_id || user.company_id,
        ...data,
        uom: data.unit,
        quantity: parseFloat(data.quantity),
        status: 'active'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bom-items'] });
      setShowModal(false);
      resetForm();
      toast.success('BOM item created successfully');
    },
    onError: (error) => toast.error('Failed to create BOM item: ' + error.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BOMItem.update(id, {
      ...data,
      uom: data.unit,
      quantity: parseFloat(data.quantity)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bom-items'] });
      setShowModal(false);
      resetForm();
      toast.success('BOM item updated successfully');
    },
    onError: (error) => toast.error('Failed to update BOM item: ' + error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BOMItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bom-items'] });
      toast.success('BOM item deleted');
    },
    onError: (error) => toast.error('Failed to delete: ' + error.message)
  });

  const resetForm = () => {
    setFormData({
      parent_sku_id: '',
      child_sku_id: '',
      quantity: '',
      unit: 'pieces',
      bom_level: 1
    });
    setEditingItem(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      parent_sku_id: item.parent_sku_id || '',
      child_sku_id: item.child_sku_id || '',
      quantity: item.quantity || '',
      unit: item.uom || 'pieces',
      bom_level: item.bom_level || 1
    });
    setShowModal(true);
  };

  const getSKUName = (id) => allSKUs.find(s => s.id === id)?.name || 'Unknown';

  // Group BOM items by parent
  const bomsByParent = bomItems.reduce((acc, item) => {
    const parentId = item.parent_sku_id;
    if (!acc[parentId]) acc[parentId] = [];
    acc[parentId].push(item);
    return acc;
  }, {});

  const toggleExpand = (parentId) => {
    const newExpanded = new Set(expandedBOMs);
    if (newExpanded.has(parentId)) {
      newExpanded.delete(parentId);
    } else {
      newExpanded.add(parentId);
    }
    setExpandedBOMs(newExpanded);
  };

  return (
    <div className="space-y-3">
      {/* Stats Scorecard - Glassmorphic Compact */}
      <div className="bg-white/85 backdrop-blur-xl rounded-lg border border-white/40 shadow-xl p-3 mb-3">
        <div className="grid grid-cols-3 divide-x divide-slate-300/60">
          <div className="text-center py-2">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-[#02a1e8]/25 to-[#02a1e8]/10 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-[#02a1e8]" />
            </div>
            <p className="text-2xl font-semibold text-slate-900 mb-1">{Object.keys(bomsByParent).length}</p>
            <p className="text-[10px] text-slate-700 uppercase tracking-wider font-medium">Products</p>
          </div>
          <div className="text-center py-2">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-[#86b027]/25 to-[#86b027]/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-[#86b027]" />
            </div>
            <p className="text-2xl font-semibold text-slate-900 mb-1">{bomItems.length}</p>
            <p className="text-[10px] text-slate-700 uppercase tracking-wider font-medium">Total Items</p>
          </div>
          <div className="text-center py-2">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-slate-400/25 to-slate-400/10 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-2xl font-semibold text-slate-900 mb-1">
              {bomItems.length > 0 ? Math.round(bomItems.reduce((acc, b) => acc + b.bom_level, 0) / bomItems.length) : 0}
            </p>
            <p className="text-[10px] text-slate-700 uppercase tracking-wider font-medium">Avg Level</p>
          </div>
        </div>
      </div>

      {/* BOM List Scorecard - Glassmorphic */}
      <div className="bg-white/85 backdrop-blur-xl rounded-lg border border-white/40 shadow-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-slate-900">Bill of Materials</h2>
            <p className="text-sm text-slate-700 mt-0.5 font-medium">Product hierarchies</p>
          </div>
          <Button onClick={() => { resetForm(); setShowModal(true); }} className="bg-[#86b027] hover:bg-[#6d8f20] text-white font-medium px-5 py-2 rounded-sm text-sm tracking-wide shadow-none hover:shadow-md transition-all">
            Add Item
          </Button>
        </div>
          <div className="mb-6 relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search BOMs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 border-0 border-b border-slate-200 rounded-none focus:border-slate-900 bg-transparent"
            />
          </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Loading BOMs...</div>
        ) : Object.keys(bomsByParent).length === 0 ? (
          <div className="text-center py-20">
            <GitBranch className="w-16 h-16 mx-auto mb-4 text-slate-200" />
            <p className="text-slate-600 font-light">No BOM items found</p>
            <p className="text-sm text-slate-400 mt-1">Add your first BOM item to get started</p>
          </div>
        ) : (
          <div className="space-y-0">
            {Object.entries(bomsByParent).map(([parentId, items]) => (
              <div key={parentId} className="border-b border-slate-100">
                <div
                  onClick={() => toggleExpand(parentId)}
                  className="py-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {expandedBOMs.has(parentId) ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    <GitBranch className="w-4 h-4 text-[#02a1e8]" />
                    <div>
                      <h3 className="font-medium text-slate-900">{getSKUName(parentId)}</h3>
                      <p className="text-xs text-slate-500">{items.length} components</p>
                    </div>
                  </div>
                </div>

                {expandedBOMs.has(parentId) && (
                  <div className="pl-10 pb-3 bg-slate-50/50">
                    {items.map(item => (
                      <div key={item.id} className="py-3 border-b border-slate-100 last:border-b-0 hover:bg-white transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                            <span className="text-xs text-slate-600">{item.bom_level}</span>
                          </div>
                          <div className="flex-1">
                            <span className="text-sm text-slate-900">{getSKUName(item.child_sku_id)}</span>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {item.quantity} {item.uom}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="hover:bg-slate-100">
                            <Edit className="w-4 h-4 text-slate-400" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => {
                            if (confirm('Delete this BOM item?')) {
                              deleteMutation.mutate(item.id);
                            }
                          }} className="hover:bg-slate-100">
                            <Trash2 className="w-4 h-4 text-slate-400" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit BOM Item' : 'Add New BOM Item'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Parent Product/Assembly *</Label>
                <Select value={formData.parent_sku_id} onValueChange={(v) => setFormData({ ...formData, parent_sku_id: v })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent" />
                  </SelectTrigger>
                  <SelectContent>
                    {allSKUs.map(sku => (
                      <SelectItem key={sku.id} value={sku.id}>{sku.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Child Component/Material *</Label>
                <Select value={formData.child_sku_id} onValueChange={(v) => setFormData({ ...formData, child_sku_id: v })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select component" />
                  </SelectTrigger>
                  <SelectContent>
                    {allSKUs.map(sku => (
                      <SelectItem key={sku.id} value={sku.id}>{sku.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pieces">Pieces</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="g">Grams</SelectItem>
                    <SelectItem value="m">Meters</SelectItem>
                    <SelectItem value="m2">Square Meters</SelectItem>
                    <SelectItem value="L">Liters</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>BOM Level</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.bom_level}
                  onChange={(e) => setFormData({ ...formData, bom_level: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#86b027] hover:bg-[#6d8f20]">
                {editingItem ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}