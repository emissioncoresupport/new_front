import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, XCircle, Eye, FileText } from 'lucide-react';

export default function PhaseV1AuditReport() {
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('ingestionAuditMatrix', {});
      setAuditData(response.data);
    } catch (error) {
      console.error('Audit failed:', error);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-light text-slate-900 uppercase tracking-widest">
            Phase V1 — Ingestion Audit Matrix
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            OBSERVATION ONLY - NO FIXES APPLIED
          </p>
        </div>
        <Button
          onClick={runAudit}
          disabled={loading}
          size="sm"
          className="bg-slate-800 hover:bg-slate-700"
        >
          <Eye className="w-4 h-4 mr-2" />
          {loading ? 'Running Audit...' : 'Run Audit'}
        </Button>
      </div>

      {auditData && (
        <div className="space-y-4">
          {/* Critical Notice */}
          <Card className="border-2 border-orange-500/30 bg-orange-50/30 backdrop-blur-sm p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-900">
                  {auditData.notice}
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  This phase exposes behavior without modification
                </p>
              </div>
            </div>
          </Card>

          {/* Test Matrix Results */}
          <Card className="border border-slate-200/40 bg-white/60 backdrop-blur-sm p-6">
            <h4 className="text-xs font-medium text-slate-900 uppercase tracking-widest mb-4">
              Test Matrix Results
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {auditData.test_matrix?.map((test, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/50 border border-slate-200/30">
                  <div className="flex-shrink-0 mt-0.5">
                    {test.risk_level === 'CRITICAL' && <XCircle className="w-4 h-4 text-red-500" />}
                    {test.risk_level === 'HIGH' && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                    {test.risk_level === 'MEDIUM' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                    {test.risk_level === 'LOW' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-700">{test.test_case_id}</span>
                      <span className="text-xs text-slate-600">{test.ingestion_path}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        test.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                        test.risk_level === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                        test.risk_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {test.risk_level}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">{test.test_case_description}</p>
                    <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                      {Object.entries(test.observed_outcome).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span> {typeof value === 'string' ? value : JSON.stringify(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Silent Behavior Detection */}
          <Card className="border border-slate-200/40 bg-white/60 backdrop-blur-sm p-6">
            <h4 className="text-xs font-medium text-slate-900 uppercase tracking-widest mb-4">
              Silent Behavior Detection
            </h4>
            <div className="space-y-2">
              {auditData.deviations?.map((deviation, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/50 border border-slate-200/30">
                  <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900">{deviation.behavior}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{deviation.detection_method}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">Observed:</span>
                      <span className="text-xs text-slate-700">{deviation.observed}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">Risk:</span>
                      <span className="text-xs text-orange-700">{deviation.risk}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Cross-Path Parity */}
          <Card className="border border-slate-200/40 bg-white/60 backdrop-blur-sm p-6">
            <h4 className="text-xs font-medium text-slate-900 uppercase tracking-widest mb-4">
              Cross-Path Parity Checks
            </h4>
            <div className="space-y-2">
              {auditData.parity_checks?.map((check, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/50 border border-slate-200/30">
                  <div className="flex-shrink-0 mt-0.5">
                    {check.behavior_identical === 'NO' ? 
                      <XCircle className="w-4 h-4 text-red-500" /> :
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-700">{check.test_case_id}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        check.behavior_identical === 'NO' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {check.behavior_identical}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">{check.test_case_description}</p>
                    {check.differences?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {check.differences.map((diff, diffIdx) => (
                          <div key={diffIdx} className="text-xs text-red-700 bg-red-50 p-2 rounded">
                            {diff.path_a} vs {diff.path_b}: {diff.difference}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Audit Log Completeness */}
          <Card className="border border-slate-200/40 bg-white/60 backdrop-blur-sm p-6">
            <h4 className="text-xs font-medium text-slate-900 uppercase tracking-widest mb-4">
              Audit Log Completeness
            </h4>
            <div className="space-y-2">
              {auditData.audit_log_completeness?.map((check, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/50 border border-slate-200/30">
                  <FileText className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900">{check.check}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{check.status}</p>
                    <p className="text-xs text-orange-700 mt-0.5">Risk: {check.risk_if_missing}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Critical Findings */}
          <Card className="border-2 border-red-500/30 bg-red-50/30 backdrop-blur-sm p-6">
            <h4 className="text-xs font-medium text-red-900 uppercase tracking-widest mb-4">
              Critical Findings
            </h4>
            <div className="space-y-3">
              {auditData.critical_findings?.map((finding, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="text-xs font-medium text-red-900">{finding.finding}</p>
                  <p className="text-xs text-red-700">Impact: {finding.impact}</p>
                  <p className="text-xs text-red-600">Recommendation: {finding.recommendation}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Conclusion */}
          <Card className="border border-slate-200/40 bg-white/60 backdrop-blur-sm p-4">
            <p className="text-xs text-slate-700 font-medium">
              {auditData.conclusion}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}