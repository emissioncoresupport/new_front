import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import IngestionPipeline from './services/IngestionPipeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EUDAMEDBulkImporter({ open, onOpenChange, type }) {
  const [file, setFile] = useState(null);
  const [processingStatus, setProcessingStatus] = useState(null);
  const queryClient = useQueryClient();

  // Excel/CSV bulk import
  const bulkImportMutation = useMutation({
    mutationFn: async (file) => {
      toast.loading('Uploading and processing file...');
      
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Start ingestion batch
      const batch = await IngestionPipeline.startIngestionBatch(
        'BULK_IMPORT',
        `Bulk import ${type} from ${file.name}`
      );

      // Define schema based on type
      const schema = type === 'actors' ? {
        type: "array",
        items: {
          type: "object",
          properties: {
            legal_name: { type: "string" },
            operator_type: { type: "string", enum: ["manufacturer", "authorized_rep", "importer", "distributor"] },
            country: { type: "string" },
            vat_number: { type: "string" },
            eori_number: { type: "string" },
            address: { type: "string" },
            city: { type: "string" },
            postal_code: { type: "string" },
            primary_contact_email: { type: "string" }
          },
          required: ["legal_name", "operator_type", "country"]
        }
      } : {
        type: "array",
        items: {
          type: "object",
          properties: {
            model_name: { type: "string" },
            commercial_name: { type: "string" },
            udi_di: { type: "string" },
            catalog_number: { type: "string" },
            sterile: { type: "boolean" },
            single_use: { type: "boolean" }
          },
          required: ["model_name", "udi_di"]
        }
      };

      // Extract data from file
      const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: schema
      });

      if (extraction.status === 'error') {
        throw new Error(extraction.details);
      }

      // Process each record
      let successCount = 0;
      let failCount = 0;
      
      for (const record of extraction.output) {
        try {
          await IngestionPipeline.processBulkRecord(
            type === 'actors' ? 'EconomicOperator' : 'DeviceModel',
            record,
            batch.id,
            file_url
          );
          successCount++;
        } catch (error) {
          failCount++;
          console.error('Failed to process record:', error);
        }
      }

      await IngestionPipeline.completeIngestionBatch(batch.id, {
        successful_items: successCount,
        failed_items: failCount
      });

      return { batch, successCount, failCount, total: extraction.output.length };
    },
    onSuccess: (result) => {
      toast.dismiss();
      toast.success(`Imported ${result.successCount}/${result.total} records`);
      queryClient.invalidateQueries(['economic-operators']);
      queryClient.invalidateQueries(['device-models']);
      setProcessingStatus({ success: true, ...result });
      setFile(null);
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(`Import failed: ${error.message}`);
      setProcessingStatus({ success: false, error: error.message });
    }
  });

  // Document AI extraction
  const documentUploadMutation = useMutation({
    mutationFn: async (file) => {
      toast.loading('Analyzing document with AI...');
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const batch = await IngestionPipeline.startIngestionBatch(
        'DOCUMENT_UPLOAD',
        `AI extraction from ${file.name}`
      );

      const prompt = type === 'actors' 
        ? `Extract all economic operator/company information from this document. For each operator, extract: legal name, operator type (manufacturer/importer/distributor), country, VAT number, EORI number, address, city, postal code, primary contact email and phone. Return as structured JSON array.`
        : `Extract all medical device information from this document. For each device, extract: model name, commercial name, UDI-DI, catalog number, whether it's sterile, single use, and measuring function. Return as structured JSON array.`;

      const schema = type === 'actors' ? {
        type: "object",
        properties: {
          operators: {
            type: "array",
            items: {
              type: "object",
              properties: {
                legal_name: { type: "string" },
                operator_type: { type: "string" },
                country: { type: "string" },
                vat_number: { type: "string" },
                eori_number: { type: "string" },
                address: { type: "string" },
                city: { type: "string" },
                postal_code: { type: "string" },
                primary_contact_email: { type: "string" },
                confidence_score: { type: "number" }
              }
            }
          }
        }
      } : {
        type: "object",
        properties: {
          devices: {
            type: "array",
            items: {
              type: "object",
              properties: {
                model_name: { type: "string" },
                commercial_name: { type: "string" },
                udi_di: { type: "string" },
                catalog_number: { type: "string" },
                sterile: { type: "boolean" },
                single_use: { type: "boolean" },
                confidence_score: { type: "number" }
              }
            }
          }
        }
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [file_url],
        response_json_schema: schema
      });

      const records = type === 'actors' ? result.operators : result.devices;
      
      let successCount = 0;
      let failCount = 0;
      let reviewCount = 0;

      for (const record of records) {
        try {
          const needsReview = (record.confidence_score || 0) < 0.85;
          
          await IngestionPipeline.processBulkRecord(
            type === 'actors' ? 'EconomicOperator' : 'DeviceModel',
            record,
            batch.id,
            file_url,
            {
              extractionMethod: 'ai_assisted',
              confidenceScore: record.confidence_score,
              reviewStatus: needsReview ? 'proposed' : 'approved'
            }
          );
          
          if (needsReview) reviewCount++;
          successCount++;
        } catch (error) {
          failCount++;
        }
      }

      await IngestionPipeline.completeIngestionBatch(batch.id, {
        successful_items: successCount,
        failed_items: failCount
      });

      return { batch, successCount, failCount, reviewCount, total: records.length };
    },
    onSuccess: (result) => {
      toast.dismiss();
      toast.success(`Extracted ${result.successCount} records (${result.reviewCount} need review)`);
      queryClient.invalidateQueries(['economic-operators']);
      queryClient.invalidateQueries(['device-models']);
      setProcessingStatus({ success: true, ...result });
      setFile(null);
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(`Extraction failed: ${error.message}`);
      setProcessingStatus({ success: false, error: error.message });
    }
  });

  const handleFileUpload = (uploadedFile, method) => {
    setFile(uploadedFile);
    setProcessingStatus(null);
    
    if (method === 'bulk') {
      bulkImportMutation.mutate(uploadedFile);
    } else {
      documentUploadMutation.mutate(uploadedFile);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import {type === 'actors' ? 'Economic Operators' : 'Devices'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="bulk" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bulk">Excel/CSV Import</TabsTrigger>
            <TabsTrigger value="document">AI Document Extraction</TabsTrigger>
          </TabsList>

          <TabsContent value="bulk" className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg text-sm">
              <p className="font-semibold mb-2">Excel/CSV Format:</p>
              {type === 'actors' ? (
                <p className="text-slate-600">
                  Columns: <code className="bg-white px-1 rounded">legal_name, operator_type, country, vat_number, eori_number, address, city, postal_code, primary_contact_email</code>
                </p>
              ) : (
                <p className="text-slate-600">
                  Columns: <code className="bg-white px-1 rounded">model_name, commercial_name, udi_di, catalog_number, sterile, single_use</code>
                </p>
              )}
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <Label htmlFor="bulk-file" className="cursor-pointer">
                <div className="text-sm font-medium mb-1">Upload Excel or CSV file</div>
                <div className="text-xs text-slate-500">Supports .xlsx, .xls, .csv</div>
              </Label>
              <Input
                id="bulk-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleFileUpload(e.target.files[0], 'bulk')}
                className="hidden"
                disabled={bulkImportMutation.isPending}
              />
            </div>
          </TabsContent>

          <TabsContent value="document" className="space-y-4">
            <div className="p-4 bg-amber-50 rounded-lg text-sm">
              <p className="font-semibold mb-2">AI-Powered Document Extraction:</p>
              <p className="text-slate-600">
                Upload technical documentation, certificates, or regulatory filings. 
                AI will extract {type === 'actors' ? 'operator' : 'device'} information automatically.
                Low-confidence extractions will be flagged for manual review.
              </p>
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <Label htmlFor="doc-file" className="cursor-pointer">
                <div className="text-sm font-medium mb-1">Upload PDF Document</div>
                <div className="text-xs text-slate-500">AI will analyze and extract data</div>
              </Label>
              <Input
                id="doc-file"
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileUpload(e.target.files[0], 'document')}
                className="hidden"
                disabled={documentUploadMutation.isPending}
              />
            </div>
          </TabsContent>
        </Tabs>

        {(bulkImportMutation.isPending || documentUploadMutation.isPending) && (
          <div className="flex items-center justify-center p-8 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#86b027]" />
            <span>Processing...</span>
          </div>
        )}

        {processingStatus && (
          <div className={`p-4 rounded-lg ${processingStatus.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
            <div className="flex items-start gap-3">
              {processingStatus.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5" />
              )}
              <div className="flex-1">
                {processingStatus.success ? (
                  <>
                    <p className="font-semibold text-emerald-900">Import Successful</p>
                    <p className="text-sm text-emerald-700 mt-1">
                      Imported {processingStatus.successCount} of {processingStatus.total} records
                    </p>
                    {processingStatus.reviewCount > 0 && (
                      <p className="text-xs text-amber-700 mt-1">
                        ⚠️ {processingStatus.reviewCount} records flagged for manual review (low confidence)
                      </p>
                    )}
                    {processingStatus.failCount > 0 && (
                      <p className="text-xs text-rose-600 mt-1">
                        {processingStatus.failCount} records failed validation
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-rose-900">Import Failed</p>
                    <p className="text-sm text-rose-700">{processingStatus.error}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}