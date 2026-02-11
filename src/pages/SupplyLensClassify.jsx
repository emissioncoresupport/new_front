import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Tag, 
  CheckCircle2, 
  Clock,
  Calendar,
  User,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import EvidenceClassificationPanel from '@/components/supplylens/EvidenceClassificationPanel';

/**
 * DEPRECATED - CLASSIFICATION UI MIGRATED TO INTENT-ONLY MODE
 * 
 * This component attempted to classify Evidence directly.
 * Replaced by EvidenceIntentPanel with command API.
 * 
 * See: pages/EvidenceDetail.jsx
 * See: components/supplylens/EvidenceIntentPanel.jsx
 */

export default function SupplyLensClassify() {
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  const { data: rawEvidence = [], isLoading, refetch } = useQuery({
    queryKey: ['evidence-raw'],
    queryFn: () => base44.entities.Evidence.filter({ state: 'RAW' }, '-uploaded_at', 50),
    refetchInterval: 10000
  });

  const { data: classifications = [] } = useQuery({
    queryKey: ['classifications'],
    queryFn: () => base44.entities.EvidenceClassification.list('-classification_timestamp', 50),
    refetchInterval: 10000
  });

  const handleClassified = () => {
    setSelectedEvidence(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Clock className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-[#86b027]/10 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-light text-slate-900 uppercase tracking-widest">Evidence Classification</h1>
            <p className="text-sm text-slate-600 mt-1">Phase 1.2: Human-controlled classification of RAW Evidence</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-slate-600">ROLE ENFORCED</span>
          </div>
        </div>

        {/* Classification Panel */}
        {selectedEvidence && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border border-slate-200/40 bg-white/80 backdrop-blur-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-light text-slate-900 uppercase tracking-widest">Classify Evidence</h2>
                <Button
                  onClick={() => setSelectedEvidence(null)}
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </Button>
              </div>
              <EvidenceClassificationPanel
                evidence={selectedEvidence}
                onClassified={handleClassified}
                onCancel={() => setSelectedEvidence(null)}
              />
            </Card>
          </motion.div>
        )}

        {/* RAW Evidence Queue */}
        <div className="grid grid-cols-3 gap-6">
          {/* Queue */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-light text-slate-900 uppercase tracking-widest">RAW Evidence Queue</h2>
              <Badge className="bg-blue-100 text-blue-700 font-mono">{rawEvidence.length} awaiting</Badge>
            </div>

            {rawEvidence.length === 0 ? (
              <Card className="border border-slate-200/40 bg-white/60 backdrop-blur-sm p-12 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm text-slate-600">All Evidence has been classified</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {rawEvidence.map((ev, idx) => (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="border border-slate-200/40 bg-white/70 backdrop-blur-sm hover:bg-white/90 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => setSelectedEvidence(ev)}
                    >
                      <div className="p-4 flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200/50 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {ev.original_filename || ev.evidence_id}
                              </p>
                              <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                {ev.declared_context?.reason || 'No reason provided'}
                              </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#86b027] transition flex-shrink-0" />
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-600">
                                {new Date(ev.uploaded_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-600">{ev.actor_id}</span>
                            </div>
                            <Badge className="bg-slate-100 text-slate-700 text-xs font-mono">
                              {ev.ingestion_path ? ev.ingestion_path.replace('_', ' ') : 'unknown'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/40">
                            <div>
                              <p className="text-xs text-slate-500">Entity Type</p>
                              <p className="text-xs font-medium text-slate-900 mt-0.5 capitalize">
                                {ev.declared_context?.entity_type || 'Unknown'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Intended Use</p>
                              <p className="text-xs font-medium text-slate-900 mt-0.5 uppercase">
                                {ev.declared_context?.intended_use || 'Unknown'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Source Role</p>
                              <p className="text-xs font-medium text-slate-900 mt-0.5 capitalize">
                                {ev.declared_context?.source_role || 'Unknown'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Classifications */}
          <div className="space-y-4">
            <h2 className="text-sm font-light text-slate-900 uppercase tracking-widest">Recent Classifications</h2>
            
            {classifications.length === 0 ? (
              <Card className="border border-slate-200/40 bg-white/60 backdrop-blur-sm p-6 text-center">
                <Tag className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No classifications yet</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {classifications.slice(0, 10).map((cls) => (
                  <Card key={cls.id} className="border border-slate-200/40 bg-white/70 backdrop-blur-sm p-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-indigo-100 text-indigo-700 text-xs">
                            {cls.evidence_type}
                          </Badge>
                          <span className="text-xs text-slate-500 capitalize">{cls.claimed_scope}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {cls.claimed_frameworks?.map(fw => (
                            <span key={fw} className="text-xs px-1.5 py-0.5 rounded bg-[#86b027]/10 text-[#86b027] font-medium">
                              {fw}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500">
                          by {cls.classifier_id} · {new Date(cls.classification_timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}