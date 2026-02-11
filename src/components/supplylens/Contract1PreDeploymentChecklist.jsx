import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Play } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * PRE-DEPLOYMENT READINESS CHECKLIST
 * Validates the three DO-NOT-SHIP criteria:
 * 1) No SEED or TEST_RUNNER in production tenants
 * 2) Forbidden states count = 0
 * 3) Upload/manual ingest: INGESTED -> SEALED + 2 audit events
 */

export default function Contract1PreDeploymentChecklist() {
  const [runningCheck, setRunningCheck] = useState(false);
  const [checkResults, setCheckResults] = useState(null);
  const [isTenantProduction, setIsTenantProduction] = useState(true);

  const { data: readinessData, refetch: refetchReadiness } = useQuery({
    queryKey: ['deploymentReadiness'],
    queryFn: async () => {
      try {
        const allEvidence = await base44.asServiceRole.entities.Evidence.list();

        // Filter provenance-complete only
        const completeEvidence = allEvidence.filter(e => !e.provenance_incomplete);

        // Check 1: No SEED or TEST_RUNNER in production
        const testOrSeedCount = allEvidence.filter(e => 
          ['TEST_RUNNER', 'SEED'].includes(e.created_via)
        ).length;

        // Check 2: Forbidden states = 0
        const forbiddenStates = ['RAW', 'CLASSIFIED', 'STRUCTURED', null, undefined];
        const forbiddenCount = completeEvidence.filter(e => 
          forbiddenStates.includes(e.evidence_status)
        ).length;

        // Check 3: SEALED records with 2+ audit events
        const sealedEvidence = completeEvidence.filter(e => e.evidence_status === 'SEALED');
        const sealedWithMinAuditEvents = sealedEvidence.filter(e => e.audit_event_count >= 2).length;

        // Find any sealed without minimum audit
        const sealedWithoutMinAudit = sealedEvidence.filter(e => e.audit_event_count < 2);

        const check1Pass = testOrSeedCount === 0;
        const check2Pass = forbiddenCount === 0;
        const check3Pass = sealedWithoutMinAudit.length === 0;

        const allPass = check1Pass && check2Pass && check3Pass;

        return {
          timestamp: new Date().toISOString(),
          total_evidence: allEvidence.length,
          complete_evidence: completeEvidence.length,
          
          check1: {
            name: 'No TEST_RUNNER or SEED in Production',
            requirement: 'created_via must not contain TEST_RUNNER or SEED',
            testOrSeedCount,
            pass: check1Pass,
            details: testOrSeedCount > 0 ? `Found ${testOrSeedCount} test/seed records` : 'Clean'
          },

          check2: {
            name: 'No Forbidden States',
            requirement: 'No RAW, CLASSIFIED, STRUCTURED, or NULL states',
            forbiddenCount,
            pass: check2Pass,
            details: forbiddenCount > 0 ? `Found ${forbiddenCount} forbidden states` : 'All normalized'
          },

          check3: {
            name: 'SEALED Records Have Audit Trail',
            requirement: 'Every SEALED record has >= 2 audit events (INGESTED, SEALED)',
            sealedCount: sealedEvidence.length,
            sealedWithMinAudit: sealedWithMinAuditEvents,
            sealedWithoutMinAudit: sealedWithoutMinAudit.length,
            pass: check3Pass,
            details: sealedWithoutMinAudit.length === 0 
              ? `All ${sealedWithMinAuditEvents} SEALED records compliant` 
              : `${sealedWithoutMinAudit.length} SEALED records missing audit events`
          },

          overall_pass: allPass
        };
      } catch (error) {
        throw error;
      }
    },
    refetchInterval: null
  });

  const handleRunCleanup = async () => {
    setRunningCheck(true);
    try {
      const response = await base44.functions.invoke('cleanupTestAndSeedData', {});
      toast.success(`Cleanup: ${response.data.cleaned_count} records soft-deleted`);
      refetchReadiness();
    } catch (error) {
      toast.error('Cleanup failed: ' + error.message);
    } finally {
      setRunningCheck(false);
    }
  };

  const handleRunNormalization = async () => {
    setRunningCheck(true);
    try {
      const response = await base44.functions.invoke('normalizeEvidenceStates', {});
      toast.success(`Normalization: ${response.data.normalized_count} states converted`);
      refetchReadiness();
    } catch (error) {
      toast.error('Normalization failed: ' + error.message);
    } finally {
      setRunningCheck(false);
    }
  };

  const handleRefresh = () => {
    refetchReadiness();
  };

  if (!readinessData) {
    return <div className="text-slate-600">Loading readiness data...</div>;
  }

  const allChecksPassed = readinessData.overall_pass;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light text-slate-900">Pre-Deployment Readiness Checklist</h2>
          <p className="text-sm text-slate-600 mt-1">Validates all DO-NOT-SHIP criteria for production</p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Overall Status Banner */}
      {allChecksPassed ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-900">✓ Ready for Production</p>
            <p className="text-sm text-green-800 mt-1">All DO-NOT-SHIP criteria passed. Safe to deploy.</p>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">⚠ Production Blockers Detected</p>
            <p className="text-sm text-red-800 mt-1">Fix all failures below before deploying.</p>
          </div>
        </div>
      )}

      {/* Check 1: No Test/Seed Data */}
      <Card className={`border ${readinessData.check1.pass ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base text-slate-900">{readinessData.check1.name}</CardTitle>
              <p className="text-xs text-slate-600 mt-1">{readinessData.check1.requirement}</p>
            </div>
            {readinessData.check1.pass ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm font-mono text-slate-700">{readinessData.check1.details}</p>
          {!readinessData.check1.pass && (
            <Button
              onClick={handleRunCleanup}
              disabled={runningCheck}
              variant="outline"
              size="sm"
              className="gap-2 text-red-600 hover:bg-red-50"
            >
              <Play className="w-3 h-3" />
              Run Cleanup
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Check 2: No Forbidden States */}
      <Card className={`border ${readinessData.check2.pass ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base text-slate-900">{readinessData.check2.name}</CardTitle>
              <p className="text-xs text-slate-600 mt-1">{readinessData.check2.requirement}</p>
            </div>
            {readinessData.check2.pass ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm font-mono text-slate-700">{readinessData.check2.details}</p>
          {!readinessData.check2.pass && (
            <Button
              onClick={handleRunNormalization}
              disabled={runningCheck}
              variant="outline"
              size="sm"
              className="gap-2 text-red-600 hover:bg-red-50"
            >
              <Play className="w-3 h-3" />
              Run Normalization
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Check 3: Audit Event Compliance */}
      <Card className={`border ${readinessData.check3.pass ? 'border-green-200 bg-green-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base text-slate-900">{readinessData.check3.name}</CardTitle>
              <p className="text-xs text-slate-600 mt-1">{readinessData.check3.requirement}</p>
            </div>
            {readinessData.check3.pass ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="bg-white rounded p-2">
              <p className="text-xs text-slate-600 font-medium">Total SEALED</p>
              <p className="text-lg font-light text-slate-900">{readinessData.check3.sealedCount}</p>
            </div>
            <div className="bg-white rounded p-2">
              <p className="text-xs text-slate-600 font-medium">With Audit Events</p>
              <p className="text-lg font-light text-green-900">{readinessData.check3.sealedWithMinAudit}</p>
            </div>
            <div className="bg-white rounded p-2">
              <p className="text-xs text-slate-600 font-medium">Non-Compliant</p>
              <p className={`text-lg font-light ${readinessData.check3.sealedWithoutMinAudit > 0 ? 'text-red-900' : 'text-slate-900'}`}>
                {readinessData.check3.sealedWithoutMinAudit}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2">{readinessData.check3.details}</p>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card className="bg-slate-50/30 border-slate-200">
        <CardHeader>
          <CardTitle className="text-sm text-slate-900">Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-600 font-medium">Total Evidence</p>
            <p className="text-lg font-light text-slate-900">{readinessData.total_evidence}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 font-medium">Provenance Complete</p>
            <p className="text-lg font-light text-slate-900">{readinessData.complete_evidence}</p>
          </div>
        </CardContent>
      </Card>

      {!allChecksPassed && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">Run automated remediation above or fix issues manually before deployment.</p>
        </div>
      )}
    </div>
  );
}