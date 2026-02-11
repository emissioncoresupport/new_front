import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Download, TrendingUp, DollarSign, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Comprehensive Usage & Billing Dashboard
 * White-label ready - tracks all API calls, reports, calculations
 */
export default function ComprehensiveUsageDashboard() {
  const { data: logs = [] } = useQuery({
    queryKey: ['usage-logs'],
    queryFn: () => base44.entities.UsageLog.list('-created_date', 500)
  });

  const { data: billing = [] } = useQuery({
    queryKey: ['monthly-billing'],
    queryFn: () => base44.entities.MonthlyBilling.list('-billing_period', 12)
  });

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentBilling = billing.find(b => b.billing_period === currentMonth);

  const thisMonthLogs = logs.filter(l => l.created_date?.startsWith(currentMonth));
  const thisMonthCost = thisMonthLogs.reduce((sum, l) => sum + (l.total_cost_eur || 0), 0);

  const byModule = thisMonthLogs.reduce((acc, log) => {
    if (!acc[log.module]) acc[log.module] = { operations: 0, cost: 0 };
    acc[log.module].operations++;
    acc[log.module].cost += log.total_cost_eur || 0;
    return acc;
  }, {});

  const byOperation = thisMonthLogs.reduce((acc, log) => {
    const op = log.operation_type;
    if (!acc[op]) acc[op] = { count: 0, cost: 0 };
    acc[op].count++;
    acc[op].cost += log.total_cost_eur || 0;
    return acc;
  }, {});

  const trendData = billing.slice(0, 6).reverse().map(b => ({
    month: b.billing_period,
    cost: b.total_cost_eur,
    operations: b.total_operations
  }));

  return (
    <div className="space-y-6">
      {/* Current Month Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white border border-slate-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <DollarSign className="w-5 h-5 text-slate-900" />
              <Badge className="bg-slate-900 text-white">Current</Badge>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">€{thisMonthCost.toFixed(2)}</h3>
            <p className="text-sm text-slate-700 font-medium mt-2">This Month Usage</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Zap className="w-5 h-5 text-slate-900" />
              <Badge className="bg-slate-900 text-white">Operations</Badge>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{thisMonthLogs.length}</h3>
            <p className="text-sm text-slate-700 font-medium mt-2">API Calls</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-5 h-5 text-slate-900" />
              <Badge className="bg-slate-900 text-white">Avg</Badge>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">€{(thisMonthCost / thisMonthLogs.length || 0).toFixed(3)}</h3>
            <p className="text-sm text-slate-700 font-medium mt-2">Per Operation</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Download className="w-5 h-5 text-slate-900" />
              <Button variant="outline" size="sm" className="border-slate-300">Export</Button>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{Object.keys(byModule).length}</h3>
            <p className="text-sm text-slate-700 font-medium mt-2">Active Modules</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card className="bg-white border border-slate-300">
        <CardHeader>
          <CardTitle className="text-slate-900">6-Month Cost Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Line type="monotone" dataKey="cost" stroke="#000000" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Module Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-white border border-slate-300">
          <CardHeader>
            <CardTitle className="text-slate-900">Cost by Module</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(byModule).sort((a, b) => b[1].cost - a[1].cost).map(([module, data]) => (
                <div key={module} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded">
                  <div>
                    <span className="font-bold text-slate-900">{module}</span>
                    <span className="text-sm text-slate-600 ml-2">({data.operations} ops)</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900">€{data.cost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-300">
          <CardHeader>
            <CardTitle className="text-slate-900">Top Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(byOperation).sort((a, b) => b[1].cost - a[1].cost).slice(0, 8).map(([op, data]) => (
                <div key={op} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded">
                  <div>
                    <span className="text-sm font-bold text-slate-900">{op.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-slate-600 ml-2">×{data.count}</span>
                  </div>
                  <span className="font-bold text-slate-900">€{data.cost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Logs */}
      <Card className="bg-white border border-slate-300">
        <CardHeader>
          <CardTitle className="text-slate-900">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {thisMonthLogs.slice(0, 20).map((log, i) => (
              <div key={i} className="flex items-center justify-between p-2 border-b border-slate-200 last:border-0 text-sm">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="border-slate-300 text-slate-900">{log.module}</Badge>
                  <span className="text-slate-700">{log.operation_type}</span>
                  <span className="text-xs text-slate-600">{new Date(log.created_date).toLocaleString()}</span>
                </div>
                <span className="font-mono font-bold text-slate-900">€{log.total_cost_eur?.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}