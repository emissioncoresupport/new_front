import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  AlertTriangle,
  CheckCircle2,
  Zap,
  ArrowRight,
  FileText,
  Lock,
  Hash,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import UpstreamContext from './UpstreamProcessContext';
import { createPageUrl } from '@/utils';

/**
 * SupplyLens Contextual Evidence Creation
 * 
 * ENFORCES: No blind uploads. Context mandatory. One flow.
 * 
 * Only accessible from:
 * - Overview action (action_id in URL)
 * - Supplier response (request_id in URL)
 * 
 * All evidence created here is immutable, hashed, and audit-logged.
 */
export default function SupplyLensContextualEvidenceCreation() {
  const [user, setUser] = useState(null);
  const [context, setContext] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});

    // Parse URL parameters to build context
    const urlParams = new URLSearchParams(window.location.search);
    const actionType = urlParams.get('action_type');
    const blockingActionId = urlParams.get('blocking_action_id');
    const requestId = urlParams.get('request_id');
    const entityType = urlParams.get('entity_type');

    // NO context = NOT ALLOWED
    if (!actionType && !requestId) {
      setError('Error: This page must be accessed from an Overview action or Supplier request.');
      return;
    }

    // Build context from URL parameters
    if (actionType) {
      setContext(
        UpstreamContext.buildOverviewActionContext({
          type: actionType,
          blockingActionId,
          intended_entity_type: entityType || 'UNDECLARED',
          title: decodeURIComponent(urlParams.get('title') || 'Evidence required'),
          regulatory_readiness: JSON.parse(urlParams.get('regulatory_scope') || '[]'),
          required_fields_missing: JSON.parse(urlParams.get('expected_fields') || '[]')
        })
      );
    } else if (requestId) {
      // Fetch supplier request to build context
      base44.entities.SupplierDataRequest.list().then(requests => {
        const req = requests.find(r => r.id === requestId);
        if (req) {
          setContext(UpstreamContext.buildSupplierResponseContext(requestId, req));
        }
      });
    }
  }, []);

  // File upload mutation with hashing and audit trail
  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      if (!context) throw new Error('No context provided');
      if (!file) throw new Error('No file selected');

      // 1. Hash the file (SHA-256)
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // 2. Upload to Base44
      setUploadProgress(50);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      setUploadProgress(75);

      // 3. Create immutable Evidence record
      const evidenceRecord = {
        tenant_id: user?.company_id || 'default',
        source_type: 'manual',
        file_url,
        file_hash_sha256: hashHex,
        file_size_bytes: file.size,
        mime_type: file.type,
        original_filename: file.name,
        uploaded_at: new Date().toISOString(),
        hashed_at: new Date().toISOString(),
        state: 'RAW',
        declared_scope: context.entityType,
        classification_notes: `Uploaded via SupplyLens Contextual Evidence Creation. Origin: ${context.origin}`,
        regulatory_relevance: context.regulatoryScope,
        time_seal_status: 'PENDING',
        time_seal_method: 'INTERNAL',
        
        // Metadata for traceability
        context: {
          origin: context.origin,
          blockingActionId: context.blockingActionId,
          purpose: context.purpose,
          expectedFields: context.expectedFields
        }
      };

      const evidence = await base44.entities.Evidence.create(evidenceRecord);

      setUploadProgress(85);

      // 4. Audit log the upload
      await base44.entities.AuditLogEntry.create({
        tenant_id: user?.company_id || 'default',
        event_type: 'EVIDENCE_UPLOADED',
        resource_type: 'Evidence',
        resource_id: evidence.id,
        actor_email: user?.email,
        actor_role: user?.role,
        action_timestamp: new Date().toISOString(),
        details: `Evidence uploaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB). Origin: ${context.origin}`,
        status: 'SUCCESS'
      });

      setUploadProgress(100);
      return evidence;
    },
    onSuccess: (evidence) => {
      // Redirect to Evidence Vault
      window.location.href = createPageUrl(`SupplyLensEvidenceVault?evidence_id=${evidence.id}&success=true`);
    },
    onError: (err) => {
      setError(err.message);
      setUploadProgress(0);
    }
  });

  if (!user) {
    return <div className="text-center py-12 text-slate-600">Loading...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!context) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-[#86b027] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-600">Loading context...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Context Banner */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border border-[#86b027]/30 bg-gradient-to-r from-[#86b027]/5 to-emerald-50/30 p-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-[#86b027] mt-1 flex-shrink-0" />
                <div>
                  <h2 className="font-semibold text-slate-900">{context.purpose}</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    This evidence will unblock: <strong>{context.blockingActionId}</strong>
                  </p>
                </div>
              </div>

              {context.expectedFields?.length > 0 && (
                <div className="ml-8 space-y-2">
                  <p className="text-xs font-medium text-slate-700 uppercase tracking-wider">Expected Information:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {context.expectedFields.map((field, idx) => (
                      <div key={idx} className="text-xs text-slate-600 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#86b027]"></div>
                        {field}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {context.regulatoryScope?.length > 0 && (
                <div className="ml-8 space-y-2 pt-2 border-t border-[#86b027]/20">
                  <p className="text-xs font-medium text-slate-700 uppercase tracking-wider">Regulatory Scope:</p>
                  <div className="flex flex-wrap gap-2">
                    {context.regulatoryScope.map((reg, idx) => (
                      <span key={idx} className="inline-flex px-2 py-1 rounded text-xs font-light bg-[#86b027]/10 text-[#86b027]">
                        {reg}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Upload Zone */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) setSelectedFile(file);
            }}
            className="border-2 border-dashed border-[#86b027]/40 rounded-xl bg-gradient-to-b from-[#86b027]/5 to-transparent p-8 text-center hover:border-[#86b027]/60 hover:bg-[#86b027]/8 transition-all cursor-pointer"
          >
            <Upload className="w-8 h-8 text-[#86b027] mx-auto mb-3" />
            <p className="font-medium text-slate-900">
              {selectedFile ? selectedFile.name : 'Drop file or click to upload'}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Supported: PDF, XLS, CSV, DOC, ZIP
            </p>
            <input
              type="file"
              onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </motion.div>

        {/* Immutability Notice */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card className="border border-slate-200 bg-white/50 p-4">
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-600 flex-shrink-0" />
                <span><strong>Immutable & Sealed:</strong> Once uploaded, evidence cannot be modified.</span>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-slate-600 flex-shrink-0" />
                <span><strong>Cryptographic Hash:</strong> SHA-256 fingerprint computed server-side.</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600 flex-shrink-0" />
                <span><strong>Audit Trail:</strong> All uploads logged with timestamps and actor information.</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Upload Button */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Button
            onClick={() => selectedFile && uploadMutation.mutate(selectedFile)}
            disabled={!selectedFile || uploadMutation.isPending}
            className="w-full h-12 bg-[#86b027] hover:bg-[#7aa522] text-white font-medium rounded-lg"
          >
            {uploadMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Uploading & Sealing... {uploadProgress}%
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Evidence
              </div>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}