import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, XCircle, Lock, AlertTriangle, ChevronRight
} from "lucide-react";

/**
 * CONTRACT 1 VALIDATION GATE
 * 
 * Final compliance gate - evidence cannot be marked compliant 
 * unless ALL non-negotiables pass. No false greens.
 * 
 * Non-negotiables:
 * 1. sealed_count >= 1 (FAIL if < 1)
 * 2. audit_events >= sealed_count (ERROR if sealed = 0, else FAIL if insufficient)
 * 3. No CLASSIFIED/STRUCTURED states
 * 4. All SEALED have required metadata (ERROR if sealed = 0)
 * 5. Tenant isolation enforced (real test)
 */

export default function Contract1ValidationGate({ onOpenConsole }) {
  const { data: evidenceRecords = [] } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => base44.entities.Evidence.list('-created_at_utc')
  });

  const { data: auditEvents = [] } = useQuery({
    queryKey: ['evidence-audit'],
    queryFn: () => base44.entities.EvidenceAuditEvent.list('-timestamp_utc')
  });

  const { data: tenantTestResult = null } = useQuery({
    queryKey: ['tenant-isolation-test'],
    queryFn: async () => {
      const response = await base44.functions.invoke('testTenantIsolation', {});
      return response.data;
    },
    retry: 1
  });

  // Filter: sealed = state SEALED, failed = state FAILED
  const sealedEvidence = evidenceRecords.filter(e => e.state === 'SEALED');
  const failedEvidence = evidenceRecords.filter(e => e.state === 'FAILED');
  const nonCompliantStates = evidenceRecords.filter(e => ['CLASSIFIED', 'STRUCTURED'].includes(e.state));
  const auditTrailCount = auditEvents.length;

  // === CHECK 1: Sealed Evidence Count ===
  const sealedCountCheck = {
    id: 'sealed-count',
    name: 'Sealed Evidence Count',
    description: 'At least 1 sealed evidence record must exist',
    status: sealedEvidence.length >= 1 ? 'PASS' : 'FAIL',
    detail: `${sealedEvidence.length} sealed records (required: ≥1)`,
    passed: sealedEvidence.length >= 1
  };

  // === CHECK 2: Audit Trail Coverage ===
  const auditTrailCheck = (() => {
    if (sealedEvidence.length === 0) {
      return {
        id: 'audit-coverage',
        name: 'Audit Trail Coverage',
        description: 'Audit events must cover all sealed evidence',
        status: 'ERROR',
        detail: 'Cannot validate: 0 sealed records exist',
        passed: false
      };
    }
    return {
      id: 'audit-coverage',
      name: 'Audit Trail Coverage',
      description: `${auditTrailCount} audit events must be ≥ ${sealedEvidence.length} sealed records`,
      status: auditTrailCount >= sealedEvidence.length ? 'PASS' : 'FAIL',
      detail: `${auditTrailCount} audit events, ${sealedEvidence.length} sealed (required: audit ≥ sealed)`,
      passed: auditTrailCount >= sealedEvidence.length
    };
  })();

  // === CHECK 3: No Non-Contract States ===
  const noNonContractCheck = {
    id: 'no-non-contract-states',
    name: 'No Non-Contract States',
    description: 'No evidence in CLASSIFIED or STRUCTURED states',
    status: nonCompliantStates.length === 0 ? 'PASS' : 'FAIL',
    detail: `Non-contract states: ${nonCompliantStates.length} (required: 0)`,
    passed: nonCompliantStates.length === 0
  };

  // === CHECK 4: Required Metadata Present ===
  const requiredMetadataCheck = (() => {
    if (sealedEvidence.length === 0) {
      return {
        id: 'required-metadata',
        name: 'Required Metadata Present',
        description: 'All SEALED evidence must have required declaration fields',
        status: 'ERROR',
        detail: 'Cannot validate: 0 sealed records exist',
        passed: false
      };
    }
    
    const completeRecords = sealedEvidence.filter(e => 
      e.ingestion_method && 
      e.dataset_type && 
      e.source_system && 
      e.declared_scope && 
      e.declared_intent &&
      e.retention_policy &&
      e.personal_data_present !== undefined &&
      e.intended_consumers?.length > 0 &&
      e.payload_hash_sha256 &&
      e.metadata_hash_sha256
    );

    return {
      id: 'required-metadata',
      name: 'Required Metadata Present',
      description: 'All SEALED evidence must have required declaration fields',
      status: completeRecords.length === sealedEvidence.length ? 'PASS' : 'FAIL',
      detail: `${completeRecords.length}/${sealedEvidence.length} complete (required: all)`,
      passed: completeRecords.length === sealedEvidence.length
    };
  })();

  // === CHECK 5: Tenant Isolation Enforced (REAL TEST) ===
  const tenantIsolationCheck = {
    id: 'tenant-isolation',
    name: 'Tenant Isolation Enforced',
    description: 'Cross-tenant read access is blocked (fixture test)',
    status: tenantTestResult?.status === 'PASSED' ? 'PASS' : (tenantTestResult?.status === 'ERROR' ? 'ERROR' : 'FAIL'),
    detail: tenantTestResult 
      ? `Test status: ${tenantTestResult.status}. Result: ${tenantTestResult.result}`
      : 'Running isolation test...',
    passed: tenantTestResult?.status === 'PASSED'
  };

  const checks = [
    sealedCountCheck,
    auditTrailCheck,
    noNonContractCheck,
    requiredMetadataCheck,
    tenantIsolationCheck
  ];

  const allPassed = checks.every(check => check.passed);
  const failedChecks = checks.filter(check => !check.passed);

  return (
    <Card className="bg-gradient-to-br from-slate-900/5 via-white/50 to-[#86b027]/5 backdrop-blur-xl border border-white/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {allPassed ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          )}
          Contract 1 Compliance Gate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-5 gap-2">
          {checks.map(check => (
            <div key={check.id} className={`rounded p-3 border text-center ${
              check.status === 'PASS' ? 'bg-green-50 border-green-200' :
              check.status === 'FAIL' ? 'bg-red-50 border-red-200' :
              'bg-amber-50 border-amber-200'
            }`}>
              <p className="text-xs font-medium text-slate-600">{check.name}</p>
              <p className={`text-sm font-bold mt-1 ${
                check.status === 'PASS' ? 'text-green-900' :
                check.status === 'FAIL' ? 'text-red-900' :
                'text-amber-900'
              }`}>{check.status}</p>
            </div>
          ))}
        </div>
        
        {failedChecks.length > 0 && (
          <div className="bg-red-50/50 border border-red-200 rounded p-3">
            <p className="text-xs font-semibold text-red-900 mb-2">Failed Checks:</p>
            <ul className="space-y-1">
              {failedChecks.map(check => (
                <li key={check.id} className="text-xs text-red-800">
                  <strong>{check.name}:</strong> {check.detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        {allPassed && (
          <div className="bg-green-50/50 border border-green-200 rounded p-3">
            <p className="text-xs text-green-900">✓ All non-negotiables PASS</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}