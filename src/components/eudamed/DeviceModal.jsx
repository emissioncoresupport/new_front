import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ProvenanceTracker from './services/ProvenanceTracker';

export default function DeviceModal({ open, onOpenChange, device }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  const [familyData, setFamilyData] = useState({
    family_name: '',
    risk_class: 'Class I',
    device_type: 'Medical Device',
    intended_purpose: '',
    gmdn_code: ''
  });

  const [modelData, setModelData] = useState({
    model_name: '',
    commercial_name: '',
    catalog_number: '',
    sterile: false,
    single_use: false,
    measuring_function: false
  });

  const [udiData, setUdiData] = useState({
    udi_di: '',
    issuing_entity: 'GS1',
    packaging_level: 'unit'
  });

  // Load existing device data when editing
  React.useEffect(() => {
    if (device && open) {
      setModelData({
        model_name: device.model_name || '',
        commercial_name: device.commercial_name || '',
        catalog_number: device.catalog_number || '',
        sterile: device.sterile || false,
        single_use: device.single_use || false,
        measuring_function: device.measuring_function || false
      });
      setSelectedFamilyId(device.device_family_id || '');
    } else if (!open) {
      // Reset on close
      setModelData({
        model_name: '',
        commercial_name: '',
        catalog_number: '',
        sterile: false,
        single_use: false,
        measuring_function: false
      });
      setUdiData({
        udi_di: '',
        issuing_entity: 'GS1',
        packaging_level: 'unit'
      });
      setSelectedFamilyId('');
      setManufacturerId('');
    }
  }, [device, open]);

  const { data: operators = [] } = useQuery({
    queryKey: ['economic-operators'],
    queryFn: () => base44.entities.EconomicOperator.list()
  });

  const { data: families = [] } = useQuery({
    queryKey: ['device-families'],
    queryFn: () => base44.entities.DeviceFamily.list()
  });

  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [manufacturerId, setManufacturerId] = useState('');

  const manufacturers = operators.filter(o => o.operator_type === 'manufacturer');

  const createDeviceMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const tenantId = user.tenant_id || 'default';

      if (device) {
        // UPDATE existing device
        await base44.entities.DeviceModel.update(device.id, {
          ...modelData
        });

        await ProvenanceTracker.recordBulkProvenance(
          device.id,
          'DeviceModel',
          modelData,
          { sourceType: 'MANUAL_UI', extractionMethod: 'human' },
          tenantId
        );

        return { model: { ...device, ...modelData } };
      } else {
        // CREATE new device
        let family;
        if (selectedFamilyId) {
          family = families.find(f => f.id === selectedFamilyId);
        } else {
          family = await base44.entities.DeviceFamily.create({
            tenant_id: tenantId,
            ...familyData,
            manufacturer_id: manufacturerId,
            status: 'draft'
          });

          await ProvenanceTracker.recordBulkProvenance(
            family.id,
            'DeviceFamily',
            { family_name: familyData.family_name, risk_class: familyData.risk_class },
            { sourceType: 'MANUAL_UI', extractionMethod: 'human' },
            tenantId
          );
        }

        const model = await base44.entities.DeviceModel.create({
          tenant_id: tenantId,
          device_family_id: family.id,
          ...modelData,
          status: 'draft'
        });

        await ProvenanceTracker.recordBulkProvenance(
          model.id,
          'DeviceModel',
          { model_name: modelData.model_name, commercial_name: modelData.commercial_name },
          { sourceType: 'MANUAL_UI', extractionMethod: 'human' },
          tenantId
        );

        if (udiData.udi_di) {
          const udi = await base44.entities.UdiDiRecord.create({
            tenant_id: tenantId,
            device_model_id: model.id,
            ...udiData,
            status: 'draft'
          });

          await ProvenanceTracker.recordBulkProvenance(
            udi.id,
            'UdiDiRecord',
            { udi_di: udiData.udi_di, issuing_entity: udiData.issuing_entity },
            { sourceType: 'MANUAL_UI', extractionMethod: 'human' },
            tenantId
          );
        }

        return { family, model };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['device-families']);
      queryClient.invalidateQueries(['device-models']);
      queryClient.invalidateQueries(['udi-records']);
      toast.success(device ? 'Device updated' : 'Device registered successfully');
      onOpenChange(false);
      setStep(1);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{device ? 'Edit' : 'Register'} Medical Device</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Family */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-[#86b027] text-white' : 'bg-slate-200'}`}>1</div>
              <h3 className="font-bold">Device Family</h3>
            </div>

            {families.length > 0 && (
              <div className="space-y-2">
                <Label>Use Existing Family</Label>
                <Select value={selectedFamilyId} onValueChange={setSelectedFamilyId}>
                  <SelectTrigger><SelectValue placeholder="Select family or create new" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Create New Family</SelectItem>
                    {families.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.family_name} ({f.risk_class})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(!selectedFamilyId || selectedFamilyId === 'new') && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Family Name *</Label>
                    <Input value={familyData.family_name} onChange={(e) => setFamilyData({...familyData, family_name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Risk Class *</Label>
                    <Select value={familyData.risk_class} onValueChange={(v) => setFamilyData({...familyData, risk_class: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Class I">Class I</SelectItem>
                        <SelectItem value="Class IIa">Class IIa</SelectItem>
                        <SelectItem value="Class IIb">Class IIb</SelectItem>
                        <SelectItem value="Class III">Class III</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Manufacturer *</Label>
                  <Select value={manufacturerId} onValueChange={setManufacturerId}>
                    <SelectTrigger><SelectValue placeholder="Select manufacturer" /></SelectTrigger>
                    <SelectContent>
                      {manufacturers.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.legal_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Intended Purpose *</Label>
                  <Textarea 
                    value={familyData.intended_purpose} 
                    onChange={(e) => setFamilyData({...familyData, intended_purpose: e.target.value})}
                    placeholder="Describe clinical indications and intended use (min 20 characters)"
                    className="h-20"
                  />
                </div>
              </>
            )}
          </div>

          {/* Step 2: Model */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-[#86b027] text-white' : 'bg-slate-200'}`}>2</div>
              <h3 className="font-bold">Device Model</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Model Name *</Label>
                <Input value={modelData.model_name} onChange={(e) => setModelData({...modelData, model_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Commercial Name *</Label>
                <Input value={modelData.commercial_name} onChange={(e) => setModelData({...modelData, commercial_name: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Catalog Number</Label>
              <Input value={modelData.catalog_number} onChange={(e) => setModelData({...modelData, catalog_number: e.target.value})} />
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Checkbox checked={modelData.sterile} onCheckedChange={(c) => setModelData({...modelData, sterile: c})} />
                <Label>Sterile</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={modelData.single_use} onCheckedChange={(c) => setModelData({...modelData, single_use: c})} />
                <Label>Single Use</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={modelData.measuring_function} onCheckedChange={(c) => setModelData({...modelData, measuring_function: c})} />
                <Label>Measuring Function</Label>
              </div>
            </div>
          </div>

          {/* Step 3: UDI */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-[#86b027] text-white' : 'bg-slate-200'}`}>3</div>
              <h3 className="font-bold">UDI-DI</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>UDI-DI *</Label>
                <Input value={udiData.udi_di} onChange={(e) => setUdiData({...udiData, udi_di: e.target.value})} placeholder="e.g., 07640109450258" />
              </div>
              <div className="space-y-2">
                <Label>Issuing Entity *</Label>
                <Select value={udiData.issuing_entity} onValueChange={(v) => setUdiData({...udiData, issuing_entity: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GS1">GS1</SelectItem>
                    <SelectItem value="HIBCC">HIBCC</SelectItem>
                    <SelectItem value="ICCBBA">ICCBBA</SelectItem>
                    <SelectItem value="IFA">IFA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={() => createDeviceMutation.mutate()}
            disabled={
              !modelData.model_name || 
              !modelData.commercial_name || 
              (device ? false : (!selectedFamilyId && (!familyData.family_name || !manufacturerId || !familyData.intended_purpose)))
            }
            className="bg-[#86b027] hover:bg-[#769c22]"
          >
            {device ? 'Update Device' : 'Register Device'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}