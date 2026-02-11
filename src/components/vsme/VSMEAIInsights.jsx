import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, Target, Loader2, ChevronRight, CheckCircle } from "lucide-react";

export default function VSMEAIInsights({ disclosures, report }) {
  const [insights, setInsights] = useState(null);

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const completedDisclosures = disclosures.filter(d => d.status === 'completed');
      const missingDisclosures = disclosures.filter(d => d.status === 'not_started');

      const prompt = `You are an ESG expert analyzing VSME sustainability data. Based on the following disclosures, provide actionable insights:

Completed Disclosures:
${JSON.stringify(completedDisclosures, null, 2)}

Missing Disclosures:
${missingDisclosures.map(d => `${d.disclosure_code}: ${d.disclosure_title}`).join('\n')}

Provide a structured analysis with:
1. key_strengths: Array of 3-5 strong points in current ESG performance
2. improvement_areas: Array of 3-5 specific areas needing improvement with actionable steps
3. priority_actions: Array of 3 immediate actions to take
4. compliance_score: Number 0-100 representing overall VSME compliance readiness
5. benchmarking_insights: How this compares to typical SME performance
6. data_quality_score: Number 0-100 for data completeness and reliability
7. missing_critical_data: Array of critical gaps that need immediate attention

Format as JSON.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            key_strengths: { type: "array", items: { type: "string" } },
            improvement_areas: { type: "array", items: { type: "string" } },
            priority_actions: { type: "array", items: { type: "string" } },
            compliance_score: { type: "number" },
            benchmarking_insights: { type: "string" },
            data_quality_score: { type: "number" },
            missing_critical_data: { type: "array", items: { type: "string" } }
          }
        }
      });

      return result;
    },
    onSuccess: (data) => {
      setInsights(data);
      toast.success('AI insights generated');
    }
  });

  return (
    <div className="space-y-6">
      <Card className="bg-white/95 backdrop-blur-sm shadow-xl border border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#545454]">AI-Powered ESG Insights</h3>
                <p className="text-sm text-slate-600">Get personalized recommendations to improve your sustainability performance</p>
              </div>
            </div>
            <Button
              onClick={() => generateInsightsMutation.mutate()}
              disabled={generateInsightsMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {generateInsightsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {insights && (
        <>
          {/* Scores */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-white/95 backdrop-blur-sm shadow-lg border border-slate-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Compliance Readiness</span>
                  <TrendingUp className="w-5 h-5 text-[#86b027]" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-[#86b027]">{insights.compliance_score}</span>
                  <span className="text-lg text-slate-500">/100</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/95 backdrop-blur-sm shadow-lg border border-slate-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Data Quality</span>
                  <Target className="w-5 h-5 text-[#02a1e8]" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-[#02a1e8]">{insights.data_quality_score}</span>
                  <span className="text-lg text-slate-500">/100</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Strengths */}
          <Card className="bg-white/95 backdrop-blur-sm shadow-lg border border-slate-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#86b027]" />
                Key Strengths
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.key_strengths.map((strength, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-[#86b027]/5 rounded-lg border border-[#86b027]/20">
                  <CheckCircle className="w-4 h-4 text-[#86b027] shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-700">{strength}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Improvement Areas */}
          <Card className="bg-white/95 backdrop-blur-sm shadow-lg border border-slate-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                Improvement Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.improvement_areas.map((area, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-700">{area}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Priority Actions */}
          <Card className="bg-white/95 backdrop-blur-sm shadow-lg border border-rose-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Priority Actions Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.priority_actions.map((action, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-rose-50 rounded-lg border border-rose-200">
                  <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-slate-700 flex-1">{action}</p>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Benchmarking */}
          <Card className="bg-white/95 backdrop-blur-sm shadow-lg border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold text-[#545454] mb-2">Benchmarking Insights</h4>
                  <p className="text-sm text-slate-700">{insights.benchmarking_insights}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Critical Data Gaps */}
          {insights.missing_critical_data.length > 0 && (
            <Card className="bg-white/95 backdrop-blur-sm shadow-lg border border-rose-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  Critical Data Gaps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {insights.missing_critical_data.map((gap, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-rose-50 rounded border border-rose-200 text-sm text-rose-900">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {gap}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!insights && (
        <Card className="border-dashed bg-white/60 backdrop-blur-sm shadow-md">
          <CardContent className="p-12 text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-300" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Insights Generated Yet</h3>
            <p className="text-sm text-slate-500">
              Click "Generate Insights" to get AI-powered recommendations for your ESG performance
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}