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
  Shield,
  FileCheck
} from 'lucide-react';

/**
 * PHASE D.1 - CONTRACT-FIRST INGESTION
 * 
 * NO EVIDENCE WITHOUT CONTRACT.
 * NO ASSUMPTIONS.
 * BACKEND AUTHORITY ONLY.
 * 
 * FLOW:
 * 1. Declare Ingestion Contract (mandatory)
 * 2. Backend creates IngestionContract (ACTIVE)
 * 3. Evidence attaches to contract_id
 * 4. Truth panel shows contract authority
 */

const ENTITY_TYPES = [
  {
    id: 'supplier',
    label: 'Supplier',
    icon: Building2,
    description: 'Legal entity providing goods/services'
  },
  {
    id: 'facility',
    label: 'Facility',
    icon: Factory,
    description: 'Physical site/manufacturing location'
  },
  {
    id: 'product',
    label: 'Product',
    icon: Package,
    description: 'SKU/part with BOM and specs'
  },
  {
    id: 'shipment',
    label: 'Shipment',
    icon: Truck,
    description: 'Logistics movement with emissions'
  }
];

const REGULATORY_CONTEXTS = [
  { id: 'CBAM', label: 'CBAM', description: 'Carbon Border Adjustment Mechanism' },
  { id: 'CSRD', label: 'CSRD', description: 'Corporate Sustainability Reporting' },
  { id: 'EUDR', label: 'EUDR', description: 'Deforestation Regulation' },
  { id: 'EUDAMED', label: 'EUDAMED', description: 'Medical Device Regulation' },
  { id: 'PFAS', label: 'PFAS', description: 'Forever Chemicals Restriction' },
  { id: 'PPWR', label: 'PPWR', description: 'Packaging & Packaging Waste' },
  { id: 'INTERNAL', label: 'Internal', description: 'Internal compliance only' },
  { id: 'OTHER', label: 'Other', description: 'Other regulatory context' }
];

const AUTHORITY_TYPES = [
  { 
    id: 'DECLARATIVE', 
    label: 'Declarative', 
    description: 'Self-declared statement (not verified)',
    is_authoritative: false
  },
  { 
    id: 'SUPPORTING', 
    label: 'Supporting', 
    description: 'Third-party verified documentation',
    is_authoritative: true
  },
  { 
    id: 'ESTIMATED', 
    label: 'Estimated', 
    description: 'Calculated/estimated values',
    is_authoritative: false
  }
];

const INGESTION_PATHS = {
  document_upload: {
    label: 'Document Upload',
    icon: FileText,
    description: 'Upload PDFs, certificates, declarations',
    data_scope: 'compliance'
  },
  bulk_import: {
    label: 'Bulk Import',
    icon: Upload,
    description: 'CSV/Excel with structured data',
    data_scope: 'master_data'
  },
  supplier_portal: {
    label: 'Supplier Portal',
    icon: Users,
    description: 'Invite supplier to self-declare',
    data_scope: 'compliance'
  },
  erp_snapshot: {
    label: 'ERP Snapshot',
    icon: Database,
    description: 'Declared snapshot from ERP system',
    data_scope: 'master_data',
    notice: 'Declarative statement only, not authoritative system truth'
  }
};

