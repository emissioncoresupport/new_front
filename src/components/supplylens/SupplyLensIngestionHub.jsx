import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  Database,
  Package,
  Users,
  Code,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import UpstreamContext from './UpstreamProcessContext';

/**
 * SupplyLens Ingestion Hub
 * 
 * Canonical, explicit ingestion sources:
 * 1. Manual Document Upload
 * 2. Bulk File Upload
 * 3. ERP Declaration (snapshot only, no live sync)
 * 4. Supplier Submission
 * 5. API/System Ingestion (future-safe)
 * 
 * All evidence created through this hub is immutable, hashed, and audit-logged.
 * No data is auto-applied. AI suggestions are labeled as such.
 */
export default function SupplyLensIngestionHub() {
  const [user, setUser] = useState(null);
  const [activeSource, setActiveSource] = useState(null);
  const [evidence, setEvidence] = useState([]);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.Evidence.list('-uploaded_at', 50).then(setEvidence).catch(() => {});
  }, []);

  const ingestionSources = [
    {
      id: UpstreamContext.INGESTION_SOURCES.MANUAL_UPLOAD,
      title: 'Manual Document Upload',
      icon: Upload,
      description: 'Single document upload with context',
      who: 'Internal compliance / supply-chain users',
      what: 'PDF, XLS, CSV, DOC files',
      rules: [
        'One file = one Evidence record',
        'Context (purpose, entity type) mandatory',
        'SHA-256 hash computed server-side',
        'State initialized as RAW'
      ],
      implemented: true,
      color: 'from-blue-50 to-blue-100/50'
    },
    {
      id: UpstreamContext.INGESTION_SOURCES.BULK_UPLOAD,
      title: 'Bulk File Upload',
      icon: Package,
      description: 'Multiple files or ZIP archives',
      who: 'Power users, onboarding teams',
      what: 'ZIP containing multiple files or folder uploads',
      rules: [
        'Each file becomes independent Evidence',
        'Partial success allowed, failures logged',
        'Context applied per file or batch',
        'Idempotent via file hash'
      ],
      implemented: false,
      color: 'from-purple-50 to-purple-100/50'
    },
    {
      id: UpstreamContext.INGESTION_SOURCES.ERP_SNAPSHOT,
      title: 'ERP Declaration (Snapshot)',
      icon: Database,
      description: 'ERP export metadata + file snapshot',
      who: 'Enterprise users with ERP integrations',
      what: 'Uploaded ERP export file with metadata',
      rules: [
        'NO live API execution or background sync',
        'Evidence created from snapshot only',
        'Explicit disclaimer: "Declared, not synced"',
        'Audit trail includes ERP system + export date'
      ],
      implemented: false,
      color: 'from-green-50 to-green-100/50'
    },
    {
      id: UpstreamContext.INGESTION_SOURCES.SUPPLIER_SUBMISSION,
      title: 'Supplier Submission Portal',
      icon: Users,
      description: 'Supplier file upload + structured responses',
      who: 'External suppliers',
      what: 'Files + form answers from supplier portal',
      rules: [
        'Supplier never sees internal logic',
        'All responses create NEW independent Evidence',
        'Partial submissions allowed with status tracking',
        'Received_at timestamp mandatory for compliance'
      ],
      implemented: true,
      color: 'from-orange-50 to-orange-100/50'
    },
    {
      id: UpstreamContext.INGESTION_SOURCES.API_INGESTION,
      title: 'API / System Ingestion',
      icon: Code,
      description: 'Future-safe external integrations',
      who: 'Advanced enterprise integrations',
      what: 'Structured data via REST / webhooks',
      rules: [
        'Append-only, no overwrites',
        'Idempotent via content hash',
        'Tenant-scoped with explicit authorization',
        'Same Evidence contract as all sources'
      ],
      implemented: false,
      color: 'from-indigo-50 to-indigo-100/50'
    }
  ];

  const implementedCount = ingestionSources.filter(s => s.implemented).length;

  if (!user) {
    return <div className="text-center py-12 text-slate-600">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="text-3xl font-light tracking-widest text-slate-900 uppercase">
              Ingestion Hub
            </h1>
            <p className="text-sm text-slate-600 mt-2 tracking-wide">
              {implementedCount}/{ingestionSources.length} sources active. All evidence immutable & audit-logged.
            </p>
          </div>
        </motion.div>

        {/* Canonical Sources Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {ingestionSources.map((source, idx) => {
              const Icon = source.icon;
              return (
                <motion.div
                  key={source.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className={`border border-slate-200 bg-gradient-to-br ${source.color} p-6 hover:shadow-lg transition-all ${
                    source.implemented ? 'cursor-pointer' : 'opacity-60'
                  }`}>
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-white/80">
                            <Icon className="w-5 h-5 text-slate-700" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{source.title}</h3>
                            <p className="text-xs text-slate-600 mt-0.5">{source.description}</p>
                          </div>
                        </div>
                        {source.implemented ? (
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-light bg-green-100 text-green-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-light bg-slate-200 text-slate-600">
                            Coming Soon
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      <div className="space-y-3 border-t border-white/50 pt-4">
                        <div>
                          <p className="text-xs font-medium text-slate-700 uppercase tracking-wider">Who:</p>
                          <p className="text-sm text-slate-600 mt-1">{source.who}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-700 uppercase tracking-wider">What:</p>
                          <p className="text-sm text-slate-600 mt-1">{source.what}</p>
                        </div>

                        {/* Rules */}
                        <div>
                          <p className="text-xs font-medium text-slate-700 uppercase tracking-wider mb-2">Rules:</p>
                          <ul className="space-y-1">
                            {source.rules.map((rule, rIdx) => (
                              <li key={rIdx} className="text-xs text-slate-600 flex gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0"></span>
                                {rule}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Action */}
                      {source.implemented && (
                        <Button
                          onClick={() => setActiveSource(source.id)}
                          className="w-full mt-4 bg-[#86b027] hover:bg-[#7aa522] text-white text-sm"
                        >
                          Use This Source
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Architecture Notes */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card className="border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Ingestion Hub Architecture
              </h3>
              <div className="space-y-3 text-sm text-slate-600">
                <div>
                  <p className="font-medium text-slate-900">Immutability First:</p>
                  <p className="mt-1">All evidence is immutable after creation. State transitions are backend-enforced. No overwrites.</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Data Ownership:</p>
                  <p className="mt-1">Internal users own structuring & decisions. Suppliers own submissions only. System owns audit trails.</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">AI Role (Advisory Only):</p>
                  <p className="mt-1">AI may suggest classification, extraction, or missing fields. All AI output labeled "SUGGESTION — NOT APPLIED". AI cannot decide or approve.</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">No Silent Logic:</p>
                  <p className="mt-1">Every decision logged. Every action audit-trailed. Every artifact cryptographically sealed.</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Recent Evidence */}
        {evidence.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <div>
              <h2 className="text-lg font-light tracking-widest text-slate-900 uppercase mb-4">
                Recent Evidence ({evidence.length})
              </h2>
              <div className="space-y-2">
                {evidence.slice(0, 5).map((ev, idx) => (
                  <Card key={idx} className="border border-slate-200 bg-white/50 p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{ev.original_filename}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(ev.uploaded_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-light ${
                      ev.state === 'RAW' ? 'bg-slate-200 text-slate-700' :
                      ev.state === 'CLASSIFIED' ? 'bg-blue-200 text-blue-700' :
                      ev.state === 'STRUCTURED' ? 'bg-green-200 text-green-700' :
                      'bg-red-200 text-red-700'
                    }`}>
                      {ev.state}
                    </span>
                  </Card>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}