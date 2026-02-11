import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function DPPDatasheetImporter({ open, onOpenChange }) {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('upload'); // upload, processing, review
  const [extractedData, setExtractedData] = useState(null);
  const queryClient = useQueryClient();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const processDatasheetMutation = useMutation({
    mutationFn: async () => {
      // 1. Upload file
      toast.loading('Uploading datasheet...');
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      // 2. Extract data using AI
      toast.loading('AI analyzing datasheet...');
      const extractPrompt = `Analyze this product datasheet/technical specification and extract ALL relevant data for creating a Digital Product Passport (DPP) according to ESPR requirements.

Extract:
1. Product Information (name, SKU, GTIN, manufacturer, model, category)
2. Material Composition (material name, percentage, recyclability, hazardous status, CAS numbers)
3. Sustainability Metrics (carbon footprint, water usage, energy consumption)
4. Circularity Data (recyclability score, recycled content %, repairability, expected lifetime)
5. Compliance Declarations (REACH, RoHS, WEEE, certifications)
6. Supply Chain Info (manufacturing country, supplier details)
7. End-of-Life Instructions

Return comprehensive JSON with all extracted data.`;

      const extractedInfo = await base44.integrations.Core.InvokeLLM({
        prompt: extractPrompt,
        file_urls: [uploadResult.file_url],
        response_json_schema: {
          type: "object",
          properties: {
            product_info: {
              type: "object",
              properties: {
                name: { type: "string" },
                sku: { type: "string" },
                gtin: { type: "string" },
                manufacturer: { type: "string" },
                category: { type: "string" },
                description: { type: "string" }
              }
            },
            materials: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  material: { type: "string" },
                  percentage: { type: "number" },
                  recyclable: { type: "boolean" },
                  hazardous: { type: "boolean" },
                  cas_number: { type: "string" }
                }
              }
            },
            sustainability: {
              type: "object",
              properties: {
                carbon_footprint_kg: { type: "number" },
                water_usage_liters: { type: "number" },
                energy_consumption_kwh: { type: "number" }
              }
            },
            circularity: {
              type: "object",
              properties: {
                recyclability_score: { type: "number" },
                recycled_content_percentage: { type: "number" },
                repairability_index: { type: "number" },
                expected_lifetime_years: { type: "number" }
              }
            },
            compliance: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  regulation: { type: "string" },
                  status: { type: "string" },
                  certificate_number: { type: "string" }
                }
              }
            },
            eol_instructions: { type: "string" }
          }
        }
      });

      return extractedInfo;
    },
    onSuccess: (data) => {
      setExtractedData(data);
      setStep('review');
      toast.success('Data extracted successfully!');
    },
    onError: () => {
      toast.error('Failed to process datasheet');
    }
  });

  const createProductMutation = useMutation({
    mutationFn: async () => {
      // Create product from extracted data
      const product = await base44.entities.Product.create({
        name: extractedData.product_info.name,
        sku: extractedData.product_info.sku,
        gtin: extractedData.product_info.gtin,
        category: extractedData.product_info.category,
        description: extractedData.product_info.description,
        pcf_co2e: extractedData.sustainability?.carbon_footprint_kg || 0
      });

      // Create DPP with all extracted data
      const dppId = `DPP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const qrResult = await base44.integrations.Core.GenerateImage({ 
        prompt: `QR code for Digital Product Passport ${dppId}` 
      });

      await base44.entities.DPPRecord.create({
        product_id: product.id,
        dpp_id: dppId,
        status: 'draft',
        qr_code_url: qrResult.url,
        general_info: extractedData.product_info,
        material_composition: extractedData.materials || [],
        sustainability_info: extractedData.sustainability || {},
        circularity_metrics: extractedData.circularity || {},
        compliance_declarations: extractedData.compliance || [],
        eol_instructions: extractedData.eol_instructions || '',
        version: '1.0',
        is_public: false
      });

      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dpp-records'] });
      toast.success('Product and DPP created from datasheet!');
      onOpenChange(false);
      resetState();
    },
    onError: () => {
      toast.error('Failed to create product');
    }
  });

  const resetState = () => {
    setFile(null);
    setStep('upload');
    setExtractedData(null);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) resetState(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Product from Datasheet</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <p className="text-sm text-slate-600 mb-4">
                Upload technical datasheet, specification sheet, or product manual (PDF, CSV, Excel)
              </p>
              <input
                type="file"
                accept=".pdf,.csv,.xlsx,.xls,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button type="button" asChild>
                  <span>Select File</span>
                </Button>
              </label>
              {file && (
                <div className="mt-4 flex items-center gap-2 justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
              )}
            </div>
            <Button 
              onClick={() => processDatasheetMutation.mutate()} 
              disabled={!file || processDatasheetMutation.isPending}
              className="w-full bg-[#86b027] hover:bg-[#769c22]"
            >
              {processDatasheetMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
              ) : (
                'Extract Data with AI'
              )}
            </Button>
          </div>
        )}

        {step === 'review' && extractedData && (
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="text-sm text-emerald-800">Data extracted successfully!</span>
            </div>

            <div className="space-y-3">
              <div className="p-4 border rounded-lg">
                <h4 className="font-bold mb-2">Product Information</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Name:</strong> {extractedData.product_info?.name || 'N/A'}</p>
                  <p><strong>SKU:</strong> {extractedData.product_info?.sku || 'N/A'}</p>
                  <p><strong>Category:</strong> {extractedData.product_info?.category || 'N/A'}</p>
                  <p><strong>Manufacturer:</strong> {extractedData.product_info?.manufacturer || 'N/A'}</p>
                </div>
              </div>

              {extractedData.materials?.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-bold mb-2">Materials ({extractedData.materials.length})</h4>
                  {extractedData.materials.slice(0, 3).map((mat, idx) => (
                    <p key={idx} className="text-sm">• {mat.material} ({mat.percentage}%)</p>
                  ))}
                  {extractedData.materials.length > 3 && (
                    <p className="text-xs text-slate-500 mt-1">+ {extractedData.materials.length - 3} more</p>
                  )}
                </div>
              )}

              {extractedData.sustainability && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-bold mb-2">Sustainability</h4>
                  <p className="text-sm">Carbon Footprint: {extractedData.sustainability.carbon_footprint_kg || 0} kg CO2e</p>
                </div>
              )}
            </div>

            <Button 
              onClick={() => createProductMutation.mutate()}
              disabled={createProductMutation.isPending}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              {createProductMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...</>
              ) : (
                'Create Product & DPP'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}