import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function CSRDDocumentProcessor({ taskId, onDataExtracted }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);
    toast.loading('Uploading and processing document...');

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });

      // Extract data using AI/OCR
      const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            scope1_emissions: { type: 'number', description: 'Scope 1 GHG emissions in tCO2e' },
            scope2_emissions: { type: 'number', description: 'Scope 2 GHG emissions in tCO2e' },
            scope3_emissions: { type: 'number', description: 'Scope 3 GHG emissions in tCO2e' },
            water_consumption: { type: 'number', description: 'Water consumption in m³' },
            waste_generated: { type: 'number', description: 'Total waste generated in tonnes' },
            waste_recycled: { type: 'number', description: 'Waste recycled in tonnes' },
            employee_count: { type: 'number', description: 'Total number of employees' },
            female_employees_percentage: { type: 'number', description: 'Percentage of female employees' },
            training_hours_per_employee: { type: 'number', description: 'Average training hours per employee' },
            metrics: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  metric_name: { type: 'string' },
                  value: { type: 'number' },
                  unit: { type: 'string' },
                  esrs_code: { type: 'string', description: 'ESRS disclosure requirement code' }
                }
              }
            }
          }
        }
      });

      toast.dismiss();

      if (extractionResult.status === 'success') {
        setExtractedData(extractionResult.output);
        toast.success('Data extracted successfully!');
        
        // Validate extracted data with AI
        const validation = await base44.integrations.Core.InvokeLLM({
          prompt: `Validate the following extracted CSRD data for completeness and accuracy. Check if values are reasonable and consistent.

Extracted Data:
${JSON.stringify(extractionResult.output, null, 2)}

Provide:
1. Validation score (0-100)
2. List of any data quality issues
3. Recommendations for improvement`,
          response_json_schema: {
            type: 'object',
            properties: {
              validation_score: { type: 'number' },
              issues: { type: 'array', items: { type: 'string' } },
              recommendations: { type: 'array', items: { type: 'string' } }
            }
          }
        });

        onDataExtracted?.({
          file_url,
          extracted_data: extractionResult.output,
          validation: validation
        });
      } else {
        toast.error('Data extraction failed: ' + extractionResult.details);
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to process document: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#86b027]" />
          AI Document Processor (OCR + Extraction)
        </CardTitle>
        <p className="text-sm text-slate-600">Upload sustainability reports, invoices, or data sheets for automatic extraction</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <Input
            type="file"
            onChange={handleFileUpload}
            accept=".pdf,.csv,.xlsx,.png,.jpg,.jpeg"
            className="max-w-xs mx-auto"
            disabled={isProcessing}
          />
          <p className="text-xs text-slate-500 mt-2">Supported: PDF, CSV, Excel, Images</p>
        </div>

        {isProcessing && (
          <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-lg">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700">Processing document with AI/OCR...</span>
          </div>
        )}

        {extractedData && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h4 className="font-bold text-emerald-900">Data Extracted Successfully</h4>
            </div>
            <div className="space-y-2 text-sm">
              {extractedData.metrics?.map((metric, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="font-medium">{metric.metric_name}</span>
                  <span className="text-[#86b027] font-bold">{metric.value} {metric.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}