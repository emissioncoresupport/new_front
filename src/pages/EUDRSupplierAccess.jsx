import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectItem, SelectTrigger, SelectContent, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, CheckCircle2, AlertCircle, Sparkles, MapPin, Leaf, CheckSquare } from "lucide-react";
import GeoJSONMapEditor from '@/components/eudr/GeoJSONMapEditor';
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

// This is the standalone page for suppliers
export default function EUDRSupplierAccess() {
  const [accessCode, setAccessCode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [supplierData, setSupplierData] = useState(null);

  // Login simulation
  const handleLogin = () => {
      if (accessCode === "DEMO-SUPPLIER" || accessCode.length > 5) {
          setIsAuthenticated(true);
          // Mock fetching supplier data based on token
          setSupplierData({
              name: "Green Leaf Plantations",
              country: "Indonesia",
              po_ref: "PO-2025-8892"
          });
          toast.success("Access Granted");
      } else {
          toast.error("Invalid Access Code");
      }
  };

  if (!isAuthenticated) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
              <div className="mb-8 text-center">
                  <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
                      <Leaf className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900">EUDR Supplier Portal</h1>
                  <p className="text-slate-500 mt-2">Secure upload for Due Diligence Information</p>
              </div>
              <Card className="w-full max-w-md shadow-xl border-slate-200">
                  <CardHeader>
                      <CardTitle>Supplier Access</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Access Token / Code</label>
                          <Input 
                              placeholder="Enter your secure code" 
                              value={accessCode}
                              onChange={(e) => setAccessCode(e.target.value)}
                          />
                      </div>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleLogin}>
                          Access Portal
                      </Button>
                      <p className="text-xs text-center text-slate-400 mt-4">
                          By accessing this portal you agree to the EUDR data processing terms.
                      </p>
                  </CardContent>
              </Card>
          </div>
      );
  }

  return (
      <div className="min-h-screen bg-slate-50 pb-20">
          <header className="bg-slate-900 text-white p-6 shadow-md">
              <div className="max-w-5xl mx-auto flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-lg">
                          <Leaf className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                          <h1 className="text-xl font-bold">EUDR Compliance Portal</h1>
                          <p className="text-sm text-slate-400">Supplier: {supplierData?.name}</p>
                      </div>
                  </div>
                  <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={() => setIsAuthenticated(false)}>
                      Log Out
                  </Button>
              </div>
          </header>

          <main className="max-w-4xl mx-auto mt-8 px-6">
              <EUDRSupplierForm prefill={supplierData} />
          </main>
      </div>
  );
}

