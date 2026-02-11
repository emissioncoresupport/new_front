import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Search, Filter, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { getCurrentCompany } from '@/components/utils/multiTenant';
import moment from 'moment';

export default function AuditTrail() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterModule, setFilterModule] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  const { data: company } = useQuery({
    queryKey: ['current-company'],
    queryFn: getCurrentCompany
  });

  const { data: allLogs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 500),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Filter logs by company
  const logs = allLogs.filter(log => log.company_id === company?.id);

  // Apply filters
  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesModule = filterModule === 'all' || log.module === filterModule;
    const matchesSeverity = filterSeverity === 'all' || log.severity === filterSeverity;

    return matchesSearch && matchesAction && matchesModule && matchesSeverity;
  });

  const getSeverityIcon = (severity) => {
    switch(severity) {
      case 'CRITICAL': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'WARNING': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-200';
      case 'WARNING': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getActionColor = (action) => {
    switch(action) {
      case 'CREATE': return 'bg-green-100 text-green-700';
      case 'UPDATE': return 'bg-blue-100 text-blue-700';
      case 'DELETE': return 'bg-red-100 text-red-700';
      case 'SUBMIT': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Shield className="w-7 h-7 text-[#86b027]" />
          Audit Trail
        </h1>
        <p className="text-slate-500 mt-1">Complete activity log for regulatory compliance</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Activity History</CardTitle>
            <Badge variant="outline">{filteredLogs.length} events</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by user, entity, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="SUBMIT">Submit</SelectItem>
                <SelectItem value="APPROVE">Approve</SelectItem>
                <SelectItem value="REJECT">Reject</SelectItem>
                <SelectItem value="EXPORT">Export</SelectItem>
                <SelectItem value="IMPORT">Import</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="CBAM">CBAM</SelectItem>
                <SelectItem value="EUDR">EUDR</SelectItem>
                <SelectItem value="CSRD">CSRD</SelectItem>
                <SelectItem value="DPP">DPP</SelectItem>
                <SelectItem value="SupplyLens">SupplyLens</SelectItem>
                <SelectItem value="System">System</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center py-12 text-slate-500">Loading audit logs...</div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No audit logs found</div>
              ) : (
                filteredLogs.map((log, idx) => (
                  <div key={idx} className={`p-4 border rounded-lg ${getSeverityColor(log.severity)}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getSeverityIcon(log.severity)}
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className={getActionColor(log.action)} variant="outline">
                              {log.action}
                            </Badge>
                            <span className="font-medium text-slate-900">{log.entity_type}</span>
                            {log.entity_id && (
                              <span className="text-xs text-slate-500 font-mono">#{log.entity_id.slice(-8)}</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-1">
                            by <strong>{log.user_email}</strong> in {log.module}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">
                        {moment(log.created_date).fromNow()}
                      </span>
                    </div>
                    
                    {log.notes && (
                      <p className="text-sm text-slate-700 mt-2 ml-7">{log.notes}</p>
                    )}
                    
                    {log.changes && (
                      <details className="mt-2 ml-7">
                        <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                          View changes
                        </summary>
                        <pre className="mt-2 text-xs bg-slate-900 text-green-400 p-3 rounded overflow-x-auto">
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}