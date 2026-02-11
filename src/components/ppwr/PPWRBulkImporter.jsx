import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function PPWRBulkImporter({ open, onOpenChange }) {
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (data) => {
      const results = await base44.entities.PPWRPackaging.bulkCreate(data);
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['ppwr-packaging'] });
      toast.success(`Successfully imported ${results.length} packaging items`);
      onOpenChange(false);
      setFile(null);
      setAnalysisResult(null);
    }
  });

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    setIsAnalyzing(true);

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadedFile });

      // AI extraction
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              packaging_name: { type: "string" },
              sku_code: { type: "string" },
              material_category: { type: "string" },
              total_weight_kg: { type: "number" },
              recycled_content_percentage: { type: "number" },
              is_reusable: { type: "boolean" },
              recyclability_score: { type: "number" },
              empty_space_ratio: { type: "number" }
            }
          }
        }
      });

      if (extracted.status === 'success') {
        // Calculate compliance status for each item
        const processedData = extracted.output.map(item => {
          const target = item.material_category === 'Plastic' || item.material_category === 'PET' ? 30 : 0;
          let compliance_status = 'Compliant';
          
          if (target > 0 && (item.recycled_content_percentage || 0) < target) {
            compliance_status = 'Non-Compliant';
          }
          
          return {
            ...item,
            compliance_status,
            recycled_content_target: target,
            packaging_type: 'Primary',
            design_optimized: false,
            epr_reported: false
          };
        });

        setAnalysisResult({
          success: true,
          data: processedData,
          count: processedData.length
        });
        toast.success(`AI extracted ${processedData.length} packaging items`);
      } else {
        throw new Error(extracted.details || 'Extraction failed');
      }
    } catch (error) {
      toast.error("Failed to analyze file: " + error.message);
      setAnalysisResult({ success: false, error: error.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImport = () => {
    if (analysisResult?.data) {
      importMutation.mutate(analysisResult.data);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `packaging_name,sku_code,material_category,total_weight_kg,recycled_content_percentage,is_reusable,recyclability_score,empty_space_ratio
Primary Box,PKG-001,Plastic,0.5,25,FALSE,7,35
Shipping Carton,PKG-002,Paper/Cardboard,1.2,50,TRUE,9,20`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ppwr_packaging_template.csv';
    a.click();
    toast.success("Template downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Packaging Data</DialogTitle>
          <DialogDescription>
            Upload CSV/Excel file with packaging details. AI will extract and validate data automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!file && (
            <>
              <Card className="border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                <CardContent className="p-8 text-center relative">
                  <input 
                    type="file" 
                    onChange={handleFileUpload}
                    accept=".csv,.xlsx,.xls"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-slate-700 mb-2">Upload Packaging Data</p>
                  <p className="text-sm text-slate-500">CSV or Excel file (.csv, .xlsx)</p>
                </CardContent>
              </Card>

              <Button onClick={downloadTemplate} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
              </Button>
            </>
          )}

          {isAnalyzing && (
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
                <p className="text-lg font-semibold text-slate-700 mb-2">AI Analyzing File...</p>
                <p className="text-sm text-slate-500">Extracting and validating packaging data</p>
              </CardContent>
            </Card>
          )}

          {analysisResult && !isAnalyzing && (
            <Card className={analysisResult.success ? 'border-emerald-200 bg-emerald-50/30' : 'border-rose-200 bg-rose-50/30'}>
              <CardContent className="p-6">
                {analysisResult.success ? (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                      <div>
                        <p className="font-bold text-emerald-900">Analysis Complete</p>
                        <p className="text-sm text-emerald-700">{analysisResult.count} packaging items ready to import</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {analysisResult.data.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white rounded border border-emerald-200">
                          <div>
                            <p className="font-medium text-sm">{item.packaging_name}</p>
                            <p className="text-xs text-slate-500">{item.material_category} • {item.recycled_content_percentage}% PCR</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${item.compliance_status === 'Compliant' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {item.compliance_status}
                          </span>
                        </div>
                      ))}
                      {analysisResult.count > 3 && (
                        <p className="text-xs text-slate-500 text-center">+ {analysisResult.count - 3} more items</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleImport} className="flex-1 bg-emerald-500 hover:bg-emerald-600" disabled={importMutation.isPending}>
                        {importMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Import {analysisResult.count} Items
                      </Button>
                      <Button onClick={() => { setFile(null); setAnalysisResult(null); }} variant="outline">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <AlertCircle className="w-8 h-8 text-rose-600" />
                      <div>
                        <p className="font-bold text-rose-900">Analysis Failed</p>
                        <p className="text-sm text-rose-700">{analysisResult.error}</p>
                      </div>
                    </div>
                    <Button onClick={() => { setFile(null); setAnalysisResult(null); }} variant="outline" className="w-full">
                      Try Again
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}