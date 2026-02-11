import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Contract1ProofView from './Contract1ProofView';

/**
 * DEVELOPER CONSOLE — TWO INDEPENDENT PANELS + DATA SOURCE BANNER
 * 
 * Panel A: Contract 1 Ledger Compliance (evidence_status only, provenance complete)
 * Panel B: Pipeline Health (processing_status only)
 * 
 * Version stamping: contract_version, backend_build_id, snapshot timestamp
 * Data source: LIVE | DEMO | TEST based on created_via and tenant context
 */

export default function DeveloperConsoleRefactored() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentTenant, setCurrentTenant] = useState('PRODUCTION');

  // Fetch all evidence for analysis
  const { data: evidenceData, isLoading, refetch } = useQuery({
    queryKey: ['evidenceAnalysis', refreshKey],
    queryFn: async () => {
      try {
        const allEvidence = await base44.asServiceRole.entities.Evidence.list();
        
        // Filter: only include provenance_complete records for compliance metrics
        const completeEvidence = allEvidence.filter(e => !e.provenance_incomplete);
        
        // Count by created_via
        const testRunnerCount = allEvidence.filter(e => e.created_via === 'TEST_RUNNER').length;
        const seedCount = allEvidence.filter(e => e.created_via === 'SEED').length;
        
        // Determine data source
        let dataSource = 'LIVE';
        if (seedCount > 0) dataSource = 'DEMO';
        if (testRunnerCount > 0 && currentTenant !== 'PRODUCTION') dataSource = 'TEST';
        if (testRunnerCount > 0 && currentTenant === 'PRODUCTION') dataSource = 'MIXED (ERROR)';
        
        // Compliance metrics (provenance-complete only)
        const sealedCount = completeEvidence.filter(e => e.evidence_status === 'SEALED').length;
        const ingestedCount = completeEvidence.filter(e => e.evidence_status === 'INGESTED').length;
        const rejectedCount = completeEvidence.filter(e => e.evidence_status === 'REJECTED').length;
        const failedCount = completeEvidence.filter(e => e.evidence_status === 'FAILED').length;
        const supersededCount = completeEvidence.filter(e => e.evidence_status === 'SUPERSEDED').length;
        
        // Forbidden states (blocker)
        const forbiddenStates = ['RAW', 'CLASSIFIED', 'STRUCTURED', null, undefined];
        const forbiddenCount = completeEvidence.filter(e => forbiddenStates.includes(e.evidence_status)).length;
        
        // Not sealed (informational)
        const notSealedCount = completeEvidence.filter(e => 
          ['INGESTED', 'REJECTED', 'FAILED', 'SUPERSEDED'].includes(e.evidence_status)
        ).length;
        
        // Pipeline counts
        const rawCount = allEvidence.filter(e => e.processing_status === 'RAW').length;
        const classifiedCount = allEvidence.filter(e => e.processing_status === 'CLASSIFIED').length;
        const structuredCount = allEvidence.filter(e => e.processing_status === 'STRUCTURED').length;
        const noneCount = allEvidence.filter(e => e.processing_status === 'NONE').length;

        // Violations (only on completeEvidence)
        const violations = [];
        for (const evidence of completeEvidence) {
          if (forbiddenStates.includes(evidence.evidence_status)) {
            violations.push(`${evidence.evidence_id}: forbidden state (${evidence.evidence_status || 'NULL'})`);
          }
          if (evidence.evidence_status === 'SEALED' && !evidence.payload_hash_sha256) {
            violations.push(`${evidence.evidence_id}: SEALED without payload_hash_sha256`);
          }
          if (evidence.evidence_status === 'SEALED' && !evidence.metadata_hash_sha256) {
            violations.push(`${evidence.evidence_id}: SEALED without metadata_hash_sha256`);
          }
          if (evidence.evidence_status === 'SEALED' && evidence.audit_event_count === 0) {
            violations.push(`${evidence.evidence_id}: SEALED without audit events`);
          }
        }
        
        // Incomplete provenance warnings
        const incompleteProvenance = allEvidence.filter(e => e.provenance_incomplete);
        if (incompleteProvenance.length > 0) {
          violations.push(`${incompleteProvenance.length} records excluded (incomplete provenance)`);
        }

        const compliancePercent = completeEvidence.length > 0 
          ? Math.round((sealedCount / completeEvidence.length) * 100) 
          : 0;

        return {
          timestamp: new Date().toISOString(),
          contract_version: 'CONTRACT_1_V3',
          backend_build_id: 'build-' + Math.random().toString(36).substring(7),
          data_source: dataSource,
          is_production_tenant: currentTenant === 'PRODUCTION',
          
          // Ledger (provenance-complete only)
          ledger: {
            total_complete: completeEvidence.length,
            total_with_incomplete: allEvidence.length,
            sealed: sealedCount,
            ingested: ingestedCount,
            rejected: rejectedCount,
            failed: failedCount,
            superseded: supersededCount,
            forbidden_states: forbiddenCount,
            not_sealed: notSealedCount,
            compliance_percent: compliancePercent,
            violations: violations
          },
          
          // Provenance
          provenance: {
            test_runner: testRunnerCount,
            seed: seedCount,
            incomplete: incompleteProvenance.length
          },
          
          // Pipeline
          pipeline: {
            raw: rawCount,
            classified: classifiedCount,
            structured: structuredCount,
            none: noneCount
          }
        };
      } catch (error) {
        throw error;
      }
    },
    refetchInterval: null,
    staleTime: 0
  });

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Data Source Banner */}
      {evidenceData && (
        <div className={`rounded-lg p-3 flex items-center justify-between text-sm border ${
          evidenceData.data_source === 'LIVE' ? 'bg-green-50 border-green-200 text-green-900' :
          evidenceData.data_source === 'DEMO' ? 'bg-amber-50 border-amber-200 text-amber-900' :
          evidenceData.data_source === 'TEST' ? 'bg-blue-50 border-blue-200 text-blue-900' :
          'bg-red-50 border-red-200 text-red-900'
        }`}>
          <span className="font-medium">
            📊 Data Source: <strong>{evidenceData.data_source}</strong>
          </span>
          {evidenceData.data_source === 'MIXED (ERROR)' && (
            <span className="text-xs font-semibold">⚠️ Test evidence in production tenant</span>
          )}
        </div>
      )}

      {/* Header with versioning */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-slate-900">Developer Console</h1>
          {evidenceData && (
            <p className="text-xs text-slate-500 mt-1">
              {evidenceData.contract_version} • {evidenceData.backend_build_id} • {new Date(evidenceData.timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-white/50 backdrop-blur-sm">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="proof">Proof View</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL A: CONTRACT 1 LEDGER COMPLIANCE */}
        <Card className="bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl border border-white/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {evidenceData?.ledger.violations.length === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              Contract 1 Ledger Compliance
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-sm text-slate-600">Loading...</p>
            ) : (
              <>
                {/* Summary metrics */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded p-3 border border-slate-200">
                    <p className="text-xs text-slate-600 font-medium">Total Records</p>
                    <p className="text-2xl font-light text-slate-900 mt-1">{evidenceData?.ledger.total_complete || 0}</p>
                  </div>
                  <div className="bg-green-50 rounded p-3 border border-green-200">
                    <p className="text-xs text-green-700 font-medium">Sealed</p>
                    <p className="text-2xl font-light text-green-900 mt-1">{evidenceData?.ledger.sealed || 0}</p>
                  </div>
                  <div className="bg-slate-50 rounded p-3 border border-slate-200">
                    <p className="text-xs text-slate-600 font-medium">Compliance</p>
                    <p className="text-2xl font-light text-slate-900 mt-1">{evidenceData?.ledger.compliance_percent || 0}%</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-600 font-medium">Ledger States</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <Badge variant="outline">INGESTED: {evidenceData?.ledger.ingested}</Badge>
                      <Badge variant="outline">REJECTED: {evidenceData?.ledger.rejected}</Badge>
                      <Badge variant="outline">FAILED: {evidenceData?.ledger.failed}</Badge>
                      <Badge variant="outline">SUPERSEDED: {evidenceData?.ledger.superseded}</Badge>
                    </div>
                  </div>
                </div>

                {/* Violations & Warnings */}
                <div className="space-y-2">
                  {evidenceData?.ledger.forbidden_states > 0 && (
                    <div className="bg-red-50/50 border border-red-200 rounded p-3">
                      <p className="text-xs font-semibold text-red-900">🚫 Forbidden States (Compliance Blocker): {evidenceData.ledger.forbidden_states}</p>
                      <p className="text-xs text-red-800 mt-1">Records in RAW, CLASSIFIED, STRUCTURED, or NULL state must be normalized</p>
                    </div>
                  )}
                  
                  {evidenceData?.ledger.not_sealed > 0 && (
                    <div className="bg-amber-50/50 border border-amber-200 rounded p-3">
                      <p className="text-xs font-semibold text-amber-900">ℹ️ Not Sealed (Informational): {evidenceData.ledger.not_sealed}</p>
                      <p className="text-xs text-amber-800 mt-1">INGESTED, REJECTED, FAILED, or SUPERSEDED — not yet in final state</p>
                    </div>
                  )}
                  
                  {evidenceData?.provenance.incomplete > 0 && (
                    <div className="bg-orange-50/50 border border-orange-200 rounded p-3">
                      <p className="text-xs font-semibold text-orange-900">⚠️ Incomplete Provenance: {evidenceData.provenance.incomplete}</p>
                      <p className="text-xs text-orange-800 mt-1">Excluded from compliance metrics</p>
                    </div>
                  )}
                  
                  {evidenceData?.ledger.violations.length > 0 && (
                    <div className="bg-red-50/50 border border-red-200 rounded p-3">
                      <p className="text-xs font-semibold text-red-900 mb-1">Critical Violations</p>
                      <ul className="space-y-0.5 text-xs text-red-800">
                        {evidenceData.ledger.violations.map((v, i) => (
                          <li key={i}>• {v}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {evidenceData?.ledger.violations.length === 0 && evidenceData?.ledger.forbidden_states === 0 && (
                    <div className="bg-green-50/50 border border-green-200 rounded p-3">
                      <p className="text-xs text-green-900">✓ No critical violations</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* PANEL B: PIPELINE HEALTH */}
        <Card className="bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl border border-white/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Pipeline Health
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-sm text-slate-600">Loading...</p>
            ) : (
              <>
                <p className="text-xs text-slate-600 italic">Data classification status (independent from Contract 1)</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded p-3 border border-slate-200">
                    <p className="text-xs text-slate-600 font-medium">RAW</p>
                    <p className="text-2xl font-light text-slate-900 mt-1">{evidenceData?.pipeline.raw || 0}</p>
                  </div>
                  <div className="bg-blue-50 rounded p-3 border border-blue-200">
                    <p className="text-xs text-blue-700 font-medium">CLASSIFIED</p>
                    <p className="text-2xl font-light text-blue-900 mt-1">{evidenceData?.pipeline.classified || 0}</p>
                  </div>
                  <div className="bg-green-50 rounded p-3 border border-green-200">
                    <p className="text-xs text-green-700 font-medium">STRUCTURED</p>
                    <p className="text-2xl font-light text-green-900 mt-1">{evidenceData?.pipeline.structured || 0}</p>
                  </div>
                  <div className="bg-slate-50 rounded p-3 border border-slate-200">
                    <p className="text-xs text-slate-600 font-medium">NONE</p>
                    <p className="text-2xl font-light text-slate-900 mt-1">{evidenceData?.pipeline.none || 0}</p>
                  </div>
                </div>

                <div className="bg-blue-50/50 border border-blue-200 rounded p-3">
                  <p className="text-xs text-blue-900">
                    ℹ Processing states do not affect Contract 1 compliance. They reflect data maturity in the pipeline.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="proof">
          <Contract1ProofView />
        </TabsContent>
      </Tabs>
    </div>
  );
}