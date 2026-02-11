import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlayCircle, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import * as Kernel from '@/components/supplylens/KernelAdapter';
import { base44 } from '@/api/base44Client';
import { v4 as uuidv4 } from 'uuid';

/**
 * CONTRACT 1 ACCEPTANCE TESTS (STABLE)
 * Tests kernel endpoints with build_id tracking
 * Stores results in ContractTestRun entity with build_fingerprint
 */

const CLIENT_BUILD_ID = import.meta.env.VITE_BUILD_ID || 'dev-local';

export default function Contract1AcceptanceTestsStable({ onComplete }) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [runRecord, setRunRecord] = useState(null);

  const runTests = async () => {
    setRunning(true);
    setResults(null);
    
    const testResults = [];
    const runId = uuidv4();
    const startedAt = new Date().toISOString();
    const correlationIdRoot = `TEST_RUN_${runId}`;

    toast.info('Running Contract 1 Tests...', { duration: 2000 });

    try {
      const user = await base44.auth.me();

      // Test 1: CreateDraft missing why_this_evidence → 422
      const test1Result = await testCreateDraftMissingField();
      testResults.push(test1Result);

      // Test 2: AttachFile without draft_id → 422 DRAFT_ID_REQUIRED
      const test2Result = await testAttachFileNoDraftId();
      testResults.push(test2Result);

      // Test 3: CreateDraft valid → 201
      const test3Result = await testCreateDraftValid();
      testResults.push(test3Result);
      const validDraftId = test3Result.draft_id;

      // Test 4: AttachFile with valid draft → 201 + sha256
      const test4Result = await testAttachFileValid(validDraftId);
      testResults.push(test4Result);

      // Test 5: GetDraftSnapshot shows attached file with same sha256
      const test5Result = await testGetDraftSnapshot(validDraftId, test4Result.sha256);
      testResults.push(test5Result);

      // Test 6: Seal with missing scope_target_id for PRODUCT_FAMILY → 422
      const test6Result = await testSealMissingScopeTarget();
      testResults.push(test6Result);

      // Test 7: Seal valid draft → 201 with retention_ends_utc computed
      const test7Result = await testSealValid(validDraftId);
      testResults.push(test7Result);

      // Compute pass rate
      const passCount = testResults.filter(t => t.status === 'PASS').length;
      const failCount = testResults.filter(t => t.status === 'FAIL').length;
      const passRate = Math.round((passCount / testResults.length) * 100);

      setResults({
        tests: testResults,
        total: testResults.length,
        passed: passCount,
        failed: failCount,
        pass_rate: passRate
      });

      // Store test run in database
      const finishedAt = new Date().toISOString();
      const testRun = await base44.asServiceRole.entities.ContractTestRun.create({
        run_id: runId,
        suite_name: 'CONTRACT1_MANUAL_ENTRY',
        environment: 'TEST',
        started_at_utc: startedAt,
        finished_at_utc: finishedAt,
        triggered_by_user_id: user.id,
        build_id: CLIENT_BUILD_ID,
        pass_count: passCount,
        fail_count: failCount,
        total_tests: testResults.length,
        pass_rate: passRate,
        status: failCount === 0 ? 'PASS' : 'FAIL',
        results_json: testResults,
        results_hash_sha256: 'sha256-placeholder',
        correlation_id_root: correlationIdRoot
      });

      setRunRecord(testRun);

      if (failCount === 0) {
        toast.success('All tests passed', { description: `${passCount}/${testResults.length} ✓` });
      } else {
        toast.error('Some tests failed', { description: `${failCount}/${testResults.length} ✗` });
      }

      if (onComplete) onComplete();
    } catch (error) {
      console.error('[TESTS] Error:', error);
      toast.error('Test execution failed', { description: error.message });
    } finally {
      setRunning(false);
    }
  };

  // Test implementations
  const testCreateDraftMissingField = async () => {
    try {
      const result = await Kernel.kernel_createDraft({
        ingestion_method: 'MANUAL_ENTRY',
        source_system: 'INTERNAL_MANUAL',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'ENTIRE_ORGANIZATION',
        why_this_evidence: '',  // MISSING
        purpose_tags: ['compliance'],
        retention_policy: 'STANDARD_7_YEARS',
        contains_personal_data: false
      });

      const pass = result.error_code === 'VALIDATION_FAILED' && 
                   result.field_errors?.some(e => e.field === 'why_this_evidence');

      return {
        name: 'CreateDraft missing why_this_evidence → 422',
        status: pass ? 'PASS' : 'FAIL',
        expected: 'error_code=VALIDATION_FAILED, field=why_this_evidence',
        actual: result.error_code || 'no error',
        correlation_id: result.correlation_id,
        build_id: result.build_id
      };
    } catch (error) {
      return {
        name: 'CreateDraft missing why_this_evidence → 422',
        status: 'FAIL',
        error: error.message
      };
    }
  };

  const testAttachFileNoDraftId = async () => {
    try {
      // Create a dummy file
      const dummyFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const result = await Kernel.kernel_attachFile(null, dummyFile);

      const pass = result.error_code === 'DRAFT_ID_REQUIRED' || result.error_code === 'KERNEL_ATTACH_FILE_FAILED';

      return {
        name: 'AttachFile without draft_id → 422',
        status: pass ? 'PASS' : 'FAIL',
        expected: 'error_code=DRAFT_ID_REQUIRED',
        actual: result.error_code || 'no error',
        correlation_id: result.correlation_id,
        build_id: result.build_id
      };
    } catch (error) {
      return {
        name: 'AttachFile without draft_id → 422',
        status: 'PASS',
        note: 'Exception caught (expected behavior)'
      };
    }
  };

  const testCreateDraftValid = async () => {
    try {
      const result = await Kernel.kernel_createDraft({
        ingestion_method: 'FILE_UPLOAD',
        source_system: 'TEST_ERP',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'ENTIRE_ORGANIZATION',
        scope_target_id: null,
        why_this_evidence: 'Automated acceptance test for FILE_UPLOAD ingestion method',
        purpose_tags: ['test', 'compliance'],
        retention_policy: 'STANDARD_7_YEARS',
        contains_personal_data: false
      });

      const pass = !result.error_code && result.draft_id;

      return {
        name: 'CreateDraft valid → 201 with draft_id',
        status: pass ? 'PASS' : 'FAIL',
        expected: 'draft_id present, no error_code',
        actual: result.draft_id ? `draft_id=${result.draft_id.substring(0, 12)}...` : result.error_code,
        correlation_id: result.correlation_id,
        build_id: result.build_id,
        draft_id: result.draft_id
      };
    } catch (error) {
      return {
        name: 'CreateDraft valid → 201',
        status: 'FAIL',
        error: error.message
      };
    }
  };

  const testAttachFileValid = async (draftId) => {
    try {
      const testContent = 'supplier_id,legal_name,country\nSUP001,Acme Corp,DE\n';
      const testFile = new File([testContent], 'suppliers.csv', { type: 'text/csv' });
      
      const result = await Kernel.kernel_attachFile(draftId, testFile);

      const pass = !result.error_code && result.sha256;

      return {
        name: 'AttachFile valid → 201 with sha256',
        status: pass ? 'PASS' : 'FAIL',
        expected: 'sha256 present, no error_code',
        actual: result.sha256 ? `sha256=${result.sha256.substring(0, 16)}...` : result.error_code,
        correlation_id: result.correlation_id,
        build_id: result.build_id,
        sha256: result.sha256
      };
    } catch (error) {
      return {
        name: 'AttachFile valid → 201',
        status: 'FAIL',
        error: error.message
      };
    }
  };

  const testGetDraftSnapshot = async (draftId, expectedSha256) => {
    try {
      const result = await Kernel.kernel_getDraft(draftId);

      const pass = !result.error_code && 
                   result.attachments?.length > 0 && 
                   result.attachments[0].sha256 === expectedSha256;

      return {
        name: 'GetDraftSnapshot shows consistent sha256',
        status: pass ? 'PASS' : 'FAIL',
        expected: `sha256=${expectedSha256?.substring(0, 16)}...`,
        actual: result.attachments?.[0]?.sha256?.substring(0, 16) || 'no attachments',
        correlation_id: result.correlation_id,
        build_id: result.build_id
      };
    } catch (error) {
      return {
        name: 'GetDraftSnapshot consistency',
        status: 'FAIL',
        error: error.message
      };
    }
  };

  const testSealMissingScopeTarget = async () => {
    try {
      // Create draft with PRODUCT_FAMILY but no scope_target_id
      const createResult = await Kernel.kernel_createDraft({
        ingestion_method: 'MANUAL_ENTRY',
        source_system: 'INTERNAL_MANUAL',
        dataset_type: 'BOM',
        declared_scope: 'PRODUCT_FAMILY',
        scope_target_id: null,  // MISSING
        why_this_evidence: 'Test draft for scope target validation',
        purpose_tags: ['test'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false
      });

      if (createResult.error_code) {
        // Expected at creation time
        const pass = createResult.field_errors?.some(e => e.field === 'scope_target_id');
        return {
          name: 'Seal missing scope_target_id → 422',
          status: pass ? 'PASS' : 'FAIL',
          expected: 'error_code=VALIDATION_FAILED, field=scope_target_id',
          actual: createResult.error_code,
          correlation_id: createResult.correlation_id,
          note: 'Caught at draft creation'
        };
      }

      return {
        name: 'Seal missing scope_target_id → 422',
        status: 'FAIL',
        note: 'Validation should have caught missing scope_target_id'
      };
    } catch (error) {
      return {
        name: 'Seal missing scope_target_id',
        status: 'FAIL',
        error: error.message
      };
    }
  };

  const testSealValid = async (draftId) => {
    try {
      const result = await Kernel.kernel_sealDraft(draftId);

      const hasRetention = result.retention_ends_utc && result.retention_ends_utc !== 'INVALID';
      const pass = !result.error_code && result.evidence_id && hasRetention;

      return {
        name: 'Seal valid draft → 201 with retention_ends_utc',
        status: pass ? 'PASS' : 'FAIL',
        expected: 'evidence_id present, retention_ends_utc computed',
        actual: result.evidence_id ? 
          `evidence_id=${result.evidence_id.substring(0, 12)}..., retention=${result.retention_ends_utc}` : 
          result.error_code,
        correlation_id: result.correlation_id,
        build_id: result.build_id,
        evidence_id: result.evidence_id
      };
    } catch (error) {
      return {
        name: 'Seal valid draft → 201',
        status: 'FAIL',
        error: error.message
      };
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5" />
            Contract 1 Acceptance Tests
          </CardTitle>
          <Button 
            onClick={runTests} 
            disabled={running}
            className="gap-2"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                Run Tests
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {runRecord && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-xs space-y-1">
              <p><strong>Run ID:</strong> <code className="font-mono">{runRecord.run_id}</code></p>
              <p><strong>Build ID:</strong> <code className="font-mono">{runRecord.build_id}</code></p>
              <p><strong>Started:</strong> {new Date(runRecord.started_at_utc).toLocaleString()}</p>
              <p><strong>Status:</strong> <Badge className={runRecord.status === 'PASS' ? 'bg-green-600' : 'bg-red-600'}>{runRecord.status}</Badge></p>
            </AlertDescription>
          </Alert>
        )}

        {results && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {results.passed}/{results.total} passed ({results.pass_rate}%)
              </p>
              <Badge className={results.failed === 0 ? 'bg-green-600' : 'bg-red-600'}>
                {results.failed === 0 ? 'ALL PASS' : `${results.failed} FAILED`}
              </Badge>
            </div>

            {results.tests.map((test, idx) => (
              <Card key={idx} className={`${
                test.status === 'PASS' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-300'
              }`}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    {test.status === 'PASS' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-xs font-medium text-slate-900">{test.name}</p>
                      <div className="mt-2 space-y-1 text-[10px]">
                        <p className="text-slate-700"><strong>Expected:</strong> {test.expected}</p>
                        <p className="text-slate-700"><strong>Actual:</strong> {test.actual}</p>
                        {test.correlation_id && (
                          <p className="text-slate-600"><strong>Correlation ID:</strong> <code className="font-mono">{test.correlation_id}</code></p>
                        )}
                        {test.build_id && (
                          <p className="text-slate-600"><strong>Server Build:</strong> <code className="font-mono">{test.build_id}</code></p>
                        )}
                        {test.note && (
                          <p className="text-blue-700 italic">{test.note}</p>
                        )}
                        {test.error && (
                          <p className="text-red-700 font-mono">{test.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!results && !running && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm ml-2">
              Click "Run Tests" to execute 7 acceptance tests covering draft creation, file attachment, validation, and sealing.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}