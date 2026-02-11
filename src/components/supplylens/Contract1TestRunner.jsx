import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, PlayCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function Contract1TestRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const runTests = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('contract1_run', {});
      
      if (response.status === 200 && response.data) {
        setResults(response.data);
        toast.success(`Tests complete: ${response.data.pass_rate}% passed (${response.data.pass_count}/${response.data.total_tests})`);
      } else if (response.status === 403 && response.data?.error_code === 'QA_BLOCKED_IN_LIVE') {
        setError(`${response.data.error_code}: ${response.data.message}`);
        toast.error('Tests blocked in LIVE');
      } else {
        const errData = response.data || {};
        const correlationId = errData.correlation_id || 'N/A';
        const errorMsg = `[${errData.error_code || 'UNKNOWN'}] ${errData.message || errData.error || 'Test execution failed'} (correlation: ${correlationId})`;
        setError(errorMsg);
        toast.error('Tests failed');
      }
    } catch (err) {
      const errorMsg = `${err.message || 'Test execution error'}`;
      setError(errorMsg);
      toast.error('Test execution error');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'PASS') return 'bg-green-100 text-green-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusIcon = (status) => {
    if (status === 'PASS') return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    return <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-900">Contract 1: Manual Entry Hardening Tests</h3>
          <p className="text-xs text-slate-600 mt-1">
            Validates known/unknown scope handling, method-dataset compatibility, immutability, and error discipline
          </p>
        </div>
        <Button 
          onClick={runTests} 
          disabled={isRunning}
          className="bg-[#86b027] hover:bg-[#86b027]/90"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4 mr-2" />
              Run Tests
            </>
          )}
        </Button>
      </div>

      {error && (
        <Alert className="bg-red-50 border-red-300">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-900 text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {results && (
        <div className="space-y-4">
          {/* Summary */}
          <Card className="bg-slate-50 border-slate-300">
            <CardContent className="p-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-sm text-slate-600">Total Tests</p>
                  <p className="text-2xl font-bold text-slate-900">{results.total_tests}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Passed</p>
                  <p className="text-2xl font-bold text-green-600">{results.passed}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{results.failed}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Pass Rate</p>
                  <p className={`text-2xl font-bold ${results.failed === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                    {results.pass_rate}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Results */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm">Test Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {results.results.map((test, idx) => (
                <div key={idx} className={`p-3 rounded border flex items-start gap-3 ${
                  test.status === 'PASS' 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  {getStatusIcon(test.status)}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-mono font-medium ${
                      test.status === 'PASS' ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {test.test}
                    </p>
                    {test.details && (
                      <p className={`text-xs mt-1 ${
                        test.status === 'PASS' ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {test.details}
                      </p>
                    )}
                    {test.expected_error && (
                      <p className="text-xs mt-1 text-red-800">
                        Expected error: <span className="font-mono">{test.expected_error}</span>
                      </p>
                    )}
                    {test.error && (
                      <p className="text-xs mt-1 text-red-800 font-mono">{test.error}</p>
                    )}
                  </div>
                  <Badge className={getStatusColor(test.status)}>{test.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Summary by Category */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 space-y-2 text-sm">
              <p className="font-medium text-blue-900">Test Coverage</p>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li><strong>Known Scope (LINKED):</strong> {results.summary.known_scope}</li>
                <li><strong>Unknown Scope (QUARANTINED):</strong> {results.summary.unknown_scope}</li>
                <li><strong>Matrix Enforcement:</strong> {results.summary.matrix_enforcement}</li>
                <li><strong>Immutability:</strong> {results.summary.immutability}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {!results && !error && (
        <Card className="bg-slate-50 border-slate-200 text-center p-8">
          <p className="text-sm text-slate-600">Click "Run Tests" to execute Contract 1 test suite</p>
        </Card>
      )}
    </div>
  );
}