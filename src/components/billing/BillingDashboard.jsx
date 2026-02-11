import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Euro, TrendingUp, Zap, Activity, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import UsageMeteringService from './UsageMeteringService';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function BillingDashboard() {
  const [usageSummary, setUsageSummary] = useState(null);

  const { data: usageLogs = [], refetch } = useQuery({
    queryKey: ['usage-logs-current'],
    queryFn: async () => {
      // Admin sees ALL usage across all tenants for current month
      const currentPeriod = new Date().toISOString().slice(0, 7);
      return base44.entities.UsageLog.filter({
        billing_period: currentPeriod
      }, '-created_date', 1000);
    }
  });

  useEffect(() => {
    const fetchSummary = async () => {
      const summary = await UsageMeteringService.getCurrentMonthUsage();
      setUsageSummary(summary);
    };
    fetchSummary();
  }, [usageLogs]);

  const totalCost = usageSummary?.totalCost || 0;
  const totalOperations = usageSummary?.totalOperations || 0;
  const avgCostPerOp = totalOperations > 0 ? totalCost / totalOperations : 0;

  // Module breakdown data
  const moduleData = usageSummary?.byModule 
    ? Object.entries(usageSummary.byModule).map(([module, cost]) => ({
        name: module,
        cost: parseFloat(cost.toFixed(2)),
        count: usageLogs.filter(l => l.module === module).length
      }))
    : [];

  // Operation type breakdown
  const operationData = usageSummary?.byOperation
    ? Object.entries(usageSummary.byOperation).map(([op, cost]) => ({
        name: op.replace(/_/g, ' '),
        value: parseFloat(cost.toFixed(2))
      }))
    : [];

  // Daily usage trend
  const dailyUsage = usageLogs.reduce((acc, log) => {
    const date = new Date(log.created_date).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { date, cost: 0, operations: 0 };
    }
    acc[date].cost += log.total_cost_eur;
    acc[date].operations += 1;
    return acc;
  }, {});

  const dailyData = Object.values(dailyUsage)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 uppercase font-bold tracking-wide">Total Cost (MTD)</p>
                <h3 className="text-3xl font-extrabold text-blue-600 mt-2">€{totalCost.toFixed(2)}</h3>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Euro className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-700 uppercase font-bold tracking-wide">Operations</p>
                <h3 className="text-3xl font-extrabold text-emerald-600 mt-2">{totalOperations}</h3>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <Activity className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 uppercase font-bold tracking-wide">Avg Cost/Op</p>
                <h3 className="text-3xl font-extrabold text-amber-600 mt-2">€{avgCostPerOp.toFixed(3)}</h3>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 uppercase font-bold tracking-wide">AI Token Usage</p>
                <h3 className="text-3xl font-extrabold text-purple-600 mt-2">
                  {(usageLogs.reduce((sum, l) => sum + (l.ai_tokens_used || 0), 0) / 1000).toFixed(1)}k
                </h3>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cost by Module</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={moduleData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="cost" fill="#3b82f6" name="Cost (€)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost by Operation Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={operationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: €${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {operationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Daily Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Usage Trend (Last 14 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="cost" fill="#3b82f6" name="Cost (€)" radius={[8, 8, 0, 0]} />
              <Bar yAxisId="right" dataKey="operations" fill="#10b981" name="Operations" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Alert if high usage */}
      {totalCost > 100 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900">High Usage Alert</p>
                <p className="text-sm text-amber-700">
                  Your monthly usage has exceeded €100. Consider reviewing your pricing plan or usage patterns.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}