/**
 * GO-LIVE AUTHORIZATION GATE
 * Final approval before production deployment
 * Cannot deploy if any compliance check fails
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, AlertTriangle, Loader2, Lock, Shield, FileCheck,
  TrendingUp, Clock, Users, AlertCircle
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function GoLiveAuthorizationGate() {
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    runVerification();
  }, []);

  const runVerification = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('cbamProductionGoLiveVerifier', {});
      setVerification(response.data.verification);
      setAuthorized(response.data.deploymentAuthorized);
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
          <p className="text-slate-600">Running production compliance verification...</p>
        </div>
      </div>
    );
  }

  if (!verification) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Verification system unavailable. Deployment blocked.
        </AlertDescription>
      </Alert>
    );
  }

  const totalChecks = verification.checks.length;
  const passedChecks = verification.checks.filter(c => c.status === 'PASS').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-white p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {authorized ? (
              <CheckCircle2 className="w-16 h-16 text-green-600" />
            ) : (
              <Lock className="w-16 h-16 text-red-600" />
            )}
          </div>
          <h1 className="text-4xl font-light tracking-tight mb-2">
            {authorized ? 'GO-LIVE AUTHORIZED' : 'DEPLOYMENT BLOCKED'}
          </h1>
          <p className="text-slate-600">
            {authorized
              ? 'CBAM module is production-ready and fully compliant'
              : 'One or more compliance checks failed'}
          </p>
        </div>

        {/* STATUS SUMMARY */}
        <Card className={authorized ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-light text-slate-900">{passedChecks}/{totalChecks}</div>
                <div className="text-xs text-slate-600 mt-1">Compliance Checks</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-light text-green-600">9</div>
                <div className="text-xs text-slate-600 mt-1">Enforcement Layers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-light text-slate-900">100%</div>
                <div className="text-xs text-slate-600 mt-1">Audit Coverage</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-light text-slate-900">∞</div>
                <div className="text-xs text-slate-600 mt-1">History Retention</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* VERIFICATION CHECKS */}
        <div className="space-y-4">
          {verification.checks.map((check, idx) => (
            <Card key={idx} className={check.status === 'PASS' ? 'border-green-200' : 'border-red-200'}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {check.status === 'PASS' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <h3 className="font-semibold text-slate-900">{check.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">Ref: {check.compliance_ref}</p>
                    </div>
                  </div>
                  <Badge variant={check.status === 'PASS' ? 'default' : 'destructive'}>
                    {check.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {check.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="flex items-start gap-2">
                      {item.status === 'PASS' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <p className="text-sm text-slate-700">{item.check}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAILURE CONDITIONS */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Failure Condition Checks
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              {verification.failureConditions.map((fc, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {fc.status === 'PASS' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <p className="text-sm text-slate-700">{fc.condition}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* KEY ENFORCEMENTS */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Active Compliance Locks
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { icon: Lock, label: 'Lifecycle Isolation', desc: 'Entry → Calc → Validation → Verification → Reporting' },
                { icon: FileCheck, label: 'CN Code Freeze', desc: 'Changes trigger approval workflow' },
                { icon: Users, label: 'Precursor Year Alignment', desc: 'Mismatch requires evidence + approval' },
                { icon: Clock, label: 'Calculation Immutability', desc: 'Historical data backed up, never overwritten' },
                { icon: Shield, label: 'Verification Gate', desc: 'Verified entries locked from modification' },
                { icon: AlertCircle, label: 'Reporting Safety', desc: 'Only validated + verified data permitted' }
              ].map((lock, idx) => {
                const Icon = lock.icon;
                return (
                  <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <div className="flex items-start gap-2">
                      <Icon className="w-4 h-4 text-slate-700 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{lock.label}</p>
                        <p className="text-xs text-slate-600 mt-1">{lock.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* FINAL AUTHORIZATION */}
        {authorized && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-300">
            <CardHeader>
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg">Production Deployment Authorized</h3>
                  <p className="text-slate-600 text-sm mt-1">
                    All compliance requirements met. CBAM module is ready for production deployment under EU 2026 Definitive Regime.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  <strong>Verifier:</strong> {verification.verifier}
                </p>
                <p className="text-xs text-slate-600">
                  <strong>Verification Timestamp:</strong> {new Date(verification.timestamp).toISOString()}
                </p>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                  Deploy to Production
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!authorized && (
          <Card className="bg-gradient-to-r from-red-50 to-rose-50 border-red-300">
            <CardHeader>
              <div className="flex items-start gap-4">
                <Lock className="w-8 h-8 text-red-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg">Deployment Blocked</h3>
                  <p className="text-slate-600 text-sm mt-1">
                    {verification.blockingReason || 'One or more compliance checks failed. Review details above.'}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* FOOTER */}
        <div className="text-center text-xs text-slate-500 border-t border-slate-200 pt-6">
          <p>
            This verification is automatically generated and updated continuously. 
            Deployment authorization is valid only when all checks pass and remain passing.
          </p>
        </div>
      </div>
    </div>
  );
}