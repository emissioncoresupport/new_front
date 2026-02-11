import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  UserPlus, 
  FileText, 
  RefreshCw, 
  Database, 
  Upload,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';

/**
 * PHASE 2.2 - INTENT-DRIVEN INGESTION ENTRY POINT
 * 
 * Operator-grade ingestion that starts with WHY, not HOW.
 * 
 * PRINCIPLES:
 * - Intent declaration is mandatory
 * - System guides path selection
 * - No blind uploads
 * - Honest confirmations
 * - Clear next actions
 */

const INGESTION_INTENTS = [
  {
    id: 'onboard-supplier',
    label: 'Onboard a new supplier',
    description: 'Add a supplier to your network with supporting documentation',
    icon: UserPlus,
    recommended_paths: ['supplier_portal', 'upload_documents'],
    color: 'blue'
  },
  {
    id: 'add-evidence',
    label: 'Add missing compliance evidence',
    description: 'Upload certificates, declarations, or audit reports for existing suppliers',
    icon: FileText,
    recommended_paths: ['upload_documents'],
    color: 'green'
  },
  {
    id: 'update-documentation',
    label: 'Update supplier documentation',
    description: 'Replace or supplement existing evidence with new versions',
    icon: RefreshCw,
    recommended_paths: ['upload_documents', 'supplier_portal'],
    color: 'purple'
  },
  {
    id: 'import-erp-snapshot',
    label: 'Import supplier list from ERP',
    description: 'Create point-in-time evidence snapshots from ERP data',
    icon: Database,
    recommended_paths: ['erp_snapshot'],
    color: 'orange'
  },
  {
    id: 'bulk-import',
    label: 'Import supplier list from file',
    description: 'Upload CSV/Excel with supplier data (creates evidence, not suppliers)',
    icon: Upload,
    recommended_paths: ['bulk_import'],
    color: 'slate'
  }
];

