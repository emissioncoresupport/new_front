import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ProvenanceTracker from './services/ProvenanceTracker';
import CountrySelector from './CountrySelector';
import VATNumberInput from './VATNumberInput';
import EORINumberInput from './EORINumberInput';

export default function ActorModal({ open, onOpenChange, actor, prefilledData = null, onSave = null }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    operator_type: 'manufacturer',
    legal_name: '',
    trade_name: '',
    country: '',
    address: '',
    city: '',
    postal_code: '',
    vat_number: '',
    eori_number: '',
    primary_contact_name: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    website: ''
  });

  // Update form when actor or prefilledData changes
  React.useEffect(() => {
    if (actor) {
      setFormData(actor);
    } else if (prefilledData) {
      setFormData(prefilledData);
    } else {
      setFormData({
        operator_type: 'manufacturer',
        legal_name: '',
        trade_name: '',
        country: '',
        address: '',
        city: '',
        postal_code: '',
        vat_number: '',
        eori_number: '',
        primary_contact_name: '',
        primary_contact_email: '',
        primary_contact_phone: '',
        website: ''
      });
    }
  }, [actor, prefilledData, open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (onSave) {
        // Custom save handler for mapping confirmation
        return await onSave(data);
      }

      const user = await base44.auth.me();
      const tenantId = user.tenant_id || 'default';
      
      const payload = {
        ...data,
        tenant_id: tenantId,
        status: 'draft'
      };

      let result;
      if (actor) {
        await base44.entities.EconomicOperator.update(actor.id, payload);
        result = { ...actor, ...payload };
      } else {
        result = await base44.entities.EconomicOperator.create(payload);
      }

      // Record provenance for manually entered fields
      await ProvenanceTracker.recordBulkProvenance(
        result.id,
        'EconomicOperator',
        {
          legal_name: data.legal_name,
          operator_type: data.operator_type,
          country: data.country,
          vat_number: data.vat_number,
          primary_contact_email: data.primary_contact_email
        },
        {
          sourceType: prefilledData ? 'SUPPLYLENS_SYNC' : 'MANUAL_UI',
          sourceRefId: prefilledData ? 'supplier_mapping' : null,
          extractionMethod: 'human'
        },
        tenantId
      );

      return result;
    },
    onSuccess: () => {
      if (onSave) return; // Custom handler manages state
      queryClient.invalidateQueries(['economic-operators']);
      toast.success(actor ? 'Actor updated' : 'Actor created');
      onOpenChange(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{actor ? 'Edit' : 'Register'} Economic Operator</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Operator Type *</Label>
              <Select value={formData.operator_type} onValueChange={(v) => setFormData({...formData, operator_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manufacturer">Manufacturer</SelectItem>
                  <SelectItem value="authorized_rep">Authorized Representative</SelectItem>
                  <SelectItem value="importer">Importer</SelectItem>
                  <SelectItem value="system_pack_producer">System/Pack Producer</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <CountrySelector
              value={formData.country}
              onChange={(v) => setFormData({...formData, country: v})}
              required={true}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Legal Name *</Label>
              <Input 
                value={formData.legal_name} 
                onChange={(e) => setFormData({...formData, legal_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Trade Name</Label>
              <Input 
                value={formData.trade_name} 
                onChange={(e) => setFormData({...formData, trade_name: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Address</Label>
              <Input 
                value={formData.address} 
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input 
                value={formData.city} 
                onChange={(e) => setFormData({...formData, city: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Postal Code</Label>
              <Input 
                value={formData.postal_code} 
                onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <VATNumberInput
              value={formData.vat_number}
              onChange={(v) => setFormData({...formData, vat_number: v})}
              country={formData.country}
            />
            <EORINumberInput
              value={formData.eori_number}
              onChange={(v) => setFormData({...formData, eori_number: v})}
              country={formData.country}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input 
                value={formData.primary_contact_name} 
                onChange={(e) => setFormData({...formData, primary_contact_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Email *</Label>
              <Input 
                type="email"
                value={formData.primary_contact_email} 
                onChange={(e) => setFormData({...formData, primary_contact_email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input 
                value={formData.primary_contact_phone} 
                onChange={(e) => setFormData({...formData, primary_contact_phone: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Website</Label>
            <Input 
              value={formData.website} 
              onChange={(e) => setFormData({...formData, website: e.target.value})}
              placeholder="https://"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={() => saveMutation.mutate(formData)}
            disabled={!formData.legal_name || !formData.country || !formData.primary_contact_email}
            className="bg-[#86b027] hover:bg-[#769c22]"
          >
            {actor ? 'Update' : 'Create'} Actor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}