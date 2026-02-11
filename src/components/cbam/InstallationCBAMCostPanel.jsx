import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Euro, Leaf, TrendingUp, AlertCircle, Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function InstallationCBAMCostPanel({ installation }) {
  const { data: entries = [] } = useQuery({
    queryKey: ['cbam-entries-installation', installation.id],
    queryFn: async () => {
      const all = await base44.entities.CBAMEmissionEntry.list();
      return all.filter(e => e.installation_id === installation.id);
    }
  });

  const avgCarbonPrice = 85;
  
  const stats = useMemo(() => {
    const totalEmissions = entries.reduce((sum, e) => sum + (e.total_embedded_emissions || 0), 0);
    const chargeableEmissions = entries.reduce((sum, e) => {
      const total = e.total_embedded_emissions || 0;
      const free = e.free_allocation_adjustment || 0;
      return sum + Math.max(0, total - free);
    }, 0);
    
    const cost = chargeableEmissions * avgCarbonPrice;
    const certificates = Math.ceil(chargeableEmissions);
    
    return {
      totalImports: entries.length,
      totalEmissions,
      chargeableEmissions,
      cost,
      certificates,
      avgEmissionIntensity: totalEmissions / (entries.reduce((sum, e) => sum + (e.net_mass_tonnes || 0), 0) || 1)
    };
  }, [entries]);

  const emissionIntensity = installation.emission_factors?.direct + installation.emission_factors?.indirect || 0;
  const benchmark = 2.0; // Example benchmark for steel
  const benchmarkComparison = ((emissionIntensity / benchmark) * 100) - 100;

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Euro className="w-4 h-4 text-[#86b027]" />
          CBAM Cost Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs font-semibold text-blue-600 uppercase">Imports</p>
            <p className="text-2xl font-bold text-blue-700">{stats.totalImports}</p>
          </div>
          <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
            <p className="text-xs font-semibold text-purple-600 uppercase">Est. Cost</p>
            <p className="text-2xl font-bold text-purple-700">€{stats.cost.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
        </div>

        {/* Emission Intensity vs Benchmark */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">Emission Intensity</span>
            <span className="font-bold">{emissionIntensity.toFixed(3)} tCO2e/t</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">EU Benchmark</span>
            <span className="font-medium">{benchmark.toFixed(3)} tCO2e/t</span>
          </div>
          <Progress 
            value={Math.min(100, (emissionIntensity / benchmark) * 100)} 
            className="h-2"
            indicatorClassName={benchmarkComparison > 0 ? "bg-rose-500" : "bg-emerald-500"}
          />
          <div className="flex items-center gap-2 text-xs">
            {benchmarkComparison > 0 ? (
              <>
                <TrendingUp className="w-3 h-3 text-rose-600" />
                <span className="text-rose-600 font-medium">
                  {benchmarkComparison.toFixed(1)}% above benchmark
                </span>
              </>
            ) : (
              <>
                <TrendingUp className="w-3 h-3 text-emerald-600 rotate-180" />
                <span className="text-emerald-600 font-medium">
                  {Math.abs(benchmarkComparison).toFixed(1)}% below benchmark
                </span>
              </>
            )}
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="pt-3 border-t space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Total Emissions:</span>
            <span className="font-medium">{stats.totalEmissions.toFixed(2)} tCO2e</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">After Free Allocation:</span>
            <span className="font-medium">{stats.chargeableEmissions.toFixed(2)} tCO2e</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Certificates Required:</span>
            <span className="font-medium">{stats.certificates}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-bold text-slate-900">CBAM Liability:</span>
            <span className="font-bold text-lg text-[#86b027]">€{stats.cost.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
          </div>
        </div>

        {/* Verification Status */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">Installation Verification:</span>
            {installation.verification_status === 'verified' ? (
              <Badge className="bg-emerald-100 text-emerald-700">Verified</Badge>
            ) : installation.verification_status === 'flagged' ? (
              <Badge className="bg-rose-100 text-rose-700">Flagged</Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}