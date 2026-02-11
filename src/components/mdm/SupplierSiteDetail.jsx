import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EvidenceSidePanel from '../supplylens/EvidenceSidePanel';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Building2, Calendar, MapIcon, History } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { format } from "date-fns";
import 'leaflet/dist/leaflet.css';

export default function SupplierSiteDetail({ site, supplier, open, onOpenChange }) {
  const { data: changeLogs = [] } = useQuery({
    queryKey: ['change-logs', 'SupplierSite', site?.id],
    queryFn: () => base44.entities.ChangeLog.filter({ 
      entity_type: 'SupplierSite', 
      entity_id: site.id 
    }),
    enabled: !!site?.id
  });

  const { data: aliases = [] } = useQuery({
    queryKey: ['supplier-site-aliases', site?.id],
    queryFn: () => base44.entities.SupplierSiteAlias.filter({ 
      supplier_site_id: site.id 
    }),
    enabled: !!site?.id
  });

  if (!site) return null;

  const hasCoordinates = site.latitude && site.longitude;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#86b027]/10">
              <MapPin className="w-5 h-5 text-[#86b027]" />
            </div>
            <div>
              <DialogTitle className="text-xl">{site.site_name}</DialogTitle>
              <p className="text-sm text-slate-500 mt-1">
                {supplier?.legal_name}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="map">Location Map</TabsTrigger>
                <TabsTrigger value="aliases">Aliases ({aliases.length})</TabsTrigger>
                <TabsTrigger value="history">History ({changeLogs.length})</TabsTrigger>
              </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Site Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500">Site Name</label>
                    <p className="font-medium text-slate-900">{site.site_name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Role</label>
                    <Badge variant="outline" className="capitalize">{site.site_role}</Badge>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500">Address</label>
                  <p className="text-sm text-slate-900">
                    {site.address_line1}
                    {site.address_line2 && <><br/>{site.address_line2}</>}
                    <br/>
                    {site.city}, {site.region} {site.postal_code}
                    <br/>
                    {site.country}
                  </p>
                </div>

                {hasCoordinates && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-500">Latitude</label>
                      <p className="text-sm text-slate-900">{site.latitude}</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Longitude</label>
                      <p className="text-sm text-slate-900">{site.longitude}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-500">Status</label>
                  <Badge className={site.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}>
                    {site.status}
                  </Badge>
                </div>

                {site.created_date && (
                  <div>
                    <label className="text-xs text-slate-500">Created</label>
                    <p className="text-sm text-slate-900 flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(site.created_date), 'MMM d, yyyy')}
                      {site.created_by && ` by ${site.created_by}`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <MapIcon className="w-4 h-4" />
                  Site Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasCoordinates ? (
                  <div className="h-[400px] rounded-lg overflow-hidden">
                    <MapContainer
                      center={[parseFloat(site.latitude), parseFloat(site.longitude)]}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[parseFloat(site.latitude), parseFloat(site.longitude)]}>
                        <Popup>
                          <strong>{site.site_name}</strong><br/>
                          {site.city}, {site.country}
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <MapIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No coordinates available for this site</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="aliases" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-700">Source System Aliases</CardTitle>
              </CardHeader>
              <CardContent>
                {aliases.length > 0 ? (
                  <div className="space-y-2">
                    {aliases.map(alias => (
                      <div key={alias.id} className="p-3 border rounded-lg">
                        <p className="font-medium text-slate-900">{alias.alias_address_text}</p>
                        {alias.source_system_id && (
                          <p className="text-xs text-slate-500 mt-1">Source: {alias.source_system_id}</p>
                        )}
                        <Badge variant="outline" className="mt-2">{alias.alias_status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-sm">No aliases found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Change History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {changeLogs.length > 0 ? (
                  <div className="space-y-3">
                    {changeLogs.map(log => (
                      <div key={log.id} className="border-l-2 border-[#86b027] pl-4 py-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <Badge variant="outline" className="mb-2">{log.action}</Badge>
                            {log.reason_text && (
                              <p className="text-sm text-slate-600">{log.reason_text}</p>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">
                            {format(new Date(log.created_date), 'MMM d, yyyy HH:mm')}
                          </span>
                        </div>
                        {log.actor_id && (
                          <p className="text-xs text-slate-500 mt-1">
                            by {log.actor_id} ({log.actor_role})
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No history available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
            </Tabs>
          </div>

          {/* Evidence Side Panel */}
          <div className="col-span-1">
            <EvidenceSidePanel 
              entityType="SupplierSite" 
              entityId={site.id}
              entityName={site.site_name}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}