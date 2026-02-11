import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, AlertCircle, FileText, Database, Code, Globe, User, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const INGESTION_METHODS = [
  {
    method: 'MANUAL_ENTRY',
    icon: User,
    color: 'amber',
    required: ['source_system=INTERNAL_MANUAL', 'entry_notes', 'dataset_type', 'declared_scope', 'primary_intent', 'purpose_tags', 'retention_policy'],
    serverRules: ['source_system forced to INTERNAL_MANUAL', 'entry_notes required', 'No file upload allowed']
  },
  {
    method: 'FILE_UPLOAD',
    icon: Upload,
    color: 'blue',
    required: ['file or payload_bytes', 'dataset_type', 'declared_scope', 'primary_intent', 'purpose_tags', 'retention_policy'],
    serverRules: ['File metadata captured in metadata_hash', 'Accept upload or paste payload']
  },
  {
    method: 'API_PUSH',
    icon: Code,
    color: 'indigo',
    required: ['external_reference_id (idempotency)', 'dataset_type', 'declared_scope', 'primary_intent', 'purpose_tags', 'retention_policy'],
    serverRules: ['external_reference_id REQUIRED', 'Idempotency check: same key + payload = replay', 'No file upload UI']
  },
  {
    method: 'ERP_EXPORT',
    icon: Database,
    color: 'purple',
    required: ['snapshot_datetime_utc', 'file upload', 'dataset_type', 'declared_scope', 'primary_intent', 'purpose_tags', 'retention_policy'],
    serverRules: ['snapshot_datetime_utc REQUIRED', 'File upload mandatory', 'Batch export semantics']
  },
  {
    method: 'ERP_API',
    icon: Database,
    color: 'violet',
    required: ['snapshot_datetime_utc', 'connector_reference', 'dataset_type', 'declared_scope', 'primary_intent', 'purpose_tags', 'retention_policy'],
    serverRules: ['snapshot_datetime_utc REQUIRED', 'connector_reference REQUIRED', 'Server-side fetch ONLY', 'No client payload accepted', 'Credentials never in payload/logs']
  },
  {
    method: 'SUPPLIER_PORTAL',
    icon: Globe,
    color: 'green',
    required: ['supplier_portal_request_id', 'dataset_type', 'declared_scope', 'primary_intent', 'purpose_tags', 'retention_policy'],
    serverRules: ['supplier_portal_request_id REQUIRED', 'Bind to supplier identity', 'Origin must be SUPPLIER_PORTAL', 'No manual upload/paste']
  }
];

