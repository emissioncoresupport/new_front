import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Target, FileCheck, AlertTriangle, TrendingUp, Users, ArrowRight, Globe, Sparkles, Zap } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, BarChart, Bar, Legend } from 'recharts';

export default function CSRDDashboard({ setActiveTab }) {
  const [isAutomating, setIsAutomating] = React.useState(false);
  const queryClient = useQueryClient();
  const { data: materialityTopics = [] } = useQuery({
    queryKey: ['csrd-materiality-topics'],
    queryFn: () => base44.entities.CSRDMaterialityTopic.list()
  });

  const { data: dataPoints = [] } = useQuery({
    queryKey: ['csrd-data-points'],
    queryFn: () => base44.entities.CSRDDataPoint.list()
  });

  const currentYear = new Date().getFullYear();

  const stats = {
    totalTopics: materialityTopics.length,
    materialTopics: materialityTopics.filter(t => t.is_material).length,
    dataPointsCollected: dataPoints.filter(d => d.reporting_year === currentYear).length,
    dataCompleteness: dataPoints.length > 0 
      ? Math.round((dataPoints.filter(d => d.verification_status !== 'Unverified').length / dataPoints.length) * 100)
      : 0,
    externallyAssured: dataPoints.filter(d => d.verification_status === 'Externally Assured').length
  };

  // Double Materiality Matrix Data
  const matrixData = materialityTopics.map(t => ({
    name: t.topic_name,
    impact: t.impact_materiality_score || 0,
    financial: t.financial_materiality_score || 0,
    isMaterial: t.is_material,
    esrs: t.esrs_standard
  }));

  // ESRS Coverage
  const esrsStandards = ['ESRS E1', 'ESRS E2', 'ESRS E3', 'ESRS E4', 'ESRS E5', 'ESRS S1', 'ESRS S2', 'ESRS S3', 'ESRS S4', 'ESRS G1'];
  const esrsCoverage = esrsStandards.map(std => {
    const topics = materialityTopics.filter(t => t.esrs_standard === std);
    const dataPointsCount = dataPoints.filter(d => d.esrs_standard === std).length;
    return {
      standard: std.replace('ESRS ', ''),
      topics: topics.length,
      materialTopics: topics.filter(t => t.is_material).length,
      dataPoints: dataPointsCount
    };
  });

  const handleRunAutomation = async () => {
    setIsAutomating(true);
    const loadingToast = toast.loading('🚀 Running full CSRD automation...');

    try {
      const { runFullAutomation } = await import('./CSRDAutomationEngine');
      const results = await runFullAutomation();

      queryClient.invalidateQueries({ queryKey: ['csrd-materiality-topics'] });
      queryClient.invalidateQueries({ queryKey: ['csrd-data-points'] });
      queryClient.invalidateQueries({ queryKey: ['csrd-tasks'] });

      toast.dismiss(loadingToast);
      toast.success(`✅ Automation complete! ${results.data_collected} data points collected, ${results.tasks_generated} tasks created.`);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Automation failed: ' + error.message);
    } finally {
      setIsAutomating(false);
    }
  };

  return (
    <div className="space-y-4 mt-16">
      {/* AI Automation */}
      {stats.materialTopics === 0 && stats.dataPointsCollected === 0 && (
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent pointer-events-none"></div>
          <div className="relative flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#86b027]/20 to-[#86b027]/5 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-[0_4px_16px_rgba(134,176,39,0.15)]">
                <Zap className="w-6 h-6 text-[#86b027]" />
              </div>
              <div>
                <h3 className="text-xl font-light text-slate-900 mb-2">Quick Start: Full Automation</h3>
                <p className="text-sm text-slate-600 font-light mb-4 max-w-2xl">
                  Let AI analyze your company data, assess materiality for all ESRS topics, 
                  auto-collect metrics from SupplyLens/CCF/DPP modules, generate tasks, and notify you - all in one click.
                </p>
                <Button 
                  onClick={handleRunAutomation} 
                  disabled={isAutomating}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-md font-light"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isAutomating ? 'Running Automation...' : 'Run Full CSRD Automation'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative text-center py-6 px-5">
            <Target className="w-6 h-6 text-[#86b027] mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-4xl font-extralight text-slate-900 mb-2">{stats.totalTopics}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Total Topics</p>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative text-center py-6 px-5">
            <FileCheck className="w-6 h-6 text-emerald-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-4xl font-extralight text-slate-900 mb-2">{stats.materialTopics}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Material</p>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-[#02a1e8]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative text-center py-6 px-5">
            <TrendingUp className="w-6 h-6 text-[#02a1e8] mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-4xl font-extralight text-slate-900 mb-2">{stats.dataPointsCollected}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Data Points</p>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative text-center py-6 px-5">
            <Globe className="w-6 h-6 text-[#86b027] mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-4xl font-extralight text-slate-900 mb-2">{stats.dataCompleteness}%</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Quality</p>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative text-center py-6 px-5">
            <Users className="w-6 h-6 text-slate-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-4xl font-extralight text-slate-900 mb-2">{stats.externallyAssured}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Assured</p>
          </div>
        </div>
      </div>

      {/* Double Materiality Matrix */}
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative p-6">
          <h3 className="text-xl font-extralight text-slate-900 mb-1">Double Materiality Assessment Matrix</h3>
          <p className="text-sm text-slate-500 font-light mb-6">Impact Materiality (Y-axis) vs Financial Materiality (X-axis)</p>
          <div>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="financial" 
                name="Financial Materiality" 
                domain={[0, 10]}
                label={{ value: 'Financial Materiality →', position: 'bottom' }}
              />
              <YAxis 
                type="number" 
                dataKey="impact" 
                name="Impact Materiality" 
                domain={[0, 10]}
                label={{ value: '← Impact Materiality', angle: -90, position: 'left' }}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                if (payload && payload.length > 0) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border border-slate-200 rounded shadow-lg">
                      <p className="font-bold">{data.name}</p>
                      <p className="text-xs text-slate-600">{data.esrs}</p>
                      <p className="text-sm">Impact: {data.impact}/10</p>
                      <p className="text-sm">Financial: {data.financial}/10</p>
                      {data.isMaterial && <Badge className="mt-1 bg-emerald-500">Material</Badge>}
                    </div>
                  );
                }
                return null;
              }} />
              <Scatter name="Topics" data={matrixData}>
                {matrixData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isMaterial ? '#86b027' : '#cbd5e1'}
                    r={entry.isMaterial ? 8 : 5}
                  />
                ))}
              </Scatter>
              {/* Threshold line at 5,5 */}
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#94a3b8" strokeDasharray="5 5" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#94a3b8" strokeDasharray="5 5" />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#86b027]" />
              <span>Material Topics</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-slate-300" />
              <span>Non-Material</span>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* ESRS Coverage */}
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#02a1e8]/5 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative p-6">
          <h3 className="text-xl font-extralight text-slate-900 mb-6">ESRS Standards Coverage</h3>
          <div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={esrsCoverage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="standard" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="materialTopics" fill="#86b027" name="Material Topics" />
              <Bar dataKey="dataPoints" fill="#02a1e8" name="Data Points Collected" />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Action Items */}
      <div className="relative bg-gradient-to-br from-amber-50/60 via-amber-50/40 to-amber-50/30 backdrop-blur-xl rounded-2xl border border-amber-300/40 shadow-[0_4px_16px_rgba(251,191,36,0.12)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100/20 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-light text-amber-900">Next Steps for CSRD Compliance</h3>
          </div>
          <div>
          <div className="space-y-3">
            {stats.materialTopics === 0 && (
              <div className="flex items-center justify-between p-5 bg-white/60 backdrop-blur-md rounded-xl border border-white/60 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#86b027]" />
                  <div>
                    <p className="font-light text-slate-900">Complete Double Materiality Assessment</p>
                    <p className="text-sm text-slate-500 font-light">Identify material ESG topics with stakeholders</p>
                  </div>
                </div>
                <Button onClick={() => setActiveTab('materiality')} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-md font-light">
                  Start Assessment <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
            {stats.dataCompleteness < 80 && (
              <div className="flex items-center justify-between p-5 bg-white/60 backdrop-blur-md rounded-xl border border-white/60 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <FileCheck className="w-5 h-5 text-[#02a1e8]" />
                  <div>
                    <p className="font-light text-slate-900">Improve Data Collection</p>
                    <p className="text-sm text-slate-500 font-light">Current data quality: {stats.dataCompleteness}%</p>
                  </div>
                </div>
                <Button onClick={() => setActiveTab('datacollection')} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-md font-light">
                  Collect Data <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}