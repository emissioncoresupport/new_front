import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, AlertCircle, Upload, FileText, Building2, 
  Globe, ShieldCheck, TrendingUp, Package, Loader2 
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Supplier Self-Service Data Completion Portal
 * Allows suppliers to fill in detailed compliance data themselves
 * Progressive disclosure - only show sections relevant to their business
 */

export default function SupplierDataCompletionPortal() {
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [formData, setFormData] = useState({});
  const [uploadingDocs, setUploadingDocs] = useState({});
  const queryClient = useQueryClient();

  // Fetch current user and their supplier record
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['my-supplier'],
    queryFn: () => base44.entities.Supplier.filter({ 
      primary_contact_email: user.email 
    }),
    enabled: !!user,
    initialData: []
  });

  useEffect(() => {
    if (suppliers.length > 0) {
      const supplier = suppliers[0];
      setCurrentSupplier(supplier);
      setFormData({
        csddd_human_rights_dd: supplier.csddd_human_rights_dd || {},
        csddd_environmental_dd: supplier.csddd_environmental_dd || {},
        conflict_minerals: supplier.conflict_minerals || {},
        reach_compliance: supplier.reach_compliance || {},
        carbon_performance: supplier.carbon_performance || {},
        ethics_compliance: supplier.ethics_compliance || {},
        production_capacity_annual: supplier.production_capacity_annual,
        lead_time_days: supplier.lead_time_days,
        moq: supplier.moq
      });
    }
  }, [suppliers]);

  const updateSupplierMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.update(currentSupplier.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-supplier'] });
      toast.success('Data saved successfully');
    }
  });

  const handleSave = () => {
    updateSupplierMutation.mutate(formData);
  };

  const handleDocumentUpload = async (category, file) => {
    setUploadingDocs({ ...uploadingDocs, [category]: true });
    const toastId = toast.loading(`Uploading ${category} document...`);

    try {
      const user = await base44.auth.me();
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Create document record
      const docRecord = await base44.entities.Document.create({
        tenant_id: user.company_id,
        object_type: 'Supplier',
        object_id: currentSupplier.id,
        file_name: file.name,
        file_url,
        document_type: category,
        uploaded_by: user.email,
        uploaded_at: new Date().toISOString(),
        status: 'pending_review'
      });

      // Smart extraction based on document type
      const classificationResult = await base44.functions.invoke('intelligentDocumentClassifier', {
        file_url,
        supplier_id: currentSupplier.id
      });

      toast.dismiss(toastId);
      toast.success(`✓ ${file.name} uploaded and processed`);

      queryClient.invalidateQueries({ queryKey: ['my-supplier'] });
    } catch (error) {
      toast.dismiss(toastId);
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploadingDocs({ ...uploadingDocs, [category]: false });
    }
  };

  if (!currentSupplier) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#86b027] mx-auto mb-4" />
          <p className="text-slate-600">Loading your supplier profile...</p>
        </div>
      </div>
    );
  }

  const completeness = currentSupplier.data_completeness || 0;
  const sections = [
    { 
      id: 'operational', 
      label: 'Operational', 
      icon: Package,
      fields: ['production_capacity_annual', 'lead_time_days', 'moq']
    },
    { 
      id: 'human_rights', 
      label: 'Human Rights', 
      icon: ShieldCheck,
      fields: ['csddd_human_rights_dd']
    },
    { 
      id: 'environmental', 
      label: 'Environmental', 
      icon: Globe,
      fields: ['csddd_environmental_dd']
    },
    { 
      id: 'conflict_minerals', 
      label: 'Conflict Minerals', 
      icon: AlertCircle,
      fields: ['conflict_minerals']
    },
    { 
      id: 'carbon', 
      label: 'Carbon', 
      icon: TrendingUp,
      fields: ['carbon_performance']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/40 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{currentSupplier.legal_name}</h1>
              <p className="text-sm text-slate-600 mt-1">Complete your supplier profile</p>
            </div>
            <Badge className={cn(
              completeness === 100 ? "bg-green-500" : completeness > 60 ? "bg-amber-500" : "bg-red-500"
            )}>
              {completeness}% Complete
            </Badge>
          </div>
          <Progress value={completeness} className="h-2" />
        </div>

        {/* Data Completion Sections */}
        <Tabs defaultValue="operational" className="space-y-6">
          <TabsList className="bg-white/60 backdrop-blur-xl border border-white/40">
            {sections.map(section => {
              const Icon = section.icon;
              return (
                <TabsTrigger key={section.id} value={section.id} className="gap-2">
                  <Icon className="w-4 h-4" />
                  {section.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="operational" className="space-y-4">
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/40 p-6">
              <h3 className="text-lg font-semibold mb-4">Operational Capabilities</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Production Capacity (units/year)</Label>
                  <Input
                    type="number"
                    value={formData.production_capacity_annual || ''}
                    onChange={(e) => setFormData({...formData, production_capacity_annual: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Lead Time (days)</Label>
                  <Input
                    type="number"
                    value={formData.lead_time_days || ''}
                    onChange={(e) => setFormData({...formData, lead_time_days: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Minimum Order Quantity</Label>
                  <Input
                    type="number"
                    value={formData.moq || ''}
                    onChange={(e) => setFormData({...formData, moq: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <Label>Upload Capability Statement (optional)</Label>
                <input
                  type="file"
                  onChange={(e) => handleDocumentUpload('capability_statement', e.target.files[0])}
                  className="mt-2"
                  disabled={uploadingDocs.capability_statement}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="human_rights" className="space-y-4">
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/40 p-6">
              <h3 className="text-lg font-semibold mb-4">CSDDD Human Rights Due Diligence</h3>
              <div className="space-y-3">
                {[
                  { key: 'has_hr_policy', label: 'We have a Human Rights Policy' },
                  { key: 'child_labor_prevention', label: 'Child labor prevention measures in place' },
                  { key: 'forced_labor_prevention', label: 'Forced labor prevention measures in place' },
                  { key: 'living_wage_commitment', label: 'We pay living wages' },
                  { key: 'freedom_of_association', label: 'Workers have freedom of association' },
                  { key: 'modern_slavery_statement', label: 'Modern Slavery Statement published' },
                  { key: 'grievance_mechanism', label: 'Worker grievance mechanism available' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3 p-3 bg-white/40 rounded-lg">
                    <Checkbox 
                      checked={formData.csddd_human_rights_dd?.[key] || false}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        csddd_human_rights_dd: {...formData.csddd_human_rights_dd, [key]: checked}
                      })}
                    />
                    <Label className="cursor-pointer">{label}</Label>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <Label>Upload Social Audit Report (SMETA, SA8000, BSCI)</Label>
                <input
                  type="file"
                  onChange={(e) => handleDocumentUpload('social_audit', e.target.files[0])}
                  className="mt-2"
                  accept=".pdf"
                  disabled={uploadingDocs.social_audit}
                />
                <p className="text-xs text-slate-500 mt-1">AI will auto-extract compliance data from your audit report</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="environmental" className="space-y-4">
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/40 p-6">
              <h3 className="text-lg font-semibold mb-4">Environmental Due Diligence</h3>
              <div className="space-y-3">
                {[
                  { key: 'has_ems', label: 'Environmental Management System (ISO 14001)' },
                  { key: 'water_management', label: 'Water management program' },
                  { key: 'waste_management', label: 'Waste management program' },
                  { key: 'chemical_management', label: 'Chemical management (REACH compliant)' },
                  { key: 'biodiversity_protection', label: 'Biodiversity protection measures' },
                  { key: 'deforestation_prevention', label: 'Deforestation prevention policy' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3 p-3 bg-white/40 rounded-lg">
                    <Checkbox 
                      checked={formData.csddd_environmental_dd?.[key] || false}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        csddd_environmental_dd: {...formData.csddd_environmental_dd, [key]: checked}
                      })}
                    />
                    <Label className="cursor-pointer">{label}</Label>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <Label>Upload ISO 14001 Certificate or Environmental Report</Label>
                <input
                  type="file"
                  onChange={(e) => handleDocumentUpload('environmental_certificate', e.target.files[0])}
                  className="mt-2"
                  accept=".pdf"
                  disabled={uploadingDocs.environmental_certificate}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="conflict_minerals" className="space-y-4">
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/40 p-6">
              <h3 className="text-lg font-semibold mb-4">Conflict Minerals Declaration</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-white/40 rounded-lg">
                  <Checkbox 
                    checked={formData.conflict_minerals?.uses_3tg || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      conflict_minerals: {...formData.conflict_minerals, uses_3tg: checked}
                    })}
                  />
                  <Label>We use 3TG minerals (Tin, Tantalum, Tungsten, Gold)</Label>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/40 rounded-lg">
                  <Checkbox 
                    checked={formData.conflict_minerals?.uses_cobalt || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      conflict_minerals: {...formData.conflict_minerals, uses_cobalt: checked}
                    })}
                  />
                  <Label>We use Cobalt</Label>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/40 rounded-lg">
                  <Checkbox 
                    checked={formData.conflict_minerals?.cmrt_completed || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      conflict_minerals: {...formData.conflict_minerals, cmrt_completed: checked}
                    })}
                  />
                  <Label>CMRT (Conflict Minerals Reporting Template) completed</Label>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/40 rounded-lg">
                  <Checkbox 
                    checked={formData.conflict_minerals?.rmi_compliant || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      conflict_minerals: {...formData.conflict_minerals, rmi_compliant: checked}
                    })}
                  />
                  <Label>RMI (Responsible Minerals Initiative) compliant</Label>
                </div>
              </div>

              <div className="mt-6">
                <Label>Upload CMRT or Conflict Minerals Declaration</Label>
                <input
                  type="file"
                  onChange={(e) => handleDocumentUpload('conflict_minerals_declaration', e.target.files[0])}
                  className="mt-2"
                  accept=".pdf,.xlsx"
                  disabled={uploadingDocs.conflict_minerals_declaration}
                />
                <p className="text-xs text-slate-500 mt-1">AI will extract smelter data and compliance status</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="carbon" className="space-y-4">
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/40 p-6">
              <h3 className="text-lg font-semibold mb-4">Carbon & Climate Performance</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <Label className="text-xs">Scope 1 Emissions (tCO₂e)</Label>
                  <Input
                    type="number"
                    value={formData.carbon_performance?.scope1_emissions_tco2e || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      carbon_performance: {
                        ...formData.carbon_performance,
                        scope1_emissions_tco2e: parseFloat(e.target.value)
                      }
                    })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Scope 2 Emissions (tCO₂e)</Label>
                  <Input
                    type="number"
                    value={formData.carbon_performance?.scope2_emissions_tco2e || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      carbon_performance: {
                        ...formData.carbon_performance,
                        scope2_emissions_tco2e: parseFloat(e.target.value)
                      }
                    })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Renewable Energy %</Label>
                  <Input
                    type="number"
                    value={formData.carbon_performance?.renewable_energy_percentage || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      carbon_performance: {
                        ...formData.carbon_performance,
                        renewable_energy_percentage: parseFloat(e.target.value)
                      }
                    })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={formData.carbon_performance?.has_sbti_target || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      carbon_performance: {...formData.carbon_performance, has_sbti_target: checked}
                    })}
                  />
                  <Label>Science-Based Targets initiative (SBTi) approved target</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={formData.carbon_performance?.net_zero_commitment || false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      carbon_performance: {...formData.carbon_performance, net_zero_commitment: checked}
                    })}
                  />
                  <Label>Net Zero commitment</Label>
                </div>
              </div>

              <div className="mt-6">
                <Label>Upload GHG Inventory or Carbon Report</Label>
                <input
                  type="file"
                  onChange={(e) => handleDocumentUpload('carbon_report', e.target.files[0])}
                  className="mt-2"
                  accept=".pdf,.xlsx"
                  disabled={uploadingDocs.carbon_report}
                />
                <p className="text-xs text-slate-500 mt-1">AI will extract Scope 1, 2, 3 emissions automatically</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <Button 
            onClick={handleSave} 
            disabled={updateSupplierMutation.isPending}
            className="bg-[#86b027] hover:bg-[#86b027]/90"
          >
            {updateSupplierMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}