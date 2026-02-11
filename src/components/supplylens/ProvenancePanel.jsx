import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * PROVENANCE PANEL — Display complete audit trail for evidence record
 * Shows: tenant_id, created_via, created_by_actor_id, request_id, created_at_utc
 * Flags if provenance is incomplete
 */

export default function ProvenancePanel({ evidence }) {
  const [copied, setCopied] = useState(null);

  if (!evidence) return null;

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const createdViaLabels = {
    'UI': '🖥️ User Interface',
    'API': '🔌 API',
    'TEST_RUNNER': '🧪 Test Runner',
    'SEED': '🌱 Seed Data',
    'MIGRATION': '🔄 Migration',
    'CONNECTOR': '🔗 Connector'
  };

  const isComplete = !evidence.provenance_incomplete && 
                     evidence.tenant_id && 
                     evidence.created_via && 
                     evidence.created_by_actor_id && 
                     evidence.request_id;

  return (
    <Card className={`border ${isComplete ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {isComplete ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Provenance (Complete)
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Provenance (INCOMPLETE)
              </>
            )}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Created Via */}
        <div>
          <p className="text-xs font-medium text-slate-700 mb-1">Created Via</p>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs ${
              evidence.created_via === 'SEED' ? 'bg-amber-100 text-amber-800' :
              evidence.created_via === 'TEST_RUNNER' ? 'bg-blue-100 text-blue-800' :
              'bg-slate-100 text-slate-800'
            }`}>
              {createdViaLabels[evidence.created_via] || evidence.created_via}
            </Badge>
          </div>
        </div>

        {/* Tenant ID */}
        <div>
          <p className="text-xs font-medium text-slate-700 mb-1">Tenant ID</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-50 rounded px-2 py-1 text-xs font-mono text-slate-700 break-all">
              {evidence.tenant_id}
            </code>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => copyToClipboard(evidence.tenant_id, 'tenant')}
            >
              <Copy className="w-3 h-3" />
            </Button>
            {copied === 'tenant' && <span className="text-xs text-green-600">✓ Copied</span>}
          </div>
        </div>

        {/* Actor ID */}
        <div>
          <p className="text-xs font-medium text-slate-700 mb-1">Created By (Actor ID)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-50 rounded px-2 py-1 text-xs font-mono text-slate-700 break-all">
              {evidence.created_by_actor_id}
            </code>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => copyToClipboard(evidence.created_by_actor_id, 'actor')}
            >
              <Copy className="w-3 h-3" />
            </Button>
            {copied === 'actor' && <span className="text-xs text-green-600">✓ Copied</span>}
          </div>
        </div>

        {/* Request ID */}
        <div>
          <p className="text-xs font-medium text-slate-700 mb-1">Request ID (Correlation)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-50 rounded px-2 py-1 text-xs font-mono text-slate-700 break-all">
              {evidence.request_id}
            </code>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => copyToClipboard(evidence.request_id, 'request')}
            >
              <Copy className="w-3 h-3" />
            </Button>
            {copied === 'request' && <span className="text-xs text-green-600">✓ Copied</span>}
          </div>
        </div>

        {/* Created At */}
        <div>
          <p className="text-xs font-medium text-slate-700 mb-1">Created At (UTC)</p>
          <p className="text-xs font-mono text-slate-700 bg-slate-50 rounded px-2 py-1">
            {new Date(evidence.ingestion_timestamp_utc).toISOString()}
          </p>
        </div>

        {/* Status Banner */}
        {!isComplete && (
          <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded">
            <p className="text-xs text-red-800 font-medium">⚠️ This record is excluded from compliance metrics</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}