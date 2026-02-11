import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';

const COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'US', 'CN', 'GB'
];

export default function CreateEntityModal({ entityType, isOpen, onClose, onCreated, adapter = null }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ country: 'NL' });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // PHASE 1: Validate required fields
      if (entityType === 'Supplier') {
        if (!data.name) throw new Error('Supplier name is required');
        if (!data.country) throw new Error('Country code is required');
      } else if (entityType === 'SKU') {
        if (!data.sku_code) throw new Error('SKU code is required');
        if (!data.name) throw new Error('Product name is required');
      } else if (entityType === 'ProductFamily' || entityType === 'LegalEntity') {
        if (!data.name) throw new Error('Name is required');
      }

      // PHASE 2: Create entity via adapter or fallback
      let createdEntity;
      if (adapter?.entities?.[entityType]?.create) {
        createdEntity = await adapter.entities[entityType].create(data);
      } else {
        // Fallback to direct Base44 entity creation
        const user = await base44.auth.me();
        const tenant_id = user.email.split('@')[0];

        switch(entityType) {
          case 'ProductFamily':
            createdEntity = await base44.entities.Product.create({
              tenant_id,
              name: data.name,
              sku_code: data.code || `PF-${Date.now()}`,
              category: 'general'
            });
            break;
          case 'SKU':
            createdEntity = await base44.entities.SKU.create({
              tenant_id,
              sku_code: data.sku_code,
              name: data.name,
              category: 'general'
            });
            break;
          case 'Supplier':
            createdEntity = await base44.entities.Supplier.create({
              tenant_id,
              supplier_id: `SUP-${Date.now()}`,
              legal_name: data.name,
              country_code: data.country || 'NL',
              primary_contact_email: data.email || `${data.name.toLowerCase().replace(/\s/g, '')}@example.com`,
              supplier_status: 'active',
              creation_source: 'MANUAL',
              created_by_user_id: user.id,
              created_at: new Date().toISOString()
            });
            break;
          case 'LegalEntity':
            createdEntity = await base44.entities.LegalEntity.create({
              tenant_id,
              legal_name: data.name,
              country: data.country,
              entity_type: 'subsidiary'
            });
            break;
          default:
            throw new Error('Unknown entity type');
        }
      }

      if (!createdEntity || !createdEntity.id) {
        throw new Error('Entity creation returned invalid response (missing id)');
      }

      // PHASE 3: TRANSACTIONAL CONFIRMATION - Read back to verify persistence
      let confirmedEntity;
      try {
        if (adapter?.entities?.[entityType]?.read) {
          confirmedEntity = await adapter.entities[entityType].read(createdEntity.id);
        } else {
          // Fallback confirmation read via filter (more reliable than read)
          switch(entityType) {
            case 'Supplier':
              const suppliers = await base44.entities.Supplier.filter({ id: createdEntity.id });
              confirmedEntity = suppliers?.[0];
              break;
            case 'SKU':
              const skus = await base44.entities.SKU.filter({ id: createdEntity.id });
              confirmedEntity = skus?.[0];
              break;
            case 'ProductFamily':
              const families = await base44.entities.Product.filter({ id: createdEntity.id });
              confirmedEntity = families?.[0];
              break;
            case 'LegalEntity':
              const entities = await base44.entities.LegalEntity.filter({ id: createdEntity.id });
              confirmedEntity = entities?.[0];
              break;
          }
        }

        if (!confirmedEntity) {
          throw new Error(`Entity not persisted - confirmation read returned null (ID: ${createdEntity.id})`);
        }

        console.log('[CreateEntityModal] Transactional create-confirm SUCCESS:', confirmedEntity.id);
        return confirmedEntity;
      } catch (readErr) {
        console.error('[CreateEntityModal] Confirmation read failed:', readErr);
        toast.error(`Entity created but confirmation failed: ${readErr.message}`);
        throw new Error(`Entity created (ID: ${createdEntity.id}) but confirmation failed: ${readErr.message}`);
      }
    },
    onSuccess: (confirmedEntity) => {
      queryClient.invalidateQueries([entityType]);
      queryClient.invalidateQueries(['suppliers']);
      toast.success(`${entityType} created (ID: ${confirmedEntity.id.substring(0, 12)}...)`);
      onCreated(confirmedEntity.id, confirmedEntity);
      onClose();
      setFormData({ country: 'NL' });
    },
    onError: (error) => {
      // Keep modal open and show inline error
      console.error('[CreateEntityModal] Create failed:', error);
      toast.error(error.message || `Failed to create ${entityType}`);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Client-side validation before submit
    if (entityType === 'Supplier') {
      if (!formData.name?.trim()) {
        toast.error('Supplier name is required');
        return;
      }
      if (!formData.country) {
        toast.error('Country code is required');
        return;
      }
    }
    
    createMutation.mutate(formData);
  };

  const renderForm = () => {
    switch(entityType) {
      case 'ProductFamily':
        return (
          <>
            <div>
              <Label>Product Family Name *</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Smartphones"
                required
              />
            </div>
            <div>
              <Label>Code (optional)</Label>
              <Input
                value={formData.code || ''}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                placeholder="e.g., PF-001"
              />
            </div>
          </>
        );

      case 'SKU':
        return (
          <>
            <div>
              <Label>SKU Code *</Label>
              <Input
                value={formData.sku_code || ''}
                onChange={(e) => setFormData({...formData, sku_code: e.target.value})}
                placeholder="e.g., SKU-12345"
                required
              />
            </div>
            <div>
              <Label>Product Name *</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., iPhone 15 Pro"
                required
              />
            </div>
          </>
        );

      case 'Supplier':
        return (
          <>
            <div>
              <Label>Supplier Name *</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Acme Corp"
                required
              />
            </div>
            <div>
              <Label>Country Code *</Label>
              <Select 
                value={formData.country || 'NL'}
                onValueChange={(value) => setFormData({...formData, country: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(code => (
                    <SelectItem key={code} value={code}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Email (optional)</Label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="contact@supplier.com"
              />
            </div>
          </>
        );

      case 'LegalEntity':
        return (
          <>
            <div>
              <Label>Legal Entity Name *</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Acme Industries B.V."
                required
              />
            </div>
            <div>
              <Label>Country *</Label>
              <Select 
                value={formData.country || 'NL'}
                onValueChange={(value) => setFormData({...formData, country: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(code => (
                    <SelectItem key={code} value={code}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        );

      default:
        return <p>Unknown entity type</p>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white border-2 border-slate-300 shadow-[0_4px_24px_rgba(0,0,0,0.12)] z-[99999]">
        <DialogHeader className="border-b-2 border-slate-300 bg-gradient-to-br from-slate-50/80 to-transparent pb-4">
          <DialogTitle className="text-lg font-medium tracking-tight text-slate-900">
            Create {entityType}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {createMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700">
                {createMutation.error?.message || 'Creation failed - please check your inputs'}
              </p>
            </div>
          )}
          {renderForm()}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/50">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-700 backdrop-blur-sm transition-all"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
              className="bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow-lg transition-all"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}