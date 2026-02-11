import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Database, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function LCABulkImporter({ isOpen, onClose }) {
  const [importSource, setImportSource] = useState('file');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  const { data: supplierSKUMappings = [] } = useQuery({
    queryKey: ['supplier-sku-mappings'],
    queryFn: () => base44.entities.SupplierSKUMapping.list()
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadedFile(file);
    setIsProcessing(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              dataset_name: { type: "string" },
              process_name: { type: "string" },
              activity_type: { type: "string" },
              unit: { type: "string" },
              emission_factor_climate: { type: "number" },
              emission_factor_water: { type: "number" },
              emission_factor_acidification: { type: "number" },
              geographic_scope: { type: "string" },
              temporal_scope: { type: "string" },
              data_source_type: { type: "string" },
              temporal_representativeness: { type: "number" },
              geographical_representativeness: { type: "number" },
              technological_representativeness: { type: "number" },
              completeness_score: { type: "number" }
            }
          }
        }
      });

      if (extractionResult.status === 'error') {
        toast.error(extractionResult.details || 'Failed to extract data from file');
        setIsProcessing(false);
        return;
      }

      const datasets = Array.isArray(extractionResult.output) ? extractionResult.output : [];
      
      // Create datasets
      const created = await Promise.all(
        datasets.map(d => 
          base44.entities.LCACustomDataset.create({
            ...d,
            source_type: 'Manual Entry',
            version: '1.0',
            uploaded_file_url: file_url,
            validation_status: 'Pending',
            is_active: true
          })
        )
      );

      setImportResults({
        success: created.length,
        failed: datasets.length - created.length,
        datasets: created
      });

      queryClient.invalidateQueries({ queryKey: ['lca-custom-datasets'] });
      toast.success(`Imported ${created.length} datasets`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  };

  const importFromSupplyLens = async () => {
    setIsProcessing(true);
    try {
      const importedDatasets = [];
      
      for (const mapping of supplierSKUMappings) {
        const sku = skus.find(s => s.id === mapping.sku_id);
        const supplier = suppliers.find(s => s.id === mapping.supplier_id);
        
        if (!sku || !supplier) continue;

        const dataset = await base44.entities.LCACustomDataset.create({
          dataset_name: `${sku.sku_code} - ${supplier.legal_name}`,
          process_name: sku.description || sku.sku_code,
          activity_type: 'Material',
          unit: sku.unit_of_measure || 'kg',
          source_type: 'SupplyLens Import',
          supplier_id: supplier.id,
          sku_id: sku.id,
          geographic_scope: supplier.country,
          temporal_scope: new Date().getFullYear().toString(),
          data_source_type: 'Secondary',
          version: '1.0',
          validation_status: 'Pending',
          is_active: true,
          temporal_representativeness: 2,
          geographical_representativeness: 2,
          technological_representativeness: 3,
          completeness_score: 3
        });
        
        importedDatasets.push(dataset);
      }

      setImportResults({
        success: importedDatasets.length,
        failed: 0,
        datasets: importedDatasets
      });

      queryClient.invalidateQueries({ queryKey: ['lca-custom-datasets'] });
      toast.success(`Imported ${importedDatasets.length} datasets from SupplyLens`);
    } catch (error) {
      console.error('SupplyLens import error:', error);
      toast.error('Failed to import from SupplyLens');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Bulk Data Import
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Import Source</Label>
            <Select value={importSource} onValueChange={setImportSource}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="file">Upload File (CSV/Excel/PDF)</SelectItem>
                <SelectItem value="supplylens">Import from SupplyLens</SelectItem>
                <SelectItem value="erp">Import from ERP (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {importSource === 'file' && (
            <Card className="border-2 border-dashed border-slate-200 bg-slate-50">
              <CardContent className="p-6">
                <div className="text-center">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".csv,.xlsx,.xls,.pdf"
                    className="hidden"
                    id="file-upload"
                    disabled={isProcessing}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {isProcessing ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-3" />
                        <p className="font-medium text-slate-700">Processing file...</p>
                        <p className="text-xs text-slate-500 mt-1">Extracting LCA data with AI</p>
                      </div>
                    ) : uploadedFile ? (
                      <div className="flex flex-col items-center">
                        <FileText className="w-12 h-12 text-emerald-600 mb-3" />
                        <p className="font-medium text-slate-700">{uploadedFile.name}</p>
                        <p className="text-xs text-slate-500 mt-1">Click to change file</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-12 h-12 text-slate-400 mb-3" />
                        <p className="font-medium text-slate-700">Click to upload</p>
                        <p className="text-xs text-slate-500 mt-1">CSV, Excel, or PDF files supported</p>
                      </div>
                    )}
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {importSource === 'supplylens' && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Database className="w-8 h-8 text-blue-600 shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-bold text-blue-900 mb-1">Import from SupplyLens</h4>
                    <p className="text-sm text-blue-800 mb-3">
                      Import {supplierSKUMappings.length} SKU-Supplier mappings as LCA datasets
                    </p>
                    <Button 
                      onClick={importFromSupplyLens}
                      disabled={isProcessing}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Database className="w-4 h-4 mr-2" />
                          Import {supplierSKUMappings.length} Items
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {importResults && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-bold text-emerald-900">Import Complete</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-emerald-700">Successfully imported:</p>
                    <p className="text-2xl font-bold text-emerald-900">{importResults.success}</p>
                  </div>
                  {importResults.failed > 0 && (
                    <div>
                      <p className="text-sm text-amber-700">Failed:</p>
                      <p className="text-2xl font-bold text-amber-900">{importResults.failed}</p>
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline"
                  onClick={onClose}
                  className="w-full"
                >
                  Close
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}