import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  Activity, Users, FileText, AlertTriangle, CheckCircle2, XCircle, 
  TrendingUp, Calendar, Shield, Bell, Clock, Send, BarChart3 
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

export default function EUDAMEDDashboard() {
  const { data: devices = [] } = useQuery({
    queryKey: ['eudamed-devices'],
    queryFn: () => base44.entities.DeviceModel.list()
  });

  const { data: actors = [] } = useQuery({
    queryKey: ['eudamed-actors'],
    queryFn: () => base44.entities.EconomicOperator.list()
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['eudamed-incidents'],
    queryFn: () => base44.entities.EUDAMEDIncident.list('-incident_date')
  });

  const { data: studies = [] } = useQuery({
    queryKey: ['eudamed-clinical'],
    queryFn: () => base44.entities.EUDAMEDClinicalInvestigation.list()
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['eudamed-reports'],
    queryFn: () => base44.entities.EUDAMEDReport.list('-submission_date')
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['eudamed-audit-logs'],
    queryFn: () => base44.entities.EUDAMEDAuditLog.list('-timestamp', 50)
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list('-created_date', 20)
  });

  const { data: syncQueue = [] } = useQuery({
    queryKey: ['eudamed-sync-queue'],
    queryFn: () => base44.entities.EUDAMEDSyncQueue.list()
  });

  // Metrics calculations
  const metrics = {
    totalActors: actors.length,
    registeredActors: actors.filter(a => a.status === 'exported' || a.status === 'ready').length,
    totalDevices: devices.length,
    registeredDevices: devices.filter(d => d.status === 'exported' || d.status === 'ready').length,
    pendingDevices: devices.filter(d => d.status === 'draft' || d.status === 'validated').length,
    openIncidents: incidents.filter(i => i.status === 'open').length,
    ongoingStudies: studies.filter(s => s.status === 'ongoing').length,
    totalReports: reports.length,
    submittedReports: reports.filter(r => r.submission_status === 'submitted').length,
    draftReports: reports.filter(r => r.submission_status === 'draft').length,
    failedReports: reports.filter(r => r.submission_status === 'rejected').length,
    unreadNotifications: notifications.filter(n => !n.read).length,
    criticalNotifications: notifications.filter(n => !n.read && n.priority === 'critical').length,
    pendingRetries: syncQueue.filter(s => s.status === 'retry_scheduled').length
  };

  // Submission success rate
  const submissionRate = metrics.submittedReports > 0 
    ? ((metrics.submittedReports / (metrics.submittedReports + metrics.failedReports)) * 100).toFixed(1)
    : 0;

  // Overdue incidents (>15 days old and not reported)
  const overdueIncidents = incidents.filter(i => {
    const daysSince = Math.floor((new Date() - new Date(i.incident_date)) / (1000 * 60 * 60 * 24));
    return daysSince > 15 && !i.reported_to_authorities;
  }).length;

  // Audit log trend data (last 7 days)
  const auditTrend = [...Array(7)].map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const dayLogs = auditLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate.toDateString() === date.toDateString();
    });

    return {
      date: dateStr,
      total: dayLogs.length,
      success: dayLogs.filter(l => l.outcome === 'success').length,
      failure: dayLogs.filter(l => l.outcome === 'failure').length
    };
  });

  // Audit action types breakdown
  const actionTypeData = [
    { name: 'Actor Reg.', value: auditLogs.filter(l => l.action_type === 'actor_registration').length, color: '#86b027' },
    { name: 'Device Reg.', value: auditLogs.filter(l => l.action_type === 'device_registration').length, color: '#02a1e8' },
    { name: 'Reports', value: auditLogs.filter(l => l.action_type === 'report_generation' || l.action_type === 'report_submission').length, color: '#f59e0b' },
    { name: 'Incidents', value: auditLogs.filter(l => l.action_type === 'incident_report').length, color: '#ef4444' },
    { name: 'Other', value: auditLogs.filter(l => !['actor_registration', 'device_registration', 'report_generation', 'report_submission', 'incident_report'].includes(l.action_type)).length, color: '#94a3b8' }
  ].filter(d => d.value > 0);

  // Report status distribution
  const reportStatusData = [
    { name: 'Submitted', value: metrics.submittedReports, color: '#86b027' },
    { name: 'Draft', value: metrics.draftReports, color: '#94a3b8' },
    { name: 'Rejected', value: metrics.failedReports, color: '#ef4444' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Critical Alerts */}
      {(metrics.criticalNotifications > 0 || overdueIncidents > 0 || metrics.pendingRetries > 0) && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-rose-900 mb-1">Attention Required</h4>
                <ul className="text-sm text-rose-800 space-y-1">
                  {metrics.criticalNotifications > 0 && (
                    <li>• {metrics.criticalNotifications} critical notification{metrics.criticalNotifications > 1 ? 's' : ''} pending</li>
                  )}
                  {overdueIncidents > 0 && (
                    <li>• {overdueIncidents} overdue incident report{overdueIncidents > 1 ? 's' : ''} (&gt;15 days)</li>
                  )}
                  {metrics.pendingRetries > 0 && (
                    <li>• {metrics.pendingRetries} failed submission{metrics.pendingRetries > 1 ? 's' : ''} pending retry</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#86b027]/20 bg-gradient-to-br from-[#86b027]/5 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-[#86b027]" />
              <Badge className="bg-[#86b027]">{metrics.registeredActors}/{metrics.totalActors}</Badge>
            </div>
            <p className="text-xs text-slate-600 uppercase font-bold mb-1">Registered Actors</p>
            <h3 className="text-2xl font-extrabold text-[#86b027]">{metrics.registeredActors}</h3>
          </CardContent>
        </Card>

        <Card className="border-[#02a1e8]/20 bg-gradient-to-br from-[#02a1e8]/5 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-[#02a1e8]" />
              <Badge className="bg-[#02a1e8]">{metrics.registeredDevices}/{metrics.totalDevices}</Badge>
            </div>
            <p className="text-xs text-slate-600 uppercase font-bold mb-1">Registered Devices</p>
            <h3 className="text-2xl font-extrabold text-[#02a1e8]">{metrics.registeredDevices}</h3>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-5 h-5 text-amber-600" />
              <Badge className="bg-amber-500">{metrics.draftReports} Draft</Badge>
            </div>
            <p className="text-xs text-slate-600 uppercase font-bold mb-1">Total Reports</p>
            <h3 className="text-2xl font-extrabold text-amber-600">{metrics.totalReports}</h3>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <Badge className="bg-rose-500">{metrics.openIncidents} Open</Badge>
            </div>
            <p className="text-xs text-slate-600 uppercase font-bold mb-1">Safety Incidents</p>
            <h3 className="text-2xl font-extrabold text-rose-600">{incidents.length}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Submission Status & Audit Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Report Submission Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#545454] flex items-center gap-2">
              <Send className="w-5 h-5" />
              Report Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Success Rate</span>
                <span className="text-2xl font-bold text-[#86b027]">{submissionRate}%</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Submitted</span>
                  </div>
                  <span className="font-bold">{metrics.submittedReports}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>Draft</span>
                  </div>
                  <span className="font-bold">{metrics.draftReports}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Failed</span>
                  </div>
                  <span className="font-bold">{metrics.failedReports}</span>
                </div>
              </div>

              {reportStatusData.length > 0 && (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={reportStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {reportStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audit Activity Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#545454] flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Audit Activity (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={auditTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#545454" name="Total Actions" strokeWidth={2} />
                <Line type="monotone" dataKey="success" stroke="#86b027" name="Success" strokeWidth={2} />
                <Line type="monotone" dataKey="failure" stroke="#ef4444" name="Failures" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Action Types Breakdown & Critical Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#545454] flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Audit Action Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            {actionTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={actionTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {actionTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-500 py-8">No audit data available</p>
            )}
          </CardContent>
        </Card>

        {/* Critical Notifications & Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#545454] flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-4">
              {notifications.filter(n => !n.read).slice(0, 5).map(notif => (
                <div key={notif.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border">
                  <div className={`shrink-0 ${
                    notif.priority === 'critical' ? 'text-rose-600' : 
                    notif.priority === 'high' ? 'text-amber-600' : 'text-[#02a1e8]'
                  }`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#545454] truncate">{notif.title}</p>
                    <p className="text-xs text-slate-600 truncate">{notif.message}</p>
                  </div>
                </div>
              ))}
              {notifications.filter(n => !n.read).length === 0 && (
                <p className="text-center text-slate-500 py-4">No unread notifications</p>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t">
              <p className="text-xs text-slate-600 font-semibold mb-3">Quick Actions</p>
              <Button size="sm" variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Report Incident
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start">
                <Shield className="w-4 h-4 mr-2" />
                View Audit Trail
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#545454] flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Compliance Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-[#545454]">Actor Registration</h4>
                {metrics.registeredActors > 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <p className="text-xs text-slate-600">
                {metrics.registeredActors > 0 
                  ? `${metrics.registeredActors} actor${metrics.registeredActors > 1 ? 's' : ''} registered`
                  : 'No actors registered yet'}
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-[#545454]">UDI/Device Registration</h4>
                {metrics.registeredDevices > 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <p className="text-xs text-slate-600">
                {metrics.registeredDevices > 0 
                  ? `${metrics.registeredDevices} device${metrics.registeredDevices > 1 ? 's' : ''} registered`
                  : 'No devices registered yet'}
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-[#545454]">Vigilance Reporting</h4>
                {overdueIncidents === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                )}
              </div>
              <p className="text-xs text-slate-600">
                {overdueIncidents === 0 
                  ? 'All incidents reported on time'
                  : `${overdueIncidents} overdue report${overdueIncidents > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}