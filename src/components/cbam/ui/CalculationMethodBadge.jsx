/**
 * Calculation Method Status Badge - READ-ONLY
 * Derives method from verification status (NOT user-selectable)
 * 
 * Rules:
 * - EU Method: verification_status = 'accredited_verifier_satisfactory' + evidence_reference
 * - Default Values: all other cases (enforced)
 */

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, FileText } from "lucide-react";

export default function CalculationMethodBadge({ verification_status, evidence_reference }) {
  // Derive method from verification state (NOT user input)
  const isEUMethod = 
    verification_status === 'accredited_verifier_satisfactory' && 
    evidence_reference;

  if (isEUMethod) {
    return (
      <div className="p-4 bg-emerald-50/80 backdrop-blur-sm border border-emerald-200/60 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-sm text-emerald-900">EU Method (Verified)</span>
          </div>
          <Badge className="bg-emerald-600 text-white">LOCKED</Badge>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-700">
          <FileText className="w-3 h-3" />
          <span>Verified actual data • Evidence: {evidence_reference}</span>
        </div>
      </div>
    );
  }

  // Default Values (enforced)
  return (
    <div className="p-4 bg-slate-50/80 backdrop-blur-sm border border-slate-200/60 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-sm text-slate-900">Default Values (Enforced)</span>
        </div>
        <Badge className="bg-slate-600 text-white">LOCKED</Badge>
      </div>
      <div className="text-xs text-slate-600">
        {!verification_status || verification_status === 'not_verified' 
          ? '⚠️ Entry not verified. Using EU benchmarks with regulatory markup.'
          : verification_status === 'accredited_verifier_unsatisfactory'
            ? '❌ Verification unsatisfactory. Fallback to defaults.'
            : '📊 Verification incomplete. Defaults applied by regulation.'}
      </div>
    </div>
  );
}