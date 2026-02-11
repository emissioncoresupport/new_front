import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

export default function ImportModal({ open, onOpenChange, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [importType, setImportType] = useState('suppliers');
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadedUrl(null);
      setResult(null);
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    
    try {
      // Upload file first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const schema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            legal_name: { type: "string" },
            trade_name: { type: "string" },
            vat_number: { type: "string" },
            country: { type: "string" },
            city: { type: "string" },
            address: { type: "string" },
            website: { type: "string" },
            tier: { type: "string" },
            nace_code: { type: "string" },
            email: { type: "string" }
          }
        }
      };

      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: schema
      });

      if (extractResult.status === 'success' && extractResult.output) {
        const suppliers = Array.isArray(extractResult.output) ? extractResult.output : [extractResult.output];
        
        // Get current user for company_id
        const user = await base44.auth.me();
        const users = await base44.entities.User.list();
        const fullUser = users.find(u => u.email === user.email);
        
        // Create suppliers in bulk
        const createdSuppliers = [];
        for (const supplierData of suppliers) {
          if (supplierData.legal_name) {
            const supplier = await base44.entities.Supplier.create({
              ...supplierData,
              company_id: fullUser?.company_id,
              tier: supplierData.tier || 'tier_1',
              status: 'active',
              source: 'file_upload',
              data_completeness: calculateCompleteness(supplierData),
              risk_level: 'medium',
              risk_score: 50
            });
            createdSuppliers.push(supplier);
          }
        }

        setResult({
          success: true,
          count: createdSuppliers.length
        });
        
        onImportComplete();
      } else {
        setResult({
          success: false,
          error: extractResult.details || 'Failed to extract data'
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      setResult({
        success: false,
        error: error.message || 'Failed to import suppliers'
      });
    }
    
    setIsProcessing(false);
  };

  const calculateCompleteness = (data) => {
    const fields = ['legal_name', 'country', 'city', 'address', 'vat_number', 'website', 'nace_code'];
    const filled = fields.filter(f => data[f] && data[f].trim()).length;
    return Math.round((filled / fields.length) * 100);
  };

  const resetModal = () => {
    setFile(null);
    setUploadedUrl(null);
    setResult(null);
    setIsUploading(false);
    setIsProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetModal(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Import Suppliers</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {!result ? (
            <>
              <div className="space-y-2">
                <Label>Import Type</Label>
                <Select value={importType} onValueChange={setImportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suppliers">Suppliers</SelectItem>
                    <SelectItem value="sites">Supplier Sites</SelectItem>
                    <SelectItem value="skus">SKUs</SelectItem>
                    <SelectItem value="mappings">Supplier-SKU Mappings</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
              <Label>File (CSV, Excel, PDF, JSON)</Label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-[#86b027] hover:bg-[#86b027]/5 transition-colors">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.pdf,.json,.xml"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {file ? (
                      <div className="flex items-center justify-center gap-2 text-slate-700">
                        <FileSpreadsheet className="w-8 h-8 text-[#86b027]" />
                        <div className="text-left">
                          <p className="font-medium">{file.name}</p>
                          <p className="text-xs text-slate-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Supported: CSV, Excel, PDF, JSON, XML
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {file && !result && (
                <Button 
                  onClick={handleProcess} 
                  disabled={isProcessing}
                  className="w-full bg-[#02a1e8] hover:bg-[#0290d0] text-white shadow-md"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing & Importing...
                    </>
                  ) : (
                    'Process & Import Suppliers'
                  )}
                </Button>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              {result.success ? (
                <>
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Import Successful!
                  </h3>
                  <p className="text-slate-600">
                    {result.count} suppliers imported successfully.
                  </p>
                  <Button 
                    onClick={() => onOpenChange(false)}
                    className="mt-6 bg-[#86b027] hover:bg-[#769c22] text-white shadow-md"
                  >
                    Done
                  </Button>
                </>
              ) : (
                <>
                  <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Import Failed
                  </h3>
                  <p className="text-slate-600 text-sm">
                    {result.error}
                  </p>
                  <Button 
                    onClick={resetModal}
                    variant="outline"
                    className="mt-6"
                  >
                    Try Again
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}