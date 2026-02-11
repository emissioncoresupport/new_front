import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function IncidentModal({ open, onOpenChange, incident, suppliers }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    supplier_id: '',
    incident_type: 'Other',
    severity: 'Medium',
    title: '',
    description: '',
    incident_date: new Date().toISOString().split('T')[0],
    status: 'Open'
  });

  useEffect(() => {
    if (incident) {
      setFormData({
        supplier_id: incident.supplier_id || '',
        incident_type: incident.incident_type || 'Other',
        severity: incident.severity || 'Medium',
        title: incident.title || '',
        description: incident.description || '',
        incident_date: incident.incident_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        status: incident.status || 'Open'
      });
    } else {
      setFormData({
        supplier_id: '',
        incident_type: 'Other',
        severity: 'Medium',
        title: '',
        description: '',
        incident_date: new Date().toISOString().split('T')[0],
        status: 'Open'
      });
    }
  }, [incident, open]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SupplyChainIncident.create({
      ...data,
      incident_reference: `INC-${Date.now()}`,
      reported_date: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-chain-incidents'] });
      toast.success('Incident reported');
      onOpenChange(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SupplyChainIncident.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-chain-incidents'] });
      toast.success('Incident updated');
      onOpenChange(false);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (incident) {
      updateMutation.mutate({ id: incident.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const incidentTypes = [
    'Quality Issue', 'Delivery Delay', 'Environmental Violation', 
    'Labor Rights Violation', 'Safety Incident', 'Compliance Breach',
    'Financial Distress', 'Natural Disaster', 'Geopolitical Risk',
    'Cyberattack', 'Production Disruption', 'Other'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{incident ? 'Update Incident' : 'Report New Incident'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
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

            <div>
              <Label>Incident Type *</Label>
              <Select value={formData.incident_type} onValueChange={(v) => setFormData({...formData, incident_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {incidentTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Severity *</Label>
              <Select value={formData.severity} onValueChange={(v) => setFormData({...formData, severity: v})}>
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

            <div>
              <Label>Incident Date *</Label>
              <Input 
                type="date"
                value={formData.incident_date}
                onChange={(e) => setFormData({...formData, incident_date: e.target.value})}
              />
            </div>
          </div>

          {incident && (
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Under Investigation">Under Investigation</SelectItem>
                  <SelectItem value="Mitigating">Mitigating</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Title *</Label>
            <Input 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Brief incident title"
              required
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Detailed incident description"
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-[#86b027] hover:bg-[#769c22]"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {incident ? 'Update' : 'Report'} Incident
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}