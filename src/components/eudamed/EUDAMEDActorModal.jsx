import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { logActorRegistration } from './EUDAMEDAuditService';

export default function EUDAMEDActorModal({ open, onOpenChange }) {
  const [formData, setFormData] = useState({
    actor_type: 'Manufacturer',
    legal_name: '',
    country: '',
    city: '',
    contact_email: '',
    registration_status: 'draft'
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.EUDAMEDActor.create(data),
    onSuccess: (actor) => {
      logActorRegistration(actor, 'success');
      queryClient.invalidateQueries({ queryKey: ['eudamed-actors'] });
      toast.success('Actor registered');
      onOpenChange(false);
    },
    onError: (error) => {
      logActorRegistration(formData, 'failure', error.message);
      toast.error('Actor registration failed');
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register Economic Operator</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Actor Type</Label>
            <Select value={formData.actor_type} onValueChange={(v) => setFormData({...formData, actor_type: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Manufacturer">Manufacturer</SelectItem>
                <SelectItem value="Authorized Representative">Authorized Representative</SelectItem>
                <SelectItem value="Importer">Importer</SelectItem>
                <SelectItem value="Distributor">Distributor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Legal Name</Label>
            <Input value={formData.legal_name} onChange={(e) => setFormData({...formData, legal_name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Contact Email</Label>
            <Input type="email" value={formData.contact_email} onChange={(e) => setFormData({...formData, contact_email: e.target.value})} />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate(formData)} className="bg-[#86b027] hover:bg-[#769c22]">
            Register Actor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}