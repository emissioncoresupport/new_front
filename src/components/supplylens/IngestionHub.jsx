import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Files, Database, Users, Code, ArrowRight, Lock, CheckCircle } from 'lucide-react';

const INGESTION_SURFACES = [
  {
    id: 'manual_upload',
    title: 'Manual Upload',
    icon: Upload,
    description: 'Upload a single file for immediate ingestion',
    user: 'Internal teams',
    capabilities: ['Single file upload', 'PDF, XLS, CSV, DOC, ZIP', 'Max 500 MB', 'Optional tags'],
    output: 'Evidence.state = RAW',
    status: 'ready'
  },
  {
    id: 'bulk_upload',
    title: 'Bulk File Upload',
    icon: Files,
    description: 'Batch upload multiple files at once',
    user: 'Power users, onboarding',
    capabilities: ['Multiple files', 'Zip unpacking', 'Batch tagging', 'Max 50 files'],
    output: 'Evidence.state = RAW × N',
    status: 'ready'
  },
  {
    id: 'erp_declaration',
    title: 'ERP Declaration',
    icon: Database,
    description: 'Declare that data exists in your ERP system',
    user: 'ERP admins',
    capabilities: ['No live API calls', 'Export snapshots', 'Metadata storage', 'Append-only'],
    output: 'Evidence.state = RAW',
    status: 'ready'
  },
  {
    id: 'supplier_submission',
    title: 'Supplier Submission',
    icon: Users,
    description: 'Suppliers respond to requests via token portal',
    user: 'External suppliers',
    capabilities: ['Token-based access', 'File uploads', 'Forms as Evidence', 'Time-limited'],
    output: 'Evidence.state = RAW',
    status: 'ready'
  },
  {
    id: 'api_ingestion',
    title: 'API / System Ingestion',
    icon: Code,
    description: 'Programmatic ingestion via authenticated endpoint',
    user: 'Systems, pipelines',
    capabilities: ['Idempotent', 'Rate-limited', 'Webhook-ready', 'Hash-dedup'],
    output: 'Evidence.state = RAW',
    status: 'ready'
  }
];

