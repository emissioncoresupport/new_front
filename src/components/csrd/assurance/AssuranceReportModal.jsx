import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AssuranceReportModal({ open, onOpenChange, report }) {
  const [formData, setFormData] = useState({
    report_reference: '',
    reporting_year: new Date().getFullYear(),
    assurance_type: 'Limited Assurance',
    assurance_provider: '',
    lead_auditor_name: '',
    lead_auditor_email: '',
    engagement_start_date: '',
    engagement_end_date: '',
    status: 'Planning',
    scope: [],
    assurance_conclusion: 'Not Started'
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (report) {
      setFormData(report);
    } else {
      setFormData({
        report_reference: `ASR-${Date.now()}`,
        reporting_year: new Date().getFullYear(),
        assurance_type: 'Limited Assurance',
        assurance_provider: '',
        lead_auditor_name: '',
        lead_auditor_email: '',
        engagement_start_date: '',
        engagement_end_date: '',
        status: 'Planning',
        scope: [],
        assurance_conclusion: 'Not Started'
      });
    }
  }, [report, open]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (report) {
        return base44.entities.CSRDAssuranceReport.update(report.id, data);
      }
      return base44.entities.CSRDAssuranceReport.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csrd-assurance-reports'] });
      toast.success(report ? 'Report updated' : 'Report created');
      onOpenChange(false);
    }
  });

  const esrsStandards = ['ESRS E1', 'ESRS E2', 'ESRS E3', 'ESRS E4', 'ESRS E5', 'ESRS S1', 'ESRS S2', 'ESRS S3', 'ESRS S4', 'ESRS G1'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{report ? 'Edit' : 'Create'} Assurance Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Report Reference</Label>
              <Input value={formData.report_reference} onChange={(e) => setFormData({...formData, report_reference: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Reporting Year</Label>
              <Input type="number" value={formData.reporting_year} onChange={(e) => setFormData({...formData, reporting_year: parseInt(e.target.value)})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assurance Type</Label>
              <Select value={formData.assurance_type} onValueChange={(v) => setFormData({...formData, assurance_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Limited Assurance">Limited Assurance</SelectItem>
                  <SelectItem value="Reasonable Assurance">Reasonable Assurance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Planning', 'Fieldwork', 'Review', 'Draft Report', 'Final Report', 'Completed'].map(status => 
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assurance Provider (Audit Firm)</Label>
            <Input value={formData.assurance_provider} onChange={(e) => setFormData({...formData, assurance_provider: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lead Auditor Name</Label>
              <Input value={formData.lead_auditor_name} onChange={(e) => setFormData({...formData, lead_auditor_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Lead Auditor Email</Label>
              <Input type="email" value={formData.lead_auditor_email} onChange={(e) => setFormData({...formData, lead_auditor_email: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Engagement Start Date</Label>
              <Input type="date" value={formData.engagement_start_date} onChange={(e) => setFormData({...formData, engagement_start_date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Engagement End Date</Label>
              <Input type="date" value={formData.engagement_end_date} onChange={(e) => setFormData({...formData, engagement_end_date: e.target.value})} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assurance Conclusion</Label>
            <Select value={formData.assurance_conclusion} onValueChange={(v) => setFormData({...formData, assurance_conclusion: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Not Started', 'Unqualified Opinion', 'Qualified Opinion', 'Adverse Opinion', 'Disclaimer'].map(conclusion => 
                  <SelectItem key={conclusion} value={conclusion}>{conclusion}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Scope (ESRS Standards)</Label>
            <div className="grid grid-cols-5 gap-2 p-3 border rounded-lg">
              {esrsStandards.map(std => (
                <label key={std} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.scope?.includes(std)}
                    onChange={(e) => {
                      const newScope = e.target.checked 
                        ? [...(formData.scope || []), std]
                        : (formData.scope || []).filter(s => s !== std);
                      setFormData({...formData, scope: newScope});
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{std.replace('ESRS ', '')}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate(formData)} className="bg-[#86b027] hover:bg-[#769c22]">
            {report ? 'Update' : 'Create'} Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}