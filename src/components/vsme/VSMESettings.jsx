import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Settings, Building2, Save } from "lucide-react";

export default function VSMESettings({ report }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    company_name: report?.company_name || '',
    company_size: report?.company_size || 'medium',
    reporting_year: report?.reporting_year || new Date().getFullYear(),
    module_type: report?.module_type || 'basic',
    preparer_type: report?.preparer_type || 'upon_request',
    assurance_sought: report?.assurance_sought || false,
    assurance_provider: report?.assurance_provider || ''
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (report?.id) {
        return base44.entities.VSMEReport.update(report.id, data);
      } else {
        return base44.entities.VSMEReport.create({
          ...data,
          status: 'draft',
          overall_completion: 0,
          basic_module_completion: 0,
          comprehensive_module_completion: 0
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vsme-reports'] });
      toast.success('Settings saved');
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                placeholder="Your Company Ltd."
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Reporting Year *</Label>
              <Input
                type="number"
                value={formData.reporting_year}
                onChange={(e) => setFormData({ ...formData, reporting_year: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Size *</Label>
              <Select value={formData.company_size} onValueChange={(value) => setFormData({ ...formData, company_size: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="micro">Micro (≤10 employees)</SelectItem>
                  <SelectItem value="small">Small (≤50 employees)</SelectItem>
                  <SelectItem value="medium">Medium (≤250 employees)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preparer Type *</Label>
              <Select value={formData.preparer_type} onValueChange={(value) => setFormData({ ...formData, preparer_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spontaneous">Spontaneous (Voluntary)</SelectItem>
                  <SelectItem value="upon_request">Upon Request (Supply Chain)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Module Selection *</Label>
            <Select value={formData.module_type} onValueChange={(value) => setFormData({ ...formData, module_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic Module Only (11 disclosures)</SelectItem>
                <SelectItem value="comprehensive">Basic + Comprehensive (20 disclosures)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
            <Checkbox
              id="assurance"
              checked={formData.assurance_sought}
              onCheckedChange={(checked) => setFormData({ ...formData, assurance_sought: checked })}
            />
            <div>
              <Label htmlFor="assurance" className="font-medium cursor-pointer">
                Seek external assurance (optional)
              </Label>
              <p className="text-xs text-slate-500 mt-1">
                Third-party verification to enhance credibility
              </p>
            </div>
          </div>

          {formData.assurance_sought && (
            <div className="space-y-2">
              <Label>Assurance Provider</Label>
              <Input
                placeholder="e.g., KPMG, Deloitte, PwC"
                value={formData.assurance_provider}
                onChange={(e) => setFormData({ ...formData, assurance_provider: e.target.value })}
              />
            </div>
          )}

          <Button
            onClick={() => saveMutation.mutate(formData)}
            disabled={saveMutation.isPending || !formData.company_name}
            className="w-full bg-[#86b027] hover:bg-[#769c22]"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}