export default function IngestionHub() {
  const [selectedSurface, setSelectedSurface] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-light tracking-widest text-slate-900 uppercase">Ingestion Hub</h1>
          <p className="text-sm text-slate-600 mt-2 tracking-wide max-w-4xl">
            Five defined ingestion surfaces. All create immutable Evidence. None bypass the Vault.
          </p>
        </motion.div>

        {/* Contract Notice */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card className="border border-[#86b027]/30 bg-gradient-to-r from-[#86b027]/5 to-transparent p-4">
            <div className="flex items-start gap-3">
              <Lock className="w-4 h-4 text-[#86b027] mt-0.5 flex-shrink-0" />
              <div className="text-xs text-slate-700 space-y-1">
                <p><strong className="text-[#86b027]">Ingestion Surfaces Contract (Locked):</strong></p>
                <p>All data entry occurs via these five surfaces only. No ingestion path may create canonical data, bypass Evidence rules, or modify existing records. Every ingestion creates immutable Evidence with server-side hashing and UTC timestamps.</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Surfaces Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {INGESTION_SURFACES.map((surface, idx) => {
            const Icon = surface.icon;
            const isSelected = selectedSurface?.id === surface.id;

            return (
              <motion.div
                key={surface.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <button
                  onClick={() => setSelectedSurface(isSelected ? null : surface)}
                  className="w-full text-left"
                >
                  <Card
                    className={`border-2 transition-all h-full cursor-pointer ${
                      isSelected
                        ? 'border-[#86b027] bg-[#86b027]/5'
                        : 'border-slate-200 hover:border-[#86b027]/40 bg-white'
                    }`}
                  >
                    <div className="p-5 space-y-4">
                      {/* Icon & Title */}
                      <div className="flex items-start justify-between">
                        <div className="p-2.5 rounded-lg bg-[#86b027]/10">
                          <Icon className="w-5 h-5 text-[#86b027]" />
                        </div>
                        {isSelected && <CheckCircle className="w-4 h-4 text-[#86b027]" />}
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{surface.title}</h3>
                        <p className="text-xs text-slate-600 mt-1">{surface.description}</p>
                      </div>

                      {/* User & Status */}
                      <div className="space-y-2">
                        <div className="text-xs">
                          <span className="text-slate-500">For: </span>
                          <span className="text-slate-700 font-medium">{surface.user}</span>
                        </div>
                        <div className="text-xs">
                          <span className="inline-block px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                            {surface.status}
                          </span>
                        </div>
                      </div>

                      {/* Output */}
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-xs text-slate-500">Output:</p>
                        <p className="text-xs font-mono text-[#86b027] mt-1">{surface.output}</p>
                      </div>

                      {/* Expand hint */}
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-slate-500">
                          {isSelected ? '−' : '+'} Details
                        </span>
                        <ArrowRight className={`w-3 h-3 text-slate-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </Card>
                </button>

                {/* Expanded Details */}
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-3"
                  >
                    {/* Capabilities */}
                    <Card className="border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">Capabilities</p>
                      <ul className="space-y-1">
                        {surface.capabilities.map((cap, i) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                            <span className="text-[#86b027] mt-1">•</span>
                            {cap}
                          </li>
                        ))}
                      </ul>
                    </Card>

                    {/* Rules */}
                    <Card className="border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">Rules</p>
                      <ul className="space-y-1 text-xs text-slate-600">
                        <li className="flex items-start gap-2">
                          <span className="text-slate-400">•</span>
                          Creates immutable Evidence records
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-slate-400">•</span>
                          SHA-256/512 hashed server-side
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-slate-400">•</span>
                          UTC timestamps immutable
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-slate-400">•</span>
                          Full audit trail logged
                        </li>
                      </ul>
                    </Card>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" className="flex-1 bg-[#86b027] hover:bg-[#86b027]/90 text-white text-xs">
                        {surface.title === 'API / System Ingestion' ? 'View Documentation' : 'Start Upload'}
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 text-xs">
                        Learn More
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Common Rules */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <h2 className="text-lg font-light tracking-widest text-slate-900 uppercase mb-4">Common Rules (All Surfaces)</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">MUST Include</h3>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-[#86b027] font-bold">✓</span>
                  source_type
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#86b027] font-bold">✓</span>
                  uploaded_at (server-side UTC)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#86b027] font-bold">✓</span>
                  file_hash_sha256
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#86b027] font-bold">✓</span>
                  created_by or source_identity
                </li>
              </ul>
            </Card>

            <Card className="border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">MUST NOT</h3>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✗</span>
                  Create suppliers or products
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✗</span>
                  Auto-structure Evidence
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✗</span>
                  Bypass Vault or audit trail
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✗</span>
                  Modify existing Evidence
                </li>
              </ul>
            </Card>

            <Card className="border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Failure Triggers</h3>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">⚠</span>
                  File cannot be stored
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">⚠</span>
                  Hash computation fails
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">⚠</span>
                  Tenant context missing
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">⚠</span>
                  Authentication fails
                </li>
              </ul>
            </Card>
          </div>
        </motion.div>

        {/* AI Usage */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <Card className="border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">AI Usage (Strict Limits)</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-emerald-700 mb-2">AI MAY</p>
                <ul className="space-y-1 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600">+</span> Classify document type
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600">+</span> Suggest entity scope
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600">+</span> Flag potential duplicates
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600">+</span> Extract candidate fields
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-red-700 mb-2">AI MAY NOT</p>
                <ul className="space-y-1 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-red-600">−</span> Approve ingestion
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600">−</span> Change Evidence state
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600">−</span> Create canonical data
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600">−</span> Modify post-ingestion
                  </li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3 italic">All AI output labeled: "SUGGESTION — NOT APPLIED"</p>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}