import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Upload, Loader2, FileText, Sparkles, CheckCircle2, Package } from "lucide-react";
import { toast } from "sonner";

export default function DatasheetProductExtractor({ open, onOpenChange, onProductCreated }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [productData, setProductData] = useState({
    name: '',
    sku: '',
    category: '',
    weight_kg: '',
    manufacturer: '',
    description: ''
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const createProductMutation = useMutation({
    mutationFn: async (data) => {
      const product = await base44.entities.Product.create(data);
      
      // Store the datasheet as evidence
      if (selectedFile) {
        const fileResult = await base44.integrations.Core.UploadFile({ file: selectedFile });
        await base44.entities.DPPEvidence.create({
          product_id: product.id,
          evidence_type: 'supplier_declaration',
          file_url: fileResult.file_url,
          file_name: selectedFile.name,
          file_size_kb: Math.round(selectedFile.size / 1024),
          uploaded_by: user?.email || 'system',
          upload_date: new Date().toISOString(),
          linked_to_field: 'general_info',
          extracted_data: extractedData,
          verification_status: 'pending'
        });
      }
      
      return product;
    },
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: ['products-dpp'] });
      toast.success('Product created with datasheet evidence!');
      onProductCreated?.(newProduct);
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to create product');
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleExtract = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setIsExtracting(true);
    const uploadToast = toast.loading('Uploading and analyzing datasheet with AI...');

    try {
      // Upload file first
      const uploadResult = await base44.integrations.Core.UploadFile({ file: selectedFile });
      
      // Extract data using AI
      const extractionResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this technical datasheet and extract product information.
        
Extract:
- Product name/model
- SKU or part number
- Category (Electronics, Textile, Furniture, etc.)
- Weight in kg
- Manufacturer name
- Brief description
- Materials used (if mentioned)
- Sustainability data (carbon footprint, recycled content, etc.)

Return structured JSON with all available information.`,
        file_urls: [uploadResult.file_url],
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            sku: { type: "string" },
            category: { type: "string" },
            weight_kg: { type: "number" },
            manufacturer: { type: "string" },
            description: { type: "string" },
            materials: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  material_name: { type: "string" },
                  percentage: { type: "number" }
                }
              }
            },
            sustainability: {
              type: "object",
              properties: {
                carbon_footprint_kg: { type: "number" },
                recycled_content: { type: "number" }
              }
            }
          }
        }
      });

      toast.dismiss(uploadToast);
      
      if (extractionResult) {
        setExtractedData(extractionResult);
        setProductData({
          name: extractionResult.name || '',
          sku: extractionResult.sku || '',
          category: extractionResult.category || '',
          weight_kg: extractionResult.weight_kg?.toString() || '',
          manufacturer: extractionResult.manufacturer || '',
          description: extractionResult.description || ''
        });
        toast.success('Data extracted successfully!');
      }
    } catch (error) {
      toast.dismiss(uploadToast);
      toast.error('Failed to extract data from datasheet');
      console.error(error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCreate = () => {
    if (!productData.name || !productData.sku) {
      toast.error('Product name and SKU are required');
      return;
    }
    createProductMutation.mutate(productData);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setExtractedData(null);
    setProductData({
      name: '',
      sku: '',
      category: '',
      weight_kg: '',
      manufacturer: '',
      description: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Create Product from Datasheet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert className="bg-blue-50 border-blue-200">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900 text-sm">
              Upload a technical datasheet (PDF, image) and AI will extract product information automatically
            </AlertDescription>
          </Alert>

          {/* File Upload */}
          <Card className="border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors">
            <CardContent className="p-6">
              <label htmlFor="datasheet-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-3 text-center">
                  {selectedFile ? (
                    <>
                      <FileText className="w-10 h-10 text-emerald-600" />
                      <div>
                        <p className="font-medium text-slate-900">{selectedFile.name}</p>
                        <p className="text-sm text-slate-500">{Math.round(selectedFile.size / 1024)} KB</p>
                      </div>
                      <Button 
                        type="button"
                        size="sm" 
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById('datasheet-upload').value = '';
                          setSelectedFile(null);
                        }}
                        variant="outline"
                      >
                        Change File
                      </Button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-900">Click to upload datasheet</p>
                        <p className="text-sm text-slate-500">PDF, PNG, JPG up to 10MB</p>
                      </div>
                    </>
                  )}
                </div>
                <input
                  id="datasheet-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                />
              </label>
            </CardContent>
          </Card>

          {selectedFile && !extractedData && (
            <Button 
              onClick={handleExtract} 
              disabled={isExtracting}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isExtracting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Extracting Data...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Extract with AI</>
              )}
            </Button>
          )}

          {extractedData && (
            <>
              <Alert className="bg-emerald-50 border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <AlertDescription className="text-emerald-900 text-sm">
                  AI extracted product data successfully! Review and edit before creating.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Product Name *</Label>
                  <Input 
                    value={productData.name} 
                    onChange={(e) => setProductData({...productData, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>SKU *</Label>
                  <Input 
                    value={productData.sku} 
                    onChange={(e) => setProductData({...productData, sku: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select 
                    value={productData.category} 
                    onValueChange={(v) => setProductData({...productData, category: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Electronics">Electronics</SelectItem>
                      <SelectItem value="Textile & Apparel">Textile & Apparel</SelectItem>
                      <SelectItem value="Footwear">Footwear</SelectItem>
                      <SelectItem value="Furniture">Furniture</SelectItem>
                      <SelectItem value="EV Batteries">EV Batteries</SelectItem>
                      <SelectItem value="Packaging">Packaging</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Weight (kg)</Label>
                  <Input 
                    type="number"
                    value={productData.weight_kg} 
                    onChange={(e) => setProductData({...productData, weight_kg: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Manufacturer</Label>
                  <Input 
                    value={productData.manufacturer} 
                    onChange={(e) => setProductData({...productData, manufacturer: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <textarea
                    className="w-full p-2 border rounded-md text-sm"
                    rows="3"
                    value={productData.description}
                    onChange={(e) => setProductData({...productData, description: e.target.value})}
                  />
                </div>
              </div>

              {extractedData.materials && extractedData.materials.length > 0 && (
                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <h4 className="font-bold text-sm mb-2">Extracted Material Data</h4>
                    <div className="text-xs space-y-1">
                      {extractedData.materials.map((m, idx) => (
                        <p key={idx}>• {m.material_name}: {m.percentage}%</p>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">💡 This will be pre-filled in the DPP wizard</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {extractedData && (
            <Button 
              onClick={handleCreate}
              disabled={createProductMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {createProductMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...</>
              ) : (
                <><Package className="w-4 h-4 mr-2" /> Create Product & Continue</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}