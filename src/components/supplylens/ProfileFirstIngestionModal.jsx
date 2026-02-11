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
  Calendar
} from 'lucide-react';

/**
 * PROFILE-FIRST INGESTION (DECISION-GRADE)
 * 
 * Entity → Data Domain → Ingestion Path → Authority
 * No evidence before profile.
 * Backend verifies readiness.
 * UI shows authority explicitly.
 */

const ENTITY_TYPES = [
  { id: 'supplier', label: 'Supplier', icon: Building2, description: 'Legal entity providing goods/services' },
  { id: 'facility', label: 'Facility', icon: Factory, description: 'Physical site/manufacturing location' },
  { id: 'product', label: 'Product', icon: Package, description: 'SKU/part with BOM and specs' },
  { id: 'shipment', label: 'Shipment', icon: Truck, description: 'Logistics movement with emissions' }
];

const DATA_DOMAINS = [
  { id: 'SupplierMaster', label: 'Supplier Master', description: 'Identity, contacts, certifications', modules: ['CBAM', 'CSRD', 'EUDR'] },
  { id: 'FacilityOps', label: 'Facility Operations', description: 'Sites, capacity, energy use', modules: ['CBAM', 'CSRD', 'EUDAMED'] },
  { id: 'BOM', label: 'Bill of Materials', description: 'Product composition, materials', modules: ['PCF', 'DPP', 'EUDAMED'] },
  { id: 'Transport', label: 'Transport', description: 'Logistics routes, emissions', modules: ['CBAM', 'PCF'] },
  { id: 'Emissions', label: 'Emissions', description: 'Scope 1/2/3 emissions data', modules: ['CBAM', 'CSRD', 'PCF'] }
];

const INGESTION_PATHS = {
  ERP: {
    label: 'ERP Snapshot',
    icon: Database,
    description: 'Declared snapshot from ERP system',
    authority: 'Declarative',
    authoritative: false,
    notice: 'Schema version required • Not authoritative system truth'
  },
  Portal: {
    label: 'Supplier Portal',
    icon: Users,
    description: 'Supplier self-declaration',
    authority: 'Declarative',
    authoritative: false,
    notice: 'Invite-based • Supplier declares data'
  },
  Docs: {
    label: 'Document Upload',
    icon: FileText,
    description: 'Certificates, test reports, audits',
    authority: 'Supporting',
    authoritative: true,
    notice: 'Third-party verified documents'
  },
  Bulk: {
    label: 'Bulk Import',
    icon: Upload,
    description: 'CSV/Excel structured data',
    authority: 'Declarative',
    authoritative: false,
    notice: 'Schema validation required'
  }
};

