import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Database, GitMerge, Link2, CheckCircle, AlertTriangle, 
  TrendingUp, Clock, ArrowRight, Sparkles, Building2, Upload, Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function IntegratedDashboard({ onNavigate, onViewSupplier }) {
  const queryClient = useQueryClient();
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    initialData: [],
    retry: false,
    onError: () => {}
  });

  const { data: sourceRecords = [] } = useQuery({
    queryKey: ['source-records'],
    queryFn: () => base44.entities.SourceRecord.list('-created_date', 50),
    initialData: [],
    retry: false,
    onError: () => {}
  });

  const { data: dedupeSuggestions = [] } = useQuery({
    queryKey: ['dedupe-suggestions'],
    queryFn: () => base44.entities.DedupeSuggestion.filter({ status: 'pending' }),
    initialData: [],
    retry: false,
    onError: () => {}
  });

  const { data: mappingSuggestions = [] } = useQuery({
    queryKey: ['mapping-suggestions-all'],
    queryFn: () => base44.entities.DataMappingSuggestion.filter({ status: 'pending' }),
    initialData: [],
    retry: false,
    onError: () => {}
  });

  const { data: evidencePacks = [] } = useQuery({
    queryKey: ['evidence-packs'],
    queryFn: () => base44.entities.EvidencePack.list('-created_date', 20),
    initialData: [],
    retry: false,
    onError: () => {}
  });

  // Pipeline metrics
  const pendingIngestion = sourceRecords.filter(r => r.status === 'pending').length;
  const awaitingNormalization = sourceRecords.filter(r => r.status === 'processing').length;
  const needsReview = dedupeSuggestions.length + mappingSuggestions.length;
  const canonicalEntities = suppliers.length;

  const avgDataQuality = Math.round(
    suppliers.reduce((acc, s) => acc + (s.data_completeness || 0), 0) / (suppliers.length || 1)
  );

  const recentActivity = [
    ...sourceRecords.slice(0, 3).map(r => ({
      type: 'ingestion',
      title: 'Source record ingested',
      subtitle: r.source_data?.legal_name || r.external_id || 'Processing...',
      status: r.status,
      time: r.created_date,
      action: () => onNavigate('sources')
    })),
    ...dedupeSuggestions.slice(0, 2).map(s => ({
      type: 'identity',
      title: 'Identity conflict detected',
      subtitle: `${s.source_data?.legal_name || 'Entity'} may match existing`,
      status: 'pending',
      time: s.created_date,
      action: () => onNavigate('resolution')
    })),
    ...mappingSuggestions.slice(0, 2).map(s => ({
      type: 'mapping',
      title: 'Relationship proposed',
      subtitle: `${s.source_entity_name} → ${s.target_entity_name}`,
      status: 'pending',
      time: s.created_date,
      action: () => onNavigate('mappings')
    }))
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 6);

  return (
    <div className="space-y-3">
      {/* Core Master Data Scorecards - Tesla Design */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 text-center hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-shadow">
          <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-slate-50 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-light text-slate-900 mb-1">{canonicalEntities}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-light">Total Suppliers</div>
          <div className="text-[9px] text-slate-400 mt-0.5 font-light">canonical entities</div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 text-center hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-shadow">
          <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-slate-50 flex items-center justify-center">
            <GitMerge className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-light text-slate-900 mb-1">{dedupeSuggestions.length}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-light">Pending Review</div>
          <div className="text-[9px] text-slate-400 mt-0.5 font-light">deduplication</div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 text-center hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-shadow">
          <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-slate-50 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-light text-slate-900 mb-1">{mappingSuggestions.length}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-light">Mapping Suggestions</div>
          <div className="text-[9px] text-slate-400 mt-0.5 font-light">relationships</div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 text-center hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-shadow">
          <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-slate-50 flex items-center justify-center">
            <Database className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-light text-slate-900 mb-1">{avgDataQuality}%</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-light">Data Quality</div>
          <div className="text-[9px] text-slate-400 mt-0.5 font-light">average completeness</div>
        </div>
      </div>

      {/* Pipeline Status & Recent Activity - Tesla Design */}
      <div className="grid grid-cols-2 gap-3">
        {/* Ingestion Pipeline */}
        <div className="relative bg-white/60 backdrop-blur-xl rounded-lg border border-white/40 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none rounded-lg"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-light text-slate-900 tracking-wide">Ingestion Pipeline</h3>
              <Badge variant="outline" className="text-[10px] font-light border-slate-300 text-slate-600">{sourceRecords.length} total</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-white/40 backdrop-blur-sm rounded-lg border border-white/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-slate-600 font-light">Pending Ingestion</span>
                </div>
                <span className="text-sm font-light text-slate-900">{sourceRecords.filter(r => r.status === 'pending').length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/40 backdrop-blur-sm rounded-lg border border-white/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                  <span className="text-xs text-slate-600 font-light">Processing</span>
                </div>
                <span className="text-sm font-light text-slate-900">{sourceRecords.filter(r => r.status === 'processing').length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/40 backdrop-blur-sm rounded-lg border border-white/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span className="text-xs text-slate-600 font-light">Normalized</span>
                </div>
                <span className="text-sm font-light text-slate-900">{sourceRecords.filter(r => r.status === 'normalized').length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/40 backdrop-blur-sm rounded-lg border border-white/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                  <span className="text-xs text-slate-600 font-light">Canonical</span>
                </div>
                <span className="text-sm font-light text-slate-900">{sourceRecords.filter(r => r.status === 'canonical').length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="relative bg-white/60 backdrop-blur-xl rounded-lg border border-white/40 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none rounded-lg"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-light text-slate-900 tracking-wide">Recent Activity</h3>
              <Button variant="ghost" size="sm" className="text-[10px] h-7 hover:bg-white/60 font-light" onClick={() => onNavigate('onboarding')}>
                View All <ArrowRight className="w-3 h-3 ml-1" strokeWidth={1.5} />
              </Button>
            </div>
            <div className="space-y-2">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-light">No recent activity</div>
              ) : (
                recentActivity.map((activity, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-white/40 backdrop-blur-sm border border-white/60 hover:bg-white/60 transition-all cursor-pointer"
                    onClick={activity.action}
                  >
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                      activity.status === 'pending' && "bg-amber-500",
                      activity.status === 'processing' && "bg-blue-500",
                      activity.status === 'normalized' && "bg-emerald-500",
                      activity.status === 'canonical' && "bg-slate-600"
                    )}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-light text-slate-900 truncate">{activity.title}</p>
                      <p className="text-[10px] text-slate-500 truncate font-light">{activity.subtitle}</p>
                    </div>
                    <span className="text-[9px] text-slate-400 whitespace-nowrap font-light">
                      {new Date(activity.time).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}