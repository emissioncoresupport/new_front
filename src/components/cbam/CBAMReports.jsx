import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, Eye, Plus, CheckCircle2, Clock, Sparkles, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import CBAMReportAssistant from "./CBAMReportAssistant";
import CBAMSubmissionActions from "./CBAMSubmissionActions";

export default function CBAMReports({ reports }) {
  const queryClient = useQueryClient();

  // Fetch all entries
  const { data: entries = [] } = useQuery({
    queryKey: ['cbam-emission-entries'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });

  // Fetch installations
  const { data: installations = [] } = useQuery({
    queryKey: ['cbam-installations'],
    queryFn: () => base44.entities.CBAMInstallation.list()
  });

  // Fetch certificates
  const { data: certificates = [] } = useQuery({
    queryKey: ['cbam-certificates'],
    queryFn: () => base44.entities.CBAMCertificate.list()
  });

  // Filter for Q4 2025
  const q4Entries = entries.filter(e => {
    if (!e.import_date) return false;
    const date = new Date(e.import_date);
    return date >= new Date('2025-10-01') && date <= new Date('2025-12-31');
  });

  // Check if report already exists
  const q4ReportExists = reports.some(r => r.period === 'Q4-2025');
  const hasPendingData = q4Entries.length > 0 && !q4ReportExists;

  const generateReportMutation = useMutation({
    mutationFn: async () => {
       // Calculate totals
       let totalDirect = 0;
       let totalIndirect = 0;
       let totalEmissions = 0;

       q4Entries.forEach(e => {
         const mass = e.net_mass_tonnes || 0;
         totalDirect += (e.direct_emissions_specific || 0) * mass;
         totalIndirect += (e.indirect_emissions_specific || 0) * mass;
         totalEmissions += (e.total_embedded_emissions || 0);
       });

       const requiredCerts = Math.ceil(totalEmissions);

       // Create Report
       const report = await base44.entities.CBAMReport.create({
          period: "Q4-2025",
          year: 2025,
          status: "draft",
          total_emissions: totalEmissions,
          total_direct_emissions: totalDirect,
          total_indirect_emissions: totalIndirect,
          certificates_required: requiredCerts,
          certificates_surrendered: 0,
          compliance_status: "compliant", // Initial draft assumption
          submission_date: new Date().toISOString(),
          notes: `Auto-generated from ${q4Entries.length} import records.`
       });

       // Link entries to report
       await Promise.all(q4Entries.map(e => 
         base44.entities.CBAMEmissionEntry.update(e.id, { report_id: report.id })
       ));
       
       return report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-reports'] });
      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
      toast.success(`Generated Q4 2025 Report with ${q4Entries.length} records`);
    },
    onError: () => toast.error("Failed to generate report")
  });

  const createReportMutation = useMutation({
    mutationFn: (data) => base44.entities.CBAMReport.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-reports'] });
      toast.success("Draft report created for Q4 2025");
    }
  });

  const handleCreateReport = () => {
    createReportMutation.mutate({
      period: "Q4-2025",
      year: 2025,
      status: "draft",
      total_emissions: 0,
      total_direct_emissions: 0,
      total_indirect_emissions: 0,
      notes: "Auto-generated draft"
    });
  };

  return (
    <div className="space-y-6">
      {hasPendingData && (
        <Card className="bg-[#F5F7F8] border-[#86b027] border-dashed border-2">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#86b027]/10 rounded-full">
                <Sparkles className="w-5 h-5 text-[#86b027]" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Q4 2025 Report Ready</h3>
                <p className="text-sm text-slate-600">
                  We identified <strong>{q4Entries.length} import records</strong> for this period. 
                  Auto-generate the report now?
                </p>
              </div>
            </div>
            <Button 
              onClick={() => generateReportMutation.mutate()} 
              disabled={generateReportMutation.isPending}
              className="bg-[#86b027] hover:bg-[#769c22] text-white"
            >
              {generateReportMutation.isPending ? 'Generating...' : 'Generate Q4 Report'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Quarterly Reports</h2>
          <p className="text-sm text-slate-500">Manage your CBAM declarations and submissions</p>
        </div>
        <Button className="bg-[#86b027] hover:bg-[#769c22] text-white shadow-sm" onClick={handleCreateReport}>
          <Plus className="w-4 h-4 mr-2" />
          Create New Report
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Emissions (tCO2e)</TableHead>
                <TableHead>Certificates</TableHead>
                <TableHead>Submission Date</TableHead>
                <TableHead className="text-right min-w-[300px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No reports found. Create your first quarterly report.
                  </TableCell>
                </TableRow>
              ) : (
                reports.map(report => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.period}</TableCell>
                    <TableCell>{report.year}</TableCell>
                    <TableCell>
                      {report.status === 'submitted' ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Submitted
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <Clock className="w-3 h-3 mr-1" /> {report.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{report.total_emissions?.toFixed(2) || '-'}</TableCell>
                    <TableCell>
                        <div className="text-xs">
                            <span className="font-bold text-slate-700">{report.certificates_surrendered || 0}</span>
                            <span className="text-slate-400"> / {report.certificates_required || '-'}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{report.submission_date ? format(new Date(report.submission_date), 'MMM d, yyyy') : '-'}</span>
                        {report.registry_submission_id && (
                            <span className="text-[10px] text-slate-400 font-mono">ID: {report.registry_submission_id}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <div className="w-full mb-2">
                            {report.status === 'draft' && (
                              <CBAMReportAssistant 
                                  report={report} 
                                  entries={entries.filter(e => e.report_id === report.id)}
                                  installations={installations}
                                  certificates={certificates}
                              />
                            )}
                        </div>
                        <div className="flex justify-end gap-2 w-full">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <CBAMSubmissionActions report={report} />
                      </div>
                    </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}