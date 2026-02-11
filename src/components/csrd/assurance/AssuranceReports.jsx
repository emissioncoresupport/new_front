import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, FileText, Download, Shield } from "lucide-react";
import { toast } from "sonner";
import AssuranceReportModal from './AssuranceReportModal';

export default function AssuranceReports() {
  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const queryClient = useQueryClient();

  const { data: reports = [] } = useQuery({
    queryKey: ['csrd-assurance-reports'],
    queryFn: () => base44.entities.CSRDAssuranceReport.list('-reporting_year')
  });

  const getStatusColor = (status) => {
    const colors = {
      'Planning': 'bg-slate-500',
      'Fieldwork': 'bg-blue-500',
      'Review': 'bg-purple-500',
      'Draft Report': 'bg-amber-500',
      'Final Report': 'bg-emerald-500',
      'Completed': 'bg-[#86b027]'
    };
    return colors[status] || 'bg-slate-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#545454]">Assurance Reports</h2>
          <p className="text-sm text-slate-600 mt-1">Manage assurance engagements and reports</p>
        </div>
        <Button onClick={() => { setEditingReport(null); setShowModal(true); }} className="bg-[#86b027] hover:bg-[#769c22]">
          <Plus className="w-4 h-4 mr-2" />
          New Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map(report => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-[#545454]">
                    <Shield className="w-5 h-5 inline mr-2" />
                    {report.reporting_year} Assurance
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-1">{report.assurance_provider}</p>
                </div>
                <Badge className={getStatusColor(report.status)}>{report.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Type</p>
                    <p className="font-medium">{report.assurance_type}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Lead Auditor</p>
                    <p className="font-medium">{report.lead_auditor_name || 'TBD'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Scope</p>
                    <p className="font-medium">{report.scope?.length || 0} ESRS</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Conclusion</p>
                    <Badge variant="outline">{report.assurance_conclusion}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{report.total_findings || 0}</p>
                    <p className="text-xs text-slate-500">Total Findings</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-rose-600">{report.critical_findings || 0}</p>
                    <p className="text-xs text-slate-500">Critical</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-600">{report.open_findings || 0}</p>
                    <p className="text-xs text-slate-500">Open</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button size="sm" variant="outline" onClick={() => { setEditingReport(report); setShowModal(true); }} className="flex-1">
                    Edit
                  </Button>
                  {report.report_url && (
                    <Button size="sm" variant="outline" onClick={() => window.open(report.report_url, '_blank')}>
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {reports.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">No assurance reports yet</p>
            <Button onClick={() => setShowModal(true)} className="bg-[#86b027] hover:bg-[#769c22]">
              Create First Report
            </Button>
          </CardContent>
        </Card>
      )}

      <AssuranceReportModal
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) setEditingReport(null);
        }}
        report={editingReport}
      />
    </div>
  );
}