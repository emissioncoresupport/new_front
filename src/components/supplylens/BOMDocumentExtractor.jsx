import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, FileText, Image, CheckCircle2, XCircle, Sparkles, 
  Loader2, Download, Eye, ChevronRight, AlertCircle, Package
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function BOMDocumentExtractor({ suppliers }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const queryClient = useQueryClient();

  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  const { data: boms = [] } = useQuery({
    queryKey: ['boms'],
    queryFn: () => base44.entities.BillOfMaterials.list()
  });

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setIsUploading(true);
    setIsProcessing(true);

    try {
      // Step 1: Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      toast.info("Analyzing document with AI...");

      // Step 2: Extract BOM data using AI
      const prompt = `
        Analyze this Bill of Materials (BOM) document and extract structured component data.
        
        Look for:
        - Product assemblies and sub-assemblies
        - Individual components, parts, and materials
        - Part numbers, SKU codes, or item codes
        - Quantities required per unit
        - Units of measure (PCS, KG, M, etc.)
        - Material specifications (steel, plastic, aluminum, etc.)
        - Supplier names if mentioned
        - Technical specifications or descriptions
        
        Extract ALL components found in the document, even if some fields are missing.
        Be comprehensive - capture every line item you can identify.
        
        Return structured data with:
        - document_type: describe what type of BOM this is
        - product_name: main product if identifiable
        - total_components: count of components found
        - components: array of all extracted components with available details
      `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            document_type: { type: "string" },
            product_name: { type: "string" },
            total_components: { type: "number" },
            components: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  part_number: { type: "string" },
                  quantity: { type: "number" },
                  unit: { type: "string" },
                  material_type: { type: "string" },
                  supplier_name: { type: "string" },
                  specifications: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Step 3: AI-powered matching to existing SKUs
      const matchingPrompt = `
        Match the following extracted BOM components to existing SKUs in our database.
        
        Extracted Components:
        ${JSON.stringify(result.components)}
        
        Existing SKUs:
        ${JSON.stringify(skus.map(s => ({ id: s.id, code: s.sku_code, description: s.description })))}
        
        For each component, suggest the best matching SKU or recommend creating a new one.
        Return matches array with confidence scores.
      `;

      const matchResult = await base44.integrations.Core.InvokeLLM({
        prompt: matchingPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  component_name: { type: "string" },
                  suggested_sku_id: { type: "string" },
                  suggested_sku_code: { type: "string" },
                  confidence_score: { type: "number" },
                  action: { type: "string", enum: ["map_existing", "create_new"] },
                  reasoning: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Merge results
      const enrichedData = {
        ...result,
        file_url,
        file_name: file.name,
        components: result.components.map((comp, idx) => ({
          ...comp,
          match: matchResult.matches[idx] || null
        }))
      };

      setExtractedData(enrichedData);
      setShowReviewModal(true);
      toast.success(`Extracted ${result.total_components} components from document`);

    } catch (error) {
      console.error("Extraction failed:", error);
      toast.error("Failed to extract BOM data");
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!extractedData) return;

    try {
      toast.loading("Importing BOM data into Master Mapping...");

      const createdSKUs = [];
      const createdMappings = [];

      // Step 1: Create/map SKUs
      for (const comp of extractedData.components) {
        if (comp.match?.action === 'create_new') {
          const newSKU = await base44.entities.SKU.create({
            sku_code: comp.part_number || `BOM-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            description: comp.name,
            material_group: comp.material_type,
            unit_of_measure: comp.unit || 'PCS',
            category: 'Imported from BOM',
            status: 'active'
          });
          comp.finalSKUId = newSKU.id;
          createdSKUs.push(newSKU);
        } else {
          comp.finalSKUId = comp.match?.suggested_sku_id;
        }

        // Step 2: Auto-map to supplier if supplier name found in BOM
        if (comp.supplier_name) {
          const matchedSupplier = suppliers.find(s => 
            s.legal_name?.toLowerCase().includes(comp.supplier_name.toLowerCase()) ||
            s.trade_name?.toLowerCase().includes(comp.supplier_name.toLowerCase())
          );

          if (matchedSupplier && comp.finalSKUId) {
            try {
              const mapping = await base44.entities.SupplierSKUMapping.create({
                supplier_id: matchedSupplier.id,
                sku_id: comp.finalSKUId,
                relationship_type: 'manufacturer',
                mapping_confidence: 90,
                source_system: 'bom_extraction',
                annual_volume: comp.quantity || null
              });
              createdMappings.push(mapping);
            } catch (e) {
              console.warn("Mapping creation skipped (might already exist):", e);
            }
          }
        }
      }

      // Step 3: Create BOM relationships if product hierarchy detected
      // (This would require parent SKU identification - simplified for now)
      
      queryClient.invalidateQueries({ queryKey: ['skus'] });
      queryClient.invalidateQueries({ queryKey: ['boms'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-sku-mappings'] });
      
      toast.dismiss();
      toast.success(
        `✅ Imported: ${createdSKUs.length} new SKUs, ${createdMappings.length} supplier mappings`
      );
      setShowReviewModal(false);
      setExtractedData(null);

    } catch (error) {
      console.error("Import failed:", error);
      toast.dismiss();
      toast.error("Failed to import BOM data");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#545454] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            AI BOM Document Extractor
          </CardTitle>
          <CardDescription>
            Upload BOM documents (PDF, Excel, Images) and let AI extract component data automatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center hover:border-indigo-300 transition-colors">
            <input
              type="file"
              id="bom-upload"
              accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isProcessing}
            />
            <label htmlFor="bom-upload" className={cn(
              "cursor-pointer",
              isProcessing && "opacity-50 cursor-not-allowed"
            )}>
              {isProcessing ? (
                <>
                  <Loader2 className="w-12 h-12 text-indigo-500 mx-auto mb-4 animate-spin" />
                  <p className="text-lg font-semibold text-[#545454]">Analyzing Document...</p>
                  <p className="text-sm text-slate-500 mt-2">AI is extracting BOM data</p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-[#545454]">Upload BOM Document</p>
                  <p className="text-sm text-slate-500 mt-2">PDF, Excel, CSV, or Images</p>
                  <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                </>
              )}
            </label>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <FileText className="w-5 h-5 text-[#02a1e8]" />
              <div>
                <p className="text-xs font-bold text-slate-500">Supported</p>
                <p className="text-sm font-semibold text-[#545454]">PDF, Excel, CSV</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Image className="w-5 h-5 text-[#86b027]" />
              <div>
                <p className="text-xs font-bold text-slate-500">OCR Enabled</p>
                <p className="text-sm font-semibold text-[#545454]">Images & Scans</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <div>
                <p className="text-xs font-bold text-slate-500">AI Matching</p>
                <p className="text-sm font-semibold text-[#545454]">Auto SKU Map</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review & Import Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#545454] flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-[#86b027]" />
              Review Extracted BOM Data
            </DialogTitle>
          </DialogHeader>

          {extractedData && (
            <div className="space-y-6 py-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs font-bold text-slate-500 uppercase">Document</p>
                  <p className="font-semibold text-[#545454] truncate">{extractedData.file_name}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs font-bold text-slate-500 uppercase">Product</p>
                  <p className="font-semibold text-[#545454]">{extractedData.product_name || 'Unknown'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs font-bold text-slate-500 uppercase">Components</p>
                  <p className="font-semibold text-[#545454]">{extractedData.total_components}</p>
                </div>
              </div>

              {/* Components Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-3 text-xs font-bold text-[#545454] uppercase">Component</th>
                      <th className="text-center p-3 text-xs font-bold text-[#545454] uppercase">Part #</th>
                      <th className="text-center p-3 text-xs font-bold text-[#545454] uppercase">Qty</th>
                      <th className="text-left p-3 text-xs font-bold text-[#545454] uppercase">Material</th>
                      <th className="text-left p-3 text-xs font-bold text-[#545454] uppercase">AI Match</th>
                      <th className="text-center p-3 text-xs font-bold text-[#545454] uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {extractedData.components.map((comp, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3">
                          <p className="font-medium text-[#545454]">{comp.name}</p>
                          {comp.specifications && (
                            <p className="text-xs text-slate-500">{comp.specifications}</p>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="font-mono text-xs">
                            {comp.part_number || '—'}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-semibold">{comp.quantity}</span>
                          <span className="text-xs text-slate-500 ml-1">{comp.unit}</span>
                        </td>
                        <td className="p-3">
                          <Badge className="bg-slate-100 text-slate-700">
                            {comp.material_type || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {comp.match ? (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={cn(
                                  "text-xs",
                                  comp.match.confidence_score >= 80 
                                    ? "bg-emerald-100 text-emerald-700" 
                                    : "bg-amber-100 text-amber-700"
                                )}>
                                  {comp.match.confidence_score}% match
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-600">{comp.match.suggested_sku_code}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">No match</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {comp.match?.action === 'create_new' ? (
                            <Badge className="bg-indigo-100 text-indigo-700">
                              Create New
                            </Badge>
                          ) : (
                            <Badge className="bg-[#86b027]/10 text-[#86b027]">
                              Map Existing
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="outline" onClick={() => setShowReviewModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmImport}
                  className="bg-[#86b027] hover:bg-[#769c22] text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm & Import
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}