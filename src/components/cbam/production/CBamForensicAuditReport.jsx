/**
 * CBAM FORENSIC AUDIT REPORT
 * Regulator-grade backend code inspection
 * Date: 2026-01-20 | Classification: CRITICAL FINDINGS
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, XCircle, AlertCircle, Shield } from 'lucide-react';

export default function CBamForensicAuditReport() {
  const [expandedSection, setExpandedSection] = useState(null);

  const criticalFindings = [
    {
      id: 'CBAM-001',
      severity: 'CRITICAL',
      title: 'Hardcoded Validation Status Bypass',
      function: 'cbamAutoCalculateOnCreate.js:88',
      finding: "Sets 'validation_status: validated' without actual validation. Entries marked VALID without passing validation gate.",
      impact: 'Non-compliant entries may be reported',
      regulation: 'C(2025) 8150 Art. 3',
      remediation: 'Remove hardcoded status. Use pending → wait for CBAMValidationService result.'
    },
    {
      id: 'CBAM-002',
      severity: 'CRITICAL',
      title: 'AI-Validated Hardcode in Batch Operation',
      function: 'cbamBatchRecalculate.js:84',
      finding: "Sets 'validation_status: ai_validated' without human or regulatory approval. Service role silently overwrites 0-emission entries.",
      impact: 'Silent recalculation of entries. Audit trail missing. No user approval.',
      regulation: 'Reg 2023/956 Art. 35 (Audit Trail)',
      remediation: 'Remove hardcoded status. Call AuditTrailService. Require explicit approval before batch writes.'
    },
    {
      id: 'CBAM-003',
      severity: 'CRITICAL',
      title: 'Precursor Year Alignment Check Timing',
      function: 'cbamCalculationEngine.js:189 + validatePrecursorYears.js',
      finding: 'Calculation engine fetches precursors automatically via service role. Year alignment check runs afterward (defensive but late). Precursor CNs auto-selected without year validation.',
      impact: 'Precursor year mismatch may pass calculation → fails validation later. Data inconsistency.',
      regulation: 'CBAM Art. 14(2) – Precursor year alignment',
      remediation: 'Precursor year validation MUST run before calculation. Block calculation if year mismatch detected.'
    },
    {
      id: 'CBAM-004',
      severity: 'CRITICAL',
      title: 'Missing Audit Trail for Auto-Calculate',
      function: 'cbamAutoCalculateOnCreate.js',
      finding: 'No AuditTrailService.log() call. Entry calculations performed without audit record. Cannot trace who triggered or what changed.',
      impact: 'Regulatory non-compliance. Cannot defend calculation origin in audit.',
      regulation: 'Reg 2023/956 Art. 35 (Immutable Audit Trail)',
      remediation: 'Add AuditTrailService.log() for every entry update.'
    },
    {
      id: 'CBAM-005',
      severity: 'CRITICAL',
      title: 'Missing Audit Trail for Batch Recalculate',
      function: 'cbamBatchRecalculate.js',
      finding: 'Silently overwrites entries without AuditTrailService logging. No regulatory reference. No traceability.',
      impact: 'Complete audit trail gap. Batch operations invisible to compliance.',
      regulation: 'Reg 2023/956 Art. 35',
      remediation: 'Log each entry update to AuditTrailService with regulatory reference.'
    },
    {
      id: 'CBAM-006',
      severity: 'HIGH',
      title: 'No Lifecycle State Machine Enforcement',
      function: 'All calculation functions',
      finding: 'Calculation engine allows writes on entries in ANY state (CN_CODE_CHANGE_PENDING, BLOCKED, etc.). No state checking before write.',
      impact: 'Frozen entries may be silently recalculated. Lifecycle isolation violated.',
      regulation: 'Lifecycle Architecture (Go-Live Requirements)',
      remediation: 'Check entry.validation_status. Block calculation if status is BLOCKED or CHANGE_PENDING.'
    },
    {
      id: 'CBAM-007',
      severity: 'HIGH',
      title: 'Tenant Isolation Not Enforced in Precursor Fetch',
      function: 'cbamCalculationEngine.js:189',
      finding: "Fetches CBAMPrecursor via asServiceRole without tenant_id filter. May leak precursor data across tenants.",
      impact: 'Cross-tenant data visibility. Regulatory risk.',
      regulation: 'GDPR Art. 32 (Data Isolation)',
      remediation: 'Add tenant_id filter to CBAMPrecursor query.'
    },
    {
      id: 'CBAM-008',
      severity: 'HIGH',
      title: 'Case Sensitivity Bug in Calculation Method',
      function: 'cbamAutoCalculateOnCreate.js:61 + cbamEntryValidator.js:56',
      finding: "Auto-calc sends 'Default_values' (capital D), validator checks 'Default_values'. But cbamCalculationEngine.js line 145 checks 'actual_values' || 'EU_method'. Mismatch in field names.",
      impact: 'Calculation method not recognized. Falls back to wrong default.',
      regulation: 'Data Quality (C(2025) 8151)',
      remediation: 'Standardize to lowercase: default_values, actual_values everywhere.'
    },
    {
      id: 'CBAM-009',
      severity: 'HIGH',
      title: 'No Regulatory Version Tracking',
      function: 'cbamAutoCalculateOnCreate.js',
      finding: 'Entry updated without storing regulatory_version_id. Cannot track which regulation version was used for calculation.',
      impact: 'Recalculation ambiguity. Cannot apply new regulatory versions retrospectively.',
      regulation: 'C(2025) 8150 (Version Control)',
      remediation: 'Store regulatory_version_id in entry update. Default to CBAM-2026-v1 if not provided.'
    },
    {
      id: 'CBAM-010',
      severity: 'MEDIUM',
      title: 'Precursor Auto-Fetch Without Production Route Validation',
      function: 'cbamCalculationEngine.js:194-195',
      finding: "Filters precursors by 'production_route_applicable'. But if route is null or mismatched, falls through silently. May select wrong precursor emission factors.",
      impact: 'Incorrect precursor emissions in final calculation.',
      regulation: 'C(2025) 8151 Art. 13 (Precursor Selection)',
      remediation: 'Require route to be set before precursor auto-fetch. Error if ambiguous.'
    }
  ];

  const auditCheckpoints = [
    { phase: 'Entry Create', check: 'Lifecycle state set to PENDING_CALCULATION', status: 'FAIL', ref: 'No state machine' },
    { phase: 'Auto-Calculate', check: 'AuditTrailService.log invoked', status: 'FAIL', ref: 'Line 88 missing log' },
    { phase: 'Auto-Calculate', check: 'Validation status remains pending', status: 'FAIL', ref: 'Hardcoded validated' },
    { phase: 'Precursor Year Check', check: 'Runs BEFORE calculation', status: 'FAIL', ref: 'Runs after calc' },
    { phase: 'Validation', check: 'Entry state must be PENDING_VALIDATION', status: 'FAIL', ref: 'No state check' },
    { phase: 'Validation', check: 'Audit trail logged', status: 'PASS', ref: 'CBAMValidationService' },
    { phase: 'Batch Recalc', check: 'Each entry logged individually', status: 'FAIL', ref: 'No logging' },
    { phase: 'Batch Recalc', check: 'Entry state checked before update', status: 'FAIL', ref: 'No state check' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="border-b border-red-900/50 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-light tracking-tight text-white mb-2">
                CBAM Forensic Audit Report
              </h1>
              <p className="text-slate-400 text-sm">
                Regulator-Grade Backend Code Inspection | Classification: CRITICAL FINDINGS
              </p>
            </div>
            <div className="text-right">
              <Badge className="bg-red-900 text-red-100 mb-2">10 FINDINGS</Badge>
              <p className="text-xs text-slate-500">2026-01-20</p>
            </div>
          </div>
        </div>

        {/* EXECUTIVE SUMMARY */}
        <Alert className="border-red-800 bg-red-950/30">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-200 text-sm">
            <strong>CRITICAL ISSUES FOUND:</strong> Hardcoded validation status bypasses validation gate. 
            Batch operations lack audit trails. Precursor year alignment checked too late. 
            No lifecycle state enforcement. These findings MUST be remediated before production deployment.
          </AlertDescription>
        </Alert>

        {/* CRITICAL FINDINGS */}
        <div className="space-y-4">
          <h2 className="text-xl font-light text-white tracking-tight">Critical & High-Severity Findings</h2>
          
          {criticalFindings.map((finding) => (
            <Card
              key={finding.id}
              className={`border-l-4 ${
                finding.severity === 'CRITICAL'
                  ? 'border-l-red-600 bg-red-950/20'
                  : 'border-l-amber-600 bg-amber-950/20'
              } cursor-pointer hover:bg-opacity-40 transition-colors`}
              onClick={() =>
                setExpandedSection(
                  expandedSection === finding.id ? null : finding.id
                )
              }
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={
                          finding.severity === 'CRITICAL'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {finding.severity}
                      </Badge>
                      <code className="text-xs bg-slate-950 px-2 py-1 rounded text-slate-300">
                        {finding.id}
                      </code>
                    </div>
                    <h3 className="text-sm font-semibold text-white">
                      {finding.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      <strong>Function:</strong> {finding.function}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-slate-500">{finding.regulation}</p>
                  </div>
                </div>
              </CardHeader>

              {expandedSection === finding.id && (
                <CardContent className="space-y-3 border-t border-slate-700 pt-4">
                  <div>
                    <p className="text-xs text-slate-300 font-semibold mb-1">
                      FINDING:
                    </p>
                    <p className="text-sm text-slate-300">
                      {finding.finding}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-300 font-semibold mb-1">
                      IMPACT:
                    </p>
                    <p className="text-sm text-red-300">
                      {finding.impact}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-300 font-semibold mb-1">
                      REMEDIATION:
                    </p>
                    <p className="text-sm text-emerald-300">
                      {finding.remediation}
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* AUDIT CHECKPOINT MATRIX */}
        <Card className="border-slate-700 bg-slate-950">
          <CardHeader>
            <h3 className="text-lg font-light text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-400" />
              Compliance Checkpoint Matrix
            </h3>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-2 text-slate-400">Phase</th>
                    <th className="text-left py-2 px-2 text-slate-400">Checkpoint</th>
                    <th className="text-center py-2 px-2 text-slate-400">Status</th>
                    <th className="text-left py-2 px-2 text-slate-400">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {auditCheckpoints.map((checkpoint, idx) => (
                    <tr key={idx} className="border-b border-slate-800">
                      <td className="py-2 px-2 text-slate-300">
                        {checkpoint.phase}
                      </td>
                      <td className="py-2 px-2 text-slate-400">
                        {checkpoint.check}
                      </td>
                      <td className="text-center py-2 px-2">
                        {checkpoint.status === 'PASS' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                        )}
                      </td>
                      <td className="py-2 px-2 text-slate-500 font-mono text-xs">
                        {checkpoint.ref}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* REMEDIATION PRIORITY */}
        <Card className="border-emerald-800 bg-emerald-950/20">
          <CardHeader>
            <h3 className="text-lg font-light text-emerald-100 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Remediation Priority (Sequential)
            </h3>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              <li className="text-emerald-200">
                <strong>1. IMMEDIATE:</strong> Add AuditTrailService.log() to
                cbamAutoCalculateOnCreate.js and cbamBatchRecalculate.js
              </li>
              <li className="text-emerald-200">
                <strong>2. IMMEDIATE:</strong> Remove hardcoded validation_status.
                Set to 'pending' until validation passes.
              </li>
              <li className="text-emerald-200">
                <strong>3. HIGH:</strong> Add lifecycle state checking. Block writes
                if entry.validation_status is BLOCKED or CHANGE_PENDING.
              </li>
              <li className="text-emerald-200">
                <strong>4. HIGH:</strong> Move precursor year validation BEFORE
                calculation engine. Fail fast on mismatch.
              </li>
              <li className="text-emerald-200">
                <strong>5. HIGH:</strong> Add tenant_id filter to precursor
                queries.
              </li>
              <li className="text-emerald-200">
                <strong>6. MEDIUM:</strong> Standardize calculation_method field
                names (default_values vs Default_values).
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* FOOTER */}
        <div className="text-center text-xs text-slate-500 border-t border-slate-800 pt-6">
          <p>
            This forensic audit is binding. Deployment cannot proceed until all CRITICAL findings are remediated.
          </p>
        </div>
      </div>
    </div>
  );
}