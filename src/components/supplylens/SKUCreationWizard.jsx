import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Upload, Plus, FileText, Database, Sparkles, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SKUCreationWizard({ open, onOpenChange, prefilledSupplier = null }) {
  const [method, setMethod] = useState('manual');
  const [formData, setFormData] = useState({
    sku_code: '',
    internal_name: '',
    description: '',
    category: '',
    supplier_id: prefilledSupplier || '',
    material_group: '',
    unit_of_measure: 'PCS',
    weight_kg: '',
    hs_code: '',
    device_category: 'not_applicable',
    intended_use: '',
    risk_class_indicator: 'not_applicable',
    cbam_relevant: false,
    pfas_content: false,
    pcf_co2e: '',
    recycled_content_percentage: ''
  });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [extracting, setExtracting] = useState(false);

  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  // Manual SKU creation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return await base44.entities.SKU.create({
        ...data,
        status: 'active'
      });
    },
    onSuccess: async (newSKU) => {
      // Create supplier-SKU mapping if supplier selected
      if (formData.supplier_id) {
        await base44.entities.SupplierSKUMapping.create({
          supplier_id: formData.supplier_id,
          sku_id: newSKU.id,
          relationship_type: 'manufacturer',
          is_primary_supplier: true,
          mapping_confidence: 100,
          source_system: 'MANUAL_ENTRY'
        });
      }

      queryClient.invalidateQueries(['skus']);
      queryClient.invalidateQueries(['supplier-sku-mappings']);
      toast.success('SKU created successfully');
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create SKU: ${error.message}`);
    }
  });

  // Datasheet/Catalog extraction
  const extractMutation = useMutation({
    mutationFn: async (file) => {
      setExtracting(true);
      
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract SKU data using LLM
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract product/SKU information from this datasheet or product catalog. 
        
Extract ALL products/SKUs found in the document, including:
- SKU/part/catalog number
- Product name/description
- Technical specifications (weight, dimensions, materials)
- Supplier/manufacturer name if mentioned
- HS code if available
- Material composition
- Intended use or application
- Any compliance information (medical device class, certifications, etc.)
- Sustainability data (recycled content, carbon footprint)

For each product, provide confidence score (0-1) on data quality.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            products: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  sku_code: { type: "string" },
                  internal_name: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  supplier_name: { type: "string" },
                  material_group: { type: "string" },
                  weight_kg: { type: "number" },
                  hs_code: { type: "string" },
                  device_category: { type: "string" },
                  intended_use: { type: "string" },
                  risk_class_indicator: { type: "string" },
                  material_composition: { type: "array" },
                  recycled_content_percentage: { type: "number" },
                  confidence_score: { type: "number" }
                }
              }
            },
            document_type: { type: "string" },
            supplier_detected: { type: "string" }
          }
        }
      });

      setExtracting(false);
      return result;
    },
    onSuccess: (data) => {
      setExtractedData(data);
      toast.success(`Extracted ${data.products.length} product(s) from document`);
    },
    onError: (error) => {
      setExtracting(false);
      toast.error(`Extraction failed: ${error.message}`);
    }
  });

  // Bulk create from extracted data
  const bulkCreateMutation = useMutation({
    mutationFn: async (products) => {
      const created = [];
      const failed = [];

      for (const product of products) {
        try {
          // Find or suggest supplier
          let supplierId = formData.supplier_id;
          
          if (!supplierId && product.supplier_name) {
            // Try to match existing supplier
            const match = suppliers.find(s => 
              s.legal_name?.toLowerCase().includes(product.supplier_name.toLowerCase()) ||
              s.trade_name?.toLowerCase().includes(product.supplier_name.toLowerCase())
            );
            supplierId = match?.id;
          }

          // Create SKU
          const sku = await base44.entities.SKU.create({
            sku_code: product.sku_code || `AUTO-${Date.now()}`,
            internal_name: product.internal_name,
            description: product.description,
            category: product.category || 'General',
            material_group: product.material_group,
            unit_of_measure: 'PCS',
            weight_kg: product.weight_kg,
            hs_code: product.hs_code,
            device_category: product.device_category || 'not_applicable',
            intended_use: product.intended_use,
            risk_class_indicator: product.risk_class_indicator || 'not_applicable',
            material_composition: product.material_composition,
            recycled_content_percentage: product.recycled_content_percentage,
            status: 'active'
          });

          // Create supplier mapping if supplier identified
          if (supplierId) {
            await base44.entities.SupplierSKUMapping.create({
              supplier_id: supplierId,
              sku_id: sku.id,
              relationship_type: 'manufacturer',
              is_primary_supplier: true,
              mapping_confidence: Math.round(product.confidence_score * 100),
              source_system: 'DATASHEET_EXTRACTION'
            });
          }

          created.push({ sku, confidence: product.confidence_score });
        } catch (error) {
          failed.push({ product, error: error.message });
        }
      }

      return { created, failed };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['skus']);
      queryClient.invalidateQueries(['supplier-sku-mappings']);
      toast.success(`Created ${result.created.length} SKU(s), ${result.failed.length} failed`);
      onOpenChange(false);
      resetForm();
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      extractMutation.mutate(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const resetForm = () => {
    setFormData({
      sku_code: '',
      internal_name: '',
      description: '',
      category: '',
      supplier_id: prefilledSupplier || '',
      material_group: '',
      unit_of_measure: 'PCS',
      weight_kg: '',
      hs_code: '',
      device_category: 'not_applicable',
      intended_use: '',
      risk_class_indicator: 'not_applicable',
      cbam_relevant: false,
      pfas_content: false,
      pcf_co2e: '',
      recycled_content_percentage: ''
    });
    setUploadedFile(null);
    setExtractedData(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create SKU / Product</DialogTitle>
        </DialogHeader>

        <Tabs value={method} onValueChange={setMethod}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="manual">
              <Plus className="w-4 h-4 mr-2" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="datasheet">
              <FileText className="w-4 h-4 mr-2" />
              Datasheet/Catalog
            </TabsTrigger>
            <TabsTrigger value="erp">
              <Database className="w-4 h-4 mr-2" />
              ERP Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SKU Code *</Label>
                  <Input
                    value={formData.sku_code}
                    onChange={(e) => setFormData({ ...formData, sku_code: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Product Name *</Label>
                  <Input
                    value={formData.internal_name}
                    onChange={(e) => setFormData({ ...formData, internal_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Supplier</Label>
                  <Select
                    value={formData.supplier_id}
                    onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
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
                <div>
                  <Label>Category</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={formData.weight_kg}
                    onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                  />
                </div>
                <div>
                  <Label>HS Code</Label>
                  <Input
                    value={formData.hs_code}
                    onChange={(e) => setFormData({ ...formData, hs_code: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Material Group</Label>
                  <Input
                    value={formData.material_group}
                    onChange={(e) => setFormData({ ...formData, material_group: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                <h4 className="font-semibold text-sm">Medical Device Classification</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Device Category</Label>
                    <Select
                      value={formData.device_category}
                      onValueChange={(value) => setFormData({ ...formData, device_category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_applicable">Not a Medical Device</SelectItem>
                        <SelectItem value="medical_device">Medical Device</SelectItem>
                        <SelectItem value="ivd">IVD</SelectItem>
                        <SelectItem value="active_implantable">Active Implantable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Risk Class</Label>
                    <Select
                      value={formData.risk_class_indicator}
                      onValueChange={(value) => setFormData({ ...formData, risk_class_indicator: value })}
                      disabled={formData.device_category === 'not_applicable'}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_applicable">N/A</SelectItem>
                        <SelectItem value="Class I">Class I</SelectItem>
                        <SelectItem value="Class IIa">Class IIa</SelectItem>
                        <SelectItem value="Class IIb">Class IIb</SelectItem>
                        <SelectItem value="Class III">Class III</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formData.device_category !== 'not_applicable' && (
                  <div>
                    <Label>Intended Use</Label>
                    <Textarea
                      value={formData.intended_use}
                      onChange={(e) => setFormData({ ...formData, intended_use: e.target.value })}
                      rows={2}
                      placeholder="Describe the medical device's intended purpose..."
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-[#86b027]">
                  {createMutation.isPending ? 'Creating...' : 'Create SKU'}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="datasheet" className="space-y-4 mt-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Upload Product Datasheet or Catalog</h3>
              <p className="text-sm text-slate-600 mb-4">
                Supports PDF, Excel, Word documents. AI will extract SKU details automatically.
              </p>
              <input
                type="file"
                accept=".pdf,.xlsx,.xls,.docx,.doc"
                onChange={handleFileUpload}
                className="hidden"
                id="datasheet-upload"
              />
              <label htmlFor="datasheet-upload">
                <Button type="button" variant="outline" asChild>
                  <span>Select File</span>
                </Button>
              </label>
            </div>

            {extracting && (
              <div className="flex items-center justify-center gap-3 p-6 bg-blue-50 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-sm text-blue-700">Extracting product data from document...</span>
              </div>
            )}

            {extractedData && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-emerald-900">
                      Extracted {extractedData.products.length} product(s)
                    </span>
                  </div>
                  <Badge className="bg-emerald-600">
                    {extractedData.document_type}
                  </Badge>
                </div>

                {extractedData.supplier_detected && !formData.supplier_id && (
                  <div className="p-4 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <strong>Detected supplier:</strong> {extractedData.supplier_detected}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Select supplier from dropdown above to link these products
                    </p>
                  </div>
                )}

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {extractedData.products.map((product, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{product.internal_name}</h4>
                          <p className="text-xs text-slate-500">{product.sku_code}</p>
                        </div>
                        <Badge variant="outline" className={
                          product.confidence_score > 0.8 ? 'border-emerald-500 text-emerald-700' :
                          product.confidence_score > 0.5 ? 'border-amber-500 text-amber-700' :
                          'border-rose-500 text-rose-700'
                        }>
                          {Math.round(product.confidence_score * 100)}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{product.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {product.weight_kg && <Badge variant="outline">Weight: {product.weight_kg}kg</Badge>}
                        {product.hs_code && <Badge variant="outline">HS: {product.hs_code}</Badge>}
                        {product.device_category && product.device_category !== 'not_applicable' && (
                          <Badge className="bg-blue-100 text-blue-800">{product.device_category}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setExtractedData(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => bulkCreateMutation.mutate(extractedData.products)}
                    disabled={bulkCreateMutation.isPending}
                    className="bg-[#86b027]"
                  >
                    {bulkCreateMutation.isPending ? 'Creating...' : `Create ${extractedData.products.length} SKU(s)`}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="erp" className="space-y-4 mt-4">
            <div className="p-8 text-center border-2 border-dashed rounded-lg">
              <Database className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">ERP Integration</h3>
              <p className="text-sm text-slate-600 mb-4">
                Configure ERP connections in Integration Hub to sync products automatically
              </p>
              <Button variant="outline" onClick={() => window.location.href = '/IntegrationHub'}>
                Go to Integration Hub
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}