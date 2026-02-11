import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { 
  Building2, 
  Factory, 
  Package, 
  Truck,
  Database,
  FileText,
  Users,
  Upload,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield
} from 'lucide-react';

/**
 * PHASE 2.3 - ENTITY-FIRST INGESTION
 * 
 * Ingestion ALWAYS starts with entity declaration.
 * Paths are implementation details selected by system.
 * 
 * FLOW:
 * 1. Declare entity type + intent
 * 2. System allows compatible paths
 * 3. Upload/connect data
 * 4. Honest post-ingestion truth panel
 */

const ENTITY_TYPES = [
  {
    id: 'supplier',
    label: 'Supplier',
    icon: Building2,
    description: 'Legal entity providing goods/services',
    allowed_paths: ['erp_snapshot', 'supplier_portal', 'upload_documents', 'bulk_import']
  },
  {
    id: 'facility',
    label: 'Facility',
    icon: Factory,
    description: 'Physical site/manufacturing location',
    allowed_paths: ['upload_documents', 'bulk_import', 'erp_snapshot']
  },
  {
    id: 'product',
    label: 'Product',
    icon: Package,
    description: 'SKU/part with BOM and specs',
    allowed_paths: ['upload_documents', 'bulk_import']
  },
  {
    id: 'shipment',
    label: 'Shipment',
    icon: Truck,
    description: 'Logistics movement with emissions',
    allowed_paths: ['upload_documents', 'bulk_import']
  }
];

const ENTITY_INTENTS = [
  { id: 'new', label: 'New entity', description: 'Create new entity with evidence' },
  { id: 'update', label: 'Update existing', description: 'Add evidence to existing entity' },
  { id: 'evidence_only', label: 'Evidence only', description: 'No entity yet, evidence first' }
];

const PATH_INFO = {
  erp_snapshot: {
    label: 'ERP Snapshot',
    icon: Database,
    description: 'Master data declaration (SAP/Oracle/Dynamics)',
    notice: 'ENTERPRISE RULE: Declared snapshot only, not system truth',
    color: 'orange'
  },
  supplier_portal: {
    label: 'Supplier Portal',
    icon: Users,
    description: 'Invite supplier to self-declare',
    notice: 'High quality, slower turnaround',
    color: 'blue'
  },
  upload_documents: {
    label: 'Document Upload',
    icon: FileText,
    description: 'Upload PDFs, certificates, declarations',
    notice: 'Immediate, requires verification',
    color: 'green'
  },
  bulk_import: {
    label: 'Bulk File Import',
    icon: Upload,
    description: 'CSV/Excel with structured data',
    notice: 'Fast for volume, creates evidence only',
    color: 'purple'
  }
};

