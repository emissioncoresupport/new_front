import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, CheckCircle2, Clock, FileCheck, TrendingUp, Activity } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AssuranceFindingsTrends from '../enhanced/AssuranceFindingsTrends';

export default function AssuranceDashboard({ setActiveView }) {
  const { data: reports = [] } = useQuery({
    queryKey: ['csrd-assurance-reports'],
    queryFn: () => base44.entities.CSRDAssuranceReport.list('-engagement_start_date')
  });

  const { data: findings = [] } = useQuery({
    queryKey: ['csrd-assurance-findings'],
    queryFn: () => base44.entities.CSRDAssuranceFinding.list()
  });

  const currentReport = reports[0];

  const stats = {
    totalFindings: findings.length,
    openFindings: findings.filter(f => f.status === 'Open').length,
    inProgressFindings: findings.filter(f => f.status === 'In Progress').length,
    resolvedFindings: findings.filter(f => f.status === 'Resolved').length,
    criticalFindings: findings.filter(f => f.severity === 'Critical').length,
    highFindings: findings.filter(f => f.severity === 'High').length
  };

  const findingsBySeverity = [
    { name: 'Critical', value: findings.filter(f => f.severity === 'Critical').length, color: '#ef4444' },
    { name: 'High', value: findings.filter(f => f.severity === 'High').length, color: '#f59e0b' },
    { name: 'Medium', value: findings.filter(f => f.severity === 'Medium').length, color: '#eab308' },
    { name: 'Low', value: findings.filter(f => f.severity === 'Low').length, color: '#22c55e' }
  ].filter(d => d.value > 0);

  const findingsByType = findings.reduce((acc, f) => {
    const existing = acc.find(a => a.type === f.finding_type);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ type: f.finding_type, count: 1 });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-[#545454]">Limited Assurance</h2>
          <p className="text-sm text-slate-600 mt-1">Independent verification of CSRD sustainability data and narratives</p>
        </div>
        <Button onClick={() => setActiveView('reports')} className="bg-[#86b027] hover:bg-[#769c22]">
          <Shield className="w-4 h-4 mr-2" />
          View Reports
        </Button>
      </div>

      {/* Current Engagement Status */}
      {currentReport && (
        <Card className="border-[#86b027]/20 bg-gradient-to-br from-[#86b027]/5 to-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#545454]">Current Assurance Engagement</CardTitle>
              <Badge className="bg-[#86b027]">{currentReport.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-600">Assurance Provider</p>
                <p className="font-bold text-[#545454]">{currentReport.assurance_provider}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Lead Auditor</p>
                <p className="font-bold text-[#545454]">{currentReport.lead_auditor_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Reporting Year</p>
                <p className="font-bold text-[#545454]">{currentReport.reporting_year}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Fieldwork Period</p>
                <p className="font-bold text-[#545454]">
                  {currentReport.fieldwork_start_date ? new Date(currentReport.fieldwork_start_date).toLocaleDateString() : 'TBD'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Standards in Scope</p>
                <p className="font-bold text-[#545454]">{currentReport.scope?.length || 0} ESRS</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Conclusion</p>
                <Badge variant="outline">{currentReport.assurance_conclusion}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-slate-600" />
              <Badge variant="outline">{stats.totalFindings}</Badge>
            </div>
            <p className="text-xs text-slate-600 uppercase font-bold mb-1">Total Findings</p>
            <h3 className="text-3xl font-extrabold text-slate-900">{stats.totalFindings}</h3>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
              <Badge className="bg-amber-500">{stats.openFindings}</Badge>
            </div>
            <p className="text-xs text-amber-700 uppercase font-bold mb-1">Open Findings</p>
            <h3 className="text-3xl font-extrabold text-amber-600">{stats.openFindings}</h3>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-blue-600" />
              <Badge className="bg-blue-500">{stats.inProgressFindings}</Badge>
            </div>
            <p className="text-xs text-blue-700 uppercase font-bold mb-1">In Progress</p>
            <h3 className="text-3xl font-extrabold text-blue-600">{stats.inProgressFindings}</h3>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <Badge className="bg-emerald-500">{stats.resolvedFindings}</Badge>
            </div>
            <p className="text-xs text-emerald-700 uppercase font-bold mb-1">Resolved</p>
            <h3 className="text-3xl font-extrabold text-emerald-600">{stats.resolvedFindings}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-[#545454]">Findings by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            {findingsBySeverity.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={findingsBySeverity}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {findingsBySeverity.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-500 py-8">No findings recorded</p>
            )}
            <div className="flex justify-center gap-4 mt-4 flex-wrap">
              {findingsBySeverity.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm">{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[#545454]">Findings by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {findingsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={findingsByType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#86b027" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-500 py-8">No findings recorded</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Findings Trends */}
      {findings.length > 0 && (
        <AssuranceFindingsTrends findings={findings} />
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#545454]">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" onClick={() => setActiveView('findings')} className="justify-start h-auto p-4">
              <AlertTriangle className="w-5 h-5 mr-3 text-amber-600" />
              <div className="text-left">
                <p className="font-semibold">Manage Findings</p>
                <p className="text-xs text-slate-500">Review and track audit findings</p>
              </div>
            </Button>

            <Button variant="outline" onClick={() => setActiveView('data-access')} className="justify-start h-auto p-4">
              <FileCheck className="w-5 h-5 mr-3 text-[#02a1e8]" />
              <div className="text-left">
                <p className="font-semibold">Auditor Data Access</p>
                <p className="text-xs text-slate-500">View data points and evidence</p>
              </div>
            </Button>

            <Button variant="outline" onClick={() => setActiveView('reports')} className="justify-start h-auto p-4">
              <Shield className="w-5 h-5 mr-3 text-[#86b027]" />
              <div className="text-left">
                <p className="font-semibold">Assurance Reports</p>
                <p className="text-xs text-slate-500">Generate and manage reports</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}