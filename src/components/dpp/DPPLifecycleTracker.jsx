import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Package, RefreshCcw, Trash2, CheckCircle, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import LifecycleEventModal from './LifecycleEventModal';

export default function DPPLifecycleTracker() {
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['lifecycle-events'],
    queryFn: () => base44.entities.ProductLifecycleEvent.list('-event_date')
  });

  const { data: dppRecords = [] } = useQuery({
    queryKey: ['dpp-records'],
    queryFn: () => base44.entities.DPPRecord.list()
  });

  const { data: wastePartners = [] } = useQuery({
    queryKey: ['waste-partners'],
    queryFn: () => base44.entities.WasteManagementPartner.list()
  });

  const getEventIcon = (type) => {
    switch(type) {
      case 'manufactured': return <Package className="w-4 h-4 text-blue-500" />;
      case 'sold': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'returned': return <RefreshCcw className="w-4 h-4 text-amber-500" />;
      case 'recycling_completed': return <RefreshCcw className="w-4 h-4 text-emerald-500" />;
      case 'disposed': return <Trash2 className="w-4 h-4 text-red-500" />;
      default: return <MapPin className="w-4 h-4 text-slate-500" />;
    }
  };

  const stats = {
    totalReturns: events.filter(e => e.event_type === 'returned').length,
    totalRecycled: events.filter(e => e.event_type === 'recycling_completed').length,
    avgRecyclingRate: events.filter(e => e.recycling_efficiency_percentage > 0)
      .reduce((sum, e) => sum + e.recycling_efficiency_percentage, 0) / 
      (events.filter(e => e.recycling_efficiency_percentage > 0).length || 1)
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Product Lifecycle Tracking</h2>
          <p className="text-sm text-slate-600">Monitor product returns, recycling, and end-of-life</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-[#86b027] hover:bg-[#769c22]">
          <Plus className="w-4 h-4 mr-2" />
          Log Event
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-amber-600 uppercase font-bold">Total Returns</p>
            <h3 className="text-2xl font-bold text-amber-600">{stats.totalReturns}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-emerald-600 uppercase font-bold">Products Recycled</p>
            <h3 className="text-2xl font-bold text-emerald-600">{stats.totalRecycled}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 uppercase font-bold">Avg Recycling Rate</p>
            <h3 className="text-2xl font-bold text-blue-600">{Math.round(stats.avgRecyclingRate)}%</h3>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Lifecycle Events Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.map(event => {
              const dpp = dppRecords.find(d => d.id === event.dpp_id);
              const partner = wastePartners.find(p => p.id === event.waste_partner_id);
              
              return (
                <div key={event.id} className="flex gap-4 items-start p-4 border rounded-lg hover:bg-slate-50">
                  <div className="p-2 rounded-lg bg-slate-100">
                    {getEventIcon(event.event_type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold capitalize">{event.event_type.replace('_', ' ')}</h4>
                      {event.recycling_efficiency_percentage > 0 && (
                        <Badge className="bg-emerald-500">{event.recycling_efficiency_percentage}% recycled</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      {dpp?.general_info?.product_name || 'Unknown Product'}
                      {partner && ` • ${partner.name}`}
                    </p>
                    <div className="flex gap-4 text-xs text-slate-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(event.event_date), 'MMM d, yyyy')}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <LifecycleEventModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
}