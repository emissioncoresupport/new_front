/**
 * EVIDENCE CORE DASHBOARD - READ-ONLY MODE
 * 
 * Displays backend projections only.
 * No state mutation.
 * No inline editing.
 * Click through to EvidenceDetail for intent actions.
 */

import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { FileText, CheckCircle2, AlertTriangle, XCircle, Clock, Tag, Layers } from 'lucide-react';

export default function EvidenceCoreDashboard() {
  const { data: evidence = [], isLoading } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => base44.entities.Evidence.list('-uploaded_at', 100),
    refetchInterval: 10000
  });

  const { data: classifications = [] } = useQuery({
    queryKey: ['classifications'],
    queryFn: () => base44.entities.EvidenceClassification.list('-classification_timestamp', 20),
    refetchInterval: 10000
  });

  const stats = {
    total: evidence.length,
    raw: evidence.filter(e => e.state === 'RAW').length,
    classified: evidence.filter(e => e.state === 'CLASSIFIED').length,
    structured: evidence.filter(e => e.state === 'STRUCTURED').length,
    rejected: evidence.filter(e => e.state === 'REJECTED').length
  };

  const byPath = {
    upload_documents: evidence.filter(e => e.ingestion_path === 'upload_documents').length,
    supplier_portal: evidence.filter(e => e.ingestion_path === 'supplier_portal').length,
    bulk_import: evidence.filter(e => e.ingestion_path === 'bulk_import').length,
    erp_snapshot: evidence.filter(e => e.ingestion_path === 'erp_snapshot').length
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Clock className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  const containerVariants = { 
    hidden: { opacity: 0 }, 
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } } 
  };
  const itemVariants = { 
    hidden: { opacity: 0, y: 10 }, 
    visible: { opacity: 1, y: 0 } 
  };

  return (
    <div className="space-y-6">
      {/* Evidence Statistics */}
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="grid grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="border border-slate-200/40 bg-white/60 backdrop-blur-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-light">Total Evidence</p>
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-light text-slate-900">{stats.total}</p>
            <div className="flex items-center gap-1 mt-1">
              <div className="w-1 h-1 rounded-full bg-green-500" />
              <p className="text-xs text-slate-500">BACKEND VERIFIED</p>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border border-slate-200/40 bg-white/60 backdrop-blur-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-light">Raw</p>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-light text-blue-600">{stats.raw}</p>
            <div className="flex items-center gap-1 mt-1">
              <div className="w-1 h-1 rounded-full bg-green-500" />
              <p className="text-xs text-slate-500">STATE ENFORCED</p>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border border-slate-200/40 bg-white/60 backdrop-blur-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-light">Structured</p>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-light text-emerald-600">{stats.structured}</p>
            <div className="flex items-center gap-1 mt-1">
              <div className="w-1 h-1 rounded-full bg-green-500" />
              <p className="text-xs text-slate-500">STATE ENFORCED</p>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border border-slate-200/40 bg-white/60 backdrop-blur-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-light">Rejected</p>
              <XCircle className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-2xl font-light text-red-600">{stats.rejected}</p>
            <div className="flex items-center gap-1 mt-1">
              <div className="w-1 h-1 rounded-full bg-green-500" />
              <p className="text-xs text-slate-500">TERMINAL STATE</p>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* State Machine Flow */}
      <motion.div initial="hidden" animate="visible" variants={containerVariants}>
        <Card className="border border-slate-200/40 bg-white/60 backdrop-blur-sm p-6">
          <h3 className="text-sm font-light text-slate-900 uppercase tracking-widest mb-6">Evidence State Machine</h3>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-slate-700">RAW</span>
              </div>
              <div className="text-xs text-slate-500 ml-5">Initial upload</div>
              <div className="text-xs text-slate-600 ml-5 font-mono">{stats.raw} records</div>
            </div>
            
            <div className="text-slate-300">→</div>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="text-sm text-slate-700">CLASSIFIED</span>
              </div>
              <div className="text-xs text-slate-500 ml-5">Human action</div>
              <div className="text-xs text-slate-600 ml-5 font-mono">{stats.classified} records</div>
            </div>
            
            <div className="text-slate-300">→</div>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-slate-700">STRUCTURED</span>
              </div>
              <div className="text-xs text-slate-500 ml-5">Validation ref</div>
              <div className="text-xs text-slate-600 ml-5 font-mono">{stats.structured} records</div>
            </div>
            
            <div className="text-slate-300">→</div>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-slate-700">REJECTED</span>
              </div>
              <div className="text-xs text-slate-500 ml-5">Terminal</div>
              <div className="text-xs text-slate-600 ml-5 font-mono">{stats.rejected} records</div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Ingestion Path Distribution */}
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="grid grid-cols-2 gap-6">
        <Card className="border border-slate-200/40 bg-white/60 backdrop-blur-sm p-6">
          <h3 className="text-sm font-light text-slate-900 uppercase tracking-widest mb-4">Ingestion Paths</h3>
          <div className="space-y-3">
            {[
              { path: 'Upload Documents', count: byPath.upload_documents, color: 'bg-blue-500' },
              { path: 'Supplier Portal', count: byPath.supplier_portal, color: 'bg-emerald-500' },
              { path: 'Bulk Import', count: byPath.bulk_import, color: 'bg-orange-500' },
              { path: 'ERP Snapshot', count: byPath.erp_snapshot, color: 'bg-purple-500' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-sm text-slate-700">{item.path}</span>
                </div>
                <span className="text-sm font-medium text-slate-900">{item.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border border-slate-200/40 bg-white/60 backdrop-blur-sm p-6">
          <h3 className="text-sm font-light text-slate-900 uppercase tracking-widest mb-4">Recent Classifications</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {classifications.length === 0 ? (
              <div className="text-center py-6">
                <Tag className="w-5 h-5 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No classifications yet</p>
              </div>
            ) : (
              classifications.slice(0, 5).map((cls) => (
                <div key={cls.id} className="flex items-start gap-2 p-2 rounded bg-slate-50/50 border border-slate-200/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-900 font-medium">{cls.evidence_type}</p>
                    <p className="text-xs text-slate-500 mt-0.5 capitalize">{cls.claimed_scope}</p>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {cls.claimed_frameworks?.map(fw => (
                        <span key={fw} className="text-xs px-1 py-0.5 rounded bg-[#86b027]/10 text-[#86b027]">
                          {fw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}