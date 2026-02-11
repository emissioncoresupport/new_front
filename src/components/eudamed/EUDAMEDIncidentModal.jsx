import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { logIncidentReport } from './EUDAMEDAuditService';

export default function EUDAMEDIncidentModal({ open, onOpenChange }) {
  const [formData, setFormData] = useState({
    device_id: '',
    incident_type: 'Serious Incident',
    incident_date: new Date().toISOString().split('T')[0],
    country_of_incident: '',
    description: '',
    patient_outcome: 'Unknown',
    status: 'open'
  });

  const { data: devices = [] } = useQuery({
    queryKey: ['eudamed-devices'],
    queryFn: () => base44.entities.EUDAMEDDevice.list()
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.EUDAMEDIncident.create(data),
    onSuccess: (incident) => {
      logIncidentReport(incident, 'success');
      queryClient.invalidateQueries({ queryKey: ['eudamed-incidents'] });
      toast.success('Incident reported');
      onOpenChange(false);
    },
    onError: (error) => {
      logIncidentReport(formData, 'failure', error.message);
      toast.error('Incident reporting failed');
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Safety Incident</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Device</Label>
            <Select value={formData.device_id} onValueChange={(v) => setFormData({...formData, device_id: v})}>
              <SelectTrigger><SelectValue placeholder="Select device" /></SelectTrigger>
              <SelectContent>
                {devices.map(d => <SelectItem key={d.id} value={d.id}>{d.device_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Incident Type</Label>
              <Select value={formData.incident_type} onValueChange={(v) => setFormData({...formData, incident_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Serious Incident">Serious Incident</SelectItem>
                  <SelectItem value="Field Safety Corrective Action">FSCA</SelectItem>
                  <SelectItem value="Trend Report">Trend Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Incident Date</Label>
              <Input type="date" value={formData.incident_date} onChange={(e) => setFormData({...formData, incident_date: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea 
              className="w-full p-2 border rounded-lg text-sm"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>Patient Outcome</Label>
            <Select value={formData.patient_outcome} onValueChange={(v) => setFormData({...formData, patient_outcome: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="No Harm">No Harm</SelectItem>
                <SelectItem value="Minor Injury">Minor Injury</SelectItem>
                <SelectItem value="Serious Injury">Serious Injury</SelectItem>
                <SelectItem value="Death">Death</SelectItem>
                <SelectItem value="Unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate(formData)} className="bg-rose-600 hover:bg-rose-700">
            Report Incident
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}