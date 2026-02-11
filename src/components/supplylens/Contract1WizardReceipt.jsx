import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Lock, CheckCircle2 } from 'lucide-react';

/**
 * RECEIPT PREVIEW — Evidence Sealing Confirmation
 * 
 * Shows declaration + confirmation that hashes are server-side computed
 * and evidence becomes immutable after sealing
 */

export default function Contract1WizardReceipt({ declaration, payload }) {
  return (
    <div className="space-y-4">
      <div className="bg-green-50/50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-green-900 text-sm">Ready to Seal</p>
          <p className="text-xs text-green-800 mt-1">
            All declarations complete. This evidence will become immutable upon sealing.
          </p>
        </div>
      </div>

      {/* Declaration Summary */}
      <Card className="bg-slate-50/50 border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-900">Ingestion Declaration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-600 font-medium">Method</p>
              <p className="text-slate-900 mt-0.5">{declaration.ingestion_method}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium">Dataset Type</p>
              <p className="text-slate-900 mt-0.5">{declaration.dataset_type}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium">Source System</p>
              <p className="text-slate-900 mt-0.5">{declaration.source_system}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium">Declared Scope</p>
              <p className="text-slate-900 mt-0.5">{declaration.declared_scope}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium">Intent</p>
              <p className="text-slate-900 mt-0.5">{declaration.declared_intent}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium">Retention Policy</p>
              <p className="text-slate-900 mt-0.5">{declaration.retention_policy}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-600 font-medium mb-1">Intended Consumers</p>
            <div className="flex flex-wrap gap-1">
              {declaration.intended_consumers?.map((consumer) => (
                <Badge key={consumer} variant="outline" className="text-xs">
                  {consumer}
                </Badge>
              ))}
            </div>
          </div>

          {declaration.contains_personal_data && (
            <div className="bg-amber-50/50 border border-amber-200 rounded p-2 mt-2">
              <p className="text-xs text-amber-900 font-medium">Personal Data: YES</p>
              <p className="text-xs text-amber-800 mt-0.5">Legal Basis: {declaration.gdpr_legal_basis}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-slate-600 font-medium mb-1">Data Minimization</p>
            <p className="text-xs text-slate-700">
              ✓ Confirmed: No unnecessary personal data included
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sealing Guarantees */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-blue-900 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Sealing Guarantees
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-blue-900">
          <div className="flex items-start gap-2">
            <span className="text-lg">🔐</span>
            <span>Payload hash (SHA-256) computed server-side and immutable</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg">🔐</span>
            <span>Metadata hash (SHA-256) computed from canonical declaration</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg">📝</span>
            <span>All actions logged to immutable audit trail</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg">🔒</span>
            <span>Once sealed: no updates or deletes allowed (409 Conflict)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg">⏳</span>
            <span>Retained according to policy until deletion date</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg">🏛️</span>
            <span>Meets regulator-grade requirements (Contract 1)</span>
          </div>
        </CardContent>
      </Card>

      {/* Important notice */}
      <div className="bg-slate-100/50 rounded-lg p-3 border border-slate-300 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-700">
          Clicking "Seal Evidence" initiates server-side cryptographic sealing. The evidence becomes immutable and all actions become auditable.
        </p>
      </div>
    </div>
  );
}