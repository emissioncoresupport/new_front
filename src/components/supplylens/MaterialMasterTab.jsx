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
import { Textarea } from "@/components/ui/textarea";
import { Package, Plus, Search, Edit, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PermissionHide, PermissionDisable } from '../rbac/PermissionGuard';

export default function MaterialMasterTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'raw_material',
    cas_number: '',
    reach_status: 'not_evaluated',
    pfas_status: 'not_evaluated',
    recycled_content_percentage: 0,
    weight_kg: '',
    active: true
  });

  const queryClient = useQueryClient();

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['material-skus'],
    queryFn: () => base44.entities.MaterialSKU.list('-created_date'),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.MaterialSKU.create({
        tenant_id: user.tenant_id || user.company_id,
        ...data,
        weight_kg: data.weight_kg ? parseFloat(data.weight_kg) : null,
        recycled_content_percentage: parseFloat(data.recycled_content_percentage || 0),
        status: data.active ? 'active' : 'discontinued'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-skus'] });
      setShowModal(false);
      resetForm();
      toast.success('Material created successfully');
    },
    onError: (error) => toast.error('Failed to create material: ' + error.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaterialSKU.update(id, {
      ...data,
      weight_kg: data.weight_kg ? parseFloat(data.weight_kg) : null,
      recycled_content_percentage: parseFloat(data.recycled_content_percentage || 0),
      status: data.active ? 'active' : 'discontinued'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-skus'] });
      setShowModal(false);
      resetForm();
      toast.success('Material updated successfully');
    },
    onError: (error) => toast.error('Failed to update material: ' + error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MaterialSKU.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-skus'] });
      toast.success('Material deleted');
    },
    onError: (error) => toast.error('Failed to delete: ' + error.message)
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'raw_material',
      cas_number: '',
      reach_status: 'not_evaluated',
      pfas_status: 'not_evaluated',
      recycled_content_percentage: 0,
      weight_kg: '',
      active: true
    });
    setEditingMaterial(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingMaterial) {
      updateMutation.mutate({ id: editingMaterial.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (material) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name || '',
      description: material.description || '',
      category: material.category || 'raw_material',
      cas_number: material.cas_number || '',
      reach_status: material.reach_status || 'not_evaluated',
      pfas_status: material.pfas_status || 'not_evaluated',
      recycled_content_percentage: material.recycled_content_percentage || 0,
      weight_kg: material.weight_kg || '',
      active: material.status === 'active'
    });
    setShowModal(true);
  };

  const filteredMaterials = materials.filter(m =>
    m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.cas_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Stats Scorecard - Glassmorphic Compact */}
      <div className="bg-white/85 backdrop-blur-xl rounded-lg border border-white/40 shadow-xl p-3 mb-3">
        <div className="grid grid-cols-4 divide-x divide-slate-300/60">
          <div className="text-center py-2">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-[#86b027]/25 to-[#86b027]/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-[#86b027]" />
            </div>
            <p className="text-2xl font-semibold text-slate-900 mb-1">{materials.length}</p>
            <p className="text-[10px] text-slate-700 uppercase tracking-wider font-medium">Total Materials</p>
          </div>
          <div className="text-center py-2">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-[#86b027]/25 to-[#86b027]/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-[#86b027]" />
            </div>
            <p className="text-2xl font-semibold text-slate-900 mb-1">{materials.filter(m => m.status === 'active').length}</p>
            <p className="text-[10px] text-slate-700 uppercase tracking-wider font-medium">Active</p>
          </div>
          <div className="text-center py-2">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-[#02a1e8]/25 to-[#02a1e8]/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-[#02a1e8]" />
            </div>
            <p className="text-2xl font-semibold text-slate-900 mb-1">{materials.filter(m => m.pfas_status === 'contains_pfas').length}</p>
            <p className="text-[10px] text-slate-700 uppercase tracking-wider font-medium">PFAS Flagged</p>
          </div>
          <div className="text-center py-2">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-[#86b027]/25 to-[#86b027]/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-[#86b027]" />
            </div>
            <p className="text-2xl font-semibold text-slate-900 mb-1">
              {Math.round(materials.reduce((acc, m) => acc + (m.recycled_content_percentage || 0), 0) / (materials.length || 1))}%
            </p>
            <p className="text-[10px] text-slate-700 uppercase tracking-wider font-medium">Avg Recycled</p>
          </div>
        </div>
      </div>

      {/* Material List Scorecard - Glassmorphic */}
      <div className="bg-white/85 backdrop-blur-xl rounded-lg border border-white/40 shadow-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-slate-900">Materials</h2>
            <p className="text-sm text-slate-700 mt-0.5 font-medium">Catalog overview</p>
          </div>
          <PermissionHide module="supplylens" action="create_material">
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="bg-[#86b027] hover:bg-[#6d8f20] text-white font-medium px-5 py-2 rounded-sm text-sm tracking-wide shadow-none hover:shadow-md transition-all">
              Add Material
            </Button>
          </PermissionHide>
        </div>
          <div className="mb-6 relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 border-0 border-b border-slate-200 rounded-none focus:border-slate-900 bg-transparent"
            />
          </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Loading materials...</div>
        ) : filteredMaterials.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto mb-4 text-slate-200" />
            <p className="text-slate-600 font-light">No materials found</p>
            <p className="text-sm text-slate-400 mt-1">Add your first material to get started</p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredMaterials.map(material => (
              <div key={material.id} className="py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900 mb-1">{material.name}</h3>
                    <p className="text-sm text-slate-500 mb-2 line-clamp-1">{material.description || 'No description'}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                      <span className="capitalize">{material.category?.replace('_', ' ')}</span>
                      {material.cas_number && <span>CAS {material.cas_number}</span>}
                      {material.weight_kg && <span>{material.weight_kg} kg</span>}
                      {material.recycled_content_percentage > 0 && (
                        <span style={{ color: '#86b027' }}>{material.recycled_content_percentage}% recycled</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <PermissionHide module="supplylens" action="edit_material">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(material)} className="hover:bg-slate-100">
                      <Edit className="w-4 h-4 text-slate-400" />
                    </Button>
                  </PermissionHide>
                  <PermissionHide module="supplylens" action="delete_material">
                    <Button variant="ghost" size="icon" onClick={() => {
                      if (confirm('Delete this material?')) {
                        deleteMutation.mutate(material.id);
                      }
                    }} className="hover:bg-slate-100">
                      <Trash2 className="w-4 h-4 text-slate-400" />
                    </Button>
                  </PermissionHide>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? 'Edit Material' : 'Add New Material'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Material Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="raw_material">Raw Material</SelectItem>
                    <SelectItem value="component">Component</SelectItem>
                    <SelectItem value="packaging">Packaging</SelectItem>
                    <SelectItem value="chemical">Chemical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>CAS Number</Label>
                <Input
                  value={formData.cas_number}
                  onChange={(e) => setFormData({ ...formData, cas_number: e.target.value })}
                />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                />
              </div>
              <div>
                <Label>Recycled Content (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.recycled_content_percentage}
                  onChange={(e) => setFormData({ ...formData, recycled_content_percentage: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>REACH Status</Label>
                <Select value={formData.reach_status} onValueChange={(v) => setFormData({ ...formData, reach_status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_evaluated">Not Evaluated</SelectItem>
                    <SelectItem value="compliant">Compliant</SelectItem>
                    <SelectItem value="restricted">Restricted</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>PFAS Status</Label>
                <Select value={formData.pfas_status} onValueChange={(v) => setFormData({ ...formData, pfas_status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_evaluated">Not Evaluated</SelectItem>
                    <SelectItem value="pfas_free">PFAS Free</SelectItem>
                    <SelectItem value="contains_pfas">Contains PFAS</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#86b027] hover:bg-[#6d8f20]">
                {editingMaterial ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}