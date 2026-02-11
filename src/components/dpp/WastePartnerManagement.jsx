import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Recycle, MapPin, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import WastePartnerModal from './WastePartnerModal';

export default function WastePartnerManagement() {
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: partners = [] } = useQuery({
    queryKey: ['waste-partners'],
    queryFn: () => base44.entities.WasteManagementPartner.list()
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Waste Management Partners</h2>
          <p className="text-sm text-slate-600">Manage recycling and waste collection partners</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-[#86b027] hover:bg-[#769c22]">
          <Plus className="w-4 h-4 mr-2" />
          Add Partner
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {partners.map(partner => (
          <Card key={partner.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{partner.name}</CardTitle>
                  <p className="text-sm text-slate-500">{partner.city}, {partner.country}</p>
                </div>
                {partner.active ? (
                  <Badge className="bg-emerald-500">Active</Badge>
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {partner.service_types?.map(service => (
                  <Badge key={service} variant="outline" className="capitalize">
                    {service}
                  </Badge>
                ))}
              </div>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4" />
                  <span>{partner.contact_email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4" />
                  <span>{partner.contact_phone || 'N/A'}</span>
                </div>
                {partner.collection_radius_km && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4" />
                    <span>{partner.collection_radius_km} km radius</span>
                  </div>
                )}
              </div>
              {partner.accepted_materials?.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-slate-500 mb-1">Accepts:</p>
                  <p className="text-sm">{partner.accepted_materials.join(', ')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <WastePartnerModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
}