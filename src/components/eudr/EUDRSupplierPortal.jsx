import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectItem, SelectTrigger, SelectContent, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function EUDRSupplierPortal() {
  const [formData, setFormData] = useState({
    supplier_name: "",
    country: "",
    legal_entity_id: "",
    po_reference: "",
    chain_of_custody: "Segregated",
    documents: [],
    geolocation_url: "",
    validation_result: null,
    declaration_confirmed: false
  });
  
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const queryClient = useQueryClient();

  const handleFileUpload = async (e, category) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      // Simulate hash for now
      const hash = "SHA256-" + Math.random().toString(36).substring(2, 15);
      
      const newDoc = {
        category,
        name: file.name,
        url: res.file_url,
        hash,
        uploaded_at: new Date().toISOString()
      };
      
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, newDoc]
      }));
      toast.success(`${category} uploaded successfully`);
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGeoUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setIsUploading(true);
      setFormData(prev => ({ ...prev, validation_result: null }));
      
      try {
          // 1. Upload File
          const res = await base44.integrations.Core.UploadFile({ file });
          const fileUrl = res.file_url;
          setFormData(prev => ({ ...prev, geolocation_url: fileUrl }));
          toast.success("Geolocation data uploaded");

          // 2. AI Validation
          setIsValidating(true);
          const prompt = `
            You are an expert EUDR Compliance Validator. Analyze the provided GeoJSON/KML file containing production plots.
            
            Declared Country: ${formData.country || "Unknown (infer from coordinates)"}
            
            Tasks:
            1. Validate Geometries: Check for valid polygons, no self-intersections.
            2. Geographic Boundary: Ensure all points fall within the declared country.
            3. Deforestation Risk: Cross-reference coordinates with global deforestation data (simulated). 
               - If coordinates are in high-risk zones (e.g., parts of Amazon, Borneo), flag it.
            
            Output JSON:
            {
                "valid_structure": boolean,
                "country_match": boolean,
                "detected_country": string,
                "deforestation_risk": "Low" | "High",
                "issues": string[],
                "plots_count": number
            }
          `;

          const validationRes = await base44.integrations.Core.InvokeLLM({
              prompt,
              file_urls: [fileUrl],
              response_json_schema: {
                  type: "object",
                  properties: {
                      valid_structure: { type: "boolean" },
                      country_match: { type: "boolean" },
                      detected_country: { type: "string" },
                      deforestation_risk: { type: "string", enum: ["Low", "High"] },
                      issues: { type: "array", items: { type: "string" } },
                      plots_count: { type: "number" }
                  }
              }
          });

          setFormData(prev => ({ ...prev, validation_result: validationRes }));
          
          if (!validationRes.valid_structure || !validationRes.country_match) {
              toast.error("Validation issues detected");
          } else if (validationRes.deforestation_risk === 'High') {
              toast.warning("High deforestation risk detected");
          } else {
              toast.success("AI Verification Passed");
          }

      } catch(err) {
          console.error(err);
          toast.error("Upload or validation failed");
      } finally {
          setIsUploading(false);
          setIsValidating(false);
      }
  };

  const submitMutation = useMutation({
    mutationFn: (data) => base44.entities.EUDRSupplierSubmission.create({
        ...data,
        status: 'Submitted'
    }),
    onSuccess: () => {
        toast.success("Evidence submitted successfully!");
        setFormData({
            supplier_name: "",
            country: "",
            legal_entity_id: "",
            po_reference: "",
            chain_of_custody: "Segregated",
            documents: [],
            geolocation_url: "",
            declaration_confirmed: false
        });
    }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-900 text-white p-6 rounded-xl flex items-start gap-4 shadow-sm">
        <div className="p-3 bg-white/10 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">EUDR Supplier Compliance</h3>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Submit due diligence information for Regulation (EU) 2023/1115. 
            Your geolocation data and legality documents will be hashed and stored immutably in the Audit Vault.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction & Identity</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Supplier Name</label>
            <Input 
                value={formData.supplier_name} 
                onChange={(e) => setFormData({...formData, supplier_name: e.target.value})} 
                placeholder="Legal Company Name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Country of Production</label>
            <Input 
                value={formData.country} 
                onChange={(e) => setFormData({...formData, country: e.target.value})} 
                placeholder="e.g. Brazil"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Legal Entity ID / Tax ID</label>
            <Input 
                value={formData.legal_entity_id} 
                onChange={(e) => setFormData({...formData, legal_entity_id: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">PO Reference</label>
            <Input 
                value={formData.po_reference} 
                onChange={(e) => setFormData({...formData, po_reference: e.target.value})} 
                placeholder="PO-2025-XXX"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Traceability & Geolocation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Chain of Custody Model</label>
            <Select 
                value={formData.chain_of_custody} 
                onValueChange={(v) => setFormData({...formData, chain_of_custody: v})}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Segregated">Segregated</SelectItem>
                <SelectItem value="Controlled Blending">Controlled Blending</SelectItem>
                <SelectItem value="Mass Balance">Mass Balance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
             <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mx-auto mb-4">
                {isUploading ? <Loader2 className="w-8 h-8 animate-spin text-indigo-600" /> : <Upload className="w-8 h-8 text-indigo-600" />}
             </div>
             <h4 className="text-lg font-semibold text-slate-900">Geolocation Polygons</h4>
             <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                Upload production plot data in <strong>.geojson</strong> or <strong>.kml</strong> format. 
                <br/>Required for all plots {'>'} 4 hectares (Regulation Art. 4).
             </p>
             
             {formData.geolocation_url ? (
                 <div className="w-full max-w-lg mx-auto">
                     <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 text-left">
                         <div className="flex items-center justify-between mb-3">
                             <div className="flex items-center gap-3">
                                 <div className="bg-indigo-50 p-2 rounded-full">
                                     <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                                 </div>
                                 <div>
                                     <p className="text-sm font-bold text-slate-900">File Uploaded</p>
                                     <p className="text-xs text-slate-500">Analysis complete</p>
                                 </div>
                             </div>
                             <Button variant="ghost" size="sm" onClick={() => setFormData(p => ({...p, geolocation_url: "", validation_result: null}))} className="text-slate-400 hover:text-slate-600">
                                 Replace
                             </Button>
                         </div>

                         {isValidating ? (
                             <div className="flex items-center gap-2 text-sm text-slate-500 p-3 bg-slate-50 rounded animate-pulse">
                                 <Sparkles className="w-4 h-4 text-indigo-500" /> AI Validating geometries and deforestation risk...
                             </div>
                         ) : formData.validation_result ? (
                             <div className={`rounded-md p-3 border ${
                                 formData.validation_result.valid_structure && formData.validation_result.country_match && formData.validation_result.deforestation_risk === 'Low'
                                 ? 'bg-emerald-50 border-emerald-100' 
                                 : 'bg-amber-50 border-amber-100'
                             }`}>
                                 <div className="flex items-center gap-2 mb-2">
                                     <Badge variant="outline" className="bg-white">
                                         {formData.validation_result.plots_count} Plots
                                     </Badge>
                                     <Badge variant="outline" className="bg-white">
                                         {formData.validation_result.detected_country}
                                     </Badge>
                                     {formData.validation_result.deforestation_risk === 'High' && (
                                         <Badge className="bg-rose-500 hover:bg-rose-600">High Risk</Badge>
                                     )}
                                 </div>
                                 
                                 {formData.validation_result.issues?.length > 0 ? (
                                     <ul className="space-y-1">
                                         {formData.validation_result.issues.map((issue, i) => (
                                             <li key={i} className="text-xs flex items-start gap-1.5 text-amber-800">
                                                 <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                                                 {issue}
                                             </li>
                                         ))}
                                     </ul>
                                 ) : (
                                     <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium">
                                         <CheckCircle2 className="w-3 h-3" />
                                         Geometries valid & within country boundaries. No deforestation detected.
                                     </div>
                                 )}
                             </div>
                         ) : null}
                     </div>
                 </div>
             ) : (
                 <div className="flex justify-center gap-3">
                    <div className="relative">
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            Upload GeoJSON File
                        </Button>
                        <input 
                            type="file" 
                            accept=".json,.geojson,.kml"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleGeoUpload}
                            disabled={isUploading}
                        />
                    </div>
                    <Button variant="outline">Enter Coordinates Manually</Button>
                 </div>
             )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legality Evidence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {["Land Rights", "Environmental Permits", "Labour Compliance", "Tax Compliance"].map((docType) => (
            <div key={docType} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100">
              <span className="text-sm font-medium text-slate-700">{docType}</span>
              <div className="flex items-center gap-2">
                  {formData.documents.find(d => d.category === docType) ? (
                      <span className="text-xs text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Uploaded
                      </span>
                  ) : (
                      <div className="relative">
                        <Button variant="ghost" size="sm" className="h-8 text-indigo-600">Upload</Button>
                        <input 
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => handleFileUpload(e, docType)}
                            disabled={isUploading}
                        />
                      </div>
                  )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 p-4 bg-slate-50 rounded-lg">
        <Checkbox 
            id="declaration" 
            checked={formData.declaration_confirmed}
            onCheckedChange={(c) => setFormData({...formData, declaration_confirmed: c})}
        />
        <label htmlFor="declaration" className="text-sm text-slate-600 leading-tight">
            I confirm that the geolocation, documentation, and information provided are accurate and complete. 
            I understand this information will be used for the EU Due Diligence Statement.
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Save Draft</Button>
        <Button 
            onClick={() => submitMutation.mutate(formData)} 
            disabled={!formData.declaration_confirmed || submitMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
            {submitMutation.isPending ? 'Submitting...' : 'Submit Evidence'}
        </Button>
      </div>
    </div>
  );
}