export default function ProfileFirstIngestionModal({ isOpen, onClose }) {
  const [step, setStep] = useState('entity'); // entity | domain | path | confirm
  const [profile, setProfile] = useState({
    entity_type: null,
    entity_id: null,
    data_domain: null,
    ingestion_path: null,
    authority_type: null,
    validity_window: { from_date: new Date().toISOString(), to_date: null }
  });
  const [profileResult, setProfileResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleEntitySelect = (entityType) => {
    setProfile({ ...profile, entity_type: entityType });
    setStep('domain');
  };

  const handleDomainSelect = (domain) => {
    setProfile({ ...profile, data_domain: domain });
    setStep('path');
  };

  const handlePathSelect = (pathId) => {
    const pathInfo = INGESTION_PATHS[pathId];
    setProfile({
      ...profile,
      ingestion_path: pathId,
      authority_type: pathInfo.authority
    });
    setStep('confirm');
  };

  const handleProfileCreation = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      
      const profilePayload = {
        profile_id: `PROFILE_${Date.now()}_${crypto.randomUUID()}`,
        tenant_id: user.email,
        entity_id: `ENTITY_PENDING_${Date.now()}`, // Placeholder until entity created
        entity_type: profile.entity_type,
        data_domain: profile.data_domain,
        ingestion_path: profile.ingestion_path,
        authority_type: profile.authority_type,
        validity_window: profile.validity_window,
        status: 'ACTIVE',
        backend_verified: false,
        schema_version: profile.ingestion_path === 'ERP' ? 'v2.1' : null,
        required_fields_coverage: 0,
        evidence_count: 0,
        created_by: user.email,
        created_at: new Date().toISOString(),
        usable_modules: DATA_DOMAINS.find(d => d.id === profile.data_domain)?.modules || [],
        immutable: true
      };

      const createdProfile = await base44.entities.IngestionProfile.create(profilePayload);
      
      setProfileResult({
        profile_id: createdProfile.profile_id,
        status: 'ACTIVE',
        authority_type: createdProfile.authority_type,
        backend_verified: createdProfile.backend_verified,
        usable_modules: createdProfile.usable_modules,
        success: true
      });
    } catch (err) {
      console.error('Profile creation failed:', err);
      setProfileResult({
        profile_id: null,
        status: 'FAILED',
        authority_type: profile.authority_type,
        backend_verified: false,
        error: err.message,
        success: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('entity');
    setProfile({
      entity_type: null,
      entity_id: null,
      data_domain: null,
      ingestion_path: null,
      authority_type: null,
      validity_window: { from_date: new Date().toISOString(), to_date: null }
    });
    setProfileResult(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur">
        <DialogHeader>
          <DialogTitle className="text-xl font-light uppercase tracking-wider text-slate-900">
            Profile-First Ingestion
          </DialogTitle>
          <p className="text-xs text-slate-600 mt-1">Entity → Data Domain → Ingestion Path → Authority</p>
        </DialogHeader>

        {/* STEP 1: ENTITY */}
        {step === 'entity' && (
          <div className="space-y-4 py-4">
            <p className="text-sm font-semibold text-slate-900">Select Entity Type</p>
            <div className="grid grid-cols-2 gap-3">
              {ENTITY_TYPES.map(entity => {
                const Icon = entity.icon;
                return (
                  <button
                    key={entity.id}
                    onClick={() => handleEntitySelect(entity.id)}
                    className="p-5 rounded-lg border-2 border-slate-200 hover:border-blue-400 bg-white hover:shadow-lg transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-3 rounded-lg bg-slate-50 group-hover:bg-blue-50 transition-colors">
                        <Icon className="w-6 h-6 text-slate-700 group-hover:text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{entity.label}</p>
                        <p className="text-xs text-slate-600 mt-1">{entity.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: DATA DOMAIN */}
        {step === 'domain' && (
          <div className="space-y-4 py-4">
            <Badge className="bg-slate-900 text-white mb-2">Entity: {profile.entity_type?.toUpperCase()}</Badge>
            <p className="text-sm font-semibold text-slate-900">Select Data Domain</p>
            <div className="space-y-2">
              {DATA_DOMAINS.map(domain => (
                <button
                  key={domain.id}
                  onClick={() => handleDomainSelect(domain.id)}
                  className="w-full p-4 rounded-lg border-2 border-slate-200 hover:border-blue-400 bg-white hover:shadow-lg transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{domain.label}</p>
                      <p className="text-xs text-slate-600 mt-1">{domain.description}</p>
                      <div className="flex gap-1 mt-2">
                        {domain.modules.map(mod => (
                          <Badge key={mod} className="bg-blue-100 text-blue-800 text-xs">{mod}</Badge>
                        ))}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              ))}
            </div>
            <Button onClick={() => setStep('entity')} variant="outline" className="w-full">← Back</Button>
          </div>
        )}

        {/* STEP 3: INGESTION PATH */}
        {step === 'path' && (
          <div className="space-y-4 py-4">
            <div className="flex gap-2 mb-2">
              <Badge className="bg-slate-900 text-white">Entity: {profile.entity_type?.toUpperCase()}</Badge>
              <Badge className="bg-slate-700 text-white">Domain: {profile.data_domain}</Badge>
            </div>
            <p className="text-sm font-semibold text-slate-900">Select Ingestion Path</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(INGESTION_PATHS).map(([pathId, pathInfo]) => {
                const Icon = pathInfo.icon;
                return (
                  <button
                    key={pathId}
                    onClick={() => handlePathSelect(pathId)}
                    className="p-4 rounded-lg border-2 border-slate-200 hover:border-blue-400 bg-white hover:shadow-lg transition-all text-left group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <Icon className="w-5 h-5 text-slate-700 group-hover:text-blue-600" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{pathInfo.label}</p>
                        <p className="text-xs text-slate-600 mt-1">{pathInfo.description}</p>
                      </div>
                    </div>
                    <Badge className={pathInfo.authoritative ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'}>
                      {pathInfo.authority} • {pathInfo.authoritative ? 'AUTHORITATIVE' : 'NON-AUTHORITATIVE'}
                    </Badge>
                    <p className="text-xs text-slate-600 mt-2">{pathInfo.notice}</p>
                  </button>
                );
              })}
            </div>
            <Button onClick={() => setStep('domain')} variant="outline" className="w-full">← Back</Button>
          </div>
        )}

        {/* STEP 4: CONFIRM */}
        {step === 'confirm' && !profileResult && (
          <div className="space-y-4 py-4">
            <p className="text-sm font-semibold text-slate-900">Confirm Profile Creation</p>
            <Card className="border-2 border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wide">Entity Type</p>
                  <p className="text-sm text-slate-900 mt-1 font-semibold">{profile.entity_type}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wide">Data Domain</p>
                  <p className="text-sm text-slate-900 mt-1 font-semibold">{profile.data_domain}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wide">Ingestion Path</p>
                  <p className="text-sm text-slate-900 mt-1 font-semibold">{profile.ingestion_path}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wide">Authority Type</p>
                  <Badge className={INGESTION_PATHS[profile.ingestion_path]?.authoritative ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'}>
                    {profile.authority_type}
                  </Badge>
                </div>
              </div>
            </Card>

            {profile.ingestion_path === 'ERP' && (
              <Card className="border-2 border-orange-500 bg-orange-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-700 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-orange-900">ERP Snapshot Requirements</p>
                    <ul className="text-xs text-orange-800 mt-2 space-y-1">
                      <li>• Schema Version: v2.1</li>
                      <li>• Required Fields Coverage: Will be calculated</li>
                      <li>• Authority: Declarative (NON-AUTHORITATIVE)</li>
                      <li>• Snapshot Date: Current timestamp</li>
                    </ul>
                  </div>
                </div>
              </Card>
            )}

            <div className="flex gap-2">
              <Button onClick={() => setStep('path')} variant="outline" className="flex-1">← Back</Button>
              <Button onClick={handleProfileCreation} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {loading ? 'Creating Profile...' : 'Create Profile →'}
              </Button>
            </div>
          </div>
        )}

        {/* RESULT */}
        {profileResult && (
          <div className="space-y-4 py-4">
            <Card className={`border-2 ${profileResult.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'} p-6`}>
              <div className="flex items-start gap-3 mb-4">
                {profileResult.success ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                <div>
                  <p className="text-lg font-semibold text-slate-900">
                    {profileResult.success ? 'Profile Created' : 'Profile Creation Failed'}
                  </p>
                  <p className="text-sm text-slate-700 mt-1">
                    {profileResult.success 
                      ? 'Ingestion profile is now ACTIVE. Evidence can be attached.'
                      : 'Failed to create profile. No ingestion allowed without profile.'
                    }
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide">Profile ID</p>
                    <p className="text-xs font-mono text-slate-900 mt-1">{profileResult.profile_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide">Status</p>
                    <Badge className={profileResult.success ? 'bg-green-600 text-white mt-1' : 'bg-red-600 text-white mt-1'}>
                      {profileResult.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide">Authority Type</p>
                    <p className="text-sm text-slate-900 mt-1">{profileResult.authority_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide">Backend Verified</p>
                    <Badge className={profileResult.backend_verified ? 'bg-green-600 text-white mt-1' : 'bg-yellow-600 text-white mt-1'}>
                      {profileResult.backend_verified ? 'YES' : 'PENDING'}
                    </Badge>
                  </div>
                </div>

                {profileResult.usable_modules?.length > 0 && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-slate-600 uppercase tracking-wide">Usable Modules</p>
                    <div className="flex gap-1 mt-1">
                      {profileResult.usable_modules.map(mod => (
                        <Badge key={mod} className="bg-blue-100 text-blue-800 text-xs">{mod}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {profileResult.success && (
              <Card className="border border-blue-500 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-blue-700 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Next: Attach Evidence</p>
                    <p className="text-xs text-blue-800 mt-1">
                      Evidence will automatically attach to profile {profileResult.profile_id}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <Button onClick={() => { handleReset(); onClose(); }} variant="outline" className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}