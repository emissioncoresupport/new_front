import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { 
  GitBranch, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  Search,
  TrendingUp,
  Package,
  Factory,
  Sparkles,
  ChevronRight,
  Eye,
  Brain,
  Shield,
  Plus
} from "lucide-react";
import EUDRTraceabilityFlow from './EUDRTraceabilityFlow';
import EUDRBatchCreationWizard from './EUDRBatchCreationWizard';

export default function EUDRTraceabilityDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [analyzingBatch, setAnalyzingBatch] = useState(null);
  const [showBatchWizard, setShowBatchWizard] = useState(false);

  const queryClient = useQueryClient();

  const { data: batches = [], isLoading: batchesLoading } = useQuery({
    queryKey: ['eudr-batches'],
    queryFn: () => base44.entities.EUDRBatch.list()
  });

  const { data: traceabilityLinks = [] } = useQuery({
    queryKey: ['eudr-traceability-links'],
    queryFn: () => base44.entities.EUDRTraceabilityLink.list()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['eudr-suppliers-trace'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: plots = [] } = useQuery({
    queryKey: ['eudr-plots-trace'],
    queryFn: () => base44.entities.EUDRPlot.list()
  });

  const { data: satelliteAnalyses = [] } = useQuery({
    queryKey: ['eudr-satellite-trace'],
    queryFn: () => base44.entities.EUDRSatelliteAnalysis.list()
  });

  // AI-powered consolidated traceability analysis
  const analyzeTraceabilityMutation = useMutation({
    mutationFn: async (batchId) => {
      setAnalyzingBatch(batchId);
      toast.loading('AI analyzing full supply chain...');

      const batch = batches.find(b => b.id === batchId);
      const batchLinks = traceabilityLinks.filter(l => l.batch_id === batch.id);

      // Gather all data
      const tier1Suppliers = batchLinks.filter(l => l.tier_level === 1).map(l => 
        suppliers.find(s => s.id === l.supplier_id)
      ).filter(Boolean);

      const tier2Suppliers = batchLinks.filter(l => l.tier_level === 2).map(l =>
        suppliers.find(s => s.id === l.supplier_id)
      ).filter(Boolean);

      const tier3Suppliers = batchLinks.filter(l => l.tier_level === 3).map(l =>
        suppliers.find(s => s.id === l.supplier_id)
      ).filter(Boolean);

      const allPlotIds = batchLinks.flatMap(l => l.plot_ids || []);
      const batchPlots = plots.filter(p => allPlotIds.includes(p.plot_id));
      
      const verifiedPlots = batchPlots.filter(p => p.satellite_verification_status === "Pass");
      const flaggedPlots = batchPlots.filter(p => p.deforestation_detected);

      // Prepare AI prompt
      const analysisPrompt = `Analyze EUDR supply chain traceability for product batch:

Batch: ${batch.batch_id}
Commodity: ${batch.commodity_type}
Quantity: ${batch.quantity} ${batch.unit}

Supply Chain Structure:
- Tier 1 (Direct): ${tier1Suppliers.length} suppliers
- Tier 2 (Processors): ${tier2Suppliers.length} suppliers  
- Tier 3 (Origin): ${tier3Suppliers.length} suppliers

Geolocation:
- Total Plots: ${batchPlots.length}
- Verified Plots: ${verifiedPlots.length}
- Flagged for Deforestation: ${flaggedPlots.length}

Risk Indicators:
${batchLinks.map(l => {
  const sup = suppliers.find(s => s.id === l.supplier_id);
  return `- Tier ${l.tier_level}: ${sup?.legal_name} (${sup?.country}) - ${l.quantity_sourced} ${batch.unit}`;
}).join('\n')}

Task: Provide comprehensive traceability assessment including:
1. Overall traceability score (0-100)
2. Risk level (Low/Medium/High/Critical)
3. Tier-specific risk scores
4. Chain of custody completeness
5. Satellite coverage assessment
6. Key risk factors
7. Actionable recommendations
8. Consolidated risk summary`;

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            traceability_score: { type: "number" },
            risk_level: { type: "string" },
            tier_1_risk: { type: "number" },
            tier_2_risk: { type: "number" },
            tier_3_risk: { type: "number" },
            chain_of_custody_score: { type: "number" },
            satellite_coverage: { type: "number" },
            key_risks: {
              type: "array",
              items: { type: "string" }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            },
            summary: { type: "string" }
          }
        }
      });

      // Update batch with analysis
      await base44.entities.EUDRBatch.update(batchId, {
        traceability_score: aiResponse.traceability_score,
        risk_level: aiResponse.risk_level,
        chain_of_custody_complete: aiResponse.chain_of_custody_score >= 90,
        total_plots: batchPlots.length,
        verified_plots: verifiedPlots.length,
        flagged_plots: flaggedPlots.length,
        satellite_coverage_percent: aiResponse.satellite_coverage,
        ai_risk_summary: aiResponse.summary,
        recommendations: aiResponse.recommendations,
        status: aiResponse.risk_level === "Low" ? "Verified" : 
                aiResponse.risk_level === "Critical" ? "Non-Compliant" : "Under Review"
      });

      // Update tier risk scores
      for (const link of batchLinks) {
        const tierRisk = link.tier_level === 1 ? aiResponse.tier_1_risk :
                         link.tier_level === 2 ? aiResponse.tier_2_risk :
                         aiResponse.tier_3_risk;
        
        await base44.entities.EUDRTraceabilityLink.update(link.id, {
          tier_risk_score: tierRisk
        });
      }

      return { batch, aiResponse };
    },
    onSuccess: ({ batch, aiResponse }) => {
      toast.dismiss();
      toast.success('Traceability analysis complete', {
        description: `Score: ${aiResponse.traceability_score}/100 (${aiResponse.risk_level} Risk)`
      });
      setAnalyzingBatch(null);
      queryClient.invalidateQueries(['eudr-batches']);
      queryClient.invalidateQueries(['eudr-traceability-links']);
    },
    onError: () => {
      toast.dismiss();
      toast.error('Analysis failed');
      setAnalyzingBatch(null);
    }
  });

  const filtered = batches.filter(b =>
    b.batch_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.product_sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.commodity_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getScoreBadge = (score) => {
    if (score >= 90) return <Badge className="bg-emerald-100 text-emerald-700">Excellent</Badge>;
    if (score >= 75) return <Badge className="bg-green-100 text-green-700">Good</Badge>;
    if (score >= 60) return <Badge className="bg-amber-100 text-amber-700">Fair</Badge>;
    return <Badge className="bg-rose-100 text-rose-700">Poor</Badge>;
  };

  const getRiskBadge = (level) => {
    const config = {
      "Low": "bg-emerald-100 text-emerald-700",
      "Medium": "bg-amber-100 text-amber-700",
      "High": "bg-rose-100 text-rose-700",
      "Critical": "bg-red-100 text-red-700"
    };
    return <Badge className={config[level] || config["Medium"]}>{level} Risk</Badge>;
  };

  const stats = {
    total: batches.length,
    verified: batches.filter(b => b.status === "Verified").length,
    underReview: batches.filter(b => b.status === "Under Review").length,
    nonCompliant: batches.filter(b => b.status === "Non-Compliant").length
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 uppercase mb-1">Total Batches</div>
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-emerald-600 uppercase mb-1">Verified</div>
            <div className="text-2xl font-bold text-emerald-600">{stats.verified}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-amber-600 uppercase mb-1">Under Review</div>
            <div className="text-2xl font-bold text-amber-600">{stats.underReview}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-rose-600 uppercase mb-1">Non-Compliant</div>
            <div className="text-2xl font-bold text-rose-600">{stats.nonCompliant}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search batches by ID, SKU, or commodity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button 
          onClick={() => setShowBatchWizard(true)}
          className="bg-[#86b027] hover:bg-[#769c22] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Batch
        </Button>
      </div>

      <EUDRBatchCreationWizard 
        open={showBatchWizard}
        onOpenChange={setShowBatchWizard}
      />

      {/* Batch List */}
      <div className="grid gap-4">
        {batchesLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No batches found</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(batch => {
            const batchLinks = traceabilityLinks.filter(l => l.batch_id === batch.id);
            const isAnalyzing = analyzingBatch === batch.id;

            return (
              <Card key={batch.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-3 bg-gradient-to-br from-[#86b027]/10 to-emerald-50 rounded-lg">
                        <Package className="w-6 h-6 text-[#86b027]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{batch.batch_id}</CardTitle>
                          {batch.status && (
                            <Badge variant="outline" className={
                              batch.status === "Verified" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              batch.status === "Non-Compliant" ? "bg-rose-50 text-rose-700 border-rose-200" :
                              "bg-amber-50 text-amber-700 border-amber-200"
                            }>
                              {batch.status}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-3 text-sm text-slate-600">
                          <span>SKU: {batch.product_sku}</span>
                          <span>• {batch.commodity_type}</span>
                          <span>• {batch.quantity} {batch.unit}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {batch.traceability_score !== undefined && (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-slate-900">{batch.traceability_score}%</div>
                          <div className="text-xs text-slate-500">Traceability</div>
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedBatch(selectedBatch?.id === batch.id ? null : batch)}
                        className="gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        {selectedBatch?.id === batch.id ? 'Hide' : 'View'} Chain
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => analyzeTraceabilityMutation.mutate(batch.id)}
                        disabled={isAnalyzing}
                        className="bg-[#86b027] hover:bg-[#769c22] text-white gap-1"
                      >
                        {isAnalyzing ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                        ) : (
                          <><Brain className="w-4 h-4" /> AI Analyze</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Quick Metrics */}
                  {batch.traceability_score !== undefined && (
                    <div className="grid grid-cols-5 gap-3">
                      <div className="p-3 bg-slate-50 rounded-lg border text-center">
                        <div className="text-xs text-slate-500 mb-1">Risk Level</div>
                        {getRiskBadge(batch.risk_level)}
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border text-center">
                        <div className="text-xs text-slate-500 mb-1">Tier 1</div>
                        <div className="text-lg font-bold">{batch.tier_1_suppliers?.length || 0}</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border text-center">
                        <div className="text-xs text-slate-500 mb-1">Total Plots</div>
                        <div className="text-lg font-bold">{batch.total_plots || 0}</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border text-center">
                        <div className="text-xs text-slate-500 mb-1">Verified</div>
                        <div className="text-lg font-bold text-emerald-600">{batch.verified_plots || 0}</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border text-center">
                        <div className="text-xs text-slate-500 mb-1">Flagged</div>
                        <div className="text-lg font-bold text-rose-600">{batch.flagged_plots || 0}</div>
                      </div>
                    </div>
                  )}

                  {/* AI Summary */}
                  {batch.ai_risk_summary && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <Brain className="h-4 w-4 text-blue-600" />
                      <AlertDescription>
                        <div className="text-sm text-blue-900">
                          <strong>AI Risk Summary:</strong> {batch.ai_risk_summary}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Recommendations */}
                  {batch.recommendations && batch.recommendations.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <h5 className="text-sm font-bold text-amber-900 mb-2">Recommended Actions:</h5>
                      <ul className="space-y-1">
                        {batch.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                            <ChevronRight className="w-4 h-4 shrink-0 mt-0.5" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Traceability Flow Visualization */}
                  {selectedBatch?.id === batch.id && (
                    <div className="pt-4 border-t">
                      <EUDRTraceabilityFlow
                        batch={batch}
                        links={batchLinks}
                        suppliers={suppliers}
                        plots={plots}
                        satelliteAnalyses={satelliteAnalyses}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}