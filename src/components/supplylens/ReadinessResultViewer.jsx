import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

/**
 * READINESS RESULT VIEWER — READ-ONLY CONSUMER
 * 
 * Displays immutable ReadinessResult from backend.
 * NO recomputation. NO status changes. NO gap hiding.
 * 
 * All logic determined by backend evaluateReadiness.
 */

export default function ReadinessResultViewer({ resultId, result }) {
  if (!result) {
    return (
      <Card className="p-6 bg-slate-50">
        <p className="text-sm text-slate-600">No readiness result available.</p>
      </Card>
    );
  }

  const statusConfig = {
    BLOCKED: {
      color: 'bg-red-50 border-red-200',
      icon: AlertTriangle,
      badge: 'bg-red-100 text-red-800',
      label: 'BLOCKED',
      description: 'Entity cannot be used in this context. Blocking gaps must be resolved.'
    },
    PROVISIONAL: {
      color: 'bg-yellow-50 border-yellow-200',
      icon: Clock,
      badge: 'bg-yellow-100 text-yellow-800',
      label: 'PROVISIONAL',
      description: 'Entity can be used with limitations. Non-blocking gaps limit specific uses.'
    },
    READY: {
      color: 'bg-green-50 border-green-200',
      icon: CheckCircle2,
      badge: 'bg-green-100 text-green-800',
      label: 'READY',
      description: 'Entity meets all mandatory requirements for this use.'
    }
  };

  const config = statusConfig[result.status];
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      {/* STATUS CARD */}
      <Card className={`border ${config.color} p-6`}>
        <div className="flex items-start gap-4">
          <Icon className={`w-6 h-6 mt-1 ${config.status === 'BLOCKED' ? 'text-red-700' : config.status === 'PROVISIONAL' ? 'text-yellow-700' : 'text-green-700'}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-lg font-semibold text-slate-900">{config.label}</p>
              <Badge className={config.badge}>{result.status}</Badge>
            </div>
            <p className="text-sm text-slate-700 mb-3">{config.description}</p>
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-slate-600">Framework</p>
                <p className="font-semibold text-slate-900">{result.regulatory_framework}</p>
              </div>
              <div>
                <p className="text-slate-600">Intended Use</p>
                <p className="font-semibold text-slate-900">{result.intended_use}</p>
              </div>
              <div>
                <p className="text-slate-600">Rules Passed</p>
                <p className="font-semibold text-slate-900">{result.rules_passed}/{result.rules_applied}</p>
              </div>
              <div>
                <p className="text-slate-600">Evidence Used</p>
                <p className="font-semibold text-slate-900">{result.evidence_used}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* BLOCKING GAPS */}
      {result.blocking_gaps && result.blocking_gaps.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-900 mb-2">Blocking Gaps ({result.blocking_gaps.length})</p>
          <div className="space-y-2">
            {result.blocking_gaps.map(gap => (
              <Card key={gap.gap_id} className="border-l-4 border-l-red-500 p-3 bg-red-50">
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-red-900">{gap.description}</p>
                  <p className="text-red-800">Missing: <span className="font-mono">{gap.missing_field}</span></p>
                  <p className="text-red-700 text-xs">{gap.legal_reference}</p>
                  <p className="text-red-700 mt-2">{gap.remediation_hint}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* LIMITING GAPS */}
      {result.limiting_gaps && result.limiting_gaps.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-900 mb-2">Limiting Gaps ({result.limiting_gaps.length})</p>
          <div className="space-y-2">
            {result.limiting_gaps.map(gap => (
              <Card key={gap.gap_id} className="border-l-4 border-l-yellow-500 p-3 bg-yellow-50">
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-yellow-900">{gap.description}</p>
                  <p className="text-yellow-800">Missing: <span className="font-mono">{gap.missing_field}</span></p>
                  <p className="text-yellow-700 text-xs">{gap.legal_reference}</p>
                  <p className="text-yellow-700 mt-2">{gap.remediation_hint}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* AUDIT INFO */}
      <Card className="bg-slate-50 p-3 border-slate-200">
        <div className="text-xs text-slate-600 space-y-1">
          <p><strong>Result ID:</strong> <span className="font-mono text-slate-900">{result.result_id}</span></p>
          <p><strong>Context ID:</strong> <span className="font-mono text-slate-900">{result.context_id}</span></p>
          <p><strong>Evaluation Hash:</strong> <span className="font-mono text-slate-900">{result.evaluation_hash.slice(0, 16)}...</span></p>
          <p><strong>Timestamp:</strong> {new Date(result.evaluation_timestamp).toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-2">This result is immutable. Changing inputs will generate a new evaluation.</p>
        </div>
      </Card>
    </div>
  );
}