import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, TrendingUp, Zap, Package, Sparkles, 
  BarChart3, CheckCircle2, Loader2, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ProductPrioritization() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  // AI-Powered Product Segmentation
  const analyzePriority = async () => {
    setIsAnalyzing(true);
    try {
      const productsData = products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        weight_kg: p.weight_kg,
        pcf_co2e: p.pcf_co2e,
        expected_lifetime: p.expected_lifetime
      }));

      const prompt = `
        Analyze this product portfolio and segment products into 3 LCA priority tiers:
        
        Products:
        ${JSON.stringify(productsData, null, 2)}
        
        **LCA Prioritization Framework:**
        
        1. **Full LCA (Top 10%)** - High revenue, high impact, complex products
           - Comprehensive cradle-to-grave analysis
           - Primary data collection required
           - Detailed component-level modeling
        
        2. **Streamlined LCA (Middle 20%)** - Moderate complexity
           - Simplified modeling with key hotspots
           - Mix of primary and secondary data
           - Standard process templates
        
        3. **Screening LCA (Remaining 70%)** - Low complexity, use proxies
           - Generic emission factors and extrapolation
           - Secondary data only
           - Product family averages
        
        Assign each product to a tier based on:
        - Estimated revenue impact (infer from category)
        - Environmental significance (weight, expected impact)
        - Product complexity
        - Regulatory importance
        
        Return assignments with reasoning.
      `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            assignments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product_id: { type: "string" },
                  lca_tier: { type: "string", enum: ["full", "streamlined", "screening"] },
                  reasoning: { type: "string" },
                  estimated_effort_hours: { type: "number" },
                  data_collection_priority: { type: "string", enum: ["high", "medium", "low"] }
                }
              }
            },
            summary: {
              type: "object",
              properties: {
                full_lca_count: { type: "number" },
                streamlined_count: { type: "number" },
                screening_count: { type: "number" },
                total_effort_reduction: { type: "string" }
              }
            }
          }
        }
      });

      // Update products with LCA tier assignments
      for (const assignment of result.assignments) {
        await base44.entities.Product.update(assignment.product_id, {
          lca_stage: assignment.lca_tier,
          notes: (products.find(p => p.id === assignment.product_id)?.notes || '') + 
            `\n\n[AI Priority Analysis] ${assignment.reasoning}\nEstimated effort: ${assignment.estimated_effort_hours}h`
        });
      }

      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(
        `Portfolio segmented: ${result.summary.full_lca_count} Full LCA, ${result.summary.streamlined_count} Streamlined, ${result.summary.screening_count} Screening`,
        { duration: 5000 }
      );

    } catch (error) {
      console.error('Prioritization failed:', error);
      toast.error('Failed to analyze product priorities');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fullLCA = products.filter(p => p.lca_stage === 'full' || p.lca_stage === 'full_lca');
  const streamlined = products.filter(p => p.lca_stage === 'streamlined');
  const screening = products.filter(p => p.lca_stage === 'screening');
  const unassigned = products.filter(p => !p.lca_stage || p.lca_stage === 'none');

  const effortReduction = products.length > 0 
    ? Math.round(((streamlined.length * 0.5 + screening.length * 0.85) / products.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#545454] flex items-center gap-2">
            <Target className="w-5 h-5 text-[#86b027]" />
            LCA Prioritization Strategy
          </h3>
          <p className="text-sm text-slate-500">Smart segmentation to reduce workload by 60-70%</p>
        </div>
        <Button 
          onClick={analyzePriority}
          disabled={isAnalyzing || products.length === 0}
          className="bg-gradient-to-r from-[#86b027] to-[#769c22] hover:from-[#769c22] hover:to-[#86b027] text-white shadow-lg"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing Portfolio...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              AI Prioritize Products
            </>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-[#86b027]/20 bg-gradient-to-br from-[#86b027]/5 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-[#86b027] text-white">Full LCA</Badge>
              <Target className="w-5 h-5 text-[#86b027]" />
            </div>
            <p className="text-3xl font-bold text-[#545454]">{fullLCA.length}</p>
            <p className="text-xs text-slate-500 mt-1">Top 10% - High Impact</p>
            <p className="text-xs text-slate-600 mt-2">Comprehensive analysis required</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-blue-600 text-white">Streamlined</Badge>
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-[#545454]">{streamlined.length}</p>
            <p className="text-xs text-slate-500 mt-1">Middle 20% - Moderate</p>
            <p className="text-xs text-slate-600 mt-2">50% less effort vs full</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-purple-600 text-white">Screening</Badge>
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-[#545454]">{screening.length}</p>
            <p className="text-xs text-slate-500 mt-1">Remaining 70% - Low</p>
            <p className="text-xs text-slate-600 mt-2">Use proxies & extrapolation</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline">Efficiency Gain</Badge>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-emerald-600">{effortReduction}%</p>
            <p className="text-xs text-slate-500 mt-1">Workload reduction</p>
            <p className="text-xs text-slate-600 mt-2">vs. full LCA for all</p>
          </CardContent>
        </Card>
      </div>

      {/* Segmentation Details */}
      <div className="grid grid-cols-3 gap-6">
        {/* Full LCA Tier */}
        <Card className="border-[#86b027]/20">
          <CardHeader className="pb-3 bg-gradient-to-br from-[#86b027]/5 to-white">
            <CardTitle className="text-base font-bold text-[#545454] flex items-center gap-2">
              <Target className="w-4 h-4 text-[#86b027]" />
              Full LCA Products
            </CardTitle>
            <CardDescription>Comprehensive cradle-to-grave analysis</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {fullLCA.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No products assigned</p>
            ) : (
              <div className="space-y-2">
                {fullLCA.slice(0, 5).map(p => (
                  <div key={p.id} className="p-2 bg-white border border-slate-200 rounded-lg hover:border-[#86b027] transition-colors">
                    <p className="font-medium text-sm text-slate-900 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.sku}</p>
                  </div>
                ))}
                {fullLCA.length > 5 && (
                  <p className="text-xs text-slate-500 text-center pt-2">+{fullLCA.length - 5} more</p>
                )}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-600">
                <strong>Approach:</strong> Primary data, detailed BOM, all lifecycle stages
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Streamlined Tier */}
        <Card className="border-blue-200">
          <CardHeader className="pb-3 bg-gradient-to-br from-blue-50 to-white">
            <CardTitle className="text-base font-bold text-[#545454] flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              Streamlined LCA
            </CardTitle>
            <CardDescription>Key hotspots focus</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {streamlined.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No products assigned</p>
            ) : (
              <div className="space-y-2">
                {streamlined.slice(0, 5).map(p => (
                  <div key={p.id} className="p-2 bg-white border border-slate-200 rounded-lg hover:border-blue-600 transition-colors">
                    <p className="font-medium text-sm text-slate-900 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.sku}</p>
                  </div>
                ))}
                {streamlined.length > 5 && (
                  <p className="text-xs text-slate-500 text-center pt-2">+{streamlined.length - 5} more</p>
                )}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-600">
                <strong>Approach:</strong> Simplified model, mix of primary/secondary data
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Screening Tier */}
        <Card className="border-purple-200">
          <CardHeader className="pb-3 bg-gradient-to-br from-purple-50 to-white">
            <CardTitle className="text-base font-bold text-[#545454] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              Screening LCA
            </CardTitle>
            <CardDescription>Proxies & extrapolation</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {screening.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No products assigned</p>
            ) : (
              <div className="space-y-2">
                {screening.slice(0, 5).map(p => (
                  <div key={p.id} className="p-2 bg-white border border-slate-200 rounded-lg hover:border-purple-600 transition-colors">
                    <p className="font-medium text-sm text-slate-900 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.sku}</p>
                  </div>
                ))}
                {screening.length > 5 && (
                  <p className="text-xs text-slate-500 text-center pt-2">+{screening.length - 5} more</p>
                )}
              </div>
            )}
            <div className="mt-4 pt-4 border-slate-100 border-t">
              <p className="text-xs text-slate-600">
                <strong>Approach:</strong> Generic factors, industry averages, quick estimation
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Methodology Guide */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#545454]">
            Scalable LCA Methodology
          </CardTitle>
          <CardDescription>Based on ISO 14040/14044 with practical prioritization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-[#86b027]/5 rounded-lg border border-[#86b027]/20">
              <h4 className="font-bold text-sm text-[#545454] mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#86b027]" />
                Full LCA (Top 10%)
              </h4>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• Primary data from suppliers</li>
                <li>• All lifecycle stages</li>
                <li>• Component-level detail</li>
                <li>• Site-specific data</li>
                <li>• Third-party verification</li>
              </ul>
              <div className="mt-3 pt-3 border-t border-[#86b027]/20">
                <p className="text-xs font-bold text-[#86b027]">Effort: ~40-80 hours/product</p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-bold text-sm text-[#545454] mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                Streamlined (20%)
              </h4>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• Focus on key hotspots</li>
                <li>• Mix primary/secondary data</li>
                <li>• Standard process templates</li>
                <li>• Simplified transport</li>
                <li>• Internal review</li>
              </ul>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs font-bold text-blue-600">Effort: ~15-25 hours/product</p>
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-bold text-sm text-[#545454] mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                Screening (70%)
              </h4>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• Generic emission factors</li>
                <li>• Industry averages</li>
                <li>• Product family proxies</li>
                <li>• Extrapolation from similar</li>
                <li>• Automated calculation</li>
              </ul>
              <div className="mt-3 pt-3 border-t border-purple-200">
                <p className="text-xs font-bold text-purple-600">Effort: ~2-5 hours/product</p>
              </div>
            </div>
          </div>

          {unassigned.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-bold text-amber-800 mb-2">
                ⚠️ {unassigned.length} products not yet prioritized
              </p>
              <p className="text-xs text-amber-700">
                Run AI analysis to automatically segment your portfolio and reduce LCA workload by up to 70%.
              </p>
            </div>
          )}

          {effortReduction > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-emerald-800">
                    Estimated Workload Reduction: {effortReduction}%
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    Focus effort where it matters most - high-revenue, high-impact products
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}