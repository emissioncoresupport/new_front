import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

/**
 * CONTRACT 1 SEALING STATUS — Corrected labels and queries
 * 
 * Shows:
 * - Forbidden States (Compliance Blocker)
 * - Not Sealed (Informational)
 * - Sealed (Compliant)
 */

export default function Contract1SealingStatus({ evidenceData }) {
  if (!evidenceData) {
    return <div className="text-slate-600 text-sm">Loading sealing status...</div>;
  }

  // Filter provenance-complete only
  const completeEvidence = (evidenceData.all || []).filter(e => !e.provenance_incomplete);

  // Forbidden states
  const forbiddenStates = ['RAW', 'CLASSIFIED', 'STRUCTURED', null, undefined];
  const forbiddenEvidence = completeEvidence.filter(e => forbiddenStates.includes(e.evidence_status));

  // Not sealed (informational)
  const notSealedEvidence = completeEvidence.filter(e =>
    ['INGESTED', 'REJECTED', 'FAILED', 'SUPERSEDED'].includes(e.evidence_status)
  );

  // Sealed (compliant)
  const sealedEvidence = completeEvidence.filter(e => e.evidence_status === 'SEALED');

  const compliancePercent = completeEvidence.length > 0
    ? Math.round((sealedEvidence.length / completeEvidence.length) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Compliance Block */}
      {forbiddenEvidence.length > 0 && (
        <Alert className="border-red-200 bg-red-50/50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900 ml-2">
            <strong>Forbidden States (Compliance Blocker):</strong> {forbiddenEvidence.length} records in RAW, CLASSIFIED, STRUCTURED, or NULL state. Normalize before sealing.
          </AlertDescription>
        </Alert>
      )}

      {/* Sealed Count */}
      <Card className="bg-gradient-to-br from-green-50/40 via-white/60 to-green-100/20 border border-green-200/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-green-900">
            <CheckCircle2 className="w-4 h-4" />
            Sealed (Compliant)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-2xl font-light text-green-900">{sealedEvidence.length}</p>
              <p className="text-xs text-green-700">Sealed Records</p>
            </div>
            <div>
              <p className="text-2xl font-light text-green-900">{compliancePercent}%</p>
              <p className="text-xs text-green-700">Compliance</p>
            </div>
            <div>
              <p className="text-2xl font-light text-slate-900">{completeEvidence.length}</p>
              <p className="text-xs text-slate-600">Total (provenance complete)</p>
            </div>
          </div>
          <p className="text-xs text-green-800 mt-2">
            These records are immutable with audit trails and cryptographic seals.
          </p>
        </CardContent>
      </Card>

      {/* Not Sealed (Informational) */}
      {notSealedEvidence.length > 0 && (
        <Card className="bg-gradient-to-br from-amber-50/40 via-white/60 to-amber-100/20 border border-amber-200/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-amber-900">
              <Clock className="w-4 h-4" />
              Not Sealed (Informational)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div>
                <p className="text-xs text-amber-600 font-medium">INGESTED</p>
                <p className="text-lg font-light text-amber-900">
                  {completeEvidence.filter(e => e.evidence_status === 'INGESTED').length}
                </p>
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">REJECTED</p>
                <p className="text-lg font-light text-amber-900">
                  {completeEvidence.filter(e => e.evidence_status === 'REJECTED').length}
                </p>
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">FAILED</p>
                <p className="text-lg font-light text-amber-900">
                  {completeEvidence.filter(e => e.evidence_status === 'FAILED').length}
                </p>
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">SUPERSEDED</p>
                <p className="text-lg font-light text-amber-900">
                  {completeEvidence.filter(e => e.evidence_status === 'SUPERSEDED').length}
                </p>
              </div>
            </div>
            <p className="text-xs text-amber-800 mt-2">
              Records in intermediate or terminal non-sealed states. Progress to SEALED for compliance.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Forbidden States Detail */}
      {forbiddenEvidence.length > 0 && (
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader>
            <CardTitle className="text-sm text-red-900">Forbidden States Detail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-xs">
              {forbiddenEvidence.map((e) => (
                <div key={e.evidence_id} className="flex items-center justify-between text-red-800 bg-white rounded p-2">
                  <code className="font-mono text-red-600">{e.evidence_id.substring(0, 8)}</code>
                  <Badge variant="destructive" className="text-xs">{e.evidence_status || 'NULL'}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}