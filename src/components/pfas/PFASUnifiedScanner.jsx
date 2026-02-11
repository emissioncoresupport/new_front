import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from 'sonner';
import { ScanLine, Upload, Link2, Search, Loader2, CheckCircle2 } from "lucide-react";
import PFASMasterOrchestrator from './services/PFASMasterOrchestrator';
import { PFASExternalAPIService } from './services/PFASExternalAPIService';

export default function PFASUnifiedScanner() {
  const [scanType, setScanType] = useState('quick');
  const [casNumber, setCasNumber] = useState('');
  const [entityType, setEntityType] = useState('Product');
  const [entityId, setEntityId] = useState('');
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const quickScanMutation = useMutation({
    mutationFn: async (cas) => {
      // Use robust multi-source API lookup
      const substance = await PFASExternalAPIService.lookupAndStoreSubstance(cas);
      
      return {
        is_pfas: substance.pfas_flag,
        substance_name: substance.name,
        is_restricted: substance.restricted_status,
        regulation: substance.restricted_status ? 
          `REACH Annex XVII (threshold: ${substance.restriction_threshold_ppm || 0} ppm)` :
          substance.svhc_status ? 'REACH Candidate List (SVHC)' : 'None',
        risk_level: substance.restricted_status ? 'Critical' : 
                    substance.svhc_status ? 'High' : 'Low',
        verification_score: substance.verification_metadata?.verification_score || 0
      };
    },
    onSuccess: (result) => {
      if (result.is_pfas) {
        toast.error(`⚠️ PFAS Detected: ${result.substance_name}`, {
          description: `${result.is_restricted ? 'RESTRICTED - ' : ''}${result.regulation} | Verified: ${result.verification_score}%`
        });
      } else {
        toast.success('✓ Not a PFAS substance', {
          description: `Multi-source verified (${result.verification_score}%)`
        });
      }
    }
  });

  const entityScanMutation = useMutation({
    mutationFn: async ({ entityId, entityType }) => {
      let entity;
      if (entityType === 'Supplier') {
        entity = suppliers.find(s => s.id === entityId);
      } else if (entityType === 'Product') {
        entity = products.find(p => p.id === entityId);
      } else if (entityType === 'PPWRPackaging') {
        entity = packaging.find(p => p.id === entityId);
      }

      if (!entity) throw new Error('Entity not found');

      // AI analysis
      const prompt = `Assess PFAS risk for this ${entityType}:
      
      ${JSON.stringify(entity, null, 2)}
      
      Check materials, components, industry sector against REACH/ECHA lists.
      Return: { status, risk_score (0-100), detected_substances, ai_analysis_notes }`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["Compliant", "Non-Compliant", "Suspected"] },
            risk_score: { type: "number" },
            detected_substances: { type: "array" },
            ai_analysis_notes: { type: "string" }
          }
        }
      });

      // Create assessment via orchestrator
      return await PFASMasterOrchestrator.createOrUpdateAssessment({
        entity_id: entityId,
        entity_type: entityType,
        name: entity.name || entity.legal_name || entity.packaging_name,
        status: analysis.status,
        risk_score: analysis.risk_score,
        detected_substances: analysis.detected_substances || [],
        verification_method: 'ai_analysis',
        source: 'unified_scanner',
        ai_analysis_notes: analysis.ai_analysis_notes
      });
    },
    onSuccess: (assessment) => {
      queryClient.invalidateQueries({ queryKey: ['pfas-assessments'] });
      toast.success(`Assessment complete: ${assessment.status}`, {
        description: `Risk score: ${assessment.risk_score}/100`
      });
    }
  });

  const customScanMutation = useMutation({
    mutationFn: async ({ name, description }) => {
      const prompt = `Analyze this material/product for PFAS content:
      
      Name: ${name}
      Description: ${description}
      
      Check against REACH Annex XVII and ECHA Candidate List.
      Return: { status, risk_score, detected_substances, ai_analysis_notes }`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            status: { type: "string" },
            risk_score: { type: "number" },
            detected_substances: { type: "array" },
            ai_analysis_notes: { type: "string" }
          }
        }
      });

      return await PFASMasterOrchestrator.createOrUpdateAssessment({
        entity_id: `custom_${Date.now()}`,
        entity_type: 'Manual',
        name,
        status: analysis.status,
        risk_score: analysis.risk_score,
        detected_substances: analysis.detected_substances || [],
        verification_method: 'ai_analysis',
        source: 'custom_scan',
        ai_analysis_notes: `${description}\n\n${analysis.ai_analysis_notes}`
      });
    },
    onSuccess: (assessment) => {
      queryClient.invalidateQueries({ queryKey: ['pfas-assessments'] });
      toast.success('Custom scan complete');
    }
  });

  const documentScanMutation = useMutation({
    mutationFn: async (file) => {
      setUploading(true);
      
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract PFAS data
      const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            product_name: { type: "string" },
            detected_substances: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  cas_number: { type: "string" },
                  concentration_ppm: { type: "number" }
                }
              }
            },
            test_date: { type: "string" },
            compliance_status: { type: "string" }
          }
        }
      });

      if (extraction.output) {
        const data = extraction.output;
        const riskScore = data.detected_substances?.length > 0 ? 
          Math.min(100, data.detected_substances.length * 25) : 0;

        return await PFASMasterOrchestrator.createOrUpdateAssessment({
          entity_id: `doc_${Date.now()}`,
          entity_type: 'Manual',
          name: data.product_name || 'Uploaded Document',
          status: data.compliance_status || (riskScore > 50 ? 'Non-Compliant' : 'Compliant'),
          risk_score: riskScore,
          detected_substances: data.detected_substances || [],
          verification_method: 'document_review',
          source: 'document_upload',
          test_report_url: file_url,
          ai_analysis_notes: `Document uploaded on ${data.test_date || new Date().toISOString()}`
        });
      }
    },
    onSuccess: (assessment) => {
      setUploading(false);
      queryClient.invalidateQueries({ queryKey: ['pfas-assessments'] });
      toast.success('Document processed successfully');
    },
    onError: () => {
      setUploading(false);
      toast.error('Document processing failed');
    }
  });

  return (
    <Card className="border-[#86b027]/30 bg-gradient-to-br from-white to-[#86b027]/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#86b027]">
          <ScanLine className="w-5 h-5" />
          Unified PFAS Scanner
        </CardTitle>
        <p className="text-sm text-slate-500">
          Single entry point for all PFAS assessments - automatically creates records, triggers integrations, and generates reports
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={scanType} onValueChange={setScanType}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="quick">Quick CAS Check</TabsTrigger>
            <TabsTrigger value="entity">Entity Scan</TabsTrigger>
            <TabsTrigger value="custom">Custom Item</TabsTrigger>
            <TabsTrigger value="document">Upload Document</TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>CAS Number or Substance Name</Label>
              <Input
                placeholder="e.g., 335-67-1 or PFOA"
                value={casNumber}
                onChange={(e) => setCasNumber(e.target.value)}
              />
            </div>
            <Button
              onClick={() => quickScanMutation.mutate(casNumber)}
              disabled={!casNumber || quickScanMutation.isPending}
              className="w-full bg-[#86b027] hover:bg-[#769c22]"
            >
              {quickScanMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Check Substance
            </Button>
          </TabsContent>

          <TabsContent value="entity" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Supplier">Supplier</SelectItem>
                  <SelectItem value="Product">Product</SelectItem>
                  <SelectItem value="PPWRPackaging">PPWR Packaging</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select {entityType}</Label>
              <Select value={entityId} onValueChange={setEntityId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Choose ${entityType}...`} />
                </SelectTrigger>
                <SelectContent>
                  {entityType === 'Supplier' && suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.legal_name || s.trade_name}</SelectItem>
                  ))}
                  {entityType === 'Product' && products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                  {entityType === 'PPWRPackaging' && packaging.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.packaging_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => entityScanMutation.mutate({ entityId, entityType })}
              disabled={!entityId || entityScanMutation.isPending}
              className="w-full bg-[#86b027] hover:bg-[#769c22]"
            >
              {entityScanMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ScanLine className="w-4 h-4 mr-2" />}
              Scan & Create Assessment
            </Button>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input
                placeholder="e.g., Custom Product X"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description / Materials</Label>
              <Textarea
                placeholder="Describe the item, materials used, intended application..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                rows={4}
              />
            </div>
            <Button
              onClick={() => customScanMutation.mutate({ name: customName, description: customDescription })}
              disabled={!customName || !customDescription || customScanMutation.isPending}
              className="w-full bg-[#86b027] hover:bg-[#769c22]"
            >
              {customScanMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ScanLine className="w-4 h-4 mr-2" />}
              Analyze Custom Item
            </Button>
          </TabsContent>

          <TabsContent value="document" className="space-y-4 mt-4">
            <div className="border-2 border-dashed border-[#86b027]/30 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".pdf,.jpg,.png,.csv"
                className="hidden"
                id="pfas-doc-upload"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    documentScanMutation.mutate(e.target.files[0]);
                  }
                }}
              />
              <label htmlFor="pfas-doc-upload" className="cursor-pointer">
                <div className="w-12 h-12 bg-[#86b027]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  {uploading ? <Loader2 className="w-6 h-6 text-[#86b027] animate-spin" /> : <Upload className="w-6 h-6 text-[#86b027]" />}
                </div>
                <p className="font-semibold text-slate-700">Upload Test Report or Certificate</p>
                <p className="text-xs text-slate-500 mt-1">PDF, CSV, or image • Auto-extract PFAS data</p>
              </label>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-900">
              <strong>Smart Integration:</strong> All scans automatically create PFASAssessment records, trigger SCIP notifications for SVHCs, 
              update linked entities (Product/Supplier/Packaging), generate substitution scenarios, and log to blockchain.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}