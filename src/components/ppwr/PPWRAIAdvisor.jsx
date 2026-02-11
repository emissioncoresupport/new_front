import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sparkles, Lightbulb, TrendingUp, AlertTriangle, Leaf, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function PPWRAIAdvisor() {
  const [query, setQuery] = useState('');
  const [selectedPackaging, setSelectedPackaging] = useState(null);
  const [recommendations, setRecommendations] = useState(null);

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const analyzePackagingMutation = useMutation({
    mutationFn: async (packagingId) => {
      const pkg = packaging.find(p => p.id === packagingId);
      
      const prompt = `As an EU PPWR compliance expert, analyze this packaging and provide recommendations:

Packaging: ${pkg.packaging_name}
Material: ${pkg.material_category}
Current PCR: ${pkg.recycled_content_percentage || 0}%
Recyclability Score: ${pkg.recyclability_score || 0}/100
Empty Space: ${pkg.empty_space_ratio || 0}%
Reusable: ${pkg.is_reusable ? 'Yes' : 'No'}

PPWR Targets:
- 30% PCR by 2030 for plastic
- 40% empty space max
- Design for recyclability
- 40% reusable packaging by 2030

Provide:
1. Compliance risks (gaps vs targets)
2. Material optimization recommendations
3. Design improvements for recyclability
4. Sustainable alternatives (bio-based, recycled, reusable)
5. Cost-benefit analysis
6. Quick wins (easy improvements)

Return JSON.`;

      return await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            compliance_status: { type: "string" },
            compliance_risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk: { type: "string" },
                  severity: { type: "string" },
                  mitigation: { type: "string" }
                }
              }
            },
            material_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  material: { type: "string" },
                  benefits: { type: "string" },
                  pcr_potential: { type: "number" }
                }
              }
            },
            design_improvements: { type: "array", items: { type: "string" } },
            sustainable_alternatives: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  alternative: { type: "string" },
                  sustainability_score: { type: "number" },
                  cost_impact: { type: "string" }
                }
              }
            },
            quick_wins: { type: "array", items: { type: "string" } }
          }
        }
      });
    },
    onSuccess: (data) => {
      setRecommendations(data);
      toast.success('Analysis complete');
    }
  });

  const getTrendsMutation = useMutation({
    mutationFn: async () => {
      const prompt = `As a sustainable packaging expert, provide insights on:

1. Latest sustainable packaging innovations (Dec 2025)
2. Emerging bio-based materials
3. Circular economy packaging models
4. Digital watermarking and sorting technologies
5. Industry best practices for PPWR compliance
6. Upcoming regulatory changes

Focus on actionable trends for EU market.`;

      return await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            innovations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  innovation: { type: "string" },
                  impact: { type: "string" },
                  adoption_timeline: { type: "string" }
                }
              }
            },
            materials: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  material: { type: "string" },
                  benefits: { type: "string" },
                  availability: { type: "string" }
                }
              }
            },
            best_practices: { type: "array", items: { type: "string" } },
            regulatory_updates: { type: "array", items: { type: "string" } }
          }
        }
      });
    },
    onSuccess: (data) => {
      setRecommendations(data);
      toast.success('Trends analysis complete');
    }
  });

  const askQuestionMutation = useMutation({
    mutationFn: async (question) => {
      const prompt = `As an EU PPWR compliance expert, answer this question:

${question}

Context: EU Packaging & Packaging Waste Regulation (PPWR), December 2025
- Focus on practical, actionable advice
- Reference specific articles when relevant
- Consider cost-effectiveness`;

      return await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true
      });
    },
    onSuccess: (data) => {
      setRecommendations({ answer: data });
      toast.success('Question answered');
    }
  });

  return (
    <div className="space-y-6">
      <Card className="border-[#86b027]/20 bg-gradient-to-br from-[#86b027]/5 to-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl text-slate-900">PPWR AI Advisor</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Get expert recommendations for compliance, material optimization, and sustainable packaging trends
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-all border-[#86b027]/20" onClick={() => getTrendsMutation.mutate()}>
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 text-[#86b027]" />
            <h3 className="font-bold text-slate-900 mb-2">Sustainable Trends</h3>
            <p className="text-sm text-slate-600">Latest innovations and emerging materials</p>
          </CardContent>
        </Card>

        <Card className="border-[#02a1e8]/20">
          <CardContent className="p-6 text-center">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 text-[#02a1e8]" />
            <h3 className="font-bold text-slate-900 mb-2">Ask a Question</h3>
            <Textarea
              placeholder="e.g., What are best practices for reducing empty space in e-commerce packaging?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mb-3 min-h-[80px]"
            />
            <Button
              onClick={() => askQuestionMutation.mutate(query)}
              disabled={!query || askQuestionMutation.isPending}
              className="w-full bg-[#02a1e8] hover:bg-[#0189c9]"
            >
              Ask AI
            </Button>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-purple-600" />
            <h3 className="font-bold text-slate-900 mb-2">Analyze Packaging</h3>
            <p className="text-sm text-slate-600 mb-3">Select packaging to analyze</p>
          </CardContent>
        </Card>
      </div>

      {packaging.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Analyze Packaging Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {packaging.slice(0, 6).map((pkg) => (
                <Button
                  key={pkg.id}
                  variant="outline"
                  className="justify-start h-auto py-3"
                  onClick={() => {
                    setSelectedPackaging(pkg);
                    analyzePackagingMutation.mutate(pkg.id);
                  }}
                  disabled={analyzePackagingMutation.isPending}
                >
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">{pkg.packaging_name}</p>
                    <p className="text-xs text-slate-500">{pkg.material_category} • {pkg.recycled_content_percentage}% PCR</p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {recommendations && recommendations.compliance_risks && (
        <div className="space-y-4">
          <Card className="border-rose-200 bg-rose-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-rose-900">
                <AlertTriangle className="w-5 h-5" />
                Compliance Risks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.compliance_risks.map((risk, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-lg border border-rose-200">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-slate-900">{risk.risk}</p>
                      <Badge className={
                        risk.severity === 'high' ? 'bg-rose-500' :
                        risk.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                      }>
                        {risk.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600"><strong>Mitigation:</strong> {risk.mitigation}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {recommendations.material_recommendations && (
            <Card className="border-[#86b027]/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#86b027]">
                  <Leaf className="w-5 h-5" />
                  Material Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendations.material_recommendations.map((rec, idx) => (
                    <div key={idx} className="bg-[#86b027]/5 p-4 rounded-lg border border-[#86b027]/20">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-semibold text-slate-900">{rec.material}</p>
                        <Badge className="bg-[#86b027] text-white">{rec.pcr_potential}% PCR</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{rec.benefits}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {recommendations.quick_wins && (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-900">
                  <CheckCircle2 className="w-5 h-5" />
                  Quick Wins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {recommendations.quick_wins.map((win, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>{win}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {recommendations && recommendations.innovations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#86b027]" />
              Sustainable Packaging Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.innovations.map((innovation, idx) => (
                <div key={idx} className="border-l-4 border-[#86b027] pl-4">
                  <p className="font-semibold text-slate-900">{innovation.innovation}</p>
                  <p className="text-sm text-slate-600 mt-1">{innovation.impact}</p>
                  <Badge variant="outline" className="mt-2">{innovation.adoption_timeline}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {recommendations && recommendations.answer && (
        <Card>
          <CardHeader>
            <CardTitle>AI Answer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-slate-700">
              {recommendations.answer}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}