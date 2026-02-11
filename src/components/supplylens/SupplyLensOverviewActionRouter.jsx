import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  FileText,
  Upload
} from 'lucide-react';
import { motion } from 'framer-motion';
import { createPageUrl } from '@/utils';

export default function SupplyLensOverviewActionRouter() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch source data
  const { data: evidence = [] } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => base44.entities.Evidence.list('-uploaded_at', 100),
    initialData: []
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ['mappings'],
    queryFn: () => base44.entities.EvidenceMapping.list('-evaluated_at', 100),
    initialData: []
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['supplier_requests'],
    queryFn: () => base44.entities.SupplierDataRequest.list('-created_at', 100),
    initialData: []
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ['audit_log'],
    queryFn: () => base44.entities.AuditLogEntry.list('-action_timestamp', 10),
    initialData: []
  });

  // Compute action items deterministically
  const actionItems = React.useMemo(() => {
    const items = [];
    const now = new Date();

    // RAW evidence
    evidence.forEach(ev => {
      if (ev.state === 'RAW') {
        items.push({
          type: 'EVIDENCE_RAW',
          blocking: true,
          priority: 'critical',
          title: `Classify evidence`,
          why: 'Evidence cannot be used until classified',
          evidenceId: ev.id,
          action: 'Classify Now',
          actionTarget: 'SupplyLensStructuredEvidence'
        });
      }
    });

    // CLASSIFIED evidence
    evidence.forEach(ev => {
      if (ev.state === 'CLASSIFIED') {
        items.push({
          type: 'EVIDENCE_CLASSIFIED',
          blocking: true,
          priority: 'critical',
          title: `Structure evidence`,
          why: 'Evidence needs scope and fields declared',
          evidenceId: ev.id,
          action: 'Declare Fields',
          actionTarget: 'SupplyLensStructuredEvidence'
        });
      }
    });

    // BLOCKED mappings
    mappings.forEach(m => {
      if (m.eligibility_status === 'BLOCKED') {
        items.push({
          type: 'MAPPING_BLOCKED',
          blocking: true,
          priority: 'critical',
          title: `Unblock mapping: ${m.intended_entity_type}`,
          why: m.blocking_reason || 'Missing required information',
          mappingId: m.id,
          action: 'Fix Block',
          actionTarget: 'SupplyLensMapping'
        });
      }
    });

    // OVERDUE supplier requests
    requests.forEach(r => {
      if (['SENT', 'VIEWED', 'IN_PROGRESS'].includes(r.status)) {
        const deadline = new Date(r.deadline);
        const daysUntil = (deadline - now) / (1000 * 60 * 60 * 24);

        if (daysUntil < 0) {
          items.push({
            type: 'SUPPLIER_REQUEST_OVERDUE',
            blocking: true,
            priority: 'critical',
            title: `Supplier response overdue`,
            why: `${r.request_type} request overdue ${Math.abs(daysUntil).toFixed(0)} days`,
            requestId: r.id,
            action: 'Follow Up',
            actionTarget: 'SupplyLensRequests'
          });
        }
      }
    });

    // REJECTED evidence
    evidence.forEach(ev => {
      if (ev.state === 'REJECTED') {
        items.push({
          type: 'EVIDENCE_REJECTED',
          blocking: true,
          priority: 'critical',
          title: `Re-handle rejected evidence`,
          why: ev.rejection_reason || 'Reason not provided',
          evidenceId: ev.id,
          action: 'Re-upload',
          actionTarget: 'SupplyLensCanonicalDataUpload'
        });
      }
    });

    return items.sort((a, b) => {
      if (a.blocking !== b.blocking) return b.blocking ? -1 : 1;
      return 0;
    });
  }, [evidence, mappings, requests]);

  // Get next required action
  const nextAction = actionItems.find(a => a.blocking);

  // Get active workflows (in progress, not blocking)
  const activeWorkflows = React.useMemo(() => {
    const workflows = [];
    const now = new Date();

    // Pending supplier requests (not overdue)
    requests.forEach(r => {
      if (['SENT', 'VIEWED', 'IN_PROGRESS'].includes(r.status)) {
        const deadline = new Date(r.deadline);
        if (deadline >= now) {
          workflows.push({
            type: 'REQUEST_PENDING',
            title: `Awaiting ${r.request_type} from supplier`,
            status: `Due ${deadline.toLocaleDateString()}`,
            requestId: r.id,
            action: 'View',
            actionTarget: 'SupplyLensRequests'
          });
        }
      }
    });

    return workflows.slice(0, 3);
  }, [requests]);

  // Recent events
  const recentEvents = auditLog.slice(0, 5);

  if (!user) {
    return <div className="text-center py-12 text-slate-600">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-light tracking-widest text-slate-900 uppercase">SupplyLens</h1>
        </motion.div>

        {/* SECTION 1: NEXT REQUIRED ACTION */}
        {nextAction ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-2 border-red-300 bg-red-50 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h2 className="text-lg font-medium text-red-900">{nextAction.title}</h2>
                  <p className="text-sm text-red-700 mt-2">{nextAction.why}</p>
                </div>
              </div>
              <Button
                onClick={() => {
                  const url = createPageUrl(nextAction.actionTarget);
                  if (nextAction.evidenceId) {
                    window.location.href = url + `?evidence_id=${nextAction.evidenceId}`;
                  } else if (nextAction.mappingId) {
                    window.location.href = url + `?mapping_id=${nextAction.mappingId}`;
                  } else if (nextAction.requestId) {
                    window.location.href = url + `?request_id=${nextAction.requestId}`;
                  } else {
                    window.location.href = url;
                  }
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2"
              >
                {nextAction.action}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border border-green-300 bg-green-50 p-6 flex gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">All set</p>
                <p className="text-xs text-green-700 mt-1">No blocking actions. Use "Start New Work" below.</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* SECTION 2: ACTIVE WORKFLOWS */}
        {activeWorkflows.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="space-y-3">
              <h2 className="text-sm font-medium tracking-widest text-slate-700 uppercase">In Progress</h2>
              {activeWorkflows.map((workflow, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="border border-slate-200 bg-white p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{workflow.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{workflow.status}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = createPageUrl(workflow.actionTarget);
                        if (workflow.requestId) {
                          window.location.href = url + `?request_id=${workflow.requestId}`;
                        } else {
                          window.location.href = url;
                        }
                      }}
                    >
                      {workflow.action}
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* SECTION 3: START NEW WORK */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="space-y-3">
            <h2 className="text-sm font-medium tracking-widest text-slate-700 uppercase">Start New Work</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                onClick={() => window.location.href = createPageUrl('SupplyLensCanonicalDataUpload')}
                className="h-auto py-3 bg-[#86b027] hover:bg-[#7aa522] text-white flex flex-col items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span className="text-xs">Upload Data</span>
              </Button>
              <Button
                onClick={() => window.location.href = createPageUrl('SupplyLensRequests')}
                variant="outline"
                className="h-auto py-3 border-slate-300 hover:bg-slate-50 flex flex-col items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span className="text-xs">Request Data</span>
              </Button>
              <Button
                onClick={() => window.location.href = createPageUrl('SupplyLensEvidenceVault')}
                variant="outline"
                className="h-auto py-3 border-slate-300 hover:bg-slate-50 flex flex-col items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span className="text-xs">Review Evidence</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* SECTION 4: RECENT ACTIVITY */}
        {recentEvents.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="space-y-3">
              <h2 className="text-sm font-medium tracking-widest text-slate-700 uppercase">Recent Activity</h2>
              <div className="space-y-2">
                {recentEvents.map((event, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="border border-slate-200 bg-white p-3 text-xs">
                      <div className="flex items-center gap-2">
                        {event.status === 'SUCCESS' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900">{event.event_type.replace(/_/g, ' ')}</p>
                          <p className="text-slate-500 mt-0.5">{event.details}</p>
                        </div>
                        <p className="text-slate-400 whitespace-nowrap">{new Date(event.action_timestamp).toLocaleDateString()}</p>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}