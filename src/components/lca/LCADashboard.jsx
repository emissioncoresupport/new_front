import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Leaf, TrendingUp, AlertCircle, CheckCircle2, BarChart3, FileText, Clock } from "lucide-react";
import { toast } from "sonner";
import CreateLCAStudyModal from './CreateLCAStudyModal';

export default function LCADashboard({ onStudyClick }) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: studies = [] } = useQuery({
    queryKey: ['lca-studies'],
    queryFn: () => base44.entities.LCAStudy.list('-created_date')
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: impactResults = [] } = useQuery({
    queryKey: ['lca-impact-results'],
    queryFn: () => base44.entities.LCAImpactResult.list()
  });

  // Calculate statistics
  const stats = {
    total: studies.length,
    inProgress: studies.filter(s => s.status === 'In Progress').length,
    completed: studies.filter(s => s.status === 'Completed').length,
    avgCompletion: studies.length > 0 
      ? Math.round(studies.reduce((sum, s) => sum + (s.completion_percentage || 0), 0) / studies.length)
      : 0
  };

  const recentStudies = studies.slice(0, 5);

  return (
    <div className="space-y-4 mt-16">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-[#86b027]/5 pointer-events-none"></div>
        <div className="relative px-8 py-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-white/40 backdrop-blur-xl border border-white/60 flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                <Leaf className="w-6 h-6 text-[#86b027]" />
              </div>
              <div>
                <h1 className="text-2xl font-light tracking-tight text-slate-900">Life Cycle Assessment</h1>
                <p className="text-sm text-slate-500 font-light mt-0.5">ISO 14040/14044 compliant environmental impact assessment</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-md font-light"
            >
              <Plus className="w-4 h-4 mr-2" />
              New LCA Study
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative text-center py-6 px-5">
            <BarChart3 className="w-6 h-6 text-slate-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-4xl font-extralight text-slate-900 mb-2">{stats.total}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Studies</p>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative text-center py-6 px-5">
            <Clock className="w-6 h-6 text-amber-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-4xl font-extralight text-slate-900 mb-2">{stats.inProgress}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">In Progress</p>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative text-center py-6 px-5">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-4xl font-extralight text-slate-900 mb-2">{stats.completed}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Completed</p>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-[#02a1e8]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative text-center py-6 px-5">
            <TrendingUp className="w-6 h-6 text-[#02a1e8] mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-4xl font-extralight text-slate-900 mb-2">{stats.avgCompletion}%</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Avg Complete</p>
          </div>
        </div>
      </div>

      {/* Recent Studies */}
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative p-6">
          <h3 className="text-xl font-extralight text-slate-900 mb-1">Recent Studies</h3>
          <p className="text-sm text-slate-500 font-light mb-6">Latest LCA studies and their status</p>
          <div>
          {recentStudies.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100/60 backdrop-blur-md border border-white/60 flex items-center justify-center">
                <Leaf className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-lg font-light text-slate-900 mb-2">No LCA studies yet</p>
              <p className="text-sm text-slate-500">Create your first study to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentStudies.map(study => {
                const product = products.find(p => p.id === study.product_id);
                return (
                  <div 
                    key={study.id}
                    onClick={() => onStudyClick(study.id)}
                    className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-xl rounded-xl border border-white/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="relative flex items-center justify-between p-5"
                  >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-light text-slate-900">{study.study_name}</p>
                          <Badge className={
                            study.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border-0 font-light' :
                            study.status === 'In Progress' ? 'bg-amber-100 text-amber-700 border-0 font-light' :
                            'bg-slate-100 text-slate-700 border-0 font-light'
                          }>
                            {study.status}
                          </Badge>
                          {study.iso_compliant && (
                            <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 font-light">
                              ISO 14040/14044
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-light">
                          Product: {product?.name || 'Unknown'} • {study.impact_assessment_method} • {study.system_boundary}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 font-light mb-1">{study.completion_percentage || 0}% Complete</p>
                        <div className="w-24 h-1.5 bg-white/40 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${study.completion_percentage || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </div>

      <CreateLCAStudyModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(id) => {
          setShowCreateModal(false);
          onStudyClick(id);
        }}
      />
    </div>
  );
}