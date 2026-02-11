import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Real-time monitor showing orchestration events across the app
 */
export default function OrchestrationMonitor() {
  const [events, setEvents] = useState([]);
  const maxEvents = 10;

  useEffect(() => {
    const eventTypes = [
      'materialOrchestrated',
      'supplierOrchestrated',
      'supplierReSynced',
      'cbamMaterialLinked',
      'pfasSupplierLinked',
      'eudrMaterialsLinked'
    ];

    const handlers = eventTypes.map(eventType => {
      const handler = (e) => {
        const newEvent = {
          id: Date.now(),
          type: eventType,
          data: e.detail,
          timestamp: new Date()
        };

        setEvents(prev => [newEvent, ...prev].slice(0, maxEvents));
      };
      
      window.addEventListener(eventType, handler);
      return { eventType, handler };
    });

    return () => {
      handlers.forEach(({ eventType, handler }) => {
        window.removeEventListener(eventType, handler);
      });
    };
  }, []);

  if (events.length === 0) return null;

  return (
    <Card className="bg-gradient-to-br from-[#86b027]/5 to-transparent border-[#86b027]/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-[#86b027]" />
          <span className="text-sm font-light text-slate-900">Live Orchestration</span>
          <Badge variant="outline" className="ml-auto">
            {events.length} recent
          </Badge>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {events.map(event => (
            <OrchestrationEvent key={event.id} event={event} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OrchestrationEvent({ event }) {
  const config = {
    materialOrchestrated: {
      icon: CheckCircle2,
      color: 'text-green-600',
      label: 'Material Linked',
      bg: 'bg-green-50'
    },
    supplierOrchestrated: {
      icon: CheckCircle2,
      color: 'text-blue-600',
      label: 'Supplier Linked',
      bg: 'bg-blue-50'
    },
    supplierReSynced: {
      icon: Clock,
      color: 'text-amber-600',
      label: 'Supplier Re-synced',
      bg: 'bg-amber-50'
    },
    cbamMaterialLinked: {
      icon: CheckCircle2,
      color: 'text-[#86b027]',
      label: 'CBAM → Material',
      bg: 'bg-[#86b027]/10'
    },
    pfasSupplierLinked: {
      icon: AlertCircle,
      color: 'text-purple-600',
      label: 'PFAS → Supplier',
      bg: 'bg-purple-50'
    },
    eudrMaterialsLinked: {
      icon: CheckCircle2,
      color: 'text-emerald-600',
      label: 'EUDR → Materials',
      bg: 'bg-emerald-50'
    }
  };

  const eventConfig = config[event.type] || config.materialOrchestrated;
  const Icon = eventConfig.icon;

  return (
    <div className={cn("flex items-center gap-3 p-2 rounded-lg", eventConfig.bg)}>
      <Icon className={cn("w-4 h-4", eventConfig.color)} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-light text-slate-900">{eventConfig.label}</p>
        <p className="text-xs text-slate-500 truncate">
          {event.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}