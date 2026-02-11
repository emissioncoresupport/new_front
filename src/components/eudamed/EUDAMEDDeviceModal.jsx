import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Upload, FileText, Sparkles, Loader2 } from "lucide-react";
import { EUDAMEDMasterOrchestrator } from './services/EUDAMEDMasterOrchestrator';

export default function EUDAMEDDeviceModal({ open, onOpenChange, device }) {
  const [formData, setFormData] = useState(device || {
    device_name: '',
    udi_di: '',
    risk_class: 'Class I',
    device_type: 'Medical Device',
    intended_purpose: '',
    manufacturer_id: '',
    gmdn_code: '',
    registration_status: 'draft'
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [extracting, setExtracting] = useState(false);

  const queryClient = useQueryClient();

  // Fetch manufacturers from EUDAMEDActor
  const { data: manufacturers = [] } = useQuery({
    queryKey: ['eudamed-manufacturers'],
    queryFn: async () => {
      const actors = await base44.entities.EUDAMEDActor.filter({ actor_type: 'Manufacturer' });
      return actors;
    }
  });

  // Fetch suppliers from SupplyLens
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (device) {
        return await base44.entities.EUDAMEDDevice.update(device.id, data);
      } else {
        // Use orchestrator for full integration
        return await EUDAMEDMasterOrchestrator.registerDevice({
          ...data,
          create_dpp: true,
          calculate_pcf: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eudamed-devices'] });
      queryClient.invalidateQueries({ queryKey: ['dpp-records'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(device ? 'Device updated' : 'Device registered with full integration (DPP, PCF, SupplyLens)');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  // AI Document Extraction
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setExtracting(true);

    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }

      setUploadedFiles(uploadedUrls);

      // Extract data using AI
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract medical device registration information from the uploaded documents.
        
        Extract:
        - device_name
        - udi_di (UDI Device Identifier)
        - risk_class (Class I, IIa, IIb, or III)
        - device_type (Medical Device, In Vitro Diagnostic, Active Implantable)
        - intended_purpose
        - gmdn_code (Global Medical Device Nomenclature)
        - manufacturer_name
        - sterile (boolean)
        - measuring_function (boolean)
        - contains_medicinal_substance (boolean)
        - single_use (boolean)
        
        Return structured JSON data.`,
        file_urls: uploadedUrls,
        response_json_schema: {
          type: "object",
          properties: {
            device_name: { type: "string" },
            udi_di: { type: "string" },
            risk_class: { type: "string" },
            device_type: { type: "string" },
            intended_purpose: { type: "string" },
            gmdn_code: { type: "string" },
            manufacturer_name: { type: "string" },
            sterile: { type: "boolean" },
            measuring_function: { type: "boolean" },
            contains_medicinal_substance: { type: "boolean" },
            single_use: { type: "boolean" }
          }
        }
      });

      // Auto-fill form
      setFormData({
        ...formData,
        ...result,
        technical_documentation_url: uploadedUrls[0]
      });

      toast.success('Device data extracted from documents');
    } catch (error) {
      toast.error('Document extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  // Auto-suggest manufacturer from SupplyLens
  const handleManufacturerLink = async (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    // Check if actor exists
    const existingActor = manufacturers.find(m => m.legal_name === supplier.legal_name);
    
    if (existingActor) {
      setFormData({
        ...formData,
        manufacturer_id: existingActor.srn
      });
    } else {
      // Create actor from supplier
      const actor = await EUDAMEDMasterOrchestrator.registerActor({
        actor_type: 'Manufacturer',
        legal_name: supplier.legal_name,
        trade_name: supplier.trade_name,
        country: supplier.country,
        contact_email: supplier.email,
        contact_phone: supplier.phone,
        website: supplier.website
      });

      setFormData({
        ...formData,
        manufacturer_id: actor.srn
      });

      queryClient.invalidateQueries({ queryKey: ['eudamed-manufacturers'] });
      toast.success('Manufacturer synced from SupplyLens');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{device ? 'Edit Device' : 'Register Medical Device'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">
              <FileText className="w-4 h-4 mr-2" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="document">
              <Upload className="w-4 h-4 mr-2" />
              Document Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
            {/* SupplyLens Integration */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Label className="text-sm font-semibold text-blue-900">Link to Existing Supplier (SupplyLens)</Label>
              <Select onValueChange={handleManufacturerLink}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select manufacturer from suppliers..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.legal_name} ({supplier.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Device Name *</Label>
              <Input 
                value={formData.device_name} 
                onChange={(e) => setFormData({...formData, device_name: e.target.value})} 
                placeholder="e.g., Cardiac Pacemaker Model XYZ"
              />
            </div>

            <div className="space-y-2">
              <Label>UDI-DI *</Label>
              <Input 
                value={formData.udi_di} 
                onChange={(e) => setFormData({...formData, udi_di: e.target.value})} 
                placeholder="(01)12345678901234"
              />
              <p className="text-xs text-slate-500">Leave blank to auto-generate</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Risk Class *</Label>
                <Select value={formData.risk_class} onValueChange={(v) => setFormData({...formData, risk_class: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Class I">Class I</SelectItem>
                    <SelectItem value="Class IIa">Class IIa</SelectItem>
                    <SelectItem value="Class IIb">Class IIb</SelectItem>
                    <SelectItem value="Class III">Class III</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Device Type *</Label>
                <Select value={formData.device_type} onValueChange={(v) => setFormData({...formData, device_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Medical Device">Medical Device</SelectItem>
                    <SelectItem value="In Vitro Diagnostic">In Vitro Diagnostic</SelectItem>
                    <SelectItem value="Active Implantable">Active Implantable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Manufacturer SRN *</Label>
              <Select value={formData.manufacturer_id} onValueChange={(v) => setFormData({...formData, manufacturer_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select manufacturer..." /></SelectTrigger>
                <SelectContent>
                  {manufacturers.map(mfr => (
                    <SelectItem key={mfr.id} value={mfr.srn}>
                      {mfr.legal_name} ({mfr.srn})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>GMDN Code</Label>
              <Input 
                value={formData.gmdn_code} 
                onChange={(e) => setFormData({...formData, gmdn_code: e.target.value})} 
                placeholder="e.g., 12345"
              />
            </div>

            <div className="space-y-2">
              <Label>Intended Purpose *</Label>
              <textarea 
                className="w-full p-2 border rounded-lg text-sm"
                rows="3"
                value={formData.intended_purpose}
                onChange={(e) => setFormData({...formData, intended_purpose: e.target.value})}
                placeholder="Describe the intended purpose and indications..."
              />
            </div>
          </TabsContent>

          <TabsContent value="document" className="space-y-4 mt-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-semibold mb-2">Upload Technical Documentation</h3>
              <p className="text-sm text-slate-600 mb-4">
                Upload device specifications, IFU, certificates, or datasheets. AI will extract device information.
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.png,.jpg"
                onChange={handleFileUpload}
                className="hidden"
                id="device-doc-upload"
              />
              <label htmlFor="device-doc-upload">
                <Button type="button" variant="outline" className="cursor-pointer" asChild>
                  <span>
                    {extracting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Select Files
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-emerald-900 mb-2">
                  ✓ {uploadedFiles.length} document(s) uploaded & analyzed
                </p>
                <p className="text-xs text-emerald-700">
                  Device data has been extracted. Switch to "Manual Entry" tab to review and submit.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={() => saveMutation.mutate(formData)} 
            className="bg-[#86b027] hover:bg-[#769c22]"
            disabled={!formData.device_name || !formData.risk_class || !formData.manufacturer_id}
          >
            {device ? 'Update Device' : 'Register Device'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}