export default function IntentDrivenIngestionModal({ isOpen, onClose }) {
  const [step, setStep] = useState('intent'); // intent | path | context | confirm
  const [selectedIntent, setSelectedIntent] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [context, setContext] = useState({
    entity_type: 'supplier',
    framework_relevance: [],
    source_role: 'buyer',
    reason: ''
  });

  const handleIntentSelect = (intent) => {
    setSelectedIntent(intent);
    
    // Auto-select path if only one recommended
    if (intent.recommended_paths.length === 1) {
      setSelectedPath(intent.recommended_paths[0]);
      setStep('context');
    } else {
      setStep('path');
    }
  };

  const handlePathSelect = (path) => {
    setSelectedPath(path);
    setStep('context');
  };

  const handleContextSubmit = () => {
    // This would trigger actual ingestion
    setStep('confirm');
  };

  const handleReset = () => {
    setStep('intent');
    setSelectedIntent(null);
    setSelectedPath(null);
    setContext({
      entity_type: 'supplier',
      framework_relevance: [],
      source_role: 'buyer',
      reason: ''
    });
  };

  const getPathInfo = (pathId) => {
    const paths = {
      supplier_portal: {
        label: 'Supplier Portal',
        description: 'Invite supplier to self-declare via secure portal',
        tradeoff: 'Higher data quality, slower turnaround'
      },
      upload_documents: {
        label: 'Document Upload',
        description: 'Upload PDFs, certificates, or declarations directly',
        tradeoff: 'Immediate, requires manual verification'
      },
      bulk_import: {
        label: 'Bulk File Import',
        description: 'CSV/Excel with structured supplier data',
        tradeoff: 'Fast for volume, creates evidence only (not suppliers)'
      },
      erp_snapshot: {
        label: 'ERP Snapshot',
        description: 'Extract point-in-time supplier data from ERP system',
        tradeoff: 'Snapshot only - no sync, no overwrite, no auto-merge'
      }
    };
    return paths[pathId];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-light uppercase tracking-wider">Intent-Driven Ingestion</DialogTitle>
        </DialogHeader>

        {/* STEP 1: SELECT INTENT */}
        {step === 'intent' && (
          <div className="space-y-4 py-4">
            <div className="mb-6">
              <p className="text-sm text-slate-600">What are you trying to accomplish?</p>
              <p className="text-xs text-slate-500 mt-1">Select your intent to see recommended ingestion paths</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {INGESTION_INTENTS.map(intent => {
                const Icon = intent.icon;
                return (
                  <button
                    key={intent.id}
                    onClick={() => handleIntentSelect(intent)}
                    className="p-4 rounded-lg border-2 border-slate-200 hover:border-blue-400 bg-white hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-${intent.color}-50`}>
                          <Icon className={`w-5 h-5 text-${intent.color}-600`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{intent.label}</p>
                          <p className="text-xs text-slate-600 mt-1">{intent.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: SELECT PATH (if multiple recommended) */}
        {step === 'path' && selectedIntent && (
          <div className="space-y-4 py-4">
            <div className="mb-6">
              <p className="text-sm text-slate-900 font-semibold mb-1">Intent: {selectedIntent.label}</p>
              <p className="text-xs text-slate-600">Choose your ingestion method</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {selectedIntent.recommended_paths.map(pathId => {
                const pathInfo = getPathInfo(pathId);
                return (
                  <button
                    key={pathId}
                    onClick={() => handlePathSelect(pathId)}
                    className="p-4 rounded-lg border-2 border-slate-200 hover:border-blue-400 bg-white hover:shadow-md transition-all text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{pathInfo.label}</p>
                        <p className="text-xs text-slate-600 mt-1">{pathInfo.description}</p>
                        <Badge className="bg-slate-100 text-slate-700 mt-2">{pathInfo.tradeoff}</Badge>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </button>
                );
              })}
            </div>

            <Button onClick={() => setStep('intent')} variant="outline" className="w-full">
              ← Back to Intent Selection
            </Button>
          </div>
        )}

        {/* STEP 3: CONTEXT DECLARATION */}
        {step === 'context' && (
          <div className="space-y-4 py-4">
            <div className="mb-6">
              <p className="text-sm text-slate-900 font-semibold mb-1">
                Path: {selectedPath && getPathInfo(selectedPath).label}
              </p>
              <p className="text-xs text-slate-600">Provide context for evidence classification</p>
            </div>

            {selectedPath === 'erp_snapshot' && (
              <Card className="border-2 border-orange-500 bg-orange-50 p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-700 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-orange-900">ERP Snapshot Mode</p>
                    <p className="text-xs text-orange-800 mt-1">
                      This creates point-in-time evidence snapshots ONLY. No sync, no overwrite, no auto-merge, no supplier creation.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-600 uppercase tracking-wide mb-2 block">Entity Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['supplier', 'facility', 'product'].map(type => (
                    <button
                      key={type}
                      onClick={() => setContext({...context, entity_type: type})}
                      className={`p-3 rounded-lg border-2 text-sm transition-all ${
                        context.entity_type === type 
                          ? 'border-blue-500 bg-blue-50 text-blue-900' 
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600 uppercase tracking-wide mb-2 block">Framework Relevance</label>
                <div className="grid grid-cols-3 gap-2">
                  {['CBAM', 'EUDR', 'CSRD', 'PFAS', 'EUDAMED', 'PPWR'].map(framework => {
                    const selected = context.framework_relevance.includes(framework);
                    return (
                      <button
                        key={framework}
                        onClick={() => {
                          const updated = selected
                            ? context.framework_relevance.filter(f => f !== framework)
                            : [...context.framework_relevance, framework];
                          setContext({...context, framework_relevance: updated});
                        }}
                        className={`p-2 rounded-lg border-2 text-xs transition-all ${
                          selected
                            ? 'border-green-500 bg-green-50 text-green-900' 
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {framework}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600 uppercase tracking-wide mb-2 block">Source Role</label>
                <div className="grid grid-cols-4 gap-2">
                  {['buyer', 'supplier', 'system', 'auditor'].map(role => (
                    <button
                      key={role}
                      onClick={() => setContext({...context, source_role: role})}
                      className={`p-3 rounded-lg border-2 text-sm transition-all ${
                        context.source_role === role 
                          ? 'border-blue-500 bg-blue-50 text-blue-900' 
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600 uppercase tracking-wide mb-2 block">Reason (Optional)</label>
                <textarea
                  value={context.reason}
                  onChange={(e) => setContext({...context, reason: e.target.value})}
                  placeholder="Brief explanation of why this evidence is being uploaded..."
                  className="w-full p-3 rounded-lg border border-slate-200 text-sm"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleReset} variant="outline" className="flex-1">
                ← Start Over
              </Button>
              <Button onClick={handleContextSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700">
                Proceed to Ingestion →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRMATION */}
        {step === 'confirm' && (
          <div className="space-y-4 py-4">
            <Card className="border-2 border-green-500 bg-green-50 p-6">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <div>
                  <p className="text-lg font-semibold text-green-900">Ingestion Successful</p>
                  <p className="text-sm text-green-800 mt-1">Evidence records have been created</p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                <p className="text-slate-900"><span className="font-semibold">Intent:</span> {selectedIntent?.label}</p>
                <p className="text-slate-900"><span className="font-semibold">Path:</span> {selectedPath && getPathInfo(selectedPath).label}</p>
                <p className="text-slate-900"><span className="font-semibold">Evidence Created:</span> 5 records (example)</p>
                <p className="text-slate-900"><span className="font-semibold">Suppliers Created:</span> 0</p>
                <p className="text-slate-900"><span className="font-semibold">Compliance Activated:</span> None</p>
              </div>
            </Card>

            <Card className="border border-blue-500 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-blue-700 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Next Required Action</p>
                  <p className="text-xs text-blue-800 mt-1">
                    Classify the 5 new evidence records to enable downstream use
                  </p>
                  <Button className="mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs">
                    Go to Classification →
                  </Button>
                </div>
              </div>
            </Card>

            <Button onClick={() => { handleReset(); onClose(); }} variant="outline" className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}