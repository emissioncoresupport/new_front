import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronDown, Trash2, Lock } from 'lucide-react';

/**
 * EVIDENCE VAULT — Regulator-Grade
 * Lists evidence with capture_channel, upstream_system, dataset_type, state, hashes
 */

export default function EvidenceVaultRegulatorGrade() {
  const [expanded, setExpanded] = useState(null);
  const [dataMode, setDataMode] = useState('LIVE');

  useEffect(() => {
    const loadDataMode = async () => {
      try {
        const company = await base44.asServiceRole.entities.Company.filter({});
        setDataMode(company?.[0]?.data_mode || 'LIVE');
      } catch (error) {
        console.error('Failed to load data mode', error);
      }
    };
    loadDataMode();
  }, []);

  const { data: evidence = [], isLoading } = useQuery({
    queryKey: ['evidence'],
    queryFn: async () => {
      const results = await base44.asServiceRole.entities.Evidence.filter({});
      return results || [];
    }
  });

  const stateColors = {
    INGESTED: 'bg-blue-100 text-blue-800',
    SEALED: 'bg-green-100 text-green-800',
    SUPERSEDED: 'bg-amber-100 text-amber-800',
    REJECTED: 'bg-red-100 text-red-800',
    FAILED: 'bg-red-100 text-red-800'
  };

  const handlePurgeDemo = async () => {
    if (!confirm('Delete all TEST_FIXTURE records? This cannot be undone.')) return;

    try {
      const toDelete = evidence.filter(e => e.provenance === 'TEST_FIXTURE');
      for (const record of toDelete) {
        await base44.asServiceRole.entities.Evidence.delete(record.id);
      }
      alert(`Deleted ${toDelete.length} test records`);
      window.location.reload();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Evidence Vault</h2>
        {dataMode === 'DEMO' && (
          <Button onClick={handlePurgeDemo} variant="destructive" size="sm" gap="2">
            <Trash2 className="w-4 h-4" />
            Purge Demo Data
          </Button>
        )}
      </div>

      {/* Data Mode Banner */}
      <div className={`rounded-lg p-4 border ${dataMode === 'LIVE' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
        <p className={`text-sm font-medium ${dataMode === 'LIVE' ? 'text-red-900' : 'text-amber-900'}`}>
          Data Mode: <strong>{dataMode}</strong>
          {dataMode === 'LIVE' && ' — TEST_FIXTURE records are blocked'}
          {dataMode === 'DEMO' && ' — Test data allowed; purge before going live'}
        </p>
      </div>

      {/* Evidence List */}
      {isLoading ? (
        <p className="text-slate-500 text-sm">Loading evidence...</p>
      ) : (
        <div className="space-y-3">
          {evidence.length === 0 ? (
            <p className="text-slate-500 text-sm">No evidence records yet</p>
          ) : (
            evidence.map((record) => (
              <div key={record.id} className="border border-slate-200 rounded-lg hover:border-slate-300 transition bg-white">
                <button
                  onClick={() => setExpanded(expanded === record.id ? null : record.id)}
                  className="w-full text-left p-4 flex items-center justify-between hover:bg-slate-50/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={stateColors[record.ledger_state]}>
                        {record.ledger_state}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {record.capture_channel}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {record.upstream_system}
                      </Badge>
                      {record.ledger_state === 'SEALED' && (
                        <Lock className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <p className="text-sm text-slate-700 font-medium">{record.dataset_type}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      By {record.created_by_user_id} — {new Date(record.ingestion_timestamp_utc).toLocaleString()}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition ${expanded === record.id ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Expanded Details */}
                {expanded === record.id && (
                  <div className="border-t border-slate-200 bg-slate-50/50 p-4 space-y-3 text-xs font-mono">
                    <div>
                      <p className="text-slate-600 font-semibold mb-1">Evidence ID</p>
                      <code className="text-slate-900 break-all">{record.evidence_id}</code>
                    </div>
                    <div>
                      <p className="text-slate-600 font-semibold mb-1">Primary Intent</p>
                      <p className="text-slate-700">{record.primary_intent}</p>
                    </div>
                    <div>
                      <p className="text-slate-600 font-semibold mb-1">Purpose Tags</p>
                      <div className="flex gap-2 flex-wrap">
                        {record.purpose_tags?.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-600 font-semibold mb-1">Payload Hash (SHA-256)</p>
                      <code className="text-slate-900 break-all">{record.payload_hash_sha256}</code>
                    </div>
                    <div>
                      <p className="text-slate-600 font-semibold mb-1">Metadata Hash (SHA-256)</p>
                      <code className="text-slate-900 break-all">{record.metadata_hash_sha256}</code>
                    </div>
                    <div>
                      <p className="text-slate-600 font-semibold mb-1">Retention Policy</p>
                      <p className="text-slate-700">{record.retention_policy} (ends: {new Date(record.retention_end_date_utc).toLocaleDateString()})</p>
                    </div>
                    {record.sealed_at_utc && (
                      <div>
                        <p className="text-slate-600 font-semibold mb-1">Sealed At (UTC)</p>
                        <p className="text-slate-700">{new Date(record.sealed_at_utc).toISOString()}</p>
                      </div>
                    )}
                    {record.provenance === 'TEST_FIXTURE' && (
                      <div className="bg-amber-100 border border-amber-300 rounded p-2 text-amber-900">
                        ⚠ TEST_FIXTURE — Can be purged in DEMO mode
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}