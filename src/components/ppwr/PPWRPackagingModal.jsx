import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import PPWRMasterOrchestrator from './services/PPWRMasterOrchestrator';
import { AlertTriangle } from "lucide-react";

export default function PPWRPackagingModal({ open, onOpenChange, packaging }) {
  const [formData, setFormData] = useState({
    packaging_name: '',
    packaging_type: 'Primary',
    material_category: 'Plastic',
    total_weight_kg: 0,
    recycled_content_percentage: 0,
    is_reusable: false,
    target_year: 2030,
    recycled_content_target: 30
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (packaging) {
      setFormData(packaging);
    } else {
      setFormData({
        packaging_name: '',
        packaging_type: 'Primary',
        material_category: 'Plastic',
        total_weight_kg: 0,
        recycled_content_percentage: 0,
        is_reusable: false,
        target_year: 2030,
        recycled_content_target: 30
      });
    }
  }, [packaging, open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const gap = data.recycled_content_percentage - data.recycled_content_target;
      const status = gap >= 0 ? 'Compliant' : gap > -10 ? 'On Track' : gap > -20 ? 'Below Target' : 'Critical';
      
      const payload = {
        ...data,
        compliance_status: status,
        compliance_gap_percentage: gap,
        recycled_content_mass_kg: (data.total_weight_kg * data.recycled_content_percentage) / 100
      };

      let savedPackaging;
      const action = packaging ? 'update' : 'create';
      
      if (packaging) {
        savedPackaging = await base44.entities.PPWRPackaging.update(packaging.id, payload);
      } else {
        savedPackaging = await base44.entities.PPWRPackaging.create(payload);
      }
      
      // MASTER ORCHESTRATOR: Triggers all integrated services
      await PPWRMasterOrchestrator.onPackagingChange(savedPackaging, action);
      
      return savedPackaging;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppwr-packaging'] });
      toast.success(packaging ? 'Packaging updated - all integrations triggered' : 'Packaging created - automation active');
      onOpenChange(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{packaging ? 'Edit' : 'Add'} Packaging</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Packaging Name *</Label>
            <Input value={formData.packaging_name} onChange={(e) => setFormData({...formData, packaging_name: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={formData.packaging_type} onValueChange={(v) => setFormData({...formData, packaging_type: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Primary', 'Secondary', 'Tertiary', 'Transport'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Material Category *</Label>
            <Select value={formData.material_category} onValueChange={(v) => setFormData({...formData, material_category: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Plastic', 'Paper/Cardboard', 'Glass', 'Metal', 'Wood', 'Composite'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Total Weight (kg) *</Label>
            <Input type="number" value={formData.total_weight_kg} onChange={(e) => setFormData({...formData, total_weight_kg: parseFloat(e.target.value)})} />
          </div>
          <div className="space-y-2">
            <Label>Recycled Content (%) <span className="text-red-500">*</span></Label>
            <Input type="number" value={formData.recycled_content_percentage} onChange={(e) => setFormData({...formData, recycled_content_percentage: parseFloat(e.target.value)})} />
          </div>
          <div className="space-y-2">
            <Label>Target (%)</Label>
            <Input type="number" value={formData.recycled_content_target} onChange={(e) => setFormData({...formData, recycled_content_target: parseFloat(e.target.value)})} />
          </div>
        </div>

        {/* Verification Documentation */}
        {(formData.recycled_content_percentage > 0) && (
          <div className="space-y-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg mt-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 mb-1 text-sm">Verification Required</h4>
                <p className="text-xs text-amber-700 mb-3">
                  Mass balance verification mandatory per PPWR Annex VI for recycled content claims
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Verification Method</Label>
                <Select 
                  value={formData.recycled_content_verification_method || 'mass_balance'} 
                  onValueChange={(v) => setFormData({...formData, recycled_content_verification_method: v})}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mass_balance">Mass Balance</SelectItem>
                    <SelectItem value="segregation">Physical Segregation</SelectItem>
                    <SelectItem value="certificate">Supplier Certificate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Verified?</Label>
                <Select 
                  value={formData.recycled_content_verified ? 'verified' : 'pending'} 
                  onValueChange={(v) => setFormData({...formData, recycled_content_verified: v === 'verified'})}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Supplier Declaration URL</Label>
              <Input
                type="url"
                placeholder="https://supplier.com/pcr-certificate.pdf"
                value={formData.supplier_declaration_url || ''}
                onChange={(e) => setFormData({...formData, supplier_declaration_url: e.target.value})}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Third-Party Verification Certificate</Label>
              <Input
                type="url"
                placeholder="https://verifier.com/report.pdf"
                value={formData.verification_certificate_url || ''}
                onChange={(e) => setFormData({...formData, verification_certificate_url: e.target.value})}
                className="h-9 text-xs"
              />
            </div>
          </div>
        )}

        {/* LCA/PCF Link */}
        <div className="space-y-2 mt-4">
          <Label className="text-xs">Linked Product (LCA/PCF)</Label>
          <Input
            placeholder="Product/SKU ID for lifecycle carbon footprint"
            value={formData.sku_id || ''}
            onChange={(e) => setFormData({...formData, sku_id: e.target.value})}
            className="h-9 text-xs"
          />
          <p className="text-xs text-slate-500">
            Links to PCF module for full product carbon footprint declaration
          </p>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate(formData)} className="bg-[#86b027] hover:bg-[#769c22] text-white">
            {packaging ? 'Update' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}