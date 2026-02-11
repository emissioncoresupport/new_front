import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Minus, Target, Award, AlertCircle, Loader2, BarChart3 } from "lucide-react";

export default function VSMEBenchmarking({ disclosures, report }) {
  const [benchmarkData, setBenchmarkData] = useState(null);

  // Auto-generate benchmark on mount if we have data
  React.useEffect(() => {
    if (disclosures.filter(d => d.status === 'completed').length >= 3 && !benchmarkData) {
      generateBenchmarkMutation.mutate();
    }
  }, [disclosures]);

  const generateBenchmarkMutation = useMutation({
    mutationFn: async () => {
      const completedDisclosures = disclosures.filter(d => d.status === 'completed');
      
      const prompt = `You are an ESG benchmarking expert. Analyze the following VSME sustainability data and compare it against European SME industry benchmarks.

Company Data:
${JSON.stringify(completedDisclosures.map(d => ({
  code: d.disclosure_code,
  category: d.disclosure_category,
  data: d.data_points,
  narrative: d.narrative
})), null, 2)}

Company Size: ${report?.company_size || 'medium'}
Sector: General SME

Provide detailed benchmarking analysis with:
1. overall_score: Number 0-100 representing company's overall ESG performance
2. industry_average: Number 0-100 for typical SME performance
3. top_quartile: Number 0-100 for best-in-class SMEs
4. category_benchmarks: Array of objects for each category (environmental, social, governance) with:
   - category: string
   - company_score: number 0-100
   - industry_average: number 0-100
   - top_quartile: number 0-100
   - trend: "improving" | "stable" | "declining"
5. strengths: Array of 3-5 strings describing areas where company excels
6. improvement_opportunities: Array of 3-5 objects with:
   - area: string
   - current_score: number
   - target_score: number
   - action_steps: array of strings
7. peer_comparison: String explaining how company compares to similar SMEs
8. recognition_potential: Array of certifications/awards company could pursue

Format as JSON.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            industry_average: { type: "number" },
            top_quartile: { type: "number" },
            category_benchmarks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  company_score: { type: "number" },
                  industry_average: { type: "number" },
                  top_quartile: { type: "number" },
                  trend: { type: "string" }
                }
              }
            },
            strengths: { type: "array", items: { type: "string" } },
            improvement_opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  current_score: { type: "number" },
                  target_score: { type: "number" },
                  action_steps: { type: "array", items: { type: "string" } }
                }
              }
            },
            peer_comparison: { type: "string" },
            recognition_potential: { type: "array", items: { type: "string" } }
          }
        }
      });

      return result;
    },
    onSuccess: (data) => {
      setBenchmarkData(data);
      toast.success('Benchmarking analysis completed');
    }
  });

  const getTrendIcon = (trend) => {
    if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-[#86b027]" />;
    if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-rose-600" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/90 backdrop-blur-sm shadow-xl border border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-[#02a1e8]/10 to-[#02a1e8]/5 rounded-xl">
                <BarChart3 className="w-6 h-6 text-[#02a1e8]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#545454]">ESG Benchmarking Analysis</h3>
                <p className="text-sm text-slate-600">Compare your performance against industry standards</p>
              </div>
            </div>
            <Button
              onClick={() => generateBenchmarkMutation.mutate()}
              disabled={generateBenchmarkMutation.isPending || disclosures.filter(d => d.status === 'completed').length === 0}
              className="bg-[#02a1e8] hover:bg-[#0191d1] shadow-lg"
            >
              {generateBenchmarkMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Run Benchmark
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {benchmarkData && (
        <>
          {/* Overall Performance */}
          <div className="grid grid-cols-3 gap-6">
            <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-2 border-[#86b027]/20">
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-600 mb-2">Your Score</p>
                  <p className="text-5xl font-bold text-[#86b027] mb-2">{benchmarkData.overall_score}</p>
                  <p className="text-xs text-slate-500">out of 100</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm shadow-lg border border-slate-200">
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-600 mb-2">Industry Average</p>
                  <p className="text-5xl font-bold text-slate-700 mb-2">{benchmarkData.industry_average}</p>
                  <Badge className={
                    benchmarkData.overall_score > benchmarkData.industry_average 
                      ? 'bg-[#86b027]' 
                      : 'bg-amber-500'
                  }>
                    {benchmarkData.overall_score > benchmarkData.industry_average ? 'Above Average' : 'Below Average'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm shadow-lg border border-slate-200">
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-600 mb-2">Top Quartile</p>
                  <p className="text-5xl font-bold text-[#02a1e8] mb-2">{benchmarkData.top_quartile}</p>
                  <p className="text-xs text-slate-500">Best-in-class SMEs</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Benchmarks */}
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Performance by Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {benchmarkData.category_benchmarks.map((cat, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#545454] capitalize">{cat.category}</span>
                      {getTrendIcon(cat.trend)}
                      <Badge variant="outline" className="text-xs">{cat.trend}</Badge>
                    </div>
                    <span className="text-sm font-bold text-[#545454]">{cat.company_score}/100</span>
                  </div>
                  
                  <div className="relative">
                    <Progress value={(cat.company_score / cat.top_quartile) * 100} className="h-3" />
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                      <span>You: {cat.company_score}</span>
                      <span>Avg: {cat.industry_average}</span>
                      <span>Top: {cat.top_quartile}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Strengths */}
          <Card className="bg-gradient-to-br from-[#86b027]/5 to-white/90 backdrop-blur-sm shadow-lg border-2 border-[#86b027]/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-5 h-5 text-[#86b027]" />
                Your Competitive Advantages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {benchmarkData.strengths.map((strength, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-white/80 rounded-lg border border-[#86b027]/10">
                  <Award className="w-4 h-4 text-[#86b027] shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-700">{strength}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Improvement Opportunities */}
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border border-slate-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-5 h-5 text-[#02a1e8]" />
                Priority Improvement Areas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {benchmarkData.improvement_opportunities.map((opp, idx) => (
                <Card key={idx} className="bg-gradient-to-r from-blue-50/50 to-white border border-blue-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-[#545454]">{opp.area}</h4>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Target</p>
                        <p className="text-lg font-bold text-[#02a1e8]">{opp.target_score}</p>
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-600">Current: {opp.current_score}</span>
                        <span className="text-slate-600">Gap: {opp.target_score - opp.current_score} points</span>
                      </div>
                      <Progress value={(opp.current_score / opp.target_score) * 100} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-700 mb-2">Action Steps:</p>
                      {opp.action_steps.map((step, stepIdx) => (
                        <div key={stepIdx} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="text-[#02a1e8] font-bold">{stepIdx + 1}.</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Peer Comparison */}
          <Card className="bg-gradient-to-r from-slate-50 to-white/90 backdrop-blur-sm shadow-lg border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl">
                  <BarChart3 className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <h4 className="font-bold text-[#545454] mb-2">Peer Comparison</h4>
                  <p className="text-sm text-slate-700">{benchmarkData.peer_comparison}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recognition Potential */}
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border border-slate-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Certifications & Awards You Can Pursue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {benchmarkData.recognition_potential.map((cert, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-gradient-to-r from-amber-50 to-white rounded-lg border border-amber-100">
                    <Award className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-sm font-medium text-slate-700">{cert}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!benchmarkData && (
        <Card className="border-dashed bg-white/60 backdrop-blur-sm shadow-md">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Benchmarking Data Yet</h3>
            <p className="text-sm text-slate-500">
              Run benchmarking analysis to see how you compare against industry peers
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}