export default function IngestionMethodQA() {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState({});
  const [sealingMethod, setSealingMethod] = useState(null);

  const runTestIngestion = async (method) => {
    const requestId = crypto.randomUUID();
    const correlationId = `QA_${method}_${Date.now()}`;
    setLoading({ ...loading, [method]: true });

    try {
      // Build test payload based on method
      const basePayload = {
        origin: 'TEST_FIXTURE',
        ingestion_method: method,
        source_system: method === 'MANUAL_ENTRY' ? 'INTERNAL_MANUAL' : (method === 'SUPPLIER_PORTAL' ? 'SUPPLIER_PORTAL' : 'OTHER'),
        dataset_type: 'QA_TEST',
        declared_scope: 'UNKNOWN',
        primary_intent: `QA harness test for ${method} ingestion method - automated validation`,
        purpose_tags: ['AUDIT'],
        contains_personal_data: false,
        retention_policy: 'STANDARD_1_YEAR',
        payload_bytes: JSON.stringify({ correlation: correlationId, test: true }),
        request_id: requestId,
        correlation_id: correlationId
      };

      // Add method-specific fields
      if (method === 'API_PUSH') basePayload.external_reference_id = correlationId;
      if (method === 'ERP_EXPORT') basePayload.snapshot_datetime_utc = new Date().toISOString();
      if (method === 'ERP_API') {
        basePayload.snapshot_datetime_utc = new Date().toISOString();
        basePayload.connector_reference = 'QA_CONNECTOR';
      }
      if (method === 'SUPPLIER_PORTAL') basePayload.supplier_portal_request_id = correlationId;
      if (method === 'MANUAL_ENTRY') basePayload.entry_notes = `QA test ingestion ${correlationId}`;

      const result = await base44.functions.invoke('ingestEvidenceDeterministic', basePayload);

      setTestResults({
        ...testResults,
        [method]: {
          status: 'PASS',
          correlation_id: correlationId,
          evidence_id: result.data.evidence_id,
          timestamp: new Date().toISOString()
        }
      });

      toast.success(`${method} test ingestion passed`, {
        description: `Evidence ID: ${result.data.evidence_id.substring(0, 12)}...`
      });
    } catch (error) {
      setTestResults({
        ...testResults,
        [method]: {
          status: 'FAIL',
          correlation_id: correlationId,
          error: error.response?.data?.message || error.message,
          error_code: error.response?.data?.error_code,
          timestamp: new Date().toISOString()
        }
      });

      toast.error(`${method} test failed`, {
        description: error.response?.data?.error_code || error.message
      });
    } finally {
      setLoading({ ...loading, [method]: false });
    }
  };

  const verifySealing = async (method) => {
    const result = testResults[method];
    if (!result?.evidence_id) {
      toast.error('No evidence to verify', { description: 'Run test ingestion first' });
      return;
    }

    setSealingMethod(method);

    try {
      // Try to seal
      const sealResult = await base44.functions.invoke('sealEvidenceV2_Explicit', {
        evidence_id: result.evidence_id,
        request_id: crypto.randomUUID()
      });

      // Try to update (should fail with 409)
      try {
        await base44.functions.invoke('updateEvidenceWithGuard', {
          evidence_id: result.evidence_id,
          tenant_id: 'TEST_TENANT',
          updates: { primary_intent: 'ATTEMPTED_MUTATION' }
        });
        
        toast.error('Immutability check failed', {
          description: 'SEALED evidence was updated'
        });
      } catch (updateError) {
        if (updateError.response?.status === 409 && updateError.response?.data?.error_code === 'SEALED_IMMUTABLE') {
          setTestResults({
            ...testResults,
            [method]: {
              ...result,
              seal_verified: true,
              seal_timestamp: new Date().toISOString()
            }
          });

          toast.success(`${method} sealing verified`, {
            description: '409 SEALED_IMMUTABLE returned correctly'
          });
        } else {
          toast.error('Unexpected error', {
            description: `Expected 409, got ${updateError.response?.status}`
          });
        }
      }
    } catch (error) {
      toast.error(`Sealing failed`, {
        description: error.response?.data?.message || error.message
      });
    } finally {
      setSealingMethod(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Ingestion Method QA</h2>
        <p className="text-sm text-slate-600 mt-1">Entry-by-entry verification harness for regulator-grade compliance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {INGESTION_METHODS.map(({ method, icon: Icon, color, required, serverRules }) => {
          const result = testResults[method];
          
          return (
            <Card key={method} className="bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-${color}-50`}>
                      <Icon className={`w-5 h-5 text-${color}-600`} />
                    </div>
                    <CardTitle className="text-base">{method}</CardTitle>
                  </div>
                  {result && (
                    <Badge className={result.status === 'PASS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {result.status}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Required Fields */}
                <div>
                  <p className="text-xs font-medium text-slate-700 mb-2">Required Metadata:</p>
                  <div className="space-y-1">
                    {required.map((field, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        <span>{field}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Server Rules */}
                <div>
                  <p className="text-xs font-medium text-slate-700 mb-2">Server-Side Rules:</p>
                  <div className="space-y-1">
                    {serverRules.map((rule, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Test Result */}
                {result && (
                  <div className="bg-slate-50 rounded p-3 text-xs space-y-1">
                    <div className="font-mono">Correlation: {result.correlation_id}</div>
                    {result.evidence_id && (
                      <div className="font-mono">Evidence: {result.evidence_id.substring(0, 12)}...</div>
                    )}
                    {result.seal_verified && (
                      <div className="text-green-600 font-medium">✓ Seal verified (409 SEALED_IMMUTABLE)</div>
                    )}
                    {result.error && (
                      <div className="text-red-600">{result.error_code}: {result.error}</div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => runTestIngestion(method)}
                    disabled={loading[method]}
                    className="flex-1"
                  >
                    {loading[method] ? 'Testing...' : 'Create Test Ingestion'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => verifySealing(method)}
                    disabled={!result?.evidence_id || sealingMethod === method}
                    className="flex-1"
                  >
                    {sealingMethod === method ? 'Verifying...' : 'Verify Sealing'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Verification Checklist */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm text-blue-900">How to Verify Contract 1 Compliance</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-blue-900 space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5" />
            <span>Run test ingestion for each method → verify 201 response with evidence_id</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5" />
            <span>Verify sealing → check 409 SEALED_IMMUTABLE on update attempt</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5" />
            <span>Check correlation_id in audit logs for full lifecycle trace</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5" />
            <span>Export audit bundle → verify hashes, state transitions, no credentials</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5" />
            <span>In Evidence Vault → toggle views to confirm quarantine/fixture isolation</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}