import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, Clock, AlertTriangle, XCircle, FileText, 
  TrendingUp, Calendar, RefreshCw, ExternalLink, Download 
} from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { checkSubmissionStatus } from './CBAMSubmissionService';

export default function CBAMComplianceTracker() {
  const queryClient = useQueryClient();
  const [checkingStatus, setCheckingStatus] = useState(null);

  // Fetch all reports
  const { data: reports = [] } = useQuery({
    queryKey: ['cbam-reports'],
    queryFn: () => base44.entities.CBAMReport.list('-year')
  });

  // Calculate compliance metrics
  const totalReports = reports.length;
  const submitted = reports.filter(r => r.status === 'submitted' || r.status === 'accepted').length;
  const pending = reports.filter(r => r.status === 'draft' || r.status === 'validated').length;
  const overdue = reports.filter(r => {
    if (r.status === 'submitted' || r.status === 'accepted') return false;
    // Check if past deadline (simplified)
    const period = r.period?.split('-')[0];
    const deadlines = { Q1: 4, Q2: 6, Q3: 9, Q4: 0 }; // Months (0-indexed next year for Q4)
    const month = deadlines[period];
    if (month === undefined) return false;
    const deadline = month === 0 ? new Date(r.year + 1, 0, 31) : new Date(r.year, month, 31);
    return new Date() > deadline;
  }).length;

  const complianceRate = totalReports > 0 ? Math.round((submitted / totalReports) * 100) : 0;

  // Status Check Mutation
  const checkStatusMutation = useMutation({
    mutationFn: async (report) => {
      if (!report.registry_submission_id) {
        throw new Error('No submission ID found');
      }
      const status = await checkSubmissionStatus(report.registry_submission_id);
      
      // Update report with latest status
      await base44.entities.CBAMReport.update(report.id, {
        registry_status_message: status.message,
        status: status.status === 'accepted' ? 'accepted' : report.status
      });
      
      return status;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cbam-reports'] });
      toast.success(`Status updated: ${data.status}`);
      setCheckingStatus(null);
    },
    onError: () => {
      toast.error('Failed to check status');
      setCheckingStatus(null);
    }
  });

  const getStatusIcon = (status) => {
    switch(status) {
      case 'submitted':
      case 'submitting':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'accepted':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-rose-500" />;
      case 'validated':
        return <CheckCircle2 className="w-4 h-4 text-[#86b027]" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      draft: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Draft' },
      validated: { bg: 'bg-[#86b027]/10', text: 'text-[#86b027]', label: 'Validated' },
      submitting: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Submitting' },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Submitted' },
      accepted: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Accepted' },
      rejected: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Rejected' }
    };
    const config = configs[status] || configs.draft;
    return <Badge className={`${config.bg} ${config.text} border-0`}>{config.label}</Badge>;
  };

  const getComplianceColor = (rate) => {
    if (rate >= 90) return 'text-emerald-600';
    if (rate >= 70) return 'text-[#86b027]';
    if (rate >= 50) return 'text-amber-600';
    return 'text-rose-600';
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-500">Compliance Rate</p>
              <TrendingUp className={`w-4 h-4 ${getComplianceColor(complianceRate)}`} />
            </div>
            <h3 className={`text-3xl font-bold ${getComplianceColor(complianceRate)}`}>{complianceRate}%</h3>
            <Progress value={complianceRate} className="h-2 mt-2" indicatorClassName={`${complianceRate >= 70 ? 'bg-[#86b027]' : 'bg-amber-500'}`} />
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-500">Submitted</p>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <h3 className="text-3xl font-bold text-slate-800">{submitted}</h3>
            <p className="text-xs text-slate-400 mt-1">of {totalReports} reports</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-500">Pending</p>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="text-3xl font-bold text-slate-800">{pending}</h3>
            <p className="text-xs text-slate-400 mt-1">require action</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-500">Overdue</p>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <h3 className="text-3xl font-bold text-rose-600">{overdue}</h3>
            <p className="text-xs text-slate-400 mt-1">past deadline</p>
          </CardContent>
        </Card>
      </div>

      {/* Submission History Timeline */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Submission History & Status Tracking</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['cbam-reports'] })}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">No reports yet</p>
              <p className="text-sm mt-1">Create your first quarterly report to start tracking compliance</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report, index) => (
                <div 
                  key={report.id}
                  className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:border-[#86b027]/30 hover:bg-slate-50/50 transition-all"
                >
                  {/* Timeline Dot */}
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      report.status === 'accepted' ? 'bg-emerald-100' :
                      report.status === 'submitted' ? 'bg-blue-100' :
                      report.status === 'validated' ? 'bg-[#86b027]/10' :
                      'bg-slate-100'
                    }`}>
                      {getStatusIcon(report.status)}
                    </div>
                    {index < reports.length - 1 && (
                      <div className="w-0.5 h-full bg-slate-200 mt-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-bold text-slate-900">{report.period}</h4>
                          {getStatusBadge(report.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Year {report.year}</span>
                          </div>
                          <span>•</span>
                          <span>{report.total_emissions?.toFixed(1) || '0'} tCO2e</span>
                          <span>•</span>
                          <span>{report.certificates_required || 0} certs required</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {report.registry_submission_id && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setCheckingStatus(report.id);
                              checkStatusMutation.mutate(report);
                            }}
                            disabled={checkingStatus === report.id}
                          >
                            {checkingStatus === report.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <RefreshCw className="w-4 h-4 mr-1" />
                                Check Status
                              </>
                            )}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          Export
                        </Button>
                      </div>
                    </div>

                    {/* Submission Details */}
                    {report.submission_date && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-slate-500">Submitted:</span>
                            <span className="ml-2 font-medium text-slate-700">
                              {format(new Date(report.submission_date), 'MMM d, yyyy HH:mm')}
                            </span>
                          </div>
                          {report.registry_submission_id && (
                            <div>
                              <span className="text-slate-500">Transaction ID:</span>
                              <span className="ml-2 font-mono font-medium text-[#02a1e8]">
                                {report.registry_submission_id}
                              </span>
                            </div>
                          )}
                        </div>
                        {report.registry_status_message && (
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <span className="text-slate-500">Registry Status:</span>
                            <p className="mt-1 text-slate-700">{report.registry_status_message}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Deadlines */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Upcoming Reporting Deadlines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { period: 'Q1 2026', deadline: 'May 31, 2026', daysLeft: 177 },
              { period: 'Q2 2026', deadline: 'July 31, 2026', daysLeft: 238 },
              { period: 'Q3 2026', deadline: 'October 31, 2026', daysLeft: 330 }
            ].map((item) => (
              <div key={item.period} className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                <div>
                  <p className="font-bold text-slate-900">{item.period}</p>
                  <p className="text-sm text-slate-500">{item.deadline}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#86b027]">{item.daysLeft} days</p>
                  <p className="text-xs text-slate-400">remaining</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}