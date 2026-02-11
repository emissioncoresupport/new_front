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

export default function FindingModal({ open, onOpenChange, finding }) {
  const [formData, setFormData] = useState({
    finding_reference: '',
    finding_type: 'Data Gap',
    severity: 'Medium',
    esrs_standard: '',
    finding_description: '',
    recommended_action: '',
    management_response: '',
    remediation_plan: '',
    remediation_due_date: '',
    status: 'Open',
    auditor_name: '',
    auditor_email: ''
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (finding) {
      setFormData(finding);
    } else {
      setFormData({
        finding_reference: `FIND-${Date.now()}`,
        finding_type: 'Data Gap',
        severity: 'Medium',
        esrs_standard: '',
        finding_description: '',
        recommended_action: '',
        management_response: '',
        remediation_plan: '',
        remediation_due_date: '',
        status: 'Open',
        auditor_name: '',
        auditor_email: ''
      });
    }
  }, [finding, open]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (finding) {
        return base44.entities.CSRDAssuranceFinding.update(finding.id, data);
      }
      return base44.entities.CSRDAssuranceFinding.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csrd-assurance-findings'] });
      toast.success(finding ? 'Finding updated' : 'Finding created');
      onOpenChange(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{finding ? 'Edit' : 'Add'} Assurance Finding</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Finding Reference</Label>
              <Input value={formData.finding_reference} onChange={(e) => setFormData({...formData, finding_reference: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>ESRS Standard</Label>
              <Select value={formData.esrs_standard} onValueChange={(v) => setFormData({...formData, esrs_standard: v})}>
                <SelectTrigger><SelectValue placeholder="Select ESRS" /></SelectTrigger>
                <SelectContent>
                  {['ESRS E1', 'ESRS E2', 'ESRS E3', 'ESRS E4', 'ESRS E5', 'ESRS S1', 'ESRS S2', 'ESRS S3', 'ESRS S4', 'ESRS G1'].map(std => 
                    <SelectItem key={std} value={std}>{std}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Finding Type</Label>
              <Select value={formData.finding_type} onValueChange={(v) => setFormData({...formData, finding_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Data Gap', 'Inconsistency', 'Control Weakness', 'Calculation Error', 'Documentation Missing', 'Process Issue'].map(type => 
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={formData.severity} onValueChange={(v) => setFormData({...formData, severity: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Low', 'Medium', 'High', 'Critical'].map(sev => 
                    <SelectItem key={sev} value={sev}>{sev}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Finding Description</Label>
            <Textarea 
              value={formData.finding_description} 
              onChange={(e) => setFormData({...formData, finding_description: e.target.value})}
              rows={3}
              placeholder="Describe the finding in detail..."
            />
          </div>

          <div className="space-y-2">
            <Label>Recommended Action</Label>
            <Textarea 
              value={formData.recommended_action} 
              onChange={(e) => setFormData({...formData, recommended_action: e.target.value})}
              rows={2}
              placeholder="Auditor's recommendation..."
            />
          </div>

          <div className="space-y-2">
            <Label>Management Response</Label>
            <Textarea 
              value={formData.management_response} 
              onChange={(e) => setFormData({...formData, management_response: e.target.value})}
              rows={2}
              placeholder="Company's response to the finding..."
            />
          </div>

          <div className="space-y-2">
            <Label>Remediation Plan</Label>
            <Textarea 
              value={formData.remediation_plan} 
              onChange={(e) => setFormData({...formData, remediation_plan: e.target.value})}
              rows={2}
              placeholder="Action plan to address the finding..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Open', 'In Progress', 'Resolved', 'Accepted Risk'].map(status => 
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Remediation Due Date</Label>
              <Input 
                type="date" 
                value={formData.remediation_due_date} 
                onChange={(e) => setFormData({...formData, remediation_due_date: e.target.value})} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Auditor Name</Label>
              <Input value={formData.auditor_name} onChange={(e) => setFormData({...formData, auditor_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Auditor Email</Label>
              <Input type="email" value={formData.auditor_email} onChange={(e) => setFormData({...formData, auditor_email: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate(formData)} className="bg-[#86b027] hover:bg-[#769c22]">
            {finding ? 'Update' : 'Create'} Finding
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}