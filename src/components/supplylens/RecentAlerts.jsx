import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, Info, XCircle, ChevronRight, Bell } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const severityConfig = {
  info: { icon: Info, color: "text-blue-600 bg-blue-50", badge: "bg-blue-100 text-blue-700" },
  warning: { icon: AlertCircle, color: "text-amber-600 bg-amber-50", badge: "bg-amber-100 text-amber-700" },
  critical: { icon: XCircle, color: "text-rose-600 bg-rose-50", badge: "bg-rose-100 text-rose-700" }
};

const alertTypeLabels = {
  location: "Location Risk",
  sector: "Sector Risk",
  human_rights: "Human Rights",
  environmental: "Environmental",
  chemical: "Chemical/PFAS",
  mineral: "Minerals",
  performance: "Performance",
  sanctions: "Sanctions",
  compliance: "Compliance"
};

export default function RecentAlerts({ alerts, suppliers, onViewAll }) {
  const displayAlerts = alerts.slice(0, 5);
  
  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.legal_name || 'Unknown Supplier';
  };

  return (
    <Card className="bg-white/80 backdrop-blur-md border-slate-200 shadow-xl">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-400" />
          Recent Alerts
        </CardTitle>
        {alerts.length > 5 && (
          <Button variant="ghost" size="sm" onClick={onViewAll} className="text-blue-600">
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {displayAlerts.length > 0 ? (
          <div className="space-y-3">
            {displayAlerts.map((alert) => {
              const config = severityConfig[alert.severity] || severityConfig.warning;
              const Icon = config.icon;
              return (
                <div 
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/50 hover:bg-slate-100/50 transition-colors cursor-pointer"
                >
                  <div className={cn("p-2 rounded-lg", config.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {alert.title}
                      </p>
                      <Badge variant="secondary" className={cn("text-xs", config.badge)}>
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {getSupplierName(alert.supplier_id)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {alertTypeLabels[alert.alert_type] || alert.alert_type}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {alert.created_date && format(new Date(alert.created_date), 'MMM d')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center">
            <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No alerts</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}