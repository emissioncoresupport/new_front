import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { logClinicalStudyRegistration } from './EUDAMEDAuditService';

export default function EUDAMEDClinicalModal({ open, onOpenChange }) {
  const [formData, setFormData] = useState({
    device_id: '',
    investigation_title: '',
    protocol_number: '',
    investigation_type: 'Clinical Investigation',
    estimated_enrollment: 0,
    status: 'planned'
  });

  const { data: devices = [] } = useQuery({
    queryKey: ['eudamed-devices'],
    queryFn: () => base44.entities.EUDAMEDDevice.list()
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.EUDAMEDClinicalInvestigation.create(data),
    onSuccess: (study) => {
      logClinicalStudyRegistration(study, 'success');
      queryClient.invalidateQueries({ queryKey: ['eudamed-clinical'] });
      toast.success('Study registered');
      onOpenChange(false);
    },
    onError: (error) => {
      logClinicalStudyRegistration(formData, 'failure', error.message);
      toast.error('Study registration failed');
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register Clinical Study</DialogTitle>
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
          <div className="space-y-2">
            <Label>Investigation Title</Label>
            <Input value={formData.investigation_title} onChange={(e) => setFormData({...formData, investigation_title: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Protocol Number</Label>
              <Input value={formData.protocol_number} onChange={(e) => setFormData({...formData, protocol_number: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Investigation Type</Label>
              <Select value={formData.investigation_type} onValueChange={(v) => setFormData({...formData, investigation_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Clinical Investigation">Clinical Investigation</SelectItem>
                  <SelectItem value="Performance Study">Performance Study</SelectItem>
                  <SelectItem value="PMCF Study">PMCF Study</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estimated Enrollment</Label>
            <Input type="number" value={formData.estimated_enrollment} onChange={(e) => setFormData({...formData, estimated_enrollment: parseInt(e.target.value)})} />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate(formData)} className="bg-purple-600 hover:bg-purple-700">
            Register Study
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}