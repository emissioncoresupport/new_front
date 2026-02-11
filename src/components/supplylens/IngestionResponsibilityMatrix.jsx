import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export default function IngestionResponsibilityMatrix() {
  const base44Responsibilities = [
    { task: 'UI Flows', detail: 'Upload forms, bulk import wizards, portal interfaces', status: 'active' },
    { task: 'Context Capture', detail: 'Collecting declared_context from user', status: 'active' },
    { task: 'User Feedback', detail: 'Displaying outcomes, errors, progress', status: 'active' },
    { task: 'Pre-Validation', detail: 'Presence checks only (not semantics)', status: 'active' },
    { task: 'Blocking Unavailable Paths', detail: 'Disable UI if backend not ready', status: 'partial' },
    { task: 'Developer Console Link', detail: 'Show gaps and limitations', status: 'active' },
    { task: 'Request ID Generation', detail: 'Generate UUID for request_id', status: 'active' }
  ];

  const backendResponsibilities = [
    { task: 'Evidence Creation', detail: 'All Evidence records created here', status: 'missing', risk: 'CRITICAL' },
    { task: 'Hashing', detail: 'SHA-256 for files and declarations', status: 'missing', risk: 'HIGH' },
    { task: 'Validation', detail: 'Semantic, business rules, authorization', status: 'missing', risk: 'CRITICAL' },
    { task: 'Failure Materialization', detail: 'Create rejection Evidence when needed', status: 'missing', risk: 'HIGH' },
    { task: 'Determinism', detail: 'Same input → same output', status: 'missing', risk: 'CRITICAL' },
    { task: 'Replayability', detail: 'Idempotency guarantees', status: 'missing', risk: 'CRITICAL' },
    { task: 'State Machine', detail: 'Evidence state transitions', status: 'missing', risk: 'HIGH' },
    { task: 'Audit Trail', detail: 'All requests logged with outcomes', status: 'missing', risk: 'CRITICAL' }
  ];

  const forbidden = [
    { action: 'Base44 creates Evidence directly', reason: 'Backend is authoritative', current: 'VIOLATED', risk: 'CRITICAL' },
    { action: 'Base44 performs semantic validation', reason: 'Backend owns business rules', current: 'VIOLATED', risk: 'HIGH' },
    { action: 'Backend creates UI feedback', reason: 'Base44 owns presentation', current: 'OK', risk: 'LOW' },
    { action: 'Silent normalization', reason: 'Must be explicit and logged', current: 'VIOLATED', risk: 'CRITICAL' },
    { action: 'Implicit defaults', reason: 'All defaults must be documented', current: 'VIOLATED', risk: 'HIGH' }
  ];

  const getStatusIcon = (status) => {
    if (status === 'active') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (status === 'partial') return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getRiskBadge = (risk) => {
    const colors = {
      CRITICAL: 'bg-red-100 text-red-700 border-red-300',
      HIGH: 'bg-orange-100 text-orange-700 border-orange-300',
      MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      LOW: 'bg-blue-100 text-blue-700 border-blue-300'
    };
    return <Badge className={colors[risk]}>{risk}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-light text-slate-900 uppercase tracking-widest mb-1">Responsibility Matrix</h2>
        <p className="text-xs text-slate-600">Hard split between Base44 and Custom Ingestion Backend</p>
      </div>

      {/* Base44 Responsibilities */}
      <Card className="border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          <h3 className="text-white font-semibold uppercase tracking-wider">Base44 RESPONSIBLE FOR</h3>
        </div>
        <div className="space-y-2">
          {base44Responsibilities.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              {getStatusIcon(item.status)}
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{item.task}</p>
                <p className="text-slate-400 text-xs">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Backend Responsibilities */}
      <Card className="border border-red-700 bg-gradient-to-br from-red-950 to-slate-900 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
          <h3 className="text-white font-semibold uppercase tracking-wider">Backend RESPONSIBLE FOR</h3>
          <Badge className="bg-red-500 text-white ml-auto">NOT IMPLEMENTED</Badge>
        </div>
        <div className="space-y-2">
          {backendResponsibilities.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg border border-red-900">
              {getStatusIcon(item.status)}
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{item.task}</p>
                <p className="text-slate-400 text-xs">{item.detail}</p>
              </div>
              {item.risk && getRiskBadge(item.risk)}
            </div>
          ))}
        </div>
      </Card>

      {/* Forbidden Actions */}
      <Card className="border border-yellow-700 bg-gradient-to-br from-yellow-950 to-slate-900 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          <h3 className="text-white font-semibold uppercase tracking-wider">FORBIDDEN ACTIONS</h3>
        </div>
        <div className="space-y-2">
          {forbidden.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg border border-yellow-900">
              <XCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{item.action}</p>
                <p className="text-slate-400 text-xs">{item.reason}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={item.current === 'VIOLATED' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}>
                    Current: {item.current}
                  </Badge>
                  {getRiskBadge(item.risk)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-xs text-blue-600 uppercase tracking-wider">Base44 Active</p>
          <p className="text-2xl font-bold text-blue-700">
            {base44Responsibilities.filter(r => r.status === 'active').length}/
            {base44Responsibilities.length}
          </p>
        </Card>
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-xs text-red-600 uppercase tracking-wider">Backend Missing</p>
          <p className="text-2xl font-bold text-red-700">
            {backendResponsibilities.filter(r => r.status === 'missing').length}/
            {backendResponsibilities.length}
          </p>
        </Card>
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <p className="text-xs text-yellow-600 uppercase tracking-wider">Contract Violations</p>
          <p className="text-2xl font-bold text-yellow-700">
            {forbidden.filter(f => f.current === 'VIOLATED').length}/
            {forbidden.length}
          </p>
        </Card>
        <Card className="p-4 bg-purple-50 border-purple-200">
          <p className="text-xs text-purple-600 uppercase tracking-wider">Critical Gaps</p>
          <p className="text-2xl font-bold text-purple-700">
            {[...backendResponsibilities, ...forbidden].filter(i => i.risk === 'CRITICAL').length}
          </p>
        </Card>
      </div>
    </div>
  );
}