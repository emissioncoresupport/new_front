import React from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Save } from "lucide-react";
import { toast } from "sonner";

export default function ProfileSection() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = React.useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: company } = useQuery({
    queryKey: ['company'],
    queryFn: async () => {
      const companies = await base44.entities.Company.list();
      return companies[0];
    },
    enabled: !!user
  });

  const updateCompanyMutation = useMutation({
    mutationFn: (data) => base44.entities.Company.update(company.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['company']);
      setIsEditing(false);
      toast.success('Company profile updated');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      company_name: formData.get('company_name'),
      industry: formData.get('industry'),
      country: formData.get('country'),
      default_currency: formData.get('default_currency'),
      timezone: formData.get('timezone'),
      reporting_year_start_month: parseInt(formData.get('reporting_year_start_month')),
      data_residency_preference: formData.get('data_residency_preference'),
      address: formData.get('address'),
      city: formData.get('city'),
      postal_code: formData.get('postal_code'),
      primary_contact_email: formData.get('primary_contact_email'),
      phone: formData.get('phone')
    };
    updateCompanyMutation.mutate(data);
  };

  if (!company) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Company Profile
          </CardTitle>
          <Button
            variant={isEditing ? "ghost" : "outline"}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input name="company_name" required defaultValue={company.company_name} />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input name="industry" defaultValue={company.industry} />
              </div>
              <div className="space-y-2">
                <Label>Country *</Label>
                <Input name="country" required defaultValue={company.country} />
              </div>
              <div className="space-y-2">
                <Label>Default Currency</Label>
                <Select name="default_currency" defaultValue={company.default_currency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CHF">CHF</SelectItem>
                    <SelectItem value="JPY">JPY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input name="timezone" defaultValue={company.timezone} />
              </div>
              <div className="space-y-2">
                <Label>Fiscal Year Start</Label>
                <Select name="reporting_year_start_month" defaultValue={company.reporting_year_start_month?.toString() || '1'}>
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
                <Label>Data Residency</Label>
                <Select name="data_residency_preference" defaultValue={company.data_residency_preference}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EU">EU</SelectItem>
                    <SelectItem value="US">US</SelectItem>
                    <SelectItem value="Asia">Asia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Address</Label>
                <Input name="address" defaultValue={company.address} />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input name="city" defaultValue={company.city} />
              </div>
              <div className="space-y-2">
                <Label>Postal Code</Label>
                <Input name="postal_code" defaultValue={company.postal_code} />
              </div>
              <div className="space-y-2">
                <Label>Primary Contact Email</Label>
                <Input name="primary_contact_email" type="email" defaultValue={company.primary_contact_email} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input name="phone" defaultValue={company.phone} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="bg-[#86b027] hover:bg-[#769c22]">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <Label className="text-xs text-slate-500">Company Name</Label>
                <p className="font-medium">{company.company_name}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Industry</Label>
                <p className="font-medium">{company.industry || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Country</Label>
                <p className="font-medium">{company.country}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Default Currency</Label>
                <p className="font-medium">{company.default_currency}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Timezone</Label>
                <p className="font-medium">{company.timezone}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Fiscal Year Start</Label>
                <p className="font-medium">
                  {new Date(2000, (company.reporting_year_start_month || 1) - 1, 1).toLocaleString('en', { month: 'long' })}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Data Residency</Label>
                <p className="font-medium">{company.data_residency_preference || 'Not set'}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">City</Label>
                <p className="font-medium">{company.city || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Postal Code</Label>
                <p className="font-medium">{company.postal_code || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-slate-500">Address</Label>
                <p className="font-medium">{company.address || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Contact Email</Label>
                <p className="font-medium">{company.primary_contact_email || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Phone</Label>
                <p className="font-medium">{company.phone || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}