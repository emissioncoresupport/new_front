import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, Shield, CheckCircle2, XCircle, AlertTriangle, Clock, User, Calendar } from "lucide-react";

export default function EUDAMEDAuditTrail() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActionType, setFilterActionType] = useState('all');
  const [filterOutcome, setFilterOutcome] = useState('all');

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['eudamed-audit-logs'],
    queryFn: () => base44.entities.EUDAMEDAuditLog.list('-timestamp', 100)
  });

  const filtered = auditLogs.filter(log => {
    const matchesSearch = 
      log.action_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesActionType = filterActionType === 'all' || log.action_type === filterActionType;
    const matchesOutcome = filterOutcome === 'all' || log.outcome === filterOutcome;

    return matchesSearch && matchesActionType && matchesOutcome;
  });

  const getOutcomeIcon = (outcome) => {
    const configs = {
      success: { icon: CheckCircle2, color: 'text-emerald-600' },
      failure: { icon: XCircle, color: 'text-rose-600' },
      warning: { icon: AlertTriangle, color: 'text-amber-600' },
      pending: { icon: Clock, color: 'text-slate-500' }
    };
    const config = configs[outcome] || configs.pending;
    const Icon = config.icon;
    return <Icon className={`w-5 h-5 ${config.color}`} />;
  };

  const getOutcomeBadge = (outcome) => {
    const configs = {
      success: 'bg-emerald-500',
      failure: 'bg-rose-500',
      warning: 'bg-amber-500',
      pending: 'bg-slate-500'
    };
    return <Badge className={configs[outcome] || configs.pending}>{outcome}</Badge>;
  };

  const stats = {
    total: auditLogs.length,
    success: auditLogs.filter(l => l.outcome === 'success').length,
    failure: auditLogs.filter(l => l.outcome === 'failure').length,
    today: auditLogs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-[#545454]">Audit Trail</h2>
          <p className="text-sm text-slate-600">Complete compliance tracking for all EUDAMED module actions</p>
        </div>
        <Shield className="w-8 h-8 text-[#86b027]" />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-[#86b027]/20 bg-gradient-to-br from-[#86b027]/5 to-white">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 uppercase font-bold">Total Actions</p>
            <h3 className="text-3xl font-extrabold text-[#86b027]">{stats.total}</h3>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 uppercase font-bold">Successful</p>
            <h3 className="text-3xl font-extrabold text-emerald-600">{stats.success}</h3>
          </CardContent>
        </Card>
        <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-white">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 uppercase font-bold">Failed</p>
            <h3 className="text-3xl font-extrabold text-rose-600">{stats.failure}</h3>
          </CardContent>
        </Card>
        <Card className="border-[#02a1e8]/20 bg-gradient-to-br from-[#02a1e8]/5 to-white">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 uppercase font-bold">Today</p>
            <h3 className="text-3xl font-extrabold text-[#02a1e8]">{stats.today}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by action, entity, or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterActionType} onValueChange={setFilterActionType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Action Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="actor_registration">Actor Registration</SelectItem>
            <SelectItem value="device_registration">Device Registration</SelectItem>
            <SelectItem value="incident_report">Incident Report</SelectItem>
            <SelectItem value="report_generation">Report Generation</SelectItem>
            <SelectItem value="report_submission">Report Submission</SelectItem>
            <SelectItem value="clinical_study_registration">Clinical Study</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterOutcome} onValueChange={setFilterOutcome}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failure">Failure</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Audit Log Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#545454]">Audit Log Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-slate-500 py-8">Loading audit logs...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No audit entries found</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(log => (
                <div key={log.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="shrink-0 mt-1">
                    {getOutcomeIcon(log.outcome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h4 className="font-semibold text-[#545454]">{log.action_description}</h4>
                      {getOutcomeBadge(log.outcome)}
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3" />
                        <span>{log.user_name || log.user_email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="font-medium">Entity:</span> {log.entity_type}
                      </div>
                      <div>
                        <span className="font-medium">Reference:</span> {log.entity_reference}
                      </div>
                    </div>
                    {log.error_message && (
                      <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
                        <strong>Error:</strong> {log.error_message}
                      </div>
                    )}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">View metadata</summary>
                        <pre className="mt-1 p-2 bg-slate-50 rounded text-xs overflow-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}