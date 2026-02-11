import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Download, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UsageHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [operationFilter, setOperationFilter] = useState('all');

  const { data: usageLogs = [] } = useQuery({
    queryKey: ['usage-logs-all'],
    queryFn: async () => {
      // Admin sees ALL usage logs across all tenants
      return base44.entities.UsageLog.list('-created_date', 1000);
    }
  });

  const filteredLogs = usageLogs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.module?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.operation_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;
    const matchesOperation = operationFilter === 'all' || log.operation_type === operationFilter;
    
    return matchesSearch && matchesModule && matchesOperation;
  });

  const modules = [...new Set(usageLogs.map(l => l.module))];
  const operations = [...new Set(usageLogs.map(l => l.operation_type))];

  const exportCSV = () => {
    const headers = ['Date', 'Module', 'Operation', 'User', 'Cost (EUR)', 'Units', 'Status'];
    const rows = filteredLogs.map(log => [
      new Date(log.created_date).toLocaleString(),
      log.module,
      log.operation_type,
      log.user_email,
      log.total_cost_eur.toFixed(4),
      log.cost_units,
      log.status
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search usage logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {modules.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={operationFilter} onValueChange={setOperationFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by operation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Operations</SelectItem>
                {operations.map(op => (
                  <SelectItem key={op} value={op}>{op.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={exportCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage Logs ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3 font-semibold">Date & Time</th>
                  <th className="text-left p-3 font-semibold">Tenant</th>
                  <th className="text-left p-3 font-semibold">Module</th>
                  <th className="text-left p-3 font-semibold">Operation</th>
                  <th className="text-left p-3 font-semibold">User</th>
                  <th className="text-right p-3 font-semibold">Units</th>
                  <th className="text-right p-3 font-semibold">Cost (€)</th>
                  <th className="text-center p-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => (
                  <tr key={log.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 text-slate-600 text-xs">
                      {new Date(log.created_date).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="bg-slate-100 text-slate-700 text-xs">
                        {log.tenant_id}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge className="bg-blue-100 text-blue-700 text-xs">{log.module}</Badge>
                    </td>
                    <td className="p-3 text-slate-700 text-xs">
                      {log.operation_type.replace(/_/g, ' ')}
                    </td>
                    <td className="p-3 text-slate-600 text-xs">
                      {log.user_email}
                    </td>
                    <td className="p-3 text-right text-slate-700 text-xs">
                      {log.cost_units.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-semibold text-blue-600">
                      €{log.total_cost_eur.toFixed(4)}
                    </td>
                    <td className="p-3 text-center">
                      <Badge className={
                        log.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        log.status === 'failed' ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                      }>
                        {log.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}