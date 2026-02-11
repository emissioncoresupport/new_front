import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Shield, Database, Calendar, Hash, Clock, User, Building, ExternalLink } from 'lucide-react';
import { createPageUrl } from '@/utils';

/**
 * EvidenceReceipt - Contract 1 Receipt Screen
 * Shows sealed evidence details with link to Evidence Vault
 */
export default function EvidenceReceipt({ evidence, onClose }) {
  if (!evidence) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-500">No receipt data available</p>
      </div>
    );
  }

  const handleOpenInVault = () => {
    // Navigate to Evidence Vault with focus on this record
    window.location.href = `${createPageUrl('EvidenceVault')}?focus=${evidence.display_id}`;
  };

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-green-900">Evidence Successfully Sealed</h2>
            <p className="text-sm text-green-800 mt-1">Immutable record created and stored in Evidence Vault</p>
          </div>
        </div>
      </div>

      {/* Receipt Details */}
      <Card className="border-2 border-slate-300 shadow-lg">
        <CardHeader className="bg-slate-50 border-b border-slate-200">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Shield className="w-5 h-5" />
            Evidence Receipt
          </CardTitle>
          <p className="text-xs text-slate-600 mt-1">Contract 1 compliant • Immutable system of record</p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Display ID */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-slate-500" />
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Display ID</p>
              </div>
              <p className="text-2xl font-mono font-bold text-slate-900">{evidence.display_id}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-green-600 text-white">SEALED</Badge>
              </div>
              <p className="text-sm text-slate-600">Status: Immutable</p>
            </div>
          </div>

          {/* Core Details */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-600 font-medium mb-1">Dataset Type</p>
                <Badge variant="outline" className="font-mono text-sm">{evidence.dataset_type}</Badge>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium mb-1">Ingestion Method</p>
                <Badge variant="outline" className="font-mono text-sm">{evidence.ingestion_method}</Badge>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium mb-1">Source System</p>
                <p className="text-sm text-slate-900 font-mono">{evidence.source_system || 'N/A'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <User className="w-3 h-3 text-slate-500" />
                  <p className="text-xs text-slate-600 font-medium">Created By</p>
                </div>
                <p className="text-sm text-slate-900 font-mono">{evidence.created_by}</p>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <User className="w-3 h-3 text-slate-500" />
                  <p className="text-xs text-slate-600 font-medium">Ingested By</p>
                </div>
                <p className="text-sm text-slate-900 font-mono">{evidence.ingested_by}</p>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Building className="w-3 h-3 text-slate-500" />
                  <p className="text-xs text-slate-600 font-medium">Tenant</p>
                </div>
                <p className="text-sm text-slate-900 font-mono">{evidence.tenant_id}</p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <p className="text-xs text-slate-600 font-medium">Sealed At (UTC)</p>
              </div>
              <p className="text-xs text-slate-900 font-mono">{new Date(evidence.sealed_at_utc).toLocaleString('en-GB', { timeZone: 'UTC' })}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <p className="text-xs text-slate-600 font-medium">Ingested At (UTC)</p>
              </div>
              <p className="text-xs text-slate-900 font-mono">{new Date(evidence.ingested_at_utc).toLocaleString('en-GB', { timeZone: 'UTC' })}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                <p className="text-xs text-slate-600 font-medium">Retention Ends (UTC)</p>
              </div>
              <p className="text-xs text-slate-900 font-mono">{new Date(evidence.retention_ends_utc).toLocaleString('en-GB', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' })}</p>
            </div>
          </div>

          {/* Hashes */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Hash className="w-3 h-3 text-slate-500" />
                <p className="text-xs text-slate-600 font-medium">Payload Hash (SHA-256)</p>
              </div>
              <p className="text-xs text-slate-900 font-mono bg-slate-50 p-2 rounded border border-slate-200 break-all">
                {evidence.payload_hash_sha256}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Hash className="w-3 h-3 text-slate-500" />
                <p className="text-xs text-slate-600 font-medium">Metadata Hash (SHA-256)</p>
              </div>
              <p className="text-xs text-slate-900 font-mono bg-slate-50 p-2 rounded border border-slate-200 break-all">
                {evidence.metadata_hash_sha256}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium">Hash Scope</p>
              <Badge variant="outline" className="text-xs">{evidence.hash_scope || 'FULL'}</Badge>
            </div>
          </div>

          {/* Record ID */}
          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-600 font-medium mb-1">Record ID (Internal)</p>
            <p className="text-xs text-slate-900 font-mono bg-slate-50 p-2 rounded border border-slate-200 break-all">
              {evidence.record_id}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
        <Button 
          onClick={handleOpenInVault}
          className="bg-[#86b027] hover:bg-[#86b027]/90 gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Open in Evidence Vault
        </Button>
      </div>
    </div>
  );
}