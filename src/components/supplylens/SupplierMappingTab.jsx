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
import { Box, Plus, Search, Edit, Trash2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

export default function SupplierMappingTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  const [formData, setFormData] = useState({
    supplier_id: '',
    sku_id: '',
    relationship_type: 'manufacturer',
    is_primary_supplier: false,
    mapping_confidence: 100,
    source_system: 'manual',
    active: true
  });

  const queryClient = useQueryClient();

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['supplier-sku-mappings'],
    queryFn: () => base44.entities.SupplierSKUMapping.list('-created_date'),
    initialData: []
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    initialData: []
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['material-skus'],
    queryFn: () => base44.entities.MaterialSKU.list(),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.SupplierSKUMapping.create({
        tenant_id: user.tenant_id || user.company_id,
        ...data,
        mapping_confidence: parseFloat(data.mapping_confidence)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-sku-mappings'] });
      setShowModal(false);
      resetForm();
      toast.success('Mapping created successfully');
    },
    onError: (error) => toast.error('Failed to create mapping: ' + error.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SupplierSKUMapping.update(id, {
      ...data,
      mapping_confidence: parseFloat(data.mapping_confidence)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-sku-mappings'] });
      setShowModal(false);
      resetForm();
      toast.success('Mapping updated successfully');
    },
    onError: (error) => toast.error('Failed to update mapping: ' + error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SupplierSKUMapping.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-sku-mappings'] });
      toast.success('Mapping deleted');
    },
    onError: (error) => toast.error('Failed to delete: ' + error.message)
  });

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      sku_id: '',
      relationship_type: 'manufacturer',
      is_primary_supplier: false,
      mapping_confidence: 100,
      source_system: 'manual',
      active: true
    });
    setEditingMapping(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingMapping) {
      updateMutation.mutate({ id: editingMapping.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (mapping) => {
    setEditingMapping(mapping);
    setFormData({
      supplier_id: mapping.supplier_id || '',
      sku_id: mapping.sku_id || '',
      relationship_type: mapping.relationship_type || 'manufacturer',
      is_primary_supplier: mapping.is_primary_supplier || false,
      mapping_confidence: mapping.mapping_confidence || 100,
      source_system: mapping.source_system || 'manual',
      active: mapping.active !== false
    });
    setShowModal(true);
  };

  const getSupplierName = (id) => suppliers.find(s => s.id === id)?.legal_name || 'Unknown';
  const getMaterialName = (id) => materials.find(m => m.id === id)?.name || 'Unknown';

  const filteredMappings = mappings.filter(m => {
    const supplierName = getSupplierName(m.supplier_id).toLowerCase();
    const materialName = getMaterialName(m.sku_id).toLowerCase();
    return supplierName.includes(searchQuery.toLowerCase()) || 
           materialName.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Stats Scorecard */}
      <div className="bg-white rounded-lg shadow-md border border-slate-200 p-8">
        <div className="grid grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#86b027]/10 flex items-center justify-center">
              <Box className="w-7 h-7 text-[#86b027]" />
            </div>
            <p className="text-4xl font-light text-slate-900 mb-1">{mappings.length}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Total Mappings</p>
          </div>
          <div className="text-center border-l border-slate-100">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#86b027]/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-[#86b027]" />
            </div>
            <p className="text-4xl font-light text-slate-900 mb-1">{mappings.filter(m => m.active).length}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Active</p>
          </div>
          <div className="text-center border-l border-slate-100">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#02a1e8]/10 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-[#02a1e8]" />
            </div>
            <p className="text-4xl font-light text-slate-900 mb-1">{mappings.filter(m => m.is_primary_supplier).length}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Primary</p>
          </div>
        </div>
      </div>

      {/* Mapping List Scorecard */}
      <div className="bg-white rounded-lg shadow-md border border-slate-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-light text-slate-900">Supplier Mappings</h2>
            <p className="text-sm text-slate-500 mt-1">Material-supplier links</p>
          </div>
          <Button onClick={() => { resetForm(); setShowModal(true); }} className="bg-slate-900 hover:bg-slate-800 text-white rounded-sm px-6">
            Add Mapping
          </Button>
        </div>
          <div className="mb-6 relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search mappings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 border-0 border-b border-slate-200 rounded-none focus:border-slate-900 bg-transparent"
            />
          </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Loading mappings...</div>
        ) : filteredMappings.length === 0 ? (
          <div className="text-center py-20">
            <LinkIcon className="w-16 h-16 mx-auto mb-4 text-slate-200" />
            <p className="text-slate-600 font-light">No mappings found</p>
            <p className="text-sm text-slate-400 mt-1">Link suppliers to materials to get started</p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredMappings.map(mapping => (
              <div key={mapping.id} className="py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: mapping.is_primary_supplier ? '#86b02715' : '#f1f5f9' }}>
                    <LinkIcon className="w-5 h-5" style={{ color: mapping.is_primary_supplier ? '#86b027' : '#94a3b8' }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900">{getSupplierName(mapping.supplier_id)}</span>
                      <span className="text-slate-300">→</span>
                      <span className="text-slate-700">{getMaterialName(mapping.sku_id)}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-slate-500">
                      <span className="capitalize">{mapping.relationship_type?.replace('_', ' ')}</span>
                      {mapping.is_primary_supplier && <span style={{ color: '#86b027' }}>• Primary</span>}
                      <span>• {mapping.mapping_confidence}% confidence</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(mapping)} className="hover:bg-slate-100">
                    <Edit className="w-4 h-4 text-slate-400" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => {
                    if (confirm('Delete this mapping?')) {
                      deleteMutation.mutate(mapping.id);
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

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMapping ? 'Edit Mapping' : 'Add New Mapping'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Supplier *</Label>
                <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>{supplier.legal_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Material/SKU *</Label>
                <Select value={formData.sku_id} onValueChange={(v) => setFormData({ ...formData, sku_id: v })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map(material => (
                      <SelectItem key={material.id} value={material.id}>{material.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Relationship Type</Label>
                <Select value={formData.relationship_type} onValueChange={(v) => setFormData({ ...formData, relationship_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manufacturer">Manufacturer</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                    <SelectItem value="raw_material_supplier">Raw Material Supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Confidence (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.mapping_confidence}
                  onChange={(e) => setFormData({ ...formData, mapping_confidence: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_primary_supplier}
                  onChange={(e) => setFormData({ ...formData, is_primary_supplier: e.target.checked })}
                  className="rounded"
                />
                <Label>Primary Supplier</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded"
                />
                <Label>Active</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#86b027] hover:bg-[#6d8f20]">
                {editingMapping ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}