import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Sparkles, AlertTriangle, CheckCircle2, XCircle, FileText, Zap } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function PFASQuickCheck() {
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [result, setResult] = useState(null);

  const checkMutation = useMutation({
    mutationFn: async () => {
      let context = `Product: ${productName}\nDescription: ${productDescription}`;
      
      // Handle file upload if present
      if (uploadedFile) {
        toast.loading('Uploading and analyzing document...');
        const { file_url } = await base44.integrations.Core.UploadFile({
          file: uploadedFile
        });
        
        // Extract data from file
        const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: file_url,
          json_schema: {
            type: "object",
            properties: {
              materials: { type: "array", items: { type: "string" } },
              chemicals: { type: "array", items: { type: "string" } },
              components: { type: "array", items: { type: "string" } }
            }
          }
        });
        
        if (extraction.status === 'success' && extraction.output) {
          context += `\n\nExtracted from document:\n${JSON.stringify(extraction.output, null, 2)}`;
        }
      }

      // AI Analysis with PFAS-specific focus
      const prompt = `You are a PFAS compliance expert. Analyze this product for PFAS (Per- and Polyfluoroalkyl Substances) risk:

${context}

CRITICAL CHECKS:
1. Does this product typically contain PFAS based on industry knowledge?
2. Check against REACH Annex XVII (Entry 68 - PFAS restriction)
3. Check against ECHA SVHC Candidate List
4. Consider common PFAS applications: waterproof coatings, non-stick surfaces, firefighting foam, electronics, textiles, food packaging

Return JSON with:
- contains_pfas: true/false (best assessment)
- risk_level: "None", "Low", "Medium", "High", "Critical"
- confidence: 0-100 (how confident are you?)
- explanation: detailed reasoning
- suspected_pfas_types: array of suspected PFAS chemical names/types
- compliance_status: "Compliant", "Requires Investigation", "Non-Compliant"
- recommendations: array of next steps
- data_gaps: what additional info is needed for certainty`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            contains_pfas: { type: "boolean" },
            risk_level: { type: "string" },
            confidence: { type: "number" },
            explanation: { type: "string" },
            suspected_pfas_types: { type: "array", items: { type: "string" } },
            compliance_status: { type: "string" },
            recommendations: { type: "array", items: { type: "string" } },
            data_gaps: { type: "array", items: { type: "string" } }
          }
        }
      });

      // Save assessment
      await base44.entities.PFASAssessment.create({
        entity_type: 'Manual',
        name: productName,
        status: response.compliance_status,
        risk_score: response.risk_level === 'Critical' ? 95 : 
                    response.risk_level === 'High' ? 75 :
                    response.risk_level === 'Medium' ? 50 :
                    response.risk_level === 'Low' ? 25 : 5,
        detected_substances: response.suspected_pfas_types?.map(name => ({
          name,
          is_restricted: true,
          regulation: 'REACH Annex XVII Entry 68'
        })) || [],
        ai_analysis_notes: response.explanation,
        last_checked: new Date().toISOString()
      });

      return response;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success('Analysis complete!');
    },
    onError: () => {
      toast.error('Analysis failed. Please try again.');
    }
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large. Maximum 10MB.');
        return;
      }
      setUploadedFile(file);
      toast.success(`File "${file.name}" ready to upload`);
    }
  };

  const handleReset = () => {
    setProductName('');
    setProductDescription('');
    setUploadedFile(null);
    setResult(null);
  };

  const getRiskColor = (level) => {
    switch(level) {
      case 'Critical': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'Compliant') return <CheckCircle2 className="w-6 h-6 text-emerald-500" />;
    if (status === 'Non-Compliant') return <XCircle className="w-6 h-6 text-rose-500" />;
    return <AlertTriangle className="w-6 h-6 text-amber-500" />;
  };

  return (
    <Card className="border-[#86b027]/20 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-[#86b027]/5 to-[#769c22]/5 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#86b027] rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl">⚡ Quick PFAS Check</CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              Upload a product/material and get instant PFAS risk assessment
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="product-name" className="text-sm font-semibold">
                  Product/Material Name *
                </Label>
                <Input
                  id="product-name"
                  placeholder="e.g., Waterproof Jacket, Food Packaging Box, Circuit Board"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">
                  Description / Materials Used
                </Label>
                <textarea
                  id="description"
                  className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86b027]"
                  placeholder="Describe the product, materials, or paste bill of materials (BOM)..."
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Upload Document (Optional)</Label>
                {!uploadedFile ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 hover:border-[#86b027] transition-colors">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.csv,.xlsx,.txt,.doc,.docx"
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-sm text-slate-600">
                        Click to upload BOM, SDS, or product spec
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        PDF, CSV, Excel, Word (Max 10MB)
                      </p>
                    </label>
                  </div>
                ) : (
                  <div className="border-2 border-[#86b027] bg-[#86b027]/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#86b027] rounded-lg">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-[#86b027] text-sm">{uploadedFile.name}</p>
                          <p className="text-xs text-slate-500">
                            {(uploadedFile.size / 1024).toFixed(1)} KB • Ready to analyze
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUploadedFile(null);
                          toast.info('File removed');
                        }}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#86b027]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>File uploaded successfully. Will be analyzed with AI.</span>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={() => checkMutation.mutate()}
                disabled={!productName.trim() || checkMutation.isPending}
                className="w-full bg-gradient-to-r from-[#86b027] to-[#769c22] hover:from-[#769c22] hover:to-[#86b027] text-white shadow-lg h-12 text-base font-bold"
              >
                {checkMutation.isPending ? (
                  <>
                    <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Check for PFAS Now
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Result Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.compliance_status)}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{productName}</h3>
                    <Badge className={`mt-1 ${getRiskColor(result.risk_level)} border`}>
                      {result.risk_level} Risk
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Confidence</p>
                  <p className="text-2xl font-bold text-[#86b027]">{result.confidence}%</p>
                </div>
              </div>

              {/* PFAS Detection Status */}
              <div className={`p-4 rounded-xl border-2 ${
                result.contains_pfas 
                  ? 'bg-rose-50 border-rose-200' 
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {result.contains_pfas ? (
                    <>
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                      <p className="font-bold text-rose-900">PFAS Detected or Suspected</p>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <p className="font-bold text-emerald-900">No PFAS Detected</p>
                    </>
                  )}
                </div>
                <p className="text-sm text-slate-700">{result.explanation}</p>
              </div>

              {/* Suspected PFAS Types */}
              {result.suspected_pfas_types?.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">Suspected PFAS Substances</h4>
                  <div className="space-y-2">
                    {result.suspected_pfas_types.map((substance, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <span className="font-medium text-slate-900">{substance}</span>
                        <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-300">
                          Restricted
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations?.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">📋 Recommended Actions</h4>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-[#86b027] font-bold">{idx + 1}.</span>
                        <span className="text-slate-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Gaps */}
              {result.data_gaps?.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Additional Information Needed
                  </h4>
                  <ul className="space-y-1 text-sm text-blue-800">
                    {result.data_gaps.map((gap, idx) => (
                      <li key={idx}>• {gap}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1"
                >
                  Check Another Product
                </Button>
                <Button
                  className="flex-1 bg-[#86b027] hover:bg-[#769c22]"
                  onClick={() => toast.info('Opening detailed analysis...')}
                >
                  View Full Report
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}