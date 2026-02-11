import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, ChevronRight, ChevronLeft, Building, FileText, 
  ShieldCheck, Sparkles, AlertTriangle, Mail
} from "lucide-react";
import { toast } from "sonner";
import { triggerSupplierOnboarding } from './OnboardingWorkflow';

const ONBOARDING_STEPS = [
  { id: 1, title: 'Basic Info', icon: Building, description: 'Company details' },
  { id: 2, title: 'Documents', icon: FileText, description: 'Required certificates' },
  { id: 3, title: 'Risk Profile', icon: AlertTriangle, description: 'Initial assessment' },
  { id: 4, title: 'Verification', icon: ShieldCheck, description: 'Auto-verification' },
  { id: 5, title: 'Launch', icon: Sparkles, description: 'Complete setup' }
];

const REQUIRED_DOCS = [
  { id: 'iso9001', label: 'ISO 9001 Certificate', category: 'Quality' },
  { id: 'iso14001', label: 'ISO 14001 Certificate', category: 'Environmental' },
  { id: 'reg_cert', label: 'Business Registration', category: 'Legal' },
  { id: 'tax_cert', label: 'Tax Certificate', category: 'Legal' },
  { id: 'coc', label: 'Code of Conduct', category: 'Compliance' }
];

export default function OnboardingWizard({ open, onOpenChange, editSupplier }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [supplierData, setSupplierData] = useState({
    legal_name: editSupplier?.legal_name || '',
    country: editSupplier?.country || '',
    city: editSupplier?.city || '',
    vat_number: editSupplier?.vat_number || '',
    website: editSupplier?.website || '',
    nace_code: editSupplier?.nace_code || '',
    tier: editSupplier?.tier || 'tier_1',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    documents: [],
    pfas_relevant: false,
    eudr_relevant: false,
    cbam_relevant: false
  });

  const queryClient = useQueryClient();

  const createSupplierMutation = useMutation({
    mutationFn: async (data) => {
      const supplier = await base44.entities.Supplier.create({
        legal_name: data.legal_name,
        country: data.country,
        city: data.city,
        vat_number: data.vat_number,
        website: data.website,
        nace_code: data.nace_code,
        tier: data.tier,
        pfas_relevant: data.pfas_relevant,
        eudr_relevant: data.eudr_relevant,
        cbam_relevant: data.cbam_relevant,
        status: 'pending_review',
        risk_score: 50,
        risk_level: 'medium',
        data_completeness: 40
      });

      // Create primary contact
      if (data.contact_name && data.contact_email) {
        await base44.entities.SupplierContact.create({
          supplier_id: supplier.id,
          name: data.contact_name,
          email: data.contact_email,
          phone: data.contact_phone,
          role: 'general',
          is_primary: true,
          source: 'manual'
        });
      }

      // Trigger automated onboarding workflow
      await triggerSupplierOnboarding(supplier, [
        {
          supplier_id: supplier.id,
          name: data.contact_name,
          email: data.contact_email,
          phone: data.contact_phone,
          is_primary: true
        }
      ]);

      return supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks'] });
      toast.success("Supplier onboarding initiated!");
      onOpenChange(false);
      setCurrentStep(1);
      setSupplierData({
        legal_name: '',
        country: '',
        city: '',
        vat_number: '',
        website: '',
        nace_code: '',
        tier: 'tier_1',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        documents: [],
        pfas_relevant: false,
        eudr_relevant: false,
        cbam_relevant: false
      });
    }
  });

  const handleNext = () => {
    if (currentStep === 1) {
      if (!supplierData.legal_name || !supplierData.country) {
        toast.error("Please fill in required fields");
        return;
      }
    }
    setCurrentStep(prev => Math.min(5, prev + 1));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async () => {
    await createSupplierMutation.mutateAsync(supplierData);
  };

  const progress = (currentStep / ONBOARDING_STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#545454]">Supplier Onboarding Wizard</DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {ONBOARDING_STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex flex-col items-center ${idx < ONBOARDING_STEPS.length - 1 ? 'flex-1' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentStep > step.id ? 'bg-[#86b027] text-white' :
                    currentStep === step.id ? 'bg-[#02a1e8] text-white' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {currentStep > step.id ? <CheckCircle2 className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                  </div>
                  <span className="text-xs font-medium mt-2 text-slate-600">{step.title}</span>
                </div>
                {idx < ONBOARDING_STEPS.length - 1 && (
                  <div className={`h-1 flex-1 mx-2 rounded ${
                    currentStep > step.id ? 'bg-[#86b027]' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#545454] mb-4">Company Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Legal Name *</Label>
                  <Input 
                    value={supplierData.legal_name}
                    onChange={(e) => setSupplierData({...supplierData, legal_name: e.target.value})}
                    placeholder="Acme Corp GmbH"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country *</Label>
                  <Input 
                    value={supplierData.country}
                    onChange={(e) => setSupplierData({...supplierData, country: e.target.value})}
                    placeholder="Germany"
                  />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input 
                    value={supplierData.city}
                    onChange={(e) => setSupplierData({...supplierData, city: e.target.value})}
                    placeholder="Berlin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>VAT Number</Label>
                  <Input 
                    value={supplierData.vat_number}
                    onChange={(e) => setSupplierData({...supplierData, vat_number: e.target.value})}
                    placeholder="DE123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input 
                    value={supplierData.website}
                    onChange={(e) => setSupplierData({...supplierData, website: e.target.value})}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>NACE Code</Label>
                  <Input 
                    value={supplierData.nace_code}
                    onChange={(e) => setSupplierData({...supplierData, nace_code: e.target.value})}
                    placeholder="C24.10"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Supply Chain Tier</Label>
                  <Select value={supplierData.tier} onValueChange={(v) => setSupplierData({...supplierData, tier: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tier_1">Tier 1 (Direct Supplier)</SelectItem>
                      <SelectItem value="tier_2">Tier 2 (Sub-supplier)</SelectItem>
                      <SelectItem value="tier_3">Tier 3 (Sub-sub-supplier)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-bold text-[#545454] mb-3">Primary Contact</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Name</Label>
                    <Input 
                      value={supplierData.contact_name}
                      onChange={(e) => setSupplierData({...supplierData, contact_name: e.target.value})}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      value={supplierData.contact_email}
                      onChange={(e) => setSupplierData({...supplierData, contact_email: e.target.value})}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input 
                      value={supplierData.contact_phone}
                      onChange={(e) => setSupplierData({...supplierData, contact_phone: e.target.value})}
                      placeholder="+49 123 456789"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Documents */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#545454] mb-4">Required Documents</h3>
              <p className="text-sm text-slate-600 mb-6">
                Select documents this supplier should provide. They'll receive automated requests.
              </p>
              <div className="space-y-3">
                {REQUIRED_DOCS.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={supplierData.documents.includes(doc.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSupplierData({...supplierData, documents: [...supplierData.documents, doc.id]});
                          } else {
                            setSupplierData({...supplierData, documents: supplierData.documents.filter(d => d !== doc.id)});
                          }
                        }}
                      />
                      <div>
                        <p className="font-medium text-[#545454]">{doc.label}</p>
                        <p className="text-xs text-slate-500">{doc.category}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{doc.category}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Risk Profile */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#545454] mb-4">Compliance Flags</h3>
              <p className="text-sm text-slate-600 mb-6">
                Mark relevant compliance areas to trigger appropriate questionnaires and assessments.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <Checkbox 
                    checked={supplierData.pfas_relevant}
                    onCheckedChange={(checked) => setSupplierData({...supplierData, pfas_relevant: checked})}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-[#545454]">PFAS Risk Assessment</p>
                    <p className="text-xs text-slate-500">For suppliers in chemical, textile, or electronics sectors</p>
                  </div>
                  <Badge className="bg-rose-100 text-rose-700">Chemical</Badge>
                </div>

                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <Checkbox 
                    checked={supplierData.eudr_relevant}
                    onCheckedChange={(checked) => setSupplierData({...supplierData, eudr_relevant: checked})}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-[#545454]">EUDR Compliance Check</p>
                    <p className="text-xs text-slate-500">For suppliers in agriculture, forestry, or high-risk regions</p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">Deforestation</Badge>
                </div>

                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <Checkbox 
                    checked={supplierData.cbam_relevant}
                    onCheckedChange={(checked) => setSupplierData({...supplierData, cbam_relevant: checked})}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-[#545454]">CBAM Emissions Tracking</p>
                    <p className="text-xs text-slate-500">For suppliers in steel, aluminium, cement, or fertilizers</p>
                  </div>
                  <Badge className="bg-[#02a1e8]/10 text-[#02a1e8]">Carbon</Badge>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Verification */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#545454] mb-4">Automated Verification</h3>
              <div className="bg-gradient-to-br from-[#86b027]/5 to-[#02a1e8]/5 p-6 rounded-xl border border-[#86b027]/20">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    <Sparkles className="w-6 h-6 text-[#86b027]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#545454] mb-2">AI-Powered Due Diligence</h4>
                    <p className="text-sm text-slate-600 mb-4">
                      Upon submission, our system will automatically:
                    </p>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#86b027]" />
                        Cross-check company registration and VAT details
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#86b027]" />
                        Screen against sanctions and watchlists
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#86b027]" />
                        Perform initial risk assessment based on location & sector
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#86b027]" />
                        Send automated welcome email and document requests
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#86b027]" />
                        Schedule compliance questionnaires based on flags
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review & Launch */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#545454] mb-4">Review & Launch</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Company</p>
                    <p className="font-bold text-[#545454]">{supplierData.legal_name}</p>
                    <p className="text-sm text-slate-600">{supplierData.city}, {supplierData.country}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Contact</p>
                    <p className="font-medium text-[#545454]">{supplierData.contact_name || 'Not provided'}</p>
                    <p className="text-sm text-slate-600">{supplierData.contact_email || 'Not provided'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Documents Requested</p>
                    <p className="font-bold text-[#545454]">{supplierData.documents.length} documents</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Compliance Checks</p>
                    <div className="flex gap-2 flex-wrap">
                      {supplierData.pfas_relevant && <Badge className="bg-rose-100 text-rose-700">PFAS</Badge>}
                      {supplierData.eudr_relevant && <Badge className="bg-emerald-100 text-emerald-700">EUDR</Badge>}
                      {supplierData.cbam_relevant && <Badge className="bg-[#02a1e8]/10 text-[#02a1e8]">CBAM</Badge>}
                      {!supplierData.pfas_relevant && !supplierData.eudr_relevant && !supplierData.cbam_relevant && (
                        <span className="text-sm text-slate-500">None selected</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {currentStep < 5 ? (
            <Button onClick={handleNext} className="bg-[#86b027] hover:bg-[#769c22]">
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={createSupplierMutation.isPending}
              className="bg-gradient-to-r from-[#86b027] to-[#769c22] hover:from-[#769c22] hover:to-[#86b027] shadow-lg"
            >
              {createSupplierMutation.isPending ? 'Launching...' : 'Launch Onboarding'}
              <Sparkles className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}