/**
 * Submission Gate Panel
 * Visual representation of submission readiness
 * Shows all gate statuses and blocking reasons
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  AlertCircle,
  Lock,
  Zap,
  Scale,
  Layers
} from 'lucide-react';

const GATE_ICONS = {
  validation_status: CheckCircle2,
  verification_status: Scale,
  lifecycle_locks: Lock,
  emissions_nonzero: Zap,
  certificates_required: Badge,
  precursor_completeness: Layers
};

export default function SubmissionGatePanel({ submission, onSubmit, loading = false }) {
  if (!submission) return null;

  const { ready, gates, blockers, passedGates, totalGates } = submission;

  return (
    <div className={`p-4 backdrop-blur-sm border rounded-2xl space-y-4 ${
      ready
        ? 'bg-emerald-50/80 border-emerald-200/60'
        : 'bg-amber-50/80 border-amber-200/60'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {ready ? (
            <>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-emerald-900">Ready to Submit</h3>
                <p className="text-xs text-emerald-700">All compliance gates open</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-600">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-900">Submission Blocked</h3>
                <p className="text-xs text-amber-700">{blockers.length} gate(s) not passed</p>
              </div>
            </>
          )}
        </div>

        <div className="text-right">
          <p className="text-sm font-mono text-slate-600">
            {passedGates}/{totalGates} gates
          </p>
        </div>
      </div>

      {/* Gate Status List */}
      <div className="space-y-2 bg-white/50 rounded-lg p-3">
        {gates.map((gate, idx) => {
          const Icon = GATE_ICONS[gate.gate] || CheckCircle2;

          return (
            <div
              key={idx}
              className={`flex items-start gap-3 p-2 rounded-lg text-xs ${
                gate.passed ? 'bg-emerald-50/50' : 'bg-red-50/50'
              }`}
            >
              <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                gate.passed ? 'text-emerald-600' : 'text-red-600'
              }`} />
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 capitalize">
                  {gate.gate.replace(/_/g, ' ')}
                </div>
                <p className={`text-xs mt-0.5 ${
                  gate.passed ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  {gate.reason}
                </p>
              </div>

              <Badge className={gate.passed ? 'bg-emerald-600' : 'bg-red-600'}>
                {gate.passed ? 'PASS' : 'BLOCK'}
              </Badge>
            </div>
          );
        })}
      </div>

      {/* Submit Button */}
      <Button
        onClick={onSubmit}
        disabled={!ready || loading}
        className={`w-full font-semibold py-2 ${
          ready
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
            : 'bg-slate-300 text-slate-500 cursor-not-allowed'
        }`}
      >
        {loading ? 'Submitting...' : ready ? 'Submit Declaration' : 'Blocked - Resolve Issues'}
      </Button>

      {/* Help text */}
      {!ready && (
        <p className="text-xs text-amber-700 bg-amber-100/50 p-2 rounded">
          🔒 <strong>Late validation not permitted.</strong> All gates must pass before submission attempt.
        </p>
      )}
    </div>
  );
}