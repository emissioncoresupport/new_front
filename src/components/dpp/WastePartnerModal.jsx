import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function WastePartnerModal({ open, onOpenChange }) {
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    city: '',
    contact_email: '',
    contact_phone: '',
    service_types: [],
    accepted_materials: '',
    collection_radius_km: 0,
    active: true
  });

  const queryClient = useQueryClient();

  const serviceOptions = ['collection', 'sorting', 'recycling', 'refurbishment', 'disposal'];

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.WasteManagementPartner.create({
      ...data,
      accepted_materials: data.accepted_materials.split(',').map(m => m.trim()).filter(Boolean)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste-partners'] });
      toast.success('Partner added');
      onOpenChange(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Waste Management Partner</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Partner Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.contact_email} onChange={(e) => setFormData({...formData, contact_email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={formData.contact_phone} onChange={(e) => setFormData({...formData, contact_phone: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Services Provided</Label>
            <div className="flex flex-wrap gap-3">
              {serviceOptions.map(service => (
                <div key={service} className="flex items-center gap-2">
                  <Checkbox 
                    checked={formData.service_types.includes(service)}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        service_types: checked 
                          ? [...formData.service_types, service]
                          : formData.service_types.filter(s => s !== service)
                      });
                    }}
                  />
                  <Label className="capitalize">{service}</Label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Accepted Materials (comma-separated)</Label>
            <Input 
              placeholder="e.g., Aluminum, Steel, Plastic PET"
              value={formData.accepted_materials} 
              onChange={(e) => setFormData({...formData, accepted_materials: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label>Collection Radius (km)</Label>
            <Input type="number" value={formData.collection_radius_km} 
              onChange={(e) => setFormData({...formData, collection_radius_km: parseFloat(e.target.value)})} />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate(formData)} className="bg-[#86b027] hover:bg-[#769c22]">
            Add Partner
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}