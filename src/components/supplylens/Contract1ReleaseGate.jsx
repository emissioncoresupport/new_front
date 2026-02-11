import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function Contract1ReleaseGate() {
  const { data: status } = useQuery({
    queryKey: ['contract1Status'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('contract1_status', {});
        return response.status === 200 ? response.data : null;
      } catch {
        return null;
      }
    }
  });

  const { data: gaps = [] } = useQuery({
    queryKey: ['gapItemsForGate'],
    queryFn: async () => {
      try {
        return await base44.asServiceRole.entities.GapItem.filter(
          { contract: 'CONTRACT_1' }
        );
      } catch {
        return [];
      }
    }
  });

  const latestRun = status?.latest_run;
  const criticalOpenGaps = gaps.filter(g => g.risk_level === 'CRITICAL' && g.status === 'OPEN');
  const isTestsVerified = latestRun && latestRun.status === 'PASS';

  const isReleaseReady = isTestsVerified && criticalOpenGaps.length === 0;

  return (
    <div className="space-y-4">
      {/* Main Status */}
      <Card className={isReleaseReady ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {isReleaseReady ? (
              <CheckCircle2 className="w-12 h-12 text-green-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-red-600 flex-shrink-0" />
            )}
            <div>
              <p className={`text-2xl font-bold ${isReleaseReady ? 'text-green-900' : 'text-red-900'}`}>
                {isReleaseReady ? 'RELEASE READY' : 'RELEASE BLOCKED'}
              </p>
              <p className={`text-sm mt-1 ${isReleaseReady ? 'text-green-800' : 'text-red-800'}`}>
                {isReleaseReady
                  ? 'All Contract 1 gates passed. Ready for TEST deployment. No legal compliance claim made—only gate verification.'
                  : 'One or more blocking conditions detected. Cannot proceed.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conditions */}
      <div className="space-y-3">
        {/* Test Verification */}
        <Card className={isTestsVerified ? 'bg-white border-slate-200' : 'bg-amber-50 border-amber-300'}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Test Verification</CardTitle>
              {isTestsVerified ? (
                <Badge className="bg-green-100 text-green-800">✓ PASS</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">✗ UNVERIFIED</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            {isTestsVerified ? (
              <>
                <p className="text-green-800">
                  ✓ Latest test run passed: <span className="font-mono">{latestRun.run_id.slice(0, 12)}...</span>
                </p>
                <p className="text-green-800">
                  Result: {latestRun.pass_count}/{latestRun.total_tests} tests passed
                </p>
              </>
            ) : (
              <p className="text-amber-800">
                Execute tests in "Executable Tests" tab to generate proof.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Critical Gaps */}
        <Card className={criticalOpenGaps.length === 0 ? 'bg-white border-slate-200' : 'bg-red-50 border-red-300'}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Critical Gaps</CardTitle>
              {criticalOpenGaps.length === 0 ? (
                <Badge className="bg-green-100 text-green-800">✓ NONE</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">{criticalOpenGaps.length} OPEN</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            {criticalOpenGaps.length === 0 ? (
              <p className="text-green-800">✓ No open critical gaps blocking release</p>
            ) : (
              <div className="space-y-1">
                {criticalOpenGaps.map(gap => (
                  <div key={gap.id} className="text-red-800">
                    <p className="font-medium">• {gap.title}</p>
                    <p className="text-red-700 ml-4">{gap.area} • Owner: {gap.owner}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legal Disclaimer */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4 text-xs text-slate-700 italic">
          <p>
            🔒 <strong>Important:</strong> Contract 1 gate verification is a Base44 platform control test. It verifies that 
            the backend enforces required Contract 1 principles (validation, isolation, immutability, hashing, determinism). 
            It does NOT constitute legal compliance advice or audit sign-off. Always conduct independent legal and audit review 
            per your regulatory requirements (CSRD, CSDDD, DPP, etc.).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}