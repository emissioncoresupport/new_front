import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Package, QrCode, CheckCircle2, AlertTriangle, TrendingUp, Globe, Leaf, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DPPDashboard({ setActiveTab }) {
  const { data: dppRecords = [] } = useQuery({
    queryKey: ['dpp-records'],
    queryFn: () => base44.entities.DPPRecord.list('-created_date')
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const stats = {
    totalProducts: products.length,
    withDPP: dppRecords.filter(d => d.status === 'published').length,
    draft: dppRecords.filter(d => d.status === 'draft').length,
    avgCircularity: dppRecords.length > 0 
      ? Math.round(dppRecords.reduce((sum, d) => sum + (d.circularity_metrics?.recyclability_score || 0), 0) / dppRecords.length)
      : 0,
    coverage: products.length > 0 ? Math.round((dppRecords.filter(d => d.status === 'published').length / products.length) * 100) : 0
  };

  const statusData = [
    { name: 'Published', value: dppRecords.filter(d => d.status === 'published').length, color: '#10b981' },
    { name: 'Draft', value: dppRecords.filter(d => d.status === 'draft').length, color: '#f59e0b' },
    { name: 'Updated', value: dppRecords.filter(d => d.status === 'updated').length, color: '#3b82f6' },
    { name: 'No DPP', value: products.length - dppRecords.length, color: '#ef4444' }
  ];

  return (
    <div className="space-y-4 mt-16">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative text-center py-6 px-5">
            <Package className="w-6 h-6 text-slate-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-4xl font-extralight text-slate-900 mb-2">{stats.totalProducts}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Products</p>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative text-center py-6 px-5">
            <QrCode className="w-6 h-6 text-emerald-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-4xl font-extralight text-slate-900 mb-2">{stats.withDPP}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Published</p>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative text-center py-6 px-5">
            <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-4xl font-extralight text-slate-900 mb-2">{stats.draft}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Draft</p>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative text-center py-6 px-5">
            <Leaf className="w-6 h-6 text-[#86b027] mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-4xl font-extralight text-slate-900 mb-2">{stats.avgCircularity}/10</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Circularity</p>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-[#02a1e8]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative text-center py-6 px-5">
            <TrendingUp className="w-6 h-6 text-[#02a1e8] mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-4xl font-extralight text-slate-900 mb-2">{stats.coverage}%</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Coverage</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
          <div className="relative p-6">
            <h3 className="text-xl font-extralight text-slate-900 mb-6">DPP Status Distribution</h3>
            <div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" labelLine={false} label={entry => entry.name} outerRadius={80} dataKey="value">
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent pointer-events-none"></div>
          <div className="relative p-6">
            <h3 className="text-xl font-extralight text-slate-900 mb-6">Circularity Metrics Overview</h3>
            <div>
            <div className="space-y-4">
              {dppRecords.slice(0, 5).map((dpp, idx) => {
                const product = products.find(p => p.id === dpp.product_id);
                const score = dpp.circularity_metrics?.recyclability_score || 0;
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-light text-slate-700">{product?.name || 'Unknown'}</span>
                      <span className="text-slate-500 font-light">{score}/10</span>
                    </div>
                    <div className="w-full bg-white/40 rounded-full h-2">
                      <div 
                        className="bg-[#86b027] h-2 rounded-full transition-all"
                        style={{ width: `${(score / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Items */}
      <div className="relative bg-gradient-to-br from-amber-50/60 via-amber-50/40 to-amber-50/30 backdrop-blur-xl rounded-2xl border border-amber-300/40 shadow-[0_4px_16px_rgba(251,191,36,0.12)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100/20 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-light text-amber-900">Action Required</h3>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 font-light">
              {stats.totalProducts - stats.withDPP} Products Missing DPP
            </Badge>
          </div>
          <div>
          <div className="space-y-3">
            {stats.coverage < 100 && (
              <div className="flex items-center justify-between p-5 bg-white/60 backdrop-blur-md rounded-xl border border-white/60 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-light text-slate-900">Complete DPP Coverage</p>
                    <p className="text-sm text-slate-500 font-light">
                      {stats.totalProducts - stats.withDPP} products need Digital Product Passports
                    </p>
                  </div>
                </div>
                <Button onClick={() => setActiveTab('registry')} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-md font-light">
                  Go to Registry <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
            {stats.draft > 0 && (
              <div className="flex items-center justify-between p-5 bg-white/60 backdrop-blur-md rounded-xl border border-white/60 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-light text-slate-900">Publish Draft DPPs</p>
                    <p className="text-sm text-slate-500 font-light">{stats.draft} DPPs ready for publication</p>
                  </div>
                </div>
                <Button onClick={() => setActiveTab('publisher')} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-md font-light">
                  Publish <ArrowRight className="w-4 h-4 ml-2" />
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