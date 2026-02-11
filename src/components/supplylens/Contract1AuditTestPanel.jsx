import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * Contract 1 Audit Test Panel
 * Runs acceptance tests in DEMO mode only. Displays results with pass/fail status.
 */

export default function Contract1AuditTestPanel() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleRunTests = async () => {
    setRunning(true);
    setError(null);
    setResults(null);

    try {
      const response = await base44.functions.invoke('testContract1AcceptanceRegulatorGrade', {});

      if (response.data?.ok) {
        setResults(response.data);
      } else {
        setError(response.data?.message || 'Test run failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span>Regulator-Grade Acceptance Tests</span>
          <Badge variant="outline" className="text-xs">DEMO ONLY</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
          <p className="font-medium mb-1">✓ Tenant Isolation • ✓ Immutability • ✓ Hashing • ✓ Idempotency</p>
          <p>Validates Contract 1 pipeline in isolated test environment. Results cannot persist in LIVE.</p>
        </div>

        <Button
          onClick={handleRunTests}
          disabled={running}
          className="w-full bg-[#86b027] hover:bg-[#86b027]/90 gap-2"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            'Run Full Test Suite'
          )}
        </Button>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-900">
            <p className="font-medium flex items-center gap-1 mb-1">
              <AlertCircle className="w-4 h-4" /> Test Error
            </p>
            {error}
          </div>
        )}

        {results && (
          <div className="space-y-3">
            {/* Summary */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm space-y-1">
              <p className="font-medium text-slate-900">
                Results: {results.passed_tests}/{results.total_tests} tests passed
              </p>
              <p className="text-xs text-slate-600">Data Mode: <strong>{results.data_mode}</strong></p>
              <p className="text-xs text-slate-600">Test Run: {results.test_run_id.slice(0, 8)}...</p>
            </div>

            {/* Test Results */}
            <div className="space-y-2">
              {results.results?.map((test, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 p-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{test.test}</p>
                      <p className="text-slate-600 text-xs mt-1">{test.description}</p>
                    </div>
                    {test.passed === true ? (
                      <Badge className="bg-green-100 text-green-800 whitespace-nowrap">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        PASS
                      </Badge>
                    ) : test.passed === false ? (
                      <Badge className="bg-red-100 text-red-800 whitespace-nowrap">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        FAIL
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="whitespace-nowrap">ℹ INFO</Badge>
                    )}
                  </div>

                  {/* Extra details */}
                  {test.response_status && (
                    <p className="text-slate-600 mt-2">Status: {test.response_status}</p>
                  )}
                  {test.hash_matches !== undefined && (
                    <p className={`mt-2 ${test.hash_matches ? 'text-green-700' : 'text-red-700'}`}>
                      Hash Match: {test.hash_matches ? '✓' : '✗'}
                    </p>
                  )}
                  {test.first_evidence_id && (
                    <p className="text-slate-600 mt-2 font-mono text-xs">
                      Evidence: {test.first_evidence_id.slice(0, 8)}...
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Overall Status */}
            <div className={`rounded-lg border p-3 text-sm font-medium ${
              results.passed_tests === results.total_tests
                ? 'bg-green-50 border-green-200 text-green-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              {results.passed_tests === results.total_tests
                ? '✓ All tests passed — Contract 1 is regulator-grade'
                : `⚠ ${results.total_tests - results.passed_tests} test(s) failed`}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}