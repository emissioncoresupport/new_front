import React, { useState, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Loader2, XCircle, Upload, FileIcon, Info } from 'lucide-react';
import { toast } from 'sonner';
import { kernel_attachFile, kernel_attachPayload, kernel_getDraft } from '../KernelAdapter';

/**
 * CONTRACT 1 STEP 2 - PAYLOAD HANDLER
 * 
 * Method-specific logic:
 * - FILE_UPLOAD: drag-drop file attachment with SHA-256 verification
 * - MANUAL_ENTRY: JSON data entry (no files)
 * - API_PUSH: reference_id + payload summary (reference-first)
 * - ERP_EXPORT: snapshot_dt + file or reference
 * - ERP_API: connector_ref + snapshot_dt (no file)
 * - SUPPLIER_PORTAL: supplier_id + request_id (files optional)
 */

const METHOD_REQUIREMENTS = {
  FILE_UPLOAD: {
    requires_file: true,
    requires_payload: false,
    requires_reference: false,
    description: 'Upload 1 or more files. Server computes SHA-256 hash.'
  },
  MANUAL_ENTRY: {
    requires_file: false,
    requires_payload: true,
    requires_reference: false,
    description: 'Enter JSON data. Payload hash computed server-side from canonical JSON.'
  },
  API_PUSH: {
    requires_file: false,
    requires_payload: false,
    requires_reference: true,
    description: 'Provide external reference ID (idempotency key) for tracking.'
  },
  ERP_EXPORT: {
    requires_file: true,
    requires_payload: false,
    requires_reference: true,
    description: 'Upload export file or provide reference. Snapshot already captured in Step 1.'
  },
  ERP_API: {
    requires_file: false,
    requires_payload: false,
    requires_reference: true,
    description: 'Connector reference provided in Step 1. No file upload needed.'
  },
  SUPPLIER_PORTAL: {
    requires_file: false,
    requires_payload: false,
    requires_reference: true,
    description: 'Supplier submission reference from Step 1. Optional file upload for supporting docs.'
  }
};

