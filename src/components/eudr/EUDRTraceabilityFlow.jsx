import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowDown, 
  MapPin, 
  Factory, 
  Package,
  CheckCircle2,
  AlertTriangle,
  Satellite
} from "lucide-react";

export default function EUDRTraceabilityFlow({ batch, links, suppliers, plots, satelliteAnalyses }) {
  const tier1Links = links.filter(l => l.tier_level === 1);
  const tier2Links = links.filter(l => l.tier_level === 2);
  const tier3Links = links.filter(l => l.tier_level === 3);

  const TierCard = ({ tierLevel, tierLinks, title }) => {
    if (tierLinks.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold text-slate-700">{title}</div>
          <Badge variant="outline" className="text-xs">{tierLinks.length} Entities</Badge>
        </div>
        
        <div className="grid gap-3">
          {tierLinks.map(link => {
            const supplier = suppliers.find(s => s.id === link.supplier_id);
            const linkPlots = plots.filter(p => link.plot_ids?.includes(p.plot_id));
            const verifiedPlots = linkPlots.filter(p => p.satellite_verification_status === "Pass");

            return (
              <Card key={link.id} className="p-4 border-l-4" style={{
                borderLeftColor: link.deforestation_risk === "High" ? "#ef4444" :
                                 link.deforestation_risk === "Medium" ? "#f59e0b" :
                                 "#10b981"
              }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Factory className="w-5 h-5 text-slate-600" />
                    <div>
                      <div className="font-bold text-slate-900">{supplier?.legal_name || 'Unknown'}</div>
                      <div className="text-xs text-slate-500">📍 {supplier?.country}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{link.quantity_sourced} {batch.unit}</div>
                    <div className="text-xs text-slate-500">{link.percentage_of_batch}% of batch</div>
                  </div>
                </div>

                {/* Verification Status */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {link.documentation_complete && (
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Docs
                    </Badge>
                  )}
                  {link.geolocation_verified && (
                    <Badge className="bg-blue-100 text-blue-700 text-xs gap-1">
                      <MapPin className="w-3 h-3" /> GPS
                    </Badge>
                  )}
                  {link.satellite_verified && (
                    <Badge className="bg-purple-100 text-purple-700 text-xs gap-1">
                      <Satellite className="w-3 h-3" /> Satellite
                    </Badge>
                  )}
                  {link.tier_risk_score !== undefined && (
                    <Badge variant="outline" className={`text-xs ${
                      link.tier_risk_score < 30 ? 'bg-emerald-50 text-emerald-700' :
                      link.tier_risk_score < 60 ? 'bg-amber-50 text-amber-700' :
                      'bg-rose-50 text-rose-700'
                    }`}>
                      Risk: {link.tier_risk_score}/100
                    </Badge>
                  )}
                </div>

                {/* Plots */}
                {linkPlots.length > 0 && (
                  <div className="mt-3 pt-3 border-t text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Plots: {linkPlots.length} total</span>
                      <span className="text-emerald-600 font-medium">{verifiedPlots.length} verified</span>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
        <Package className="w-5 h-5 text-[#86b027]" />
        Supply Chain Traceability Flow
      </h4>

      {/* Final Product */}
      <div className="flex justify-center">
        <Card className="p-4 bg-gradient-to-br from-[#86b027]/10 to-emerald-50 border-2 border-[#86b027] max-w-md">
          <div className="text-center">
            <Package className="w-8 h-8 text-[#86b027] mx-auto mb-2" />
            <div className="font-bold text-lg">{batch.batch_id}</div>
            <div className="text-sm text-slate-600">{batch.commodity_type} • {batch.quantity} {batch.unit}</div>
            {batch.traceability_score !== undefined && (
              <div className="mt-2">
                <Badge className={
                  batch.traceability_score >= 90 ? "bg-emerald-100 text-emerald-700" :
                  batch.traceability_score >= 75 ? "bg-green-100 text-green-700" :
                  batch.traceability_score >= 60 ? "bg-amber-100 text-amber-700" :
                  "bg-rose-100 text-rose-700"
                }>
                  {batch.traceability_score}% Traceability
                </Badge>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="flex justify-center">
        <ArrowDown className="w-6 h-6 text-slate-400" />
      </div>

      {/* Tier 1 - Direct Suppliers */}
      <TierCard 
        tierLevel={1} 
        tierLinks={tier1Links} 
        title="TIER 1: Direct Suppliers (Importers/Traders)"
      />

      {tier1Links.length > 0 && tier2Links.length > 0 && (
        <div className="flex justify-center">
          <ArrowDown className="w-6 h-6 text-slate-400" />
        </div>
      )}

      {/* Tier 2 - Processors */}
      <TierCard 
        tierLevel={2} 
        tierLinks={tier2Links} 
        title="TIER 2: Processors/Aggregators"
      />

      {tier2Links.length > 0 && tier3Links.length > 0 && (
        <div className="flex justify-center">
          <ArrowDown className="w-6 h-6 text-slate-400" />
        </div>
      )}

      {/* Tier 3 - Origin */}
      <TierCard 
        tierLevel={3} 
        tierLinks={tier3Links} 
        title="TIER 3: Origin (Farmers/Plantations)"
      />

      {/* Summary */}
      <Card className="p-4 bg-slate-50">
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="text-slate-500">Total Suppliers</div>
            <div className="text-xl font-bold text-slate-900">{links.length}</div>
          </div>
          <div>
            <div className="text-slate-500">Verified Links</div>
            <div className="text-xl font-bold text-emerald-600">
              {links.filter(l => l.satellite_verified).length}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Satellite Coverage</div>
            <div className="text-xl font-bold text-blue-600">
              {batch.satellite_coverage_percent || 0}%
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}