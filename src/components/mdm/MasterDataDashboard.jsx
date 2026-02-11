import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { 
  Database, TrendingUp, AlertTriangle, CheckCircle2, 
  Package, Building2, GitMerge, Activity, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MasterDataDashboard({ onNavigate }) {
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts'],
    queryFn: () => base44.entities.Part.list()
  });

  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ['supplier-part-mappings'],
    queryFn: () => base44.entities.SupplierPartMapping.list()
  });

  const { data: boms = [] } = useQuery({
    queryKey: ['boms'],
    queryFn: () => base44.entities.BOM.list()
  });

  const { data: riskSignals = [] } = useQuery({
    queryKey: ['risk-signals', 'open'],
    queryFn: () => base44.entities.RiskSignal.filter({ status: 'open' })
  });

  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ['approval-tasks', 'pending'],
    queryFn: () => base44.entities.ApprovalTask.filter({ status: 'pending' })
  });

  const { data: changeLogs = [] } = useQuery({
    queryKey: ['change-logs'],
    queryFn: () => base44.entities.ChangeLog.list('-created_date', 100)
  });

  const { data: qualityScores = [] } = useQuery({
    queryKey: ['quality-scores'],
    queryFn: () => base44.entities.DataQualityScore.list('-computed_at', 50)
  });

  const { data: dedupeQueue = [] } = useQuery({
    queryKey: ['dedupe-suggestions', 'proposed'],
    queryFn: () => base44.entities.DedupeSuggestion.filter({ status: 'proposed' })
  });

  // Calculate metrics
  const metrics = {
    totalSuppliers: suppliers.length,
    activeSuppliers: suppliers.filter(s => s.status === 'active').length,
    draftSuppliers: suppliers.filter(s => s.status === 'draft').length,
    supersededSuppliers: suppliers.filter(s => s.status === 'superseded').length,
    
    totalParts: parts.length,
    activeParts: parts.filter(p => p.status === 'active').length,
    
    totalSKUs: skus.length,
    activeSKUs: skus.filter(s => s.status === 'active').length,
    
    approvedMappings: mappings.filter(m => m.status === 'approved').length,
    proposedMappings: mappings.filter(m => m.status === 'proposed').length,
    partCoverage: parts.length > 0 
      ? Math.round((mappings.filter(m => m.status === 'approved').length / parts.length) * 100)
      : 0,
    
    publishedBOMs: boms.filter(b => b.status === 'published').length,
    draftBOMs: boms.filter(b => b.status === 'draft').length,
    
    avgDataQuality: qualityScores.length > 0
      ? Math.round(qualityScores.reduce((sum, q) => sum + (q.overall_score || 0), 0) / qualityScores.length)
      : 0,
    
    openRisks: riskSignals.length,
    criticalRisks: riskSignals.filter(r => r.severity === 'critical').length,
    
    pendingApprovals: pendingApprovals.length,
    dedupeQueue: dedupeQueue.length,
    
    recentChanges: changeLogs.filter(c => {
      const changeDate = new Date(c.created_date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return changeDate >= weekAgo;
    }).length
  };

  // Coverage by SKU Category
  const skusByCategory = skus.reduce((acc, sku) => {
    const cat = sku.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = { category: cat, total: 0, mapped: 0 };
    acc[cat].total++;
    if (mappings.some(m => m.sku_id === sku.id)) acc[cat].mapped++;
    return acc;
  }, {});

  const coverageByCategory = Object.values(skusByCategory).map(c => ({
    name: c.category,
    coverage: Math.round((c.mapped / c.total) * 100),
    total: c.total
  }));

  // Data Quality Distribution
  const qualityDistribution = [
    { name: 'Excellent (90-100%)', value: suppliers.filter(s => (s.data_completeness || 0) >= 90).length },
    { name: 'Good (70-89%)', value: suppliers.filter(s => (s.data_completeness || 0) >= 70 && (s.data_completeness || 0) < 90).length },
    { name: 'Fair (50-69%)', value: suppliers.filter(s => (s.data_completeness || 0) >= 50 && (s.data_completeness || 0) < 70).length },
    { name: 'Poor (<50%)', value: suppliers.filter(s => (s.data_completeness || 0) < 50).length }
  ];

  const COLORS = ['#86b027', '#02a1e8', '#545454', '#cbd5e1'];

  return (
    <div className="space-y-6">
      {/* Hero Tesla Metrics with Glassmorphism */}
      <div className="grid grid-cols-3 gap-3">
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden cursor-pointer group hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all" onClick={() => onNavigate?.('suppliers')}>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-[#86b027]/5 pointer-events-none"></div>
          <div className="relative text-center py-4 px-4">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br from-[#86b027]/20 to-[#86b027]/5 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-[0_4px_16px_rgba(134,176,39,0.15)] group-hover:scale-110 transition-transform">
              <Building2 className="w-4 h-4 text-[#86b027]" />
            </div>
            <p className="text-3xl font-extralight text-slate-900 mb-1.5">{metrics.activeSuppliers}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Active Suppliers</p>
            <p className="text-[10px] text-slate-400">{metrics.draftSuppliers} draft</p>
          </div>
        </div>
        
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden cursor-pointer group hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all" onClick={() => onNavigate?.('products')}>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-[#02a1e8]/5 pointer-events-none"></div>
          <div className="relative text-center py-4 px-4">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br from-[#02a1e8]/20 to-[#02a1e8]/5 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-[0_4px_16px_rgba(2,161,232,0.15)] group-hover:scale-110 transition-transform">
              <Package className="w-4 h-4 text-[#02a1e8]" />
            </div>
            <div className="flex items-baseline justify-center gap-1.5 mb-1.5">
              <p className="text-3xl font-extralight text-slate-900">{metrics.activeParts}</p>
              <p className="text-xs font-light text-slate-500">parts</p>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Materials</p>
            <p className="text-[10px] text-slate-400">{metrics.partCoverage}% mapped</p>
          </div>
        </div>
        
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden cursor-pointer group hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all" onClick={() => onNavigate?.('normalization')}>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-slate-400/5 pointer-events-none"></div>
          <div className="relative text-center py-4 px-4">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br from-slate-400/20 to-slate-400/5 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-[0_4px_16px_rgba(100,116,139,0.15)] group-hover:scale-110 transition-transform">
              <Database className="w-4 h-4 text-slate-600" />
            </div>
            <div className="flex items-baseline justify-center gap-1.5 mb-1.5">
              <p className="text-3xl font-extralight text-slate-900">{metrics.avgDataQuality}</p>
              <p className="text-xs font-light text-slate-500">%</p>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Data Quality</p>
            <p className="text-[10px] text-slate-400">completeness</p>
          </div>
        </div>
      </div>

      {/* Secondary Glassmorphic Metrics */}
      <div className="grid grid-cols-4 gap-3">
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-xl border border-white/50 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all cursor-pointer group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#86b027]/20 to-[#86b027]/5 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-[0_2px_8px_rgba(134,176,39,0.15)]">
              <GitMerge className="w-4 h-4 text-[#86b027]" />
            </div>
            <p className="text-4xl font-extralight text-slate-900">{metrics.approvedMappings}</p>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Mappings</p>
        </div>

        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-xl border border-white/50 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all cursor-pointer group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#02a1e8]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#02a1e8]/20 to-[#02a1e8]/5 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-[0_2px_8px_rgba(2,161,232,0.15)]">
              <CheckCircle2 className="w-4 h-4 text-[#02a1e8]" />
            </div>
            <p className="text-4xl font-extralight text-slate-900">{metrics.pendingApprovals}</p>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Pending</p>
        </div>

        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-xl border border-white/50 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all cursor-pointer group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500/20 to-rose-500/5 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-[0_2px_8px_rgba(244,63,94,0.15)]">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-4xl font-extralight text-slate-900">{metrics.openRisks}</p>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Risks</p>
        </div>

        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-xl border border-white/50 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all cursor-pointer group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-400/20 to-slate-400/5 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-[0_2px_8px_rgba(100,116,139,0.15)]">
              <Activity className="w-4 h-4 text-slate-600" />
            </div>
            <p className="text-4xl font-extralight text-slate-900">{metrics.recentChanges}</p>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Activity</p>
        </div>
      </div>

      {/* Analytics Grid with Glassmorphism */}
      <div className="grid grid-cols-3 gap-4">
        {/* SKU Coverage Chart */}
        <div className="col-span-2 relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
          <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-light text-slate-900">SKU Coverage</h3>
              <p className="text-xs text-slate-500 mt-0.5">Mapping status</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-extralight text-slate-900">{metrics.partCoverage}%</p>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Overall</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={coverageByCategory} barGap={6}>
              <CartesianGrid strokeDasharray="0" stroke="#e2e8f0" vertical={false} horizontal={true} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 300 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                contentStyle={{ 
                  backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                  backdropFilter: 'blur(10px)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: 300,
                  padding: '6px 10px',
                  color: 'white',
                  boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.3)'
                }}
              />
              <Bar 
                dataKey="coverage" 
                fill="#86b027"
                radius={[3, 3, 0, 0]}
                maxBarSize={35}
              />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Data Quality Scorecard */}
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
          <div className="relative">
          <div className="mb-4">
            <h3 className="text-lg font-light text-slate-900">Quality Score</h3>
            <p className="text-xs text-slate-500 mt-0.5">Completeness</p>
          </div>
          <div className="text-center mb-6">
            <p className="text-5xl font-extralight text-slate-900">{metrics.avgDataQuality}%</p>
            <p className="text-xs text-slate-400 uppercase tracking-wider mt-2">Average</p>
          </div>
          <div className="space-y-3">
            {qualityDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx] }} />
                  <span className="text-xs text-slate-600 flex-1">{item.name.replace(/[()]/g, '')}</span>
                </div>
                <span className="text-sm font-light text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>

      {/* Activity Feed with Glassmorphism */}
      <div className="grid grid-cols-2 gap-4">
        {/* Risk Signals */}
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50/20 via-transparent to-transparent pointer-events-none"></div>
          <div className="relative">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-rose-500/5 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-[0_2px_8px_rgba(244,63,94,0.15)]">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-light text-slate-900">Risk Signals</h3>
                <p className="text-xs text-slate-500 mt-0.5">Active alerts</p>
              </div>
            </div>
            <p className="text-3xl font-extralight text-slate-900">{metrics.openRisks}</p>
          </div>

          {riskSignals.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[#86b027]/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-[#86b027]" />
              </div>
              <p className="text-sm text-slate-900 font-medium">All Clear</p>
              <p className="text-xs text-slate-500 mt-1">No active risks</p>
            </div>
          ) : (
            <div className="space-y-1">
              {riskSignals.slice(0, 5).map(signal => (
                <div key={signal.id} className="py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-slate-900 capitalize mb-1">
                        {signal.signal_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-1">{signal.description}</p>
                    </div>
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ml-3",
                      signal.severity === 'critical' ? 'bg-rose-500' : 'bg-amber-500'
                    )} />
                  </div>
                </div>
                ))}
                </div>
                )}
                </div>
                </div>

                {/* Pending Approvals */}
                <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#02a1e8]/5 via-transparent to-transparent pointer-events-none"></div>
                <div className="relative">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#02a1e8]/20 to-[#02a1e8]/5 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-[0_2px_8px_rgba(2,161,232,0.15)]">
                <CheckCircle2 className="w-5 h-5 text-[#02a1e8]" />
              </div>
              <div>
                <h3 className="text-lg font-light text-slate-900">Approvals</h3>
                <p className="text-xs text-slate-500 mt-0.5">Review queue</p>
              </div>
            </div>
            <p className="text-3xl font-extralight text-slate-900">{metrics.pendingApprovals}</p>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[#86b027]/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-[#86b027]" />
              </div>
              <p className="text-sm text-slate-900 font-medium">All Caught Up</p>
              <p className="text-xs text-slate-500 mt-1">Nothing to review</p>
            </div>
          ) : (
            <div className="space-y-1">
              {pendingApprovals.slice(0, 5).map(task => (
                <div key={task.id} className="py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-slate-900 capitalize">
                        {task.task_type.replace(/_/g, ' ').replace('approve ', '')}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">by {task.requested_by}</p>
                    </div>
                    <span className="text-xs text-slate-400 uppercase">{task.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
          </div>
          </div>
          </div>
          );
          }