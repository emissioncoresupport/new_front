import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, AlertTriangle, GitMerge, Shuffle, ShieldAlert, Scale, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';

export default function BOMAIAnalysisPanel({ product, bomData, skus, suppliers }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [activeTab, setActiveTab] = useState("risks");

  // Helper to build a text representation of the BOM for the AI
  const buildBOMContext = () => {
    if (!product) return "";
    
    let context = `Product: ${product.sku_code} (${product.description})\nStructure:\n`;
    
    const processNode = (parentId, level = 1) => {
      const children = bomData.filter(l => l.parent_sku_id === parentId);
      children.forEach(childLink => {
        const childSku = skus.find(s => s.id === childLink.child_sku_id);
        if (childSku) {
          const supplierMapping = suppliers.find(s => s.id === childLink.supplier_id); // Simplified mapping lookup
          const supplierName = supplierMapping ? supplierMapping.legal_name : "Unknown Supplier";
          const supplierRisk = supplierMapping ? supplierMapping.risk_level : "Unknown";
          
          context += `${"-".repeat(level)} ${childSku.sku_code}: ${childSku.description} (Qty: ${childLink.quantity}, Supplier: ${supplierName}, Risk: ${supplierRisk})\n`;
          processNode(childSku.id, level + 1);
        }
      });
    };
    
    processNode(product.id);
    return context;
  };

  const runAnalysis = async () => {
    if (!product) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const bomContext = buildBOMContext();
      const prompt = `
        Analyze the following Bill of Materials (BOM) structure for supply chain risks.
        
        BOM Data:
        ${bomContext}
        
        Provide a detailed analysis in JSON format with three sections:
        1. "risks": Identify Single Points of Failure (SPOF), high-risk suppliers, and structural weaknesses.
        2. "sourcing": Suggest alternative sourcing strategies or component substitutions for risky parts.
        3. "scenarios": Provide 2 "what-if" scenarios (e.g., "Supplier X goes bankrupt", "Raw material shortage") and their impact on this product.

        Return strictly valid JSON matching this schema:
        {
          "risks": [{ "title": "string", "severity": "high|medium|low", "description": "string" }],
          "sourcing": [{ "component": "string", "suggestion": "string", "impact": "string" }],
          "compliance": [{ "regulation": "string", "status": "compliant|risk|non_compliant", "details": "string" }],
          "optimization": [{ "area": "string", "suggestion": "string", "potential_savings": "string" }],
          "scenarios": [{ "scenario": "string", "impact_analysis": "string", "mitigation": "string" }]
        }
      `;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            risks: { 
              type: "array", 
              items: { 
                type: "object", 
                properties: {
                  title: { type: "string" },
                  severity: { type: "string" },
                  description: { type: "string" }
                } 
              } 
            },
            sourcing: { 
              type: "array", 
              items: { 
                type: "object", 
                properties: {
                  component: { type: "string" },
                  suggestion: { type: "string" },
                  impact: { type: "string" }
                } 
              } 
            },
            compliance: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  regulation: { type: "string" },
                  status: { type: "string" },
                  details: { type: "string" }
                }
              }
            },
            optimization: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  suggestion: { type: "string" },
                  potential_savings: { type: "string" }
                }
              }
            },
            scenarios: { 
              type: "array", 
              items: { 
                type: "object", 
                properties: {
                  scenario: { type: "string" },
                  impact_analysis: { type: "string" },
                  mitigation: { type: "string" }
                } 
              } 
            }
          },
          required: ["risks", "sourcing", "compliance", "optimization", "scenarios"]
        }
      });

      setAnalysisResult(response);
      toast.success("BOM Analysis Complete");
    } catch (error) {
      console.error(error);
      toast.error("Failed to analyze BOM");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!product) return null;

  return (
    <Card className="border-slate-200 h-full flex flex-col">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-indigo-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            AI BOM Intelligence
          </CardTitle>
          <Button 
            size="sm" 
            onClick={runAnalysis} 
            disabled={isAnalyzing}
            className="bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200"
          >
            {isAnalyzing ? (
              <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Analyzing...</>
            ) : (
              <><Sparkles className="w-3 h-3 mr-2" /> Run Analysis</>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 overflow-y-auto bg-slate-50/30">
        {!analysisResult ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-indigo-300" />
            </div>
            <p className="text-sm font-medium text-slate-600">Ready to Analyze</p>
            <p className="text-xs mt-1 max-w-xs">
              Click "Run Analysis" to scan the BOM for structural risks, sourcing bottlenecks, and simulate disruption scenarios.
            </p>
          </div>
        ) : (
          <div className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-4 bg-white border border-slate-200">
                <TabsTrigger value="risks" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1.5" /> Risks
                </TabsTrigger>
                <TabsTrigger value="sourcing" className="text-xs">
                  <GitMerge className="w-3 h-3 mr-1.5" /> Sourcing
                </TabsTrigger>
                <TabsTrigger value="compliance" className="text-xs">
                  <Scale className="w-3 h-3 mr-1.5" /> Compl.
                </TabsTrigger>
                <TabsTrigger value="optimization" className="text-xs">
                  <TrendingDown className="w-3 h-3 mr-1.5" /> Opt.
                </TabsTrigger>
                <TabsTrigger value="scenarios" className="text-xs">
                  <Shuffle className="w-3 h-3 mr-1.5" /> Scenarios
                </TabsTrigger>
              </TabsList>

              <TabsContent value="risks" className="space-y-3">
                {analysisResult.risks.map((risk, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-slate-800">{risk.title}</h4>
                      <Badge variant="outline" className={
                        risk.severity === 'high' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                        risk.severity === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }>
                        {risk.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{risk.description}</p>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="sourcing" className="space-y-3">
                {analysisResult.sourcing.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700">{item.component}</Badge>
                    </div>
                    <p className="text-xs font-medium text-slate-700 mb-1">Suggestion:</p>
                    <p className="text-xs text-slate-600 mb-2">{item.suggestion}</p>
                    <p className="text-xs font-medium text-slate-700 mb-1">Impact:</p>
                    <p className="text-xs text-slate-600">{item.impact}</p>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="compliance" className="space-y-3">
                {analysisResult.compliance?.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-800">{item.regulation}</span>
                      <Badge variant="outline" className={
                        item.status === 'compliant' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' :
                        item.status === 'risk' ? 'text-amber-600 border-amber-200 bg-amber-50' :
                        'text-rose-600 border-rose-200 bg-rose-50'
                      }>{item.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-600">{item.details}</p>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="optimization" className="space-y-3">
                {analysisResult.optimization?.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-800">{item.area}</span>
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
                        {item.potential_savings}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600">{item.suggestion}</p>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="scenarios" className="space-y-3">
                {analysisResult.scenarios.map((scenario, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-semibold text-indigo-700 mb-2 flex items-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {scenario.scenario}
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="bg-rose-50 p-2 rounded border border-rose-100">
                        <span className="font-semibold text-rose-700">Impact: </span>
                        <span className="text-rose-800">{scenario.impact_analysis}</span>
                      </div>
                      <div className="bg-emerald-50 p-2 rounded border border-emerald-100">
                        <span className="font-semibold text-emerald-700">Mitigation: </span>
                        <span className="text-emerald-800">{scenario.mitigation}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}