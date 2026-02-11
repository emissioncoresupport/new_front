import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, Loader2, Info, AlertTriangle } from "lucide-react";

export default function CBAMSupplierDataUpload({ supplier, companyId }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    product_name: '',
    cn_code: '',
    production_route: '',
    direct_emissions: '',
    indirect_emissions: '',
    calculation_method: 'EU_method',
    installation_id: '',
    supplier_notes: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch supplier's installations
  const { data: installations = [] } = useQuery({
    queryKey: ['cbam-installations', supplier?.id],
    queryFn: async () => {
      const all = await base44.entities.CBAMInstallation.list();
      return all.filter(i => i.supplier_id === supplier?.id);
    },
    enabled: !!supplier
  });

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.SupplierCBAMSubmission.create({
        ...data,
        supplier_id: supplier.id,
        company_id: companyId,
        submission_date: new Date().toISOString(),
        total_emissions: parseFloat(data.direct_emissions) + parseFloat(data.indirect_emissions || 0),
        supporting_documents: uploadedFiles,
        verification_status: 'pending',
        compliance_status: 'under_review'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-submissions'] });
      toast.success('Data submitted successfully for review');
      setFormData({
        product_name: '',
        cn_code: '',
        production_route: '',
        direct_emissions: '',
        indirect_emissions: '',
        calculation_method: 'EU_method',
        installation_id: '',
        supplier_notes: ''
      });
      setUploadedFiles([]);
    },
    onError: (error) => {
      toast.error('Submission failed: ' + error.message);
    }
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setIsUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      }
      setUploadedFiles([...uploadedFiles, ...urls]);
      toast.success(`${files.length} file(s) uploaded`);
    } catch (error) {
      toast.error('File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.product_name || !formData.direct_emissions) {
      toast.error('Please fill in all required fields');
      return;
    }
    submitMutation.mutate(formData);
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-br from-[#86b027]/5 to-white">
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#86b027]/10">
            <Upload className="w-5 h-5 text-[#86b027]" />
          </div>
          Submit CBAM Emission Data
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-slate-700">
            Submit accurate emission data for your products. Data will be reviewed by your buyer and may require third-party verification per EU Regulation 2023/956.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="product">Product Name *</Label>
              <Input
                id="product"
                value={formData.product_name}
                onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                placeholder="e.g., Hot-rolled steel coils"
                required
              />
            </div>
            <div>
              <Label htmlFor="cn">CN Code</Label>
              <Input
                id="cn"
                value={formData.cn_code}
                onChange={(e) => setFormData({...formData, cn_code: e.target.value})}
                placeholder="e.g., 72081000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="installation">Production Installation</Label>
              <Select
                value={formData.installation_id}
                onValueChange={(v) => setFormData({...formData, installation_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select installation" />
                </SelectTrigger>
                <SelectContent>
                  {installations.map(inst => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.installation_name} - {inst.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="route">Production Route</Label>
              <Select
                value={formData.production_route}
                onValueChange={(v) => setFormData({...formData, production_route: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select route" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BF-BOF">BF-BOF (Blast Furnace)</SelectItem>
                  <SelectItem value="DRI-EAF">DRI-EAF</SelectItem>
                  <SelectItem value="Scrap-EAF">Scrap-EAF</SelectItem>
                  <SelectItem value="Primary_electrolysis">Primary Electrolysis</SelectItem>
                  <SelectItem value="Secondary_from_scrap">Secondary from Scrap</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="direct">Direct Emissions (tCO2e/tonne) *</Label>
              <Input
                id="direct"
                type="number"
                step="0.01"
                value={formData.direct_emissions}
                onChange={(e) => setFormData({...formData, direct_emissions: e.target.value})}
                placeholder="1.85"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Scope 1 emissions</p>
            </div>
            <div>
              <Label htmlFor="indirect">Indirect Emissions (tCO2e/tonne)</Label>
              <Input
                id="indirect"
                type="number"
                step="0.01"
                value={formData.indirect_emissions}
                onChange={(e) => setFormData({...formData, indirect_emissions: e.target.value})}
                placeholder="0.32"
              />
              <p className="text-xs text-slate-500 mt-1">Scope 2 emissions</p>
            </div>
            <div>
              <Label>Total Emissions</Label>
              <Input
                value={
                  (parseFloat(formData.direct_emissions || 0) + 
                   parseFloat(formData.indirect_emissions || 0)).toFixed(2)
                }
                disabled
                className="bg-slate-50 font-bold"
              />
              <p className="text-xs text-slate-500 mt-1">Auto-calculated</p>
            </div>
          </div>

          <div>
            <Label htmlFor="method">Calculation Method</Label>
            <Select
              value={formData.calculation_method}
              onValueChange={(v) => setFormData({...formData, calculation_method: v})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EU_method">EU Method (Preferred)</SelectItem>
                <SelectItem value="Equivalent_method_A">Equivalent Method A</SelectItem>
                <SelectItem value="Equivalent_method_B">Equivalent Method B</SelectItem>
                <SelectItem value="Default_values">Default Values (Temporary)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.supplier_notes}
              onChange={(e) => setFormData({...formData, supplier_notes: e.target.value})}
              placeholder="Any additional information about this submission..."
              rows={3}
            />
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-lg p-6">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <h4 className="font-semibold text-slate-700 mb-2">Upload Supporting Documents</h4>
              <p className="text-sm text-slate-500 mb-4">
                Third-party verification reports, ISO 14064 certificates, or calculation sheets
              </p>
              <div className="relative inline-block">
                <input
                  type="file"
                  multiple
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                />
                <Button type="button" variant="outline" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Select Files
                    </>
                  )}
                </Button>
              </div>
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((url, idx) => (
                    <div key={idx} className="text-sm text-slate-600 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Document {idx + 1} uploaded
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="submit"
              disabled={submitMutation.isPending}
              className="bg-[#86b027] hover:bg-[#769c22]"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Submit Data
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}