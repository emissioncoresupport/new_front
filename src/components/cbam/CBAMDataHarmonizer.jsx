import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wand2, CheckCircle2, AlertTriangle, XCircle, Loader2, 
  RefreshCw, ArrowRight, Sparkles, FileCheck, Database
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

export default function CBAMDataHarmonizer() {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: entries = [] } = useQuery({
    queryKey: ['cbam-emission-entries'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });

  const unharmonizedEntries = entries.filter(e => e.harmonization_status !== 'harmonized');
  const harmonizedEntries = entries.filter(e => e.harmonization_status === 'harmonized');

  const harmonizeMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      
      // 1. Prepare data for AI analysis
      const entriesToProcess = unharmonizedEntries.slice(0, 10); // Limit batch size
      if (entriesToProcess.length === 0) return;

      // 2. Call LLM for harmonization
      const prompt = `
        You are a CBAM Data Harmonization Expert. Analyze the following supplier emission entries.
        
        Current Regulation Context: 
        - As per the "Nov 2025 Draft", the acceptable deviation from EU Default Benchmark values is strictly max 5%.
        - Any deviation > 5% requires a "critical" flag unless accompanied by verified actual data evidence.
        - You must autonomously identify the relevant EU Benchmark for each goods type/HS code for Q4 2025.

        Tasks:
        1. Identify the applicable EU Benchmark (tCO2e/t) for the goods type.
        2. Compare supplier provided direct/indirect emissions against this benchmark.
        3. Flag entries deviating > 5% as "critical" quality issues.
        4. Check HS Codes format and unit inconsistencies.

        Data:
        ${JSON.stringify(entriesToProcess.map(e => ({
          id: e.id,
          goods_type: e.goods_type,
          hs_code: e.hs_code,
          country: e.country_of_origin,
          net_mass: e.net_mass_tonnes,
          direct_emissions: e.direct_emissions_specific,
          total_emissions: e.total_embedded_emissions,
          calculation_method: e.calculation_method
        })), null, 2)}

        Return a JSON object keyed by entry ID, with:
        - status: "harmonized" | "requires_review"
        - issues: array of { severity: "info"|"warning"|"critical", message: string, suggestion: string }
        - confidence_score: number (0-100)
        - benchmark_used: number (the value you compared against)
        - benchmark_source: string (e.g. "EU 2025 Draft - Iron & Steel")
      `;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
            type: "object",
            additionalProperties: {
                type: "object",
                properties: {
                    status: { type: "string" },
                    issues: { 
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                severity: { type: "string" },
                                message: { type: "string" },
                                suggestion: { type: "string" }
                            }
                        }
                    },
                    confidence_score: { type: "number" },
                    benchmark_used: { type: "number" },
                    benchmark_source: { type: "string" }
                }
            }
        }
      });

      // 3. Update entities
      await Promise.all(Object.entries(response).map(async ([id, result]) => {
        await base44.entities.CBAMEmissionEntry.update(id, {
          harmonization_status: result.status,
          data_quality_issues: result.issues,
          validation_score: result.confidence_score
        });
      }));

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
      toast.success("Data harmonization complete");
      setIsProcessing(false);
    },
    onError: () => {
      toast.error("Harmonization process failed");
      setIsProcessing(false);
    }
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-medium text-slate-900">Data Harmonization Engine</h2>
            <p className="text-sm text-slate-500 mt-1">
              AI-powered cleaning and benchmark validation
            </p>
          </div>
          <Button 
            onClick={() => harmonizeMutation.mutate()} 
            disabled={isProcessing || unharmonizedEntries.length === 0}
            className="bg-slate-900 hover:bg-slate-800 text-white"
          >
            {isProcessing ? 'Processing...' : `Harmonize ${unharmonizedEntries.length}`}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Pending</p>
          <p className="text-4xl font-light text-slate-900">{unharmonizedEntries.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Harmonized</p>
          <p className="text-4xl font-light text-emerald-600">{harmonizedEntries.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Issues</p>
          <p className="text-4xl font-light text-amber-600">
            {entries.filter(e => e.data_quality_issues?.length > 0).length}
          </p>
        </div>
      </div>

      <Tabs defaultValue="issues" className="w-full">
        <TabsList className="bg-slate-50 border-b border-slate-200 rounded-none h-auto p-0 w-full justify-start">
          <TabsTrigger value="issues" className="rounded-none border-b-3 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-6 py-3 text-sm font-medium text-slate-700 transition-all">Detected Issues</TabsTrigger>
          <TabsTrigger value="all" className="rounded-none border-b-3 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-6 py-3 text-sm font-medium text-slate-700 transition-all">All Data</TabsTrigger>
        </TabsList>
        
        <TabsContent value="issues" className="mt-6">
          <ScrollArea className="h-[500px] rounded-md border border-slate-200 bg-white p-4">
            <div className="space-y-4">
              {entries.filter(e => e.data_quality_issues?.length > 0).length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
                  <p className="font-medium">All data looks clean!</p>
                  <p className="text-sm">No quality issues detected in processed entries.</p>
                </div>
              ) : (
                entries
                  .filter(e => e.data_quality_issues?.length > 0)
                  .map(entry => (
                    <div key={entry.id} className="bg-white border-l-4 border-l-amber-500 border border-slate-200 rounded-lg">
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-slate-900 flex items-center gap-2">
                              {entry.product_name || entry.goods_type}
                              <Badge variant="outline" className="font-mono text-xs border-slate-200">{entry.hs_code}</Badge>
                            </h4>
                            <p className="text-xs text-slate-500">Import ID: {entry.import_id}</p>
                          </div>
                          <Badge className="bg-amber-100 text-amber-800 border-0">
                            {entry.data_quality_issues.length} Issues
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          {entry.data_quality_issues.map((issue, idx) => (
                            <div key={idx} className="flex gap-3 text-sm bg-slate-50 p-2 rounded">
                              <div className="mt-0.5">
                                {issue.severity === 'critical' ? <XCircle className="w-4 h-4 text-red-500" /> :
                                 issue.severity === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
                                 <FileCheck className="w-4 h-4 text-blue-500" />}
                              </div>
                              <div>
                                <p className="font-medium text-slate-700">{issue.message}</p>
                                <p className="text-slate-500 text-xs mt-0.5">Suggest: {issue.suggestion}</p>
                              </div>
                            </div>
                          ))}
                          
                          {/* Benchmark Context */}
                          {entry.validation_score && (
                             <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                                <Sparkles className="w-3 h-3 text-purple-400" />
                                <span>Validated against Nov 2025 Draft benchmarks (5% tolerance)</span>
                             </div>
                          )}
                        </div>
                        
                        <div className="mt-3 flex justify-end gap-2">
                          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600 h-8">Dismiss</Button>
                          <Button size="sm" className="h-8 bg-slate-900 hover:bg-slate-800 text-white">
                            Apply Fixes
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="all">
          <div className="rounded-md border border-slate-200 bg-white p-8 text-center text-slate-500">
            Raw data view available in "Declared Goods" tab.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}