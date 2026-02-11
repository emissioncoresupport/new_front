import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { 
  ArrowRight, CheckCircle2, Mail, Calendar, Send, AlertTriangle, 
  Sparkles, Loader2, Upload, FileCheck
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function SmartImportWizard({ open, onOpenChange, initialData }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    import_id: `IMP-${Date.now()}`,
    import_date: new Date().toISOString().split('T')[0],
    country_of_origin: '',
    hs_code: '',
    goods_type: 'Iron & Steel',
    net_mass_tonnes: 0,
    supplier_id: '',
    installation_id: '',
    calculation_method: 'actual_data',
    direct_emissions_specific: 0,
    indirect_emissions_specific: 0,
    carbon_price_paid: 0,
    auto_request_data: true,
    reminder_frequency: '7_days'
  });

  const [supplierInvite, setSupplierInvite] = useState({
    send: false,
    email: '',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: installations = [] } = useQuery({
    queryKey: ['cbam-installations'],
    queryFn: () => base44.entities.CBAMInstallation.list()
  });

  const createEntryMutation = useMutation({
    mutationFn: async (data) => {
      const entry = await base44.entities.CBAMEmissionEntry.create(data);
      
      // If supplier invitation requested
      if (supplierInvite.send && supplierInvite.email) {
        const supplier = suppliers.find(s => s.id === data.supplier_id);
        
        await base44.integrations.Core.SendEmail({
          to: supplierInvite.email,
          subject: `[CBAM] Data Request for Import ${data.import_id}`,
          body: `Dear Supplier,

We require verified emissions data for the following import:

Import ID: ${data.import_id}
Product: ${data.goods_type}
HS Code: ${data.hs_code}
Net Mass: ${data.net_mass_tonnes} tonnes
Deadline: ${supplierInvite.deadline}

Please provide:
✓ Installation-specific direct emissions (tCO2e/t)
✓ Indirect emissions (tCO2e/t)
✓ Verification report (ISO 14064 or equivalent)
✓ Mill test certificate

Submit via the secure portal: [Portal URL]

Automated reminders will be sent ${data.reminder_frequency === '7_days' ? 'weekly' : data.reminder_frequency === '14_days' ? 'bi-weekly' : 'monthly'} until submission.

Best regards,
CBAM Compliance Team`
        });

        // Create reminder task
        await base44.entities.OnboardingTask.create({
          supplier_id: data.supplier_id,
          title: `CBAM Data for ${data.import_id}`,
          description: `Submit verified emissions data for import ${data.import_id} (${data.goods_type})`,
          task_type: 'data_collection',
          priority: 'high',
          due_date: supplierInvite.deadline,
          status: 'pending',
          related_entity_type: 'import',
          related_entity_id: entry.id,
          auto_reminder: true,
          reminder_frequency: data.reminder_frequency
        });

        toast.success('Import created and supplier notified');
      }
      
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks'] });
      onOpenChange(false);
      setStep(1);
    }
  });

  const filteredInstallations = installations.filter(i => i.supplier_id === formData.supplier_id);
  const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);

  const handleNext = () => {
    if (step === 1 && !formData.supplier_id) {
      toast.error('Please select a supplier');
      return;
    }
    if (step === 2 && !formData.hs_code) {
      toast.error('Please enter HS Code');
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = () => {
    createEntryMutation.mutate(formData);
  };

  const progress = (step / 4) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#86b027]" />
            Smart Import Creation
          </DialogTitle>
          <Progress value={progress} className="h-2 mt-2" />
          <p className="text-xs text-slate-500">Step {step} of 4</p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Step 1: Supplier & Installation Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Select Supplier *</Label>
                <Select 
                  value={formData.supplier_id} 
                  onValueChange={(v) => {
                    setFormData({...formData, supplier_id: v, installation_id: ''});
                    const sup = suppliers.find(s => s.id === v);
                    if (sup) {
                      const contacts = []; // Would fetch from SupplierContact
                      setSupplierInvite({
                        ...supplierInvite,
                        email: sup.contact_email || ''
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.legal_name} ({s.country})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.supplier_id && (
                <>
                  <div>
                    <Label>Installation (Optional)</Label>
                    <Select value={formData.installation_id} onValueChange={(v) => setFormData({...formData, installation_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select installation or skip" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredInstallations.map(i => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.name} - {i.production_technology}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {filteredInstallations.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">No installations registered for this supplier</p>
                    )}
                  </div>

                  {/* Supplier Data Request Card */}
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-blue-900">Request Verified Data from Supplier</h4>
                            <Switch 
                              checked={supplierInvite.send}
                              onCheckedChange={(checked) => setSupplierInvite({...supplierInvite, send: checked})}
                            />
                          </div>
                          
                          {supplierInvite.send && (
                            <div className="space-y-3 mt-3">
                              <div>
                                <Label className="text-xs">Supplier Email</Label>
                                <Input 
                                  type="email"
                                  value={supplierInvite.email}
                                  onChange={(e) => setSupplierInvite({...supplierInvite, email: e.target.value})}
                                  placeholder="supplier@company.com"
                                  className="bg-white"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Response Deadline</Label>
                                <Input 
                                  type="date"
                                  value={supplierInvite.deadline}
                                  onChange={(e) => setSupplierInvite({...supplierInvite, deadline: e.target.value})}
                                  className="bg-white"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Reminder Frequency</Label>
                                <Select 
                                  value={formData.reminder_frequency} 
                                  onValueChange={(v) => setFormData({...formData, reminder_frequency: v})}
                                >
                                  <SelectTrigger className="bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="7_days">Weekly (Every 7 days)</SelectItem>
                                    <SelectItem value="14_days">Bi-weekly (Every 14 days)</SelectItem>
                                    <SelectItem value="30_days">Monthly (Every 30 days)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-start gap-2 p-2 bg-blue-100 rounded text-xs text-blue-800">
                                <AlertTriangle className="w-3 h-3 mt-0.5" />
                                <p>Automated reminders will be sent until supplier submits verified data</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              <div className="flex justify-end">
                <Button onClick={handleNext} className="bg-[#86b027] hover:bg-[#769c22]">
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Product Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>HS Code *</Label>
                  <Input 
                    value={formData.hs_code}
                    onChange={(e) => setFormData({...formData, hs_code: e.target.value})}
                    placeholder="7208 10 00"
                  />
                </div>
                <div>
                  <Label>Goods Type *</Label>
                  <Select value={formData.goods_type} onValueChange={(v) => setFormData({...formData, goods_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Iron & Steel">Iron & Steel</SelectItem>
                      <SelectItem value="Aluminium">Aluminium</SelectItem>
                      <SelectItem value="Cement">Cement</SelectItem>
                      <SelectItem value="Fertilizers">Fertilizers</SelectItem>
                      <SelectItem value="Hydrogen">Hydrogen</SelectItem>
                      <SelectItem value="Electricity">Electricity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Import Date *</Label>
                  <Input 
                    type="date"
                    value={formData.import_date}
                    onChange={(e) => setFormData({...formData, import_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Net Mass (tonnes) *</Label>
                  <Input 
                    type="number"
                    step="0.001"
                    value={formData.net_mass_tonnes}
                    onChange={(e) => setFormData({...formData, net_mass_tonnes: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={handleNext} className="bg-[#86b027] hover:bg-[#769c22]">
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Emissions Data */}
          {step === 3 && (
            <div className="space-y-4">
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-bold text-amber-900">Important: Actual Data Required from 2026</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Default values incur 20% penalty. Request verified emissions from supplier installation.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <Label>Calculation Method</Label>
                <Select value={formData.calculation_method} onValueChange={(v) => setFormData({...formData, calculation_method: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actual_data">Actual Data (Verified)</SelectItem>
                    <SelectItem value="default_values">Default Values (+20% penalty)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Direct Emissions (tCO2e/t)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={formData.direct_emissions_specific}
                    onChange={(e) => setFormData({...formData, direct_emissions_specific: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>Indirect Emissions (tCO2e/t)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={formData.indirect_emissions_specific}
                    onChange={(e) => setFormData({...formData, indirect_emissions_specific: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div>
                <Label>Carbon Price Paid Abroad (€/t)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={formData.carbon_price_paid}
                  onChange={(e) => setFormData({...formData, carbon_price_paid: parseFloat(e.target.value) || 0})}
                />
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={handleNext} className="bg-[#86b027] hover:bg-[#769c22]">
                  Review <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-bold text-slate-900">Import Summary</h4>
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Supplier:</span>
                        <span className="font-medium">{selectedSupplier?.legal_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Product:</span>
                        <span className="font-medium">{formData.goods_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Net Mass:</span>
                        <span className="font-medium">{formData.net_mass_tonnes} t</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Emissions:</span>
                        <span className="font-bold text-[#86b027]">
                          {(formData.net_mass_tonnes * (formData.direct_emissions_specific + formData.indirect_emissions_specific)).toFixed(2)} tCO2e
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={supplierInvite.send ? "border-green-200 bg-green-50" : "border-slate-200"}>
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-bold text-slate-900">Supplier Notification</h4>
                    {supplierInvite.send ? (
                      <div className="text-sm space-y-2">
                        <div className="flex items-center gap-2 text-green-700">
                          <Mail className="w-4 h-4" />
                          <span className="font-medium">{supplierInvite.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Deadline:</span>
                          <span className="font-medium">{new Date(supplierInvite.deadline).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Reminders:</span>
                          <span className="font-medium">{formData.reminder_frequency.replace('_', ' ')}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No supplier notification will be sent</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-600" />
                    <div>
                      <h4 className="font-bold text-purple-900">2026 Auditor Verification Required</h4>
                      <p className="text-sm text-purple-700 mt-1">
                        Starting January 2026, installations must be verified by accredited auditors. 
                        {formData.installation_id ? (
                          <span> This installation will be flagged for verification.</span>
                        ) : (
                          <span className="text-amber-700"> ⚠️ Create installation record for this supplier to enable verification.</span>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
                <Button 
                  onClick={handleSubmit} 
                  className="bg-[#86b027] hover:bg-[#769c22]"
                  disabled={createEntryMutation.isPending}
                >
                  {createEntryMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> Create Import & Notify</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}