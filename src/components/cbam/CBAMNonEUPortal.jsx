import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Globe, Upload, FileText, Send, CheckCircle2, Clock, Building2 } from "lucide-react";

export default function CBAMNonEUPortal() {
  const [formData, setFormData] = useState({
    installation_name: '',
    country: '',
    goods_category: '',
    production_technology: '',
    direct_emissions: '',
    indirect_emissions: '',
    supporting_docs: ''
  });

  const queryClient = useQueryClient();

  const { data: installations = [] } = useQuery({
    queryKey: ['cbam-installations'],
    queryFn: () => base44.entities.CBAMInstallation.list()
  });

  const submitDataMutation = useMutation({
    mutationFn: async (data) => {
      toast.loading('Submitting installation data...');

      // Create or update installation
      const installation = await base44.entities.CBAMInstallation.create({
        name: data.installation_name,
        country: data.country,
        production_technology: data.goods_category,
        emission_factors: {
          direct: parseFloat(data.direct_emissions),
          indirect: parseFloat(data.indirect_emissions)
        },
        verification_status: 'pending',
        data_source: 'supplier_portal'
      });

      // Send notification to EU importer
      const user = await base44.auth.me();
      await base44.integrations.Core.SendEmail({
        to: user.email, // In real scenario, send to importer
        subject: 'New Installation Data Submitted - CBAM',
        body: `
          <h2>Non-EU Installation Data Received</h2>
          <p>A new installation has submitted their emission data:</p>
          <ul>
            <li><strong>Installation:</strong> ${data.installation_name}</li>
            <li><strong>Country:</strong> ${data.country}</li>
            <li><strong>Technology:</strong> ${data.goods_category}</li>
            <li><strong>Direct Emissions:</strong> ${data.direct_emissions} tCO2e/t</li>
            <li><strong>Indirect Emissions:</strong> ${data.indirect_emissions} tCO2e/t</li>
          </ul>
          <p>Please review and verify this data in the CBAM Installations tab.</p>
        `
      });

      return installation;
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success('Data submitted successfully! EU importer will review.');
      queryClient.invalidateQueries(['cbam-installations']);
      setFormData({
        installation_name: '',
        country: '',
        goods_category: '',
        production_technology: '',
        direct_emissions: '',
        indirect_emissions: '',
        supporting_docs: ''
      });
    },
    onError: () => {
      toast.dismiss();
      toast.error('Submission failed');
    }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex p-3 bg-blue-100 rounded-full mb-4">
          <Globe className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Non-EU Installation Portal</h2>
        <p className="text-slate-600 mt-2">Submit your production facility emission data for CBAM compliance</p>
      </div>

      <Card className="border-blue-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Installation Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Installation Name *</Label>
              <Input
                placeholder="e.g., Shanghai Steel Mill #3"
                value={formData.installation_name}
                onChange={(e) => setFormData({...formData, installation_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Country *</Label>
              <Input
                placeholder="e.g., China"
                value={formData.country}
                onChange={(e) => setFormData({...formData, country: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Goods Category (CN Code) *</Label>
            <Input
              placeholder="e.g., 7208 - Flat-rolled products"
              value={formData.goods_category}
              onChange={(e) => setFormData({...formData, goods_category: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label>Production Technology</Label>
            <Input
              placeholder="e.g., Electric Arc Furnace (EAF)"
              value={formData.production_technology}
              onChange={(e) => setFormData({...formData, production_technology: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Direct Emissions (tCO2e/t) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g., 0.85"
                value={formData.direct_emissions}
                onChange={(e) => setFormData({...formData, direct_emissions: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Indirect Emissions (tCO2e/t) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g., 0.15"
                value={formData.indirect_emissions}
                onChange={(e) => setFormData({...formData, indirect_emissions: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Supporting Documents (URLs or References)</Label>
            <Textarea
              placeholder="Attach emission verification reports, certifications, etc."
              value={formData.supporting_docs}
              onChange={(e) => setFormData({...formData, supporting_docs: e.target.value})}
              rows={3}
            />
          </div>

          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
            onClick={() => submitDataMutation.mutate(formData)}
            disabled={submitDataMutation.isPending || !formData.installation_name || !formData.country}
          >
            {submitDataMutation.isPending ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</>
            ) : (
              <><Send className="w-5 h-5 mr-2" /> Submit to EU Importer</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Previous Submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {installations.filter(i => i.data_source === 'supplier_portal').map(inst => (
              <div key={inst.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium text-sm">{inst.name}</div>
                  <div className="text-xs text-slate-500">{inst.country} • {inst.production_technology}</div>
                </div>
                <Badge className={
                  inst.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                  inst.verification_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                }>
                  {inst.verification_status}
                </Badge>
              </div>
            ))}
            {installations.filter(i => i.data_source === 'supplier_portal').length === 0 && (
              <p className="text-center text-slate-400 text-sm py-4">No submissions yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}