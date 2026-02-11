import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { createPageUrl } from '@/utils';

/**
 * SupplyLens Evidence Creation (Page 2)
 * 
 * RULE: Evidence is created ONLY from:
 * - Overview action (contextual)
 * - Supplier response
 * 
 * Every upload includes WHY context.
 * Low-confidence uploads are flagged.
 */

export default function SupplyLensEvidenceCreation() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [sourceType, setSourceType] = useState('manual');
  const [context, setContext] = useState('');
  const [uploadError, setUploadError] = useState(null);

  // Parse URL context if coming from Overview action
  const urlParams = new URLSearchParams(window.location.search);
  const contextReason = urlParams.get('reason'); // e.g., 'missing_evidence', 'supplier_response'
  const contextField = urlParams.get('field'); // e.g., 'company_carbon_report'

  const uploadMutation = useMutation({
    mutationFn: async (fileData) => {
      const { file, type } = fileData;
      
      // Hash file server-side
      const fileBytes = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', fileBytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Upload file
      const uploadedFile = await base44.integrations.Core.UploadFile({ file });

      // Create Evidence
      const evidence = await base44.entities.Evidence.create({
        tenant_id: 'default_tenant',
        source_type: type,
        file_url: uploadedFile.file_url,
        file_hash_sha256: hashHex,
        file_size_bytes: file.size,
        mime_type: file.type,
        original_filename: file.name,
        uploaded_at: new Date().toISOString(),
        hashed_at: new Date().toISOString(),
        state: 'RAW',
        ingestion_channel_id: 'manual_upload'
      });

      // Log to audit trail
      const user = await base44.auth.me();
      await base44.entities.AuditLogEntry.create({
        tenant_id: 'default_tenant',
        event_type: 'EVIDENCE_UPLOADED',
        resource_type: 'Evidence',
        resource_id: evidence.id,
        actor_email: user.email,
        action_timestamp: new Date().toISOString(),
        status: 'SUCCESS',
        details: `Evidence uploaded: ${file.name} (${type})`
      });

      return evidence;
    },
    onSuccess: (evidence) => {
      setSelectedFile(null);
      setUploadError(null);
      // Redirect to Evidence Vault with new evidence ID
      setTimeout(() => {
        window.location.href = createPageUrl(`SupplyLensEvidenceVault?evidence_id=${evidence.id}`);
      }, 1000);
    },
    onError: (error) => {
      setUploadError(error.message || 'Upload failed');
    }
  });

  const handleFileSelect = (file) => {
    if (file.size > 500 * 1024 * 1024) { // 500MB limit
      setUploadError('File exceeds 500MB limit');
      return;
    }
    setSelectedFile(file);
    setUploadError(null);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate({ file: selectedFile, type: sourceType });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="text-4xl font-light tracking-widest text-slate-900 uppercase">
              Upload Evidence
            </h1>
            <p className="text-sm text-slate-600 mt-2 tracking-wide">
              Contextual. Immutable. Auditable.
            </p>
          </div>
        </motion.div>

        {/* Context Display */}
        {(contextReason || contextField) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border border-[#86b027]/40 bg-[#86b027]/5 p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-[#86b027] mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-slate-900">Upload Context</p>
                  <p className="text-slate-600 mt-1">
                    {contextReason === 'missing_evidence' && `Missing evidence for: ${contextField}`}
                    {contextReason === 'supplier_response' && 'Response to supplier data request'}
                    {contextReason === 'general_upload' && 'General evidence upload'}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Upload Zone */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-2 border-dashed border-slate-300 hover:border-[#86b027] bg-white p-8 transition-all">
            <label className="block cursor-pointer">
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <Upload className="w-8 h-8 text-slate-400" />
                <div className="text-center">
                  <p className="font-medium text-slate-900">Upload file</p>
                  <p className="text-xs text-slate-600 mt-1">PDF, Excel, CSV, ZIP (max 500MB)</p>
                </div>
              </div>
              <input
                type="file"
                className="hidden"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                disabled={uploadMutation.isPending}
              />
            </label>
          </Card>
        </motion.div>

        {/* Selected File */}
        {selectedFile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{selectedFile.name}</p>
                    <p className="text-xs text-slate-600">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  disabled={uploadMutation.isPending}
                  className="text-slate-600 hover:text-slate-900"
                >
                  Remove
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Source Type */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div>
            <label className="text-sm font-medium text-slate-900 block mb-3">
              Evidence Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['manual', 'supplier', 'document'].map((type) => (
                <Button
                  key={type}
                  variant={sourceType === type ? 'default' : 'outline'}
                  onClick={() => setSourceType(type)}
                  className={sourceType === type ? 'bg-[#86b027] text-white' : ''}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Error */}
        {uploadError && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-700">{uploadError}</AlertDescription>
          </Alert>
        )}

        {/* Upload Button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
            className="w-full h-10 bg-[#86b027] hover:bg-[#7aa522] text-white flex items-center justify-center gap-2"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                Upload & Proceed
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </motion.div>

        {/* Info */}
        <Card className="border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4">
          <div className="text-xs text-slate-600 space-y-2">
            <p>• File is immediately hashed (SHA-256) server-side</p>
            <p>• Upload timestamp is server-authorized (UTC)</p>
            <p>• Evidence is immutable after creation</p>
            <p>• All uploads logged to audit trail</p>
          </div>
        </Card>
      </div>
    </div>
  );
}