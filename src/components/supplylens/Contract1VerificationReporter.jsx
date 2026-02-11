import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, XCircle, Play, Copy, Download, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * CONTRACT 1 VERIFICATION REPORTER
 * Shows full audit trail with request/response payloads, server logs, correlation IDs
 */

export default function Contract1VerificationReporter() {
  const [loading, setLoading] = useState(false);
  const [verificationData, setVerificationData] = useState(null);
  const [idempotencyData, setIdempotencyData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const runFullVerification = async () => {
    setLoading(true);
    toast.loading('Running verification suite...');

    try {
      const res = await base44.functions.invoke('contract1VerificationHarness', {
        run_all_tests: true
      });

      if (res.data?.ok) {
        setVerificationData(res.data);
        toast.dismiss();
        toast.success('Verification complete');
      } else {
        toast.dismiss();
        toast.error(res.data?.error || 'Verification failed');
      }
    } catch (e) {
      toast.dismiss();
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const runIdempotencyProof = async () => {
    setLoading(true);
    toast.loading('Running idempotency tests...');

    try {
      const res = await base44.functions.invoke('contract1IdempotencyProof', {});

      if (res.data?.ok) {
        setIdempotencyData(res.data);
        toast.dismiss();
        toast.success('Idempotency tests complete');
      } else {
        toast.dismiss();
        toast.error(res.data?.error || 'Test failed');
      }
    } catch (e) {
      toast.dismiss();
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const renderTestResult = (test, key) => {
    const passed = test?.passed;
    const status = test?.status;
    const code = test?.error_code;

    return (
      <div key={key} className={`rounded-lg p-4 border ${passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-start gap-3">
          {passed ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="font-mono text-sm text-slate-900">{key}</p>
              <div className="flex items-center gap-2">
                <Badge className={passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {status || 'ERROR'}
                </Badge>
                {code && <Badge variant="outline" className="font-mono text-xs">{code}</Badge>}
              </div>
            </div>
            {test?.reason && <p className="text-sm text-slate-600 mb-2">{test.reason}</p>}
            {test?.response && (
              <pre className="bg-slate-100 rounded p-2 text-xs overflow-x-auto max-h-32">
                {JSON.stringify(test.response, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <CardHeader>
          <CardTitle className="text-lg">Contract 1 Verification & Proof Suite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Full audit trail with request/response payloads, server logs, and correlation IDs for all acceptance tests.
          </p>

          <div className="flex gap-2">
            <Button
              onClick={runFullVerification}
              disabled={loading}
              className="bg-[#86b027] hover:bg-[#86b027]/90 gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Full Verification
                </>
              )}
            </Button>

            <Button
              onClick={runIdempotencyProof}
              disabled={loading}
              variant="outline"
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Idempotency Proof
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* VERIFICATION RESULTS */}
      {verificationData && (
        <Card className="bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl border border-white/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Verification Results</CardTitle>
              <Badge className={
                Object.values(verificationData.results || {}).every(t => t?.passed)
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }>
                {Object.values(verificationData.results || {}).filter(t => t?.passed).length} / {Object.keys(verificationData.results || {}).length} PASS
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tests">Tests A1-A7</TabsTrigger>
                <TabsTrigger value="requests">HTTP Requests</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
                <TabsTrigger value="cleanup">Cleanup</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="pt-6">
                      <p className="text-xs text-slate-600">Request ID</p>
                      <p className="font-mono text-sm text-slate-900 truncate">{verificationData.request_id}</p>
                      <Button size="sm" variant="ghost" className="mt-2 w-full gap-1" onClick={() => copyToClipboard(verificationData.request_id)}>
                        <Copy className="w-3 h-3" /> Copy
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="pt-6">
                      <p className="text-xs text-slate-600">Tenant ID</p>
                      <p className="font-mono text-sm text-slate-900 truncate">{verificationData.tenant_id}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="pt-6">
                    <p className="text-xs text-slate-600 mb-4">Final Counts</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{verificationData.final_counts?.total_evidence || 0}</p>
                        <p className="text-xs text-slate-600">Total Evidence</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{verificationData.final_counts?.valid_evidence || 0}</p>
                        <p className="text-xs text-slate-600">Valid (not quarantined)</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{verificationData.final_counts?.sealed_evidence || 0}</p>
                        <p className="text-xs text-slate-600">Sealed</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-600">{verificationData.final_counts?.quarantined_evidence || 0}</p>
                        <p className="text-xs text-slate-600">Quarantined</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tests" className="space-y-3 max-h-96 overflow-y-auto">
                {Object.entries(verificationData.results || {}).map(([key, test]) =>
                  renderTestResult(test, key)
                )}
              </TabsContent>

              <TabsContent value="requests" className="space-y-3 max-h-96 overflow-y-auto">
                {verificationData.requests?.map((req, i) => (
                  <Card key={i} className="bg-slate-50 border-slate-200">
                    <CardContent className="pt-6">
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-600 font-medium">Test {req.test}</p>
                          <p className="font-mono text-xs text-slate-900">{req.method} {req.url}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600">Request Body</p>
                          <pre className="bg-slate-100 rounded p-2 text-xs overflow-x-auto max-h-24">
                            {JSON.stringify(req.request_body, null, 2)}
                          </pre>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs text-slate-600">Status</p>
                            <Badge className={req.http_status >= 400 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                              {req.http_status}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs text-slate-600">Error Code</p>
                            <Badge variant="outline" className="font-mono text-xs">{req.response_code}</Badge>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600">Response Body</p>
                          <pre className="bg-slate-100 rounded p-2 text-xs overflow-x-auto max-h-24">
                            {JSON.stringify(req.response_body, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(!verificationData.requests || verificationData.requests.length === 0) && (
                  <p className="text-sm text-slate-600">No request details captured</p>
                )}
              </TabsContent>

              <TabsContent value="logs" className="space-y-2">
                <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-xs overflow-x-auto max-h-96 overflow-y-auto">
                  {verificationData.server_log?.map((line, i) => (
                    <div key={i} className="text-slate-400">{line}</div>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => copyToClipboard(verificationData.server_log?.join('\n'))}>
                  <Download className="w-3 h-3" /> Export Logs
                </Button>
              </TabsContent>

              <TabsContent value="cleanup" className="space-y-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="pt-6">
                      <p className="text-xs text-slate-600 mb-3">Before Cleanup</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total Evidence:</span>
                          <span className="font-bold text-slate-900">{verificationData.before_cleanup?.total_evidence || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">TEST_FIXTURE:</span>
                          <span className="font-bold text-orange-600">{verificationData.before_cleanup?.test_fixture_count || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Invalid Retention:</span>
                          <span className="font-bold text-red-600">{verificationData.before_cleanup?.invalid_retention_count || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-6">
                      <p className="text-xs text-slate-600 mb-3">After Cleanup</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total Evidence:</span>
                          <span className="font-bold text-slate-900">{verificationData.after_cleanup?.total_evidence || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Valid (not quarantined):</span>
                          <span className="font-bold text-green-600">{verificationData.after_cleanup?.valid_evidence || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Quarantined:</span>
                          <span className="font-bold text-orange-600">{verificationData.after_cleanup?.quarantined_evidence || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <p className="text-sm font-medium text-blue-900 mb-3">Quarantined Evidence (Cleanup Results)</p>
                    <p className="text-2xl font-bold text-blue-600 mb-3">{verificationData.after_cleanup_quarantine?.quarantined_count || 0} records</p>
                    {verificationData.after_cleanup_quarantine?.quarantined_ids?.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-100 rounded text-xs text-blue-900 font-mono space-y-1">
                        {verificationData.after_cleanup_quarantine.quarantined_ids.map((id, i) => (
                          <div key={i}>{id}</div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {verificationData.db_constraint_info && (
                  <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="pt-6">
                      <p className="text-sm font-medium text-slate-900 mb-3">Database Constraint</p>
                      <div className="space-y-2 text-sm font-mono text-slate-700">
                        <p><span className="text-slate-600">Constraint:</span> {verificationData.db_constraint_info.constraint_name}</p>
                        <p><span className="text-slate-600">Table:</span> {verificationData.db_constraint_info.table}</p>
                        <p><span className="text-slate-600">Purpose:</span> {verificationData.db_constraint_info.purpose}</p>
                        <p><span className="text-slate-600">Enforcement:</span> {verificationData.db_constraint_info.enforcement}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* IDEMPOTENCY RESULTS */}
      {idempotencyData && (
        <Card className="bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl border border-white/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Idempotency Proof</CardTitle>
              <Badge className={
                idempotencyData.tests?.test1_replay?.passed && idempotencyData.tests?.test2?.passed
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }>
                {idempotencyData.tests?.test1_replay?.passed ? '✓ Replay' : '✗ Replay'} {idempotencyData.tests?.test2?.passed ? '✓ Conflict' : '✗ Conflict'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-xs text-slate-600 mb-3">Test 1: Idempotent Replay (Same Payload)</p>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-600">First submission evidence_id:</span>
                  <span className="text-slate-900">{idempotencyData.tests?.test1_first?.evidence_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Replay evidence_id:</span>
                  <span className="text-slate-900">{idempotencyData.tests?.test1_replay?.evidence_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Match:</span>
                  <span className={idempotencyData.tests?.test1_replay?.match ? 'text-green-600 font-bold' : 'text-red-600'}>
                    {idempotencyData.tests?.test1_replay?.match ? '✓ YES (Idempotent)' : '✗ NO (ERROR)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-xs text-slate-600 mb-3">Test 2: Conflict Detection (Different Payload, Same Key)</p>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-600">Status:</span>
                  <Badge className="bg-orange-100 text-orange-800">{idempotencyData.tests?.test2?.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Error Code:</span>
                  <span className="text-slate-900">{idempotencyData.tests?.test2?.error_code}</span>
                </div>
                {idempotencyData.tests?.test2?.existing_evidence_id && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Existing evidence_id:</span>
                    <span className="text-slate-900 truncate">{idempotencyData.tests?.test2?.existing_evidence_id}</span>
                  </div>
                )}
              </div>
            </div>

            {idempotencyData.constraint && (
              <div className={`rounded-lg p-4 border ${idempotencyData.constraint?.verified ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <p className="text-xs text-slate-600 mb-2">DB Unique Constraint Verification</p>
                <p className="text-sm font-medium">{idempotencyData.constraint?.message}</p>
                <p className="text-xs text-slate-600 mt-2">Records with same (tenant, dataset_type, external_reference_id): {idempotencyData.constraint?.count}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}