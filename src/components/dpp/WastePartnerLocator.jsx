import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, ExternalLink, Navigation } from "lucide-react";

export default function WastePartnerLocator({ wastePartners, productMaterials }) {
  const [location, setLocation] = useState('');

  // Filter partners that accept materials from this product
  const relevantPartners = wastePartners.filter(partner => {
    if (!partner.accepted_materials || !productMaterials) return true;
    
    return productMaterials.some(mat => 
      partner.accepted_materials.some(accepted => 
        accepted.toLowerCase().includes(mat.material?.split(' ')[0]?.toLowerCase())
      )
    );
  });

  const getDirections = (partner) => {
    const destination = encodeURIComponent(`${partner.address}, ${partner.city}, ${partner.country}`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank');
  };

  return (
    <div className="space-y-4">
      <CardTitle className="text-xl">Find Recycling & Waste Partners</CardTitle>
      
      <div className="flex gap-2">
        <Input
          placeholder="Enter your location (city, postal code)..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="flex-1"
        />
      </div>

      <div className="space-y-3">
        {relevantPartners.length > 0 ? (
          relevantPartners.map(partner => (
            <Card key={partner.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 mb-2">{partner.name}</h4>
                    
                    <div className="space-y-1 text-sm text-slate-600 mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span>{partner.city}, {partner.country}</span>
                      </div>
                      {partner.contact_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 shrink-0" />
                          <a href={`mailto:${partner.contact_email}`} className="text-blue-600 hover:underline">
                            {partner.contact_email}
                          </a>
                        </div>
                      )}
                      {partner.contact_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 shrink-0" />
                          <a href={`tel:${partner.contact_phone}`} className="text-blue-600 hover:underline">
                            {partner.contact_phone}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {partner.service_types?.map(service => (
                        <Badge key={service} variant="outline" className="capitalize text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>

                    {partner.collection_radius_km && (
                      <p className="text-xs text-slate-500 mt-2">
                        Service area: {partner.collection_radius_km} km radius
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col gap-2">
                    <button
                      onClick={() => getDirections(partner)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
                    >
                      <Navigation className="w-4 h-4" />
                      <span className="hidden sm:inline">Get Directions</span>
                    </button>
                  </div>
                </div>

                {partner.accepted_materials && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-slate-500 mb-1">Accepts:</p>
                    <p className="text-xs text-slate-700">{partner.accepted_materials.join(', ')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No waste partners available in your area yet.</p>
              <p className="text-sm mt-2">Check local recycling facilities or contact the manufacturer.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {productMaterials && productMaterials.length > 0 && (
        <div className="bg-slate-50 p-4 rounded-lg border">
          <p className="text-sm font-medium text-slate-700 mb-2">Materials to recycle:</p>
          <div className="flex flex-wrap gap-2">
            {productMaterials.filter(m => m.recyclable).map((mat, idx) => (
              <Badge key={idx} className="bg-emerald-500">
                {mat.material} ({mat.percentage}%)
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}