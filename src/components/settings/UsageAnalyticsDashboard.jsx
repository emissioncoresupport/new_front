import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, TrendingUp, Clock, AlertCircle, CheckCircle, Zap, Users, Building2, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

const COLORS = ['#86b027', '#02a1e8', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];

export default function UsageAnalyticsDashboard({ user }) {
  const [period, setPeriod] = useState('last_30_days');
  const [selectedTenant, setSelectedTenant] = useState('all');

  const { data: usageLogs = [] } = useQuery({
    queryKey: ['usage-logs', period],
    queryFn: async () => {
      if (user.role !== 'admin') return [];
      const logs = await base44.asServiceRole.entities.UsageLog.list('-started_at', 1000);
      return logs.filter(log => filterByPeriod(log, period));
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: monthlyBilling = [] } = useQuery({
    queryKey: ['monthly-billing'],
    queryFn: async () => {
      if (user.role !== 'admin') return [];
      return await base44.asServiceRole.entities.MonthlyBilling.list('-billing_month', 12);
    }
  });

  const { data: allCompanies = [] } = useQuery({
    queryKey: ['all-companies'],
    queryFn: async () => {
      if (user.role !== 'admin') return [];
      return await base44.asServiceRole.entities.Company.list();
    },
    enabled: user.role === 'admin'
  });

  const filteredLogs = selectedTenant === 'all' 
    ? usageLogs 
    : usageLogs.filter(log => log.tenant_id === selectedTenant);

  // Calculate metrics
  const totalOperations = filteredLogs.length;
  const totalTokens = filteredLogs.reduce((sum, log) => sum + (log.token_cost || 0), 0);
  const successfulOps = filteredLogs.filter(log => log.success).length;
  const failedOps = filteredLogs.filter(log => !log.success).length;
  const avgDuration = filteredLogs.reduce((sum, log) => sum + (log.duration_ms || 0), 0) / totalOperations || 0;

  // Group by operation type
  const byOperationType = {};
  filteredLogs.forEach(log => {
    if (!byOperationType[log.operation_type]) {
      byOperationType[log.operation_type] = { count: 0, tokens: 0, duration: 0 };
    }
    byOperationType[log.operation_type].count++;
    byOperationType[log.operation_type].tokens += log.token_cost || 0;
    byOperationType[log.operation_type].duration += log.duration_ms || 0;
  });

  const operationTypeData = Object.entries(byOperationType).map(([type, data]) => ({
    name: type.split('.')[1] || type,
    operations: data.count,
    tokens: data.tokens,
    avgDuration: data.duration / data.count
  })).sort((a, b) => b.tokens - a.tokens).slice(0, 10);

  // Group by tenant
  const byTenant = {};
  filteredLogs.forEach(log => {
    if (!byTenant[log.tenant_id]) {
      byTenant[log.tenant_id] = { count: 0, tokens: 0 };
    }
    byTenant[log.tenant_id].count++;
    byTenant[log.tenant_id].tokens += log.token_cost || 0;
  });

  const tenantData = Object.entries(byTenant).map(([tenantId, data]) => {
    const company = allCompanies.find(c => c.id === tenantId);
    return {
      name: company?.company_name || tenantId.substring(0, 8),
      operations: data.count,
      tokens: data.tokens
    };
  }).sort((a, b) => b.tokens - a.tokens).slice(0, 10);

  // Time series data
  const timeSeriesData = generateTimeSeriesData(filteredLogs, period);

  // Success rate data
  const successRateData = [
    { name: 'Successful', value: successfulOps, color: '#86b027' },
    { name: 'Failed', value: failedOps, color: '#ef4444' }
  ];

  const hasData = filteredLogs.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Usage Analytics</h2>
          <p className="text-sm text-slate-500 mt-1">Real-time token consumption and API metrics</p>
        </div>
        <div className="flex gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_24_hours">Last 24 Hours</SelectItem>
              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="current_month">Current Month</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>

          {user.role === 'admin' && (
            <Select value={selectedTenant} onValueChange={setSelectedTenant}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tenants</SelectItem>
                {allCompanies.map(company => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.company_name || company.id.substring(0, 12)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Empty State */}
      {!hasData && (
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#86b027]/10 flex items-center justify-center">
            <TrendingUp className="w-10 h-10 text-[#86b027]" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Usage Data Yet</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
            Start using platform features to see real-time analytics. Token consumption will be tracked for API calls, AI operations, calculations, and integrations.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { label: 'Supplier Onboarding', icon: Building2, desc: 'AI document extraction' },
              { label: 'Risk Screening', icon: ShieldAlert, desc: 'Automated compliance checks' },
              { label: 'PCF Calculations', icon: Zap, desc: 'Carbon footprint analysis' }
            ].map((item, i) => (
              <div key={i} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <item.icon className="w-8 h-8 mb-2 text-[#86b027]" />
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics Cards */}
      {hasData && (
        <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white border border-slate-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-700 font-medium mb-1">Total Operations</p>
                <p className="text-3xl font-bold text-slate-900">{totalOperations.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                <Activity className="w-6 h-6 text-slate-900" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-700 font-medium mb-1">Tokens Consumed</p>
                <p className="text-3xl font-bold text-slate-900">{totalTokens.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                <Zap className="w-6 h-6 text-slate-900" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-700 font-medium mb-1">Success Rate</p>
                <p className="text-3xl font-bold text-slate-900">
                  {totalOperations > 0 ? ((successfulOps / totalOperations) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-slate-900" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-700 font-medium mb-1">Avg Duration</p>
                <p className="text-3xl font-bold text-slate-900">{Math.round(avgDuration)}ms</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-slate-900" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Charts */}
      {hasData && (
        <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="bg-slate-100 border border-slate-300">
          <TabsTrigger value="timeline" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600">Timeline</TabsTrigger>
          <TabsTrigger value="operations" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600">By Operation</TabsTrigger>
          <TabsTrigger value="tenants" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600">By Tenant</TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card className="bg-white border border-slate-300">
            <CardHeader>
              <CardTitle className="text-slate-900">Token Consumption Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" style={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="tokens" stroke="#000000" strokeWidth={2} name="Tokens" />
                  <Line type="monotone" dataKey="operations" stroke="#666666" strokeWidth={2} name="Operations" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-white border border-slate-300">
              <CardHeader>
                <CardTitle className="text-slate-900">Success vs Failed Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={successRateData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {successRateData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-300">
              <CardHeader>
                <CardTitle className="text-slate-900">Monthly Billing Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyBilling.slice(0, 6).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="billing_month" stroke="#64748b" style={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" style={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="tokens_consumed" fill="#000000" name="Tokens" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations">
          <Card className="bg-white border border-slate-300">
            <CardHeader>
              <CardTitle className="text-slate-900">Top Operations by Token Consumption</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={operationTypeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" style={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" style={{ fontSize: 11 }} width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="tokens" fill="#000000" name="Tokens" />
                  <Bar dataKey="operations" fill="#666666" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenants">
          <Card className="bg-white border border-slate-300">
            <CardHeader>
              <CardTitle className="text-slate-900">Usage by Tenant</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={tenantData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" style={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="tokens" fill="#000000" name="Tokens" />
                  <Bar dataKey="operations" fill="#666666" name="Operations" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card className="bg-white border border-slate-300">
            <CardHeader>
              <CardTitle className="text-slate-900">Average Response Time by Operation</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={operationTypeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" style={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" style={{ fontSize: 11 }} width={150} />
                  <Tooltip />
                  <Bar dataKey="avgDuration" fill="#000000" name="Avg Duration (ms)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}

function filterByPeriod(log, period) {
  const logDate = new Date(log.started_at);
  const now = new Date();
  
  switch (period) {
    case 'last_24_hours':
      return logDate > new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'last_7_days':
      return logDate > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'last_30_days':
      return logDate > new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'current_month':
      return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
    case 'all_time':
      return true;
    default:
      return true;
  }
}

function generateTimeSeriesData(logs, period) {
  const dataMap = {};
  
  logs.forEach(log => {
    const date = format(new Date(log.started_at), period === 'last_24_hours' ? 'HH:00' : 'MMM dd');
    if (!dataMap[date]) {
      dataMap[date] = { date, tokens: 0, operations: 0 };
    }
    dataMap[date].tokens += log.token_cost || 0;
    dataMap[date].operations += 1;
  });

  return Object.values(dataMap).sort((a, b) => a.date.localeCompare(b.date));
}