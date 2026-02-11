import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, FileText, Clock, Lock, Users, Filter, ExternalLink, CheckCircle2, XCircle, AlertTriangle, Download, TrendingUp, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import APIContractPreview from '@/components/supplylens/APIContractPreview';
import { SourceTrustPolicyEditor, RetentionPolicyEditor } from '@/components/supplylens/PolicyEditor';

export default function SupplyLensControls() {
  const [activeTab, setActiveTab] = useState('decisions');
  const [filters, setFilters] = useState({ type: 'all', user: '', dateRange: '' });
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [exportPeriod, setExportPeriod] = useState('2026-Q1');
  const [carbonScenario, setCarbonScenario] = useState('BASE');

  // Mock Decision Log data
  const mockDecisions = [
    {
      decision_id: 'DEC-2026-001',
      evidence_id: 'EV-001',
      entity_id: 'SUP-123',
      entity_type: 'Supplier',
      entity_name: 'Acme Corp',
      type: 'MAPPING_APPROVAL',
      outcome: 'ACCEPTED',
      reason_code: 'EXACT_MATCH',
      user: 'admin@example.com',
      timestamp: '2026-02-04T10:30:00Z',
      notes: 'Verified via invoice cross-reference'
    },
    {
      decision_id: 'DEC-2026-002',
      evidence_id: 'EV-002',
      entity_id: null,
      entity_type: null,
      entity_name: null,
      type: 'REVIEW_APPROVAL',
      outcome: 'ACCEPTED',
      reason_code: 'DATA_QUALITY_VERIFIED',
      user: 'reviewer@example.com',
      timestamp: '2026-02-04T11:00:00Z',
      notes: 'All fields validated against schema'
    },
    {
      decision_id: 'DEC-2026-003',
      evidence_id: 'EV-003',
      entity_id: 'SKU-456',
      entity_type: 'SKU',
      entity_name: 'Widget-A',
      type: 'CONFLICT_RESOLUTION',
      outcome: 'REJECTED',
      reason_code: 'DUPLICATE_DETECTED',
      user: 'admin@example.com',
      timestamp: '2026-02-04T12:15:00Z',
      notes: 'Duplicate entry found in EV-001'
    }
  ];

  // Fetch access logs from DemoDataStore
  const { data: accessLogs = [] } = useQuery({
    queryKey: ['access-logs'],
    queryFn: async () => {
      const { demoStore } = await import('@/components/supplylens/DemoDataStore');
      return demoStore.listAccessLogs();
    }
  });

  // Mock Audit Trail data + access logs
  const mockAuditEvents = [
    { event_id: 'AE-001', event_type: 'EVIDENCE_SEALED', module: 'Evidence Vault', user: 'system@base44.com', timestamp: '2026-02-04T10:00:00Z', details: 'Evidence EV-001 sealed with hash abc123', evidence_id: 'EV-001', work_item_id: null },
    { event_id: 'AE-002', event_type: 'MAPPING_CREATED', module: 'Network', user: 'admin@example.com', timestamp: '2026-02-04T10:30:00Z', details: 'Supplier SUP-123 mapped to evidence EV-001', evidence_id: 'EV-001', work_item_id: null },
    { event_id: 'AE-003', event_type: 'DRAFT_STATE_TRANSITION', module: 'Evidence Vault', user: 'admin@example.com', timestamp: '2026-02-04T09:45:00Z', details: 'Draft DR-001 transitioned from DRAFT to READY_FOR_SEAL', evidence_id: null, work_item_id: null },
    { event_id: 'AE-004', event_type: 'WORK_ITEM_CREATED', module: 'Control Tower', user: 'admin@example.com', timestamp: '2026-02-04T11:00:00Z', details: 'Work item WI-001 created for mapping review', evidence_id: 'EV-002', work_item_id: 'WI-001' },
    { event_id: 'AE-005', event_type: 'USER_LOGIN', module: 'Auth', user: 'admin@example.com', timestamp: '2026-02-04T09:00:00Z', details: 'User logged in from IP 192.168.1.1', evidence_id: null, work_item_id: null },
    ...accessLogs.map((log, idx) => ({
      event_id: `AL-${String(idx + 1).padStart(3, '0')}`,
      event_type: log.action,
      module: 'Access Control',
      user: log.user_email,
      timestamp: log.timestamp,
      details: `${log.action} on ${log.evidence_id} - ${log.result} - ${log.reason}`,
      evidence_id: log.evidence_id,
      work_item_id: null,
      result: log.result
    }))
  ];

  const filteredDecisions = mockDecisions.filter(dec => {
    if (filters.type !== 'all' && dec.type !== filters.type) return false;
    if (filters.user && !dec.user.toLowerCase().includes(filters.user.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="border-b border-slate-200 bg-white/60 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-8 py-6">
          <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-[0.15em] font-medium mb-2">
            <Shield className="w-3.5 h-3.5 text-[#86b027]" />
            SupplyLens
          </div>
          <h1 className="text-3xl font-light text-slate-900 tracking-tight">Controls</h1>
          <p className="text-slate-600 font-light mt-1">Governance, audit trails, and decision logs</p>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-8 py-8 space-y-6">

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg rounded-xl">
          <CardContent className="p-4">
            <div className="text-xs text-slate-600 font-light uppercase tracking-wider mb-1">Total Decisions</div>
            <div className="text-2xl font-light text-slate-900">247</div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg rounded-xl">
          <CardContent className="p-4">
            <div className="text-xs text-slate-600 font-light uppercase tracking-wider mb-1">Audit Events (30d)</div>
            <div className="text-2xl font-light text-slate-900">1,453</div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg rounded-xl">
          <CardContent className="p-4">
            <div className="text-xs text-slate-600 font-light uppercase tracking-wider mb-1">Active Policies</div>
            <div className="text-2xl font-light text-slate-900">8</div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg rounded-xl">
          <CardContent className="p-4">
            <div className="text-xs text-slate-600 font-light uppercase tracking-wider mb-1">Retention Rules</div>
            <div className="text-2xl font-light text-slate-900">3</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm rounded-lg p-1">
          <TabsTrigger value="decisions" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 rounded-md transition-all font-light">
            Decision Log
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 rounded-md transition-all font-light">
            Audit Trail
          </TabsTrigger>
          <TabsTrigger value="retention" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 rounded-md transition-all font-light">
            Retention
          </TabsTrigger>
          <TabsTrigger value="roles" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 rounded-md transition-all font-light">
            Roles & Access
          </TabsTrigger>
          <TabsTrigger value="policies" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 rounded-md transition-all font-light">
            Policies
          </TabsTrigger>
          <TabsTrigger value="api" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 rounded-md transition-all font-light">
            API Contract
          </TabsTrigger>
          <TabsTrigger value="exports" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 rounded-md transition-all font-light">
            <Download className="w-4 h-4 mr-2" />
            Exports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="decisions" className="space-y-4">
          {/* Immutability Notice */}
          <Card className="border border-[#86b027]/30 bg-gradient-to-r from-[#86b027]/5 to-white/70 backdrop-blur-xl shadow-lg rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-[#86b027]" />
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm tracking-tight">Append-Only Decision Log</h3>
                  <p className="text-xs text-slate-600 font-light mt-0.5">
                    All decisions are immutable. No editing or deletion permitted. Every decision requires a reason code.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Filter className="w-4 h-4 text-slate-600" />
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-slate-600">Type</Label>
                    <Select value={filters.type} onValueChange={(v) => setFilters({...filters, type: v})}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="REVIEW_APPROVAL">Review Approval</SelectItem>
                        <SelectItem value="MAPPING_APPROVAL">Mapping Approval</SelectItem>
                        <SelectItem value="CONFLICT_RESOLUTION">Conflict Resolution</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">User</Label>
                    <Input
                      placeholder="Filter by user..."
                      value={filters.user}
                      onChange={(e) => setFilters({...filters, user: e.target.value})}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Date Range</Label>
                    <Input
                      type="date"
                      value={filters.dateRange}
                      onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Decisions Table */}
          <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg rounded-xl">
            <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-white/40 via-white/20 to-white/40 backdrop-blur-sm">
              <CardTitle className="text-base font-light tracking-tight text-slate-900">Decision Log (Append-Only)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-white/40 via-white/20 to-white/40 backdrop-blur-sm border-b border-slate-200/50">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Decision ID</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Timestamp</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Actor</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Decision Type</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Linked Objects</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Outcome</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Reason Code</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50">
                    {filteredDecisions.map((dec) => (
                      <tr key={dec.decision_id} className="hover:bg-white/50 backdrop-blur-sm transition-all">
                        <td className="px-6 py-4 font-mono text-xs font-medium text-slate-900">{dec.decision_id}</td>
                        <td className="px-6 py-4 text-slate-600 text-xs font-light">{new Date(dec.timestamp).toLocaleString('en-GB', { timeZone: 'Europe/Amsterdam' })}</td>
                        <td className="px-6 py-4 text-slate-700 text-xs font-light">{dec.user}</td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700 text-xs">
                            {dec.type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {dec.evidence_id && (
                              <button
                                onClick={() => {
                                  window.location.href = `${createPageUrl('EvidenceVault')}?focus=${dec.evidence_id}`;
                                }}
                                className="text-[#86b027] hover:underline flex items-center gap-1 text-xs text-left"
                              >
                                {dec.evidence_id} <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                            {dec.entity_id && (
                              <button
                                onClick={() => {
                                  window.location.href = `${createPageUrl('SupplyLensNetwork')}?entity_type=${dec.entity_type}&entity_id=${dec.entity_id}`;
                                }}
                                className="text-slate-700 hover:underline flex items-center gap-1 text-xs text-left"
                              >
                                {dec.entity_type}: {dec.entity_name} <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                            {!dec.evidence_id && !dec.entity_id && (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                         <Badge className={
                           dec.outcome === 'ACCEPTED' ? 'bg-[#86b027]/10 text-[#86b027] border border-[#86b027]/30 text-xs' :
                           'bg-red-100 text-red-800 border border-red-200 text-xs'
                         }>
                           {dec.outcome === 'ACCEPTED' ? <CheckCircle2 className="w-3 h-3 inline mr-1" /> : <XCircle className="w-3 h-3 inline mr-1" />}
                           {dec.outcome}
                         </Badge>
                        </td>
                        <td className="px-6 py-4 text-slate-700 text-xs font-light">{dec.reason_code}</td>
                        <td className="px-6 py-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setSelectedDecision(dec)}>
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Decision Details: {dec.decision_id}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <Label className="text-xs text-slate-600">Decision Type</Label>
                                    <p className="text-slate-900 font-medium">{dec.type}</p>
                                  </div>
                                  <div>
                                   <Label className="text-xs text-slate-600">Outcome</Label>
                                   <Badge className={
                                     dec.outcome === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                                     'bg-red-100 text-red-800'
                                   }>{dec.outcome}</Badge>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-slate-600">Reason Code</Label>
                                    <p className="text-slate-900 font-medium">{dec.reason_code}</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-slate-600">User</Label>
                                    <p className="text-slate-900 font-medium">{dec.user}</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-slate-600">Timestamp</Label>
                                    <p className="text-slate-900 font-medium">{new Date(dec.timestamp).toLocaleString()}</p>
                                  </div>
                                </div>

                                {dec.notes && (
                                  <div>
                                    <Label className="text-xs text-slate-600">Notes</Label>
                                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-md">{dec.notes}</p>
                                  </div>
                                )}

                                <div className="border-t pt-4 space-y-2">
                                <Label className="text-xs text-slate-600">Related Records</Label>
                                <div className="flex gap-2">
                                  {dec.evidence_id && (
                                    <button
                                      onClick={() => {
                                        window.location.href = `${createPageUrl('EvidenceVault')}?focus=${dec.evidence_id}`;
                                      }}
                                      className="inline-flex items-center gap-2 h-9 px-4 text-sm border border-slate-200 rounded hover:bg-slate-50"
                                    >
                                      <FileText className="w-4 h-4" />
                                      View Evidence
                                    </button>
                                  )}
                                  {dec.entity_id && (
                                    <button
                                      onClick={() => {
                                        window.location.href = `${createPageUrl('SupplyLensNetwork')}?entity_type=${dec.entity_type}&entity_id=${dec.entity_id}`;
                                      }}
                                      className="inline-flex items-center gap-2 h-9 px-4 text-sm border border-slate-200 rounded hover:bg-slate-50"
                                    >
                                      <Users className="w-4 h-4" />
                                      View Entity
                                    </button>
                                  )}
                                </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/60 bg-gradient-to-br from-white/60 to-slate-50/40 backdrop-blur-xl rounded-xl shadow-lg">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-slate-700" />
                  <span className="text-sm font-semibold text-slate-900">Governance Guarantees</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Lock className="w-4 h-4 text-[#86b027] mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-900">Immutable Records</p>
                      <p className="text-xs text-slate-600">No editing or deletion after creation</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#86b027] mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-900">Cryptographic Sealing</p>
                      <p className="text-xs text-slate-600">Tamper-proof hash verification</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-[#86b027] mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-900">Human-Only Approval</p>
                      <p className="text-xs text-slate-600">AI cannot approve decisions</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-[#86b027] mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-900">Full Provenance</p>
                      <p className="text-xs text-slate-600">Evidence → Decision → Outcome chain</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          {/* Audit Trail Filters */}
          <Card className="border-2 border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Filter className="w-4 h-4 text-slate-600" />
                <div className="flex-1 grid grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-slate-600">Event Type</Label>
                    <Select defaultValue="all">
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Events</SelectItem>
                        <SelectItem value="EVIDENCE_SEALED">Evidence Sealed</SelectItem>
                        <SelectItem value="MAPPING_CREATED">Mapping Created</SelectItem>
                        <SelectItem value="DRAFT_STATE_TRANSITION">Draft State Transition</SelectItem>
                        <SelectItem value="USER_LOGIN">User Login</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Module</Label>
                    <Select defaultValue="all">
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Modules</SelectItem>
                        <SelectItem value="Evidence Vault">Evidence Vault</SelectItem>
                        <SelectItem value="Network">Network</SelectItem>
                        <SelectItem value="Auth">Auth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">User</Label>
                    <Input placeholder="Filter by user..." className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Date Range</Label>
                    <Input type="date" className="h-8 text-xs" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Trail Events */}
          <Card className="border-2 border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <CardHeader className="border-b-2 border-slate-200">
              <CardTitle className="text-lg font-semibold">Immutable Event Log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-0">
                {mockAuditEvents.map((event, idx) => (
                  <div key={event.event_id} className={`px-6 py-4 border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer ${idx === 0 ? 'border-t' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className="bg-slate-100 text-slate-700 text-xs font-mono">{event.event_id}</Badge>
                          <Badge className={
                            event.module === 'Access Control' && event.result === 'DENIED' ? 'bg-red-100 text-red-800 text-xs' :
                            event.module === 'Access Control' && event.result === 'ALLOWED' ? 'bg-green-100 text-green-800 text-xs' :
                            'bg-blue-100 text-blue-800 text-xs'
                          }>{event.event_type}</Badge>
                          <Badge variant="outline" className="text-xs">{event.module}</Badge>
                          {event.result && (
                            <Badge className={event.result === 'DENIED' ? 'bg-red-100 text-red-800 text-xs' : 'bg-green-100 text-green-800 text-xs'}>
                              {event.result}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 mb-2">{event.details}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>User: {event.user}</span>
                          <span>•</span>
                          <span>{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          {event.evidence_id && (
                            <button
                              onClick={() => {
                                window.location.href = `${createPageUrl('EvidenceVault')}?focus=${event.evidence_id}`;
                              }}
                              className="inline-flex items-center gap-1 h-7 px-3 text-xs border border-slate-200 rounded hover:bg-slate-50"
                            >
                              <FileText className="w-3 h-3" />
                              View Evidence
                            </button>
                          )}
                          {event.work_item_id && (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => alert(`Open Work Item Drawer: ${event.work_item_id}`)}>
                              <Clock className="w-3 h-3" />
                              View Work Item
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full mt-1 ${event.result === 'DENIED' ? 'bg-red-600' : 'bg-[#86b027]'}`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <CardContent className="p-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Tracked Events</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#86b027]"></div>
                    <span className="text-slate-700">Evidence ingestion</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#86b027]"></div>
                    <span className="text-slate-700">Draft state transitions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#86b027]"></div>
                    <span className="text-slate-700">Evidence sealing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#86b027]"></div>
                    <span className="text-slate-700">Mapping decisions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#86b027]"></div>
                    <span className="text-slate-700">User authentication</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#86b027]"></div>
                    <span className="text-slate-700">Data access requests</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          <Card className="border-2 border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <CardHeader className="border-b-2 border-slate-200">
              <CardTitle className="text-lg font-semibold">Data Retention Policies</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-[#86b027]/10 to-transparent border-l-4 border-[#86b027] pl-6 pr-4 py-4 rounded-r-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-[#86b027]" />
                      <h4 className="font-semibold text-slate-900 text-base">Sealed Evidence Records</h4>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <p className="text-sm text-slate-700 mb-2">Retain for <strong>10 years</strong> (regulatory requirement)</p>
                  <p className="text-xs text-slate-600">
                    All sealed evidence records are immutable and must be retained to comply with EU CSRD, CBAM, and EUDR audit requirements.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-transparent border-l-4 border-blue-500 pl-6 pr-4 py-4 rounded-r-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-slate-900 text-base">Draft Records</h4>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <p className="text-sm text-slate-700 mb-2">Retain for <strong>90 days</strong> after abandonment</p>
                  <p className="text-xs text-slate-600">
                    Draft records are automatically purged 90 days after last activity to minimize storage and comply with data minimization principles.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-slate-100 to-transparent border-l-4 border-slate-500 pl-6 pr-4 py-4 rounded-r-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-slate-600" />
                      <h4 className="font-semibold text-slate-900 text-base">Audit Logs</h4>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <p className="text-sm text-slate-700 mb-2">Retain for <strong>7 years</strong> (SOC 2 requirement)</p>
                  <p className="text-xs text-slate-600">
                    Audit trail events are immutable and retained to meet SOC 2, ISO 27001, and GDPR accountability requirements.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Data Minimization Note</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    SupplyLens applies GDPR Article 5(1)(c) data minimization principles. Only data necessary for regulatory compliance and business operations is retained. 
                    Personal data is processed only when required and anonymized where possible.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card className="border-2 border-red-300 bg-red-50/50 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Human Decision Policy</h4>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    <strong>AI systems cannot approve decisions.</strong> All mapping approvals, evidence reviews, and conflict resolutions must be performed by authenticated human users with proper role assignments. 
                    AI may provide suggestions and recommendations, but only humans with Admin, Reviewer, or Mapper roles can create append-only decision records.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <CardHeader className="border-b-2 border-slate-200">
              <CardTitle className="text-lg font-semibold">Roles & Access Policies</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-slate-900" />
                      <h4 className="font-semibold text-slate-900">Admin</h4>
                    </div>
                    <Badge className="bg-slate-900 text-white">Full Access</Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    Full access to Control Tower, Evidence Vault, Network, and all governance controls. Can create/approve mappings, seal evidence, and manage users.
                  </p>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-slate-900">Reviewer</h4>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">Review & Approve</Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    Can review evidence records, approve work items, and transition evidence states. Cannot seal evidence or create mappings.
                  </p>
                </div>

                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-green-600" />
                      <h4 className="font-semibold text-slate-900">Mapper</h4>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Mapping Only</Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    Can create mapping suggestions and approve/reject AI proposals in Network. Cannot seal evidence or access audit logs.
                  </p>
                </div>

                <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-amber-600" />
                      <h4 className="font-semibold text-slate-900">Auditor</h4>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800">Read-Only</Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    Read-only access to Evidence Vault, Audit Trail, Decision Log, and Network. Cannot make any changes or approvals.
                  </p>
                </div>

                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-purple-600" />
                      <h4 className="font-semibold text-slate-900">SupplierUser</h4>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">Portal Only</Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    Access <strong>only</strong> to Supplier Portal. Cannot access Control Tower, Evidence Vault, Network, or any internal governance tools.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-amber-300 bg-amber-50/50 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Important: Supplier Portal Segregation</h4>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    <strong>SupplierUser</strong> role has access exclusively to the Supplier Portal and cannot view or interact with internal Control Tower, Evidence Vault, Network, or governance modules. 
                    This ensures strict data segregation and compliance with privacy requirements.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-6">
          <Tabs defaultValue="trust" className="space-y-4">
            <TabsList className="bg-white/80 backdrop-blur-sm border border-slate-200">
              <TabsTrigger value="trust">Source Trust</TabsTrigger>
              <TabsTrigger value="retention">Retention</TabsTrigger>
            </TabsList>
            
            <TabsContent value="trust">
              <SourceTrustPolicyEditor />
            </TabsContent>
            
            <TabsContent value="retention">
              <RetentionPolicyEditor />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <APIContractPreview />
        </TabsContent>

        <TabsContent value="exports" className="space-y-6">
          {/* Exports Header */}
          <Card className="border border-[#86b027]/30 bg-gradient-to-r from-[#86b027]/5 to-white/70 backdrop-blur-xl shadow-lg rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-[#86b027]" />
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm tracking-tight">Traceable Exports</h3>
                  <p className="text-xs text-slate-600 font-light mt-0.5">
                    Every export row includes evidence_ids[] and transformation_version for full lineage.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CBAM Export */}
          <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg rounded-xl">
            <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-white/40 via-white/20 to-white/40 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-slate-700" />
                  <CardTitle className="text-base font-light tracking-tight text-slate-900">CBAM Import Lines</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={carbonScenario} onValueChange={setCarbonScenario}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">ETS Low</SelectItem>
                      <SelectItem value="BASE">ETS Base</SelectItem>
                      <SelectItem value="HIGH">ETS High</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={exportPeriod} onValueChange={setExportPeriod}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2026-Q1">2026-Q1</SelectItem>
                      <SelectItem value="2026-Q2">2026-Q2</SelectItem>
                      <SelectItem value="2026-Q3">2026-Q3</SelectItem>
                      <SelectItem value="2026-Q4">2026-Q4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-white/40 via-white/20 to-white/40 backdrop-blur-sm border-b border-slate-200/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Importer</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Supplier</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">CN Code</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Net Mass (t)</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Period</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Carbon Cost (€)</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Evidence IDs</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Version</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50">
                    {[
                      { importer: 'EU Import BV', supplier: 'Acme Steel Corp', cn: '7208.10', mass: 250.5, evidence_ids: ['EV-0001', 'EV-0002'], version: 1, base_cost: 12500 },
                      { importer: 'EU Import BV', supplier: 'Global Metals Ltd', cn: '7601.20', mass: 180.2, evidence_ids: ['EV-0003'], version: 1, base_cost: 9000 },
                      { importer: 'EU Import BV', supplier: 'China Cement Co', cn: '2523.29', mass: 450.0, evidence_ids: ['EV-0004', 'EV-0005'], version: 2, base_cost: 22500 },
                      { importer: 'EU Import BV', supplier: 'Nordic Fertilizers', cn: '3102.10', mass: 120.0, evidence_ids: ['EV-0006'], version: 1, base_cost: 6000 },
                      { importer: 'EU Import BV', supplier: 'Acme Steel Corp', cn: '7208.25', mass: 320.8, evidence_ids: ['EV-0001', 'EV-0007'], version: 1, base_cost: 16000 },
                      { importer: 'EU Import BV', supplier: 'Asian Alloys Inc', cn: '7601.10', mass: 95.5, evidence_ids: ['EV-0008'], version: 1, base_cost: 4775 },
                      { importer: 'EU Import BV', supplier: 'Euro Hydrogen GmbH', cn: '2804.10', mass: 50.0, evidence_ids: ['EV-0009'], version: 1, base_cost: 2500 },
                      { importer: 'EU Import BV', supplier: 'China Cement Co', cn: '2523.90', mass: 380.0, evidence_ids: ['EV-0004', 'EV-0010'], version: 3, base_cost: 19000 },
                      { importer: 'EU Import BV', supplier: 'Global Metals Ltd', cn: '7601.20', mass: 210.4, evidence_ids: ['EV-0003'], version: 2, base_cost: 10520 },
                      { importer: 'EU Import BV', supplier: 'Nordic Fertilizers', cn: '3102.21', mass: 155.0, evidence_ids: ['EV-0006'], version: 1, base_cost: 7750 }
                    ].filter(row => exportPeriod === '2026-Q1').map((row, idx) => {
                      const costMultiplier = carbonScenario === 'LOW' ? 0.8 : carbonScenario === 'HIGH' ? 1.2 : 1.0;
                      const carbonCost = Math.round(row.base_cost * costMultiplier);
                      
                      return (
                        <tr key={idx} className="hover:bg-white/50 backdrop-blur-sm transition-all">
                          <td className="px-4 py-3 text-slate-700 text-xs font-light">{row.importer}</td>
                          <td className="px-4 py-3 text-slate-900 text-xs font-medium">{row.supplier}</td>
                          <td className="px-4 py-3 text-slate-700 text-xs font-mono">{row.cn}</td>
                          <td className="px-4 py-3 text-slate-700 text-xs">{row.mass.toFixed(1)}</td>
                          <td className="px-4 py-3 text-slate-700 text-xs">{exportPeriod}</td>
                          <td className="px-4 py-3 text-slate-900 text-xs font-semibold">€{carbonCost.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {row.evidence_ids.map((ev_id) => (
                                <Link key={ev_id} to={`${createPageUrl('EvidenceVault')}?focus=${ev_id}`}>
                                  <Badge variant="outline" className="text-xs font-mono hover:bg-[#86b027]/10 cursor-pointer transition-colors">
                                    {ev_id}
                                  </Badge>
                                </Link>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className="bg-[#86b027] text-white text-xs">v{row.version}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Logistics Emissions Export */}
          <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg rounded-xl">
            <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-white/40 via-white/20 to-white/40 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-slate-700" />
                  <CardTitle className="text-base font-light tracking-tight text-slate-900">Logistics Emissions Export</CardTitle>
                </div>
                <Select value={exportPeriod} onValueChange={setExportPeriod}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026-Q1">2026-Q1</SelectItem>
                    <SelectItem value="2026-Q2">2026-Q2</SelectItem>
                    <SelectItem value="2026-Q3">2026-Q3</SelectItem>
                    <SelectItem value="2026-Q4">2026-Q4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-white/40 via-white/20 to-white/40 backdrop-blur-sm border-b border-slate-200/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Shipment ID</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Mode</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Route</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Distance (km)</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Mass (t)</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Emissions (kgCO2e)</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Evidence IDs</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">Version</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50">
                    {[
                      { shipment_id: 'SHP-2026-001', mode: 'Sea Freight', route: 'Shanghai → Rotterdam', distance: 18500, mass: 450.0, emissions: 1850, evidence_ids: ['EV-0001'], version: 1 },
                      { shipment_id: 'SHP-2026-002', mode: 'Air Freight', route: 'Beijing → Frankfurt', distance: 7800, mass: 12.5, emissions: 950, evidence_ids: ['EV-0002'], version: 1 },
                      { shipment_id: 'SHP-2026-003', mode: 'Rail', route: 'Warsaw → Amsterdam', distance: 1150, mass: 280.0, emissions: 420, evidence_ids: ['EV-0003', 'EV-0004'], version: 1 },
                      { shipment_id: 'SHP-2026-004', mode: 'Road', route: 'Munich → Brussels', distance: 680, mass: 24.0, evidence_ids: ['EV-0005'], version: 1, emissions: 165 },
                      { shipment_id: 'SHP-2026-005', mode: 'Sea Freight', route: 'Singapore → Hamburg', distance: 16200, mass: 520.0, emissions: 2100, evidence_ids: ['EV-0006', 'EV-0007'], version: 2 },
                      { shipment_id: 'SHP-2026-006', mode: 'Air Freight', route: 'Tokyo → Paris', distance: 9700, mass: 8.2, emissions: 780, evidence_ids: ['EV-0008'], version: 1 },
                      { shipment_id: 'SHP-2026-007', mode: 'Rail', route: 'Budapest → Vienna', distance: 250, mass: 180.0, emissions: 75, evidence_ids: ['EV-0009'], version: 1 },
                      { shipment_id: 'SHP-2026-008', mode: 'Road', route: 'Lyon → Geneva', distance: 150, mass: 15.5, emissions: 38, evidence_ids: ['EV-0010'], version: 1 },
                      { shipment_id: 'SHP-2026-009', mode: 'Sea Freight', route: 'Mumbai → Antwerp', distance: 12800, mass: 380.0, emissions: 1520, evidence_ids: ['EV-0001', 'EV-0002'], version: 1 },
                      { shipment_id: 'SHP-2026-010', mode: 'Intermodal', route: 'Seoul → Berlin', distance: 8900, mass: 220.0, emissions: 890, evidence_ids: ['EV-0003'], version: 1 }
                    ].filter(() => exportPeriod === '2026-Q1').map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/50 backdrop-blur-sm transition-all">
                        <td className="px-4 py-3 text-slate-900 text-xs font-mono font-semibold">{row.shipment_id}</td>
                        <td className="px-4 py-3 text-xs">
                          <Badge variant="outline" className={
                            row.mode === 'Sea Freight' ? 'border-blue-300 bg-blue-50 text-blue-700' :
                            row.mode === 'Air Freight' ? 'border-red-300 bg-red-50 text-red-700' :
                            row.mode === 'Rail' ? 'border-green-300 bg-green-50 text-green-700' :
                            row.mode === 'Road' ? 'border-amber-300 bg-amber-50 text-amber-700' :
                            'border-slate-300 bg-slate-50 text-slate-700'
                          }>
                            {row.mode}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-700 text-xs font-light">{row.route}</td>
                        <td className="px-4 py-3 text-slate-700 text-xs">{row.distance.toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-700 text-xs">{row.mass.toFixed(1)}</td>
                        <td className="px-4 py-3 text-slate-900 text-xs font-semibold">{row.emissions.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {row.evidence_ids.map((ev_id) => (
                              <Link key={ev_id} to={`${createPageUrl('EvidenceVault')}?focus=${ev_id}`}>
                                <Badge variant="outline" className="text-xs font-mono hover:bg-[#86b027]/10 cursor-pointer transition-colors">
                                  {ev_id}
                                </Badge>
                              </Link>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="bg-[#86b027] text-white text-xs">v{row.version}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Export Metadata */}
          <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg rounded-xl">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-slate-700" />
                  <span className="text-sm font-semibold text-slate-900">Export Lineage Guarantees</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#86b027] mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-900">Evidence Traceability</p>
                      <p className="text-xs text-slate-600">Every row links to source evidence IDs</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#86b027] mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-900">Version Control</p>
                      <p className="text-xs text-slate-600">Transformation version per row (no overwrites)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#86b027] mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-900">Scenario Determinism</p>
                      <p className="text-xs text-slate-600">Carbon costs calculated via ETS proxy rules</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 mt-4 border border-slate-200">
                  <p className="text-xs text-slate-700 font-light">
                    <strong>Carbon Cost Calculation:</strong> {carbonScenario} scenario applies {
                      carbonScenario === 'LOW' ? '0.8x' :
                      carbonScenario === 'HIGH' ? '1.2x' :
                      '1.0x'
                    } multiplier to base ETS proxy rates. Each row is deterministic and auditable.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}