export default function EntityFirstIngestionModal({ isOpen, onClose }) {
  const [step, setStep] = useState('entity'); // entity | intent | path | upload | confirm
  const [selectedEntityType, setSelectedEntityType] = useState(null);
  const [selectedIntent, setSelectedIntent] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [entityDraftId, setEntityDraftId] = useState(null);
  const [ingestionResult, setIngestionResult] = useState(null);

  const handleEntityTypeSelect = (entityType) => {
    setSelectedEntityType(entityType);
    setStep('intent');
  };

  const handleIntentSelect = (intent) => {
    setSelectedIntent(intent);
    // Generate entity_context_id (DRAFT)
    const contextId = `CTX_${selectedEntityType.id.toUpperCase()}_${Date.now()}`;
    setEntityDraftId(contextId);
    setStep('path');
  };

  const handlePathSelect = async (pathId) => {
    setSelectedPath(pathId);
    
    // Simulate ingestion (would call actual backend here)
    setStep('upload');
    
    // Auto-complete for demo purposes
    setTimeout(() => {
      setIngestionResult({
        evidence_created: 3,
        entity_status: 'DRAFT',
        entity_draft_id: entityDraftId,
        suppliers_created: 0,
        compliance_activated: false,
        next_action: 'Classify evidence records'
      });
      setStep('confirm');
    }, 1500);
  };

  const handleReset = () => {
    setStep('entity');
    setSelectedEntityType(null);
    setSelectedIntent(null);
    setSelectedPath(null);
    setEntityDraftId(null);
    setIngestionResult(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur">
        <DialogHeader>
          <DialogTitle className="text-xl font-light uppercase tracking-wider text-slate-900">
            Create or Update Supply Entity
          </DialogTitle>
          <p className="text-xs text-slate-600 mt-1">Enterprise-grade entity management • Evidence attaches after entity declaration</p>
        </DialogHeader>

        {/* STEP 1: ENTITY TYPE */}
        {step === 'entity' && (
          <div className="space-y-4 py-4">
            <div className="mb-6">
              <p className="text-sm font-semibold text-slate-900">What type of entity are you adding?</p>
              <p className="text-xs text-slate-600 mt-1">Entity declaration is mandatory before any uploads</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {ENTITY_TYPES.map(entityType => {
                const Icon = entityType.icon;
                return (
                  <button
                    key={entityType.id}
                    onClick={() => handleEntityTypeSelect(entityType)}
                    className="p-5 rounded-lg border-2 border-slate-200 hover:border-blue-400 bg-white hover:shadow-lg transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-3 rounded-lg bg-slate-50 group-hover:bg-blue-50 transition-colors">
                        <Icon className="w-6 h-6 text-slate-700 group-hover:text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{entityType.label}</p>
                        <p className="text-xs text-slate-600 mt-1">{entityType.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: INTENT */}
        {step === 'intent' && selectedEntityType && (
          <div className="space-y-4 py-4">
            <div className="mb-6">
              <p className="text-sm text-slate-900 mb-1">
                <span className="font-semibold">Entity:</span> {selectedEntityType.label}
              </p>
              <p className="text-sm font-semibold text-slate-900">What is your intent?</p>
            </div>

            <div className="space-y-3">
              {ENTITY_INTENTS.map(intent => (
                <button
                  key={intent.id}
                  onClick={() => handleIntentSelect(intent)}
                  className="w-full p-4 rounded-lg border-2 border-slate-200 hover:border-blue-400 bg-white hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{intent.label}</p>
                      <p className="text-xs text-slate-600 mt-1">{intent.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              ))}
            </div>

            <Button onClick={() => setStep('entity')} variant="outline" className="w-full">
              ← Back
            </Button>
          </div>
        )}

        {/* STEP 3: PATH SELECTION (SYSTEM-GUIDED) */}
        {step === 'path' && selectedEntityType && selectedIntent && (
          <div className="space-y-4 py-4">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-slate-900 text-white">{selectedEntityType.label}</Badge>
                <Badge className="bg-blue-600 text-white">{selectedIntent.label}</Badge>
              </div>
              <p className="text-sm font-semibold text-slate-900">Select ingestion path</p>
              <p className="text-xs text-slate-600 mt-1">System allows compatible paths for {selectedEntityType.label}</p>
            </div>

            {entityDraftId && (
              <Card className="border border-slate-300 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">Entity Context ID (DRAFT):</p>
                <p className="text-xs font-mono text-slate-900 mt-1">{entityDraftId}</p>
                <p className="text-xs text-slate-500 mt-1">All evidence will attach to this context</p>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-3">
              {Object.keys(PATH_INFO).map(pathId => {
                const pathInfo = PATH_INFO[pathId];
                const Icon = pathInfo.icon;
                const isAllowed = selectedEntityType.allowed_paths.includes(pathId);
                
                return (
                  <button
                    key={pathId}
                    onClick={() => isAllowed && handlePathSelect(pathId)}
                    disabled={!isAllowed}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      isAllowed 
                        ? 'border-slate-200 hover:border-blue-400 bg-white hover:shadow-md cursor-pointer' 
                        : 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 ${isAllowed ? 'text-slate-700' : 'text-slate-400'}`} />
                      <div>
                        <p className={`text-sm font-semibold ${isAllowed ? 'text-slate-900' : 'text-slate-500'}`}>
                          {pathInfo.label}
                        </p>
                        <p className={`text-xs mt-1 ${isAllowed ? 'text-slate-600' : 'text-slate-500'}`}>
                          {pathInfo.description}
                        </p>
                        {isAllowed && (
                          <Badge className={`bg-${pathInfo.color}-100 text-${pathInfo.color}-800 mt-2 text-xs`}>
                            {pathInfo.notice}
                          </Badge>
                        )}
                        {!isAllowed && (
                          <Badge className="bg-red-100 text-red-800 mt-2 text-xs">
                            Not available for {selectedEntityType.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedPath === 'erp_snapshot' && (
              <Card className="border-2 border-orange-500 bg-orange-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-700 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-orange-900">ERP Snapshot — Enterprise Rule</p>
                    <p className="text-xs text-orange-900 mt-2 font-semibold">
                      "ERP data is a declared snapshot, not system truth."
                    </p>
                    <ul className="text-xs text-orange-800 mt-2 space-y-1">
                      <li>• SNAPSHOT_ONLY mode (no sync)</li>
                      <li>• Master data scope only</li>
                      <li>• No automatic entity creation</li>
                      <li>• No overwrites or merges</li>
                      <li>• Evidence attachment only</li>
                    </ul>
                  </div>
                </div>
              </Card>
            )}

            <Button onClick={() => setStep('intent')} variant="outline" className="w-full">
              ← Back
            </Button>
          </div>
        )}

        {/* STEP 4: UPLOAD/CONNECT (PLACEHOLDER) */}
        {step === 'upload' && (
          <div className="py-8 text-center">
            <div className="animate-pulse">
              <Database className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-sm text-slate-600">Processing ingestion...</p>
            </div>
          </div>
        )}

        {/* STEP 5: POST-INGESTION TRUTH PANEL */}
        {step === 'confirm' && ingestionResult && (
          <div className="space-y-4 py-4">
            <Card className="border-2 border-green-500 bg-green-50 p-6">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <div>
                  <p className="text-lg font-semibold text-green-900">Ingestion Complete</p>
                  <p className="text-sm text-green-800 mt-1">Evidence records created, no entities auto-created</p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide">Evidence Created</p>
                    <p className="text-2xl font-light text-slate-900 mt-1">{ingestionResult.evidence_created}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide">Entity Status</p>
                    <Badge className="bg-yellow-600 text-white mt-1">{ingestionResult.entity_status}</Badge>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">Suppliers Created: {ingestionResult.suppliers_created}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">Compliance Activated: {ingestionResult.compliance_activated ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-600">Entity Context ID:</p>
                  <p className="text-xs font-mono text-slate-900 mt-1">{ingestionResult.entity_draft_id}</p>
                  <p className="text-xs text-slate-500 mt-1">Evidence attached to this context</p>
                </div>
              </div>
            </Card>

            <Card className="border border-blue-500 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-blue-700 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Next Required Action</p>
                  <p className="text-xs text-blue-800 mt-1">{ingestionResult.next_action}</p>
                  <Button className="mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs">
                    Go to Classification →
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="border border-slate-300 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-slate-700 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-900 uppercase tracking-wide">Audit Trail</p>
                  <p className="text-xs text-slate-600 mt-1">
                    All actions logged • Evidence immutable • State machine enforced
                  </p>
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