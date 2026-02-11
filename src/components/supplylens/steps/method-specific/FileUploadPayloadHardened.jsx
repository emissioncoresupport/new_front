import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, File, CheckCircle2, AlertCircle, Loader2, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
// Evidence Engine Adapter - internal naming only, never shown to users
import * as Kernel from '@/components/supplylens/KernelAdapter';
import { generateSimulationHash } from '@/components/supplylens/utils/simulationHash';

export default function FileUploadPayloadHardened({
  draftId,
  declaration,
  simulationMode,
  onSimulationModeToggle,
  onNext,
  onBack,
  onFileAttached
}) {
  const [file, setFile] = useState(null);
  const [fileMetadata, setFileMetadata] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploading = isUploading;
  const [uploadError, setUploadError] = useState(null);
  const [fileHash, setFileHash] = useState(null);
  const fileInputRef = useRef(null);

  // Verify draft_id on mount - internal logging only
  React.useEffect(() => {
    if (!draftId && !simulationMode) {
      console.warn('[Evidence Engine] Draft reference missing - production upload disabled');
    } else if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[Evidence Engine] Step 2 ready |', simulationMode ? 'UI Validation' : 'Production', '| Draft:', draftId?.substring(0, 12) || 'N/A');
    }
  }, [draftId, simulationMode]);

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);

    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[Evidence Engine] File upload mode:', simulationMode ? 'SIMULATION' : 'PRODUCTION', ' | Draft:', draftId?.substring(0, 8));
    }

    try {
      if (!simulationMode && !draftId) {
        throw new Error('Draft reference missing. Please return to Step 1 and create a new draft.');
      }

      let result;

      if (simulationMode) {
        // Simulation Mode: Generate deterministic test hash
        const testHash = generateSimulationHash(selectedFile);
        
        result = {
          attachment_id: `SIM_ATT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          filename: selectedFile.name,
          size_bytes: selectedFile.size,
          content_type: selectedFile.type || 'application/octet-stream',
          sha256: testHash,
          sha256_hash: testHash,
          uploaded_at_utc: new Date().toISOString(),
          simulated: true,
          correlation_id: `SIM-CORR-${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          build_id: 'ui-validation-mode',
          contract_version: 'contract_ingest_v1'
        };
        
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.log('[Evidence Engine] Simulated hash generated:', testHash.substring(0, 16) + '...');
        }
      } else {
        // Production Mode: Server-side upload with timeout
        const uploadTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('File upload timed out after 15 seconds')), 15000)
        );
        
        const uploadOperation = Kernel.kernel_attachFile(draftId, selectedFile);
        result = await Promise.race([uploadOperation, uploadTimeoutPromise]);
        
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.log('[Evidence Engine] Server-side hash computed');
        }
      }

      if (result.error_code) {
        setUploadError({
          code: result.error_code,
          message: result.message,
          correlation_id: result.correlation_id,
          field_errors: result.field_errors
        });
        
        if (result.field_errors && result.field_errors.length > 0) {
          const fieldMsg = result.field_errors.map(e => `${e.field}: ${e.message || e.error}`).join(' • ');
          toast.error('Validation Failed', {
            description: `${fieldMsg} (Reference: ${result.correlation_id})`,
            duration: 8000
          });
        } else {
          toast.error('Upload Failed', {
            description: `${result.message} (Reference ID: ${result.correlation_id})`,
            duration: 6000
          });
        }
        return;
      }

      const metadata = {
        ...result,
        draft_id: draftId,
        filename: selectedFile.name,
        size_bytes: selectedFile.size,
        content_type: selectedFile.type || 'application/octet-stream',
        sha256_hash: result.sha256 || result.sha256_hash,
        uploaded_at_utc: result.uploaded_at_utc || new Date().toISOString(),
        file: selectedFile,
        correlation_id: result.correlation_id,
        simulated: result.simulated || false
      };
      
      setFile(selectedFile);
      setFileHash(result.sha256 || result.sha256_hash);
      setFileMetadata(metadata);
      
      // Propagate to wizard
      if (onFileAttached) {
        onFileAttached(metadata);
      }

      toast.success(result.simulated ? 'File selected (UI validation mode)' : 'File verified by system', {
        description: result.simulated 
          ? `Simulated hash: ${result.sha256.substring(0, 16)}... (not audit evidence)` 
          : `Server-computed SHA-256: ${result.sha256.substring(0, 16)}...`,
        duration: 3000
      });
    } catch (error) {
      const isTimeout = error.message?.includes('timed out');
      const is500 = error.response?.status === 500;
      
      setUploadError({
        code: isTimeout ? 'REQUEST_TIMEOUT' : is500 ? 'SERVER_ERROR' : 'UPLOAD_FAILED',
        message: isTimeout 
          ? 'File upload timed out after 15 seconds. Please retry or check your connection.' 
          : is500
          ? 'Server encountered an internal error. This is not caused by your input. Please retry or contact support.'
          : error.message,
        correlation_id: error.response?.data?.correlation_id || null,
        is_server_error: is500,
        is_timeout: isTimeout
      });
      
      toast.error(isTimeout ? 'Request Timeout' : is500 ? 'Server Error' : 'Upload Failed', { 
        description: isTimeout 
          ? 'Server did not respond within 15 seconds. Please retry.' 
          : is500
          ? `Internal error. Reference ID: ${error.response?.data?.correlation_id || 'Not available'}`
          : error.message,
        duration: 6000
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileHash(null);
    setFileMetadata(null);
    setUploadError(null);
    toast.info('File removed', { duration: 2000 });
  };

  const handleNext = () => {
    if (!fileMetadata || !fileHash) {
      toast.error('File Required', {
        description: simulationMode 
          ? 'Generate a simulated file hash before proceeding to review.' 
          : 'Upload a file and ensure server-side hash is computed before proceeding.'
      });
      return;
    }
    onNext();
  };

  const canProceed = fileMetadata && fileHash;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-900">Step 2: Payload</h3>
          <p className="text-xs text-slate-600 mt-1">Upload file — server computes SHA-256 hash on exact bytes.</p>
        </div>
        <Badge className="bg-blue-100 text-blue-800">FILE_UPLOAD</Badge>
      </div>

      <Alert className={simulationMode ? "bg-amber-50 border-amber-300" : "bg-blue-50 border-blue-200"}>
        <Upload className={`h-4 w-4 ${simulationMode ? 'text-amber-600' : 'text-blue-600'}`} />
        <AlertDescription className={`text-sm ml-2 ${simulationMode ? 'text-amber-900' : 'text-blue-900'}`}>
          {simulationMode ? (
            <>
              <strong>⚠️ Simulation Mode:</strong> File bytes will NOT be stored. Server returns deterministic test hashes for UI validation only.
            </>
          ) : (
            <>
              <strong>File required:</strong> attach 1+ files. Server computes SHA-256 on file bytes. You cannot continue without a server-computed hash.
            </>
          )}
        </AlertDescription>
      </Alert>

      {uploadError && (
        <Card className={uploadError.is_server_error ? "bg-red-50 border-red-400" : "bg-amber-50 border-amber-300"}>
          <CardHeader className="pb-2">
            <div className="flex items-start gap-2">
              <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${uploadError.is_server_error ? 'text-red-600' : 'text-amber-600'}`} />
              <CardTitle className={`text-sm ${uploadError.is_server_error ? 'text-red-900' : 'text-amber-900'}`}>
                {uploadError.is_server_error ? 'Server Error' : 
                 uploadError.is_timeout ? 'Request Timeout' : 
                 'Upload Failed'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className={`text-sm ${uploadError.is_server_error ? 'text-red-800' : 'text-amber-800'}`}>{uploadError.message}</p>
            {uploadError.field_errors && uploadError.field_errors.length > 0 && (
              <div className="pt-2 border-t border-amber-200">
                <p className="text-xs text-amber-900 font-semibold mb-1">Fix These Issues:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {uploadError.field_errors.map((err, idx) => (
                    <li key={idx} className="text-xs text-amber-800">
                      <strong>{err.field}</strong>: {err.error}
                      {err.hint && <span className="text-amber-700 italic"> ({err.hint})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {uploadError.correlation_id && (
              <p className={`text-xs font-mono ${uploadError.is_server_error ? 'text-red-700' : 'text-amber-700'}`}>
                Reference ID: {uploadError.correlation_id}
              </p>
            )}
            <div className="pt-3 border-t border-amber-200 space-y-2">
              {uploadError.is_server_error || uploadError.is_timeout ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setUploadError(null);
                    fileInputRef.current?.click();
                  }}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white w-full"
                >
                  Retry Upload
                </Button>
              ) : null}
              {!simulationMode && (
                <>
                  <p className="text-xs text-amber-900 font-medium">
                    To preview Step 3 UI only (no storage):
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setUploadError(null);
                      onSimulationModeToggle();
                      toast.info('UI Validation Mode enabled', { 
                        description: 'Select file for UI preview — no bytes stored' 
                      });
                    }}
                    className="text-xs bg-amber-600 hover:bg-amber-700 text-white w-full"
                  >
                    Switch to UI Validation Mode
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!draftId && !simulationMode && (
        <Alert className="bg-red-50 border-red-300">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-sm text-red-900 ml-2">
            <strong>Draft Reference Missing:</strong> Return to Step 1 and save metadata before uploading files.
          </AlertDescription>
        </Alert>
      )}

      {/* File Upload Area */}
      <Card className={`bg-gradient-to-br from-blue-50 to-transparent border-dashed border-2 ${
        !draftId ? 'border-red-300 opacity-50' : 'border-blue-300'
      }`}>
        <CardContent className="p-8">
          <div 
            className={`flex flex-col items-center justify-center ${!draftId ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => draftId && fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-2">
            {!draftId ? (
              <>
                <AlertCircle className="w-10 h-10 text-red-600" />
                <p className="text-sm font-medium text-red-900">Waiting for draft reference from Step 1...</p>
                <p className="text-xs text-red-700">Upload disabled until draft is created</p>
              </>
            ) : uploading ? (
                <>
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                  <p className="text-sm font-medium text-slate-900">Computing hash...</p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-blue-600" />
                  <p className="text-sm font-medium text-slate-900">Click to select file or drag and drop</p>
                  <p className="text-xs text-slate-500">CSV, Excel, PDF, JSON, or other document.</p>
                </>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            disabled={uploading || !draftId}
            className="hidden"
            accept="*"
          />
        </CardContent>
      </Card>

      {/* File Verification Card */}
      {fileMetadata && (
        <Card className={fileMetadata.simulated ? "bg-amber-50 border-amber-300" : "bg-green-50 border-green-200"}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${fileMetadata.simulated ? 'text-amber-600' : 'text-green-600'}`} />
                <div className="flex-1 min-w-0 space-y-2">
                  <p className={`font-medium text-sm ${fileMetadata.simulated ? 'text-amber-900' : 'text-green-900'}`}>
                    {fileMetadata.simulated ? '✓ File Selected (Simulated)' : '✓ File Verified by System'}
                  </p>
                  <div className="space-y-1 text-xs">
                    <p className={fileMetadata.simulated ? 'text-amber-800' : 'text-green-800'}>
                      <strong>Filename:</strong> {fileMetadata.filename}
                    </p>
                    <p className={fileMetadata.simulated ? 'text-amber-800' : 'text-green-800'}>
                      <strong>Size:</strong> {(fileMetadata.size_bytes / 1024).toFixed(2)} KB • {fileMetadata.content_type}
                    </p>
                  </div>
                  <div className={`p-2 rounded border ${fileMetadata.simulated ? 'bg-amber-100 border-amber-400' : 'bg-white border-green-300'}`}>
                    <p className={`text-xs font-semibold mb-1 ${fileMetadata.simulated ? 'text-amber-900' : 'text-green-800'}`}>
                      SHA-256 Hash:
                    </p>
                    <code className={`text-[10px] break-all font-mono block ${fileMetadata.simulated ? 'text-amber-900' : 'text-green-900'}`}>
                      {fileHash}
                    </code>
                    {fileMetadata.simulated ? (
                      <p className="text-[9px] text-amber-700 mt-1 font-medium">
                        ⚠️ SIMULATED — UI validation only, not stored, not audit evidence
                      </p>
                    ) : (
                      <p className="text-[9px] text-green-700 mt-1 font-medium">
                        ✓ Server-computed and verified
                      </p>
                    )}
                  </div>
                  <p className={`text-[10px] ${fileMetadata.simulated ? 'text-amber-700' : 'text-green-700'}`}>
                    <strong>Timestamp (UTC):</strong> {new Date(fileMetadata.uploaded_at_utc).toISOString()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}



      {/* No File Warning */}
      {!fileMetadata && draftId && (
        <Alert className="bg-amber-50 border-amber-300">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-900 ml-2">
           {simulationMode 
             ? 'Select file to generate simulated hash for Step 3 preview (no bytes stored).'
             : 'At least 1 file required. Upload now to proceed to Review & Seal.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button
          onClick={handleNext}
          disabled={!canProceed || !draftId}
          className={`gap-2 ${(canProceed && draftId) ? 'bg-[#86b027] hover:bg-[#86b027]/90' : 'opacity-50 cursor-not-allowed'}`}
        >
          {!draftId ? (
            'Waiting for draft reference...'
          ) : canProceed ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Next: Review & Seal
            </>
          ) : (
            'Upload file first'
          )}
        </Button>
      </div>
    </div>
  );
}