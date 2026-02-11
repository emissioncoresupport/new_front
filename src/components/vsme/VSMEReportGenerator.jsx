import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { FileText, Download, Eye, Sparkles, Loader2, Plus, Calendar, Mail, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function VSMEReportGenerator({ reports }) {
  const [generating, setGenerating] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const queryClient = useQueryClient();

  const { data: disclosures = [] } = useQuery({
    queryKey: ['vsme-disclosures'],
    queryFn: () => base44.entities.VSMEDisclosure.list()
  });

  const { data: collaborators = [] } = useQuery({
    queryKey: ['vsme-collaborators'],
    queryFn: () => base44.entities.VSMECollaborator.list()
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['vsme-schedules'],
    queryFn: () => base44.entities.VSMEReportSchedule.list()
  });

  const generateReport = async () => {
    setGenerating(true);
    toast.loading('Generating VSME sustainability report...');

    try {
      const basicDisclosures = disclosures.filter(d => d.module_type === 'basic' && d.status === 'completed');
      const comprehensiveDisclosures = disclosures.filter(d => d.module_type === 'comprehensive' && d.status === 'completed');

      const prompt = `Generate a professional VSME Sustainability Report based on the following data:

Basic Module Disclosures (${basicDisclosures.length}/11):
${JSON.stringify(basicDisclosures, null, 2)}

Comprehensive Module Disclosures (${comprehensiveDisclosures.length}/9):
${JSON.stringify(comprehensiveDisclosures, null, 2)}

Create a comprehensive sustainability report following VSME formatting guidelines:
1. Executive Summary
2. Company Overview (B1)
3. Sustainability Strategy (B2, C1, C2)
4. Environmental Performance (B3-B7, C3, C4)
5. Social Performance (B8-B10, C5-C7)
6. Governance (B11, C8, C9)
7. Future Commitments

Format as professional markdown suitable for PDF export. Include:
- Clear section headers
- Data tables where appropriate
- Key metrics highlighted
- Year-over-year trends if data available
- Compliance statements

Return as plain text markdown.`;

      const reportContent = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      // Upload report as file
      const blob = new Blob([reportContent], { type: 'text/markdown' });
      const file = new File([blob], `VSME_Report_${new Date().getFullYear()}.md`, { type: 'text/markdown' });
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Create report record
      const newReport = await base44.entities.VSMEReport.create({
        report_reference: `VSME-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        reporting_year: new Date().getFullYear(),
        company_name: 'Your Company',
        company_size: 'medium',
        module_type: comprehensiveDisclosures.length > 0 ? 'comprehensive' : 'basic',
        status: 'completed',
        basic_module_completion: (basicDisclosures.length / 11) * 100,
        comprehensive_module_completion: comprehensiveDisclosures.length > 0 ? (comprehensiveDisclosures.length / 9) * 100 : 0,
        overall_completion: ((basicDisclosures.length + comprehensiveDisclosures.length) / 20) * 100,
        publication_date: new Date().toISOString(),
        report_url: file_url
      });

      queryClient.invalidateQueries({ queryKey: ['vsme-reports'] });
      
      // Download locally
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `VSME_Report_${new Date().getFullYear()}.md`;
      link.click();

      toast.success('Report generated and saved');
      setSelectedReport(newReport);
      setShowDeliveryModal(true);
    } catch (error) {
      console.error(error);
      toast.error('Report generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generate New Report */}
      <Card className="bg-gradient-to-r from-[#86b027]/5 to-white border-[#86b027]/20 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-[#545454] mb-2">Generate Sustainability Report</h3>
              <p className="text-sm text-slate-600">
                AI-powered branded PDF generation based on completed disclosures
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-[#86b027]">
                    <Clock className="w-4 h-4 mr-2" />
                    Schedule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Schedule Automated Reports</DialogTitle>
                  </DialogHeader>
                  <ScheduleForm collaborators={collaborators} />
                </DialogContent>
              </Dialog>
              <Button
                onClick={generateReport}
                disabled={generating || disclosures.filter(d => d.status === 'completed').length === 0}
                className="bg-[#86b027] hover:bg-[#769c22] shadow-md"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Active Schedules */}
          {schedules.filter(s => s.status === 'active').length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-bold text-sm text-blue-900 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Active Report Schedules
              </h4>
              <div className="space-y-2">
                {schedules.filter(s => s.status === 'active').map(schedule => (
                  <div key={schedule.id} className="flex items-center justify-between text-xs">
                    <span className="text-blue-700">{schedule.schedule_name} - {schedule.frequency}</span>
                    <Badge variant="outline" className="text-[10px]">
                      Next: {schedule.next_run_date && format(new Date(schedule.next_run_date), 'MMM d, yyyy')}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report History</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length > 0 ? (
            <div className="space-y-3">
              {reports.map(rep => (
                <div key={rep.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#86b027]/10 rounded-lg">
                      <FileText className="w-6 h-6 text-[#86b027]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#545454]">{rep.report_reference}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          FY {rep.reporting_year}
                        </span>
                        <Badge className={rep.module_type === 'comprehensive' ? 'bg-[#02a1e8]' : 'bg-[#86b027]'}>
                          {rep.module_type}
                        </Badge>
                        <Badge variant="outline">{rep.status}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {rep.report_url && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => window.open(rep.report_url, '_blank')}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-[#86b027] hover:bg-[#769c22]"
                          onClick={() => {
                            setSelectedReport(rep);
                            setShowDeliveryModal(true);
                          }}
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Send
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-lg">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Reports Yet</h3>
              <p className="text-sm text-slate-500">
                Complete disclosures and generate your first VSME report
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Modal */}
      <Dialog open={showDeliveryModal} onOpenChange={setShowDeliveryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Report to Stakeholders</DialogTitle>
          </DialogHeader>
          <ReportDeliveryForm 
            report={selectedReport} 
            collaborators={collaborators}
            onClose={() => setShowDeliveryModal(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScheduleForm({ collaborators }) {
  const [formData, setFormData] = useState({
    schedule_name: '',
    frequency: 'annual',
    recipients: [],
    include_pdf: true,
    include_excel: false,
    auto_send: false
  });
  const queryClient = useQueryClient();

  const createScheduleMutation = useMutation({
    mutationFn: (data) => {
      const nextRun = new Date();
      if (data.frequency === 'quarterly') {
        nextRun.setMonth(nextRun.getMonth() + 3);
      } else if (data.frequency === 'semi_annual') {
        nextRun.setMonth(nextRun.getMonth() + 6);
      } else {
        nextRun.setFullYear(nextRun.getFullYear() + 1);
      }

      return base44.entities.VSMEReportSchedule.create({
        ...data,
        next_run_date: nextRun.toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vsme-schedules'] });
      toast.success('Report schedule created');
    }
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Schedule Name *</Label>
        <Input
          placeholder="e.g., Annual VSME Report"
          value={formData.schedule_name}
          onChange={(e) => setFormData({ ...formData, schedule_name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Frequency *</Label>
        <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="semi_annual">Semi-Annual</SelectItem>
            <SelectItem value="annual">Annual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Recipients</Label>
        <div className="border border-slate-200 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
          {collaborators.map(collab => (
            <div key={collab.id} className="flex items-center gap-2">
              <Checkbox
                checked={formData.recipients.includes(collab.email)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFormData({ ...formData, recipients: [...formData.recipients, collab.email] });
                  } else {
                    setFormData({ ...formData, recipients: formData.recipients.filter(e => e !== collab.email) });
                  }
                }}
              />
              <span className="text-sm">{collab.name} ({collab.email})</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Export Formats</Label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.include_pdf}
              onCheckedChange={(checked) => setFormData({ ...formData, include_pdf: checked })}
            />
            <span className="text-sm">PDF Report</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.include_excel}
              onCheckedChange={(checked) => setFormData({ ...formData, include_excel: checked })}
            />
            <span className="text-sm">Excel Data Export</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <Checkbox
          checked={formData.auto_send}
          onCheckedChange={(checked) => setFormData({ ...formData, auto_send: checked })}
        />
        <span className="text-sm text-amber-900">Auto-send without manual approval</span>
      </div>

      <Button
        onClick={() => createScheduleMutation.mutate(formData)}
        disabled={!formData.schedule_name || formData.recipients.length === 0}
        className="w-full bg-[#86b027] hover:bg-[#769c22]"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Schedule
      </Button>
    </div>
  );
}

function ReportDeliveryForm({ report, collaborators, onClose }) {
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [sending, setSending] = useState(false);

  const sendReport = async () => {
    setSending(true);
    toast.loading('Sending report to stakeholders...');

    try {
      for (const email of selectedRecipients) {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `VSME Sustainability Report - ${report.report_reference}`,
          body: `Dear Stakeholder,

Please find attached the VSME Sustainability Report for ${report.reporting_year}.

Report Reference: ${report.report_reference}
Module Type: ${report.module_type}
Completion: ${Math.round(report.overall_completion)}%

View Report: ${report.report_url}

Best regards,
ESG Team`
        });
      }

      toast.success(`Report sent to ${selectedRecipients.length} recipients`);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to send report');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <h4 className="font-bold text-sm text-[#545454] mb-2">{report?.report_reference}</h4>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Badge className="bg-[#86b027]">FY {report?.reporting_year}</Badge>
          <span>•</span>
          <span>{Math.round(report?.overall_completion || 0)}% Complete</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Select Recipients</Label>
        <div className="border border-slate-200 rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
          {collaborators.map(collab => (
            <div key={collab.id} className="flex items-center gap-2">
              <Checkbox
                checked={selectedRecipients.includes(collab.email)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedRecipients([...selectedRecipients, collab.email]);
                  } else {
                    setSelectedRecipients(selectedRecipients.filter(e => e !== collab.email));
                  }
                }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{collab.name}</p>
                <p className="text-xs text-slate-500">{collab.email} • {collab.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={sendReport}
        disabled={sending || selectedRecipients.length === 0}
        className="w-full bg-[#86b027] hover:bg-[#769c22]"
      >
        {sending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Mail className="w-4 h-4 mr-2" />
            Send to {selectedRecipients.length} Recipients
          </>
        )}
      </Button>
    </div>
  );
}