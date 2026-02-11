import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Upload, Users, Network, FileSpreadsheet, Plus, Loader2, 
  CheckCircle2, AlertCircle, Package, ArrowRight, Zap, Database, Eye
} from "lucide-react";
import { toast } from "sonner";
import { isCBAMScope, getCBAMCategory, getDefaultBenchmark, isEUCountry } from './constants.jsx';
import CNCodeAutocomplete from './CNCodeAutocomplete';
import CBAMDocumentViewer from './CBAMDocumentViewer';

export default function CBAMUnifiedImportHub() {
  const [activeTab, setActiveTab] = useState('supplylens');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedSKU, setSelectedSKU] = useState(null);
  const [formData, setFormData] = useState({
    cn_code: '',
    product_name: '',
    quantity_tonnes: '',
    emissions_intensity: '',
    import_date: new Date().toISOString().split('T')[0]
  });
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [processingStep, setProcessingStep] = useState('');
  const [importResults, setImportResults] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch data
  const { data: allSuppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  // REGULATORY COMPLIANCE: CBAM only applies to non-EU imports (Art. 2)
  const suppliers = allSuppliers.filter(s => !isEUCountry(s.country));

  const { data: allSKUs = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  // Filter to CBAM scope products and non-EU suppliers only
  const skus = allSKUs.filter(sku => 
    isCBAMScope(sku.hs_code || sku.cn_code) && 
    (!sku.supplier_id || suppliers.some(s => s.id === sku.supplier_id))
  );

  const { data: supplierPCFs = [] } = useQuery({
    queryKey: ['supplier-pcfs'],
    queryFn: () => base44.entities.SupplierPCF.list()
  });

  const { data: precursors = [] } = useQuery({
    queryKey: ['cbam-precursors'],
    queryFn: () => base44.entities.CBAMPrecursor.list()
  });

  // CBAM scope products from non-EU suppliers only
  const cbamSKUs = skus;
  const suppliersWithPCF = suppliers.filter(s => 
    supplierPCFs.some(pcf => pcf.supplier_id === s.id)
  );

  // Count EU suppliers excluded for compliance
  const euSuppliersCount = allSuppliers.length - suppliers.length;

  // Bulk sync from SupplyLens
  const syncFromSupplyLensMutation = useMutation({
    mutationFn: async () => {
      if (cbamSKUs.length === 0) {
        throw new Error('No CBAM-scope SKUs found in SupplyLens');
      }

      const entriesToCreate = [];
      
      for (const sku of cbamSKUs) {
        const supplier = suppliers.find(s => s.id === sku.supplier_id);
        if (!supplier) continue;

        const pcf = supplierPCFs.find(p => p.supplier_id === supplier.id && p.cn_code === (sku.hs_code || sku.cn_code));
        const cnCode = sku.hs_code || sku.cn_code;
        
        // Calculate with precursor mapping or PCF data
        const precursor = precursors.find(p => p.final_product_cn === cnCode);
        // Use country-specific default for 2026+
        const intensity = pcf?.emissions_intensity || 
          precursor?.emissions_intensity_factor || 
          getDefaultBenchmark(cnCode, supplier.country, 2026);
        const quantity = Math.random() * 500 + 100; // Demo quantity - replace with actual PO data
        
        entriesToCreate.push({
          supplier_id: supplier.id,
          sku_id: sku.id,
          cn_code: cnCode,
          product_name: sku.product_name || sku.sku_name,
          country_of_origin: supplier.country,
          quantity: quantity,
          direct_emissions_specific: intensity,
          indirect_emissions_specific: 0,
          total_embedded_emissions: quantity * intensity,
          import_date: new Date().toISOString().split('T')[0],
          calculation_method: pcf ? 'EU_method' : 'Default_values',
          data_quality_rating: pcf ? 'high' : 'medium',
          validation_status: 'pending',
          source: 'SupplyLens Bulk Import'
        });
      }

      // Bulk create entries
      const createdEntries = [];
      for (const entry of entriesToCreate) {
        const created = await base44.entities.CBAMEmissionEntry.create(entry);
        createdEntries.push(created);
      }

      return { count: createdEntries.length, entries: createdEntries };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
      toast.success(`✅ Successfully imported ${result.count} CBAM entries from SupplyLens`);
    },
    onError: (error) => {
      console.error('SupplyLens sync error:', error);
      toast.error(`Error: ${error.message || 'Failed to sync from SupplyLens'}`);
    }
  });

  // File selection handler
  const handleFileSelect = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setExtractedData(null);
    setImportResults(null);
    setProcessingStep('');
  };

  // File processing handler
  const processFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setExtractedData(null);
    setImportResults(null);
    setProcessingStep('uploading');
    
    try {
      // Step 1: Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedFileUrl(file_url);
      setProcessingStep('uploaded');
      
      // Allow viewing before extraction
      toast.success('File uploaded - you can view it now or proceed with extraction');
      return;
    } catch (error) {
      console.error('File upload error:', error);
      toast.error(`❌ Error: ${error.message || 'Failed to upload file'}`);
      setProcessingStep('error');
      setIsProcessing(false);
    }
  };

  // Start extraction after upload
  const startExtraction = async () => {
    if (!uploadedFileUrl) return;
    
    setIsProcessing(true);
    setProcessingStep('extracting');
    
    try {
      // Step 2: AI extraction
      setProcessingStep('extracting');
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: {
          type: "object",
          properties: {
            entries: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  cn_code: { type: "string" },
                  product_name: { type: "string" },
                  country_of_origin: { type: "string" },
                  quantity_tonnes: { type: "number" },
                  emissions_intensity: { type: "number" },
                  import_date: { type: "string" },
                  supplier_name: { type: "string" }
                }
              }
            }
          }
        }
      });

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadedFileUrl,
        json_schema: {
          type: "object",
          properties: {
            entries: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  cn_code: { type: "string" },
                  product_name: { type: "string" },
                  country_of_origin: { type: "string" },
                  quantity_tonnes: { type: "number" },
                  emissions_intensity: { type: "number" },
                  import_date: { type: "string" },
                  supplier_name: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.status === 'success' && result.output?.entries) {
        const allEntries = result.output.entries;
        setExtractedData(allEntries);
        
        // Step 3: Filter CBAM scope and create entries
        setProcessingStep('importing');
        const cbamEntries = allEntries.filter(e => isCBAMScope(e.cn_code));
        
        let created = 0;
        const createdEntries = [];
        
        for (const entry of cbamEntries) {
          // Match supplier if possible
          const matchedSupplier = suppliers.find(s => 
            s.company_name?.toLowerCase().includes(entry.supplier_name?.toLowerCase()) ||
            entry.supplier_name?.toLowerCase().includes(s.company_name?.toLowerCase())
          );
          
          const intensity = entry.emissions_intensity || 
            getDefaultBenchmark(entry.cn_code, entry.country_of_origin, 2026);
          const quantity = entry.quantity_tonnes || 0;
          
          const newEntry = await base44.entities.CBAMEmissionEntry.create({
            supplier_id: matchedSupplier?.id,
            cn_code: entry.cn_code,
            product_name: entry.product_name,
            country_of_origin: entry.country_of_origin,
            quantity: quantity,
            direct_emissions_specific: intensity,
            indirect_emissions_specific: 0,
            total_embedded_emissions: quantity * intensity,
            import_date: entry.import_date || new Date().toISOString().split('T')[0],
            calculation_method: entry.emissions_intensity ? 'EU_method' : 'Default_values',
            source: 'AI File Upload',
            validation_status: 'pending',
            data_quality_rating: entry.emissions_intensity ? 'high' : 'medium'
          });
          
          createdEntries.push(newEntry);
          created++;
        }

        queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
        
        setImportResults({
          total: allEntries.length,
          imported: created,
          entries: createdEntries
        });
        
        setProcessingStep('complete');
        
        if (created > 0) {
          toast.success(`✅ Successfully imported ${created} CBAM entries!`);
        } else {
          toast.warning(`⚠️ Extracted ${allEntries.length} entries but none were CBAM products`);
        }
      } else {
        toast.error('❌ AI could not extract data from file. Please check file format.');
        setProcessingStep('error');
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast.error(`❌ Error: ${error.message || 'Failed to process file'}`);
      setProcessingStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual entry
  const createManualEntryMutation = useMutation({
    mutationFn: async (data) => {
      const quantity = parseFloat(data.quantity);
      const country = selectedSupplier?.country || data.country_of_origin || 'Other';
      const intensity = parseFloat(data.emissions_intensity) || 
        getDefaultBenchmark(data.cn_code, country, 2026);
      const totalEmissions = quantity * intensity;
      
      return await base44.entities.CBAMEmissionEntry.create({
        supplier_id: selectedSupplier?.id,
        sku_id: selectedSKU?.id,
        cn_code: data.cn_code,
        product_name: data.product_name,
        country_of_origin: selectedSupplier?.country || data.country_of_origin,
        quantity: quantity,
        embedded_emissions_factor: intensity,
        total_embedded_emissions: totalEmissions,
        import_date: data.import_date,
        source: 'Manual Entry',
        validation_status: 'pending',
        data_quality_rating: data.emissions_intensity ? 'high' : 'medium'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
      toast.success('✅ CBAM entry created successfully');
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error creating entry: ${error.message || 'Unknown error'}`);
    }
  });

  const resetForm = () => {
    setSelectedSupplier(null);
    setSelectedSKU(null);
    setFormData({
      cn_code: '',
      product_name: '',
      quantity_tonnes: '',
      emissions_intensity: '',
      import_date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Unified CBAM Import Hub</h2>
          <p className="text-sm text-slate-500 mt-1">Import CBAM data from multiple sources</p>
        </div>
        {euSuppliersCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {euSuppliersCount} EU supplier{euSuppliersCount > 1 ? 's' : ''} auto-excluded
          </Badge>
        )}
      </div>

      {/* Quick Stats - Simplified */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-[#86b027]/20 bg-gradient-to-br from-white to-[#86b027]/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Non-EU Suppliers</p>
                <p className="text-2xl font-bold text-slate-900">{suppliersWithPCF.length}</p>
              </div>
              <Users className="w-8 h-8 text-[#86b027]/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#02a1e8]/20 bg-gradient-to-br from-white to-[#02a1e8]/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">CBAM Products</p>
                <p className="text-2xl font-bold text-slate-900">{cbamSKUs.length}</p>
              </div>
              <Package className="w-8 h-8 text-[#02a1e8]/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-gradient-to-br from-white to-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Precursor Mappings</p>
                <p className="text-2xl font-bold text-slate-900">{precursors.length}</p>
              </div>
              <Network className="w-8 h-8 text-purple-400/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Methods */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="supplylens">
            <Network className="w-4 h-4 mr-2" />
            SupplyLens Sync
          </TabsTrigger>
          <TabsTrigger value="file">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            File Upload
          </TabsTrigger>
          <TabsTrigger value="manual">
            <Plus className="w-4 h-4 mr-2" />
            Manual Entry
          </TabsTrigger>
        </TabsList>

        {/* SupplyLens Bulk Import */}
        <TabsContent value="supplylens" className="space-y-4">
          <Card className="border-[#86b027]/20">
            <CardContent className="p-6">
              {cbamSKUs.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="font-semibold text-slate-700 mb-2">No CBAM Products in SupplyLens</p>
                  <p className="text-sm text-slate-500">Import products with CBAM CN codes to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div>
                      <h3 className="font-bold text-slate-900">Ready to Import</h3>
                      <p className="text-sm text-slate-500">{cbamSKUs.length} CBAM products from {suppliersWithPCF.length} suppliers</p>
                    </div>
                    <Button 
                      onClick={() => syncFromSupplyLensMutation.mutate()}
                      disabled={syncFromSupplyLensMutation.isPending}
                      className="bg-[#86b027] hover:bg-[#769c22]"
                      size="lg"
                    >
                      {syncFromSupplyLensMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Import All
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {suppliersWithPCF.map(supplier => {
                      const supplierSKUs = cbamSKUs.filter(s => s.supplier_id === supplier.id);
                      const pcf = supplierPCFs.find(p => p.supplier_id === supplier.id);
                      
                      return (
                        <div key={supplier.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span className="font-medium text-slate-900">{supplier.company_name}</span>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs text-slate-500">{supplier.country}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{supplierSKUs.length} SKUs</Badge>
                              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                                {pcf?.emissions_intensity || 'Default'} tCO2/t
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* File Upload */}
        <TabsContent value="file" className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center hover:border-[#86b027] transition-colors">
                <Upload className="w-14 h-14 mx-auto mb-4 text-slate-400" />
                <h3 className="font-semibold text-slate-900 mb-2">Upload Document</h3>
                <p className="text-sm text-slate-500 mb-4">
                  AI extracts CBAM data from invoices, customs docs, or spreadsheets
                </p>
                <label className="inline-block">
                  <Input
                    type="file"
                    accept=".pdf,.csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="max-w-xs mx-auto cursor-pointer"
                    disabled={isProcessing}
                  />
                </label>
                {file && !isProcessing && !importResults && !uploadedFileUrl && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-white/60 backdrop-blur-md border border-slate-200/40 rounded-lg p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                      <div className="flex items-center gap-2 text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#86b027]" />
                        <span className="text-xs font-medium">{file.name}</span>
                      </div>
                    </div>
                    <Button 
                      onClick={processFile}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white h-9 text-sm font-medium shadow-sm"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File
                    </Button>
                  </div>
                )}
                
                {uploadedFileUrl && !isProcessing && !importResults && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-white/60 backdrop-blur-md border border-slate-200/40 rounded-lg p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#86b027]" />
                          <span className="text-xs font-medium">{file?.name}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setViewingDocument({
                              file_name: file?.name || 'Document',
                              file_url: uploadedFileUrl,
                              file_type: file?.type || 'PDF',
                              size: file?.size,
                              extracted_fields: extractedData?.[0] || {},
                              created_date: new Date().toISOString()
                            });
                            setIsDocViewerOpen(true);
                          }}
                          className="h-7 px-2 text-xs"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View Document
                        </Button>
                      </div>
                    </div>
                    <Button 
                      onClick={startExtraction}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white h-9 text-sm font-medium shadow-sm"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Extract & Import Data
                    </Button>
                  </div>
                )}
                {isProcessing && (
                  <div className="mt-4 bg-white/60 backdrop-blur-md border border-slate-200/40 rounded-lg p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center justify-center gap-2 text-slate-900 mb-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs font-medium">
                        {processingStep === 'uploading' && 'Uploading file...'}
                        {processingStep === 'extracting' && 'AI extracting data...'}
                        {processingStep === 'importing' && 'Creating CBAM entries...'}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${processingStep !== 'uploading' ? 'text-[#86b027]' : 'text-slate-300'}`} />
                        <span className={processingStep !== 'uploading' ? 'text-slate-700' : 'text-slate-500'}>File uploaded</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {processingStep === 'extracting' ? (
                          <Loader2 className="w-3.5 h-3.5 text-slate-700 animate-spin" />
                        ) : (
                          <CheckCircle2 className={`w-3.5 h-3.5 ${processingStep === 'importing' || processingStep === 'complete' ? 'text-[#86b027]' : 'text-slate-300'}`} />
                        )}
                        <span className={processingStep === 'importing' || processingStep === 'complete' ? 'text-slate-700' : 'text-slate-500'}>Data extracted</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {processingStep === 'importing' ? (
                          <Loader2 className="w-3.5 h-3.5 text-slate-700 animate-spin" />
                        ) : (
                          <CheckCircle2 className={`w-3.5 h-3.5 ${processingStep === 'complete' ? 'text-[#86b027]' : 'text-slate-300'}`} />
                        )}
                        <span className={processingStep === 'complete' ? 'text-slate-700' : 'text-slate-500'}>Entries created</span>
                      </div>
                    </div>
                  </div>
                )}
                </div>

              {importResults && (
                <div className="bg-white/60 backdrop-blur-md border border-slate-200/40 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.04)] mt-4">
                  <div className="p-4 border-b border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#86b027]" />
                      <h3 className="text-sm font-medium text-slate-900">Import Complete</h3>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/70 backdrop-blur-sm rounded-lg border border-slate-200/60 p-3">
                        <p className="text-xs text-slate-500 mb-0.5">Total Extracted</p>
                        <p className="text-xl font-semibold text-slate-900">{importResults.total}</p>
                      </div>
                      <div className="bg-white/70 backdrop-blur-sm rounded-lg border border-slate-200/60 p-3">
                        <p className="text-xs text-slate-500 mb-0.5">CBAM Entries Created</p>
                        <p className="text-xl font-semibold text-[#86b027]">{importResults.imported}</p>
                      </div>
                    </div>

                    {importResults.entries.length > 0 && (
                      <>
                        <div className="border-t border-slate-200/60 pt-3">
                          <h4 className="text-xs font-medium text-slate-900 mb-2">Imported Entries</h4>
                          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                            {importResults.entries.map((entry, idx) => (
                              <div key={idx} className="bg-white/70 rounded-lg border border-slate-200/60 p-2.5 text-xs">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-medium text-slate-900">{entry.product_name}</span>
                                    <Badge variant="outline" className="ml-1.5 text-xs border-slate-200/80">CN: {entry.cn_code}</Badge>
                                  </div>
                                  <Badge className="bg-[#86b027] text-white text-xs border-0">
                                    {entry.quantity ? entry.quantity.toFixed(2) : '0.00'}t
                                  </Badge>
                                </div>
                                <p className="text-slate-600 mt-1">
                                  Emissions: {entry.direct_emissions_specific ? entry.direct_emissions_specific.toFixed(2) : 'N/A'} tCO2/t | 
                                  Origin: {entry.country_of_origin || 'N/A'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                        {uploadedFileUrl && (
                          <Button 
                            variant="outline"
                            onClick={(e) => {
                              e.preventDefault();
                              setViewingDocument({
                                file_name: file?.name || 'Document',
                                file_url: uploadedFileUrl,
                                file_type: file?.type,
                                size: file?.size,
                                extracted_fields: extractedData?.[0] || {},
                                extraction_confidence: 95
                              });
                              setIsDocViewerOpen(true);
                            }}
                            className="w-full border-slate-200/80 text-slate-700 hover:bg-slate-50 h-9 text-sm shadow-none"
                          >
                            <Eye className="w-3.5 h-3.5 mr-2" />
                            View Document
                          </Button>
                        )}
                        <Button 
                          onClick={() => {
                            setFile(null);
                            setExtractedData(null);
                            setImportResults(null);
                            setProcessingStep('');
                            setUploadedFileUrl(null);
                          }}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white h-9 text-sm shadow-sm"
                        >
                          Import Another File
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {extractedData && extractedData.length > 0 && !importResults && (
                <Card className="border-amber-200 bg-amber-50/30 mt-4">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      Extracted {extractedData.length} entries (0 CBAM scope)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-3">
                      No CBAM products found. Make sure your document contains Iron/Steel, Aluminium, Fertilizers, or other CBAM goods.
                    </p>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {extractedData.slice(0, 5).map((entry, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold">{entry.product_name || 'Unknown Product'}</span>
                              <Badge variant="outline" className="ml-2">CN: {entry.cn_code}</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Entry */}
        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-[#86b027]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-[#86b027]" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Create Manual Entry</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Manually enter CBAM import data for individual transactions
                </p>
                <Button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-[#86b027] hover:bg-[#769c22]"
                  size="lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Entry
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Manual Entry Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create CBAM Entry</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Select Supplier (Optional)</Label>
              <Select 
                value={selectedSupplier?.id || ''} 
                onValueChange={(id) => {
                  const supplier = suppliers.find(s => s.id === id);
                  setSelectedSupplier(supplier);
                  setFormData(prev => ({ ...prev, country_of_origin: supplier?.country || '' }));
                }}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.company_name} ({s.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSupplier && (
              <div>
                <Label>Select SKU (Optional)</Label>
                <Select 
                  value={selectedSKU?.id || ''} 
                  onValueChange={(id) => {
                    const sku = skus.find(s => s.id === id);
                    setSelectedSKU(sku);
                    setFormData(prev => ({
                      ...prev,
                      product_name: sku?.product_name || '',
                      cn_code: sku?.hs_code || sku?.cn_code || ''
                    }));
                  }}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select SKU..." />
                  </SelectTrigger>
                  <SelectContent>
                    {skus.filter(s => s.supplier_id === selectedSupplier.id).map(sku => (
                      <SelectItem key={sku.id} value={sku.id}>
                        {sku.product_name || sku.sku_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <CNCodeAutocomplete
                  value={formData.cn_code}
                  onChange={(code, description) => {
                    setFormData({
                      ...formData, 
                      cn_code: code || '',
                      product_name: (description && typeof description === 'string') ? description : formData.product_name
                    });
                  }}
                  label="CN Code"
                  required
                  placeholder="Type to search..."
                />
              </div>
              <div>
                <Label>Product Name *</Label>
                <Input
                  value={formData.product_name}
                  onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                  placeholder="e.g., Steel Products"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Quantity (tonnes) *</Label>
                <Input
                  type="number"
                  value={formData.quantity_tonnes}
                  onChange={(e) => setFormData({...formData, quantity_tonnes: e.target.value})}
                  placeholder="e.g., 1000"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Emissions Intensity (tCO2/t)</Label>
                <Input
                  type="number"
                  value={formData.emissions_intensity}
                  onChange={(e) => setFormData({...formData, emissions_intensity: e.target.value})}
                  placeholder="Optional - uses defaults"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Import Date *</Label>
                <Input
                  type="date"
                  value={formData.import_date}
                  onChange={(e) => setFormData({...formData, import_date: e.target.value})}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const finalData = {
                    ...formData,
                    quantity: parseFloat(formData.quantity_tonnes),
                    country_of_origin: selectedSupplier?.country || formData.country_of_origin || 'Unknown'
                  };
                  createManualEntryMutation.mutate(finalData);
                }}
                disabled={!formData.cn_code || !formData.quantity_tonnes || createManualEntryMutation.isPending}
                className="bg-[#86b027] hover:bg-[#769c22]"
              >
                {createManualEntryMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Create Entry
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Viewer Modal */}
      <CBAMDocumentViewer
        document={viewingDocument}
        open={isDocViewerOpen}
        onClose={() => {
          setIsDocViewerOpen(false);
          setViewingDocument(null);
        }}
      />
    </div>
  );
}