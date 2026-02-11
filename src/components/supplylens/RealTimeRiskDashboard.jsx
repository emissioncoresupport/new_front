import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, AlertTriangle, Globe, Factory, Users, DollarSign, Zap, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function RealTimeRiskDashboard({ suppliers = [] }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: alerts = [] } = useQuery({
    queryKey: ['risk-alerts'],
    queryFn: () => base44.entities.RiskAlert.list('-created_date')
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['supply-chain-incidents'],
    queryFn: () => base44.entities.SupplyChainIncident.list('-incident_date')
  });

  // Risk factor breakdown
  const riskFactors = [
    {
      name: 'Environmental',
      count: suppliers.filter(s => (s.environmental_risk || 0) > 60).length,
      color: '#10b981',
      icon: Globe
    },
    {
      name: 'Social / Labor',
      count: suppliers.filter(s => (s.human_rights_risk || 0) > 60).length,
      color: '#f59e0b',
      icon: Users
    },
    {
      name: 'Financial',
      count: suppliers.filter(s => s.financial_risk_flag).length,
      color: '#3b82f6',
      icon: DollarSign
    },
    {
      name: 'Geopolitical',
      count: suppliers.filter(s => s.geopolitical_risk_flag).length,
      color: '#ef4444',
      icon: AlertTriangle
    }
  ];

  // Risk by country
  const riskByCountry = Object.entries(
    suppliers.reduce((acc, s) => {
      acc[s.country] = (acc[s.country] || 0) + (s.risk_score || 0);
      return acc;
    }, {})
  )
    .map(([country, totalScore]) => ({
      country,
      avgScore: Math.round(totalScore / suppliers.filter(s => s.country === country).length)
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 8);

  // Risk distribution
  const riskDistribution = [
    { name: 'Critical', value: suppliers.filter(s => s.risk_level === 'critical').length, color: '#ef4444' },
    { name: 'High', value: suppliers.filter(s => s.risk_level === 'high').length, color: '#f97316' },
    { name: 'Medium', value: suppliers.filter(s => s.risk_level === 'medium').length, color: '#eab308' },
    { name: 'Low', value: suppliers.filter(s => s.risk_level === 'low').length, color: '#22c55e' }
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate real-time update
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Live Indicator */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#86b027]">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Real-Time Risk Monitoring</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-slate-600">Live monitoring active</span>
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Risk Factor Cards */}
      <div className="grid grid-cols-4 gap-4">
        {riskFactors.map((factor) => (
          <Card key={factor.name} className="border-slate-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">{factor.name}</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: factor.color }}>
                    {factor.count}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">suppliers at risk</p>
                </div>
                <factor.icon className="w-8 h-8 opacity-20" style={{ color: factor.color }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Risk by Country */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk Concentration by Country</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={riskByCountry}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="country" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="avgScore" fill="#86b027" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Supplier Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts & Incidents */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Recent Alerts ({alerts.filter(a => a.status === 'open').length} open)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {alerts.slice(0, 5).map(alert => (
                <div key={alert.id} className="p-3 bg-white rounded-lg border border-amber-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{alert.title}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {suppliers.find(s => s.id === alert.supplier_id)?.legal_name}
                      </p>
                    </div>
                    <Badge className={
                      alert.severity === 'critical' ? 'bg-rose-100 text-rose-700' :
                      alert.severity === 'warning' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }>
                      {alert.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-rose-50/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Recent Incidents ({incidents.filter(i => i.status === 'Open').length} open)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {incidents.slice(0, 5).map(incident => (
                <div key={incident.id} className="p-3 bg-white rounded-lg border border-rose-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{incident.title}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {suppliers.find(s => s.id === incident.supplier_id)?.legal_name}
                      </p>
                    </div>
                    <Badge className={
                      incident.severity === 'Critical' ? 'bg-rose-100 text-rose-700' :
                      incident.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                      'bg-amber-100 text-amber-700'
                    }>
                      {incident.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}