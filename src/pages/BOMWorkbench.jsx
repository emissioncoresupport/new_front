import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save, GitBranch, Package, Calendar, CheckCircle2, Layers, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function BOMWorkbench() {
  const [activeTab, setActiveTab] = useState('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBOM, setEditingBOM] = useState(null);
  const [bomLines, setBomLines] = useState([]);
  const [newBOM, setNewBOM] = useState({
    sku_id: '',
    bom_version: '',
    status: 'draft',
    valid_from: new Date().toISOString().split('T')[0],
    valid_to: ''
  });
  const queryClient = useQueryClient();

  const { data: boms = [] } = useQuery({
    queryKey: ['boms'],
    queryFn: () => base44.entities.BOM.list('-created_date')
  });

  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts'],
    queryFn: () => base44.entities.Part.list()
  });

  const { data: allBomLines = [] } = useQuery({
    queryKey: ['bom-lines'],
    queryFn: () => base44.entities.BOMLine.list()
  });

  const createBOMMutation = useMutation({
    mutationFn: async ({ bom, lines }) => {
      const user = await base44.auth.me();
      const createdBOM = await base44.entities.BOM.create(bom);
      
      for (const line of lines) {
        await base44.entities.BOMLine.create({
          tenant_id: createdBOM.tenant_id,
          bom_id: createdBOM.id,
          part_id: line.part_id,
          quantity: line.quantity,
          uom: line.uom,
          scrap_factor: line.scrap_factor || 0,
          parent_bom_line_id: line.parent_bom_line_id || null,
          line_number: line.line_number
        });
      }

      await base44.entities.ChangeLog.create({
        tenant_id: createdBOM.tenant_id,
        entity_type: 'BOM',
        entity_id: createdBOM.id,
        action: 'create',
        actor_id: user.email,
        actor_role: user.role || 'user',
        reason_text: 'BOM created in workbench'
      });

      return createdBOM;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boms'] });
      queryClient.invalidateQueries({ queryKey: ['bom-lines'] });
      toast.success('BOM created successfully');
      setShowCreateModal(false);
      resetForm();
    }
  });

  const publishBOMMutation = useMutation({
    mutationFn: async (bomId) => {
      const user = await base44.auth.me();
      
      await base44.entities.ApprovalTask.create({
        tenant_id: user.tenant_id || 'default',
        task_type: 'PUBLISH_BOM',
        entity_type: 'BOM',
        entity_id: bomId,
        status: 'pending',
        assigned_role: 'Approver',
        priority: 'medium',
        description: 'BOM ready for publishing'
      });

      await base44.entities.ChangeLog.create({
        tenant_id: user.tenant_id || 'default',
        entity_type: 'BOM',
        entity_id: bomId,
        action: 'approve',
        actor_id: user.email,
        actor_role: user.role || 'user',
        reason_text: 'BOM submitted for publishing'
      });
    },
    onSuccess: () => {
      toast.success('BOM submitted for approval');
      queryClient.invalidateQueries();
    }
  });

  const resetForm = () => {
    setNewBOM({
      sku_id: '',
      bom_version: '',
      status: 'draft',
      valid_from: new Date().toISOString().split('T')[0],
      valid_to: ''
    });
    setBomLines([]);
    setEditingBOM(null);
  };

  const addBOMLine = () => {
    setBomLines([...bomLines, {
      id: Date.now(),
      part_id: '',
      quantity: 1,
      uom: 'PCS',
      scrap_factor: 0,
      parent_bom_line_id: null,
      line_number: bomLines.length + 1
    }]);
  };

  const removeBOMLine = (lineId) => {
    setBomLines(bomLines.filter(l => l.id !== lineId));
  };

  const updateBOMLine = (lineId, field, value) => {
    setBomLines(bomLines.map(l => l.id === lineId ? { ...l, [field]: value } : l));
  };

  const getBomLinesByBOM = (bomId) => {
    return allBomLines.filter(l => l.bom_id === bomId);
  };

  const renderBOMTree = (bomId) => {
    const lines = getBomLinesByBOM(bomId);
    const rootLines = lines.filter(l => !l.parent_bom_line_id);
    
    const renderLine = (line, level = 0) => {
      const part = parts.find(p => p.id === line.part_id);
      const children = lines.filter(l => l.parent_bom_line_id === line.id);
      
      return (
        <div key={line.id}>
          <div className={`flex items-center gap-3 p-3 border-l-2 border-slate-200 hover:bg-slate-50 transition-colors`} style={{ marginLeft: `${level * 24}px` }}>
            <div className="flex items-center gap-2 flex-1">
              {children.length > 0 && <GitBranch className="w-4 h-4 text-slate-400" />}
              {!children.length && <Package className="w-4 h-4 text-slate-400" />}
              <span className="font-medium text-slate-900">{part?.part_name || part?.internal_part_number}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span>Qty: {line.quantity}</span>
              <span>{line.uom}</span>
              {line.scrap_factor > 0 && <span className="text-amber-600">Scrap: {line.scrap_factor}%</span>}
            </div>
          </div>
          {children.map(child => renderLine(child, level + 1))}
        </div>
      );
    };

    return (
      <div className="space-y-1">
        {rootLines.map(line => renderLine(line))}
      </div>
    );
  };

  const draftBOMs = boms.filter(b => b.status === 'draft');
  const publishedBOMs = boms.filter(b => b.status === 'published');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">BOM Workbench</h1>
          <p className="text-sm text-slate-500">Manage Bills of Materials with version control and effective dating</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-[#86b027] hover:bg-[#6d8f20]">
          <Plus className="w-4 h-4 mr-2" />
          Create BOM
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#86b027]/10">
                <Layers className="w-5 h-5 text-[#86b027]" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Total BOMs</p>
                <p className="text-2xl font-bold text-slate-900">{boms.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-100">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Draft</p>
                <p className="text-2xl font-bold text-slate-900">{draftBOMs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Published</p>
                <p className="text-2xl font-bold text-slate-900">{publishedBOMs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-100">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Active</p>
                <p className="text-2xl font-bold text-slate-900">
                  {boms.filter(b => {
                    const today = new Date();
                    const validFrom = b.valid_from ? new Date(b.valid_from) : null;
                    const validTo = b.valid_to ? new Date(b.valid_to) : null;
                    return (!validFrom || validFrom <= today) && (!validTo || validTo >= today);
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">All BOMs ({boms.length})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({draftBOMs.length})</TabsTrigger>
          <TabsTrigger value="published">Published ({publishedBOMs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <BOMList boms={boms} skus={skus} renderBOMTree={renderBOMTree} publishBOMMutation={publishBOMMutation} />
        </TabsContent>

        <TabsContent value="draft" className="mt-6">
          <BOMList boms={draftBOMs} skus={skus} renderBOMTree={renderBOMTree} publishBOMMutation={publishBOMMutation} />
        </TabsContent>

        <TabsContent value="published" className="mt-6">
          <BOMList boms={publishedBOMs} skus={skus} renderBOMTree={renderBOMTree} publishBOMMutation={publishBOMMutation} />
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New BOM</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">SKU *</label>
                <Select value={newBOM.sku_id} onValueChange={(v) => setNewBOM({...newBOM, sku_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select SKU..." />
                  </SelectTrigger>
                  <SelectContent>
                    {skus.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.sku_code} - {s.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Version *</label>
                <Input
                  value={newBOM.bom_version}
                  onChange={(e) => setNewBOM({...newBOM, bom_version: e.target.value})}
                  placeholder="e.g. v1.0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Valid From</label>
                <Input
                  type="date"
                  value={newBOM.valid_from}
                  onChange={(e) => setNewBOM({...newBOM, valid_from: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Valid To (Optional)</label>
                <Input
                  type="date"
                  value={newBOM.valid_to}
                  onChange={(e) => setNewBOM({...newBOM, valid_to: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-900">BOM Lines</h3>
                <Button size="sm" onClick={addBOMLine} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Line
                </Button>
              </div>

              {bomLines.map((line, idx) => (
                <div key={line.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-slate-600">Line {idx + 1}</span>
                    <Button size="sm" variant="ghost" onClick={() => removeBOMLine(line.id)}>
                      <Trash2 className="w-4 h-4 text-rose-500" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-600">Part</label>
                      <Select value={line.part_id} onValueChange={(v) => updateBOMLine(line.id, 'part_id', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select part..." />
                        </SelectTrigger>
                        <SelectContent>
                          {parts.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.internal_part_number}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-600">Quantity</label>
                      <Input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateBOMLine(line.id, 'quantity', parseFloat(e.target.value))}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-600">UOM</label>
                      <Input
                        value={line.uom}
                        onChange={(e) => updateBOMLine(line.id, 'uom', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-600">Scrap Factor (%)</label>
                      <Input
                        type="number"
                        value={line.scrap_factor}
                        onChange={(e) => updateBOMLine(line.id, 'scrap_factor', parseFloat(e.target.value))}
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {bomLines.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-500">No BOM lines added yet</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setShowCreateModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newBOM.sku_id || !newBOM.bom_version || bomLines.length === 0) {
                  toast.error('Please fill SKU, version, and add at least one BOM line');
                  return;
                }
                createBOMMutation.mutate({ bom: newBOM, lines: bomLines });
              }}
              disabled={createBOMMutation.isPending}
              className="bg-[#86b027] hover:bg-[#6d8f20]"
            >
              <Save className="w-4 h-4 mr-2" />
              {createBOMMutation.isPending ? 'Creating...' : 'Create BOM'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BOMList({ boms, skus, renderBOMTree, publishBOMMutation }) {
  const [expandedBOM, setExpandedBOM] = useState(null);

  return (
    <div className="space-y-3">
      {boms.map(bom => {
        const sku = skus.find(s => s.id === bom.sku_id);
        const isExpanded = expandedBOM === bom.id;

        return (
          <Card key={bom.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900">{sku?.sku_code || 'Unknown SKU'}</h3>
                    <Badge variant="outline">{bom.bom_version}</Badge>
                    <Badge className={
                      bom.status === 'published' ? 'bg-emerald-500' :
                      bom.status === 'draft' ? 'bg-amber-500' : 'bg-slate-500'
                    }>
                      {bom.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    {bom.valid_from && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Valid from {format(new Date(bom.valid_from), 'MMM d, yyyy')}
                      </span>
                    )}
                    {bom.valid_to && (
                      <span>until {format(new Date(bom.valid_to), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExpandedBOM(isExpanded ? null : bom.id)}
                  >
                    {isExpanded ? 'Hide' : 'View'} Tree
                  </Button>
                  {bom.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => publishBOMMutation.mutate(bom.id)}
                      disabled={publishBOMMutation.isPending}
                      className="bg-[#86b027] hover:bg-[#6d8f20]"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Submit for Publishing
                    </Button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 border-t pt-4">
                  {renderBOMTree(bom.id)}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {boms.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No BOMs found</p>
        </div>
      )}
    </div>
  );
}