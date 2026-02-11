import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Layers, CheckCircle2 } from 'lucide-react';
import EvidenceStructuringPanel from '@/components/supplylens/EvidenceStructuringPanel';

/**
 * DEPRECATED - STRUCTURING UI MIGRATED TO INTENT-ONLY MODE
 * 
 * This component attempted to structure Evidence directly.
 * Replaced by EvidenceIntentPanel with command API.
 * 
 * See: pages/EvidenceDetail.jsx
 * See: components/supplylens/EvidenceIntentPanel.jsx
 */

export default function SupplyLensStructurePage() {
  const [selectedEvidence, setSelectedEvidence] = React.useState(null);

  // Fetch CLASSIFIED evidence (ready for structuring)
  const { data: classifiedEvidence, isLoading, refetch } = useQuery({
    queryKey: ['evidence-classified'],
    queryFn: async () => {
      const result = await base44.entities.Evidence.filter({ state: 'CLASSIFIED' });
      return result.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
    },
    refetchInterval: 10000
  });

  // Fetch recent structured evidence
  const { data: recentStructured } = useQuery({
    queryKey: ['structured-evidence'],
    queryFn: async () => {
      const result = await base44.entities.StructuredEvidence.list('-approval_timestamp', 10);
      return result;
    },
    refetchInterval: 10000
  });

  const handleStructured = () => {
    setSelectedEvidence(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-slate-600 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <Layers className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-light tracking-widest text-slate-900 uppercase">
              Evidence Structuring
            </h1>
          </div>
          <p className="text-xs text-slate-500 tracking-widest uppercase">
            Phase 1.3 — Human-Approved Schema Extraction
          </p>
        </motion.div>

        <div className="grid grid-cols-3 gap-6">
          {/* Classified Queue */}
          <div className="col-span-1 space-y-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border border-slate-200 bg-white/80 backdrop-blur-sm">
                <div className="p-4 border-b border-slate-200">
                  <h2 className="text-sm font-medium text-slate-900 uppercase tracking-wider">
                    Classified Queue
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {classifiedEvidence?.length || 0} evidence ready for structuring
                  </p>
                </div>
                <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
                  {classifiedEvidence?.map((evidence) => (
                    <button
                      key={evidence.id}
                      onClick={() => setSelectedEvidence(evidence)}
                      className={`w-full text-left p-3 rounded border transition-all ${
                        selectedEvidence?.id === evidence.id
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-900 truncate">
                            {evidence.original_filename || evidence.evidence_id}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {evidence.declared_context?.entity_type || 'Unknown type'}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {evidence.state}
                        </Badge>
                      </div>
                    </button>
                  ))}
                  {classifiedEvidence?.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No classified evidence pending structuring
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Structuring Panel */}
          <div className="col-span-1">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              {selectedEvidence ? (
                <EvidenceStructuringPanel 
                  evidence={selectedEvidence} 
                  onStructured={handleStructured}
                />
              ) : (
                <Card className="border border-slate-200 bg-white/80 backdrop-blur-sm h-full flex items-center justify-center">
                  <div className="text-center text-slate-400 text-sm p-8">
                    Select evidence from the queue to begin structuring
                  </div>
                </Card>
              )}
            </motion.div>
          </div>

          {/* Recent Structured */}
          <div className="col-span-1 space-y-4">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border border-slate-200 bg-white/80 backdrop-blur-sm">
                <div className="p-4 border-b border-slate-200">
                  <h2 className="text-sm font-medium text-slate-900 uppercase tracking-wider">
                    Recent Structured
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Last {recentStructured?.length || 0} approved
                  </p>
                </div>
                <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
                  {recentStructured?.map((structured) => (
                    <div
                      key={structured.id}
                      className="p-3 rounded border border-slate-200 bg-white"
                    >
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-900 truncate">
                            {structured.schema_type}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {structured.extraction_source === 'ai_suggestion' ? 'AI-Assisted' : 'Human'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {structured.approver_role}
                            </Badge>
                            <span className="text-xs text-slate-400">
                              {new Date(structured.approval_timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {recentStructured?.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No structured evidence yet
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}