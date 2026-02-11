import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Upload, AlertCircle, CheckCircle2, Copy, ArrowRight, 
  Loader2, FileText, Shield, Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { createPageUrl } from '@/utils';

const ENTITY_TYPES = [
  { value: 'SUPPLIER', label: 'Supplier Data' },
  { value: 'SITE', label: 'Manufacturing Site' },
  { value: 'SKU', label: 'Product / SKU' },
  { value: 'MATERIAL', label: 'Raw Material' },
  { value: 'BOM', label: 'Bill of Materials' },
  { value: 'SHIPMENT', label: 'Logistics / Shipment' },
  { value: 'OTHER', label: 'Other / Mixed' }
];

const UPLOAD_PURPOSES = [
  { value: 'missing_field', label: 'Missing Data for Mapping' },
  { value: 'supplier_response', label: 'Supplier Response' },
  { value: 'compliance_evidence', label: 'Regulatory Compliance Evidence' },
  { value: 'erp_snapshot', label: 'ERP System Snapshot' },
  { value: 'audit_support', label: 'Audit Support' },
  { value: 'data_correction', label: 'Data Correction / Clarification' }
];

export default function SupplyLensCanonicalDataUpload() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('context'); // context | file | confirmation

  // STEP 1: Context Capture
  const [context, setContext] = useState({
    purpose: '',
    entityType: '',
    entityName: '',
    relatedEntityId: '',
    minimumExpectations: '',
    regulatoryScope: [],
    gdprLegalBasis: 'CONSENT'
  });

  // STEP 2: File Selection
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // STEP 3: Server Response
  const [evidenceRecord, setEvidenceRecord] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    
    // Parse URL parameters from Overview action
    const params = new URLSearchParams(window.location.search);
    const urlPurpose = params.get('purpose');
    const urlEntityType = params.get('entity_type');
    const urlActionType = params.get('action_type');
    const urlRequestId = params.get('request_id');
    
    if (urlPurpose || urlEntityType) {
      setContext(prev => ({
        ...prev,
        purpose: urlPurpose || prev.purpose,
        entityType: urlEntityType || prev.entityType,
        relatedEntityId: urlRequestId || prev.relatedEntityId
      }));
    }
  }, []);

  // CONTEXT VALIDATION
  const isContextValid = () => {
    return context.purpose && context.entityType && context.minimumExpectations;
  };

  // FILE UPLOAD MUTATION
  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      try {
        setUploadProgress(0);
        
        // Step 1: Upload file to secure storage
        const fileFormData = new FormData();
        fileFormData.append('file', file);
        
        const uploadRes = await base44.functions.invoke('secureFileHashAndSeal', {
          file: file,
          context: {
            purpose: context.purpose,
            entityType: context.entityType,
            entityName: context.entityName,
            relatedEntityId: context.relatedEntityId,
            minimumExpectations: context.minimumExpectations,
            regulatoryScope: context.regulatoryScope,
            gdprLegalBasis: context.gdprLegalBasis
          }
        });

        setUploadProgress(50);

        // Step 2: Create Evidence record
        if (uploadRes.data?.file_url && uploadRes.data?.file_hash) {
          const evidenceData = {
            tenant_id: user?.company_id || 'default',
            source_type: 'manual',
            state: 'RAW',
            file_url: uploadRes.data.file_url,
            file_hash_sha256: uploadRes.data.file_hash,
            file_size_bytes: file.size,
            mime_type: file.type || 'application/octet-stream',
            original_filename: file.name,
            uploaded_at: new Date().toISOString(),
            hashed_at: new Date().toISOString(),
            declared_scope: context.entityType,
            ingestion_channel_id: 'canonical_manual_upload',
            gdpr_personal_data_detected: false,
            gdpr_legal_basis: context.gdprLegalBasis,
            classification_notes: `[AUTO] Upload purpose: ${context.purpose}. Expected content: ${context.minimumExpectations}`
          };

          const createdEvidence = await base44.entities.Evidence.create(evidenceData);
          
          setUploadProgress(100);

          // Step 3: Log audit event
          await base44.entities.AuditLogEntry.create({
            tenant_id: user?.company_id || 'default',
            event_type: 'EVIDENCE_UPLOADED',
            resource_type: 'Evidence',
            resource_id: createdEvidence.id,
            actor_email: user?.email,
            actor_role: user?.role,
            action_timestamp: new Date().toISOString(),
            details: `Canonical upload: ${file.name} (${context.purpose}) → ${context.entityType}`,
            status: 'SUCCESS'
          });

          return createdEvidence;
        }

        throw new Error('File upload failed: no hash returned');
      } catch (err) {
        console.error('Upload error:', err);
        setUploadError(err.message || 'Upload failed. Please try again.');
        throw err;
      }
    },
    onSuccess: (evidence) => {
      setEvidenceRecord(evidence);
      setStep('confirmation');
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
    }
  });

  const handleContextSubmit = (e) => {
    e.preventDefault();
    if (isContextValid()) {
      setStep('file');
      setUploadError(null);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
      // Auto-submit
      uploadMutation.mutate(file);
    }
  };

  const handleReset = () => {
    setStep('context');
    setContext({
      purpose: '',
      entityType: '',
      entityName: '',
      relatedEntityId: '',
      minimumExpectations: '',
      regulatoryScope: [],
      gdprLegalBasis: 'CONSENT'
    });
    setSelectedFile(null);
    setEvidenceRecord(null);
    setUploadError(null);
    setUploadProgress(0);
  };

  if (!user) return <div className="text-center py-12 text-slate-600">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="text-3xl font-light tracking-widest text-slate-900 uppercase">
              Canonical Data Upload
            </h1>
            <p className="text-sm text-slate-600 mt-2 tracking-wide">
              Context-first, immutable, audit-grade.
            </p>
          </div>
        </motion.div>

        {/* STEP INDICATOR */}
        <div className="flex gap-3 items-center justify-center">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${step === 'context' ? 'bg-[#86b027]/20 text-[#86b027]' : 'bg-slate-200 text-slate-600'}`}>
            <Shield className="w-4 h-4" />
            <span className="text-xs font-medium">Context</span>
          </div>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${step === 'file' ? 'bg-[#86b027]/20 text-[#86b027]' : 'bg-slate-200 text-slate-600'}`}>
            <Upload className="w-4 h-4" />
            <span className="text-xs font-medium">File</span>
          </div>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${step === 'confirmation' ? 'bg-[#86b027]/20 text-[#86b027]' : 'bg-slate-200 text-slate-600'}`}>
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-medium">Confirm</span>
          </div>
        </div>

        {/* STEP 1: CONTEXT CAPTURE */}
        {step === 'context' && (
          <motion.form onSubmit={handleContextSubmit} className="space-y-6">
            <Card className="border border-slate-200 bg-white p-6 space-y-4">
              
              {/* Upload Purpose */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Upload Purpose *
                </label>
                <select
                  value={context.purpose}
                  onChange={(e) => setContext({ ...context, purpose: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#86b027] focus:border-transparent"
                >
                  <option value="">Select...</option>
                  {UPLOAD_PURPOSES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Entity Type */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Target Entity Type *
                </label>
                <select
                  value={context.entityType}
                  onChange={(e) => setContext({ ...context, entityType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#86b027] focus:border-transparent"
                >
                  <option value="">Select...</option>
                  {ENTITY_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Entity Name / Reference */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Entity Name (optional)
                  </label>
                  <input
                    type="text"
                    value={context.entityName}
                    onChange={(e) => setContext({ ...context, entityName: e.target.value })}
                    placeholder="e.g., Supplier ABC Inc"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#86b027] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Related Entity ID (optional)
                  </label>
                  <input
                    type="text"
                    value={context.relatedEntityId}
                    onChange={(e) => setContext({ ...context, relatedEntityId: e.target.value })}
                    placeholder="e.g., SUP-12345"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#86b027] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Minimum Expectations */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  What should this file contain? *
                </label>
                <textarea
                  value={context.minimumExpectations}
                  onChange={(e) => setContext({ ...context, minimumExpectations: e.target.value })}
                  placeholder="e.g., Company registration, ISO certificates, carbon emissions for 2025, supply chain map..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#86b027] focus:border-transparent"
                />
              </div>

              {/* GDPR Confirmation */}
              <div className="border-t border-slate-200 pt-4">
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  GDPR Legal Basis *
                </label>
                <select
                  value={context.gdprLegalBasis}
                  onChange={(e) => setContext({ ...context, gdprLegalBasis: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#86b027] focus:border-transparent"
                >
                  <option value="CONSENT">Explicit Consent</option>
                  <option value="CONTRACT">Contract Performance</option>
                  <option value="LEGAL_OBLIGATION">Legal Obligation</option>
                  <option value="LEGITIMATE_INTERESTS">Legitimate Interests</option>
                </select>
              </div>

            </Card>

            <Button
              type="submit"
              disabled={!isContextValid()}
              className="w-full bg-[#86b027] hover:bg-[#7aa522] text-white py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to File Upload
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.form>
        )}

        {/* STEP 2: FILE UPLOAD */}
        {step === 'file' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Context Summary */}
            <Card className="border border-slate-200 bg-slate-50 p-4 space-y-2">
              <p className="text-xs font-medium text-slate-600">UPLOAD CONTEXT</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-500">Purpose</p>
                  <p className="font-medium text-slate-900">{UPLOAD_PURPOSES.find(p => p.value === context.purpose)?.label}</p>
                </div>
                <div>
                  <p className="text-slate-500">Entity Type</p>
                  <p className="font-medium text-slate-900">{ENTITY_TYPES.find(t => t.value === context.entityType)?.label}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 border-t border-slate-300 pt-2 mt-2">
                <strong>Expectations:</strong> {context.minimumExpectations}
              </p>
            </Card>

            {/* File Drop Zone */}
            <Card className="border-2 border-dashed border-slate-300 bg-white p-8 text-center space-y-4">
              <Upload className="w-8 h-8 text-[#86b027] mx-auto" />
              <div>
                <p className="text-sm font-medium text-slate-900">Select a file to upload</p>
                <p className="text-xs text-slate-600 mt-1">PDF, XLS, CSV, DOC, ZIP (max 50MB)</p>
              </div>
              <input
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.xls,.xlsx,.csv,.doc,.docx,.zip"
                disabled={uploadMutation.isPending}
                className="hidden"
                id="file-input"
              />
              <label htmlFor="file-input">
                <Button
                  as="button"
                  disabled={uploadMutation.isPending}
                  className="bg-[#86b027] hover:bg-[#7aa522] text-white cursor-pointer"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading... ({uploadProgress}%)
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Browse & Upload
                    </>
                  )}
                </Button>
              </label>
            </Card>

            {/* Upload Error */}
            {uploadError && (
              <Card className="border border-red-300 bg-red-50 p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">Upload Failed</p>
                  <p className="text-xs text-red-700 mt-1">{uploadError}</p>
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {/* STEP 3: CONFIRMATION */}
        {step === 'confirmation' && evidenceRecord && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            <Card className="border border-green-300 bg-green-50 p-4 flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">Upload Successful</p>
                <p className="text-xs text-green-700 mt-1">Evidence sealed and audited.</p>
              </div>
            </Card>

            {/* Evidence Details */}
            <Card className="border border-slate-200 bg-white p-6 space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">EVIDENCE ID</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-[#86b027]">{evidenceRecord.id}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigator.clipboard.writeText(evidenceRecord.id)}
                    className="h-6 w-6"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">FILE</p>
                <p className="text-sm text-slate-900 font-medium">{evidenceRecord.original_filename}</p>
                <p className="text-xs text-slate-500 mt-1">{(evidenceRecord.file_size_bytes / 1024).toFixed(1)} KB</p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">SHA-256 HASH</p>
                <code className="text-xs font-mono text-slate-700 break-all bg-slate-50 p-2 rounded block">
                  {evidenceRecord.file_hash_sha256}
                </code>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-1">UPLOADED AT</p>
                  <p className="text-sm text-slate-900">{new Date(evidenceRecord.uploaded_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-1">STATE</p>
                  <p className="text-sm font-mono text-[#86b027]">{evidenceRecord.state}</p>
                </div>
              </div>
            </Card>

            {/* What's Next */}
            <Card className="border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-xs font-medium text-slate-700 uppercase">What's Next</p>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>✓ Evidence locked and immutable</li>
                <li>✓ Audit trail created</li>
                <li>→ Proceed to classification (AI suggestions)</li>
                <li>→ Declare entity scope and fields</li>
                <li>→ Evaluate mapping eligibility</li>
              </ul>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1"
              >
                Upload Another File
              </Button>
              <Button
                onClick={() => window.location.href = createPageUrl('SupplyLens')}
                className="flex-1 bg-[#86b027] hover:bg-[#7aa522] text-white"
              >
                Back to Overview
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}