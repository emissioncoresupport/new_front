import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlayCircle, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as Kernel from '@/components/supplylens/KernelAdapter';

export default function Contract1IngestionKernelTests() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);

  const runTests = async () => {
    setRunning(true);
    setResults([]);
    setSummary(null);

    const testResults = [];
    let passed = 0;
    let failed = 0;

    const runId = `TEST_${Date.now()}`;
    const startTime = new Date().toISOString();

    // Test 1: Create Draft
    try {
      const result = await Kernel.kernel_createDraft({
        ingestion_method: 'FILE_UPLOAD',
        source_system: 'TEST_SYSTEM',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'ENTIRE_ORGANIZATION',
        why_this_evidence: 'Test evidence for kernel validation',
        purpose_tags: ['COMPLIANCE_TEST'],
        retention_policy: 'STANDARD_7_YEARS',
        contains_personal_data: false
      });

      if (result.error_code) {
        throw new Error(`${result.error_code}: ${result.message}`);
      }

      if (result.draft_id && result.correlation_id) {
        testResults.push({
          test: 'Create Draft',
          status: 'PASS',
          details: `draft_id: ${result.draft_id}`,
          correlation_id: result.correlation_id
        });
        passed++;
        window.testDraftId = result.draft_id;
      } else {
        throw new Error('Missing draft_id or correlation_id');
      }
    } catch (error) {
      testResults.push({
        test: 'Create Draft',
        status: 'FAIL',
        details: error.message,
        correlation_id: null
      });
      failed++;
    }

    // Test 2: Attach File
    if (window.testDraftId) {
      try {
        const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
        const result = await Kernel.kernel_attachFile(window.testDraftId, testFile);

        if (result.error_code) {
          throw new Error(`${result.error_code}: ${result.message}`);
        }

        if (result.sha256 && result.attachment_id) {
          testResults.push({
            test: 'Attach File',
            status: 'PASS',
            details: `SHA-256: ${result.sha256.substring(0, 16)}...`,
            correlation_id: result.correlation_id
          });
          passed++;
        } else {
          throw new Error('Missing sha256 or attachment_id');
        }
      } catch (error) {
        testResults.push({
          test: 'Attach File',
          status: 'FAIL',
          details: error.message,
          correlation_id: null
        });
        failed++;
      }
    }

    // Test 3: Get Draft Snapshot
    if (window.testDraftId) {
      try {
        const result = await Kernel.kernel_getDraft(window.testDraftId);

        if (result.error_code) {
          throw new Error(`${result.error_code}: ${result.message}`);
        }

        if (result.draft && result.attachments && typeof result.can_seal === 'boolean') {
          testResults.push({
            test: 'Get Draft Snapshot',
            status: 'PASS',
            details: `can_seal: ${result.can_seal}, attachments: ${result.attachments.length}`,
            correlation_id: result.correlation_id
          });
          passed++;
        } else {
          throw new Error('Invalid snapshot structure');
        }
      } catch (error) {
        testResults.push({
          test: 'Get Draft Snapshot',
          status: 'FAIL',
          details: error.message,
          correlation_id: null
        });
        failed++;
      }
    }

    // Test 4: Seal Draft
    if (window.testDraftId) {
      try {
        const result = await Kernel.kernel_sealDraft(window.testDraftId);

        if (result.error_code) {
          throw new Error(`${result.error_code}: ${result.message}`);
        }

        if (result.evidence_id && result.metadata_hash_sha256 && result.sealed_at_utc) {
          testResults.push({
            test: 'Seal Draft',
            status: 'PASS',
            details: `evidence_id: ${result.evidence_id}, trust_level: ${result.trust_level}`,
            correlation_id: result.correlation_id
          });
          passed++;
          window.testEvidenceId = result.evidence_id;
        } else {
          throw new Error('Missing evidence_id or hashes');
        }
      } catch (error) {
        testResults.push({
          test: 'Seal Draft',
          status: 'FAIL',
          details: error.message,
          correlation_id: null
        });
        failed++;
      }
    }

    // Test 5: Immutability Check (attempt to update sealed draft)
    if (window.testDraftId) {
      try {
        const result = await Kernel.kernel_updateDraft(window.testDraftId, {
          why_this_evidence: 'Attempting to modify sealed draft'
        });

        if (result.error_code === 'DRAFT_SEALED') {
          testResults.push({
            test: 'Immutability Enforcement',
            status: 'PASS',
            details: 'Correctly blocked update to sealed draft',
            correlation_id: result.correlation_id
          });
          passed++;
        } else {
          throw new Error('Sealed draft was modified - immutability VIOLATED');
        }
      } catch (error) {
        testResults.push({
          test: 'Immutability Enforcement',
          status: 'FAIL',
          details: error.message,
          correlation_id: null
        });
        failed++;
      }
    }

    // Test 6: Method-Dataset Incompatibility
    try {
      const result = await Kernel.kernel_createDraft({
        ingestion_method: 'MANUAL_ENTRY',
        source_system: 'TEST_SYSTEM',
        dataset_type: 'EMISSIONS_DATA', // Incompatible with MANUAL_ENTRY
        declared_scope: 'ENTIRE_ORGANIZATION',
        why_this_evidence: 'Test incompatibility validation',
        purpose_tags: ['COMPLIANCE_TEST'],
        retention_policy: 'STANDARD_7_YEARS',
        contains_personal_data: false
      });

      if (result.error_code === 'VALIDATION_FAILED') {
        testResults.push({
          test: 'Method-Dataset Compatibility',
          status: 'PASS',
          details: 'Correctly rejected incompatible combination',
          correlation_id: result.correlation_id
        });
        passed++;
      } else {
        throw new Error('Should reject MANUAL_ENTRY + EMISSIONS_DATA');
      }
    } catch (error) {
      testResults.push({
        test: 'Method-Dataset Compatibility',
        status: 'FAIL',
        details: error.message,
        correlation_id: null
      });
      failed++;
    }

    const finishTime = new Date().toISOString();
    const totalTests = passed + failed;
    const passRate = Math.round((passed / totalTests) * 100);

    setSummary({
      run_id: runId,
      started_at: startTime,
      finished_at: finishTime,
      total_tests: totalTests,
      passed,
      failed,
      pass_rate: passRate,
      status: failed === 0 ? 'PASS' : 'FAIL'
    });

    setResults(testResults);
    setRunning(false);

    // Store test run
    try {
      const { base44 } = await import('@/api/base44Client');
      await base44.entities.ContractTestRun.create({
        run_id: runId,
        suite_name: 'CONTRACT1_INGESTION_KERNEL',
        environment: 'TEST',
        started_at_utc: startTime,
        finished_at_utc: finishTime,
        triggered_by_user_id: (await base44.auth.me()).id,
        build_id: 'KERNEL_V1',
        pass_count: passed,
        fail_count: failed,
        total_tests: totalTests,
        pass_rate: passRate,
        status: failed === 0 ? 'PASS' : 'FAIL',
        results_json: testResults,
        results_hash_sha256: 'computed_on_backend',
        correlation_id_root: runId
      });
    } catch (e) {
      console.error('Failed to store test run:', e);
    }

    if (failed === 0) {
      toast.success('All tests passed', { description: `${passed}/${totalTests} tests passed` });
    } else {
      toast.error('Tests failed', { description: `${failed}/${totalTests} tests failed` });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Contract 1: Ingestion Kernel Tests</h2>
          <p className="text-sm text-slate-600 mt-1">Server-authoritative evidence pipeline validation</p>
        </div>
        <Button
          onClick={runTests}
          disabled={running}
          className="bg-[#86b027] hover:bg-[#86b027]/90 gap-2"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4" />
              Run Test Suite
            </>
          )}
        </Button>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-900 ml-2">
          <strong>Test Coverage:</strong> Draft creation, file attachment with SHA-256, snapshot retrieval, sealing with hashes, immutability enforcement, and compatibility validation.
        </AlertDescription>
      </Alert>

      {summary && (
        <Card className="bg-gradient-to-br from-slate-50 to-transparent border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Test Run Summary</span>
              <Badge className={summary.status === 'PASS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {summary.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-slate-900">{summary.total_tests}</div>
                <div className="text-xs text-slate-600">Total Tests</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-700">{summary.passed}</div>
                <div className="text-xs text-slate-600">Passed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-700">{summary.failed}</div>
                <div className="text-xs text-slate-600">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#86b027]">{summary.pass_rate}%</div>
                <div className="text-xs text-slate-600">Pass Rate</div>
              </div>
            </div>
            <div className="pt-3 border-t text-xs text-slate-600 space-y-1">
              <p>Run ID: <code className="font-mono text-slate-900">{summary.run_id}</code></p>
              <p>Started: {new Date(summary.started_at).toLocaleString()}</p>
              <p>Finished: {new Date(summary.finished_at).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900">Test Results</h3>
          {results.map((result, idx) => (
            <Card key={idx} className={`border-l-4 ${
              result.status === 'PASS' ? 'border-l-green-500 bg-green-50/30' : 'border-l-red-500 bg-red-50/30'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {result.status === 'PASS' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{result.test}</div>
                      <div className="text-sm text-slate-600 mt-1">{result.details}</div>
                      {result.correlation_id && (
                        <div className="text-xs text-slate-500 mt-2 font-mono">
                          Correlation ID: {result.correlation_id}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={
                    result.status === 'PASS' ? 'text-green-700 border-green-300' : 'text-red-700 border-red-300'
                  }>
                    {result.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results.length === 0 && !running && (
        <Card className="border-dashed border-2 border-slate-300">
          <CardContent className="p-12 text-center">
            <PlayCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">Click "Run Test Suite" to begin validation</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}