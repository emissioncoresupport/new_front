import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Info } from 'lucide-react';

/**
 * Human-readable review summary for Step 3
 * Shows declaration + parsed payload without exposing JSON
 */

export default function Contract1ReviewSummary({ declaration, payload, fileMetadata, simulationMode = false }) {
  let parsedPayload = null;
  try {
    if (payload && payload.trim()) {
      parsedPayload = JSON.parse(payload);
    }
  } catch (e) {
    // Invalid JSON, will be caught during sealing
  }

  const renderPayloadSummary = () => {
    // FILE_UPLOAD shows file metadata instead of parsed payload
    if (declaration.ingestion_method === 'FILE_UPLOAD' && fileMetadata) {
      // Defensive field access (support hash_sha256 OR sha256_hash OR sha256Hash)
      const sha256 = fileMetadata.hash_sha256 || fileMetadata.sha256_hash || fileMetadata.sha256Hash;
      
      return (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-xs text-blue-900 font-medium mb-2">📎 Uploaded File (Server-Hashed)</p>
            <div className="space-y-1 text-xs text-blue-900">
              <div>
                <p className="font-medium">Filename:</p>
                <p className="font-mono">{fileMetadata.filename || fileMetadata.name}</p>
              </div>
              <div>
                <p className="font-medium">Size:</p>
                <p>{((fileMetadata.size_bytes || fileMetadata.size) / 1024).toFixed(2)} KB ({fileMetadata.size_bytes || fileMetadata.size} bytes)</p>
              </div>
              <div>
                <p className="font-medium">Content Type:</p>
                <p className="font-mono">{fileMetadata.content_type || fileMetadata.type}</p>
              </div>
              <div className="pt-2 border-t border-blue-200">
                <p className="font-medium">SHA-256 Hash {simulationMode ? '(simulated test hash)' : '(server-computed)'}:</p>
                {sha256 ? (
                  <>
                    <code className="text-xs font-mono break-all text-blue-700">{sha256}</code>
                    {simulationMode && (
                      <p className="text-[9px] text-amber-700 mt-1">⚠️ Test hash only, not audit evidence</p>
                    )}
                  </>
                ) : (
                  <p className="text-red-600 font-bold text-xs">⚠️ HASH MISSING (WILL FAIL SEAL)</p>
                )}
              </div>
              <div>
                <p className="font-medium">Uploaded (UTC):</p>
                <p className="text-xs">{new Date(fileMetadata.uploaded_at_utc || Date.now()).toISOString()}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Don't show "No data entered yet" for file-based methods
    if (!parsedPayload && ['FILE_UPLOAD', 'ERP_EXPORT'].includes(declaration.ingestion_method)) {
      return null; // File metadata shown instead
    }
    
    if (!parsedPayload) {
      return <p className="text-sm text-slate-600 italic">Payload pending</p>;
    }

    const datasetType = declaration.dataset_type;

    if (datasetType === 'BOM') {
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            {parsedPayload.parent_sku && (
              <div>
                <p className="text-xs text-slate-600 font-medium">Parent SKU</p>
                <p className="text-sm text-slate-900 font-mono">{parsedPayload.parent_sku}</p>
              </div>
            )}
            {parsedPayload.version && (
              <div>
                <p className="text-xs text-slate-600 font-medium">BOM Version</p>
                <p className="text-sm text-slate-900">{parsedPayload.version}</p>
              </div>
            )}
          </div>
          {parsedPayload.components && Array.isArray(parsedPayload.components) && (
            <div>
              <p className="text-xs text-slate-600 font-medium mb-2">Components ({parsedPayload.components.length})</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {parsedPayload.components.map((comp, idx) => (
                  <div key={idx} className="text-xs bg-slate-50 rounded p-2 border border-slate-200">
                    <span className="font-mono font-medium">{comp.sku}</span>
                    {' × '}
                    <span className="font-medium">{comp.quantity}</span>
                    {' '}
                    <span className="text-slate-600">{comp.unit}</span>
                    {comp.notes && <span className="text-slate-600 italic ml-2">({comp.notes})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (datasetType === 'SUPPLIER_MASTER') {
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            {parsedPayload.supplier_name && (
              <div>
                <p className="text-xs text-slate-600 font-medium">Supplier Name</p>
                <p className="text-sm text-slate-900 font-medium">{parsedPayload.supplier_name}</p>
              </div>
            )}
            {parsedPayload.country_code && (
              <div>
                <p className="text-xs text-slate-600 font-medium">Country</p>
                <p className="text-sm text-slate-900 font-mono">{parsedPayload.country_code}</p>
              </div>
            )}
            {parsedPayload.vat_number && (
              <div>
                <p className="text-xs text-slate-600 font-medium">VAT Number</p>
                <p className="text-sm text-slate-900 font-mono">{parsedPayload.vat_number}</p>
              </div>
            )}
            {parsedPayload.primary_contact_email && (
              <div>
                <p className="text-xs text-slate-600 font-medium">Contact Email</p>
                <p className="text-sm text-slate-900">{parsedPayload.primary_contact_email}</p>
              </div>
            )}
          </div>
          {parsedPayload.address && (
            <div className="bg-slate-50 rounded p-2 border border-slate-200">
              <p className="text-xs text-slate-600 font-medium mb-1">Address</p>
              <p className="text-sm text-slate-900">
                {parsedPayload.address}
                {parsedPayload.city && `, ${parsedPayload.city}`}
                {parsedPayload.postal_code && `, ${parsedPayload.postal_code}`}
              </p>
            </div>
          )}
        </div>
      );
    }

    if (datasetType === 'PRODUCT_MASTER') {
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            {parsedPayload.product_name && (
              <div>
                <p className="text-xs text-slate-600 font-medium">Product Name</p>
                <p className="text-sm text-slate-900 font-medium">{parsedPayload.product_name}</p>
              </div>
            )}
            {parsedPayload.sku && (
              <div>
                <p className="text-xs text-slate-600 font-medium">SKU</p>
                <p className="text-sm text-slate-900 font-mono">{parsedPayload.sku}</p>
              </div>
            )}
            {parsedPayload.category && (
              <div>
                <p className="text-xs text-slate-600 font-medium">Category</p>
                <p className="text-sm text-slate-900">{parsedPayload.category}</p>
              </div>
            )}
            {parsedPayload.unit_of_measure && (
              <div>
                <p className="text-xs text-slate-600 font-medium">Unit</p>
                <p className="text-sm text-slate-900">{parsedPayload.unit_of_measure}</p>
              </div>
            )}
            {parsedPayload.weight_kg && (
              <div>
                <p className="text-xs text-slate-600 font-medium">Weight</p>
                <p className="text-sm text-slate-900">{parsedPayload.weight_kg} kg</p>
              </div>
            )}
            {parsedPayload.hs_code && (
              <div>
                <p className="text-xs text-slate-600 font-medium">HS Code</p>
                <p className="text-sm text-slate-900 font-mono">{parsedPayload.hs_code}</p>
              </div>
            )}
          </div>
          {parsedPayload.description && (
            <div className="bg-slate-50 rounded p-2 border border-slate-200">
              <p className="text-xs text-slate-600 font-medium mb-1">Description</p>
              <p className="text-sm text-slate-900">{parsedPayload.description}</p>
            </div>
          )}
        </div>
      );
    }

    // Fallback for unknown dataset types
    return (
      <pre className="text-xs bg-slate-100 rounded p-2 overflow-x-auto max-h-40 overflow-y-auto font-mono">
        {JSON.stringify(parsedPayload, null, 2)}
      </pre>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-slate-900">Step 3: Review & Seal</h3>

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-900 ml-2">
          <strong>Final Review:</strong> Once sealed, this record becomes immutable evidence. Hashes are server-computed and cannot be altered.
        </AlertDescription>
      </Alert>

      {/* Declaration Summary */}
      <Card className="bg-slate-50/50 border-slate-200">
        <CardContent className="p-4 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-slate-600 font-medium">Ingestion Method</p>
              <p className="text-slate-900 font-mono">{declaration.ingestion_method}</p>
            </div>
            <div>
              <p className="text-slate-600 font-medium">Source System</p>
              <p className="text-slate-900 font-mono">{declaration.source_system}</p>
            </div>
            <div>
              <p className="text-slate-600 font-medium">Evidence Type</p>
              <Badge className="bg-purple-100 text-purple-800">{declaration.dataset_type}</Badge>
            </div>
            <div>
              <p className="text-slate-600 font-medium">Declared Scope</p>
              <Badge className="bg-slate-100 text-slate-800">{declaration.declared_scope}</Badge>
            </div>
          </div>

          {/* Scope Target or UNKNOWN warning */}
          {declaration.declared_scope !== 'ENTIRE_ORGANIZATION' && (
            <div className="pt-2 border-t">
              <p className="text-slate-600 font-medium mb-1">Scope Target</p>
              {declaration.scope_target_id ? (
                <div className="bg-green-50 border border-green-200 rounded px-2 py-1">
                  <p className="text-green-900 font-mono">{declaration.scope_target_name || declaration.scope_target_id}</p>
                </div>
              ) : declaration.declared_scope === 'UNKNOWN' ? (
                <div className="bg-red-50 border border-red-300 rounded px-2 py-1 space-y-1">
                  <p className="text-red-900 font-medium flex gap-1 items-center">
                    <AlertTriangle className="w-3 h-3" /> UNLINKED (will be QUARANTINED)
                  </p>
                  <p className="text-red-800">Reason: {declaration.quarantine_reason || declaration.unlinked_reason || 'N/A'}</p>
                  <p className="text-red-800">Resolve by: {declaration.resolution_due_date || 'N/A'}</p>
                </div>
              ) : (
                <p className="text-amber-600 italic">Not set</p>
              )}
            </div>
          )}

          <div className="pt-2 border-t">
            <p className="text-slate-600 font-medium mb-1">Purpose Tags</p>
            <div className="flex flex-wrap gap-1">
              {(declaration.purpose_tags || []).map(tag => (
                <Badge key={tag} className="bg-[#86b027]/20 text-[#86b027] text-xs">{tag}</Badge>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-slate-600 font-medium mb-1">Retention Policy</p>
            <p className="text-slate-900 font-mono">{declaration.retention_policy}</p>
          </div>
          
          <div className="pt-2 border-t grid grid-cols-2 gap-3">
            <div>
              <p className="text-slate-600 font-medium">Retention End (UTC)</p>
              <p className="text-slate-900 text-xs">Computed at seal</p>
            </div>
            <div>
              <p className="text-slate-600 font-medium">Personal Data</p>
              <Badge className={declaration.contains_personal_data ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}>
                {declaration.contains_personal_data ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payload Summary */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-4 space-y-3">
          <p className="font-medium text-slate-900 text-sm">Entered Data</p>
          {renderPayloadSummary()}
        </CardContent>
      </Card>

      {/* MANUAL_ENTRY Attestation */}
      {declaration.ingestion_method === 'MANUAL_ENTRY' && (
        <Card className="bg-amber-50/50 border-amber-300">
          <CardContent className="p-4 text-xs space-y-2">
            <p className="font-medium text-amber-900 flex gap-1 items-center">
              🔒 Attestation Summary
            </p>
            <div className="space-y-1 text-amber-800">
              <p>• Trust Level: <span className="font-bold">LOW</span></p>
              <p>• Initial Review Status: <span className="font-bold">NOT_REVIEWED</span> (awaiting review post-seal)</p>
              <p>• Attestor: <span className="italic">captured from auth session at seal</span></p>
              <p>• Method: <span className="font-mono">MANUAL_ENTRY</span></p>
              {declaration.entry_notes && (
                <p className="mt-2 pt-2 border-t border-amber-200">
                  Notes: <span className="italic">"{declaration.entry_notes.substring(0, 80)}{declaration.entry_notes.length > 80 ? '...' : ''}"</span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}