import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Satellite, AlertTriangle, CheckCircle2, RefreshCw, MapPin } from "lucide-react";

export default function EUDRRealTimeAlertMonitor({ plotIds = [] }) {
  const queryClient = useQueryClient();

  const { data: plots = [] } = useQuery({
    queryKey: ['eudr-plots-monitoring'],
    queryFn: () => base44.entities.EUDRPlot.list(),
    enabled: plotIds.length === 0
  });

  const monitored = plotIds.length > 0 
    ? plots.filter(p => plotIds.includes(p.id))
    : plots.filter(p => p.monitoring_enabled);

  const checkAlertsMutation = useMutation({
    mutationFn: async (plotId) => {
      const plot = plots.find(p => p.id === plotId);
      
      const { data } = await base44.functions.invoke('globalForestWatchAPI', {
        action: 'check_alerts',
        coordinates: plot.geolocation_polygon,
        plot_id: plotId,
        alert_systems: ['glad', 'radd', 'forma']
      });
      
      return data;
    },
    onSuccess: (data, plotId) => {
      queryClient.invalidateQueries({ queryKey: ['eudr-plots-monitoring'] });
      
      if (data.deforestation_detected) {
        toast.error(`Deforestation Alerts Detected`, {
          description: `${data.alerts.total_count} alerts found for plot ${plotId}`
        });
      } else {
        toast.success('No Deforestation Detected', {
          description: 'Plot monitoring clear'
        });
      }
    }
  });

  const checkAllMutation = useMutation({
    mutationFn: async () => {
      const results = [];
      for (const plot of monitored) {
        try {
          const { data } = await base44.functions.invoke('globalForestWatchAPI', {
            coordinates: plot.geolocation_polygon,
            plot_id: plot.id,
            alert_systems: ['glad', 'radd']
          });
          results.push({ plot_id: plot.id, ...data });
        } catch (e) {
          console.error(e);
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['eudr-plots-monitoring'] });
      const alertsFound = results.filter(r => r.deforestation_detected).length;
      
      if (alertsFound > 0) {
        toast.error(`Alerts on ${alertsFound} plots`, {
          description: 'Review required'
        });
      } else {
        toast.success(`All ${results.length} plots clear`);
      }
    }
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Satellite className="w-5 h-5 text-blue-600" />
            Real-Time Deforestation Monitoring
          </CardTitle>
          <Button 
            onClick={() => checkAllMutation.mutate()}
            disabled={checkAllMutation.isPending || monitored.length === 0}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${checkAllMutation.isPending ? 'animate-spin' : ''}`} />
            Check All Plots
          </Button>
        </div>
        <p className="text-sm text-slate-600">
          GLAD, RADD & FORMA alert systems • Updated every 8 days
        </p>
      </CardHeader>
      <CardContent>
        {monitored.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <MapPin className="w-12 h-12 mx-auto mb-2" />
            <p>No plots configured for monitoring</p>
          </div>
        ) : (
          <div className="space-y-3">
            {monitored.map(plot => (
              <div key={plot.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    plot.deforestation_detected ? 'bg-rose-100' :
                    plot.last_alert_check_date ? 'bg-emerald-100' : 'bg-slate-100'
                  }`}>
                    {plot.deforestation_detected ? 
                      <AlertTriangle className="w-4 h-4 text-rose-600" /> :
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    }
                  </div>
                  <div>
                    <div className="font-bold text-sm">{plot.plot_name || `Plot ${plot.id.slice(0, 8)}`}</div>
                    <div className="text-xs text-slate-500">
                      {plot.country} • {plot.area_hectares?.toFixed(2)} ha
                      {plot.last_alert_check_date && (
                        <> • Last checked: {new Date(plot.last_alert_check_date).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {plot.deforestation_alerts_count > 0 && (
                    <Badge className="bg-rose-500">{plot.deforestation_alerts_count} alerts</Badge>
                  )}
                  <Button 
                    onClick={() => checkAlertsMutation.mutate(plot.id)}
                    disabled={checkAlertsMutation.isPending}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={`w-3 h-3 ${checkAlertsMutation.isPending ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}