import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Layers, Plus, Copy, Package, Battery, Box, 
  Recycle, Search, Sparkles, CheckCircle2, Database
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Entity schema would need a "is_template" field added to ProductComponent
// For now we'll use a naming convention or category

export default function SharedComponentLibrary({ onApplyTemplate, targetProductId }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'Packaging',
    material_type: '',
    quantity: 1,
    unit: 'kg',
    emission_factor: 0,
    data_quality_rating: 4
  });

  const queryClient = useQueryClient();

  // Fetch template components (using a marker in name or category)
  const { data: allComponents = [] } = useQuery({
    queryKey: ['template-components'],
    queryFn: () => base44.entities.ProductComponent.list()
  });

  // Filter for templates (those without product_id or marked as template)
  const templates = allComponents.filter(c => 
    c.name?.includes('[TEMPLATE]') || 
    c.comment?.includes('reusable_module') ||
    c.product_id === 'TEMPLATE' // Special marker
  );

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'Packaging', label: '📦 Standard Packaging', icon: Package },
    { value: 'Electronics', label: '🔌 Electronic Components', icon: Battery },
    { value: 'Materials', label: '🏗️ Raw Materials', icon: Box },
    { value: 'Processes', label: '⚙️ Common Processes', icon: Layers },
    { value: 'Transport', label: '🚚 Transport Templates', icon: Recycle }
  ];

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !searchTerm || 
      t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.material_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
      t.material_type === selectedCategory ||
      t.name?.includes(selectedCategory);
    
    return matchesSearch && matchesCategory;
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ProductComponent.create({
        ...data,
        product_id: 'TEMPLATE', // Special marker for templates
        comment: 'reusable_module',
        lifecycle_stage: 'Production'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-components'] });
      toast.success('Reusable module created');
      setIsCreateOpen(false);
      resetForm();
    }
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async (template) => {
      if (!targetProductId) {
        throw new Error('No target product selected');
      }

      return await base44.entities.ProductComponent.create({
        product_id: targetProductId,
        name: template.name.replace('[TEMPLATE]', '').trim(),
        material_type: template.material_type,
        quantity: template.quantity,
        unit: template.unit,
        emission_factor: template.emission_factor,
        emission_factor_source: template.emission_factor_source,
        data_quality_rating: template.data_quality_rating,
        assigned_dataset_id: template.assigned_dataset_id,
        assigned_dataset_name: template.assigned_dataset_name,
        geographic_origin: template.geographic_origin,
        co2e_kg: template.co2e_kg,
        lifecycle_stage: template.lifecycle_stage || 'Production',
        node_type: template.node_type || 'Component',
        comment: `Applied from template: ${template.name}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-components'] });
      toast.success('Template applied to product');
      if (onApplyTemplate) onApplyTemplate();
    }
  });

  const resetForm = () => {
    setNewTemplate({
      name: '',
      category: 'Packaging',
      material_type: '',
      quantity: 1,
      unit: 'kg',
      emission_factor: 0,
      data_quality_rating: 4
    });
  };

  const commonTemplates = [
    { name: 'Cardboard Box (Standard)', category: 'Packaging', material: 'Corrugated Cardboard', ef: 0.72 },
    { name: 'Plastic Clamshell', category: 'Packaging', material: 'PET Plastic', ef: 2.1 },
    { name: 'Lithium Battery Module', category: 'Electronics', material: 'Li-ion Battery', ef: 12.5 },
    { name: 'Standard PCB Assembly', category: 'Electronics', material: 'Electronic Circuit Board', ef: 8.2 },
    { name: 'Steel Sheet (1kg)', category: 'Materials', material: 'Steel', ef: 1.85 },
    { name: 'Aluminum Extrusion', category: 'Materials', material: 'Aluminum', ef: 8.1 }
  ];

  const quickCreateTemplates = () => {
    const toastId = toast.loading('Creating standard module library...');
    Promise.all(commonTemplates.map(t => 
      base44.entities.ProductComponent.create({
        product_id: 'TEMPLATE',
        name: `[TEMPLATE] ${t.name}`,
        material_type: t.material,
        quantity: 1,
        unit: 'kg',
        emission_factor: t.ef,
        data_quality_rating: 3,
        lifecycle_stage: 'Production',
        node_type: 'Component',
        comment: 'reusable_module'
      })
    )).then(() => {
      queryClient.invalidateQueries({ queryKey: ['template-components'] });
      toast.dismiss(toastId);
      toast.success(`Created ${commonTemplates.length} standard modules`);
    }).catch(() => {
      toast.dismiss(toastId);
      toast.error('Failed to create templates');
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#545454] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#86b027]" />
            Shared Component Library
          </h3>
          <p className="text-sm text-slate-500">Reusable modules - assess once, apply to hundreds of products</p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <Button 
              variant="outline"
              onClick={quickCreateTemplates}
              className="text-purple-600 border-purple-200"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Quick Start Library
            </Button>
          )}
          <Button 
            onClick={() => setIsCreateOpen(true)}
            className="bg-[#86b027] hover:bg-[#769c22] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Module
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-slate-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-[#86b027]" />
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Total Modules</p>
                <p className="text-2xl font-bold text-[#545454]">{templates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {categories.slice(1, 4).map(cat => {
          const count = templates.filter(t => 
            t.material_type === cat.value || t.name?.includes(cat.value)
          ).length;
          return (
            <Card key={cat.value} className="border-slate-100">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <cat.icon className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">{cat.label}</p>
                    <p className="text-2xl font-bold text-[#545454]">{count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Input 
          placeholder="Search modules..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
          icon={<Search className="w-4 h-4" />}
        />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filteredTemplates.length === 0 ? (
          <div className="col-span-3 text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Layers className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-600 font-medium">No reusable modules yet</p>
            <p className="text-sm text-slate-500 mt-1">Create standard components to reuse across products</p>
            <Button 
              onClick={() => setIsCreateOpen(true)}
              className="mt-4 bg-[#86b027] hover:bg-[#769c22] text-white"
            >
              Create First Module
            </Button>
          </div>
        ) : (
          filteredTemplates.map(template => (
            <Card key={template.id} className="border-slate-200 hover:border-[#86b027] hover:shadow-lg transition-all group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Badge className="bg-purple-100 text-purple-700 border-0">
                    {template.material_type || 'General'}
                  </Badge>
                  <Database className="w-4 h-4 text-slate-300" />
                </div>
                
                <h4 className="font-bold text-[#545454] mb-1 text-sm group-hover:text-[#86b027] transition-colors">
                  {template.name.replace('[TEMPLATE]', '').trim()}
                </h4>
                
                <div className="space-y-1 mb-3">
                  <p className="text-xs text-slate-500">
                    {template.quantity} {template.unit} • {template.emission_factor} kgCO₂e/{template.unit}
                  </p>
                  <p className="text-xs text-slate-500">
                    Total: <span className="font-bold text-slate-700">{template.co2e_kg?.toFixed(3) || 0} kg CO₂e</span>
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      template.data_quality_rating >= 4 ? 'bg-emerald-500' :
                      template.data_quality_rating >= 3 ? 'bg-amber-500' :
                      'bg-rose-500'
                    )} />
                    <span className="text-xs text-slate-500">DQR: {template.data_quality_rating}/5</span>
                  </div>
                </div>

                <Button 
                  size="sm" 
                  className="w-full bg-[#86b027] hover:bg-[#769c22] text-white"
                  onClick={() => applyTemplateMutation.mutate(template)}
                  disabled={!targetProductId}
                >
                  <Copy className="w-3 h-3 mr-2" />
                  Apply to Product
                </Button>

                {!targetProductId && (
                  <p className="text-xs text-amber-600 mt-2 text-center">
                    Select a product first
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Template Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#86b027]" />
              Create Reusable Module
            </DialogTitle>
            <DialogDescription>
              Model once, reuse across hundreds of products - one battery assessment for 50 different product LCAs
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Module Name *</Label>
                <Input 
                  placeholder="e.g. Standard Cardboard Box"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newTemplate.category} onValueChange={(v) => setNewTemplate({...newTemplate, category: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Packaging">📦 Packaging</SelectItem>
                    <SelectItem value="Electronics">🔌 Electronics</SelectItem>
                    <SelectItem value="Materials">🏗️ Raw Materials</SelectItem>
                    <SelectItem value="Processes">⚙️ Processes</SelectItem>
                    <SelectItem value="Transport">🚚 Transport</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Material Type *</Label>
                <Input 
                  placeholder="e.g. Cardboard, Steel"
                  value={newTemplate.material_type}
                  onChange={(e) => setNewTemplate({...newTemplate, material_type: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input 
                  type="number"
                  value={newTemplate.quantity}
                  onChange={(e) => setNewTemplate({...newTemplate, quantity: parseFloat(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input 
                  placeholder="kg, pcs, kWh"
                  value={newTemplate.unit}
                  onChange={(e) => setNewTemplate({...newTemplate, unit: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Emission Factor (kgCO₂e/unit)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={newTemplate.emission_factor}
                  onChange={(e) => setNewTemplate({...newTemplate, emission_factor: parseFloat(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Quality Rating</Label>
                <div className="flex items-center gap-1 h-10">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star}
                      type="button"
                      onClick={() => setNewTemplate({...newTemplate, data_quality_rating: star})}
                      className={cn(
                        "w-8 h-8 rounded flex items-center justify-center transition-all",
                        newTemplate.data_quality_rating >= star 
                          ? 'bg-amber-100 text-amber-500 ring-1 ring-amber-300' 
                          : 'bg-slate-100 text-slate-300'
                      )}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-bold text-blue-800 mb-2">💡 Reusability Benefit</p>
              <p className="text-xs text-blue-700">
                One battery module assessment = reusable in 50 different product LCAs.<br/>
                One packaging template = no need to reassess cardboard boxes for every product.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => createTemplateMutation.mutate({
                ...newTemplate,
                name: `[TEMPLATE] ${newTemplate.name}`
              })}
              disabled={!newTemplate.name || !newTemplate.material_type}
              className="bg-[#86b027] hover:bg-[#769c22] text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Create Module
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}