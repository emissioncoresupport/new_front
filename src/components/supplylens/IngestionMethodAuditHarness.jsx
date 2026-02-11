import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, PlayCircle, AlertTriangle } from 'lucide-react';
import { INGESTION_METHODS, SCOPE_TYPES, validateStep, canProceedToNextStep } from './utils/ingestionMethodRegistry';

export default function IngestionMethodAuditHarness({ onClose }) {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState({ total: 0, passed: 0, failed: 0 });

  const runAudit = () => {
    setRunning(true);
    const testResults = [];
    let passed = 0;
    let failed = 0;

    const methods = Object.keys(INGESTION_METHODS);
    const evidenceTypes = ['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM', 'CERTIFICATE'];
    const scopes = ['SUPPLIER', 'SKU', 'UNKNOWN'];
    const channels = ['INTERNAL_USER', 'SUPPLIER'];
    const modes = ['simulation', 'production'];

    methods.forEach(method => {
      const config = INGESTION_METHODS[method];

      evidenceTypes.forEach(evidenceType => {
        // Skip if not allowed
        if (!config.allowedEvidenceTypes.includes(evidenceType)) return;

        scopes.forEach(scope => {
          // Skip if not allowed
          if (!config.allowedScopeTypes.includes(scope)) return;

          channels.forEach(channel => {
            modes.forEach(mode => {
              const scenario = { method, evidenceType, scope, channel, mode };
              const scenarioTests = [];

              // Test 1: Validate Step 1 required fields
              const step1Draft = {
                evidence_type: evidenceType,
                declared_scope: scope,
                scope_target: scope !== 'UNKNOWN' ? 'test-target-123' : undefined,
                why_this_evidence: 'This is a test purpose explanation for audit validation compliance check',
                purpose_tags: ['COMPLIANCE'],
                retention_policy: 'STANDARD_7_YEARS',
                contains_personal_data: false,
                submission_channel: channel
              };

              const step1Validation = validateStep(method, 1, step1Draft);
              scenarioTests.push({
                test: 'Step 1 Required Fields',
                passed: step1Validation.valid,
                errors: step1Validation.errors
              });

              // Test 2: Forbidden fields must not affect validation
              const step1WithForbidden = { ...step1Draft };
              config.forbiddenFields.forEach(field => {
                step1WithForbidden[field] = 'should-be-ignored';
              });
              const forbiddenValidation = validateStep(method, 1, step1WithForbidden);
              scenarioTests.push({
                test: 'Forbidden Fields Ignored',
                passed: forbiddenValidation.valid,
                errors: forbiddenValidation.errors
              });

              // Test 3: Step gating (Step 1 to Step 2)
              const canProceed = canProceedToNextStep(method, 1, step1Draft);
              scenarioTests.push({
                test: 'Step 1 to Step 2 Gating',
                passed: canProceed,
                errors: canProceed ? [] : ['Cannot proceed to Step 2']
              });

              // Test 4: Step 2 required fields
              const step2Draft = { ...step1Draft };
              if (method === 'MANUAL_ENTRY') {
                step2Draft.attestation_notes = 'This is a manual entry attestation note for testing purposes';
                step2Draft.payload_data_json = { test: 'data' };
              } else if (method === 'API_PUSH_DIGEST') {
                step2Draft.external_reference_id = 'test-ref-123';
                step2Draft.payload_digest_sha256 = 'a'.repeat(64);
                step2Draft.received_at_utc = new Date().toISOString();
              } else if (method === 'ERP_EXPORT_FILE') {
                step2Draft.snapshot_datetime_utc = new Date().toISOString();
                step2Draft.erp_instance_name = 'SAP-PROD';
              } else if (method === 'ERP_API_PULL') {
                step2Draft.connector_id = 'connector-123';
                step2Draft.snapshot_datetime_utc = new Date().toISOString();
                step2Draft.sync_run_id = 'sync-456';
              }

              const mockAttachments = (method === 'FILE_UPLOAD' || method === 'ERP_EXPORT_FILE') 
                ? [{ id: '1', file_name: 'test.pdf', sha256: 'abc123' }] 
                : [];

              const step2Validation = validateStep(method, 2, step2Draft, mockAttachments);
              scenarioTests.push({
                test: 'Step 2 Required Fields',
                passed: step2Validation.valid,
                errors: step2Validation.errors
              });

              // Test 5: Hash consistency
              const hashConfig = config.hashBehavior;
              scenarioTests.push({
                test: 'Hash Behavior Defined',
                passed: !!hashConfig.computedBy && !!hashConfig.source,
                errors: !hashConfig.computedBy ? ['Hash behavior not defined'] : []
              });

              // Test 6: No "Supplier Portal" in method name
              scenarioTests.push({
                test: 'No "Supplier Portal" Method',
                passed: !config.label.includes('Supplier Portal') && method !== 'SUPPLIER_PORTAL',
                errors: config.label.includes('Supplier Portal') ? ['Supplier Portal found in method'] : []
              });

              const scenarioPassed = scenarioTests.every(t => t.passed);
              if (scenarioPassed) passed++;
              else failed++;

              testResults.push({
                scenario,
                tests: scenarioTests,
                passed: scenarioPassed
              });
            });
          });
        });
      });
    });

    setResults(testResults);
    setSummary({ total: testResults.length, passed, failed });
    setRunning(false);
  };

  useEffect(() => {
    runAudit();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden glassmorphic-panel border-slate-200/60">
        <CardHeader className="border-b border-slate-200/60 bg-white/80">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-light text-slate-900">
                Ingestion Method Audit Results
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Contract 1 Correctness Validation
              </p>
            </div>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="glassmorphic-content rounded-lg border border-slate-200/60 p-4">
              <div className="text-sm text-slate-600">Total Scenarios</div>
              <div className="text-3xl font-light text-slate-900 mt-1">{summary.total}</div>
            </div>
            <div className="glassmorphic-content rounded-lg border border-slate-200/60 p-4">
              <div className="text-sm text-slate-600">Passed</div>
              <div className="text-3xl font-light text-green-600 mt-1">{summary.passed}</div>
            </div>
            <div className="glassmorphic-content rounded-lg border border-slate-200/60 p-4">
              <div className="text-sm text-slate-600">Failed</div>
              <div className="text-3xl font-light text-red-600 mt-1">{summary.failed}</div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-3">
            {results.map((result, idx) => (
              <div 
                key={idx} 
                className={`glassmorphic-content rounded-lg border p-4 ${
                  result.passed ? 'border-green-200/60' : 'border-red-200/60'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {result.passed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-medium text-slate-900">
                        {result.scenario.method}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Badge variant="outline">{result.scenario.evidenceType}</Badge>
                      <Badge variant="outline">{result.scenario.scope}</Badge>
                      <Badge variant="outline">{result.scenario.channel}</Badge>
                      <Badge variant="outline">{result.scenario.mode}</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {result.tests.map((test, testIdx) => (
                    <div key={testIdx} className="flex items-start gap-2 text-sm">
                      {test.passed ? (
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="text-slate-900">{test.test}</div>
                        {test.errors.length > 0 && (
                          <div className="text-xs text-red-600 mt-1">
                            {test.errors.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Registry Summary */}
          <div className="mt-8 glassmorphic-content rounded-lg border border-slate-200/60 p-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Method Registry</h3>
            <div className="space-y-4">
              {Object.entries(INGESTION_METHODS).map(([key, config]) => (
                <div key={key} className="border-l-2 border-[#86b027] pl-4">
                  <div className="font-medium text-slate-900">{config.label}</div>
                  <div className="text-xs text-slate-600 mt-1">{config.description}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-slate-100 text-slate-700 text-xs">
                      Trust: {config.defaults.trust_level}
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-700 text-xs">
                      Hash: {config.hashBehavior.source}
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-700 text-xs">
                      Attachments: {config.hashBehavior.requiresAttachments ? 'Required' : 'Optional'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}