export default function ContractFirstIngestionModal({ isOpen, onClose }) {
  const [step, setStep] = useState('entity'); // entity | contract | confirm
  const [contract, setContract] = useState({
    entity_type: null,
    ingestion_path: null,
    authority_type: null,
    data_scope: null,
    regulatory_context: null,
    is_authoritative: false
  });
  const [contractResult, setContractResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleEntityTypeSelect = (entityType) => {
    setContract({ ...contract, entity_type: entityType });
    setStep('contract');
  };

  const handleContractDeclaration = async () => {
    setLoading(true);
    setError(null);

    try {
      const user = await base44.auth.me();
      
      const contractPayload = {
        contract_id: `CONTRACT_${Date.now()}_${crypto.randomUUID()}`,
        tenant_id: user.email,
        entity_type: contract.entity_type,
        entity_id: null, // Nullable until activation
        ingestion_path: contract.ingestion_path,
        authority_type: contract.authority_type,
        data_scope: contract.data_scope,
        regulatory_context: contract.regulatory_context,
        is_authoritative: contract.is_authoritative,
        created_by: user.email,
        created_by_role: user.role || 'admin',
        status: 'ACTIVE',
        evidence_count: 0,
        immutable: true
      };

      // Create IngestionContract
      const createdContract = await base44.entities.IngestionContract.create(contractPayload);
      
      setContractResult({
        contract_id: createdContract.contract_id,
        status: 'ACTIVE',
        authority_type: createdContract.authority_type,
        is_authoritative: createdContract.is_authoritative,
        backend_confirmed: true
      });

      setStep('confirm');
    } catch (err) {
      console.error('Contract creation failed:', err);
      setError(err.message || 'Failed to create ingestion contract');
      setContractResult({
        contract_id: null,
        status: 'FAILED',
        authority_type: contract.authority_type,
        is_authoritative: contract.is_authoritative,
        backend_confirmed: false,
        error: err.message
      });
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('entity');
    setContract({
      entity_type: null,
      ingestion_path: null,
      authority_type: null,
      data_scope: null,
      regulatory_context: null,
      is_authoritative: false
    });
    setContractResult(null);
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur">
        <DialogHeader>
          <DialogTitle className="text-xl font-light uppercase tracking-wider text-slate-900">
            Contract-First Ingestion
          </DialogTitle>
          <p className="text-xs text-slate-600 mt-1">No evidence without explicit contract declaration</p>
        </DialogHeader>

        {/* STEP 1: ENTITY TYPE */}
        {step === 'entity' && (
          <div className="space-y-4 py-4">
            <div className="mb-6">
              <p className="text-sm font-semibold text-slate-900">What entity type are you declaring?</p>
              <p className="text-xs text-slate-600 mt-1">Contract declaration is mandatory before any ingestion</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {ENTITY_TYPES.map(entityType => {
                const Icon = entityType.icon;
                return (
                  <button
                    key={entityType.id}
                    onClick={() => handleEntityTypeSelect(entityType.id)}
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

        {/* STEP 2: CONTRACT DECLARATION */}
        {step === 'contract' && (
          <div className="space-y-6 py-4">
            <div className="mb-6">
              <Badge className="bg-slate-900 text-white mb-2">
                Entity: {contract.entity_type?.toUpperCase()}
              </Badge>
              <p className="text-sm font-semibold text-slate-900">Declare Ingestion Contract</p>
              <p className="text-xs text-slate-600 mt-1">All fields are mandatory and immutable once active</p>
            </div>

            {/* Ingestion Path */}
            <div>
              <label className="text-xs text-slate-600 uppercase tracking-wide mb-2 block font-semibold">Ingestion Path</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(INGESTION_PATHS).map(([pathId, pathInfo]) => {
                  const Icon = pathInfo.icon;
                  const selected = contract.ingestion_path === pathId;
                  return (
                    <button
                      key={pathId}
                      onClick={() => setContract({
                        ...contract, 
                        ingestion_path: pathId,
                        data_scope: pathInfo.data_scope
                      })}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        selected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Icon className={`w-4 h-4 ${selected ? 'text-blue-700' : 'text-slate-600'}`} />
                        <div>
                          <p className={`text-xs font-semibold ${selected ? 'text-blue-900' : 'text-slate-900'}`}>
                            {pathInfo.label}
                          </p>
                          <p className={`text-xs mt-1 ${selected ? 'text-blue-700' : 'text-slate-600'}`}>
                            {pathInfo.description}
                          </p>
                          {pathInfo.notice && (
                            <Badge className="bg-orange-100 text-orange-800 mt-2 text-xs">
                              {pathInfo.notice}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Authority Type */}
            <div>
              <label className="text-xs text-slate-600 uppercase tracking-wide mb-2 block font-semibold">Authority Type</label>
              <div className="space-y-2">
                {AUTHORITY_TYPES.map(authType => {
                  const selected = contract.authority_type === authType.id;
                  return (
                    <button
                      key={authType.id}
                      onClick={() => setContract({
                        ...contract,
                        authority_type: authType.id,
                        is_authoritative: authType.is_authoritative
                      })}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        selected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-semibold ${selected ? 'text-blue-900' : 'text-slate-900'}`}>
                            {authType.label}
                          </p>
                          <p className={`text-xs mt-1 ${selected ? 'text-blue-700' : 'text-slate-600'}`}>
                            {authType.description}
                          </p>
                        </div>
                        {!authType.is_authoritative && (
                          <Badge className="bg-yellow-100 text-yellow-800 text-xs">Non-Authoritative</Badge>
                        )}
                        {authType.is_authoritative && (
                          <Badge className="bg-green-100 text-green-800 text-xs">Authoritative</Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Regulatory Context */}
            <div>
              <label className="text-xs text-slate-600 uppercase tracking-wide mb-2 block font-semibold">Regulatory Context</label>
              <div className="grid grid-cols-4 gap-2">
                {REGULATORY_CONTEXTS.map(ctx => {
                  const selected = contract.regulatory_context === ctx.id;
                  return (
                    <button
                      key={ctx.id}
                      onClick={() => setContract({...contract, regulatory_context: ctx.id})}
                      className={`p-2 rounded-lg border-2 text-xs transition-all ${
                        selected 
                          ? 'border-blue-500 bg-blue-50 text-blue-900' 
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {ctx.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {contract.ingestion_path === 'erp_snapshot' && (
              <Card className="border-2 border-orange-500 bg-orange-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-700 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-orange-900">ERP Snapshot — Declarative Authority</p>
                    <p className="text-xs text-orange-900 mt-2 font-semibold">
                      "ERP Snapshot is a declared statement, not authoritative system data."
                    </p>
                    <ul className="text-xs text-orange-800 mt-2 space-y-1">
                      <li>• Authority Type: DECLARATIVE (non-authoritative)</li>
                      <li>• Point-in-time snapshot only</li>
                      <li>• No real-time sync</li>
                      <li>• Evidence attached to contract</li>
                    </ul>
                  </div>
                </div>
              </Card>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={() => setStep('entity')} variant="outline" className="flex-1">
                ← Back
              </Button>
              <Button 
                onClick={handleContractDeclaration}
                disabled={!contract.entity_type || !contract.ingestion_path || !contract.authority_type || !contract.regulatory_context || loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Creating Contract...' : 'Declare Contract →'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: CONTRACT CONFIRMATION */}
        {step === 'confirm' && contractResult && (
          <div className="space-y-4 py-4">
            <Card className={`border-2 ${contractResult.backend_confirmed ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'} p-6`}>
              <div className="flex items-start gap-3 mb-4">
                {contractResult.backend_confirmed ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                <div>
                  <p className="text-lg font-semibold text-slate-900">
                    {contractResult.backend_confirmed ? 'Contract Declared' : 'Contract Declaration Failed'}
                  </p>
                  <p className="text-sm text-slate-700 mt-1">
                    {contractResult.backend_confirmed 
                      ? 'Backend has created and activated ingestion contract'
                      : 'Backend failed to create contract - no ingestion allowed'
                    }
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide">Contract ID</p>
                    <p className="text-xs font-mono text-slate-900 mt-1">{contractResult.contract_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide">Status</p>
                    <Badge className={contractResult.backend_confirmed ? 'bg-green-600 text-white mt-1' : 'bg-red-600 text-white mt-1'}>
                      {contractResult.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide">Authority Type</p>
                    <p className="text-sm text-slate-900 mt-1">{contractResult.authority_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide">Is Authoritative?</p>
                    <Badge className={contractResult.is_authoritative ? 'bg-green-600 text-white mt-1' : 'bg-yellow-600 text-white mt-1'}>
                      {contractResult.is_authoritative ? 'YES' : 'NO'}
                    </Badge>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <p className="text-xs text-slate-600 uppercase tracking-wide">Backend Confirmation</p>
                  <Badge className={contractResult.backend_confirmed ? 'bg-green-600 text-white mt-1' : 'bg-red-600 text-white mt-1'}>
                    {contractResult.backend_confirmed ? 'YES' : 'NO'}
                  </Badge>
                </div>

                {contractResult.error && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-red-600 uppercase tracking-wide">Error</p>
                    <p className="text-xs text-red-800 mt-1">{contractResult.error}</p>
                  </div>
                )}
              </div>
            </Card>

            {contractResult.backend_confirmed && (
              <Card className="border border-blue-500 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-blue-700 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Next: Attach Evidence</p>
                    <p className="text-xs text-blue-800 mt-1">
                      Evidence can now be uploaded and will automatically attach to contract {contractResult.contract_id}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="border border-slate-300 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-slate-700 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-900 uppercase tracking-wide">Contract Enforcement</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Contract is immutable once ACTIVE • Evidence inherits authority type • No ingestion without contract
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