import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * MANUAL_ENTRY Validation Dashboard
 * Interactive testing of all regulator-grade requirements
 */

const TEST_CASES = [
  {
    id: 'M01_SOURCE_FORCED',
    name: 'M01: source_system forced to INTERNAL_MANUAL',
    payload: () => ({
      origin: 'USER_SUBMITTED',
      ingestion_method: 'MANUAL_ENTRY',
      source_system: 'SAP', // Should be overridden
      dataset_type: 'TEST',
      declared_scope: 'ENTIRE_ORGANIZATION',
      primary_intent: 'Testing source_system enforcement for MANUAL_ENTRY - should override SAP to INTERNAL_MANUAL',
      purpose_tags: ['AUDIT'],
      contains_personal_data: false,
      retention_policy: 'STANDARD_1_YEAR',
      payload_bytes: JSON.stringify({ field: 'value', verified: true }),
      entry_notes: 'Testing that source_system is forced to INTERNAL_MANUAL regardless of client input',
      request_id: `m01_${Date.now()}`
    }),
    validate: async (res, base44) => {
      const ev = await base44.entities.Evidence.filter({ evidence_id: res.data.evidence_id });
      return {
        pass: ev[0]?.source_system === 'INTERNAL_MANUAL',
        msg: `source_system = ${ev[0]?.source_system} (expected INTERNAL_MANUAL)`
      };
    }
  },
  {
    id: 'M02_MISSING_REQUEST_ID',
    name: 'M02: missing request_id returns 422',
    payload: () => ({
      origin: 'USER_SUBMITTED',
      ingestion_method: 'MANUAL_ENTRY',
      source_system: 'INTERNAL_MANUAL',
      dataset_type: 'TEST',
      declared_scope: 'ENTIRE_ORGANIZATION',
      primary_intent: 'Testing request_id requirement',
      purpose_tags: ['AUDIT'],
      contains_personal_data: false,
      retention_policy: 'STANDARD_1_YEAR',
      payload_bytes: JSON.stringify({ test: 'data' }),
      entry_notes: 'Testing that missing request_id triggers validation error'
      // request_id intentionally missing
    }),
    expectError: true,
    validate: (error) => ({
      pass: error.response?.status === 422 && error.response?.data?.error_code === 'MISSING_REQUIRED_METADATA',
      msg: `${error.response?.status} ${error.response?.data?.error_code}`
    })
  },
  {
    id: 'M03_SCOPE_TARGET_REQUIRED',
    name: 'M03: LEGAL_ENTITY scope requires scope_target_id',
    payload: () => ({
      origin: 'USER_SUBMITTED',
      ingestion_method: 'MANUAL_ENTRY',
      source_system: 'INTERNAL_MANUAL',
      dataset_type: 'TEST',
      declared_scope: 'LEGAL_ENTITY',
      // scope_target_id missing
      primary_intent: 'Testing scope target validation',
      purpose_tags: ['AUDIT'],
      contains_personal_data: false,
      retention_policy: 'STANDARD_1_YEAR',
      payload_bytes: JSON.stringify({ test: 'scope' }),
      entry_notes: 'Testing that LEGAL_ENTITY scope requires scope_target_id',
      request_id: `m03_${Date.now()}`
    }),
    expectError: true,
    validate: (error) => ({
      pass: error.response?.status === 422 && error.response?.data?.error_code === 'MISSING_SCOPE_TARGET_ID',
      msg: `${error.response?.status} ${error.response?.data?.error_code}`
    })
  },
  {
    id: 'M04_FREE_TEXT_REJECTED',
    name: 'M04: free text "ZUK Motion" rejected',
    payload: () => ({
      origin: 'USER_SUBMITTED',
      ingestion_method: 'MANUAL_ENTRY',
      source_system: 'INTERNAL_MANUAL',
      dataset_type: 'SUPPLIER_MASTER',
      declared_scope: 'ENTIRE_ORGANIZATION',
      primary_intent: 'Testing free text rejection for MANUAL_ENTRY payload validation',
      purpose_tags: ['AUDIT'],
      contains_personal_data: false,
      retention_policy: 'STANDARD_1_YEAR',
      payload_bytes: 'ZUK Motion', // Free text, not JSON
      entry_notes: 'Testing that free text like "ZUK Motion" is rejected - only JSON objects allowed',
      request_id: `m04_${Date.now()}`
    }),
    expectError: true,
    validate: (error) => ({
      pass: error.response?.status === 422 && error.response?.data?.error_code === 'INVALID_PAYLOAD',
      msg: `${error.response?.status} ${error.response?.data?.error_code}: ${error.response?.data?.message}`
    })
  },
  {
    id: 'M05_JSON_OBJECT_REQUIRED',
    name: 'M05: payload must be JSON object (not primitive)',
    payload: () => ({
      origin: 'USER_SUBMITTED',
      ingestion_method: 'MANUAL_ENTRY',
      source_system: 'INTERNAL_MANUAL',
      dataset_type: 'TEST',
      declared_scope: 'ENTIRE_ORGANIZATION',
      primary_intent: 'Testing JSON object requirement for MANUAL_ENTRY',
      purpose_tags: ['AUDIT'],
      contains_personal_data: false,
      retention_policy: 'STANDARD_1_YEAR',
      payload_bytes: '"just a string"', // JSON string primitive, not object
      entry_notes: 'Testing that JSON primitives are rejected - only objects allowed',
      request_id: `m05_${Date.now()}`
    }),
    expectError: true,
    validate: (error) => ({
      pass: error.response?.status === 422 && error.response?.data?.error_code === 'INVALID_PAYLOAD',
      msg: `${error.response?.status} ${error.response?.data?.error_code}`
    })
  },
  {
    id: 'M06_PLACEHOLDER_REJECTED',
    name: 'M06: placeholder values rejected',
    payload: () => ({
      origin: 'USER_SUBMITTED',
      ingestion_method: 'MANUAL_ENTRY',
      source_system: 'INTERNAL_MANUAL',
      dataset_type: 'SUPPLIER_MASTER',
      declared_scope: 'ENTIRE_ORGANIZATION',
      primary_intent: 'Testing placeholder value rejection',
      purpose_tags: ['AUDIT'],
      contains_personal_data: false,
      retention_policy: 'STANDARD_1_YEAR',
      payload_bytes: JSON.stringify({ supplier_name: 'test', country_code: 'DE' }), // 'test' is placeholder
      entry_notes: 'Testing that placeholder values like "test" are rejected',
      request_id: `m06_${Date.now()}`
    }),
    expectError: true,
    validate: (error) => ({
      pass: error.response?.status === 422 && error.response?.data?.message?.includes('Placeholder value'),
      msg: `${error.response?.status}: ${error.response?.data?.message}`
    })
  },
  {
    id: 'M07_ATTESTATION_CAPTURED',
    name: 'M07: attestation captured server-side',
    payload: () => ({
      origin: 'USER_SUBMITTED',
      ingestion_method: 'MANUAL_ENTRY',
      source_system: 'INTERNAL_MANUAL',
      dataset_type: 'TEST',
      declared_scope: 'ENTIRE_ORGANIZATION',
      primary_intent: 'Testing server-side attestation capture from authenticated user session',
      purpose_tags: ['AUDIT'],
      contains_personal_data: false,
      retention_policy: 'STANDARD_1_YEAR',
      payload_bytes: JSON.stringify({ attestation: 'server_side_test', data: 'value' }),
      entry_notes: 'Testing that attestor_user_id, email, method, and timestamp are captured server-side',
      request_id: `m07_${Date.now()}`
    }),
    validate: async (res, base44, user) => {
      const ev = await base44.entities.Evidence.filter({ evidence_id: res.data.evidence_id });
      const record = ev[0];
      const pass = record?.attestor_user_id === user.id &&
                   record?.attested_by_email === user.email &&
                   record?.attestation_method === 'MANUAL_ENTRY' &&
                   !!record?.attested_at_utc;
      return {
        pass,
        msg: pass ? 'Attestation fully captured' : 'Missing attestation fields'
      };
    }
  },
  {
    id: 'M08_TRUST_LEVEL_LOW',
    name: 'M08: trust_level = LOW, review_status = PENDING_REVIEW',
    payload: () => ({
      origin: 'USER_SUBMITTED',
      ingestion_method: 'MANUAL_ENTRY',
      source_system: 'INTERNAL_MANUAL',
      dataset_type: 'SUPPLIER_MASTER',
      declared_scope: 'ENTIRE_ORGANIZATION',
      primary_intent: 'Testing trust level assignment for MANUAL_ENTRY',
      purpose_tags: ['COMPLIANCE'],
      contains_personal_data: false,
      retention_policy: '3_YEARS',
      payload_bytes: JSON.stringify({ supplier_name: 'Verified Corp', country_code: 'FR', primary_contact_email: 'contact@verified.fr' }),
      entry_notes: 'Testing that MANUAL_ENTRY automatically gets LOW trust_level and PENDING_REVIEW status',
      request_id: `m08_${Date.now()}`
    }),
    validate: (res) => ({
      pass: res.data.trust_level === 'LOW' && res.data.review_status === 'PENDING_REVIEW',
      msg: `trust=${res.data.trust_level}, review=${res.data.review_status}`
    })
  }
];

