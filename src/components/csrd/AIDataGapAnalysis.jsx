import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, AlertCircle, FileText, CheckCircle2, Loader2, TrendingUp, Database } from "lucide-react";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function AIDataGapAnalysis({ dataPoints = [], materialTopics = [] }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [gapAnalysis, setGapAnalysis] = useState(null);
  const queryClient = useQueryClient();

  const createDataPointMutation = useMutation({
    mutationFn: (data) => base44.entities.CSRDDataPoint.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['csrd-data-points'] })
  });

  const createNarrativeMutation = useMutation({
    mutationFn: (data) => base44.entities.CSRDNarrative.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['csrd-narratives'] })
  });

  const analyzeDataGaps = async () => {
    setIsAnalyzing(true);
    const loadingToast = toast.loading('🤖 AI analyzing data gaps across all ESRS standards...');

    try {
      // Gather context about the company
      const [suppliers, products, ghgReports] = await Promise.all([
        base44.entities.Supplier.list(),
        base44.entities.Product.list(),
        base44.entities.GHGReport.list()
      ]);

      // Build comprehensive context
      const companyContext = {
        material_topics: materialTopics.map(t => ({
          esrs_standard: t.esrs_standard,
          topic: t.topic_name,
          impact_score: t.impact_materiality_score,
          financial_score: t.financial_materiality_score
        })),
        existing_data_points: dataPoints.map(dp => ({
          esrs_standard: dp.esrs_standard,
          esrs_code: dp.esrs_code,
          metric: dp.metric_name
        })),
        industry_context: {
          supplier_count: suppliers.length,
          product_count: products.length,
          has_ghg_data: ghgReports.length > 0,
          high_risk_suppliers: suppliers.filter(s => s.risk_level === 'high' || s.risk_level === 'critical').length
        }
      };

      // Invoke AI for comprehensive gap analysis
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert CSRD/ESRS compliance consultant. Analyze the company's current CSRD data collection status and identify ALL missing data points across ESRS standards.

**Company Context:**
- Material ESRS topics: ${JSON.stringify(companyContext.material_topics, null, 2)}
- Already collected data points: ${JSON.stringify(companyContext.existing_data_points, null, 2)}
- Industry context: ${JSON.stringify(companyContext.industry_context, null, 2)}

**Your Task:**
For EACH material ESRS standard, identify:
1. ALL missing mandatory disclosure requirements per EFRAG guidance
2. Missing quantitative metrics (GHG emissions, water, waste, workforce, etc.)
3. Missing qualitative disclosures (policies, processes, targets)
4. Data source suggestions (internal systems, supplier surveys, external databases)
5. Priority level (Critical/High/Medium) based on materiality and regulatory importance
6. Draft narrative disclosures to fill identified gaps

Focus on:
- ESRS E1 (Climate): Scope 1,2,3 emissions, energy, transition plans
- ESRS E2 (Pollution): Air, water, soil emissions
- ESRS E3 (Water): Water consumption, discharge, stress
- ESRS E4 (Biodiversity): Impact assessments, protected areas
- ESRS E5 (Circular Economy): Waste generation, recycling rates
- ESRS S1 (Own Workforce): Employee metrics, health & safety, training
- ESRS S2 (Workers in Value Chain): Supplier workforce conditions
- ESRS S3 (Affected Communities): Community engagement, impacts
- ESRS S4 (Consumers): Product safety, data privacy
- ESRS G1 (Governance): Board composition, anti-corruption

Return comprehensive gap analysis with actionable recommendations.`,
        response_json_schema: {
          type: "object",
          properties: {
            gaps_by_standard: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  esrs_standard: { type: "string" },
                  total_gaps: { type: "number" },
                  critical_gaps: { type: "number" },
                  missing_data_points: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        esrs_code: { type: "string" },
                        metric_name: { type: "string" },
                        description: { type: "string" },
                        data_type: { type: "string" },
                        suggested_unit: { type: "string" },
                        priority: { type: "string" },
                        suggested_sources: { type: "array", items: { type: "string" } },
                        draft_narrative: { type: "string" }
                      }
                    }
                  }
                }
              }
            },
            overall_summary: {
              type: "object",
              properties: {
                total_gaps: { type: "number" },
                critical_count: { type: "number" },
                high_count: { type: "number" },
                completion_rate: { type: "number" },
                next_steps: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      });

      const analysis = typeof response === 'string' ? JSON.parse(response) : response;
      setGapAnalysis(analysis);

      toast.dismiss(loadingToast);
      toast.success(`✅ Analysis complete! Found ${analysis.overall_summary.total_gaps} data gaps across ESRS standards.`);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Gap analysis failed: ' + error.message);
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const autoFillGap = async (standard, gap) => {
    const loadingToast = toast.loading('Creating data point and narrative...');
    
    try {
      // Create data point placeholder
      await createDataPointMutation.mutateAsync({
        esrs_standard: standard,
        esrs_code: gap.esrs_code,
        metric_name: gap.metric_name,
        unit: gap.suggested_unit,
        data_source: gap.suggested_sources?.[0] || 'AI Suggested - To be collected',
        verification_status: 'Unverified',
        reporting_year: new Date().getFullYear(),
        notes: gap.description
      });

      // Create draft narrative if available
      if (gap.draft_narrative) {
        await createNarrativeMutation.mutateAsync({
          esrs_standard: standard,
          disclosure_requirement: gap.esrs_code,
          section_title: gap.metric_name,
          content: gap.draft_narrative,
          status: 'ai_assisted',
          reporting_year: new Date().getFullYear()
        });
      }

      toast.dismiss(loadingToast);
      toast.success(`✅ Created placeholder for ${gap.metric_name}`);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to create data point');
    }
  };

  const autoFillAllGaps = async () => {
    if (!gapAnalysis) return;
    
    const loadingToast = toast.loading('Auto-filling all identified gaps...');
    let created = 0;

    try {
      for (const standard of gapAnalysis.gaps_by_standard) {
        for (const gap of standard.missing_data_points) {
          await autoFillGap(standard.esrs_standard, gap);
          created++;
        }
      }

      toast.dismiss(loadingToast);
      toast.success(`✅ Created ${created} data point placeholders!`);
      setGapAnalysis(null);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Auto-fill failed');
    }
  };

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Data Gap Analysis
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              Identify missing ESRS disclosures and auto-generate draft narratives
            </p>
          </div>
          <Button 
            onClick={analyzeDataGaps}
            disabled={isAnalyzing}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isAnalyzing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Run Gap Analysis</>
            )}
          </Button>
        </div>
      </CardHeader>

      {gapAnalysis && (
        <CardContent className="space-y-6">
          {/* Overall Summary */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600">Total Gaps</p>
                    <p className="text-2xl font-bold text-slate-900">{gapAnalysis.overall_summary.total_gaps}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600">Critical</p>
                    <p className="text-2xl font-bold text-rose-600">{gapAnalysis.overall_summary.critical_count}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-rose-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600">High Priority</p>
                    <p className="text-2xl font-bold text-orange-600">{gapAnalysis.overall_summary.high_count}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600">Completion</p>
                    <p className="text-2xl font-bold text-emerald-600">{gapAnalysis.overall_summary.completion_rate}%</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <Button onClick={autoFillAllGaps} className="bg-[#86b027] hover:bg-[#769c22]">
              <Database className="w-4 h-4 mr-2" />
              Auto-Fill All Gaps (Create Placeholders)
            </Button>
          </div>

          {/* Gaps by Standard */}
          <Accordion type="multiple" className="space-y-2">
            {gapAnalysis.gaps_by_standard.map((standard, idx) => (
              <AccordionItem key={idx} value={`standard-${idx}`} className="border rounded-lg bg-white">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <Badge className="font-mono">{standard.esrs_standard}</Badge>
                      <span className="font-semibold">{standard.total_gaps} gaps found</span>
                    </div>
                    {standard.critical_gaps > 0 && (
                      <Badge className="bg-rose-100 text-rose-700">
                        {standard.critical_gaps} critical
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {standard.missing_data_points.map((gap, gapIdx) => (
                      <Card key={gapIdx} className="border-l-4" style={{
                        borderLeftColor: gap.priority === 'Critical' ? '#ef4444' : gap.priority === 'High' ? '#f97316' : '#3b82f6'
                      }}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="font-mono text-xs">{gap.esrs_code}</Badge>
                                <Badge className={
                                  gap.priority === 'Critical' ? 'bg-rose-100 text-rose-700' :
                                  gap.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                                  'bg-blue-100 text-blue-700'
                                }>
                                  {gap.priority}
                                </Badge>
                              </div>
                              <p className="font-bold text-slate-900">{gap.metric_name}</p>
                              <p className="text-sm text-slate-600 mt-1">{gap.description}</p>
                              
                              {gap.suggested_sources?.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-semibold text-slate-700 mb-1">Suggested Data Sources:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {gap.suggested_sources.map((source, i) => (
                                      <Badge key={i} variant="outline" className="text-xs">
                                        {source}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {gap.draft_narrative && (
                                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-[#02a1e8]" />
                                    <p className="text-xs font-semibold text-slate-700">AI Draft Narrative:</p>
                                  </div>
                                  <p className="text-xs text-slate-600 leading-relaxed">{gap.draft_narrative}</p>
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => autoFillGap(standard.esrs_standard, gap)}
                              className="ml-4"
                              variant="outline"
                            >
                              Create Placeholder
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Next Steps */}
          {gapAnalysis.overall_summary.next_steps?.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h4 className="font-bold text-[#02a1e8] mb-2">Recommended Next Steps:</h4>
                <ul className="space-y-1">
                  {gapAnalysis.overall_summary.next_steps.map((step, i) => (
                    <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-[#02a1e8] font-bold">→</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </CardContent>
      )}
    </Card>
  );
}