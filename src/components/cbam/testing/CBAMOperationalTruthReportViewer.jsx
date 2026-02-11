/**
 * CBAM Operational Truth Report Viewer
 * Displays comprehensive audit results
 */

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

export default function CBAMOperationalTruthReportViewer() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('cbamOperationalTruthAudit', {});
      setReport(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getResultIcon = (result) => {
    if (result === 'PASS') return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (result === 'FAIL') return <XCircle className="w-5 h-5 text-red-600" />;
    return <AlertCircle className="w-5 h-5 text-amber-600" />;
  };

  const getReadinessBadge = (pct) => {
    if (pct >= 80) return <Badge className="bg-green-600">✓ Production Ready</Badge>;
    if (pct >= 50) return <Badge className="bg-amber-600">⚠ Monitor Required</Badge>;
    return <Badge className="bg-red-600">🚫 Block Production</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">CBAM Operational Truth Audit</h1>
        <Button onClick={runAudit} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Run Audit
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {report && (
        <>
          {/* Summary Card */}
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Readiness Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Total Tests</p>
                  <p className="text-2xl font-bold">{report.summary.totalTests}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Passed</p>
                  <p className="text-2xl font-bold text-green-600">{report.summary.passed}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{report.summary.failed}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Readiness</p>
                  <p className="text-2xl font-bold text-slate-900">{report.summary.operationalReadinessPct}%</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <p className="text-sm font-medium">Recommendation</p>
                {getReadinessBadge(report.summary.operationalReadinessPct)}
              </div>
            </CardContent>
          </Card>

          {/* Test Results */}
          <div className="space-y-3">
            {report.tests.map((test, idx) => (
              <Card key={idx} className={test.result === 'PASS' ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getResultIcon(test.result)}
                      <div>
                        <CardTitle className="text-base">{test.testName}</CardTitle>
                        <p className="text-xs text-slate-500 mt-1">{test.result === 'PASS' ? '✓ Passed' : test.result === 'FAIL' ? '✗ Failed' : '⚠ Error'}</p>
                      </div>
                    </div>
                    <Badge variant={test.result === 'PASS' ? 'default' : 'destructive'}>
                      {test.result}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {test.observations && (
                    <div className="bg-white/50 rounded p-3 text-xs space-y-1">
                      {Object.entries(test.observations).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-slate-600">{key}:</span>
                          <span className="font-mono text-slate-900">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {test.failureReason && (
                    <div className="bg-red-100/60 rounded p-3 text-xs font-medium text-red-800">
                      🚫 Reason: {test.failureReason}
                    </div>
                  )}
                  {test.error && (
                    <div className="bg-amber-100/60 rounded p-3 text-xs font-medium text-amber-800">
                      ⚠ Error: {test.error}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Analysis */}
          <Card className="bg-slate-50 border-slate-200">
            <CardHeader>
              <CardTitle>Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {report.summary.operationalReadinessPct >= 80 && (
                <p className="text-green-800 bg-green-100/50 p-3 rounded">
                  ✓ CBAM module is production-ready. All critical workflows are deterministic and compliant.
                </p>
              )}
              {report.summary.operationalReadinessPct >= 50 && report.summary.operationalReadinessPct < 80 && (
                <p className="text-amber-800 bg-amber-100/50 p-3 rounded">
                  ⚠ CBAM module requires monitoring. Deploy with close observation.
                </p>
              )}
              {report.summary.operationalReadinessPct < 50 && (
                <p className="text-red-800 bg-red-100/50 p-3 rounded">
                  🚫 CBAM module is NOT production-ready. Address failures before production deployment.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!report && !loading && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>Click "Run Audit" to validate CBAM operational integrity</AlertDescription>
        </Alert>
      )}
    </div>
  );
}