import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const tierConfig = {
  tier_1: { color: "bg-slate-100 text-slate-700 border-slate-200", label: "Tier 1" },
  tier_2: { color: "bg-slate-100 text-slate-700 border-slate-200", label: "Tier 2" },
  tier_3: { color: "bg-slate-100 text-slate-700 border-slate-200", label: "Tier 3" },
  unknown: { color: "bg-slate-100 text-slate-600 border-slate-200", label: "Unknown" }
};

export default function TierBadge({ tier }) {
  const config = tierConfig[tier] || tierConfig.unknown;

  return (
    <Badge variant="secondary" className={cn("border font-medium", config.color)}>
      {config.label}
    </Badge>
  );
}