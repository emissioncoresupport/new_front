import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { TrendingUp, AlertTriangle, CheckCircle, Sparkles, Loader2, Target } from "lucide-react";

export default function VSMEGapAnalysis({ report, disclosures }) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const runGapAnalysis = async () => {
    setIsAnalyzing(true);
    toast.loading('Running AI-powered gap analysis...');

    try {
      const basicDisclosures = disclosures.filter(d => d.module_type === 'basic');
      const comprehensiveDisclosures = disclosures.filter(d => d.module_type === 'comprehensive');

      const basicCompleted = basicDisclosures.filter(d => d.status === 'completed').length;
      const comprehensiveCompleted = comprehensiveDisclosures.filter(d => d.status === 'completed').length;

      const prompt = `You are a VSME compliance expert. Analyze the current VSME reporting status and provide a comprehensive gap analysis:

Current Status:
- Basic Module: ${basicCompleted}/11 completed
- Comprehensive Module: ${comprehensiveCompleted}/9 completed
- Disclosures: ${JSON.stringify(disclosures.map(d => ({ code: d.disclosure_code, status: d.status, category: d.disclosure_category })))}

Provide detailed gap analysis with:
1. Overall readiness score (0-100)
2. Priority gaps to address (list of missing/incomplete disclosures with impact)
3. Category-specific gaps (general, environmental, social, governance)
4. Resource allocation recommendations
5. Timeline estimation for completion
6. Quick wins (easiest disclosures to complete)
7. Actionable next steps

Return JSON structure with these keys.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            readiness_score: { type: "number" },
            priority_gaps: { type: "array", items: { type: "object" } },
            category_gaps: { type: "object" },
            resource_recommendations: { type: "array", items: { type: "string" } },
            timeline_weeks: { type: "number" },
            quick_wins: { type: "array", items: { type: "string" } },
            next_steps: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAnalysis(result);
      toast.success('Gap analysis complete');
    } catch (error) {
      toast.error('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#86b027]/5 to-white border-[#86b027]/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-[#545454] mb-2">VSME Gap Analysis</h3>
              <p className="text-sm text-slate-600">
                Identify missing data and prioritize actions to achieve VSME compliance
              </p>
            </div>
            <Button
              onClick={runGapAnalysis}
              disabled={isAnalyzing}
              className="bg-[#86b027] hover:bg-[#769c22]"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!analysis && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Analysis Yet</h3>
            <p className="text-sm text-slate-500 mb-6">
              Run an AI-powered gap analysis to identify missing disclosures and get prioritized recommendations
            </p>
          </CardContent>
        </Card>
      )}

      {analysis && (
        <div className="space-y-6">
          {/* Readiness Score */}
          <Card className="border-[#86b027]/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-[#545454]">Overall Readiness</h4>
                <div className="text-right">
                  <div className="text-4xl font-bold text-[#86b027]">{analysis.readiness_score}%</div>
                  <p className="text-xs text-slate-500">Compliance Score</p>
                </div>
              </div>
              <Progress value={analysis.readiness_score} className="h-3" />
              <p className="text-xs text-slate-600 mt-3">
                Estimated completion: {analysis.timeline_weeks} weeks
              </p>
            </CardContent>
          </Card>

          {/* Priority Gaps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Priority Gaps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.priority_gaps?.map((gap, idx) => (
                <div key={idx} className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-bold text-rose-900">{gap.disclosure}</h5>
                    <Badge className="bg-rose-600 text-white">High Impact</Badge>
                  </div>
                  <p className="text-sm text-rose-700">{gap.impact}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Wins */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-5 h-5 text-[#86b027]" />
                Quick Wins
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analysis.quick_wins?.map((win, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#86b027] mt-0.5 shrink-0" />
                  <span className="text-slate-700">{win}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommended Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analysis.next_steps?.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-[#86b027]/5 rounded-lg">
                  <span className="font-bold text-[#86b027] shrink-0">{idx + 1}</span>
                  <span className="text-sm text-slate-700">{step}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}