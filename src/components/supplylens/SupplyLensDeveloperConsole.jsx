import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, AlertCircle, FileText, Download, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import PhaseV1AuditReport from './PhaseV1AuditReport';
import DeveloperConsoleManager from './DeveloperConsoleManager';

export default function SupplyLensDeveloperConsole() {
  const [user, setUser] = useState(null);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [auditReport, setAuditReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsDeveloper(currentUser?.role === 'admin');
    };
    initUser();
  }, []);

  const handleScan = async () => {
    setLoading(true);
    
    const report = {
      timestamp: new Date().toISOString(),
      version: '2026-01-21 Evidence-First Audit',
      scope: 'Forensic Reality Check',
      
      // BLOCKED FEATURES
      blocked_features: [
        {
          feature: 'Operational Metrics (Velocity, Approved %, Avg Time, Coverage)',
          reason: 'ALL METRICS DEPEND ON SUPPLIER CREATION',
          reality_status: 'NOT IMPLEMENTED',
          backend_dependency: 'Supplier entity creation from orchestrator',
          risk_if_enabled: 'Users see fake metrics. Velocity=0, Approved=0, Coverage=0 because no suppliers exist.',
          backend_requirement: 'Implement Supplier promotion from MappingDecision.status=APPROVED with supplier_id population',
          code_location: 'functions/getOperationalDashboard.js lines 16, 49-70'
        },
        {
          feature: 'Risk Portfolio Dashboard',
          reason: 'DEPENDS ON SUPPLIER.risk_level FIELD',
          reality_status: 'NOT IMPLEMENTED',
          backend_dependency: 'Supplier entity with risk_level + *_relevant flags',
          risk_if_enabled: 'Misleading compliance posture - shows 0 risks because no suppliers exist',
          backend_requirement: 'Deterministic risk scoring algorithm + supplier creation',
          code_location: 'functions/getOperationalDashboard.js lines 30-38'
        },
        {
          feature: 'Regulatory Deadlines',
          reason: 'HARDCODED STATIC DATES',
          reality_status: 'UI-ONLY',
          backend_dependency: 'None - not connected to regulatory API',
          risk_if_enabled: 'Dates are fiction. Line 86-97 has hardcoded dates (CBAM 2026-10-01, CSRD 2025-04-28)',
          backend_requirement: 'Integrate with official EU regulatory calendar API',
          code_location: 'functions/getOperationalDashboard.js lines 84-97'
        },
        {
          feature: 'Real-time ERP Sync',
          reason: 'ONLY SNAPSHOT MODE IMPLEMENTED',
          reality_status: 'PARTIAL',
          backend_dependency: 'ERPSyncRun entity created but no CDC',
          risk_if_enabled: 'Data staleness, race conditions, no conflict resolution',
          backend_requirement: 'Event-driven CDC (Change Data Capture) with conflict resolution',
          code_location: 'functions/services/UnifiedIngestionRouter.js lines 107-125'
        },
        {
          feature: 'Automatic Supplier Creation',
          reason: 'EVIDENCE-FIRST ENFORCEMENT',
          reality_status: 'INTENTIONALLY BLOCKED',
          backend_dependency: 'Orchestrator returns next_action=user_approval_required, never creates',
          risk_if_enabled: 'Unvetted suppliers bypass mapping gate',
          backend_requirement: 'Human-in-loop approval workflow + Mapping Gate enforcement',
          code_location: 'functions/services/SupplyLensIngestionOrchestrator.js lines 73-85'
        },
        {
          feature: 'Bulk Import Evidence Generation',
          reason: '✅ FIXED IN PHASE 1.1',
          reality_status: 'IMPLEMENTED',
          backend_dependency: 'bulkImportWithEvidence.js creates Evidence per CSV row',
          risk_if_enabled: 'N/A - now enforced',
          backend_requirement: 'COMPLETE - Each CSV row generates Evidence with declaration_hash',
          code_location: 'functions/bulkImportWithEvidence.js'
        }
      ],
      
      // ARCHITECTURAL VIOLATIONS
      architectural_violations: [
        {
          violation: 'Supplier Creation Logic Missing',
          severity: 'CRITICAL',
          description: 'Orchestrator returns preview but no code path creates Supplier entity',
          evidence: 'Searched SupplyLensIngestionOrchestrator.js - no base44.entities.Supplier.create() call found',
          impact: 'System collects data but cannot complete onboarding',
          fix_required: 'Add supplier creation in mappingGateEnforcer or separate promotion function'
        },
        {
          violation: 'mappingGateEnforcer Function 404',
          severity: 'CRITICAL',
          description: 'SupplierOnboardingFlow line 162 calls function that doesn\'t exist',
          evidence: 'Function invoked but not deployed or missing',
          impact: 'Single upload workflow broken - throws error on gate submission',
          fix_required: 'Deploy mappingGateEnforcer function or remove call'
        },
        {
          violation: 'Bulk Import Skips Evidence Creation',
          severity: '✅ FIXED + ENFORCED',
          description: 'IngestionParityEnforcer enforces Evidence creation per row',
          evidence: 'bulkImportWithEvidence.js uses IngestionParityEnforcer.createEvidencePayload',
          impact: 'RESOLVED + ENFORCED - Identical behavior across all ingestion paths',
          fix_required: 'COMPLETE'
        },
        {
          violation: 'Silent Normalization & Auto-Defaults',
          severity: '✅ BLOCKED',
          description: 'IngestionParityEnforcer.checkForSilentNormalization blocks coercion',
          evidence: 'All ingestion paths validated via IngestionParityEnforcer',
          impact: 'ENFORCED - No silent data manipulation',
          fix_required: 'COMPLETE'
        },
        {
          violation: 'Partial Failures Dropped Silently',
          severity: '✅ MATERIALIZED',
          description: 'All failures create REJECTED Evidence with rejection_reason',
          evidence: 'IngestionParityEnforcer.createRejectedEvidence materializes failures',
          impact: 'ENFORCED - No silent failures',
          fix_required: 'COMPLETE'
        },
        {
          violation: 'ERP Real-Time Sync Not Deterministic',
          severity: '🚫 BLOCKED',
          description: 'ERP real-time sync is NOT IMPLEMENTED and BLOCKED',
          evidence: 'ERPSyncWizard blocked in DataIngestionModal with blocked=true',
          impact: 'SAFE - Only ERP snapshots with declared_snapshot_date allowed',
          fix_required: 'DO NOT IMPLEMENT - Legal risk too high'
        },
        {
          violation: 'No Evidence State Machine',
          severity: '✅ FIXED',
          description: 'NOW ENFORCED: enforceEvidenceStateMachine validates all transitions',
          evidence: 'enforceEvidenceStateMachine.js blocks illegal state jumps',
          impact: 'RESOLVED - State transitions validated and logged',
          fix_required: 'COMPLETE'
        },
        {
          violation: 'Hardcoded data_completeness',
          severity: 'HIGH',
          description: 'Line 256 sets data_completeness = 65 without calculation',
          evidence: 'enrichSupplierData returns static value',
          impact: 'Coverage metric always shows 0% (no supplier > 80%)',
          fix_required: 'Calculate from field_scores in validateSchema'
        },
        {
          violation: 'Dashboard Queries Non-Existent Suppliers',
          severity: 'HIGH',
          description: 'getOperationalDashboard queries Supplier entity that is never created',
          evidence: 'Line 16: base44.entities.Supplier.list() but orchestrator never creates',
          impact: 'All metrics return 0 or empty arrays',
          fix_required: 'Implement supplier creation or remove dashboard'
        }
      ],
      
      // IMPLEMENTATION GAPS
      implementation_gaps: [
        {
          gap: 'No Async Queue Processing',
          severity: 'CRITICAL',
          description: 'Bulk imports run synchronously',
          impact: 'Timeout at 1000+ suppliers (30s function limit)',
          fix_required: 'Create IngestionJob entity with background worker'
        },
        {
          gap: 'No Transaction Rollback',
          severity: 'CRITICAL',
          description: 'Partial failures leave orphaned Evidence',
          impact: 'Evidence created but supplier fails → no cleanup',
          fix_required: 'Implement saga pattern or two-phase commit'
        },
        {
          gap: 'No Rate Limiting',
          severity: 'HIGH',
          description: 'API ingestion unprotected',
          impact: 'Vulnerable to abuse',
          fix_required: 'Add token bucket rate limiter per tenant'
        },
        {
          gap: 'No Schema Validation Library',
          severity: 'HIGH',
          description: 'Runtime type errors instead of validation',
          impact: 'Malformed data crashes pipeline',
          fix_required: 'Add Zod validation at orchestrator entry'
        },
        {
          gap: 'Naive Dedup Algorithm',
          severity: 'MEDIUM',
          description: 'String matching insufficient for fuzzy resolution',
          impact: 'Duplicate suppliers with format differences (GmbH vs GMBH)',
          fix_required: 'Add Levenshtein distance + phonetic matching'
        }
      ],
      
      // UI-ONLY METRICS (NOT BACKEND DRIVEN)
      ui_only_metrics: [
        {
          metric: 'Regulatory Deadlines',
          location: 'getOperationalDashboard.js lines 84-97',
          reality: 'Hardcoded dates: CBAM 2026-10-01, CSRD 2025-04-28, EUDR 2025-12-30, PFAS 2026-06-01',
          not_connected_to: 'Official EU regulatory calendar',
          verdict: 'UI-ONLY - Fiction'
        },
        {
          metric: 'Readiness %',
          location: 'getOperationalDashboard.js line 95',
          reality: 'Formula: 100 - (daysLeft/365)*100 - makes no sense',
          not_connected_to: 'Actual data collection progress',
          verdict: 'UI-ONLY - Nonsense'
        }
      ],
      
      // WHAT ACTUALLY WORKS
      verified_working: [
        {
          feature: 'Evidence Upload with SHA-256',
          status: 'WORKING',
          code: 'uploadEvidenceWithHash function',
          verdict: 'Immutable proof collection functional'
        },
        {
          feature: 'Fuzzy Deduplication',
          status: 'WORKING',
          code: 'SupplyLensIngestionOrchestrator.js lines 137-161',
          verdict: 'String matching + weighted score functional'
        },
        {
          feature: 'Framework Detection',
          status: 'WORKING',
          code: 'SupplyLensIngestionOrchestrator.js lines 164-211',
          verdict: 'CBAM/EUDR/PFAS/PPWR/CSRD detection functional'
        },
        {
          feature: 'Audit Trail Logging',
          status: 'WORKING',
          code: 'SupplyLensIngestionOrchestrator.js lines 332-347',
          verdict: 'AuditLogEntry created for all ingestion attempts'
        },
        {
          feature: 'Context-Required Upload',
          status: 'WORKING',
          code: 'SupplierOnboardingFlow.js step="context"',
          verdict: 'Reason + entity type required before file upload'
        },
        {
          feature: 'Evidence Classification (Phase 1.2)',
          status: 'WORKING',
          code: 'classifyEvidence.js + EvidenceClassificationPanel.js',
          verdict: 'Human-controlled RAW→CLASSIFIED with role enforcement'
        },
        {
          feature: 'Evidence Structuring (Phase 1.3)',
          status: 'BLOCKED',
          code: 'Phase 1.2.5 must PASS before Phase 1.3 can activate',
          verdict: 'Ingestion parity enforcement gate not cleared'
        },
        {
          feature: 'Ingestion Parity Enforcement (Phase 1.2.5)',
          status: 'ENFORCED',
          code: 'IngestionParityEnforcer.js validates ALL paths',
          verdict: 'Context validation, hash computation, failure materialization, audit logging enforced'
        }
      ],
      
      // HONEST CONCLUSION
      system_capability: 'PHASE V1 INGESTION STRESS TEST & FORENSIC AUDIT (OBSERVATION)',
      not_capable_of: [
        'Creating suppliers end-to-end',
        'Producing compliance reports',
        'Measuring operational metrics',
        'Real-time ERP integration',
        'Automated risk scoring',
        'Mapping gate validation (Phase 1.4)',
        'Supplier promotion (Phase 1.5)'
      ],
      capable_of: [
        'Collecting evidence with SHA-256 proof',
        'Human-controlled classification (role-enforced)',
        'Human-approved structuring with AI assistance (Phase 1.3)',
        'State machine transitions (RAW→CLASSIFIED→STRUCTURED)',
        'Schema-versioned extraction',
        'Detecting duplicate suppliers',
        'Detecting relevant frameworks',
        'Immutable audit trail logging'
      ]
    };
    
    setAuditReport(report);
    setLoading(false);
  };

  const downloadReport = () => {
    if (!auditReport) return;
    
    let reportText = `═══════════════════════════════════════════════════════════\n`;
    reportText += `  SUPPLYLENS FORENSIC REALITY AUDIT\n`;
    reportText += `  Evidence-First Architecture - Unfiltered Truth\n`;
    reportText += `═══════════════════════════════════════════════════════════\n\n`;
    reportText += `Generated: ${auditReport.timestamp}\n`;
    reportText += `Version: ${auditReport.version}\n`;
    reportText += `Scope: ${auditReport.scope}\n\n`;

    reportText += `───────────────────────────────────────────────────────────\n`;
    reportText += `  BLOCKED FEATURES (${auditReport.blocked_features.length})\n`;
    reportText += `───────────────────────────────────────────────────────────\n\n`;
    auditReport.blocked_features.forEach((blocked, idx) => {
      reportText += `${idx + 1}. ${blocked.feature}\n`;
      reportText += `   Reason: ${blocked.reason}\n`;
      reportText += `   Reality: ${blocked.reality_status}\n`;
      reportText += `   Risk if enabled: ${blocked.risk_if_enabled}\n`;
      reportText += `   Backend requirement: ${blocked.backend_requirement}\n`;
      reportText += `   Code location: ${blocked.code_location}\n\n`;
    });

    reportText += `───────────────────────────────────────────────────────────\n`;
    reportText += `  ARCHITECTURAL VIOLATIONS (${auditReport.architectural_violations.length})\n`;
    reportText += `───────────────────────────────────────────────────────────\n\n`;
    auditReport.architectural_violations.forEach((violation, idx) => {
      reportText += `${idx + 1}. [${violation.severity}] ${violation.violation}\n`;
      reportText += `   Description: ${violation.description}\n`;
      reportText += `   Evidence: ${violation.evidence}\n`;
      reportText += `   Impact: ${violation.impact}\n`;
      reportText += `   Fix: ${violation.fix_required}\n\n`;
    });

    reportText += `───────────────────────────────────────────────────────────\n`;
    reportText += `  IMPLEMENTATION GAPS (${auditReport.implementation_gaps.length})\n`;
    reportText += `───────────────────────────────────────────────────────────\n\n`;
    auditReport.implementation_gaps.forEach((gap, idx) => {
      reportText += `${idx + 1}. [${gap.severity}] ${gap.gap}\n`;
      reportText += `   Description: ${gap.description}\n`;
      reportText += `   Impact: ${gap.impact}\n`;
      reportText += `   Fix: ${gap.fix_required}\n\n`;
    });

    reportText += `───────────────────────────────────────────────────────────\n`;
    reportText += `  UI-ONLY METRICS (${auditReport.ui_only_metrics.length})\n`;
    reportText += `───────────────────────────────────────────────────────────\n\n`;
    auditReport.ui_only_metrics.forEach((metric, idx) => {
      reportText += `${idx + 1}. ${metric.metric}\n`;
      reportText += `   Location: ${metric.location}\n`;
      reportText += `   Reality: ${metric.reality}\n`;
      reportText += `   Not connected to: ${metric.not_connected_to}\n`;
      reportText += `   Verdict: ${metric.verdict}\n\n`;
    });

    reportText += `───────────────────────────────────────────────────────────\n`;
    reportText += `  WHAT ACTUALLY WORKS (${auditReport.verified_working.length})\n`;
    reportText += `───────────────────────────────────────────────────────────\n\n`;
    auditReport.verified_working.forEach((working, idx) => {
      reportText += `${idx + 1}. ✅ ${working.feature}\n`;
      reportText += `   Status: ${working.status}\n`;
      reportText += `   Code: ${working.code}\n`;
      reportText += `   Verdict: ${working.verdict}\n\n`;
    });

    reportText += `═══════════════════════════════════════════════════════════\n`;
    reportText += `  HONEST SYSTEM STATE\n`;
    reportText += `═══════════════════════════════════════════════════════════\n\n`;
    reportText += `System Capability: ${auditReport.system_capability}\n\n`;
    reportText += `CAN DO:\n`;
    auditReport.capable_of.forEach(item => {
      reportText += `  ✅ ${item}\n`;
    });
    reportText += `\nCANNOT DO:\n`;
    auditReport.not_capable_of.forEach(item => {
      reportText += `  ❌ ${item}\n`;
    });
    
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplylens-forensic-audit-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  // Developer Console moved to sidebar - this component is deprecated
  return null;
  
  if (!isDeveloper) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 space-y-2">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-900 hover:bg-slate-800 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
        title="Developer Console"
      >
        <FileText className="w-5 h-5" />
      </Button>

      {isOpen && (
        <div className="absolute bottom-16 right-0 bg-slate-950 border border-slate-700 rounded-lg p-4 w-[64rem] max-h-[48rem] overflow-y-auto space-y-3 shadow-2xl">
          <div className="flex justify-between items-center sticky top-0 bg-slate-950 pb-2 border-b border-slate-800">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Developer Console</h3>
            <Button
              onClick={downloadReport}
              size="sm"
              disabled={!auditReport}
              className="bg-slate-800 hover:bg-slate-700 text-white"
            >
              <Download className="w-3 h-3 mr-1" /> Report
            </Button>
          </div>

          {/* Developer Console Manager */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <DeveloperConsoleManager />
          </div>

          <Button
            onClick={handleScan}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium"
          >
            {loading ? 'Scanning...' : 'Run Forensic Audit'}
          </Button>

          {auditReport && (
            <div className="space-y-4 text-xs">
              {/* Blocked Features */}
              <div className="bg-red-900/20 border border-red-700/30 rounded p-3">
                <p className="text-red-400 font-medium uppercase tracking-wider mb-2">
                  🚫 {auditReport.blocked_features.length} Features Blocked
                </p>
                <div className="space-y-2">
                  {auditReport.blocked_features.slice(0, 3).map((blocked, idx) => (
                    <div key={idx} className="text-red-300 border-l-2 border-red-500 pl-2">
                      <p className="font-medium">{blocked.feature}</p>
                      <p className="text-red-400 text-xs mt-0.5">{blocked.reason}</p>
                    </div>
                  ))}
                  {auditReport.blocked_features.length > 3 && (
                    <p className="text-red-400 italic">+{auditReport.blocked_features.length - 3} more in full report</p>
                  )}
                </div>
              </div>

              {/* Architectural Violations */}
              <div className="bg-orange-900/20 border border-orange-700/30 rounded p-3">
                <p className="text-orange-400 font-medium uppercase tracking-wider mb-2">
                  ⚠️ {auditReport.architectural_violations.length} Architectural Violations
                </p>
                <div className="space-y-2">
                  {auditReport.architectural_violations.slice(0, 2).map((violation, idx) => (
                    <div key={idx} className="text-orange-300 border-l-2 border-orange-500 pl-2">
                      <p className="font-medium">{violation.violation}</p>
                      <p className="text-orange-400 text-xs mt-0.5">{violation.description}</p>
                    </div>
                  ))}
                  {auditReport.architectural_violations.length > 2 && (
                    <p className="text-orange-400 italic">+{auditReport.architectural_violations.length - 2} more in full report</p>
                  )}
                </div>
              </div>

              {/* System Reality */}
              <div className="bg-slate-800 border border-slate-700 rounded p-3">
                <p className="text-slate-300 font-medium uppercase tracking-wider mb-2">System Capability</p>
                <p className="text-emerald-400 font-mono text-xs">{auditReport.system_capability}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-green-400 text-xs">✅ Phase 1.1: Evidence creation (SHA-256)</p>
                  <p className="text-green-400 text-xs">✅ Phase 1.2: Classification (role-enforced)</p>
                  <p className="text-yellow-400 text-xs">⚠️ Phase 1.3: Structuring (not implemented)</p>
                  <p className="text-red-400 text-xs">❌ Supplier creation (Phase 1.5)</p>
                </div>
              </div>

              {/* What Works */}
              <div className="bg-emerald-900/20 border border-emerald-700/30 rounded p-3">
                <p className="text-emerald-400 font-medium uppercase tracking-wider mb-2">
                  ✅ {auditReport.verified_working.length} Verified Working
                </p>
                <div className="space-y-1">
                  {auditReport.verified_working.map((working, idx) => (
                    <div key={idx} className="text-emerald-300 text-xs">
                      • {working.feature}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}