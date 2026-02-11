import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LCADataRequestModal({ request, isOpen, onClose }) {
  const [formData, setFormData] = useState({
    supplier_id: '',
    process_name: '',
    activity_type: 'Material',
    request_description: '',
    data_fields_requested: ['emission_factor_climate', 'emission_factor_water', 'geographic_scope', 'temporal_scope'],
    due_date: '',
    priority: 'Medium',
    status: 'Draft'
  });

  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  useEffect(() => {
    if (request) {
      setFormData(request);
    }
  }, [request]);

  const sendRequestMutation = useMutation({
    mutationFn: async (data) => {
      const supplier = suppliers.find(s => s.id === data.supplier_id);
      
      // Create or update the request
      let savedRequest;
      if (request) {
        savedRequest = await base44.entities.LCADataRequest.update(request.id, { ...data, status: 'Sent' });
      } else {
        savedRequest = await base44.entities.LCADataRequest.create({
          ...data,
          request_id: `LCA-REQ-${Date.now()}`,
          status: 'Sent'
        });
      }

      // Send email to supplier
      if (supplier?.email) {
        await base44.integrations.Core.SendEmail({
          to: supplier.email,
          subject: `LCA Data Request: ${data.process_name}`,
          body: `Dear ${supplier.legal_name},

We are requesting LCA (Life Cycle Assessment) data for the following process:

Process: ${data.process_name}
Activity Type: ${data.activity_type}
Priority: ${data.priority}
${data.due_date ? `Due Date: ${new Date(data.due_date).toLocaleDateString()}` : ''}

Description:
${data.request_description}

Data Fields Requested:
${data.data_fields_requested.map(f => `- ${f}`).join('\n')}

Please access the supplier portal to submit your data. If you need assistance or have questions, please don't hesitate to reach out.

Best regards`
        });
      }

      return savedRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lca-data-requests'] });
      toast.success('Data request sent to supplier');
      onClose();
    }
  });

  const saveDraftMutation = useMutation({
    mutationFn: (data) => {
      if (request) {
        return base44.entities.LCADataRequest.update(request.id, data);
      } else {
        return base44.entities.LCADataRequest.create({
          ...data,
          request_id: `LCA-REQ-${Date.now()}`,
          status: 'Draft'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lca-data-requests'] });
      toast.success('Draft saved');
      onClose();
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{request ? 'Edit Data Request' : 'New Data Request'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Supplier *</Label>
              <Select value={formData.supplier_id} onValueChange={(v) => setFormData({...formData, supplier_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.legal_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Process Name *</Label>
              <Input
                value={formData.process_name}
                onChange={(e) => setFormData({...formData, process_name: e.target.value})}
                placeholder="e.g., Steel Production"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Activity Type</Label>
              <Select value={formData.activity_type} onValueChange={(v) => setFormData({...formData, activity_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Material">Material</SelectItem>
                  <SelectItem value="Energy">Energy</SelectItem>
                  <SelectItem value="Transport">Transport</SelectItem>
                  <SelectItem value="Waste">Waste</SelectItem>
                  <SelectItem value="Process">Process</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({...formData, due_date: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label>Request Description</Label>
            <Textarea
              value={formData.request_description}
              onChange={(e) => setFormData({...formData, request_description: e.target.value})}
              placeholder="Describe the data you need and any specific requirements..."
              className="h-24"
            />
          </div>

          <div className="space-y-2">
            <Label>Data Fields Requested</Label>
            <div className="grid grid-cols-2 gap-2">
              {['emission_factor_climate', 'emission_factor_water', 'emission_factor_acidification', 'geographic_scope', 'temporal_scope', 'data_source_type'].map(field => (
                <label key={field} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.data_fields_requested.includes(field)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({...formData, data_fields_requested: [...formData.data_fields_requested, field]});
                      } else {
                        setFormData({...formData, data_fields_requested: formData.data_fields_requested.filter(f => f !== field)});
                      }
                    }}
                    className="rounded"
                  />
                  {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            variant="outline"
            onClick={() => saveDraftMutation.mutate(formData)}
            disabled={!formData.supplier_id || !formData.process_name || saveDraftMutation.isPending}
          >
            {saveDraftMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Draft'}
          </Button>
          <Button 
            onClick={() => sendRequestMutation.mutate(formData)}
            disabled={!formData.supplier_id || !formData.process_name || sendRequestMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {sendRequestMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}