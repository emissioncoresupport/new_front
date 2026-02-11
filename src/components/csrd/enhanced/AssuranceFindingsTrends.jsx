import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { TrendingDown, TrendingUp, AlertCircle } from "lucide-react";

export default function AssuranceFindingsTrends({ findings }) {
  const [timeframe, setTimeframe] = useState('all'); // all, 3m, 6m, 12m

  // Filter by timeframe
  const filteredFindings = findings.filter(f => {
    if (timeframe === 'all') return true;
    const months = parseInt(timeframe);
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    return new Date(f.created_date) >= cutoffDate;
  });

  // Group findings by month
  const findingsByMonth = filteredFindings.reduce((acc, f) => {
    const month = new Date(f.created_date).toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!acc[month]) {
      acc[month] = { month, total: 0, critical: 0, high: 0, medium: 0, low: 0, resolved: 0, open: 0 };
    }
    acc[month].total++;
    acc[month][f.severity.toLowerCase()]++;
    if (f.status === 'Resolved') acc[month].resolved++;
    if (f.status === 'Open') acc[month].open++;
    return acc;
  }, {});

  const trendData = Object.values(findingsByMonth);

  // Findings by ESRS
  const findingsByESRS = filteredFindings.reduce((acc, f) => {
    const std = f.esrs_standard || 'Unspecified';
    if (!acc[std]) {
      acc[std] = { standard: std, total: 0, critical: 0, high: 0, resolved: 0 };
    }
    acc[std].total++;
    if (f.severity === 'Critical') acc[std].critical++;
    if (f.severity === 'High') acc[std].high++;
    if (f.status === 'Resolved') acc[std].resolved++;
    return acc;
  }, {});

  const esrsData = Object.values(findingsByESRS).sort((a, b) => b.total - a.total);

  // Findings by type
  const findingsByType = filteredFindings.reduce((acc, f) => {
    const type = f.finding_type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const typeData = Object.entries(findingsByType).map(([type, count]) => ({
    name: type,
    value: count
  }));

  const COLORS = ['#ef4444', '#f59e0b', '#eab308', '#86b027', '#02a1e8', '#8b5cf6'];

  // Resolution rate trend
  const resolutionTrend = trendData.map(d => ({
    month: d.month,
    rate: d.total > 0 ? ((d.resolved / d.total) * 100).toFixed(1) : 0
  }));

  // Calculate insights
  const totalFindings = filteredFindings.length;
  const criticalFindings = filteredFindings.filter(f => f.severity === 'Critical').length;
  const resolvedFindings = filteredFindings.filter(f => f.status === 'Resolved').length;
  const resolutionRate = totalFindings > 0 ? ((resolvedFindings / totalFindings) * 100).toFixed(1) : 0;
  
  const avgResolutionTime = filteredFindings
    .filter(f => f.status === 'Resolved' && f.resolved_date)
    .map(f => {
      const created = new Date(f.created_date);
      const resolved = new Date(f.resolved_date);
      return (resolved - created) / (1000 * 60 * 60 * 24); // days
    })
    .reduce((sum, days, _, arr) => sum + days / arr.length, 0);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-[#545454]">Findings Trends & Analytics</h3>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="3">Last 3 Months</SelectItem>
            <SelectItem value="6">Last 6 Months</SelectItem>
            <SelectItem value="12">Last 12 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-1">Total Findings</p>
            <p className="text-3xl font-bold text-[#545454]">{totalFindings}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-1">Critical Findings</p>
            <p className="text-3xl font-bold text-rose-600">{criticalFindings}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-1">Resolution Rate</p>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-[#86b027]">{resolutionRate}%</p>
              {resolutionRate >= 70 ? 
                <TrendingUp className="w-5 h-5 text-[#86b027]" /> : 
                <TrendingDown className="w-5 h-5 text-amber-600" />
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-1">Avg Resolution Time</p>
            <p className="text-3xl font-bold text-[#02a1e8]">
              {avgResolutionTime > 0 ? Math.round(avgResolutionTime) : 0}d
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Findings Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Findings Trend Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="critical" stackId="1" stroke="#ef4444" fill="#ef4444" name="Critical" />
              <Area type="monotone" dataKey="high" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="High" />
              <Area type="monotone" dataKey="medium" stackId="1" stroke="#eab308" fill="#eab308" name="Medium" />
              <Area type="monotone" dataKey="low" stackId="1" stroke="#86b027" fill="#86b027" name="Low" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Findings by ESRS */}
        <Card>
          <CardHeader>
            <CardTitle>Findings by ESRS Standard</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={esrsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="standard" type="category" width={80} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#86b027" name="Total" />
                <Bar dataKey="resolved" fill="#02a1e8" name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Findings by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Findings by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Resolution Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Resolution Rate Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={resolutionTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="rate" stroke="#86b027" strokeWidth={3} name="Resolution Rate (%)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}