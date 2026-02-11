import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, AlertTriangle, TrendingDown, Calendar, FileText, 
  CheckCircle2, XCircle, ArrowRight, Zap, Shield, DollarSign,
  Clock, Bell, AlertCircle, Target, Lightbulb
} from "lucide-react";
import { toast } from "sonner";

export default function CBAMProactiveAdvisor() {
  const [insights, setInsights] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('alerts');

  const queryClient = useQueryClient();

  const { data: emissionEntries = [] } = useQuery({
    queryKey: ['cbam-emission-entries'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['cbam-certificates'],
    queryFn: () => base44.entities.CBAMCertificate.list()
  });

  const runProactiveAnalysis = async () => {
    setIsAnalyzing(true);
    
    try {
      const totalEmissions = emissionEntries.reduce((sum, e) => sum + (e.total_embedded_emissions || 0), 0);
      const activeBalance = certificates.filter(c => c.status === 'active').reduce((sum, c) => sum + c.quantity, 0);
      const entriesWithDefaults = emissionEntries.filter(e => !e.supplier_id || e.data_quality_rating === 'low');
      const highRiskCountries = emissionEntries.filter(e => ['China', 'India', 'Indonesia'].includes(e.country_of_origin));

      const analysisPrompt = `
You are an expert CBAM compliance advisor. Analyze the following data and provide actionable recommendations:

Current Status:
- Total embedded emissions: ${totalEmissions.toFixed(2)} tCO2
- Certificate balance: ${activeBalance} units
- Entries using default benchmarks: ${entriesWithDefaults.length} out of ${emissionEntries.length}
- High-risk origin countries: ${highRiskCountries.length} entries

Suppliers: ${suppliers.length} total suppliers
Recent entries: ${emissionEntries.slice(0, 5).map(e => `${e.product_name} from ${e.country_of_origin}`).join(', ')}

Provide 5-7 specific, actionable recommendations covering:
1. Compliance risks and how to mitigate them
2. Cost-saving opportunities (supplier switches, data quality improvements)
3. Upcoming regulatory deadlines (2026 transition to full CBAM)
4. Certificate procurement strategy
5. Data quality improvements
6. Supply chain optimization

Format as JSON array:
[
  {
    "title": "Brief title",
    "description": "Detailed recommendation",
    "category": "compliance|cost|regulatory|optimization",
    "priority": "critical|high|medium|low",
    "impact": "Brief impact description",
    "action": "Specific action to take"
  }
]
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  priority: { type: "string" },
                  impact: { type: "string" },
                  action: { type: "string" }
                }
              }
            }
          }
        }
      });

      setInsights(response.recommendations || []);
      toast.success('AI analysis complete');
    } catch (error) {
      toast.error('Failed to run analysis');
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (emissionEntries.length > 0) {
      runProactiveAnalysis();
    }
  }, [emissionEntries.length]);

  const categoryConfig = {
    compliance: { icon: Shield, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
    cost: { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    regulatory: { icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    optimization: { icon: Target, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' }
  };

  const priorityConfig = {
    critical: { badge: 'bg-rose-600 text-white', icon: AlertTriangle },
    high: { badge: 'bg-amber-600 text-white', icon: AlertCircle },
    medium: { badge: 'bg-blue-600 text-white', icon: Bell },
    low: { badge: 'bg-slate-600 text-white', icon: Lightbulb }
  };

  const filteredInsights = insights.filter(insight => {
    if (activeTab === 'alerts') return ['critical', 'high'].includes(insight.priority);
    if (activeTab === 'compliance') return insight.category === 'compliance';
    if (activeTab === 'savings') return insight.category === 'cost';
    if (activeTab === 'regulatory') return insight.category === 'regulatory';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-[#86b027]" />
            AI-Powered CBAM Advisor
          </h2>
          <p className="text-slate-500 mt-1">
            Proactive insights, compliance alerts, and cost optimization recommendations powered by AI
          </p>
        </div>
        <Button 
          onClick={runProactiveAnalysis}
          disabled={isAnalyzing}
          className="bg-gradient-to-r from-[#86b027] to-[#02a1e8] text-white"
        >
          {isAnalyzing ? (
            <>
              <Zap className="w-4 h-4 mr-2 animate-pulse" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Refresh Analysis
            </>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-rose-200 bg-rose-50/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-rose-700 font-semibold">Critical Issues</p>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-3xl font-bold text-rose-900">
              {insights.filter(i => i.priority === 'critical').length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-emerald-700 font-semibold">Cost Opportunities</p>
              <TrendingDown className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-emerald-900">
              {insights.filter(i => i.category === 'cost').length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-blue-700 font-semibold">Regulatory Updates</p>
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-900">
              {insights.filter(i => i.category === 'regulatory').length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-purple-700 font-semibold">Optimizations</p>
              <Target className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-900">
              {insights.filter(i => i.category === 'optimization').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Insights Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="alerts">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Priority Alerts
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <Shield className="w-4 h-4 mr-2" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="savings">
            <TrendingDown className="w-4 h-4 mr-2" />
            Cost Savings
          </TabsTrigger>
          <TabsTrigger value="regulatory">
            <Calendar className="w-4 h-4 mr-2" />
            Regulatory
          </TabsTrigger>
          <TabsTrigger value="all">All Insights</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {filteredInsights.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="py-12 text-center">
                {isAnalyzing ? (
                  <>
                    <Zap className="w-12 h-12 mx-auto mb-3 text-[#86b027] animate-pulse" />
                    <p className="text-slate-500">Running AI analysis...</p>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                    <p className="text-slate-500">No issues detected in this category</p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredInsights.map((insight, idx) => {
              const categoryStyle = categoryConfig[insight.category] || categoryConfig.optimization;
              const priorityStyle = priorityConfig[insight.priority] || priorityConfig.medium;
              const CategoryIcon = categoryStyle.icon;
              const PriorityIcon = priorityStyle.icon;

              return (
                <Card 
                  key={idx} 
                  className={`border-2 ${categoryStyle.border} ${categoryStyle.bg} hover:shadow-lg transition-all`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${categoryStyle.bg} border ${categoryStyle.border}`}>
                          <CategoryIcon className={`w-5 h-5 ${categoryStyle.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-slate-900">{insight.title}</h4>
                            <Badge className={priorityStyle.badge}>
                              <PriorityIcon className="w-3 h-3 mr-1" />
                              {insight.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-700 mb-3">{insight.description}</p>
                          
                          {insight.impact && (
                            <div className="p-3 bg-white rounded-lg border border-slate-200 mb-3">
                              <p className="text-xs text-slate-500 font-semibold mb-1">Expected Impact</p>
                              <p className="text-sm text-slate-700">{insight.impact}</p>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-sm">
                            <ArrowRight className={`w-4 h-4 ${categoryStyle.color}`} />
                            <span className="font-semibold text-slate-900">Recommended Action:</span>
                            <span className="text-slate-700">{insight.action}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}