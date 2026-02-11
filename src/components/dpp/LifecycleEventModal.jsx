import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function LifecycleEventModal({ open, onOpenChange }) {
  const [formData, setFormData] = useState({
    dpp_id: '',
    event_type: 'returned',
    event_date: new Date().toISOString().split('T')[0],
    location: '',
    waste_partner_id: '',
    recycling_efficiency_percentage: 0
  });

  const queryClient = useQueryClient();

  const { data: dppRecords = [] } = useQuery({
    queryKey: ['dpp-records'],
    queryFn: () => base44.entities.DPPRecord.list()
  });

  const { data: wastePartners = [] } = useQuery({
    queryKey: ['waste-partners'],
    queryFn: () => base44.entities.WasteManagementPartner.list()
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductLifecycleEvent.create({
      ...data,
      event_date: new Date(data.event_date).toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-events'] });
      toast.success('Lifecycle event logged');
      onOpenChange(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Lifecycle Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Product DPP</Label>
            <Select value={formData.dpp_id} onValueChange={(v) => setFormData({...formData, dpp_id: v})}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {dppRecords.map(dpp => (
                  <SelectItem key={dpp.id} value={dpp.id}>
                    {dpp.general_info?.product_name || dpp.dpp_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select value={formData.event_type} onValueChange={(v) => setFormData({...formData, event_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="repair_requested">Repair Requested</SelectItem>
                  <SelectItem value="recycling_initiated">Recycling Initiated</SelectItem>
                  <SelectItem value="recycling_completed">Recycling Completed</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Event Date</Label>
              <Input type="date" value={formData.event_date} onChange={(e) => setFormData({...formData, event_date: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Waste Management Partner</Label>
            <Select value={formData.waste_partner_id} onValueChange={(v) => setFormData({...formData, waste_partner_id: v})}>
              <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
              <SelectContent>
                {wastePartners.map(partner => (
                  <SelectItem key={partner.id} value={partner.id}>{partner.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {formData.event_type === 'recycling_completed' && (
            <div className="space-y-2">
              <Label>Recycling Efficiency (%)</Label>
              <Input type="number" min="0" max="100" value={formData.recycling_efficiency_percentage} 
                onChange={(e) => setFormData({...formData, recycling_efficiency_percentage: parseFloat(e.target.value)})} />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate(formData)} className="bg-[#86b027] hover:bg-[#769c22]">
            Log Event
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}