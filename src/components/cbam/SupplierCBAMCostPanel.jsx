import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Euro, TrendingUp, AlertTriangle, Factory, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SupplierCBAMCostPanel({ supplier }) {
  const { data: entries = [] } = useQuery({
    queryKey: ['cbam-entries-supplier', supplier.id],
    queryFn: async () => {
      const all = await base44.entities.CBAMEmissionEntry.list();
      return all.filter(e => e.supplier_id === supplier.id);
    }
  });

  const { data: installations = [] } = useQuery({
    queryKey: ['cbam-installations-supplier', supplier.id],
    queryFn: async () => {
      const all = await base44.entities.CBAMInstallation.list();
      return all.filter(i => i.supplier_id === supplier.id);
    }
  });

  // CBAM Cost Calculation
  const avgCarbonPrice = 85; // Current EU ETS price estimate
  
  const totalEmissions = useMemo(() => 
    entries.reduce((sum, e) => sum + (e.total_embedded_emissions || 0), 0),
    [entries]
  );

  const chargeableEmissions = useMemo(() => 
    entries.reduce((sum, e) => {
      const total = e.total_embedded_emissions || 0;
      const free = e.free_allocation_adjustment || 0;
      return sum + Math.max(0, total - free);
    }, 0),
    [entries]
  );

  const estimatedCost = chargeableEmissions * avgCarbonPrice;
  const certificatesNeeded = Math.ceil(chargeableEmissions);

  // Cost by installation
  const costByInstallation = useMemo(() => {
    return installations.map(inst => {
      const instEntries = entries.filter(e => e.installation_id === inst.id);
      const instEmissions = instEntries.reduce((sum, e) => sum + (e.total_embedded_emissions || 0), 0);
      const instCost = instEmissions * avgCarbonPrice;
      
      return {
        name: inst.name.substring(0, 25),
        emissions: instEmissions,
        cost: instCost
      };
    }).filter(i => i.emissions > 0);
  }, [installations, entries, avgCarbonPrice]);

  if (entries.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="p-6 text-center text-slate-500">
          <Factory className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No CBAM imports recorded for this supplier</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cost Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase">Total Imports</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{entries.length}</p>
              </div>
              <Factory className="w-8 h-8 text-blue-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase">Chargeable</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{chargeableEmissions.toFixed(1)}</p>
                <p className="text-xs text-amber-600">tCO2e</p>
              </div>
              <TrendingUp className="w-8 h-8 text-amber-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-purple-600 uppercase">Est. Cost</p>
                <p className="text-2xl font-bold text-purple-700 mt-1">€{estimatedCost.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                <p className="text-xs text-purple-600">{certificatesNeeded} certs</p>
              </div>
              <Euro className="w-8 h-8 text-purple-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost by Installation Chart */}
      {costByInstallation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CBAM Cost by Installation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costByInstallation}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'cost') return [`€${value.toLocaleString()}`, 'Cost'];
                      return [`${value.toFixed(1)} tCO2e`, 'Emissions'];
                    }}
                  />
                  <Bar dataKey="cost" fill="#86b027" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Breakdown */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Total Embedded Emissions:</span>
              <span className="font-bold">{totalEmissions.toFixed(2)} tCO2e</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Free Allocation Adjustment:</span>
              <span className="font-medium text-emerald-600">-{(totalEmissions - chargeableEmissions).toFixed(2)} tCO2e</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-slate-600">Chargeable Emissions:</span>
              <span className="font-bold">{chargeableEmissions.toFixed(2)} tCO2e</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Current Carbon Price:</span>
              <span className="font-medium">€{avgCarbonPrice} / tCO2e</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-bold text-slate-900">Estimated CBAM Cost:</span>
              <span className="font-bold text-lg text-[#86b027]">€{estimatedCost.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {entries.some(e => e.validation_status === 'pending') && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 text-sm">Data Validation Required</p>
                <p className="text-xs text-amber-700 mt-1">
                  {entries.filter(e => e.validation_status === 'pending').length} import(s) pending verification. 
                  Cost estimates may change after validation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}