export default function Contract1PayloadStepHardened({
  declaration,
  draftId,
  simulationMode = false,
  onBack,
  onNext
}) {
  const inFlightRef = useRef(false);
  const [attachments, setAttachments] = useState([]);
  const [payload, setPayload] = useState('');
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  const method = declaration.ingestion_method;
  const requirements = METHOD_REQUIREMENTS[method] || {};

  // Validate payload JSON
  const validateJSON = (json) => {
    try {
      JSON.parse(json);
      return { valid: true };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  };

  // Handle file drop/select
  const handleFileSelect = async (files) => {
    if (!requirements.requires_file) {
      toast.error('This method does not accept file uploads');
      return;
    }

    for (const file of files) {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        setError(null);
        setValidationErrors([]);

        if (simulationMode) {
          // Simulated attachment
          const simHash = 'SIM' + Math.random().toString(36).substr(2, 61);
          setAttachments(prev => [...prev, {
            attachment_id: `SIM-${Date.now()}`,
            filename: file.name,
            size_bytes: file.size,
            content_type: file.type,
            sha256: simHash,
            simulated: true
          }]);
          toast.success(`File simulated: ${file.name}`);
          return;
        }

        const result = await kernel_attachFile(draftId, file);

        if (result.error_code) {
          if (result.error_code === 'VALIDATION_FAILED') {
            setValidationErrors(result.field_errors || []);
            toast.error('File validation failed', {
              description: result.field_errors?.map(e => e.message).join(', ')
            });
          } else if (result.error_code === 'SYSTEM_ERROR') {
            setError({
              type: 'system',
              message: result.message || 'Upload failed',
              correlation_id: result.correlation_id
            });
            toast.error('System error', {
              description: result.correlation_id ? `Ref: ${result.correlation_id}` : 'Please retry'
            });
          }
          return;
        }

        setAttachments(prev => [...prev, result]);
        toast.success(`File attached: ${file.name}`);
      } finally {
        inFlightRef.current = false;
      }
    }
  };

  // Handle payload entry (MANUAL_ENTRY)
  const handlePayloadSubmit = async () => {
    if (!payload.trim()) {
      toast.error('Payload cannot be empty');
      return;
    }

    const validation = validateJSON(payload);
    if (!validation.valid) {
      toast.error('Invalid JSON', { description: validation.error });
      return;
    }

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      setError(null);
      setValidationErrors([]);

      if (simulationMode) {
        const simHash = 'SIM' + Math.random().toString(36).substr(2, 61);
        setAttachments([{
          attachment_id: `SIM-PAYLOAD-${Date.now()}`,
          attachment_kind: 'PAYLOAD',
          size_bytes: payload.length,
          sha256: simHash,
          simulated: true
        }]);
        toast.success('Payload verified (simulated)');
        return;
      }

      const result = await kernel_attachPayload(draftId, payload);

      if (result.error_code) {
        if (result.error_code === 'VALIDATION_FAILED') {
          setValidationErrors(result.field_errors || []);
          toast.error('Payload validation failed');
        } else {
          setError({
            type: 'system',
            message: result.message || 'Payload attachment failed',
            correlation_id: result.correlation_id
          });
          toast.error('System error', {
            description: result.correlation_id ? `Ref: ${result.correlation_id}` : 'Please retry'
          });
        }
        return;
      }

      setAttachments([result]);
      toast.success('Payload verified and attached');
    } finally {
      inFlightRef.current = false;
    }
  };

  // Get draft status and attachments
  const handleRefreshDraft = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const result = await kernel_getDraft(draftId);

      if (result.error_code) {
        setError({
          type: 'system',
          message: 'Draft not found or expired. Return to Step 1 to create new draft.',
          correlation_id: result.correlation_id
        });
        return;
      }

      setAttachments(result.attachments || []);
    } finally {
      inFlightRef.current = false;
    }
  };

  // Check if we can proceed
  const canProceed = () => {
    if (requirements.requires_file && attachments.length === 0) return false;
    if (requirements.requires_payload && attachments.length === 0) return false;
    return true;
  };

  const isLoading = inFlightRef.current;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-900">Step 2: API Receipt Details</h3>
          <p className="text-xs text-slate-600 mt-1">{requirements.description}</p>
        </div>
        {simulationMode && (
          <Badge className="bg-amber-100 text-amber-800">UI Validation</Badge>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="bg-red-50 border-red-300">
          <XCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-sm text-red-900 ml-2">
            <strong>System Error:</strong> {error.message}
            {error.correlation_id && (
              <p className="text-xs mt-1 font-mono text-red-700">Ref: {error.correlation_id}</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert className="bg-amber-50 border-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-900 ml-2">
            {validationErrors.map((e, i) => (
              <div key={i}>
                <strong>{e.field}:</strong> {e.message}
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* METHOD-SPECIFIC UIs */}
      {method === 'FILE_UPLOAD' && (
        <div className="space-y-3">
          {/* File Dropzone */}
          <div
            onDrop={(e) => {
              e.preventDefault();
              handleFileSelect(Array.from(e.dataTransfer.files));
            }}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-[#86b027] transition cursor-pointer bg-slate-50/50"
          >
            <input
              type="file"
              multiple
              onChange={(e) => handleFileSelect(Array.from(e.target.files || []))}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">Drag files here or click to select</p>
              <p className="text-xs text-slate-500 mt-1">CSV, JSON, XML, PDF supported</p>
            </label>
          </div>

          {/* Attached Files */}
          {attachments.length > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium text-green-900 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {attachments.length} file(s) attached
                </p>
                {attachments.map((att, i) => (
                  <div key={i} className="bg-white rounded p-2 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <FileIcon className="w-3 h-3 text-slate-500" />
                      <span className="font-mono">{att.filename || 'payload'}</span>
                      {att.simulated && <Badge className="text-[10px] bg-amber-100 text-amber-800">SIM</Badge>}
                    </div>
                    <div className="text-slate-600">Size: {(att.size_bytes / 1024).toFixed(2)} KB</div>
                    <div className="text-slate-600">SHA-256: <code className="font-mono text-[10px] break-all">{att.sha256}</code></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {method === 'MANUAL_ENTRY' && (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-xs text-blue-900">
              <strong>Trust Level: LOW</strong> - Manual entries require reviewer approval before use in calculations.
            </p>
          </div>

          <Textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder='{"supplier_id": "SUP-001", "country": "DE", "certifications": ["ISO9001"]}'
            className="font-mono h-40 text-xs"
          />

          <Button
            onClick={handlePayloadSubmit}
            disabled={isLoading || !payload.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Verify Payload
              </>
            )}
          </Button>

          {attachments.length > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3">
                <p className="text-xs text-green-900">
                  <strong>✓ Payload verified</strong> - Hash computed from canonical JSON
                </p>
                <code className="text-[10px] font-mono text-slate-700 block mt-2 break-all">
                  {attachments[0].sha256}
                </code>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {method === 'API_PUSH' && (
        <div className="space-y-3 bg-indigo-50 border border-indigo-200 rounded p-4">
          <p className="text-xs text-indigo-900 mb-3">
            <strong>Step 2 Requirements:</strong> External reference ID and payload digest (both from Step 1 & 2). Server will set received_at_utc.
          </p>

          {/* Read-only fields from Step 1 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-indigo-700 block mb-1">External Reference ID</label>
              <code className="text-xs bg-white rounded px-2 py-2 border border-indigo-200 block font-mono text-slate-900">
                {declaration.external_reference_id || '—'}
              </code>
            </div>
            <div>
              <label className="text-xs font-medium text-indigo-700 block mb-1">Payload Digest SHA-256</label>
              <code className="text-[10px] bg-white rounded px-2 py-2 border border-indigo-200 block font-mono text-slate-900 break-all">
                {declaration.payload_digest_sha256 ? `${declaration.payload_digest_sha256.substring(0, 20)}...` : '—'}
              </code>
            </div>
          </div>

          {/* Server-authoritative received_at_utc (read-only) */}
          <div className="bg-indigo-100 border border-indigo-300 rounded p-3">
            <label className="text-xs font-medium text-indigo-800 block mb-1">✓ Received At (UTC) — Server-Set</label>
            <code className="text-xs bg-white rounded px-2 py-1 border border-indigo-200 block font-mono text-slate-900">
              {declaration.received_at_utc ? new Date(declaration.received_at_utc).toISOString() : 'Pending (server will set at seal)'}
            </code>
            <p className="text-[10px] text-indigo-700 mt-1 italic">ⓘ Server-authoritative timestamp. Read-only.</p>
          </div>

          {/* Optional: Payload bytes count from Step 2 */}
          {declaration.payload_bytes_count && (
            <div>
              <label className="text-xs font-medium text-indigo-700">Payload Bytes Count</label>
              <code className="text-xs bg-white rounded px-2 py-1 border border-indigo-200 block mt-1">
                {declaration.payload_bytes_count.toLocaleString()} bytes
              </code>
            </div>
          )}

          {/* Optional: Source endpoint from Step 2 */}
          {declaration.source_endpoint && (
            <div>
              <label className="text-xs font-medium text-indigo-700">Source Endpoint</label>
              <code className="text-xs bg-white rounded px-2 py-1 border border-indigo-200 block mt-1 break-all">
                {declaration.source_endpoint}
              </code>
            </div>
          )}

          {/* Status card */}
          <Card className="bg-green-50 border-green-200 mt-3">
            <CardContent className="p-2 text-xs">
              <p className="text-green-900 font-medium flex items-center gap-1 mb-1">
                <CheckCircle2 className="w-3 h-3" /> API_PUSH Receipt Ready
              </p>
              <p className="text-green-800 text-[10px]">All Step 2 fields captured. Ready to proceed to review.</p>
            </CardContent>
          </Card>

          <Button
            onClick={() => {
              setAttachments([{ attachment_id: 'API_PUSH_RECEIPT', digest_verified: true }]);
              toast.success('Receipt ready for review');
            }}
            disabled={isLoading || !declaration.external_reference_id || !declaration.payload_digest_sha256}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Preparing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Proceed to Review & Seal
              </>
            )}
          </Button>
        </div>
      )}

      {method === 'ERP_EXPORT' && (
        <div className="space-y-3 bg-purple-50 border border-purple-200 rounded p-3">
          <p className="text-xs text-purple-900">
            <strong>Snapshot captured in Step 1.</strong> Upload export file or provide reference.
          </p>
          <div>
            <label className="text-xs font-medium text-slate-700">Snapshot Timestamp (from Step 1)</label>
            <div className="mt-1 px-3 py-2 bg-white border border-slate-300 rounded text-sm font-mono text-slate-700">
              {declaration.snapshot_at_utc || 'Not set'}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-700 mb-2">Upload export file (optional)</p>
            <input
              type="file"
              onChange={(e) => handleFileSelect(Array.from(e.target.files || []))}
              className="block w-full text-sm text-slate-600 border border-slate-300 rounded p-2"
            />
          </div>
          {attachments.length > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-2">
                <p className="text-xs text-green-900">
                  ✓ Export file attached: {attachments[0].filename}
                </p>
              </CardContent>
            </Card>
          )}
          <Button
            onClick={() => {
              if (attachments.length === 0) setAttachments([{ attachment_id: 'ERP_EXPORT_REF' }]);
              toast.success('Export reference ready');
            }}
            disabled={isLoading}
            className="w-full"
          >
            Proceed to Review
          </Button>
        </div>
      )}

      {method === 'ERP_API' && (
        <div className="space-3 bg-violet-50 border border-violet-200 rounded p-3">
          <p className="text-xs text-violet-900 mb-3">
            <strong>Real-time Query:</strong> Connector reference and snapshot captured in Step 1. No file needed.
          </p>
          <div className="space-y-2">
            <div>
              <label className="text-xs font-medium text-slate-700">Connector Reference</label>
              <div className="mt-1 px-3 py-2 bg-white border border-slate-300 rounded text-sm font-mono text-slate-700">
                {declaration.connector_reference || 'Not set'}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Snapshot Timestamp</label>
              <div className="mt-1 px-3 py-2 bg-white border border-slate-300 rounded text-sm font-mono text-slate-700">
                {declaration.snapshot_at_utc || 'Not set'}
              </div>
            </div>
          </div>
          <Button
            onClick={() => {
              setAttachments([{ attachment_id: 'ERP_API_REF' }]);
              toast.success('ERP API reference ready');
            }}
            disabled={isLoading}
            className="w-full mt-4"
          >
            Proceed to Review
          </Button>
        </div>
      )}

      {method === 'SUPPLIER_PORTAL' && (
        <div className="space-y-3 bg-green-50 border border-green-200 rounded p-3">
          <p className="text-xs text-green-900">
            <strong>Supplier Submission:</strong> Request ID captured in Step 1. Optional supporting files.
          </p>
          <div>
            <label className="text-xs font-medium text-slate-700">Portal Request ID</label>
            <div className="mt-1 px-3 py-2 bg-white border border-slate-300 rounded text-sm font-mono text-slate-700">
              {declaration.portal_request_id || 'Not set'}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-700 mb-2">Supporting Documents (optional)</p>
            <input
              type="file"
              multiple
              onChange={(e) => handleFileSelect(Array.from(e.target.files || []))}
              className="block w-full text-sm text-slate-600 border border-slate-300 rounded p-2"
            />
          </div>
          {attachments.length > 0 && (
            <Card className="bg-green-100 border-green-300">
              <CardContent className="p-2">
                <p className="text-xs text-green-900">✓ {attachments.length} file(s) attached</p>
              </CardContent>
            </Card>
          )}
          <Button
            onClick={() => {
              if (attachments.length === 0) setAttachments([{ attachment_id: 'SUPPLIER_PORTAL_REF' }]);
              toast.success('Supplier portal submission ready');
            }}
            disabled={isLoading}
            className="w-full"
          >
            Proceed to Review
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed() || isLoading}
          className="bg-[#86b027] hover:bg-[#86b027]/90"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Review & Seal
            </>
          )}
        </Button>
      </div>
    </div>
  );
}