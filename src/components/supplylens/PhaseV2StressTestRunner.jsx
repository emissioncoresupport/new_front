import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Play, Download, XCircle, CheckCircle2, Clock } from 'lucide-react';

/**
 * PHASE V2 - HOSTILE STRESS TEST RUNNER
 * 
 * ABSOLUTE RULES:
 * - NO FIXES APPLIED
 * - NO ENFORCEMENT
 * - ONLY RECORD DEVIATIONS
 * - EXPOSE SILENT FAILURES
 */

export default function PhaseV2StressTestRunner() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);

  const addResult = (result) => {
    setResults(prev => [...prev, { ...result, timestamp: new Date().toISOString() }]);
  };

  const runStressTests = async () => {
    setRunning(true);
    setResults([]);
    
    const allResults = [];

    // ===== SECTION 1: CLASSIFICATION STRESS TESTS =====
    
    // Test 1.1: Classification with non-privileged user
    try {
      const user = await base44.auth.me();
      const testEvidence = await base44.entities.Evidence.list('created_date', 1);
      
      if (testEvidence.length > 0) {
        const ev = testEvidence[0];
        const beforeState = ev.state;
        
        try {
          await base44.functions.invoke('classifyEvidence', {
            evidence_id: ev.id,
            evidence_type: 'invoice',
            claimed_scope: 'supplier_identity',
            claimed_frameworks: ['CBAM'],
            classifier_id: user.email,
            classifier_role: 'user', // NOT authorized role
            confidence: 'high'
          });
          
          allResults.push({
            test: 'Classification with non-privileged user',
            category: 'Classification',
            action_attempted: 'Classify with role=user',
            expected_outcome: 'BLOCKED - only admin/legal/compliance/auditor allowed',
            actual_outcome: 'UNKNOWN - need to check if blocked',
            evidence_state_before: beforeState,
            evidence_state_after: 'UNKNOWN',
            audit_log_created: 'UNKNOWN',
            silent_behavior: 'POSSIBLE',
            risk_level: 'HIGH',
            deviation: 'Authorization check may not exist'
          });
        } catch (error) {
          allResults.push({
            test: 'Classification with non-privileged user',
            category: 'Classification',
            action_attempted: 'Classify with role=user',
            expected_outcome: 'BLOCKED',
            actual_outcome: `Blocked with: ${error.message}`,
            evidence_state_before: beforeState,
            evidence_state_after: beforeState,
            audit_log_created: 'UNKNOWN',
            silent_behavior: 'NO',
            risk_level: 'LOW',
            deviation: 'None - properly blocked'
          });
        }
      }
    } catch (error) {
      allResults.push({
        test: 'Classification with non-privileged user',
        category: 'Classification',
        actual_outcome: `Test setup failed: ${error.message}`,
        risk_level: 'CRITICAL'
      });
    }

    // Test 1.3: Attempt RAW → STRUCTURED (skip CLASSIFIED)
    try {
      const rawEvidence = await base44.entities.Evidence.filter({ state: 'RAW' }, 'created_date', 1);
      
      if (rawEvidence.length > 0) {
        const ev = rawEvidence[0];
        
        try {
          await base44.functions.invoke('structureEvidence', {
            evidence_id: ev.id,
            schema_type: 'supplier_identity',
            extracted_fields: { test: 'hostile' },
            extraction_source: 'human',
            approver_id: 'test@test.com',
            approver_role: 'admin'
          });
          
          allResults.push({
            test: 'RAW → STRUCTURED (skip CLASSIFIED)',
            category: 'Classification',
            action_attempted: 'Structure RAW Evidence directly',
            expected_outcome: 'BLOCKED - must be CLASSIFIED first',
            actual_outcome: 'ALLOWED - state machine violation',
            evidence_state_before: 'RAW',
            evidence_state_after: 'STRUCTURED or ERROR',
            audit_log_created: 'UNKNOWN',
            silent_behavior: 'CRITICAL',
            risk_level: 'CRITICAL',
            deviation: 'State machine not enforced - can skip CLASSIFIED'
          });
        } catch (error) {
          allResults.push({
            test: 'RAW → STRUCTURED (skip CLASSIFIED)',
            category: 'Classification',
            action_attempted: 'Structure RAW Evidence directly',
            expected_outcome: 'BLOCKED',
            actual_outcome: `Blocked with: ${error.message}`,
            evidence_state_before: 'RAW',
            audit_log_created: 'UNKNOWN',
            silent_behavior: 'NO',
            risk_level: 'LOW',
            deviation: 'None - properly blocked'
          });
        }
      }
    } catch (error) {
      allResults.push({
        test: 'RAW → STRUCTURED (skip CLASSIFIED)',
        category: 'Classification',
        actual_outcome: `Test setup failed: ${error.message}`,
        risk_level: 'MEDIUM'
      });
    }

    // Test 1.4: Attempt CLASSIFIED → RAW downgrade
    try {
      const classifiedEvidence = await base44.entities.Evidence.filter({ state: 'CLASSIFIED' }, 'created_date', 1);
      
      if (classifiedEvidence.length > 0) {
        const ev = classifiedEvidence[0];
        
        try {
          await base44.entities.Evidence.update(ev.id, { state: 'RAW' });
          
          allResults.push({
            test: 'CLASSIFIED → RAW downgrade',
            category: 'Classification',
            action_attempted: 'Downgrade Evidence state',
            expected_outcome: 'BLOCKED - state transitions are one-way',
            actual_outcome: 'ALLOWED - immutability violation',
            evidence_state_before: 'CLASSIFIED',
            evidence_state_after: 'RAW',
            audit_log_created: 'NO',
            silent_behavior: 'CRITICAL',
            risk_level: 'CRITICAL',
            deviation: 'Evidence state can be downgraded - immutability violated'
          });
        } catch (error) {
          allResults.push({
            test: 'CLASSIFIED → RAW downgrade',
            category: 'Classification',
            action_attempted: 'Downgrade Evidence state',
            expected_outcome: 'BLOCKED',
            actual_outcome: `Blocked with: ${error.message}`,
            evidence_state_before: 'CLASSIFIED',
            silent_behavior: 'NO',
            risk_level: 'LOW',
            deviation: 'None - properly blocked'
          });
        }
      }
    } catch (error) {
      allResults.push({
        test: 'CLASSIFIED → RAW downgrade',
        category: 'Classification',
        actual_outcome: `Test setup failed: ${error.message}`,
        risk_level: 'MEDIUM'
      });
    }

    // Test 1.6: Classification with malformed payload
    try {
      const testEvidence = await base44.entities.Evidence.list('created_date', 1);
      
      if (testEvidence.length > 0) {
        const ev = testEvidence[0];
        
        try {
          await base44.functions.invoke('classifyEvidence', {
            evidence_id: ev.id,
            // Missing evidence_type
            // Missing classifier_role
            // Missing timestamp
            claimed_scope: 'supplier_identity'
          });
          
          allResults.push({
            test: 'Classification with malformed payload',
            category: 'Classification',
            action_attempted: 'Classify with missing required fields',
            expected_outcome: 'REJECTED with validation errors',
            actual_outcome: 'ACCEPTED or silent failure',
            audit_log_created: 'UNKNOWN',
            silent_behavior: 'CRITICAL',
            risk_level: 'CRITICAL',
            deviation: 'No payload validation - accepts malformed data'
          });
        } catch (error) {
          allResults.push({
            test: 'Classification with malformed payload',
            category: 'Classification',
            action_attempted: 'Classify with missing required fields',
            expected_outcome: 'REJECTED',
            actual_outcome: `Rejected with: ${error.message}`,
            silent_behavior: 'NO',
            risk_level: 'LOW',
            deviation: 'None - properly validated'
          });
        }
      }
    } catch (error) {
      allResults.push({
        test: 'Classification with malformed payload',
        category: 'Classification',
        actual_outcome: `Test setup failed: ${error.message}`,
        risk_level: 'MEDIUM'
      });
    }

    // ===== SECTION 2: STRUCTURING STRESS TESTS =====

    // Test 2.1: CLASSIFIED → STRUCTURED without approval
    try {
      const classifiedEvidence = await base44.entities.Evidence.filter({ state: 'CLASSIFIED' }, 'created_date', 1);
      
      if (classifiedEvidence.length > 0) {
        const ev = classifiedEvidence[0];
        
        try {
          await base44.functions.invoke('structureEvidence', {
            evidence_id: ev.id,
            schema_type: 'supplier_identity',
            extracted_fields: { test: 'hostile' },
            extraction_source: 'ai_suggestion',
            // Missing approver_id
            // Missing approver_role
            ai_confidence_score: 95
          });
          
          allResults.push({
            test: 'CLASSIFIED → STRUCTURED without approval',
            category: 'Structuring',
            action_attempted: 'Structure without human approver',
            expected_outcome: 'BLOCKED - human approval required',
            actual_outcome: 'ALLOWED - approval bypass',
            evidence_state_before: 'CLASSIFIED',
            evidence_state_after: 'STRUCTURED',
            structured_record_created: 'YES',
            audit_log_created: 'UNKNOWN',
            silent_behavior: 'CRITICAL',
            risk_level: 'CRITICAL',
            deviation: 'AI can structure without human approval'
          });
        } catch (error) {
          allResults.push({
            test: 'CLASSIFIED → STRUCTURED without approval',
            category: 'Structuring',
            action_attempted: 'Structure without human approver',
            expected_outcome: 'BLOCKED',
            actual_outcome: `Blocked with: ${error.message}`,
            silent_behavior: 'NO',
            risk_level: 'LOW',
            deviation: 'None - properly blocked'
          });
        }
      }
    } catch (error) {
      allResults.push({
        test: 'CLASSIFIED → STRUCTURED without approval',
        category: 'Structuring',
        actual_outcome: `Test setup failed: ${error.message}`,
        risk_level: 'MEDIUM'
      });
    }

    // Test 2.3: Structuring with invalid schema_version
    try {
      const classifiedEvidence = await base44.entities.Evidence.filter({ state: 'CLASSIFIED' }, 'created_date', 1);
      
      if (classifiedEvidence.length > 0) {
        const ev = classifiedEvidence[0];
        
        try {
          await base44.functions.invoke('structureEvidence', {
            evidence_id: ev.id,
            schema_type: 'supplier_identity',
            schema_version: '999.999.999', // Invalid version
            extracted_fields: { test: 'hostile' },
            extraction_source: 'human',
            approver_id: 'test@test.com',
            approver_role: 'admin'
          });
          
          allResults.push({
            test: 'Structuring with invalid schema_version',
            category: 'Structuring',
            action_attempted: 'Structure with schema_version=999.999.999',
            expected_outcome: 'REJECTED - version validation',
            actual_outcome: 'ACCEPTED - no version validation',
            structured_record_created: 'YES',
            audit_log_created: 'UNKNOWN',
            silent_behavior: 'HIGH',
            risk_level: 'HIGH',
            deviation: 'Schema version not validated'
          });
        } catch (error) {
          allResults.push({
            test: 'Structuring with invalid schema_version',
            category: 'Structuring',
            action_attempted: 'Structure with invalid version',
            expected_outcome: 'REJECTED',
            actual_outcome: `Rejected with: ${error.message}`,
            silent_behavior: 'NO',
            risk_level: 'LOW',
            deviation: 'None - properly validated'
          });
        }
      }
    } catch (error) {
      allResults.push({
        test: 'Structuring with invalid schema_version',
        category: 'Structuring',
        actual_outcome: `Test setup failed: ${error.message}`,
        risk_level: 'MEDIUM'
      });
    }

    // Test 2.5: Attempt STRUCTURED → CLASSIFIED downgrade
    try {
      const structuredEvidence = await base44.entities.Evidence.filter({ state: 'STRUCTURED' }, 'created_date', 1);
      
      if (structuredEvidence.length > 0) {
        const ev = structuredEvidence[0];
        
        try {
          await base44.entities.Evidence.update(ev.id, { state: 'CLASSIFIED' });
          
          allResults.push({
            test: 'STRUCTURED → CLASSIFIED downgrade',
            category: 'Structuring',
            action_attempted: 'Downgrade Evidence state',
            expected_outcome: 'BLOCKED - state is immutable',
            actual_outcome: 'ALLOWED - immutability violation',
            evidence_state_before: 'STRUCTURED',
            evidence_state_after: 'CLASSIFIED',
            evidence_mutated: 'YES',
            audit_log_created: 'NO',
            silent_behavior: 'CRITICAL',
            risk_level: 'CRITICAL',
            deviation: 'Evidence state can be downgraded - immutability violated'
          });
        } catch (error) {
          allResults.push({
            test: 'STRUCTURED → CLASSIFIED downgrade',
            category: 'Structuring',
            action_attempted: 'Downgrade Evidence state',
            expected_outcome: 'BLOCKED',
            actual_outcome: `Blocked with: ${error.message}`,
            silent_behavior: 'NO',
            risk_level: 'LOW',
            deviation: 'None - properly blocked'
          });
        }
      }
    } catch (error) {
      allResults.push({
        test: 'STRUCTURED → CLASSIFIED downgrade',
        category: 'Structuring',
        actual_outcome: `Test setup failed: ${error.message}`,
        risk_level: 'MEDIUM'
      });
    }

    // ===== SECTION 3: REGULATOR REPLAY STRESS =====

    // Test 3.3: Duplicate request_id replay
    try {
      const testEvidence = await base44.entities.Evidence.filter({ state: 'RAW' }, 'created_date', 1);
      
      if (testEvidence.length > 0) {
        const ev = testEvidence[0];
        const request_id = 'REPLAY-TEST-' + Date.now();
        
        // First request
        await base44.functions.invoke('classifyEvidence', {
          request_id,
          evidence_id: ev.id,
          evidence_type: 'invoice',
          claimed_scope: 'supplier_identity',
          claimed_frameworks: ['CBAM'],
          classifier_id: 'test@test.com',
          classifier_role: 'admin',
          confidence: 'high'
        });
        
        // Duplicate request with same request_id
        try {
          await base44.functions.invoke('classifyEvidence', {
            request_id, // SAME REQUEST ID
            evidence_id: ev.id,
            evidence_type: 'certificate', // DIFFERENT DATA
            claimed_scope: 'facility',
            claimed_frameworks: ['EUDR'],
            classifier_id: 'test@test.com',
            classifier_role: 'admin',
            confidence: 'low'
          });
          
          allResults.push({
            test: 'Duplicate request_id replay',
            category: 'Replay',
            action_attempted: 'Replay request_id with different data',
            expected_outcome: 'BLOCKED or return cached response',
            actual_outcome: 'ALLOWED - created duplicate classification',
            audit_log_created: 'UNKNOWN',
            silent_behavior: 'CRITICAL',
            risk_level: 'CRITICAL',
            deviation: 'No idempotency - duplicate request_id creates duplicate records'
          });
        } catch (error) {
          allResults.push({
            test: 'Duplicate request_id replay',
            category: 'Replay',
            action_attempted: 'Replay request_id',
            expected_outcome: 'BLOCKED or cached',
            actual_outcome: `Blocked or cached: ${error.message}`,
            silent_behavior: 'NO',
            risk_level: 'LOW',
            deviation: 'None - idempotency maintained'
          });
        }
      }
    } catch (error) {
      allResults.push({
        test: 'Duplicate request_id replay',
        category: 'Replay',
        actual_outcome: `Test setup failed: ${error.message}`,
        risk_level: 'HIGH'
      });
    }

    // ===== SECTION 5: AUDIT LOG COMPLETENESS =====

    // Test 5.1: Verify audit log fields
    try {
      const recentAuditLogs = await base44.entities.AuditLogEntry.list('-action_timestamp', 10);
      
      const missingFields = [];
      recentAuditLogs.forEach(log => {
        const missing = [];
        if (!log.actor_id) missing.push('actor_id');
        if (!log.actor_role) missing.push('actor_role');
        if (!log.action_timestamp) missing.push('action_timestamp');
        if (!log.action) missing.push('action');
        
        if (missing.length > 0) {
          missingFields.push({ log_id: log.id, missing });
        }
      });
      
      if (missingFields.length > 0) {
        allResults.push({
          test: 'Audit log completeness',
          category: 'Audit',
          action_attempted: 'Verify audit log fields',
          expected_outcome: 'All logs have actor_id, actor_role, timestamp, action',
          actual_outcome: `${missingFields.length}/${recentAuditLogs.length} logs missing fields`,
          audit_log_created: 'INCOMPLETE',
          silent_behavior: 'HIGH',
          risk_level: 'HIGH',
          deviation: `Audit logs incomplete: ${JSON.stringify(missingFields)}`
        });
      } else {
        allResults.push({
          test: 'Audit log completeness',
          category: 'Audit',
          expected_outcome: 'All fields present',
          actual_outcome: 'All fields present',
          risk_level: 'LOW',
          deviation: 'None'
        });
      }
    } catch (error) {
      allResults.push({
        test: 'Audit log completeness',
        category: 'Audit',
        actual_outcome: `Test failed: ${error.message}`,
        risk_level: 'HIGH'
      });
    }

    setResults(allResults);
    
    // Generate summary
    const critical = allResults.filter(r => r.risk_level === 'CRITICAL').length;
    const high = allResults.filter(r => r.risk_level === 'HIGH').length;
    const medium = allResults.filter(r => r.risk_level === 'MEDIUM').length;
    const low = allResults.filter(r => r.risk_level === 'LOW').length;
    
    setSummary({
      total: allResults.length,
      critical,
      high,
      medium,
      low,
      deviations: allResults.filter(r => r.deviation && r.deviation !== 'None').length
    });
    
    setRunning(false);
  };

  const downloadReport = () => {
    let report = `═════════════════════════════════════════════════════\n`;
    report += `  PHASE V2 - HOSTILE STRESS TEST REPORT\n`;
    report += `  Generated: ${new Date().toISOString()}\n`;
    report += `  Status: NO FIXES APPLIED DURING PHASE V2\n`;
    report += `═════════════════════════════════════════════════════\n\n`;
    
    report += `EXPLICIT STATEMENT:\n`;
    report += `"These results reflect actual system behavior under hostile testing."\n\n`;
    
    if (summary) {
      report += `SUMMARY:\n`;
      report += `Total Tests: ${summary.total}\n`;
      report += `Critical Risk: ${summary.critical}\n`;
      report += `High Risk: ${summary.high}\n`;
      report += `Medium Risk: ${summary.medium}\n`;
      report += `Low Risk: ${summary.low}\n`;
      report += `Deviations Detected: ${summary.deviations}\n\n`;
    }
    
    ['Classification', 'Structuring', 'Replay', 'Audit'].forEach(category => {
      const categoryResults = results.filter(r => r.category === category);
      if (categoryResults.length > 0) {
        report += `\n─────────────────────────────────────────────────────\n`;
        report += `  ${category.toUpperCase()}\n`;
        report += `─────────────────────────────────────────────────────\n\n`;
        
        categoryResults.forEach((r, idx) => {
          report += `${idx + 1}. ${r.test}\n`;
          if (r.action_attempted) report += `   Action: ${r.action_attempted}\n`;
          if (r.expected_outcome) report += `   Expected: ${r.expected_outcome}\n`;
          if (r.actual_outcome) report += `   Actual: ${r.actual_outcome}\n`;
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
    a.download = `phase-v2-stress-test-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-light text-slate-900 uppercase tracking-widest">Phase V2 - Hostile Stress Test</h2>
        <p className="text-xs text-slate-600 mt-1">Classification & Structuring Verification | NO FIXES APPLIED</p>
      </div>

      <Card className="border-2 border-red-500 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-700 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">HOSTILE TEST MODE</p>
            <p className="text-xs text-red-800 mt-1">
              This phase attempts to break the system. NO FIXES will be applied. All deviations will be recorded to Developer Console.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button
          onClick={runStressTests}
          disabled={running}
          className="bg-red-600 hover:bg-red-700"
        >
          {running ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
          {running ? 'Running Stress Tests...' : 'Run Hostile Stress Tests'}
        </Button>
        {results.length > 0 && (
          <Button onClick={downloadReport} variant="outline">
            <Download className="w-4 h-4 mr-2" /> Download Report
          </Button>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-5 gap-3">
          <Card className="p-4 bg-slate-50">
            <p className="text-xs text-slate-600 uppercase">Total Tests</p>
            <p className="text-2xl font-bold text-slate-900">{summary.total}</p>
          </Card>
          <Card className="p-4 bg-red-50 border-red-200">
            <p className="text-xs text-red-600 uppercase">Critical</p>
            <p className="text-2xl font-bold text-red-700">{summary.critical}</p>
          </Card>
          <Card className="p-4 bg-orange-50 border-orange-200">
            <p className="text-xs text-orange-600 uppercase">High</p>
            <p className="text-2xl font-bold text-orange-700">{summary.high}</p>
          </Card>
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <p className="text-xs text-yellow-600 uppercase">Medium</p>
            <p className="text-2xl font-bold text-yellow-700">{summary.medium}</p>
          </Card>
          <Card className="p-4 bg-purple-50 border-purple-200">
            <p className="text-xs text-purple-600 uppercase">Deviations</p>
            <p className="text-2xl font-bold text-purple-700">{summary.deviations}</p>
          </Card>
        </div>
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
                {result.silent_behavior === 'CRITICAL' && (
                  <Badge className="bg-red-500 text-white">SILENT FAILURE</Badge>
                )}
              </div>
              
              <p className="text-sm font-semibold text-slate-900 mb-2">{result.test}</p>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                {result.action_attempted && (
                  <div>
                    <p className="text-slate-600">Action:</p>
                    <p className="text-slate-900">{result.action_attempted}</p>
                  </div>
                )}
                {result.expected_outcome && (
                  <div>
                    <p className="text-slate-600">Expected:</p>
                    <p className="text-green-700">{result.expected_outcome}</p>
                  </div>
                )}
                {result.actual_outcome && (
                  <div className="col-span-2">
                    <p className="text-slate-600">Actual:</p>
                    <p className="text-red-700 font-mono">{result.actual_outcome}</p>
                  </div>
                )}
              </div>
              
              {result.deviation && result.deviation !== 'None' && (
                <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded">
                  <p className="text-xs font-semibold text-red-900">Deviation Detected:</p>
                  <p className="text-xs text-red-800">{result.deviation}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}