import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, CheckCircle2, Clock, XCircle, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";

export default function CBAMSubmissionQueue() {
  const queryClient = useQueryClient();

  const { data: reports = [] } = useQuery({
    queryKey: ['cbam-reports'],
    queryFn: () => base44.entities.CBAMReport.list('-updated_date')
  });

  const submitMutation = useMutation({
    mutationFn: async (report_id) => {
      const { data } = await base44.functions.invoke('cbamRegistrySubmissionV2', {
        report_id,
        test_mode: true // Change to false for production
      });
      return data;
    },
    onSuccess: (data, report_id) => {
      toast.success(`Report submitted: ${data.confirmation_number}`);
      queryClient.invalidateQueries({ queryKey: ['cbam-reports'] });
    },
    onError: (error) => {
      toast.error(`Submission failed: ${error.message}`);
    }
  });

  const retryMutation = useMutation({
    mutationFn: async (report_id) => {
      const { data } = await base44.functions.invoke('cbamRegistrySubmissionV2', {
        report_id,
        test_mode: true,
        retry_count: 0
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Retry successful');
      queryClient.invalidateQueries({ queryKey: ['cbam-reports'] });
    }
  });

  const pendingReports = reports.filter(r => r.status === 'draft' || r.status === 'validated');
  const submittedReports = reports.filter(r => r.status === 'submitted' || r.status === 'accepted');
  const failedReports = reports.filter(r => r.status === 'failed');

  const getStatusBadge = (status) => {
    const configs = {
      draft: { color: 'bg-slate-100 text-slate-700', icon: Clock },
      validated: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
      submitted: { color: 'bg-emerald-100 text-emerald-700', icon: Send },
      accepted: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
      failed: { color: 'bg-red-100 text-red-700', icon: XCircle }
    };
    const config = configs[status] || configs.draft;
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-sm p-5">
        <h3 className="text-base font-medium text-slate-900 mb-4">Submission Queue</h3>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-blue-50/50 rounded-lg border border-blue-200/50 p-3">
            <div className="text-xs text-blue-700 mb-1">Pending</div>
            <div className="text-2xl font-light text-blue-900">{pendingReports.length}</div>
          </div>
          <div className="bg-emerald-50/50 rounded-lg border border-emerald-200/50 p-3">
            <div className="text-xs text-emerald-700 mb-1">Submitted</div>
            <div className="text-2xl font-light text-emerald-900">{submittedReports.length}</div>
          </div>
          <div className="bg-red-50/50 rounded-lg border border-red-200/50 p-3">
            <div className="text-xs text-red-700 mb-1">Failed</div>
            <div className="text-2xl font-light text-red-900">{failedReports.length}</div>
          </div>
        </div>

        {pendingReports.length > 0 && (
          <div className="mb-5">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Ready for Submission</h4>
            <div className="space-y-2">
              {pendingReports.map(report => (
                <div 
                  key={report.id}
                  className="bg-slate-50/50 rounded-lg border border-slate-200/60 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-900">
                          {report.reporting_period}
                        </span>
                        {getStatusBadge(report.status)}
                        <Badge variant="outline" className="font-mono text-xs">
                          {report.member_state}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-600">
                        {report.total_imports_count} imports • {report.total_embedded_emissions?.toFixed(2)} tCO2e
                      </div>
                      {report.status === 'validated' && (
                        <Progress value={100} className="h-1 mt-2" indicatorClassName="bg-blue-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(report.xml_file_url, '_blank')}
                        disabled={!report.xml_file_url}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => submitMutation.mutate(report.id)}
                        disabled={submitMutation.isPending || !report.xml_file_url}
                        className="bg-[#86b027] hover:bg-[#86b027]/90"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Submit
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {failedReports.length > 0 && (
          <div className="mb-5">
            <h4 className="text-sm font-medium text-red-700 mb-2">Failed Submissions</h4>
            <div className="space-y-2">
              {failedReports.map(report => (
                <div 
                  key={report.id}
                  className="bg-red-50/50 rounded-lg border border-red-200/60 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-900">
                          {report.reporting_period}
                        </span>
                        {getStatusBadge(report.status)}
                      </div>
                      <div className="text-xs text-red-600">
                        Submission failed - check logs and retry
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => retryMutation.mutate(report.id)}
                      disabled={retryMutation.isPending}
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Retry
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {submittedReports.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-emerald-700 mb-2">Successfully Submitted</h4>
            <div className="space-y-2">
              {submittedReports.slice(0, 5).map(report => (
                <div 
                  key={report.id}
                  className="bg-emerald-50/50 rounded-lg border border-emerald-200/60 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-900">
                          {report.reporting_period}
                        </span>
                        {getStatusBadge(report.status)}
                      </div>
                      <div className="text-xs text-emerald-600">
                        ✓ {report.registry_confirmation_number}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(report.submission_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}