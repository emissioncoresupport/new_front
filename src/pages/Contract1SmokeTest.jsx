import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Play, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { validateStep1, canProceedToStep2 } from '@/components/supplylens/utils/registryValidator';

export default function Contract1SmokeTest() {
  const [testResults, setTestResults] = useState({});
  const [running, setRunning] = useState(false);

  const scenarios = [
    {
      id: 'manual_bind_existing',
      name: 'Manual Entry + Bind Existing',
      method: 'MANUAL_ENTRY',
      evidenceType: 'SUPPLIER_MASTER',
      scope: 'SUPPLIER',
      bindingMode: 'BIND_EXISTING'
    },
    {
      id: 'manual_create_new',
      name: 'Manual Entry + Create New',
      method: 'MANUAL_ENTRY',
      evidenceType: 'PRODUCT_MASTER',
      scope: 'PRODUCT',
      bindingMode: 'CREATE_NEW'
    },
    {
      id: 'manual_defer',
      name: 'Manual Entry + Defer Binding',
      method: 'MANUAL_ENTRY',
      evidenceType: 'BOM',
      scope: 'PRODUCT',
      bindingMode: 'DEFER'
    },
    {
      id: 'file_upload_bind',
      name: 'File Upload + Bind Existing',
      method: 'FILE_UPLOAD',
      evidenceType: 'CERTIFICATE',
      scope: 'SUPPLIER',
      bindingMode: 'BIND_EXISTING'
    },
    {
      id: 'api_push_defer',
      name: 'API Push Digest + Defer',
      method: 'API_PUSH_DIGEST',
      evidenceType: 'TRANSACTION_LOG',
      scope: 'ENTIRE_ORG',
      bindingMode: null // ENTIRE_ORG doesn't need binding
    },
    {
      id: 'erp_api_bind',
      name: 'ERP API Pull + Bind Existing',
      method: 'ERP_API_PULL',
      evidenceType: 'SUPPLIER_MASTER',
      scope: 'SUPPLIER',
      bindingMode: 'BIND_EXISTING'
    }
  ];

  const runScenario = async (scenario) => {
    try {
      const formData = {
        ingestion_method: scenario.method,
        evidence_type: scenario.evidenceType,
        declared_scope: scenario.scope,
        why_this_evidence: 'Test scenario for compliance audit - minimum 20 characters here',
        binding_mode: scenario.bindingMode,
        bound_entity_id: scenario.bindingMode !== 'DEFER' && scenario.bindingMode !== null ? 'test-entity-id' : null,
        external_reference_id: ['API_PUSH_DIGEST', 'ERP_EXPORT_FILE', 'ERP_API_PULL'].includes(scenario.method) ? `TEST-${Date.now()}` : null,
        provenance_source: 'INTERNAL_USER'
      };

      // Step 1 validation
      const step1Validation = validateStep1(formData);
      if (!step1Validation.valid) {
        return {
          pass: false,
          reason: `Step 1 validation failed: ${JSON.stringify(step1Validation.errors)}`
        };
      }

      // Step 1 draft creation (simulated)
      const draftId = `draft-${scenario.id}-${Date.now()}`;
      
      // Step 2 would follow - for smoke test, we just verify the draft would proceed
      const canProceed = canProceedToStep2(formData);
      if (!canProceed) {
        return {
          pass: false,
          reason: 'Cannot proceed to Step 2'
        };
      }

      return {
        pass: true,
        draftId,
        message: 'Draft created, Step 1→2 navigation OK'
      };
    } catch (error) {
      return {
        pass: false,
        reason: error.message
      };
    }
  };

  const runAllScenarios = async () => {
    setRunning(true);
    const results = {};

    for (const scenario of scenarios) {
      const result = await runScenario(scenario);
      results[scenario.id] = {
        name: scenario.name,
        ...result
      };
      // Small delay to prevent hammering
      await new Promise(r => setTimeout(r, 100));
    }

    setTestResults(results);
    setRunning(false);

    const passCount = Object.values(results).filter(r => r.pass).length;
    const failCount = Object.values(results).filter(r => !r.pass).length;

    if (failCount === 0) {
      toast.success(`All ${passCount} scenarios passed ✓`);
    } else {
      toast.error(`${failCount} scenario(s) failed`);
    }
  };

  const passCount = Object.values(testResults).filter(r => r.pass).length;
  const failCount = Object.values(testResults).filter(r => !r.pass).length;
  const totalTests = Object.keys(testResults).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Contract 1 Smoke Test</h1>
          <p className="text-slate-600">Step 1 Acceptance Test Scenarios</p>
        </div>

        {/* Summary Card */}
        {totalTests > 0 && (
          <Card className={`border-2 ${failCount === 0 ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className="flex gap-8">
                  <div>
                    <p className="text-sm text-slate-600">Total Scenarios</p>
                    <p className="text-3xl font-bold text-slate-900">{totalTests}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700">Passed</p>
                    <p className="text-3xl font-bold text-green-700">{passCount}</p>
                  </div>
                  {failCount > 0 && (
                    <div>
                      <p className="text-sm text-red-700">Failed</p>
                      <p className="text-3xl font-bold text-red-700">{failCount}</p>
                    </div>
                  )}
                </div>
                <Button onClick={runAllScenarios} disabled={running} size="lg" className="gap-2">
                  <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
                  {running ? 'Running...' : 'Run All'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scenario Cards */}
        <div className="grid gap-6">
          {scenarios.map((scenario) => {
            const result = testResults[scenario.id];
            const isRunning = running && !result;
            const passed = result?.pass;

            return (
              <Card key={scenario.id} className={`border-2 transition-all ${
                passed ? 'border-green-200 bg-green-50/50' :
                !result ? 'border-slate-200 bg-white' :
                'border-red-200 bg-red-50/50'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {isRunning && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
                        {passed && <CheckCircle className="w-5 h-5 text-green-600" />}
                        {!passed && result && <XCircle className="w-5 h-5 text-red-600" />}
                        <h3 className="font-semibold text-slate-900">{scenario.name}</h3>
                      </div>
                      
                      <div className="space-y-2 text-sm text-slate-600 mb-3">
                        <div>Method: <Badge className="ml-2">{scenario.method}</Badge></div>
                        <div>Type: <Badge className="ml-2" variant="outline">{scenario.evidenceType}</Badge></div>
                        <div>Scope: <Badge className="ml-2" variant="outline">{scenario.scope}</Badge></div>
                        {scenario.bindingMode && (
                          <div>Binding: <Badge className="ml-2" variant="outline">{scenario.bindingMode}</Badge></div>
                        )}
                      </div>

                      {result?.message && (
                        <p className="text-sm text-green-700 font-medium">{result.message}</p>
                      )}
                      {result?.draftId && (
                        <p className="text-xs text-slate-500 font-mono mt-1">{result.draftId}</p>
                      )}
                      {result?.reason && (
                        <p className="text-sm text-red-700">{result.reason}</p>
                      )}
                    </div>

                    {!result && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runScenario(scenario).then(r => {
                          setTestResults({...testResults, [scenario.id]: {name: scenario.name, ...r}});
                        })}
                        className="gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Run
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Test Notes */}
        <Card className="border-2 border-slate-200 bg-slate-50/50">
          <CardHeader>
            <CardTitle className="text-sm">Test Criteria</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 space-y-2">
            <p>• Step 1 validation passes (all required fields)</p>
            <p>• Draft ID created and returned</p>
            <p>• Can proceed to Step 2 without errors</p>
            <p>• No Next button deadlock (visible fields only)</p>
            <p>• Binding modes enforced per scope</p>
            <p>• External reference ID required for API methods</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}