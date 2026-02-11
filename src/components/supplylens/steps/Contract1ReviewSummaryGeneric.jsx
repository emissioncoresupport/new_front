import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * CONTRACT 1 REVIEW SUMMARY - ALL METHODS
 * 
 * Final review before immutable sealing.
 * Shows method-specific payload details, trust/review requirements, and submission context.
 * 
 * REFACTORED 2026-01-29:
 * - Separated Submission Channel from Ingestion Method
 * - Evidence Type (not dataset_type) displayed
 * - Retention shows "Pending (computed at seal)"
 * - No "Kernel" terminology - only "Evidence Engine"
 */

export default function Contract1ReviewSummaryGeneric({ declaration, payload, simulationMode, fileMetadata, draftState }) {
  const isQuarantined = declaration.declared_scope === 'UNKNOWN';
  const method = declaration.ingestion_method;
  
  // Determine payload display based on method
  const getPayloadStatus = () => {
    switch (method) {
      case 'MANUAL_ENTRY':
        return { label: 'Canonical JSON', hash: 'Server computes SHA-256', trust_notice: '⚠️ Manual entry requires review before use in calculations' };
      case 'FILE_UPLOAD':
      case 'ERP_EXPORT':
        return { label: 'File bytes', hash: 'Server computes SHA-256', trust_notice: null };
      case 'API_PUSH':
        return { label: 'Pre-digested payload', hash: 'Digest provided', trust_notice: '⚠️ No file bytes stored — digest only' };
      case 'ERP_API':
        return { label: 'Fetched via ERP connector', hash: 'Server fetches and hashes', trust_notice: null };
      default:
        return { label: 'Unknown', hash: 'Server verifies', trust_notice: null };
    }
  };

  const payloadStatus = getPayloadStatus();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="w-5 h-5 text-green-600" />
        <h3 className="font-medium text-slate-900">Step 3: Review & Seal</h3>
      </div>

      {/* Evidence Engine Verification Card */}
      <Card className="border-indigo-300 bg-indigo-50/50">
        <CardHeader className="pb-3 border-b border-indigo-200">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            System Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-indigo-700 font-medium">Method</p>
              <code className="text-indigo-900 text-[10px] bg-white rounded px-2 py-1 border border-indigo-200 block mt-1">
                {method}
              </code>
            </div>
            <div>
              <p className="text-indigo-700 font-medium">Evidence Type</p>
              <code className="text-indigo-900 text-[10px] bg-white rounded px-2 py-1 border border-indigo-200 block mt-1">
                {declaration.evidence_type || declaration.dataset_type}
              </code>
            </div>
            <div>
              <p className="text-indigo-700 font-medium">Scope</p>
              <code className="text-indigo-900 text-[10px] bg-white rounded px-2 py-1 border border-indigo-200 block mt-1">
                {declaration.declared_scope}
              </code>
            </div>
            {declaration.scope_target_id && (
              <div>
                <p className="text-indigo-700 font-medium">Scope Target</p>
                <code className="text-indigo-900 text-[10px] bg-white rounded px-2 py-1 border border-indigo-200 block mt-1">
                  {declaration.scope_target_id}
                </code>
              </div>
            )}
            {method === 'API_PUSH' && declaration.external_reference_id && (
              <div className="col-span-2">
                <p className="text-indigo-700 font-medium">External Reference ID</p>
                <code className="text-indigo-900 text-[10px] bg-white rounded px-2 py-1 border border-indigo-200 block mt-1 break-all">
                  {declaration.external_reference_id}
                </code>
              </div>
            )}
            {method === 'API_PUSH' && declaration.payload_digest_sha256 && (
              <div className="col-span-2">
                <p className="text-indigo-700 font-medium">Payload Digest SHA-256</p>
                <code className="text-indigo-900 text-[10px] bg-white rounded px-2 py-1 border border-indigo-200 block mt-1 break-all font-mono">
                  {declaration.payload_digest_sha256.substring(0, 32)}...
                </code>
              </div>
            )}
            {declaration.retention_policy && (
              <div>
                <p className="text-indigo-700 font-medium">Retention Policy</p>
                <code className="text-indigo-900 text-[10px] bg-white rounded px-2 py-1 border border-indigo-200 block mt-1">
                  {declaration.retention_policy}
                </code>
              </div>
            )}
          </div>
          <p className="text-indigo-700 italic text-[10px] mt-2 pt-2 border-t border-indigo-200">
            ⓘ All verification performed server-side. Once sealed, record becomes immutable and append-only.
          </p>
        </CardContent>
      </Card>

      {/* EVIDENCE SUMMARY (from Step 1) */}
      <Card className="border-slate-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Evidence Metadata Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-600 font-medium">Ingestion Method</p>
              <Badge className="bg-indigo-100 text-indigo-800 mt-1 text-[10px]">{declaration.ingestion_method}</Badge>
            </div>
            <div>
              <p className="text-slate-600 font-medium">Source System</p>
              <Badge className="bg-purple-100 text-purple-800 mt-1 text-[10px]">{declaration.source_system}</Badge>
            </div>
            <div>
              <p className="text-slate-600 font-medium">Evidence Type</p>
              <Badge className="bg-blue-100 text-blue-800 mt-1 text-[10px]">{declaration.evidence_type || declaration.dataset_type}</Badge>
            </div>
            <div>
              <p className="text-slate-600 font-medium">Declared Scope</p>
              <Badge className="bg-slate-100 text-slate-800 mt-1 text-[10px]">{declaration.declared_scope}</Badge>
            </div>
            {!isQuarantined && declaration.scope_target_name && (
              <div className="col-span-2">
                <p className="text-slate-600 font-medium">Linked To</p>
                <p className="text-slate-900 mt-1 font-mono text-[10px]">{declaration.scope_target_name}</p>
              </div>
            )}
            {isQuarantined && (
              <div className="col-span-2 bg-red-50 border border-red-200 rounded p-3">
                <p className="text-red-900 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  This record will be QUARANTINED
                </p>
                <p className="text-red-800 mt-2 text-xs">
                  <strong>Reason:</strong> {declaration.unlinked_reason || 'N/A'}
                </p>
                <p className="text-red-800 mt-1 text-xs">
                  <strong>Resolve by:</strong> {declaration.resolution_due_date ? new Date(declaration.resolution_due_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PROVENANCE SUMMARY */}
      <Card className="border-slate-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Why This Evidence?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <p className="text-slate-700">{declaration.why_this_evidence}</p>
          <div className="mt-3 flex gap-1 flex-wrap">
            {declaration.purpose_tags?.map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* METHOD-SPECIFIC PAYLOAD SUMMARY */}
      <Card className="border-slate-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Payload Summary</CardTitle>
            <Badge className="bg-blue-100 text-blue-800 text-[10px]">{payloadStatus.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-slate-600 font-medium">Method</p>
              <p className="text-slate-900">{method}</p>
            </div>
            <div>
              <p className="text-slate-600 font-medium">Hash Computation</p>
              <p className="text-slate-900 text-[10px]">{payloadStatus.hash}</p>
            </div>
          </div>

          {/* Method-specific details */}
          {method === 'API_PUSH' && (
            <>
              {declaration.external_reference_id && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">External Reference ID</p>
                  <code className="text-slate-900 text-[10px] break-all">{declaration.external_reference_id}</code>
                </div>
              )}
              {declaration.received_at_utc && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">Received At (UTC)</p>
                  <p className="text-slate-900 text-[10px]">{new Date(declaration.received_at_utc).toISOString()}</p>
                </div>
              )}
              {declaration.payload_digest_sha256 && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">Payload Digest SHA-256</p>
                  <code className="text-slate-900 text-[10px] break-all font-mono">
                    {declaration.payload_digest_sha256}
                    {declaration.payload_digest_sha256.startsWith('SIM') && (
                      <Badge className="ml-2 bg-amber-100 text-amber-800 text-[8px]">SIMULATED</Badge>
                    )}
                  </code>
                </div>
              )}
              {declaration.payload_bytes_count && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">Payload Bytes</p>
                  <p className="text-slate-900 text-[10px]">{declaration.payload_bytes_count.toLocaleString()} bytes</p>
                </div>
              )}
              {declaration.source_endpoint && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">Source Endpoint</p>
                  <code className="text-slate-900 text-[10px] break-all">{declaration.source_endpoint}</code>
                </div>
              )}
            </>
          )}
          {method === 'ERP_EXPORT' && (
            <>
              {declaration.erp_system && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">ERP System</p>
                  <Badge className="bg-purple-100 text-purple-800 text-[10px]">{declaration.erp_system}</Badge>
                </div>
              )}
              {declaration.export_job_id && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">Export Job ID</p>
                  <code className="text-slate-900 text-[10px] break-all">{declaration.export_job_id}</code>
                </div>
              )}
              {declaration.export_type && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">Export Type</p>
                  <Badge className="bg-blue-100 text-blue-800 text-[10px]">{declaration.export_type}</Badge>
                </div>
              )}
              {declaration.exported_at_utc && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">Exported At (UTC)</p>
                  <p className="text-slate-900 text-[10px]">{new Date(declaration.exported_at_utc).toISOString()}</p>
                </div>
              )}
              {declaration.export_type === 'DELTA' && declaration.export_period_start_utc && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">Export Period</p>
                  <p className="text-slate-900 text-[10px]">
                    {new Date(declaration.export_period_start_utc).toISOString()} → {new Date(declaration.export_period_end_utc).toISOString()}
                  </p>
                </div>
              )}
              {declaration.storage_location && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">Storage Location</p>
                  <code className="text-slate-900 text-[10px] break-all">{declaration.storage_location}</code>
                </div>
              )}
              {declaration.manifest_digest_sha256 && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">Manifest Digest SHA-256</p>
                  <code className="text-slate-900 text-[10px] break-all font-mono">
                    {declaration.manifest_digest_sha256}
                    {declaration.manifest_digest_sha256.startsWith('SIM') && (
                      <Badge className="ml-2 bg-amber-100 text-amber-800 text-[8px]">SIMULATED</Badge>
                    )}
                  </code>
                </div>
              )}
              {(declaration.record_count || declaration.file_count) && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">Export Stats</p>
                  <div className="flex gap-3 mt-1">
                    {declaration.record_count && (
                      <Badge className="bg-slate-100 text-slate-800 text-[10px]">
                        {declaration.record_count.toLocaleString()} records
                      </Badge>
                    )}
                    {declaration.file_count && (
                      <Badge className="bg-slate-100 text-slate-800 text-[10px]">
                        {declaration.file_count} file{declaration.file_count > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          {method === 'ERP_API' && (
            <>
              {declaration.erp_system && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">ERP System</p>
                  <Badge className="bg-purple-100 text-purple-800 text-[10px]">{declaration.erp_system}</Badge>
                </div>
              )}
              {declaration.connector_name && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">Connector Name</p>
                  <code className="text-slate-900 text-[10px] break-all">{declaration.connector_name}</code>
                </div>
              )}
              {declaration.run_id && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">Run ID</p>
                  <code className="text-slate-900 text-[10px] break-all">{declaration.run_id}</code>
                </div>
              )}
              {declaration.query_profile && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">Query Profile</p>
                  <Badge className="bg-blue-100 text-blue-800 text-[10px]">
                    {declaration.query_profile}
                    {declaration.custom_profile_name && ` (${declaration.custom_profile_name})`}
                  </Badge>
                </div>
              )}
              {declaration.started_at_utc && declaration.finished_at_utc && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">Extraction Window</p>
                  <p className="text-slate-900 text-[10px]">
                    {new Date(declaration.started_at_utc).toISOString()} → {new Date(declaration.finished_at_utc).toISOString()}
                  </p>
                </div>
              )}
              {declaration.records_returned !== undefined && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">Extraction Stats</p>
                  <div className="flex gap-3 mt-1">
                    <Badge className="bg-slate-100 text-slate-800 text-[10px]">
                      {declaration.records_returned.toLocaleString()} records
                    </Badge>
                    {declaration.pagination_pages && (
                      <Badge className="bg-slate-100 text-slate-800 text-[10px]">
                        {declaration.pagination_pages} pages
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              {declaration.api_base_url && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">API Base URL</p>
                  <code className="text-slate-900 text-[10px] break-all">{declaration.api_base_url}</code>
                </div>
              )}
              {declaration.manifest_digest_sha256 && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">Manifest Digest SHA-256</p>
                  <code className="text-slate-900 text-[10px] break-all font-mono">
                    {declaration.manifest_digest_sha256}
                    {declaration.manifest_digest_sha256.startsWith('SIM') && (
                      <Badge className="ml-2 bg-amber-100 text-amber-800 text-[8px]">SIMULATED</Badge>
                    )}
                  </code>
                </div>
              )}
            </>
          )}
          {method === 'MANUAL_ENTRY' && (
            <>
              {declaration.entry_notes && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">Attestation Notes</p>
                  <p className="text-slate-900 text-[10px]">{declaration.entry_notes}</p>
                </div>
              )}
              {declaration.manual_json_data && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-600 font-medium">Manual Entry Data (Will Be Canonicalized)</p>
                  <div className="bg-amber-50 border border-amber-200 rounded p-3">
                    <pre className="text-[10px] font-mono text-amber-900 max-h-32 overflow-auto whitespace-pre-wrap">
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(declaration.manual_json_data), null, 2);
                        } catch {
                          return declaration.manual_json_data;
                        }
                      })()}
                    </pre>
                    <p className="text-[9px] text-amber-700 mt-2 italic">
                      ⓘ Server will canonicalize this JSON (RFC 8785) and hash canonical form. NO payload.txt file created.
                    </p>
                  </div>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 bg-amber-50 rounded p-2">
                <p className="text-amber-900 text-[10px] font-medium">⚠️ Trust & Review Status</p>
                <div className="mt-1 space-y-1 text-amber-800 text-[10px]">
                  <p>• Trust Level: <strong>LOW</strong> (manual attestation)</p>
                  <p>• Review Status: <strong>NOT_REVIEWED</strong></p>
                  <p>• ⚠️ Cannot be used in compliance calculations until approved</p>
                  <p>• Expected Files: <strong>0</strong> (data in metadata)</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* RETENTION & GDPR */}
      <Card className="border-slate-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Retention & Compliance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-slate-600 font-medium">Retention Policy</p>
              <p className="text-slate-900">{declaration.retention_policy}</p>
            </div>
            <div>
              <p className="text-slate-600 font-medium">Retention Until (UTC)</p>
              <p className="text-slate-900 text-xs">Pending (computed at seal)</p>
            </div>
            <div>
              <p className="text-slate-600 font-medium">Personal Data?</p>
              <p className="text-slate-900">{declaration.contains_personal_data ? 'Yes' : 'No'}</p>
            </div>
            {declaration.contains_personal_data && declaration.gdpr_legal_basis && (
              <div className="col-span-2">
                <p className="text-slate-600 font-medium">GDPR Legal Basis</p>
                <p className="text-slate-900">{declaration.gdpr_legal_basis}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PAYLOAD STATUS CARD */}
      <Card className={simulationMode ? "bg-amber-50 border-amber-300" : "bg-blue-50 border-blue-300"}>
        <CardContent className="p-3 text-xs">
          <p className={`font-medium mb-2 ${simulationMode ? 'text-amber-900' : 'text-blue-900'}`}>
            {simulationMode ? '⚠️ Payload Status (Simulation)' : '✓ Payload Ready'}
          </p>
          <div className={`space-y-1 ${simulationMode ? 'text-amber-800' : 'text-blue-800'}`}>
            <p>• Method: <strong>{method}</strong></p>
            <p>• Payload: <strong>{payloadStatus.label}</strong></p>
            {payloadStatus.trust_notice && (
              <p className={`text-[10px] mt-2 font-medium ${simulationMode ? 'text-amber-700' : 'text-blue-700'}`}>
                {payloadStatus.trust_notice}
              </p>
            )}
            <p className={`text-[10px] mt-2 ${simulationMode ? 'text-amber-700' : 'text-blue-700'}`}>
              {simulationMode 
                ? '⚠️ UI validation only — no ledger record, no immutable hash' 
                : payloadStatus.hash}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SEALING NOTICE */}
      <Card className="bg-blue-50 border-blue-300">
        <CardContent className="p-3 text-xs text-blue-900 space-y-2">
          <p className="font-medium">🔒 Sealing this record will:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Lock all metadata and payload (immutable, cannot be modified or deleted)</li>
            <li>Compute server-side SHA-256 hashes ({method === 'MANUAL_ENTRY' ? 'canonical JSON + metadata' : 'payload + metadata'})</li>
            <li>Capture seal timestamp and user identity (server-authoritative)</li>
            <li>{isQuarantined ? 'Mark as QUARANTINED until scope resolved' : `Set review status to ${method === 'MANUAL_ENTRY' ? 'NOT_REVIEWED (approval required)' : 'PENDING_REVIEW (optional review)'}`}</li>
          </ul>
          {method === 'API_PUSH' && (
            <div className="pt-2 border-t border-blue-200 mt-2">
              <p className="text-[10px] text-blue-800">
                <strong>⚠️ External Retention Notice:</strong> Payload bytes are NOT stored. Only the provided digest (SHA-256) will be recorded. External system must retain original for audit.
              </p>
            </div>
          )}
          {method === 'MANUAL_ENTRY' && (
            <div className="pt-2 border-t border-blue-200 mt-2">
              <p className="text-[10px] text-blue-800">
                <strong>ⓘ Manual Entry:</strong> JSON data will be canonicalized (RFC 8785) and hashed. NO payload.txt file created. Trust=LOW, approval required before use.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}