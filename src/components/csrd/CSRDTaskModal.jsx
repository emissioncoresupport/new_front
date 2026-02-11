import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CSRDTaskModal({ open, onOpenChange }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'data_collection',
    esrs_standard: '',
    assigned_to: '',
    assignee_type: 'internal',
    supplier_id: '',
    priority: 'medium',
    due_date: ''
  });

  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    enabled: open
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.CSRDTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csrd-tasks'] });
      toast.success('Task created successfully');
      onOpenChange(false);
      setFormData({
        title: '',
        description: '',
        task_type: 'data_collection',
        esrs_standard: '',
        assigned_to: '',
        assignee_type: 'internal',
        supplier_id: '',
        priority: 'medium',
        due_date: ''
      });
    },
    onError: () => toast.error('Failed to create task')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.assigned_to) {
      toast.error('Title and assignee are required');
      return;
    }
    createTaskMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create CSRD Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Task Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g., Collect Scope 3 emissions data"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Detailed task instructions..."
              className="h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Task Type</Label>
              <Select value={formData.task_type} onValueChange={(val) => setFormData({...formData, task_type: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="data_collection">Data Collection</SelectItem>
                  <SelectItem value="materiality_assessment">Materiality Assessment</SelectItem>
                  <SelectItem value="stakeholder_engagement">Stakeholder Engagement</SelectItem>
                  <SelectItem value="document_review">Document Review</SelectItem>
                  <SelectItem value="narrative_preparation">Narrative Preparation</SelectItem>
                  <SelectItem value="validation">Validation</SelectItem>
                  <SelectItem value="assurance">Assurance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ESRS Standard</Label>
              <Select value={formData.esrs_standard} onValueChange={(val) => setFormData({...formData, esrs_standard: val})}>
                <SelectTrigger><SelectValue placeholder="Select ESRS" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ESRS E1">ESRS E1 - Climate Change</SelectItem>
                  <SelectItem value="ESRS E2">ESRS E2 - Pollution</SelectItem>
                  <SelectItem value="ESRS E3">ESRS E3 - Water & Marine</SelectItem>
                  <SelectItem value="ESRS E4">ESRS E4 - Biodiversity</SelectItem>
                  <SelectItem value="ESRS E5">ESRS E5 - Circular Economy</SelectItem>
                  <SelectItem value="ESRS S1">ESRS S1 - Own Workforce</SelectItem>
                  <SelectItem value="ESRS S2">ESRS S2 - Value Chain Workers</SelectItem>
                  <SelectItem value="ESRS S3">ESRS S3 - Communities</SelectItem>
                  <SelectItem value="ESRS S4">ESRS S4 - Consumers</SelectItem>
                  <SelectItem value="ESRS G1">ESRS G1 - Governance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assignee Type</Label>
            <Select value={formData.assignee_type} onValueChange={(val) => setFormData({...formData, assignee_type: val})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Internal Team Member</SelectItem>
                <SelectItem value="external">External Stakeholder</SelectItem>
                <SelectItem value="supplier">Supplier</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.assignee_type === 'supplier' && (
            <div className="space-y-2">
              <Label>Select Supplier</Label>
              <Select value={formData.supplier_id} onValueChange={(val) => {
                const supplier = suppliers.find(s => s.id === val);
                setFormData({
                  ...formData,
                  supplier_id: val,
                  assigned_to: supplier?.contact_email || ''
                });
              }}>
                <SelectTrigger><SelectValue placeholder="Choose supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(sup => (
                    <SelectItem key={sup.id} value={sup.id}>
                      {sup.legal_name} - {sup.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Assigned To (Email) *</Label>
            <Input
              type="email"
              value={formData.assigned_to}
              onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
              placeholder="user@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(val) => setFormData({...formData, priority: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#86b027] hover:bg-[#769c22]" disabled={createTaskMutation.isPending}>
              {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}