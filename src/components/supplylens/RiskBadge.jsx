import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, AlertCircle, XCircle } from "lucide-react";

const riskConfig = {
  low: {
    color: "bg-slate-100 text-slate-700 border-slate-200",
    icon: CheckCircle
  },
  medium: {
    color: "bg-slate-100 text-slate-700 border-slate-200",
    icon: AlertCircle
  },
  high: {
    color: "bg-slate-100 text-slate-700 border-slate-200",
    icon: AlertTriangle
  },
  critical: {
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: XCircle
  }
};

export default function RiskBadge({ level, showIcon = true, size = "default" }) {
  const safeLevel = level || 'medium';
  const config = riskConfig[safeLevel] || riskConfig.medium;
  const Icon = config.icon;

  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "border font-medium gap-1",
        config.color,
        size === "sm" && "text-xs px-1.5 py-0.5"
      )}
    >
      {showIcon && <Icon className={cn("w-3 h-3", size === "sm" && "w-2.5 h-2.5")} />}
      {safeLevel.charAt(0).toUpperCase() + safeLevel.slice(1)}
    </Badge>
  );
}