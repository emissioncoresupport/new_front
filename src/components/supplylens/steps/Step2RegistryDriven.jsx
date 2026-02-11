import React, { useState, useMemo, lazy, Suspense } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload, File, ChevronDown, ChevronRight, AlertCircle, Copy, Check } from 'lucide-react';
import { getMethodConfig, getManualEntrySchema, validateManualEntryPayload } from '../utils/registryValidator';

// Lazy-load form components to avoid circular deps
const ProductMasterForm = lazy(() => import('../forms/ProductMasterForm'));
const SupplierMasterForm = lazy(() => import('../forms/SupplierMasterForm'));
const BOMForm = lazy(() => import('../forms/BOMForm'));

/**
 * Contract 1: Method-Specific Step 2 Payload Forms
 * MANUAL_ENTRY: structured forms, no JSON typing required
 * FILE_UPLOAD: file selector + metadata
 * API methods: method-specific fields
 */
export default function Step2RegistryDriven({ 
  methodId, 
  formData, 
  setFormData, 
  errors, 
  attachments = [],
  onFileUpload,
  adapterMode = 'mock'
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [attestationMode, setAttestationMode] = useState('current'); // 'current' or 'updated'
  const [copySuccess, setCopySuccess] = useState(false);
  
  // CRITICAL: Use bound entity snapshot from Step 1 (deterministic, no network calls)
  const boundEntity = useMemo(() => {
    if (formData.target_snapshot_min && formData.binding_mode === 'BIND_EXISTING') {
      return formData.target_snapshot_min;
    }
    return null;
  }, [formData.target_snapshot_min, formData.binding_mode]);
  
  if (!methodId) {
    return (
      <div className="p-8 text-center text-slate-500">
        Please select an ingestion method first
      </div>
    );
  }
  
  const config = getMethodConfig(methodId);

  // FILE_BYTES mode (FILE_UPLOAD, ERP_EXPORT_FILE)
  if (config.payload_mode === 'FILE_BYTES') {
    return (
      <div className="space-y-6">
        {/* Validation Summary Banner */}
        {errors.components && (
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-red-50/80 to-rose-50/40 backdrop-blur-xl rounded-xl border border-red-200/60 shadow-[0_2px_8px_rgba(239,68,68,0.1)]">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-red-900">Component validation failed</p>
              <ul className="text-xs text-red-800/90 mt-1.5 space-y-1 font-light">
                <li>• {errors.components}</li>
              </ul>
            </div>
          </div>
        )}

        <div>
          <Label className="text-slate-700 font-medium">Upload Files *</Label>
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center bg-white/30 backdrop-blur-sm">
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-600 mb-3">
              Drag and drop files or click to browse
            </p>
            <input
              type="file"
              multiple
              onChange={onFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button type="button" variant="outline" asChild>
                <span>Select Files</span>
              </Button>
            </label>
          </div>
          {attachments.length > 0 && (
            <div className="mt-4 space-y-2">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-white/50 backdrop-blur-sm rounded-lg border border-slate-200">
                  <File className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-700 flex-1">{file.name}</span>
                  {file.sha256 && (
                    <span className="text-xs text-green-600 font-mono">
                      ✓ {file.sha256.substring(0, 8)}...
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {errors.attachments && (
            <p className="text-xs text-red-500 mt-2">{errors.attachments}</p>
          )}
        </div>

        {/* ERP_EXPORT_FILE specific fields */}
        {methodId === 'ERP_EXPORT_FILE' && (
          <>
            <div>
              <Label className="text-slate-700 font-medium">ERP Instance Name *</Label>
              <Input
                value={formData.erp_instance_name || ''}
                onChange={(e) => setFormData(prev => ({...prev, erp_instance_name: e.target.value}))}
                placeholder="e.g., SAP_PROD, Oracle_EBS"
                className="border-slate-200 bg-white/50 backdrop-blur-sm"
              />
              {errors.erp_instance_name && (
                <p className="text-xs text-red-500 mt-1">{errors.erp_instance_name}</p>
              )}
            </div>
            <div>
              <Label className="text-slate-700 font-medium">Snapshot Date/Time (UTC) *</Label>
              <Input
                type="datetime-local"
                value={formData.snapshot_datetime_utc || ''}
                onChange={(e) => setFormData(prev => ({...prev, snapshot_datetime_utc: e.target.value}))}
                className="border-slate-200 bg-white/50 backdrop-blur-sm"
              />
              {errors.snapshot_datetime_utc && (
                <p className="text-xs text-red-500 mt-1">{errors.snapshot_datetime_utc}</p>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // CANONICAL_JSON mode (MANUAL_ENTRY) - Structured Forms (CONTRACT 1 INVARIANT #2)
  if (config.payload_mode === 'CANONICAL_JSON') {
    const evidenceType = formData.evidence_type;
    const schema = getManualEntrySchema(evidenceType);
    
    // Validate current payload
    const payloadValidation = schema ? validateManualEntryPayload(evidenceType, formData.payload_data_json || {}) : null;
    
    return (
      <div className="space-y-6">
        {/* Validation Summary Banner */}
        {errors.components && (
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-red-50/80 to-rose-50/40 backdrop-blur-xl rounded-xl border border-red-200/60 shadow-[0_2px_8px_rgba(239,68,68,0.1)]">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-red-900">Component validation failed</p>
              <ul className="text-xs text-red-800/90 mt-1.5 space-y-1 font-light">
                <li>• {errors.components}</li>
              </ul>
            </div>
          </div>
        )}

        <div>
          <Label className="text-slate-700 font-medium">Attestation Notes *</Label>
          <Textarea
            value={formData.attestation_notes || ''}
            onChange={(e) => setFormData(prev => ({...prev, attestation_notes: e.target.value}))}
            placeholder="Attest to the accuracy and origin of this data (minimum 20 characters)"
            rows={3}
            className="border-slate-200 bg-white/50 backdrop-blur-sm resize-none"
          />
          {errors.attestation_notes && (
            <p className="text-xs text-red-500 mt-1">{errors.attestation_notes}</p>
          )}
        </div>

        {/* Structured form based on evidence type */}
        <div className="p-6 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl rounded-xl border-2 border-slate-200">
           {/* Evidence Claims Section Label */}
           <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">
             {evidenceType === 'PRODUCT_MASTER' && 'Product Evidence Claims'}
             {evidenceType === 'SUPPLIER_MASTER' && 'Supplier Evidence Claims'}
             {evidenceType === 'BOM' && 'Bill of Materials'}
             {!schema && 'Evidence Data'}
           </h3>
          
          {evidenceType === 'PRODUCT_MASTER' && (
            <Suspense fallback={<div className="p-4 text-slate-500 text-sm">Loading form...</div>}>
              <ProductMasterForm 
                formData={formData} 
                setFormData={setFormData} 
                errors={errors}
                isIdentityLocked={formData.binding_mode === 'BIND_EXISTING' && !!boundEntity}
              />
            </Suspense>
          )}

          {evidenceType === 'SUPPLIER_MASTER' && (
            <div className="space-y-4">
              {/* Bound Target Section - Always shown when binding */}
              {formData.binding_mode === 'BIND_EXISTING' && boundEntity && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 uppercase mb-3">🔗 Bound Target (Read-Only)</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {boundEntity.legal_name && <div><p className="text-xs text-slate-500">Supplier Name</p><p className="text-slate-900 font-medium">{boundEntity.legal_name}</p></div>}
                    {boundEntity.supplier_id && <div><p className="text-xs text-slate-500">Supplier ID</p><p className="text-slate-900 font-mono text-xs">{boundEntity.supplier_id.substring(0, 12)}...</p></div>}
                    {boundEntity.external_supplier_id && <div><p className="text-xs text-slate-500">Code</p><p className="text-slate-900">{boundEntity.external_supplier_id}</p></div>}
                    {boundEntity.country_code && <div><p className="text-xs text-slate-500">Country</p><p className="text-slate-900">{boundEntity.country_code}</p></div>}
                  </div>
                </div>
              )}

              {/* Deferred Binding Warning */}
              {formData.binding_mode === 'DEFER' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800">⚠️ <strong>Unbound Evidence:</strong> No target selected. Binding will be deferred to future reconciliation.</p>
                </div>
              )}

              {/* Evidence Claims Section */}
              <div>
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-3">Evidence Claims</h4>
                <Suspense fallback={<div className="p-4 text-slate-500 text-sm">Loading form...</div>}>
                  <SupplierMasterForm 
                    formData={formData} 
                    setFormData={setFormData} 
                    errors={errors} 
                    isIdentityLocked={formData.binding_mode === 'BIND_EXISTING' && !!boundEntity}
                  />
                </Suspense>
              </div>
            </div>
          )}

          {evidenceType === 'BOM' && (
            <Suspense fallback={<div className="p-4 text-slate-500 text-sm">Loading form...</div>}>
              <BOMForm 
                formData={formData} 
                setFormData={(data) => {
                  // CRITICAL: Auto-set parent_sku_id from binding target
                  if (data.payload_data_json && formData.bound_entity_id && formData.binding_mode !== 'DEFER') {
                    data.payload_data_json.parent_sku_id = formData.bound_entity_id;
                  } else if (data.payload_data_json && formData.binding_mode === 'DEFER') {
                    // For deferred binding, use hint only, no parent_sku_id
                    data.payload_data_json.parent_sku_id = null;
                  }
                  setFormData(data);
                }}
                errors={errors} 
              />
            </Suspense>
          )}
          
          {!schema && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                Manual entry for {evidenceType} is not supported. Please use FILE_UPLOAD method instead.
              </p>
            </div>
          )}
        </div>

        {/* Optional Canonical Preview (read-only, advanced feature) */}
        {formData.payload_data_json && Object.keys(formData.payload_data_json).length > 0 && (
          <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
            >
              <span className="text-sm font-medium text-slate-700">Advanced: Canonical Payload Preview</span>
              {showPreview ? (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
            </button>
            {showPreview && (
              <div className="p-4 bg-white/50 backdrop-blur-sm">
                <pre className="text-xs font-mono text-slate-700 overflow-auto max-h-64 bg-slate-900/5 p-3 rounded">
                  {JSON.stringify(formData.payload_data_json, null, 2)}
                </pre>
                <p className="text-xs text-slate-500 mt-3 italic">
                     Read-only preview. Canonical JSON will be hashed server-side at seal. Adapter: {adapterMode}
                   </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // DIGEST_ONLY mode (API_PUSH_DIGEST_ONLY)
  if (config.payload_mode === 'DIGEST_ONLY') {
    return (
      <div className="space-y-6">
        <div>
          <Label className="text-slate-700 font-medium">Payload Digest (SHA-256) *</Label>
          <Input
            value={formData.payload_digest_sha256 || ''}
            onChange={(e) => setFormData(prev => ({...prev, payload_digest_sha256: e.target.value.toLowerCase()}))}
            placeholder="64 hexadecimal characters"
            className="font-mono text-xs border-slate-200 bg-white/50 backdrop-blur-sm"
            maxLength={64}
          />
          {errors.payload_digest_sha256 && (
            <p className="text-xs text-red-500 mt-1">{errors.payload_digest_sha256}</p>
          )}
        </div>

        <div>
          <Label className="text-slate-700 font-medium">Received At (UTC) *</Label>
          <Input
            type="datetime-local"
            value={formData.received_at_utc || ''}
            onChange={(e) => setFormData(prev => ({...prev, received_at_utc: e.target.value}))}
            className="border-slate-200 bg-white/50 backdrop-blur-sm"
          />
          {errors.received_at_utc && (
            <p className="text-xs text-red-500 mt-1">{errors.received_at_utc}</p>
          )}
        </div>

        <div>
          <Label className="text-slate-700 font-medium">Payload Size (bytes, optional)</Label>
          <Input
            type="number"
            value={formData.payload_bytes_count || ''}
            onChange={(e) => setFormData(prev => ({...prev, payload_bytes_count: parseInt(e.target.value) || 0}))}
            placeholder="Size of original payload"
            className="border-slate-200 bg-white/50 backdrop-blur-sm"
          />
        </div>

        <div>
          <Label className="text-slate-700 font-medium">Source Endpoint (optional)</Label>
          <Input
            value={formData.source_endpoint || ''}
            onChange={(e) => setFormData(prev => ({...prev, source_endpoint: e.target.value}))}
            placeholder="API endpoint or system identifier"
            className="border-slate-200 bg-white/50 backdrop-blur-sm"
          />
        </div>
      </div>
    );
  }

  // ERP_REF mode (ERP_API_PULL)
  if (config.payload_mode === 'ERP_REF') {
    return (
      <div className="space-y-6">
        <div>
          <Label className="text-slate-700 font-medium">Connector ID *</Label>
          <Input
            value={formData.connector_id || ''}
            onChange={(e) => setFormData(prev => ({...prev, connector_id: e.target.value}))}
            placeholder="ERP connector reference"
            className="border-slate-200 bg-white/50 backdrop-blur-sm"
          />
          {errors.connector_id && (
            <p className="text-xs text-red-500 mt-1">{errors.connector_id}</p>
          )}
        </div>

        <div>
          <Label className="text-slate-700 font-medium">Sync Run ID *</Label>
          <Input
            value={formData.sync_run_id || ''}
            onChange={(e) => setFormData(prev => ({...prev, sync_run_id: e.target.value}))}
            placeholder="Unique sync job identifier"
            className="border-slate-200 bg-white/50 backdrop-blur-sm"
          />
          {errors.sync_run_id && (
            <p className="text-xs text-red-500 mt-1">{errors.sync_run_id}</p>
          )}
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            ℹ️ This method references a real-time API pull. The server will fetch and snapshot the data automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 text-center text-slate-500">
      Unknown payload mode: {config.payload_mode}
    </div>
  );
}