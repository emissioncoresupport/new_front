import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SupplierProfile({ supplier }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    company_name: supplier?.company_name || '',
    email: supplier?.email || '',
    country: supplier?.country || '',
    address: supplier?.address || '',
    contact_person: supplier?.contact_person || '',
    phone: supplier?.phone || '',
    website: supplier?.website || '',
    certifications: supplier?.certifications || ''
  });

  const queryClient = useQueryClient();

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.update(supplier.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['current-supplier'] });
      toast.success('✅ Profile updated successfully');
      setIsEditing(false);
    }
  });

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Company Profile
          </span>
          {!isEditing ? (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
                className="bg-[#86b027] hover:bg-[#769c22]"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Company Name</Label>
            <Input
              value={formData.company_name}
              onChange={(e) => setFormData({...formData, company_name: e.target.value})}
              disabled={!isEditing}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              disabled={!isEditing}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Country</Label>
            <Input
              value={formData.country}
              onChange={(e) => setFormData({...formData, country: e.target.value})}
              disabled={!isEditing}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Contact Person</Label>
            <Input
              value={formData.contact_person}
              onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
              disabled={!isEditing}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              disabled={!isEditing}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Website</Label>
            <Input
              value={formData.website}
              onChange={(e) => setFormData({...formData, website: e.target.value})}
              disabled={!isEditing}
              className="mt-1.5"
            />
          </div>
          <div className="col-span-2">
            <Label>Address</Label>
            <Textarea
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              disabled={!isEditing}
              className="mt-1.5"
            />
          </div>
          <div className="col-span-2">
            <Label>Certifications</Label>
            <Textarea
              value={formData.certifications}
              onChange={(e) => setFormData({...formData, certifications: e.target.value})}
              disabled={!isEditing}
              className="mt-1.5"
              placeholder="ISO 14001, ISO 9001, etc."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}