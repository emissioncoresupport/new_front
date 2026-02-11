import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, Upload, Zap, Info } from 'lucide-react';
import { toast } from 'sonner';
import { getMethodConfig, methodRequiresFiles } from '@/components/supplylens/utils/contract1MethodRegistry';

/**
 * CONTRACT 1 PAYLOAD STEP - METHOD-AWARE
 * 
 * Renders method-specific UI for evidence payload attachment.
 * Each method has different requirements for what gets hashed and stored.
 * 
 * REFACTORED 2026-01-29:
 * - Separated ingestion method from submission channel
 * - Removed SUPPLIER_PORTAL from methods (now a channel)
 * - Enforced method x evidence type compatibility
 */

export default function Contract1PayloadStepMethodAware({
  declaration,
  setDeclaration,
  draftId,
  simulationMode = false,
  onBack,
  onNext,
  requireDraftId
}) {
  const method = declaration.ingestion_method;
  const config = getMethodConfig(method);
  
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});

  if (!config) {
    return (
      <Alert className="bg-red-50 border-red-300">
        <AlertCircle className="w-4 h-4 text-red-600" />
        <AlertDescription className="text-sm text-red-900 ml-2">
          Unknown ingestion method. Please return to Step 1.
        </AlertDescription>
      </Alert>
    );
  }

  const handleFilesSelected = (files) => {
    setUploadedFiles(Array.from(files));
  };

  const handleNext = async () => {
    // Guard: require valid draftId for all methods
    if (!simulationMode && requireDraftId && !requireDraftId('attach payload')) {
      return;
    }

    const newErrors = {};

    // Validate based on method requirements
    if (methodRequiresFiles(method) && uploadedFiles.length === 0) {
      newErrors.files = `At least one file is required for ${config.label}`;
      toast.error('Missing File', {
        description: `Please upload at least one file before proceeding.`
      });
    }

    if (method === 'API_PUSH') {
      if (!declaration.payload_digest_sha256) {
        newErrors.payload_digest_sha256 = 'SHA-256 digest is required';
      } else if (!/^[a-fA-F0-9]{64}$/.test(declaration.payload_digest_sha256)) {
        newErrors.payload_digest_sha256 = 'Must be 64-character hex SHA-256';
      }
      if (!declaration.external_reference_id) {
        newErrors.external_reference_id = 'External reference ID required for idempotency';
      }
    }

    if (method === 'MANUAL_ENTRY') {
      // CRITICAL: Manual Entry - validate JSON data exists
      if (!declaration.manual_json_data || declaration.manual_json_data.trim().length === 0) {
        newErrors.manual_json_data = 'JSON data is required';
        toast.error('Missing Data', {
          description: 'Please enter valid JSON data before proceeding.'
        });
      } else {
        try {
          JSON.parse(declaration.manual_json_data);
        } catch (e) {
          newErrors.manual_json_data = 'Invalid JSON format';
          toast.error('Invalid JSON', {
            description: 'Please check your JSON syntax and try again.'
          });
        }
      }
      
      // CRITICAL: DO NOT attach any files for MANUAL_ENTRY
      // Data is stored in declaration.manual_json_data and will be hashed server-side at seal time
    }

    if (method === 'ERP_API') {
      if (!declaration.snapshot_at_utc) {
        newErrors.snapshot_at_utc = 'Snapshot timestamp required';
      }
      if (!declaration.api_event_reference) {
        newErrors.api_event_reference = 'API event reference required';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Clear errors and proceed to Step 3
    setErrors({});
    onNext();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-900">Step 2: {config.step2_label}</h3>
          <p className="text-xs text-slate-600 mt-1">{config.step2_description}</p>
        </div>
        <Badge className="bg-blue-100 text-blue-800">{method}</Badge>
      </div>

      {/* MANUAL_ENTRY: JSON Data Entry (NO FILE ATTACHMENT) */}
      {method === 'MANUAL_ENTRY' && (
        <div className="space-y-4">
          <Card className="bg-amber-50 border-amber-200 border-l-4 border-l-amber-600">
            <CardContent className="p-4">
              <p className="text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Manual Entry Mode - Low Trust Evidence</p>
                  <p className="mt-1">You are attesting to this data. It will be marked as <strong>trust_level=LOW</strong> and <strong>review_status=NOT_REVIEWED</strong>. Human approval required before this evidence can be used in compliance calculations or regulatory submissions.</p>
                </div>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3 text-xs text-blue-900">
              <p className="font-medium mb-1">What Happens Next</p>
              <p>Server canonicalizes JSON (RFC 8785), hashes canonical bytes, marks trust=LOW and review=NOT_REVIEWED. NO payload.txt file is created. Data is stored in metadata only.</p>
            </CardContent>
          </Card>

          <div>
            <Label className="text-xs font-medium">Structured Data (JSON) *</Label>
            <Textarea
              value={declaration.manual_json_data || ''}
              onChange={(e) => setDeclaration({ ...declaration, manual_json_data: e.target.value })}
              placeholder='Enter JSON data, e.g., {"supplier_name":"ACME","country":"DE"}'
              className={`font-mono h-48 ${errors.manual_json_data ? 'border-red-400' : ''}`}
            />
            <p className="text-xs text-slate-500 mt-1">Must be valid JSON - server will canonicalize and hash</p>
            {errors.manual_json_data && <p className="text-xs text-red-600 mt-1">{errors.manual_json_data}</p>}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
            <p className="text-xs font-medium text-slate-700">Preview (Will Be Canonicalized)</p>
            <pre className="bg-white border border-slate-300 rounded p-2 text-[10px] overflow-auto max-h-32 text-slate-700">
              {declaration.manual_json_data ? (() => {
                try {
                  return JSON.stringify(JSON.parse(declaration.manual_json_data), null, 2);
                } catch {
                  return '(invalid JSON - fix syntax)';
                }
              })() : '(no data entered)'}
            </pre>
          </div>

          <Alert className="bg-slate-50 border-slate-300">
            <Info className="w-4 h-4 text-slate-600" />
            <AlertDescription className="text-xs text-slate-700 ml-2">
              <strong>Payload Storage:</strong> Data stored in draft record only. No file attachment created. Server hashes canonical JSON at seal time. Expected files: 0.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* FILE_UPLOAD: File Upload */}
      {method === 'FILE_UPLOAD' && (
        <div className="space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-xs text-blue-900 flex items-start gap-2">
                <Upload className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span><strong>File Upload:</strong> Upload 1 or more files. Server-side SHA-256 hashing will be applied.</span>
              </p>
            </CardContent>
          </Card>

          <div>
            <Label className="text-xs font-medium">Files *</Label>
            <div className="border-2 border-dashed border-slate-300 rounded p-6 text-center cursor-pointer hover:bg-slate-50 transition">
              <input
                type="file"
                multiple
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-700">Click to upload or drag files</p>
                <p className="text-xs text-slate-500">CSV, Excel, PDF, JSON supported</p>
              </label>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-1">
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded p-2 text-xs">
                    <span>{f.name}</span>
                    <span className="text-slate-500">{(f.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            )}
            {errors.files && <p className="text-xs text-red-600 mt-1">{errors.files}</p>}
          </div>
        </div>
      )}

      {/* ERP_EXPORT: File Upload + Job ID */}
      {method === 'ERP_EXPORT' && (
        <div className="space-y-4">
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <p className="text-xs text-purple-900">
                <strong>ERP Export:</strong> Upload the export file from your ERP system. Hashing and validation are server-side.
              </p>
            </CardContent>
          </Card>

          <div>
            <Label className="text-xs font-medium">Export File *</Label>
            <div className="border-2 border-dashed border-slate-300 rounded p-6 text-center cursor-pointer hover:bg-slate-50 transition">
              <input
                type="file"
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
                id="export-file"
              />
              <label htmlFor="export-file" className="cursor-pointer">
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-700">Upload ERP export file</p>
              </label>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="mt-3 bg-slate-50 border border-slate-200 rounded p-2 text-xs flex items-center justify-between">
                <span>{uploadedFiles[0].name}</span>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
            )}
            {errors.files && <p className="text-xs text-red-600 mt-1">{errors.files}</p>}
          </div>
        </div>
      )}

      {/* ERP_API: Connector Reference + Snapshot */}
      {method === 'ERP_API' && (
        <div className="space-y-4">
          <Card className="bg-violet-50 border-violet-200">
            <CardContent className="p-4">
              <p className="text-xs text-violet-900">
                <strong>ERP API:</strong> Reference the API extraction. The system will use your configured connector.
              </p>
            </CardContent>
          </Card>

          <div>
            <Label className="text-xs font-medium">Snapshot Timestamp (UTC) *</Label>
            <Input
              type="datetime-local"
              value={declaration.snapshot_at_utc ? declaration.snapshot_at_utc.substring(0, 16) : ''}
              onChange={(e) => setDeclaration({ ...declaration, snapshot_at_utc: e.target.value ? new Date(e.target.value).toISOString() : '' })}
              className={errors.snapshot_at_utc ? 'border-red-400' : ''}
            />
            <p className="text-xs text-slate-500 mt-1">Point-in-time of API extraction</p>
            {errors.snapshot_at_utc && <p className="text-xs text-red-600 mt-1">{errors.snapshot_at_utc}</p>}
          </div>

          <div>
            <Label className="text-xs font-medium">API Event Reference *</Label>
            <Input
              value={declaration.api_event_reference || ''}
              onChange={(e) => setDeclaration({ ...declaration, api_event_reference: e.target.value })}
              placeholder="e.g., EVT-2026-01-28-12345"
              className={errors.api_event_reference ? 'border-red-400' : ''}
            />
            <p className="text-xs text-slate-500 mt-1">Unique ID from API system</p>
            {errors.api_event_reference && <p className="text-xs text-red-600 mt-1">{errors.api_event_reference}</p>}
          </div>
        </div>
      )}

      {/* API_PUSH: Digest Entry (No Files) */}
      {method === 'API_PUSH' && (
        <div className="space-y-4">
          <Card className="bg-indigo-50 border-indigo-200 border-l-4 border-l-indigo-600">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-indigo-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-indigo-900">API Push (Digest Only) - No Bytes Stored</p>
                  <p className="text-xs text-indigo-800 mt-1">Enter the pre-computed payload digest. No file bytes are stored by this system. External system must retain original data for audit trail verification.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <Label className="text-xs font-medium">Payload Digest (SHA-256) *</Label>
            <Input
              value={declaration.payload_digest_sha256 || ''}
              onChange={(e) => setDeclaration({ ...declaration, payload_digest_sha256: e.target.value })}
              placeholder="e.g., a1b2c3d4e5f6..."
              className={`font-mono ${errors.payload_digest_sha256 ? 'border-red-400' : ''}`}
            />
            <p className="text-xs text-slate-500 mt-1">64-character hex SHA-256 digest</p>
            {errors.payload_digest_sha256 && <p className="text-xs text-red-600 mt-1">{errors.payload_digest_sha256}</p>}
          </div>

          <div>
            <Label className="text-xs font-medium">External Reference ID (idempotency key) *</Label>
            <Input
              value={declaration.external_reference_id || ''}
              onChange={(e) => setDeclaration({ ...declaration, external_reference_id: e.target.value })}
              placeholder="e.g., API-REQ-2026-001"
              className={`font-mono ${errors.external_reference_id ? 'border-red-400' : ''}`}
            />
            <p className="text-xs text-slate-500 mt-1">Same reference + digest + method = idempotent replay</p>
            {errors.external_reference_id && <p className="text-xs text-red-600 mt-1">{errors.external_reference_id}</p>}
          </div>

          <div>
            <Label className="text-xs font-medium">Received At (UTC)</Label>
            <Input
              type="datetime-local"
              value={declaration.api_received_at_utc ? declaration.api_received_at_utc.substring(0, 16) : ''}
              onChange={(e) => setDeclaration({ ...declaration, api_received_at_utc: e.target.value ? new Date(e.target.value).toISOString() : '' })}
            />
            <p className="text-xs text-slate-500 mt-1">When the API payload was received</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onBack} disabled={uploading}>
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={uploading}
          className="bg-[#86b027] hover:bg-[#86b027]/90"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Next: Review & Seal
            </>
          )}
        </Button>
      </div>
    </div>
  );
}