export default function Contract1ManualEntryValidation() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const runTest = async (testCase) => {
    setLoading({ ...loading, [testCase.id]: true });
    
    try {
      const payload = testCase.payload();
      
      if (testCase.expectError) {
        // Expecting error
        try {
          const res = await base44.functions.invoke('ingestEvidenceDeterministic', payload);
          setResults({ ...results, [testCase.id]: { pass: false, msg: 'Expected error but got success', data: res.data } });
        } catch (e) {
          const validation = testCase.validate(e);
          setResults({ ...results, [testCase.id]: { ...validation, error: e.response?.data } });
        }
      } else {
        // Expecting success
        const res = await base44.functions.invoke('ingestEvidenceDeterministic', payload);
        const validation = await testCase.validate(res, base44, user);
        setResults({ ...results, [testCase.id]: { ...validation, data: res.data } });
      }
    } catch (e) {
      if (!testCase.expectError) {
        setResults({ ...results, [testCase.id]: { pass: false, msg: e.response?.data?.message || e.message, error: e.response?.data } });
      }
    } finally {
      setLoading({ ...loading, [testCase.id]: false });
    }
  };

  const runAllTests = async () => {
    for (const testCase of TEST_CASES) {
      await runTest(testCase);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    toast.success('All tests completed');
  };

  const passedCount = Object.values(results).filter(r => r?.pass).length;
  const totalRun = Object.keys(results).length;

  return (
    <Card className="bg-white/90 backdrop-blur-lg border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-900">🎯 MANUAL_ENTRY Regulator-Grade Validation</CardTitle>
          <div className="flex items-center gap-3">
            {totalRun > 0 && (
              <Badge className={passedCount === TEST_CASES.length ? 'bg-green-600' : 'bg-amber-600'}>
                {passedCount}/{TEST_CASES.length} PASS
              </Badge>
            )}
            <Button onClick={runAllTests} size="sm" className="bg-[#86b027] hover:bg-[#86b027]/90">
              <Sparkles className="w-4 h-4 mr-2" />
              Run All Tests
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {TEST_CASES.map(testCase => {
          const result = results[testCase.id];
          const isLoading = loading[testCase.id];

          return (
            <div 
              key={testCase.id}
              className={`p-3 rounded-lg border ${
                !result ? 'bg-slate-50 border-slate-200' :
                result.pass ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  {!result ? (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0 mt-0.5" />
                  ) : result.pass ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{testCase.name}</p>
                    {result && (
                      <div className="mt-1 text-xs text-slate-700">
                        <p className="font-mono">{result.msg}</p>
                        {result.error && (
                          <pre className="mt-2 bg-slate-100 p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(result.error, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => runTest(testCase)}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-shrink-0"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
                </Button>
              </div>
            </div>
          );
        })}

        <div className="pt-3 border-t text-xs text-slate-600">
          <p className="font-medium mb-1">Contract 1 MANUAL_ENTRY Requirements:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>source_system server-forced to INTERNAL_MANUAL</li>
            <li>Payload must be valid JSON object (no free text)</li>
            <li>Placeholder values rejected ("test", "asdf", etc.)</li>
            <li>Attestation captured from auth session (server-side only)</li>
            <li>trust_level = LOW, review_status = PENDING_REVIEW</li>
            <li>UNKNOWN scope triggers quarantine + resolution deadline</li>
            <li>All validation errors return 4xx (never 500)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}