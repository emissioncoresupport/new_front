import React, { useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Upload, Loader2, X, FileText, AlertTriangle, CheckCircle2, Copy, Lock, Edit3 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ProductMasterForm from '../forms/ProductMasterForm';
import SupplierMasterForm from '../forms/SupplierMasterForm';
import BOMForm from '../forms/BOMForm';

export default function Step2PayloadByMethod({ 
  formData, 
  setFormData, 
  errors, 
  adapterMode,
  draftId,
  adapter,
  uploadedFiles,
  setUploadedFiles,
  setCorrelationId
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const uploadInProgress = useRef(false);

  const handleFileUpload = async (e) => {
    // Guard: prevent parallel uploads
    if (uploadInProgress.current || isUploading) return;
    
    const file = e.target.files?.[0];
    if (!file) return;

    // Check for duplicate
    const duplicate = uploadedFiles.find(f => f.file_name === file.name && f.file_size === file.size);
    if (duplicate) {
      setDuplicateWarning({ file, existing: duplicate });
      return;
    }

    await uploadFile(file);
  };

  const uploadFile = async (file) => {
    uploadInProgress.current = true;
    setIsUploading(true);
    setDuplicateWarning(null);

    try {
      const result = await adapter.uploadAttachment(draftId, file, {
        method: formData.ingestion_method,
        evidence_type: formData.evidence_type,
        document_title: formData.document_title,
        reporting_period_start: formData.reporting_period_start,
        reporting_period_end: formData.reporting_period_end,
        erp_system_name: formData.erp_system_name,
        erp_period_start: formData.erp_period_start,
        erp_period_end: formData.erp_period_end
      });
      
      setUploadedFiles([...uploadedFiles, result]);
      setFormData({ ...formData, file_url: result.file_url, file_name: result.file_name, file_size: result.file_size });
      setCorrelationId(result.correlation_id);
      toast.success(`File uploaded (${adapterMode})`);
    } catch (err) {
      // Handle structured errors from adapter
      let errorMsg = err.message;
      let corrId = null;
      
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error === 'NOT_CONFIGURED') {
          errorMsg = parsed.message;
          corrId = parsed.correlation_id;
        }
      } catch (parseErr) {
        // Not JSON, use raw message
      }
      
      if (corrId) setCorrelationId(corrId);
      toast.error('Upload failed: ' + errorMsg);
    } finally {
      setIsUploading(false);
      uploadInProgress.current = false;
    }
  };

  const handleReplaceFile = () => {
    if (duplicateWarning) {
      const filtered = uploadedFiles.filter(f => f.attachment_id !== duplicateWarning.existing.attachment_id);
      setUploadedFiles(filtered);
      uploadFile(duplicateWarning.file);
    }
  };

  const handleRemoveFile = (attachmentId) => {
    setUploadedFiles(uploadedFiles.filter(f => f.attachment_id !== attachmentId));
    if (uploadedFiles.length === 1) {
      setFormData({ ...formData, file_url: null, file_name: '', file_size: null });
    }
  };

  // MANUAL_ENTRY
  if (formData.ingestion_method === 'MANUAL_ENTRY') {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label className="text-slate-900 font-medium text-sm">Attestation Notes *</Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </TooltipTrigger>
                <TooltipContent>Attest to the accuracy and origin of this data (min 20 chars)</TooltipContent>
              </Tooltip>
            </div>
            <Textarea
              value={formData.attestation_notes || ''}
              onChange={(e) => setFormData({ ...formData, attestation_notes: e.target.value })}
              placeholder="I attest that this data is accurate and sourced from..."
              rows={3}
              className="border-2 border-slate-200 bg-white/90 backdrop-blur-md resize-none"
            />
            {errors.attestation_notes && (
              <p className="text-xs text-red-500 mt-1">{errors.attestation_notes}</p>
            )}
          </div>

          <div className="p-6 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl rounded-xl border-2 border-slate-200">
            <h3 className="text-sm font-medium text-slate-900 mb-4">
              {formData.evidence_type === 'PRODUCT_MASTER' && 'Product Master Data'}
              {formData.evidence_type === 'SUPPLIER_MASTER' && 'Supplier Master Data'}
              {formData.evidence_type === 'BOM' && 'Bill of Materials'}
              {!['PRODUCT_MASTER', 'SUPPLIER_MASTER', 'BOM'].includes(formData.evidence_type) && 'Structured Data Entry'}
            </h3>

            {formData.evidence_type === 'PRODUCT_MASTER' && (
              <ProductMasterForm formData={formData} setFormData={setFormData} errors={errors} />
            )}
            {formData.evidence_type === 'SUPPLIER_MASTER' && (
              <SupplierMasterForm formData={formData} setFormData={setFormData} errors={errors} />
            )}
            {formData.evidence_type === 'BOM' && (
              <BOMForm formData={formData} setFormData={setFormData} errors={errors} />
            )}
          </div>

          {formData.payload_data_json && Object.keys(formData.payload_data_json).length > 0 && (
            <details className="border-2 border-slate-200 rounded-xl">
              <summary className="p-4 bg-slate-50/50 cursor-pointer hover:bg-slate-100/50 transition-colors">
                <span className="text-sm font-medium text-slate-700">Advanced: Canonical JSON Preview</span>
              </summary>
              <div className="p-4 bg-white/50">
                <pre className="text-xs font-mono text-slate-700 overflow-auto max-h-48 bg-slate-900/5 p-3 rounded">
                  {JSON.stringify(formData.payload_data_json, null, 2)}
                </pre>
                <p className="text-xs text-slate-500 mt-2 italic">Read-only. Hashed at seal.</p>
              </div>
            </details>
          )}
        </div>
      </TooltipProvider>
    );
  }

  // FILE_UPLOAD
  if (formData.ingestion_method === 'FILE_UPLOAD') {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          {/* Duplicate Warning */}
          {duplicateWarning && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">Possible duplicate upload</p>
                <p className="text-xs text-amber-700 mt-1">
                  A file with the same name and size already exists. Replace?
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDuplicateWarning(null)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleReplaceFile}
                    className="text-xs bg-amber-600 hover:bg-amber-700"
                  >
                    Replace File
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* File Upload Area */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label className="text-slate-900 font-medium text-sm">Upload File *</Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </TooltipTrigger>
                <TooltipContent>Upload the source document. The backend will hash bytes when wired.</TooltipContent>
              </Tooltip>
            </div>
            <div className="relative">
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center gap-3 h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white/80 hover:bg-slate-50/80 cursor-pointer transition-colors"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
                    <span className="text-sm text-slate-600">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-600">Click to upload file</span>
                  </>
                )}
              </label>
            </div>
            {errors.file_url && (
              <p className="text-xs text-red-500 mt-1">{errors.file_url}</p>
            )}
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <Label className="text-slate-900 font-medium text-sm">Uploaded Attachments</Label>
              {uploadedFiles.map((file) => (
                <div key={file.attachment_id} className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 font-medium truncate">{file.file_name}</p>
                      <p className="text-xs text-slate-500">{(file.file_size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#86b027]" />
                    <button
                      onClick={() => handleRemoveFile(file.attachment_id)}
                      className="p-1 hover:bg-slate-200 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Required Metadata */}
          <div className="p-6 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl rounded-xl border-2 border-slate-200 space-y-4">
            <h3 className="text-sm font-medium text-slate-900">Document Metadata</h3>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-slate-900 font-medium text-sm">Document Title *</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent>Descriptive title for this evidence document</TooltipContent>
                </Tooltip>
              </div>
              <Input
                value={formData.document_title || ''}
                onChange={(e) => setFormData({ ...formData, document_title: e.target.value })}
                placeholder="e.g., Q4 2025 Supplier Audit Report"
                className="border-2 border-slate-200 bg-white/90 backdrop-blur-md"
              />
              {errors.document_title && (
                <p className="text-xs text-red-500 mt-1">{errors.document_title}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-slate-900 font-medium text-sm">Period Start *</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent>Reporting period start date</TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  type="date"
                  value={formData.reporting_period_start || ''}
                  onChange={(e) => setFormData({ ...formData, reporting_period_start: e.target.value })}
                  className="border-2 border-slate-200 bg-white/90 backdrop-blur-md"
                />
                {errors.reporting_period_start && (
                  <p className="text-xs text-red-500 mt-1">{errors.reporting_period_start}</p>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-slate-900 font-medium text-sm">Period End *</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent>Reporting period end date</TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  type="date"
                  value={formData.reporting_period_end || ''}
                  onChange={(e) => setFormData({ ...formData, reporting_period_end: e.target.value })}
                  className="border-2 border-slate-200 bg-white/90 backdrop-blur-md"
                />
                {errors.reporting_period_end && (
                  <p className="text-xs text-red-500 mt-1">{errors.reporting_period_end}</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-slate-900 font-medium text-sm">Notes (Optional)</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent>Additional context or observations about this document</TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes about this document..."
                rows={3}
                className="border-2 border-slate-200 bg-white/90 backdrop-blur-md resize-none"
              />
            </div>
          </div>

          {/* Extraction Preview Placeholder */}
          <div className="p-6 bg-gradient-to-br from-slate-50/80 to-white/50 backdrop-blur-xl rounded-xl border-2 border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-medium text-slate-700">AI Extraction Preview</h3>
            </div>
            <p className="text-xs text-slate-500 italic">
              Extraction suggestions will appear here when enabled.
            </p>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Auto-generate external_reference_id for ERP_EXPORT_FILE
  useEffect(() => {
    if (formData.ingestion_method === 'ERP_EXPORT_FILE' && !formData.external_reference_id_manual) {
      const { erp_system_name, erp_export_job_id, erp_period_start, erp_period_end, evidence_type } = formData;
      if (erp_system_name && erp_export_job_id && erp_period_start && erp_period_end && evidence_type) {
        const autoGenerated = `${erp_system_name}|${erp_export_job_id}|${erp_period_start}|${erp_period_end}|${evidence_type}`;
        setFormData(prev => ({ ...prev, external_reference_id: autoGenerated }));
      }
    }
  }, [
    formData.ingestion_method,
    formData.erp_system_name,
    formData.erp_export_job_id,
    formData.erp_period_start,
    formData.erp_period_end,
    formData.evidence_type,
    formData.external_reference_id_manual
  ]);

  const handleCopyExternalRef = () => {
    navigator.clipboard.writeText(formData.external_reference_id);
    toast.success('External reference ID copied');
  };

  // ERP_EXPORT_FILE
  if (formData.ingestion_method === 'ERP_EXPORT_FILE') {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          {/* Duplicate Warning */}
          {duplicateWarning && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">Possible duplicate upload</p>
                <p className="text-xs text-amber-700 mt-1">
                  A file with the same name and size already exists. Replace?
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDuplicateWarning(null)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleReplaceFile}
                    className="text-xs bg-amber-600 hover:bg-amber-700"
                  >
                    Replace File
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* File Upload */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label className="text-slate-900 font-medium text-sm">ERP Export File *</Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </TooltipTrigger>
                <TooltipContent>Upload the ERP export file. The backend will hash bytes when wired.</TooltipContent>
              </Tooltip>
            </div>
            <div className="relative">
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center gap-3 h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white/80 hover:bg-slate-50/80 cursor-pointer transition-colors"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
                    <span className="text-sm text-slate-600">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-600">Click to upload ERP export</span>
                  </>
                )}
              </label>
            </div>
            {errors.file_url && (
              <p className="text-xs text-red-500 mt-1">{errors.file_url}</p>
            )}
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <Label className="text-slate-900 font-medium text-sm">Uploaded Files</Label>
              {uploadedFiles.map((file) => (
                <div key={file.attachment_id} className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 font-medium truncate">{file.file_name}</p>
                      <p className="text-xs text-slate-500">{(file.file_size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#86b027]" />
                    <button
                      onClick={() => handleRemoveFile(file.attachment_id)}
                      className="p-1 hover:bg-slate-200 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ERP Metadata */}
          <div className="p-6 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl rounded-xl border-2 border-slate-200 space-y-4">
            <h3 className="text-sm font-medium text-slate-900">ERP Export Metadata</h3>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-slate-900 font-medium text-sm">ERP System Name *</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent>Example: SAP, Dynamics, Oracle. Used for audit context.</TooltipContent>
                </Tooltip>
              </div>
              <Input
                value={formData.erp_system_name || ''}
                onChange={(e) => setFormData({ ...formData, erp_system_name: e.target.value })}
                placeholder="e.g., SAP"
                className="border-2 border-slate-200 bg-white/90 backdrop-blur-md"
              />
              {errors.erp_system_name && (
                <p className="text-xs text-red-500 mt-1">{errors.erp_system_name}</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-slate-900 font-medium text-sm">Export Job ID *</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent>Identifier from the ERP export job or report run.</TooltipContent>
                </Tooltip>
              </div>
              <Input
                value={formData.erp_export_job_id || ''}
                onChange={(e) => setFormData({ ...formData, erp_export_job_id: e.target.value })}
                placeholder="e.g., EXP-2026-001234"
                className="border-2 border-slate-200 bg-white/90 backdrop-blur-md"
              />
              {errors.erp_export_job_id && (
                <p className="text-xs text-red-500 mt-1">{errors.erp_export_job_id}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-slate-900 font-medium text-sm">Period Start *</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent>Period covered by this export - start date.</TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  type="date"
                  value={formData.erp_period_start || ''}
                  onChange={(e) => setFormData({ ...formData, erp_period_start: e.target.value })}
                  className="border-2 border-slate-200 bg-white/90 backdrop-blur-md"
                />
                {errors.erp_period_start && (
                  <p className="text-xs text-red-500 mt-1">{errors.erp_period_start}</p>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-slate-900 font-medium text-sm">Period End *</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent>Period covered by this export - end date.</TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  type="date"
                  value={formData.erp_period_end || ''}
                  onChange={(e) => setFormData({ ...formData, erp_period_end: e.target.value })}
                  className="border-2 border-slate-200 bg-white/90 backdrop-blur-md"
                />
                {errors.erp_period_end && (
                  <p className="text-xs text-red-500 mt-1">{errors.erp_period_end}</p>
                )}
              </div>
            </div>
          </div>

          {/* External Reference ID - Idempotency Key */}
          <div className="p-6 bg-gradient-to-br from-amber-50/50 to-amber-50/30 backdrop-blur-xl rounded-xl border-2 border-amber-200/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-700" />
                <h3 className="text-sm font-medium text-amber-900">Idempotency Control</h3>
              </div>
              <Badge className="bg-amber-100 text-amber-800 text-xs">Auto-Generated</Badge>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-slate-900 font-medium text-sm">External Reference ID *</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent>Idempotency key. Same key must never create duplicate evidence.</TooltipContent>
                </Tooltip>
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={formData.external_reference_id || ''}
                  onChange={(e) => setFormData({ ...formData, external_reference_id: e.target.value })}
                  readOnly={!formData.external_reference_id_manual}
                  placeholder="Auto-generated from metadata"
                  className={`flex-1 font-mono text-xs border-2 ${
                    formData.external_reference_id_manual 
                      ? 'border-slate-200 bg-white/90' 
                      : 'border-amber-200/60 bg-amber-50/30 text-slate-700'
                  } backdrop-blur-md`}
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopyExternalRef}
                  disabled={!formData.external_reference_id}
                  className="border-2 border-slate-200 hover:bg-slate-50"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {errors.external_reference_id && (
                <p className="text-xs text-red-500 mt-1">{errors.external_reference_id}</p>
              )}
              
              {formData.external_reference_id && !formData.external_reference_id_manual && (
                <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5">
                  <Info className="w-3 h-3" />
                  Auto-generated from: ERP + Job ID + Period + Evidence Type
                </p>
              )}
            </div>

            {/* Advanced: Manual Edit Toggle */}
            <details className="mt-4">
              <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-900 flex items-center gap-2">
                <Edit3 className="w-3 h-3" />
                Advanced: Enable Manual Edit
              </summary>
              <div className="mt-3 flex items-center justify-between p-3 bg-white/50 rounded-lg">
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-900">Manual Override</p>
                  <p className="text-xs text-slate-600 mt-0.5">Allow editing the external reference ID</p>
                </div>
                <Switch
                  checked={formData.external_reference_id_manual}
                  onCheckedChange={(checked) => setFormData({ ...formData, external_reference_id_manual: checked })}
                />
              </div>
              {formData.external_reference_id_manual && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800">
                    ⚠️ Manual override enabled. Ensure uniqueness to prevent duplicate evidence.
                  </p>
                </div>
              )}
            </details>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Validate SHA-256 digest format
  const validateDigestFormat = (value) => {
    if (!value) return { valid: false, error: 'Digest required' };
    const hexPattern = /^[a-fA-F0-9]{64}$/;
    if (!hexPattern.test(value)) {
      return { valid: false, error: 'Invalid SHA-256 format (must be 64 hex characters)' };
    }
    return { valid: true, error: null };
  };

  // API_PUSH_DIGEST
  if (formData.ingestion_method === 'API_PUSH_DIGEST') {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          {/* Digest Algorithm */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label className="text-slate-900 font-medium text-sm">Digest Algorithm *</Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </TooltipTrigger>
                <TooltipContent>Hash algorithm used by the source system.</TooltipContent>
              </Tooltip>
            </div>
            <Select value="SHA-256" disabled>
              <SelectTrigger className="h-11 border-2 border-slate-200 bg-slate-50/80 backdrop-blur-md">
                <SelectValue placeholder="SHA-256" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SHA-256">SHA-256</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">Only SHA-256 supported currently</p>
          </div>

          {/* Digest Value */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label className="text-slate-900 font-medium text-sm">Digest Value *</Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </TooltipTrigger>
                <TooltipContent>Hex string hash of the original payload or document.</TooltipContent>
              </Tooltip>
            </div>
            <Input
              value={formData.payload_digest_sha256 || ''}
              onChange={(e) => setFormData({ ...formData, payload_digest_sha256: e.target.value.toLowerCase() })}
              placeholder="64 hex characters, e.g., a3f5d8e9c2b1..."
              className="font-mono text-xs border-2 border-slate-200 bg-white/90 backdrop-blur-md"
              maxLength={64}
            />
            {formData.payload_digest_sha256 && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${
                validateDigestFormat(formData.payload_digest_sha256).valid 
                  ? 'text-[#86b027]' 
                  : 'text-amber-600'
              }`}>
                {validateDigestFormat(formData.payload_digest_sha256).valid 
                  ? <><CheckCircle2 className="w-3 h-3" /> Valid SHA-256 ({formData.payload_digest_sha256.length}/64 chars)</>
                  : <><AlertTriangle className="w-3 h-3" /> {validateDigestFormat(formData.payload_digest_sha256).error}</>}
              </p>
            )}
            {errors.payload_digest_sha256 && (
              <p className="text-xs text-red-500 mt-1">{errors.payload_digest_sha256}</p>
            )}
          </div>

          {/* External Reference ID - Idempotency Key */}
          <div className="p-6 bg-gradient-to-br from-amber-50/50 to-amber-50/30 backdrop-blur-xl rounded-xl border-2 border-amber-200/60 space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-700" />
              <h3 className="text-sm font-medium text-amber-900">Idempotency Control</h3>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-slate-900 font-medium text-sm">External Reference ID *</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent>Idempotency key from the source system. Required.</TooltipContent>
                </Tooltip>
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={formData.external_reference_id || ''}
                  onChange={(e) => setFormData({ ...formData, external_reference_id: e.target.value })}
                  placeholder="e.g., API_TXN_2026_001234"
                  className="flex-1 font-mono text-xs border-2 border-slate-200 bg-white/90 backdrop-blur-md"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    if (formData.external_reference_id) {
                      navigator.clipboard.writeText(formData.external_reference_id);
                      toast.success('External reference ID copied');
                    }
                  }}
                  disabled={!formData.external_reference_id}
                  className="border-2 border-slate-200 hover:bg-slate-50"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {errors.external_reference_id && (
                <p className="text-xs text-red-500 mt-1">{errors.external_reference_id}</p>
              )}
              <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5">
                <Info className="w-3 h-3" />
                Must be unique across all sealed evidence to prevent duplicates
              </p>
            </div>
          </div>

          {/* Optional Metadata */}
          <div className="p-6 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl rounded-xl border-2 border-slate-200 space-y-4">
            <h3 className="text-sm font-medium text-slate-900">Optional Metadata</h3>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-slate-900 font-medium text-sm">Source System Name</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent>Name or identifier of the source system that sent this digest</TooltipContent>
                </Tooltip>
              </div>
              <Input
                value={formData.source_endpoint || ''}
                onChange={(e) => setFormData({ ...formData, source_endpoint: e.target.value })}
                placeholder="e.g., ProductionERP, WarehouseAPI"
                className="border-2 border-slate-200 bg-white/90 backdrop-blur-md"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-slate-900 font-medium text-sm">Payload Size (bytes)</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent>Size of the original payload that was hashed</TooltipContent>
                </Tooltip>
              </div>
              <Input
                type="number"
                value={formData.payload_size_bytes || ''}
                onChange={(e) => setFormData({ ...formData, payload_size_bytes: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="e.g., 2048"
                className="border-2 border-slate-200 bg-white/90 backdrop-blur-md"
              />
            </div>
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-3 p-4 bg-blue-50/50 border-2 border-blue-200/60 rounded-xl">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">Digest-Only Evidence</p>
              <p className="text-xs text-blue-700 mt-1">
                The actual payload data is not stored. Only the cryptographic hash is recorded for audit trails.
              </p>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return null;
}