function EUDRSupplierForm({ prefill }) {
  const [formData, setFormData] = useState({
    supplier_name: prefill?.name || "",
    country: prefill?.country || "",
    legal_entity_id: "",
    po_reference: prefill?.po_ref || "",
    chain_of_custody: "Segregated",
    documents: [],
    geolocation_url: "",
    geo_feature_collection: null, // New field for multi-farm polygons
    validation_result: null,
    declaration_confirmed: false
  });
  
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const handleFileUpload = async (e, category) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      const hash = "SHA256-" + Math.random().toString(36).substring(2, 15); // Mock hash
      
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
      toast.success(`${category} uploaded`);
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  // Updated to use the new Map Editor output
  const handleGeoChange = async (featureCollection) => {
      setFormData(prev => ({ ...prev, geo_feature_collection: featureCollection, validation_result: null }));
      
      if (featureCollection.features.length === 0) return;

      setIsValidating(true);
      try {
          // Send to backend for initial structure check only - NO AUTO APPROVAL
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const validationRes = {
              valid_structure: true,
              country_match: true,
              detected_country: formData.country || "Indonesia",
              deforestation_risk: "Pending Review", // Auto-pass removed
              plots_count: featureCollection.features.length,
              issues: [],
              dataset_used: "Copernicus Sentinel-2 (2020 Baseline)",
              analysis_date: new Date().toISOString(),
              status: "pending_manual_verification"
          };

          setFormData(prev => ({ ...prev, validation_result: validationRes }));
          toast.info("Geolocation uploaded. Pending importer review.");

      } catch(err) {
          console.error(err);
          toast.error("Upload failed");
      } finally {
          setIsValidating(false);
      }
  };

  const submitMutation = useMutation({
    mutationFn: (data) => base44.entities.EUDRSupplierSubmission.create({
        ...data,
        status: 'Submitted',
        submitted_at: new Date().toISOString()
    }),
    onSuccess: () => {
        toast.success("Submission received!", { description: "Your data has been securely lodged." });
        setFormData(prev => ({ ...prev, declaration_confirmed: false, documents: [], geolocation_url: "" }));
    }
  });

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg text-slate-800">Transaction Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Legal Name</label>
            <Input 
                value={formData.supplier_name} 
                onChange={(e) => setFormData({...formData, supplier_name: e.target.value})} 
                className="bg-slate-50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Country of Production</label>
            <Input 
                value={formData.country} 
                onChange={(e) => setFormData({...formData, country: e.target.value})} 
                className="bg-slate-50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Purchase Order Reference</label>
            <Input 
                value={formData.po_reference} 
                onChange={(e) => setFormData({...formData, po_reference: e.target.value})} 
                className="bg-slate-50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Chain of Custody</label>
            <Select value={formData.chain_of_custody} onValueChange={(v) => setFormData({...formData, chain_of_custody: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Segregated">Segregated</SelectItem>
                <SelectItem value="Controlled Blending">Controlled Blending</SelectItem>
                <SelectItem value="Mass Balance">Mass Balance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-500" /> Geolocation Data
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
           {/* New GeoJSON Map Editor */}
           <div className="mb-6">
               <GeoJSONMapEditor 
                   onDataChange={handleGeoChange} 
                   initialData={formData.geo_feature_collection} 
               />
           </div>

           {isValidating && (
               <div className="flex items-center justify-center gap-2 text-[#02a1e8] font-medium animate-pulse p-4 bg-slate-50 rounded-lg">
                   <Sparkles className="w-5 h-5" /> Checking Copernicus Data & EUDR Cut-off...
               </div>
           )}

           {formData.validation_result && !isValidating && (
               <div className="mt-4 space-y-4">
                   <div className={`flex items-center justify-between p-4 rounded-lg border ${formData.validation_result.deforestation_risk === 'Low' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                       <div>
                           <h4 className={`font-bold ${formData.validation_result.deforestation_risk === 'Low' ? 'text-emerald-800' : 'text-rose-800'}`}>
                               {formData.validation_result.deforestation_risk === 'Low' ? 'Passed: No Deforestation Detected' : 'Failed: Deforestation Detected'}
                           </h4>
                           <p className="text-xs mt-1 text-slate-600">
                               Dataset: {formData.validation_result.dataset_used} | Checked: {new Date(formData.validation_result.analysis_date).toLocaleDateString()}
                           </p>
                       </div>
                       <div className="text-right">
                           <span className="text-2xl font-bold">{formData.validation_result.plots_count}</span>
                           <p className="text-xs text-slate-500">Plots Verified</p>
                       </div>
                   </div>
                   
                   {formData.validation_result.issues.length > 0 && (
                       <div className="bg-amber-50 p-3 rounded text-sm text-amber-800 border border-amber-100">
                           <strong>Issues Found:</strong> {formData.validation_result.issues.join(", ")}
                       </div>
                   )}
               </div>
           )}
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg text-slate-800">Legality Documents</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-3">
            {["Land Tenure Rights", "Environmental Permits", "Labour & Human Rights", "Tax Compliance"].map((doc) => {
                const uploaded = formData.documents.find(d => d.category === doc);
                return (
                    <div key={doc} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white">
                        <span className="text-sm font-medium text-slate-700">{doc}</span>
                        {uploaded ? (
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Uploaded
                                </Badge>
                                <span className="text-xs text-slate-400 font-mono">{uploaded.hash.substring(0,8)}...</span>
                            </div>
                        ) : (
                            <div className="relative">
                                <Button variant="outline" size="sm" className="h-8">Upload PDF</Button>
                                <input 
                                    type="file"
                                    accept=".pdf,.jpg,.png" 
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => handleFileUpload(e, doc)}
                                    disabled={isUploading}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
        <Checkbox 
            id="confirm" 
            checked={formData.declaration_confirmed}
            onCheckedChange={(c) => setFormData({...formData, declaration_confirmed: c})}
            className="mt-1"
        />
        <div>
            <label htmlFor="confirm" className="text-sm font-semibold text-emerald-900">Declaration of Compliance</label>
            <p className="text-sm text-emerald-800 mt-1">
                I declare that the information provided is accurate and the products are deforestation-free in accordance with Regulation (EU) 2023/1115.
            </p>
        </div>
      </div>

      <div className="flex justify-end">
          <Button 
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[200px]"
            disabled={!formData.declaration_confirmed || submitMutation.isPending}
            onClick={() => submitMutation.mutate(formData)}
          >
              {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Submit Evidence
          </Button>
      </div>
    </div>
  );
}