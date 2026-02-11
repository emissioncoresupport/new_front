import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Layers, Plus, Edit2, Trash2, AlertCircle, Calculator, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const CBAM_PRODUCTS = [
  { cn: '72031000', name: 'Iron & Steel - Non-alloy' },
  { cn: '72071100', name: 'Iron & Steel - Semi-finished' },
  { cn: '76011000', name: 'Aluminium - Unwrought' },
  { cn: '31021000', name: 'Fertilizers - Urea' },
  { cn: '31023000', name: 'Fertilizers - Ammonium nitrate' },
];

const PRECURSOR_MATERIALS = [
  { cn: '27011100', name: 'Coal - Anthracite', typical_emissions: 2.5 },
  { cn: '27041000', name: 'Coke', typical_emissions: 3.4 },
  { cn: '28111100', name: 'Hydrogen', typical_emissions: 9.6 },
  { cn: '28141000', name: 'Ammonia', typical_emissions: 3.8 },
  { cn: '26011200', name: 'Iron Ore - Pellets', typical_emissions: 0.8 },
];

export default function CBAMPrecursorMapper() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrecursor, setEditingPrecursor] = useState(null);
  const [formData, setFormData] = useState({
    final_product_cn: '',
    final_product_name: '',
    precursor_cn: '',
    precursor_name: '',
    typical_percentage: '',
    emissions_intensity_factor: '',
    production_route_applicable: '',
    data_source: 'EU Commission',
    active: true
  });

  const queryClient = useQueryClient();

  const { data: precursorMappings = [] } = useQuery({
    queryKey: ['cbam-precursors'],
    queryFn: () => base44.entities.CBAMPrecursor.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CBAMPrecursor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-precursors'] });
      toast.success('Precursor mapping created');
      handleCloseModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CBAMPrecursor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-precursors'] });
      toast.success('Precursor mapping updated');
      handleCloseModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CBAMPrecursor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-precursors'] });
      toast.success('Precursor mapping deleted');
    }
  });

  const handleOpenModal = (precursor = null) => {
    if (precursor) {
      setEditingPrecursor(precursor);
      setFormData(precursor);
    } else {
      setEditingPrecursor(null);
      setFormData({
        final_product_cn: '',
        final_product_name: '',
        precursor_cn: '',
        precursor_name: '',
        typical_percentage: '',
        emissions_intensity_factor: '',
        production_route_applicable: '',
        data_source: 'EU Commission',
        active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPrecursor(null);
  };

  const handleSubmit = () => {
    if (!formData.final_product_cn || !formData.precursor_cn || !formData.typical_percentage) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editingPrecursor) {
      updateMutation.mutate({ id: editingPrecursor.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this precursor mapping?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleProductSelect = (cn) => {
    const product = CBAM_PRODUCTS.find(p => p.cn === cn);
    if (product) {
      setFormData({
        ...formData,
        final_product_cn: cn,
        final_product_name: product.name
      });
    }
  };

  const handlePrecursorSelect = (cn) => {
    const precursor = PRECURSOR_MATERIALS.find(p => p.cn === cn);
    if (precursor) {
      setFormData({
        ...formData,
        precursor_cn: cn,
        precursor_name: precursor.name,
        emissions_intensity_factor: formData.emissions_intensity_factor || precursor.typical_emissions
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Clean Header */}
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-base font-medium text-slate-900">Precursor Material Mapping</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Map complex goods to precursors for embedded emissions
            </p>
          </div>
          <Button onClick={() => handleOpenModal()} className="bg-slate-900 hover:bg-slate-800 text-white h-9 px-4 text-sm shadow-sm">
            <Plus className="w-3.5 h-3.5 mr-2" />
            Add Mapping
          </Button>
        </div>
      </div>

      {/* Regulatory Info */}
      <div className="bg-blue-50/50 border border-blue-200/60 rounded-lg p-3">
        <p className="text-xs text-slate-700">
          <strong>Art. 13-15 C(2025) 8151:</strong> Complex goods must report embedded emissions from precursor materials. 
          Precursor emissions from same reporting period (default) or can use other period with evidence. 
          Can use actual OR default values per precursor.
        </p>
      </div>

      {/* Clean Mappings */}
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="border-b border-slate-200/60 px-5 py-4">
          <h3 className="text-sm font-medium text-slate-900">Active Precursor Mappings</h3>
        </div>
        <div className="p-5">
          <div className="space-y-3">
            {precursorMappings.map(mapping => (
              <div key={mapping.id} className="p-5 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-slate-900">{mapping.final_product_name}</h4>
                      <Badge variant="outline" className="border-slate-200">{mapping.final_product_cn}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500">Contains:</span>
                      <Badge className="bg-slate-900 text-white border-0">{mapping.precursor_name}</Badge>
                      <Badge variant="outline" className="border-slate-200">{mapping.precursor_cn}</Badge>
                      <span className="text-slate-600">{mapping.typical_percentage}%</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleOpenModal(mapping)} className="border-slate-200 text-slate-700 hover:bg-slate-50">
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-slate-200 text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(mapping.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-slate-500">Precursor Emissions Factor:</span>
                    <span className="font-bold ml-1">{mapping.emissions_intensity_factor} tCO2/t</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Typical Share:</span>
                    <span className="font-bold ml-1">{mapping.typical_percentage}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Embedded Contribution:</span>
                    <span className="font-bold ml-1 text-[#86b027]">
                      {(mapping.emissions_intensity_factor * mapping.typical_percentage / 100).toFixed(2)} tCO2/t final
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clean Example */}
      <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-lg p-4">
        <h4 className="font-medium text-sm text-slate-900 mb-2">Example Calculation</h4>
        <div className="space-y-1 text-xs text-slate-600">
          <p><strong className="text-slate-900">Steel Production (CN 72031000):</strong></p>
          <p>• Coal (27011100) at 40% → 2.5 × 0.40 = <strong className="text-slate-900">1.0 tCO2/t</strong></p>
          <p>• Direct production: 1.8 tCO2/t</p>
          <p>• Total: <strong className="text-slate-900">2.8 tCO2/t steel</strong></p>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-gradient-to-b from-slate-50 to-slate-100/50 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Layers className="w-4 h-4 text-slate-700" />
              {editingPrecursor ? 'Edit Precursor Mapping' : 'Add New Precursor Mapping'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Final Product */}
            <div>
              <Label className="text-sm font-semibold">Final Product (CBAM Goods) *</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <Label className="text-xs text-slate-500">CN Code</Label>
                  <select
                    value={formData.final_product_cn}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">Select CN code...</option>
                    {CBAM_PRODUCTS.map(p => (
                      <option key={p.cn} value={p.cn}>{p.cn}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Product Name</Label>
                  <Input
                    value={formData.final_product_name}
                    onChange={(e) => setFormData({...formData, final_product_name: e.target.value})}
                    placeholder="Auto-filled"
                    className="mt-1"
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* Precursor Material */}
            <div>
              <Label className="text-sm font-semibold">Precursor Material *</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <Label className="text-xs text-slate-500">CN Code</Label>
                  <select
                    value={formData.precursor_cn}
                    onChange={(e) => handlePrecursorSelect(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">Select precursor...</option>
                    {PRECURSOR_MATERIALS.map(p => (
                      <option key={p.cn} value={p.cn}>{p.cn} - {p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Precursor Name</Label>
                  <Input
                    value={formData.precursor_name}
                    onChange={(e) => setFormData({...formData, precursor_name: e.target.value})}
                    placeholder="Auto-filled"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Emissions & Percentage */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold">Typical Input Share (%) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.typical_percentage}
                  onChange={(e) => setFormData({...formData, typical_percentage: e.target.value})}
                  placeholder="e.g., 40"
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">How much of the precursor is used per tonne of final product</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">Precursor Emissions (tCO2/t)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.emissions_intensity_factor}
                  onChange={(e) => setFormData({...formData, emissions_intensity_factor: e.target.value})}
                  placeholder="e.g., 2.5"
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">Emissions per tonne of precursor material</p>
              </div>
            </div>

            {/* Live Calculation Preview */}
            {formData.typical_percentage && formData.emissions_intensity_factor && (
              <div className="bg-slate-50/50 border border-slate-200/60 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="w-3.5 h-3.5 text-slate-700" />
                  <span className="text-xs font-medium text-slate-900">Calculated Contribution</span>
                </div>
                <div className="text-xs text-slate-700">
                  <p className="mb-1">
                    Precursor emissions: <strong>{formData.emissions_intensity_factor} tCO2/t</strong> × 
                    Input share: <strong>{formData.typical_percentage}%</strong>
                  </p>
                  <p className="text-base font-medium text-slate-900">
                    = {(parseFloat(formData.emissions_intensity_factor) * parseFloat(formData.typical_percentage) / 100).toFixed(3)} tCO2/t 
                    <span className="text-xs font-normal text-slate-600 ml-1">of final product</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60">
            <Button variant="outline" onClick={handleCloseModal} className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-9 px-4 text-sm shadow-none">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-slate-900 hover:bg-slate-800 text-white h-9 px-4 text-sm shadow-sm"
            >
              {editingPrecursor ? 'Update' : 'Create'} Mapping
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}