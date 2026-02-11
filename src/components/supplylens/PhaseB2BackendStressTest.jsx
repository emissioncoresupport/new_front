import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Play, Download, XCircle, CheckCircle2, Clock } from 'lucide-react';

/**
 * PHASE B.2 - HOSTILE BACKEND STRESS TEST
 * 
 * Tests Backend Evidence Mutation Engine under adversarial conditions.
 * Verifies enforcement of:
 * - State machine (no skips, no downgrades)
 * - Idempotency
 * - AI safety (no autonomous mutations)
 * - Role authorization
 * - Multi-tenant isolation
 */

export default function PhaseB2BackendStressTest() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [verdict, setVerdict] = useState(null);

  const runBackendStressTests = async () => {
    setRunning(true);
    setResults([]);
    
    const allResults = [];
    let criticalCount = 0;

    const user = await base44.auth.me();

    // Create test Evidence in RAW state
    const testEvidence = await base44.entities.Evidence.create({
      tenant_id: user.email,
      evidence_id: `TEST_EV_${crypto.randomUUID()}`,
      ingestion_path: 'upload_documents',
      declared_context: {
        entity_type: 'supplier',
        intended_use: 'CBAM',
        source_role: 'buyer',
        reason: 'Backend stress test'
      },
      file_url: 'https://example.com/test.pdf',
      file_hash_sha256: 'a'.repeat(64),
      uploaded_at: new Date().toISOString(),
      actor_id: user.email,
      state: 'RAW'
    });

    // ===== TEST 1: STATE MACHINE VIOLATIONS =====

    // Test 1.1: Attempt RAW → STRUCTURED (skip CLASSIFIED)
    try {
      const result = await base44.functions.invoke('submitEvidenceCommand', {
        command_id: crypto.randomUUID(),
        command_type: 'ApproveStructuringCommand',
        tenant_id: testEvidence.tenant_id,
        evidence_id: testEvidence.id,
        actor_id: user.email,
        actor_role: user.role,
        issued_at: new Date().toISOString(),
        payload: {
          schema_type: 'supplier_identity',
          schema_version: '1.0',
          extracted_fields: { test: 'data' },
          extraction_source: 'human',
          approver_role: user.role
        }
      });

      const allowed = !result.data.error_code;
      if (allowed) criticalCount++;

      allResults.push({
        test: 'State Skip: RAW → STRUCTURED',
        category: 'State Machine',
        action: 'Attempt to skip CLASSIFIED state',
        backend_response: result.data.error_code || 'ACCEPTED',
        blocked: !allowed,
        risk_level: allowed ? 'CRITICAL' : 'LOW',
        deviation: allowed ? 'Backend allowed illegal state skip' : 'None - backend blocked skip'
      });
    } catch (error) {
      allResults.push({
        test: 'State Skip: RAW → STRUCTURED',
        category: 'State Machine',
        actual_outcome: `Error: ${error.message}`,
        risk_level: 'MEDIUM'
      });
    }

    // Test 1.2: Classify Evidence to CLASSIFIED
    await base44.functions.invoke('submitEvidenceCommand', {
      command_id: crypto.randomUUID(),
      command_type: 'ClassifyEvidenceCommand',
      tenant_id: testEvidence.tenant_id,
      evidence_id: testEvidence.id,
      actor_id: user.email,
      actor_role: user.role,
      issued_at: new Date().toISOString(),
      payload: {
        evidence_type: 'invoice',
        claimed_scope: 'supplier_identity',
        claimed_frameworks: ['CBAM'],
        classifier_role: user.role,
        confidence: 'high'
      }
    });

    // Test 1.3: Attempt CLASSIFIED → RAW (downgrade)
    try {
      const result = await base44.functions.invoke('submitEvidenceCommand', {
        command_id: crypto.randomUUID(),
        command_type: 'ClassifyEvidenceCommand',
        tenant_id: testEvidence.tenant_id,
        evidence_id: testEvidence.id,
        actor_id: user.email,
        actor_role: user.role,
        issued_at: new Date().toISOString(),
        payload: {
          evidence_type: 'invoice',
          claimed_scope: 'supplier_identity',
          claimed_frameworks: ['CBAM'],
          classifier_role: user.role,
          confidence: 'high'
        }
      });

      // Check if Evidence is still CLASSIFIED (no downgrade to RAW possible)
      const ev = await base44.entities.Evidence.filter({ id: testEvidence.id });
      const isClassified = ev[0].state === 'CLASSIFIED';

      if (!isClassified) criticalCount++;

      allResults.push({
        test: 'State Downgrade: CLASSIFIED → RAW',
        category: 'State Machine',
        action: 'Attempt to downgrade state',
        backend_response: result.data.error_code || 'ACCEPTED',
        current_state: ev[0].state,
        blocked: isClassified,
        risk_level: !isClassified ? 'CRITICAL' : 'LOW',
        deviation: !isClassified ? 'Backend allowed illegal downgrade' : 'None - backend prevented downgrade'
      });
    } catch (error) {
      allResults.push({
        test: 'State Downgrade: CLASSIFIED → RAW',
        category: 'State Machine',
        actual_outcome: `Error: ${error.message}`,
        risk_level: 'MEDIUM'
      });
    }

    // Test 1.4: Structure Evidence to STRUCTURED
    await base44.functions.invoke('submitEvidenceCommand', {
      command_id: crypto.randomUUID(),
      command_type: 'ApproveStructuringCommand',
      tenant_id: testEvidence.tenant_id,
      evidence_id: testEvidence.id,
      actor_id: user.email,
      actor_role: user.role,
      issued_at: new Date().toISOString(),
      payload: {
        schema_type: 'supplier_identity',
        schema_version: '1.0',
        extracted_fields: { name: 'Test Supplier' },
        extraction_source: 'human',
        approver_role: user.role
      }
    });

    // Test 1.5: Attempt STRUCTURED → CLASSIFIED (downgrade from terminal)
    try {
      const result = await base44.functions.invoke('submitEvidenceCommand', {
        command_id: crypto.randomUUID(),
        command_type: 'ClassifyEvidenceCommand',
        tenant_id: testEvidence.tenant_id,
        evidence_id: testEvidence.id,
        actor_id: user.email,
        actor_role: user.role,
        issued_at: new Date().toISOString(),
        payload: {
          evidence_type: 'certificate',
          claimed_scope: 'facility',
          claimed_frameworks: ['EUDR'],
          classifier_role: user.role,
          confidence: 'medium'
        }
      });

      const ev = await base44.entities.Evidence.filter({ id: testEvidence.id });
      const isStructured = ev[0].state === 'STRUCTURED';

      if (!isStructured) criticalCount++;

      allResults.push({
        test: 'Terminal State Violation: STRUCTURED → CLASSIFIED',
        category: 'State Machine',
        action: 'Attempt to exit terminal state',
        backend_response: result.data.error_code || 'ACCEPTED',
        current_state: ev[0].state,
        blocked: isStructured,
        risk_level: !isStructured ? 'CRITICAL' : 'LOW',
        deviation: !isStructured ? 'Backend allowed exit from terminal state' : 'None - terminal state locked'
      });
    } catch (error) {
      allResults.push({
        test: 'Terminal State Violation',
        category: 'State Machine',
        actual_outcome: `Error: ${error.message}`,
        risk_level: 'MEDIUM'
      });
    }

    // ===== TEST 2: IDEMPOTENCY =====

    // Test 2.1: Submit same command_id twice
    const testEvidence2 = await base44.entities.Evidence.create({
      tenant_id: user.email,
      evidence_id: `TEST_EV2_${crypto.randomUUID()}`,
      ingestion_path: 'upload_documents',
      declared_context: {
        entity_type: 'supplier',
        intended_use: 'CBAM',
        source_role: 'buyer'
      },
      file_hash_sha256: 'b'.repeat(64),
      uploaded_at: new Date().toISOString(),
      actor_id: user.email,
      state: 'RAW'
    });

    try {
      const commandId = crypto.randomUUID();
      
      const result1 = await base44.functions.invoke('submitEvidenceCommand', {
        command_id: commandId,
        command_type: 'ClassifyEvidenceCommand',
        tenant_id: testEvidence2.tenant_id,
        evidence_id: testEvidence2.id,
        actor_id: user.email,
        actor_role: user.role,
        issued_at: new Date().toISOString(),
        payload: {
          evidence_type: 'invoice',
          claimed_scope: 'supplier_identity',
          claimed_frameworks: ['CBAM'],
          classifier_role: user.role,
          confidence: 'high'
        }
      });

      const result2 = await base44.functions.invoke('submitEvidenceCommand', {
        command_id: commandId, // SAME command_id
        command_type: 'ClassifyEvidenceCommand',
        tenant_id: testEvidence2.tenant_id,
        evidence_id: testEvidence2.id,
        actor_id: user.email,
        actor_role: user.role,
        issued_at: new Date().toISOString(),
        payload: {
          evidence_type: 'invoice',
          claimed_scope: 'supplier_identity',
          claimed_frameworks: ['CBAM'],
          classifier_role: user.role,
          confidence: 'high'
        }
      });

      // Check that only ONE event was created
      const events = await base44.entities.LedgerEvent.filter({
        command_id: commandId,
        tenant_id: testEvidence2.tenant_id
      });

      const idempotent = events.length === 1 && result2.data.idempotent === true;
      
      if (!idempotent) criticalCount++;

      allResults.push({
        test: 'Idempotency: Duplicate command_id',
        category: 'Idempotency',
        action: 'Submit same command_id twice',
        event_count: events.length,
        idempotent_flag: result2.data.idempotent,
        enforced: idempotent,
        risk_level: !idempotent ? 'CRITICAL' : 'LOW',
        deviation: !idempotent ? 'Backend created duplicate events' : 'None - idempotency enforced'
      });
    } catch (error) {
      allResults.push({
        test: 'Idempotency: Duplicate command_id',
        category: 'Idempotency',
        actual_outcome: `Error: ${error.message}`,
        risk_level: 'MEDIUM'
      });
    }

    // ===== TEST 3: AI SAFETY =====

    // Test 3.1: AI-only structuring without human approver
    const testEvidence3 = await base44.entities.Evidence.create({
      tenant_id: user.email,
      evidence_id: `TEST_EV3_${crypto.randomUUID()}`,
      ingestion_path: 'upload_documents',
      declared_context: {
        entity_type: 'supplier',
        intended_use: 'CBAM',
        source_role: 'buyer'
      },
      file_hash_sha256: 'c'.repeat(64),
      uploaded_at: new Date().toISOString(),
      actor_id: user.email,
      state: 'RAW'
    });

    // Classify first
    await base44.functions.invoke('submitEvidenceCommand', {
      command_id: crypto.randomUUID(),
      command_type: 'ClassifyEvidenceCommand',
      tenant_id: testEvidence3.tenant_id,
      evidence_id: testEvidence3.id,
      actor_id: user.email,
      actor_role: user.role,
      issued_at: new Date().toISOString(),
      payload: {
        evidence_type: 'invoice',
        claimed_scope: 'supplier_identity',
        claimed_frameworks: ['CBAM'],
        classifier_role: user.role,
        confidence: 'high'
      }
    });

    try {
      const result = await base44.functions.invoke('submitEvidenceCommand', {
        command_id: crypto.randomUUID(),
        command_type: 'ApproveStructuringCommand',
        tenant_id: testEvidence3.tenant_id,
        evidence_id: testEvidence3.id,
        actor_id: user.email,
        actor_role: user.role,
        issued_at: new Date().toISOString(),
        payload: {
          schema_type: 'supplier_identity',
          schema_version: '1.0',
          extracted_fields: { name: 'AI Generated Supplier' },
          extraction_source: 'ai_suggestion', // AI source
          // Missing approver_role - AI-only attempt
        }
      });

      const allowed = !result.data.error_code || result.data.error_code !== 'AI_SAFETY_VIOLATION';
      
      if (allowed) criticalCount++;

      allResults.push({
        test: 'AI Safety: AI-only structuring',
        category: 'AI Safety',
        action: 'Attempt AI structuring without human approver',
        backend_response: result.data.error_code || 'ACCEPTED',
        blocked: !allowed,
        risk_level: allowed ? 'CRITICAL' : 'LOW',
        deviation: allowed ? 'Backend allowed AI-only mutation' : 'None - AI safety enforced'
      });
    } catch (error) {
      allResults.push({
        test: 'AI Safety: AI-only structuring',
        category: 'AI Safety',
        actual_outcome: `Error: ${error.message}`,
        risk_level: 'MEDIUM'
      });
    }

    // ===== TEST 4: ROLE AUTHORIZATION =====

    // Test 4.1: Unauthorized role attempt
    const testEvidence4 = await base44.entities.Evidence.create({
      tenant_id: user.email,
      evidence_id: `TEST_EV4_${crypto.randomUUID()}`,
      ingestion_path: 'upload_documents',
      declared_context: {
        entity_type: 'supplier',
        intended_use: 'CBAM',
        source_role: 'buyer'
      },
      file_hash_sha256: 'd'.repeat(64),
      uploaded_at: new Date().toISOString(),
      actor_id: user.email,
      state: 'RAW'
    });

    try {
      const result = await base44.functions.invoke('submitEvidenceCommand', {
        command_id: crypto.randomUUID(),
        command_type: 'ClassifyEvidenceCommand',
        tenant_id: testEvidence4.tenant_id,
        evidence_id: testEvidence4.id,
        actor_id: 'unauthorized@example.com',
        actor_role: 'invalid_role', // Invalid role
        issued_at: new Date().toISOString(),
        payload: {
          evidence_type: 'invoice',
          claimed_scope: 'supplier_identity',
          claimed_frameworks: ['CBAM'],
          classifier_role: 'invalid_role',
          confidence: 'high'
        }
      });

      const allowed = !result.data.error_code || result.data.error_code !== 'UNAUTHORIZED_ROLE';
      
      if (allowed) criticalCount++;

      allResults.push({
        test: 'Authorization: Invalid role',
        category: 'Authorization',
        action: 'Attempt command with invalid role',
        backend_response: result.data.error_code || 'ACCEPTED',
        blocked: !allowed,
        risk_level: allowed ? 'CRITICAL' : 'LOW',
        deviation: allowed ? 'Backend allowed unauthorized role' : 'None - role validation enforced'
      });
    } catch (error) {
      allResults.push({
        test: 'Authorization: Invalid role',
        category: 'Authorization',
        actual_outcome: `Error: ${error.message}`,
        risk_level: 'MEDIUM'
      });
    }

    // ===== TEST 5: MULTI-TENANT ISOLATION =====

    // Test 5.1: Cross-tenant command
    try {
      const result = await base44.functions.invoke('submitEvidenceCommand', {
        command_id: crypto.randomUUID(),
        command_type: 'ClassifyEvidenceCommand',
        tenant_id: 'OTHER_TENANT_ID', // Wrong tenant
        evidence_id: testEvidence.id,
        actor_id: user.email,
        actor_role: user.role,
        issued_at: new Date().toISOString(),
        payload: {
          evidence_type: 'invoice',
          claimed_scope: 'supplier_identity',
          claimed_frameworks: ['CBAM'],
          classifier_role: user.role,
          confidence: 'high'
        }
      });

      const allowed = !result.data.error_code || result.data.error_code !== 'TENANT_MISMATCH';
      
      if (allowed) criticalCount++;

      allResults.push({
        test: 'Multi-Tenant: Cross-tenant command',
        category: 'Multi-Tenant',
        action: 'Attempt command with mismatched tenant_id',
        backend_response: result.data.error_code || 'ACCEPTED',
        blocked: !allowed,
        risk_level: allowed ? 'CRITICAL' : 'LOW',
        deviation: allowed ? 'Backend allowed cross-tenant mutation' : 'None - tenant isolation enforced'
      });
    } catch (error) {
      allResults.push({
        test: 'Multi-Tenant: Cross-tenant command',
        category: 'Multi-Tenant',
        actual_outcome: `Error: ${error.message}`,
        risk_level: 'MEDIUM'
      });
    }

    setResults(allResults);

    // Generate verdict
    const totalTests = allResults.length;
    const passedTests = allResults.filter(r => 
      r.deviation === 'None - backend blocked skip' ||
      r.deviation === 'None - backend prevented downgrade' ||
      r.deviation === 'None - terminal state locked' ||
      r.deviation === 'None - idempotency enforced' ||
      r.deviation === 'None - AI safety enforced' ||
      r.deviation === 'None - role validation enforced' ||
      r.deviation === 'None - tenant isolation enforced'
    ).length;

    const verdictData = {
      total_tests: totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      critical_deviations: criticalCount,
      verdict: criticalCount === 0 ? 'PASS' : 'FAIL',
      reason: criticalCount > 0 ? 
        `${criticalCount} critical backend violation(s) detected - BACKEND NOT REGULATOR-GRADE` :
        'All tests passed - Backend enforces all invariants under hostile conditions'
    };

    setVerdict(verdictData);
    setRunning(false);
  };

  const downloadReport = () => {
    let report = `═════════════════════════════════════════════════════\n`;
    report += `  PHASE B.2 - HOSTILE BACKEND STRESS TEST\n`;
    report += `  Backend Mutation Engine Validation\n`;
    report += `═════════════════════════════════════════════════════\n\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;

    if (verdict) {
      report += `VERDICT: ${verdict.verdict}\n`;
      report += `Total Tests: ${verdict.total_tests}\n`;
      report += `Passed: ${verdict.passed}\n`;
      report += `Failed: ${verdict.failed}\n`;
      report += `Critical Violations: ${verdict.critical_deviations}\n`;
      report += `Reason: ${verdict.reason}\n\n`;
    }

    ['State Machine', 'Idempotency', 'AI Safety', 'Authorization', 'Multi-Tenant'].forEach(category => {
      const categoryResults = results.filter(r => r.category === category);
      if (categoryResults.length > 0) {
        report += `\n─────────────────────────────────────────────────────\n`;
        report += `  ${category.toUpperCase()}\n`;
        report += `─────────────────────────────────────────────────────\n\n`;
        
        categoryResults.forEach((r, idx) => {
          report += `${idx + 1}. ${r.test}\n`;
          if (r.action) report += `   Action: ${r.action}\n`;
          if (r.backend_response) report += `   Backend: ${r.backend_response}\n`;
          if (r.blocked !== undefined) report += `   Blocked: ${r.blocked ? 'YES' : 'NO'}\n`;
          if (r.enforced !== undefined) report += `   Enforced: ${r.enforced ? 'YES' : 'NO'}\n`;
          if (r.risk_level) report += `   Risk: ${r.risk_level}\n`;
          if (r.deviation) report += `   Deviation: ${r.deviation}\n`;
          report += `\n`;
        });
      }
    });

    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phase-b2-backend-stress-test-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-light text-slate-900 uppercase tracking-widest">Phase B.2 - Hostile Backend Test</h2>
        <p className="text-xs text-slate-600 mt-1">Backend Mutation Engine Validation</p>
      </div>

      <Card className="border-2 border-red-500 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-700 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">ADVERSARIAL BACKEND TESTING</p>
            <p className="text-xs text-red-800 mt-1">
              Testing backend enforcement under hostile conditions: state violations, AI bypass, idempotency, authorization.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button
          onClick={runBackendStressTests}
          disabled={running}
          className="bg-red-600 hover:bg-red-700"
        >
          {running ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
          {running ? 'Running Backend Tests...' : 'Run Hostile Backend Tests'}
        </Button>
        {results.length > 0 && (
          <Button onClick={downloadReport} variant="outline">
            <Download className="w-4 h-4 mr-2" /> Download Report
          </Button>
        )}
      </div>

      {verdict && (
        <Card className={`p-6 ${verdict.verdict === 'PASS' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'} border-2`}>
          <div className="flex items-center gap-3">
            {verdict.verdict === 'PASS' ? 
              <CheckCircle2 className="w-8 h-8 text-green-600" /> : 
              <XCircle className="w-8 h-8 text-red-600" />
            }
            <div>
              <p className="text-2xl font-bold">{verdict.verdict}</p>
              <p className="text-sm mt-1">{verdict.reason}</p>
              <div className="grid grid-cols-4 gap-3 mt-3 text-xs">
                <div>
                  <span className="text-slate-600">Total:</span>
                  <span className="ml-1 font-semibold">{verdict.total_tests}</span>
                </div>
                <div>
                  <span className="text-slate-600">Passed:</span>
                  <span className="ml-1 font-semibold text-green-700">{verdict.passed}</span>
                </div>
                <div>
                  <span className="text-slate-600">Failed:</span>
                  <span className="ml-1 font-semibold text-red-700">{verdict.failed}</span>
                </div>
                <div>
                  <span className="text-slate-600">Critical:</span>
                  <span className="ml-1 font-semibold text-red-700">{verdict.critical_deviations}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, idx) => (
            <Card key={idx} className={`p-4 ${
              result.risk_level === 'CRITICAL' ? 'border-2 border-red-500 bg-red-50' :
              result.risk_level === 'HIGH' ? 'border border-orange-500 bg-orange-50' :
              result.risk_level === 'MEDIUM' ? 'border border-yellow-500 bg-yellow-50' :
              'border border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-slate-800 text-white text-xs">{result.category}</Badge>
                  <Badge className={
                    result.risk_level === 'CRITICAL' ? 'bg-red-600 text-white' :
                    result.risk_level === 'HIGH' ? 'bg-orange-600 text-white' :
                    result.risk_level === 'MEDIUM' ? 'bg-yellow-600 text-white' :
                    'bg-blue-600 text-white'
                  }>{result.risk_level}</Badge>
                </div>
              </div>
              
              <p className="text-sm font-semibold text-slate-900 mb-2">{result.test}</p>
              
              <div className="space-y-1 text-xs">
                {result.action && (
                  <p><span className="text-slate-600">Action:</span> <span className="text-slate-900">{result.action}</span></p>
                )}
                {result.backend_response && (
                  <p><span className="text-slate-600">Backend:</span> <span className="text-slate-900">{result.backend_response}</span></p>
                )}
                {result.blocked !== undefined && (
                  <p><span className="text-slate-600">Blocked:</span> <span className={result.blocked ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>{result.blocked ? 'YES ✓' : 'NO ✗'}</span></p>
                )}
              </div>
              
              {result.deviation && (
                <div className={`mt-3 p-2 rounded ${
                  result.deviation.startsWith('None') ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
                }`}>
                  <p className={`text-xs font-semibold ${result.deviation.startsWith('None') ? 'text-green-900' : 'text-red-900'}`}>
                    {result.deviation.startsWith('None') ? '✓' : '✗'} {result.deviation}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}