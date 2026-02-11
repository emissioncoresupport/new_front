import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Upload, FileText, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function PPWRDeclarationUpload({ open, onOpenChange, packaging, suppliers }) {
  const [file, setFile] = useState(null);
  const [selectedPackaging, setSelectedPackaging] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected');

      // Step 1: Upload file
      toast.loading('Uploading document...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Step 2: AI extraction
      setExtracting(true);
      toast.dismiss();
      toast.loading('AI extracting data...');

      const prompt = `Extract key information from this supplier declaration/certificate for PPWR compliance:

Required fields:
1. Supplier name
2. PCR (Post-Consumer Recycled) content percentage
3. Material type (Plastic, Paper, Glass, Metal, etc.)
4. Certificate/Declaration number
5. Issue date (format: YYYY-MM-DD)
6. Expiry/Valid until date (format: YYYY-MM-DD)
7. Certification body/authority
8. Applicable standards (e.g., EN 15343, ISO 14021)
9. Product/material description

Return as structured JSON. If field not found, return null.`;

      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            supplier_name: { type: "string" },
            pcr_percentage: { type: "number" },
            material_type: { type: "string" },
            certificate_number: { type: "string" },
            issue_date: { type: "string" },
            expiry_date: { type: "string" },
            certification_body: { type: "string" },
            standards: { type: "array", items: { type: "string" } },
            product_description: { type: "string" },
            confidence_score: { type: "number" }
          }
        }
      });

      setExtractedData(extracted);
      setExtracting(false);
      toast.dismiss();
      toast.success('Data extracted successfully');

      // Step 3: Match supplier
      if (extracted.supplier_name && !selectedSupplier) {
        const matchedSupplier = suppliers.find(s => 
          s.legal_name.toLowerCase().includes(extracted.supplier_name.toLowerCase())
        );
        if (matchedSupplier) {
          setSelectedSupplier(matchedSupplier.id);
        }
      }

      // Step 4: Save declaration
      const declaration = await base44.entities.DPPEvidence.create({
        dpp_id: selectedPackaging,
        evidence_type: 'supplier_declaration',
        file_url,
        file_name: file.name,
        file_size_kb: Math.round(file.size / 1024),
        uploaded_by: (await base44.auth.me()).email,
        upload_date: new Date().toISOString(),
        linked_to_field: 'recycled_content_percentage',
        extracted_data: {
          ...extracted,
          supplier_id: selectedSupplier || null
        },
        verification_status: extracted.confidence_score > 0.8 ? 'verified' : 'pending'
      });

      // Step 5: Update packaging with PCR data if available
      if (selectedPackaging && extracted.pcr_percentage) {
        const pkg = packaging.find(p => p.id === selectedPackaging);
        if (pkg) {
          await base44.entities.PPWRPackaging.update(selectedPackaging, {
            recycled_content_percentage: extracted.pcr_percentage,
            supplier_declaration_url: file_url,
            compliance_status: extracted.pcr_percentage >= (pkg.recycled_content_target || 30) ? 'Compliant' : 'Below Target'
          });
        }
      }

      queryClient.invalidateQueries(['ppwr-declarations']);
      queryClient.invalidateQueries(['ppwr-packaging']);
      
      return declaration;
    },
    onSuccess: () => {
      toast.success('Declaration uploaded and linked');
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Upload failed: ' + error.message);
      setExtracting(false);
    }
  });

  const resetForm = () => {
    setFile(null);
    setSelectedPackaging('');
    setSelectedSupplier('');
    setExtractedData(null);
    setExtracting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) resetForm(); onOpenChange(open); }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Supplier Declaration</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Document (PDF, PNG, JPG)</Label>
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                file ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400'
              }`}>
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-6 h-6 text-emerald-600" />
                    <div className="text-left">
                      <div className="font-medium text-slate-900">{file.name}</div>
                      <div className="text-xs text-slate-500">
                        {(file.size / 1024).toFixed(0)} KB
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-600">Click to upload or drag and drop</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Link to Packaging */}
          <div className="space-y-2">
            <Label>Link to Packaging Item</Label>
            <Select value={selectedPackaging} onValueChange={setSelectedPackaging}>
              <SelectTrigger>
                <SelectValue placeholder="Select packaging item..." />
              </SelectTrigger>
              <SelectContent>
                {packaging.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.packaging_name} ({p.material_category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Supplier */}
          <div className="space-y-2">
            <Label>Supplier (Optional)</Label>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger>
                <SelectValue placeholder="AI will auto-detect..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.legal_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Extraction Progress */}
          {extracting && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
              <div className="flex items-center gap-2 text-blue-900 font-medium">
                <Sparkles className="w-5 h-5 animate-pulse" />
                AI Extracting Data...
              </div>
              <Progress value={66} className="h-2" indicatorClassName="bg-blue-600" />
              <p className="text-xs text-blue-700">
                Analyzing document for PCR content, dates, and certification details
              </p>
            </div>
          )}

          {/* Extracted Data Preview */}
          {extractedData && (
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-medium mb-3">
                <CheckCircle2 className="w-5 h-5" />
                Extracted Information
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {extractedData.pcr_percentage && (
                  <div>
                    <span className="text-slate-600">PCR Content:</span>
                    <span className="font-bold text-emerald-700 ml-2">{extractedData.pcr_percentage}%</span>
                  </div>
                )}
                {extractedData.certificate_number && (
                  <div>
                    <span className="text-slate-600">Cert #:</span>
                    <span className="font-medium text-slate-900 ml-2">{extractedData.certificate_number}</span>
                  </div>
                )}
                {extractedData.issue_date && (
                  <div>
                    <span className="text-slate-600">Issue Date:</span>
                    <span className="font-medium text-slate-900 ml-2">
                      {new Date(extractedData.issue_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {extractedData.expiry_date && (
                  <div>
                    <span className="text-slate-600">Expires:</span>
                    <span className="font-medium text-slate-900 ml-2">
                      {new Date(extractedData.expiry_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Confidence: {((extractedData.confidence_score || 0) * 100).toFixed(0)}%
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={!file || !selectedPackaging || uploadMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {uploadMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Upload & Extract</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}