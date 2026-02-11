import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Clock, Shield, Hash } from 'lucide-react';

/**
 * CONTRACT 1 PROOF VIEW
 * Shows evidence records with full provenance for audit verification
 * Displays: evidence_id, tenant_id, origin, method, hashes, retention, sealed_at, audit trail
 */

export default function Contract1ProofView() {
  const { data: evidence = [], isLoading } = useQuery({
    queryKey: ['evidence-proof'],
    queryFn: async () => {
      const results = await base44.asServiceRole.entities.Evidence.filter({});
      return results || [];
    }
  });

  const { data: company = {} } = useQuery({
    queryKey: ['company-proof'],
    queryFn: async () => {
      const results = await base44.asServiceRole.entities.Company.filter({});
      return results?.[0] || {};
    }
  });

  const dataMode = company.data_mode || 'LIVE';

  // Filter valid evidence (exclude quarantined + test fixtures in LIVE)
  const validEvidence = evidence.filter(ev => {
    if (ev.ledger_state === 'QUARANTINED') return false;
    if (dataMode === 'LIVE' && ev.origin === 'TEST_FIXTURE') return false;
    return true;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-slate-600">Loading proof...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Contract 1 Proof Log</CardTitle>
          <Badge className="bg-slate-700 text-white">{validEvidence.length} Valid</Badge>
        </div>
        <p className="text-xs text-slate-600 mt-1">
          Evidence provenance audit trail — all records sealed, hashed, retention-tracked
        </p>
      </CardHeader>

      <CardContent>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {validEvidence.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No valid evidence yet</p>
            </div>
          )}

          {validEvidence.map((ev) => {
            const isSealed = ev.ledger_state === 'SEALED';
            const hasValidRetention = ev.retention_ends_at_utc && ev.retention_ends_at_utc !== 'Invalid Date';

            return (
              <div
                key={ev.id}
                className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {isSealed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-600" />
                    )}
                    <Badge className={isSealed ? 'bg-green-600 text-white' : 'bg-amber-600 text-white'}>
                      {ev.ledger_state}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {ev.origin}
                    </Badge>
                  </div>
                  <span className="text-xs text-slate-500">{ev.ingestion_method}</span>
                </div>

                {/* IDs and Provenance */}
                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  <div>
                    <p className="text-slate-600 font-medium mb-1">Evidence ID</p>
                    <code className="text-slate-900 bg-slate-100 px-2 py-1 rounded block break-all">
                      {ev.evidence_id}
                    </code>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium mb-1">Tenant ID</p>
                    <code className="text-slate-900 bg-slate-100 px-2 py-1 rounded block break-all">
                      {ev.tenant_id}
                    </code>
                  </div>
                </div>

                {/* Method Details */}
                <div className="mb-3 text-xs">
                  <p className="text-slate-600 font-medium mb-1">Capture Channel</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{ev.ingestion_method}</Badge>
                    <span className="text-slate-700">from {ev.source_system}</span>
                  </div>
                  {ev.source_system_friendly_name && (
                    <p className="text-slate-500 mt-1">({ev.source_system_friendly_name})</p>
                  )}
                </div>

                {/* Dataset */}
                <div className="mb-3 text-xs">
                  <p className="text-slate-600 font-medium mb-1">Dataset</p>
                  <div className="flex gap-2 items-center">
                    <Badge className="bg-slate-700 text-white">{ev.dataset_type}</Badge>
                    <span className="text-slate-700">scope: {ev.declared_scope}</span>
                  </div>
                </div>

                {/* Hashes */}
                <div className="mb-3 text-xs space-y-2">
                  <div>
                    <p className="text-slate-600 font-medium mb-1 flex items-center gap-1">
                      <Hash className="w-3 h-3" /> Payload Hash (SHA-256)
                    </p>
                    <code className="text-slate-900 bg-slate-100 px-2 py-1 rounded block break-all font-mono text-[10px]">
                      {ev.payload_hash_sha256 || 'MISSING'}
                    </code>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium mb-1 flex items-center gap-1">
                      <Hash className="w-3 h-3" /> Metadata Hash (SHA-256)
                    </p>
                    <code className="text-slate-900 bg-slate-100 px-2 py-1 rounded block break-all font-mono text-[10px]">
                      {ev.metadata_hash_sha256 || 'MISSING'}
                    </code>
                  </div>
                </div>

                {/* Retention */}
                <div className="mb-3 text-xs">
                  <p className="text-slate-600 font-medium mb-1">Retention</p>
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline">{ev.retention_policy}</Badge>
                    {hasValidRetention && (
                      <span className="text-slate-700">
                        expires: {new Date(ev.retention_ends_at_utc).toLocaleDateString()}
                      </span>
                    )}
                    {!hasValidRetention && (
                      <span className="text-red-600">INVALID RETENTION DATE</span>
                    )}
                  </div>
                </div>

                {/* Sealing Info */}
                {isSealed && ev.sealed_at_utc && (
                  <div className="text-xs bg-green-50 border border-green-200 rounded p-2">
                    <p className="text-green-900 font-medium">
                      ✓ Sealed at: {new Date(ev.sealed_at_utc).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Compliance Status */}
                <div className="mt-3 pt-3 border-t text-[10px]">
                  {ev.ledger_state === 'QUARANTINED' && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-2">
                      <p className="text-amber-900 font-medium">⚠️ Quarantined: {ev.quarantine_reason || 'No reason provided'}</p>
                    </div>
                  )}
                  {!ev.payload_hash_sha256 && (
                    <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                      <p className="text-red-900 font-medium">❌ Violation: Missing payload hash</p>
                    </div>
                  )}
                  {(!Array.isArray(ev.purpose_tags) || ev.purpose_tags.length === 0) && (
                    <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                      <p className="text-red-900 font-medium">❌ Violation: Missing purpose_tags</p>
                    </div>
                  )}
                  {(!ev.retention_ends_at_utc || ev.retention_ends_at_utc === 'Invalid Date') && (
                    <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                      <p className="text-red-900 font-medium">❌ Violation: Invalid retention date</p>
                    </div>
                  )}
                </div>

                {/* Timestamps */}
                <div className="mt-3 pt-3 border-t text-[10px] text-slate-500 flex justify-between">
                  <span>Ingested: {new Date(ev.ingestion_timestamp_utc).toLocaleString()}</span>
                  <span>Audit Events: {ev.audit_event_count || 0}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}