import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Euro, TrendingUp, BarChart3, Download, Calendar, Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import moment from 'moment';

const MODULE_COLORS = {
  CBAM: '#ef4444',
  EUDR: '#22c55e',
  PPWR: '#3b82f6',
  PCF: '#86b027',
  LCA: '#8b5cf6',
  SupplyLens: '#02a1e8',
  CCF: '#f59e0b',
  CSRD: '#ec4899',
  DPP: '#06b6d4',
  Core: '#64748b'
};

export default function UsageBillingPanel({ isAdmin, currentUser }) {
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7));
  
  const tenantId = currentUser?.tenant_id || currentUser?.email?.split('@')[1] || 'unknown';

  // Fetch usage logs for current period
  const { data: usageLogs = [], isLoading } = useQuery({
    queryKey: ['user-usage-logs', selectedPeriod],
    queryFn: async () => {
      const logs = await base44.entities.UsageLog.filter({
        tenant_id: tenantId,
        billing_period: selectedPeriod
      });
      return logs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  // Fetch monthly billing summary (admin only)
  const { data: monthlyBilling } = useQuery({
    queryKey: ['monthly-billing', selectedPeriod],
    queryFn: async () => {
      const bills = await base44.entities.MonthlyBilling.filter({
        tenant_id: tenantId,
        billing_period: selectedPeriod
      });
      return bills[0];
    },
    enabled: isAdmin
  });

  // Calculate stats
  const totalCost = usageLogs.reduce((sum, log) => sum + (log.total_cost_eur || 0), 0);
  const totalOperations = usageLogs.length;
  const totalTokens = usageLogs.reduce((sum, log) => sum + (log.ai_tokens_used || 0), 0);

  // Group by module
  const byModule = usageLogs.reduce((acc, log) => {
    const mod = log.module || 'Core';
    if (!acc[mod]) acc[mod] = { count: 0, cost: 0 };
    acc[mod].count += 1;
    acc[mod].cost += log.total_cost_eur || 0;
    return acc;
  }, {});

  const moduleChartData = Object.entries(byModule).map(([module, data]) => ({
    name: module,
    cost: parseFloat(data.cost.toFixed(2)),
    operations: data.count,
    fill: MODULE_COLORS[module] || '#64748b'
  }));

  // Group by operation type
  const byOperation = usageLogs.reduce((acc, log) => {
    const op = log.operation_type || 'OTHER';
    if (!acc[op]) acc[op] = 0;
    acc[op] += log.total_cost_eur || 0;
    return acc;
  }, {});

  const operationChartData = Object.entries(byOperation)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);

  const exportCSV = () => {
    const headers = ['Date', 'Module', 'Operation', 'User', 'Units', 'Cost (EUR)', 'Status'];
    const rows = usageLogs.map(log => [
      moment(log.created_date).format('YYYY-MM-DD HH:mm'),
      log.module,
      log.operation_type,
      log.user_email,
      log.cost_units,
      log.total_cost_eur.toFixed(4),
      log.status
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usage_${selectedPeriod}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Generate available periods (last 6 months)
  const periods = [];
  for (let i = 0; i < 6; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    periods.push(date.toISOString().slice(0, 7));
  }

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="w-8 h-8 border-4 border-[#86b027] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600 text-sm">Loading usage data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-500" />
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium"
          >
            {periods.map(period => (
              <option key={period} value={period}>
                {moment(period).format('MMMM YYYY')}
              </option>
            ))}
          </select>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Euro className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Cost</p>
                <p className="text-2xl font-bold text-blue-600">€{totalCost.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Operations</p>
                <p className="text-2xl font-bold text-green-600">{totalOperations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">AI Tokens</p>
                <p className="text-2xl font-bold text-purple-600">{(totalTokens / 1000).toFixed(1)}k</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin">Admin View</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Cost by Module */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Cost by Module</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moduleChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value) => [`€${value}`, 'Cost']}
                    />
                    <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                      {moduleChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Operations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {operationChartData.slice(0, 8).map((op) => (
                  <div key={op.name} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{op.name.replace(/_/g, ' ')}</span>
                    <span className="font-bold text-slate-900">€{op.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Usage History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageLogs.slice(0, 20).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{moment(log.created_date).format('MMM D, HH:mm')}</TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: MODULE_COLORS[log.module] || '#64748b' }} className="text-xs">
                          {log.module}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{log.operation_type.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="text-xs">{log.cost_units.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold text-xs">€{log.total_cost_eur.toFixed(4)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {usageLogs.length === 0 && (
                <div className="py-12 text-center text-slate-500 text-sm">
                  No usage data for this period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin" className="mt-4 space-y-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-bold text-blue-900">Admin Billing Access</p>
                    <p className="text-xs text-blue-700">View comprehensive billing dashboard and invoice management</p>
                  </div>
                </div>
                <Button className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
                  window.location.href = '/Billing';
                }}>
                  Open Full Billing Dashboard
                </Button>
              </CardContent>
            </Card>

            {monthlyBilling && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Monthly Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Invoice Status:</span>
                    <Badge className={
                      monthlyBilling.invoice_status === 'paid' ? 'bg-green-500' :
                      monthlyBilling.invoice_status === 'sent' ? 'bg-blue-500' :
                      monthlyBilling.invoice_status === 'overdue' ? 'bg-red-500' : 'bg-slate-500'
                    }>
                      {monthlyBilling.invoice_status}
                    </Badge>
                  </div>
                  {monthlyBilling.invoice_number && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Invoice Number:</span>
                      <span className="font-mono">{monthlyBilling.invoice_number}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Total Cost:</span>
                    <span className="text-lg font-bold text-blue-600">€{monthlyBilling.total_cost_eur.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}