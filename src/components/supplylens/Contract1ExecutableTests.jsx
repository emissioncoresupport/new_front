import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Play, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function Contract1ExecutableTests() {
  const [isRunning, setIsRunning] = useState(false);

  const { data: status, isLoading: statusLoading, refetch } = useQuery({
    queryKey: ['contract1Status'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('contract1_status', {});
        return response.status === 200 ? response.data : null;
      } catch {
        return null;
      }
    },
    refetchInterval: 5000
  });

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['contract1Health'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('contract1_health', {});
        return response.status === 200 ? { available: true } : { available: false };
      } catch {
        return { available: false };
      }
    }
  });

  const runTests = async () => {
    setIsRunning(true);
    try {
      const response = await base44.functions.invoke('contract1_run', {});
      if (response.status === 200) {
        toast.success(`${response.data.pass_count}/${response.data.total_tests} tests passed`);
        refetch();
      } else if (response.status === 403) {
        toast.error('Tests blocked in LIVE environment');
      } else {
        toast.error(`Test failed: ${response.data?.error_code || 'unknown'}`);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const latestRun = status?.latest_run;
  const testRunnerAvailable = health?.available;

  return (
    <div className="space-y-4">
      {/* Run Button */}
      {testRunnerAvailable ? (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <Button
              onClick={runTests}
              disabled={isRunning}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running tests...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Contract 1 Tests (TEST env only)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-red-50 border-red-300">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-sm font-medium text-red-900">Test Runner Unavailable</p>
            </div>
            <p className="text-xs text-red-800">
              Backend test runner endpoint is not responding. A GAP item has been created (area=TEST_RUNNER, risk=CRITICAL).
            </p>
          </CardContent>
        </Card>
      )}

      {/* Latest Run Results */}
      {latestRun && (
        <Card className={latestRun.status === 'PASS' ? 'bg-green-50 border-green-300' : 'bg-amber-50 border-amber-300'}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Latest Test Run</CardTitle>
              <Badge className={latestRun.status === 'PASS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {latestRun.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-gray-600">Run ID</p>
                <p className="font-mono text-gray-900">{latestRun.run_id.slice(0, 12)}...</p>
              </div>
              <div>
                <p className="text-gray-600">Result</p>
                <p className="font-medium text-gray-900">{latestRun.pass_count}/{latestRun.total_tests} passed</p>
              </div>
              <div>
                <p className="text-gray-600">Timestamp</p>
                <p className="text-gray-900">{new Date(latestRun.finished_at_utc).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600">Pass Rate</p>
                <p className="font-medium text-gray-900">{latestRun.pass_rate}%</p>
              </div>
            </div>

            {/* Test Sections */}
            <div className="space-y-2 mt-4 pt-4 border-t border-gray-200">
              {status?.sections && Object.entries(status.sections).map(([sectionKey, sectionData]) => (
                <div key={sectionKey} className="flex items-center justify-between">
                  <span className="text-gray-700 capitalize">{sectionKey.replace('_', ' ')}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">{sectionData.passed}/{sectionData.total}</span>
                    {sectionData.total > 0 && sectionData.passed === sectionData.total ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results Yet */}
      {!latestRun && (
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4 text-center text-xs text-slate-600">
            <p>No test results yet. Click "Run Tests" to generate executable proof.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}