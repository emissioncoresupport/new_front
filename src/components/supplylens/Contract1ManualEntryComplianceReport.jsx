import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * MANUAL_ENTRY Contract 1 Compliance Report
 * Runs all acceptance tests and displays results
 */

export default function Contract1ManualEntryComplianceReport() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const runCompleteTests = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('testManualEntryAcceptance', {});
      setResults(res.data);
    } catch (e) {
      setResults({
        error: e.response?.data?.message || e.message,
        status: e.response?.status
      });
    }
    setLoading(false);
  };

  const testDescriptions = {
    'M_MANUAL_01': 'source_system forced to INTERNAL_MANUAL',
    'M_MANUAL_02': 'missing request_id returns 422',
    'M_MANUAL_03': 'LEGAL_ENTITY scope requires scope_target_id',
    'M_MANUAL_04': 'free text "ZUK Motion" rejected with 422',
    'M_MANUAL_05': 'payload must be JSON object (not string)',
    'M_MANUAL_06': 'placeholder values rejected',
    'M_MANUAL_07': 'attestation captured server-side from auth',
    'M_MANUAL_08': 'sealed record returns 409 on update'
  };

  return (
    <Card className="bg-white/90 backdrop-blur-lg border-slate-200">
      <CardHeader>
        <CardTitle className="text-slate-900 flex items-center justify-between">
          <span>🎯 MANUAL_ENTRY Contract 1 Compliance</span>
          <Button 
            onClick={runCompleteTests} 
            disabled={loading}
            className="bg-[#86b027] hover:bg-[#86b027]/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              'Run All Tests'
            )}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {!results && !loading && (
          <div className="text-center py-8 text-slate-600">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <p className="text-sm">Click "Run All Tests" to validate MANUAL_ENTRY compliance</p>
            <p className="text-xs mt-2 text-slate-500">Tests: source_system enforcement, payload validation, attestation capture, immutability</p>
          </div>
        )}

        {results && !results.error && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Test Summary</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{results.summary}</p>
                </div>
                <div className="text-right">
                  <Badge className={`text-lg ${results.pass_rate === '100%' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {results.pass_rate}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Individual Tests */}
            <div className="space-y-2">
              {results.results?.map((result, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    result.pass 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.pass ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold">{result.test}</span>
                        <Badge variant="outline" className="text-xs">
                          {result.pass ? 'PASS' : 'FAIL'}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700 mt-1">
                        {result.description || testDescriptions[result.test]}
                      </p>
                      {!result.pass && result.error && (
                        <div className="mt-2 text-xs font-mono bg-red-100 p-2 rounded">
                          {JSON.stringify(result.error, null, 2)}
                        </div>
                      )}
                      {result.expected && (
                        <div className="mt-2 text-xs text-slate-600">
                          <span className="font-medium">Expected:</span> {result.expected}
                          {result.actual && <> | <span className="font-medium">Actual:</span> {result.actual}</>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Timestamp */}
            <div className="text-xs text-slate-500 text-center pt-2 border-t">
              Tested at: {results.timestamp}
            </div>
          </div>
        )}

        {results?.error && (
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <p className="text-sm font-medium text-red-900">Test Execution Failed</p>
            <p className="text-xs text-red-800 mt-2">{results.error}</p>
            {results.status && <p className="text-xs text-red-700 mt-1">Status: {results.status}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}