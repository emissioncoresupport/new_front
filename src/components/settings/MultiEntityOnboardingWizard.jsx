import React, { useState } from 'react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Building2, MapPin, Target, Users } from "lucide-react";
import { toast } from "sonner";

export default function MultiEntityOnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [inviteEmails, setInviteEmails] = useState(['']);
  const [inviteRoles, setInviteRoles] = useState(['user']);
  const [companyData, setCompanyData] = useState({});
  const [legalEntityData, setLegalEntityData] = useState({});
  const [siteData, setSiteData] = useState({});
  const [scopeData, setScopeData] = useState({});
  const queryClient = useQueryClient();

  const createCompanyMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const company = await base44.entities.Company.create({
        ...data,
        reporting_year_start_month: parseInt(data.reporting_year_start_month) || 1
      });
      
      // Update user with tenant_id
      await base44.auth.updateMe({ tenant_id: company.id });
      
      return company;
    },
    onSuccess: (company) => {
      setCompanyData(company);
      setStep(2);
      toast.success("Company profile created");
    }
  });

  const createEntityAndSiteMutation = useMutation({
    mutationFn: async ({ entity, site }) => {
      // Create Legal Entity
      const legalEntity = await base44.entities.LegalEntity.create({
        ...entity,
        tenant_id: companyData.id
      });

      // Create Site
      const siteRecord = await base44.entities.Site.create({
        ...site,
        tenant_id: companyData.id,
        legal_entity_id: legalEntity.id
      });

      // Create Default Scope
      const scope = await base44.entities.ReportingScope.create({
        tenant_id: companyData.id,
        name: "Default Scope",
        scope_type: "LEGAL_ENTITY",
        legal_entity_ids: [legalEntity.id],
        site_ids: [siteRecord.id],
        jurisdictions: [legalEntity.country],
        active: true
      });

      return { legalEntity, siteRecord, scope };
    },
    onSuccess: (data) => {
      setScopeData(data.scope);
      queryClient.invalidateQueries();
      setStep(3);
      toast.success("Legal entity and site created");
    }
  });

  const handleStep1Submit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    createCompanyMutation.mutate(data);
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const entity = {
      name: formData.get('entity_name'),
      country: formData.get('entity_country'),
      registration_id: formData.get('registration_id'),
      vat_id: formData.get('vat_id'),
      reporting_currency: formData.get('reporting_currency'),
      entity_type: formData.get('entity_type')
    };
    const site = {
      name: formData.get('site_name'),
      site_type: formData.get('site_type'),
      address: formData.get('site_address'),
      city: formData.get('site_city'),
      postal_code: formData.get('site_postal'),
      country: formData.get('entity_country')
    };
    createEntityAndSiteMutation.mutate({ entity, site });
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              step >= i ? 'bg-[#86b027] text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {step > i ? <CheckCircle2 className="w-5 h-5" /> : i}
            </div>
            {i < 4 && <div className={`w-20 h-1 ${step > i ? 'bg-[#86b027]' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Profile
            </CardTitle>
            <CardDescription>Set up your organization profile</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input name="company_name" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Input name="industry" placeholder="Manufacturing, Retail..." />
                </div>
                <div className="space-y-2">
                  <Label>Country *</Label>
                  <Input name="country" required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Default Currency</Label>
                  <Select name="default_currency" defaultValue="EUR">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fiscal Year Start</Label>
                  <Select name="reporting_year_start_month" defaultValue="1">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 12}, (_, i) => (
                        <SelectItem key={i+1} value={(i+1).toString()}>
                          {new Date(2000, i, 1).toLocaleString('en', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input name="timezone" defaultValue="Europe/Brussels" />
                </div>
              </div>
              <Button type="submit" className="w-full bg-[#86b027] hover:bg-[#769c22]">
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Legal Entity & Site
            </CardTitle>
            <CardDescription>Create your first legal entity and site</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                <h3 className="font-semibold">Legal Entity</h3>
                <div className="space-y-2">
                  <Label>Entity Name *</Label>
                  <Input name="entity_name" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Country *</Label>
                    <Input name="entity_country" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Entity Type</Label>
                    <Select name="entity_type" defaultValue="Headquarters">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Headquarters">Headquarters</SelectItem>
                        <SelectItem value="Subsidiary">Subsidiary</SelectItem>
                        <SelectItem value="Branch">Branch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Registration ID</Label>
                    <Input name="registration_id" />
                  </div>
                  <div className="space-y-2">
                    <Label>VAT ID</Label>
                    <Input name="vat_id" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reporting Currency</Label>
                  <Input name="reporting_currency" defaultValue="EUR" />
                </div>
              </div>

              <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                <h3 className="font-semibold">Site</h3>
                <div className="space-y-2">
                  <Label>Site Name *</Label>
                  <Input name="site_name" required placeholder="HQ Office, Factory 1..." />
                </div>
                <div className="space-y-2">
                  <Label>Site Type</Label>
                  <Select name="site_type" defaultValue="Office">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Office">Office</SelectItem>
                      <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="Warehouse">Warehouse</SelectItem>
                      <SelectItem value="R&D">R&D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input name="site_address" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input name="site_city" />
                  </div>
                  <div className="space-y-2">
                    <Label>Postal Code</Label>
                    <Input name="site_postal" />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full bg-[#86b027] hover:bg-[#769c22]">
                Create & Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Invite Team Members
            </CardTitle>
            <CardDescription>Add users and assign roles (optional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-900">
              You can invite team members now or skip and do it later from Settings.
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input placeholder="colleague@company.com" type="email" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select defaultValue="user">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin (Full Access)</SelectItem>
                    <SelectItem value="user">User (Standard Access)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="w-full">
                Send Invite
              </Button>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep(4)} className="flex-1">
                Skip for Now
              </Button>
              <Button onClick={() => setStep(4)} className="flex-1 bg-[#86b027] hover:bg-[#769c22]">
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Setup Complete!
            </CardTitle>
            <CardDescription>Your organization structure is ready</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-sm text-emerald-900">
                ✓ Company profile created<br/>
                ✓ Legal entity configured<br/>
                ✓ First site established<br/>
                ✓ Default reporting scope created
              </p>
            </div>
            <Button onClick={onComplete} className="w-full bg-[#86b027] hover:bg-[#769c22]">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}