import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingDown, TrendingUp, Target, Zap, Lightbulb } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function WhatIfScenarioPlanner() {
  const currentYear = new Date().getFullYear();
  
  const [scenarios, setScenarios] = useState({
    baselineReduction: 0,
    renewableEnergy: 0,
    supplierEngagement: 0,
    efficiencyImprovements: 0
  });

  const { data: ccfEntries = [] } = useQuery({
    queryKey: ['ccf-entries'],
    queryFn: () => base44.entities.CCFEntry.list()
  });

  const { data: scope3Entries = [] } = useQuery({
    queryKey: ['scope3-entries'],
    queryFn: () => base44.entities.Scope3Entry.list()
  });

  // Calculate current emissions
  const currentScope1 = ccfEntries
    .filter(e => e.scope === 'scope_1')
    .reduce((sum, e) => sum + (e.co2e_tonnes || 0), 0);
  
  const currentScope2 = ccfEntries
    .filter(e => e.scope === 'scope_2')
    .reduce((sum, e) => sum + (e.co2e_tonnes || 0), 0);
  
  const currentScope3 = scope3Entries
    .reduce((sum, e) => sum + (e.emissions_tco2e || 0), 0);

  const totalCurrentEmissions = currentScope1 + currentScope2 + currentScope3;

  // Calculate scenario impacts
  const calculateScenarioImpact = () => {
    const baselineReductionImpact = (scenarios.baselineReduction / 100) * totalCurrentEmissions;
    const renewableImpact = (scenarios.renewableEnergy / 100) * currentScope2;
    const supplierImpact = (scenarios.supplierEngagement / 100) * currentScope3;
    const efficiencyImpact = (scenarios.efficiencyImprovements / 100) * currentScope1;

    const totalReduction = baselineReductionImpact + renewableImpact + supplierImpact + efficiencyImpact;
    const projectedEmissions = totalCurrentEmissions - totalReduction;

    return {
      totalReduction,
      projectedEmissions,
      reductionPercentage: (totalReduction / totalCurrentEmissions) * 100,
      breakdown: {
        baseline: baselineReductionImpact,
        renewable: renewableImpact,
        supplier: supplierImpact,
        efficiency: efficiencyImpact
      }
    };
  };

  const impact = calculateScenarioImpact();

  // Generate forecast data for next 5 years
  const forecastData = Array.from({ length: 6 }, (_, i) => {
    const year = currentYear + i;
    const yearReduction = impact.totalReduction * (i / 5);
    return {
      year,
      baseline: totalCurrentEmissions,
      projected: Math.max(totalCurrentEmissions - yearReduction, 0),
      target: totalCurrentEmissions * (1 - 0.1 * i) // 10% reduction per year target
    };
  });

  // Reduction breakdown
  const reductionBreakdown = [
    { lever: 'Renewable Energy', reduction: impact.breakdown.renewable, percentage: scenarios.renewableEnergy },
    { lever: 'Supplier Engagement', reduction: impact.breakdown.supplier, percentage: scenarios.supplierEngagement },
    { lever: 'Operational Efficiency', reduction: impact.breakdown.efficiency, percentage: scenarios.efficiencyImprovements }
  ].filter(item => item.reduction > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#545454]">What-If Scenario Planner</h3>
            <p className="text-xs text-slate-600">AI-powered emissions forecasting and scenario modeling</p>
          </div>
        </div>
        <Badge className="bg-purple-600">
          {Math.round(impact.reductionPercentage)}% Reduction
        </Badge>
      </div>

      {/* Current vs Projected */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <p className="text-xs text-slate-600 uppercase font-bold mb-1">Current Emissions</p>
            <p className="text-3xl font-bold text-slate-900">{Math.round(totalCurrentEmissions).toLocaleString()}</p>
            <p className="text-xs text-slate-600">tCO2e/year</p>
          </CardContent>
        </Card>

        <Card className="border-[#86b027] bg-[#86b027]/5">
          <CardContent className="p-6">
            <p className="text-xs text-[#86b027] uppercase font-bold mb-1">Projected Emissions</p>
            <p className="text-3xl font-bold text-[#86b027]">{Math.round(impact.projectedEmissions).toLocaleString()}</p>
            <p className="text-xs text-slate-600">tCO2e/year by {currentYear + 5}</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-emerald-600" />
              <p className="text-xs text-emerald-700 uppercase font-bold">Total Reduction</p>
            </div>
            <p className="text-3xl font-bold text-emerald-600">{Math.round(impact.totalReduction).toLocaleString()}</p>
            <p className="text-xs text-emerald-700">{Math.round(impact.reductionPercentage)}% reduction</p>
          </CardContent>
        </Card>
      </div>

      {/* Scenario Levers */}
      <Card>
        <CardHeader>
          <CardTitle>Reduction Levers</CardTitle>
          <p className="text-sm text-slate-600">Adjust sliders to model impact</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium">Renewable Energy Transition</label>
              <span className="text-sm font-bold text-[#86b027]">{scenarios.renewableEnergy}% of Scope 2</span>
            </div>
            <Slider
              value={[scenarios.renewableEnergy]}
              onValueChange={(value) => setScenarios({ ...scenarios, renewableEnergy: value[0] })}
              max={100}
              step={5}
            />
            <p className="text-xs text-slate-600 mt-1">Impact: {Math.round(impact.breakdown.renewable)} tCO2e reduction</p>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium">Supplier Engagement Program</label>
              <span className="text-sm font-bold text-[#02a1e8]">{scenarios.supplierEngagement}% of Scope 3</span>
            </div>
            <Slider
              value={[scenarios.supplierEngagement]}
              onValueChange={(value) => setScenarios({ ...scenarios, supplierEngagement: value[0] })}
              max={50}
              step={5}
            />
            <p className="text-xs text-slate-600 mt-1">Impact: {Math.round(impact.breakdown.supplier)} tCO2e reduction</p>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium">Operational Efficiency Improvements</label>
              <span className="text-sm font-bold text-purple-600">{scenarios.efficiencyImprovements}% of Scope 1</span>
            </div>
            <Slider
              value={[scenarios.efficiencyImprovements]}
              onValueChange={(value) => setScenarios({ ...scenarios, efficiencyImprovements: value[0] })}
              max={40}
              step={5}
            />
            <p className="text-xs text-slate-600 mt-1">Impact: {Math.round(impact.breakdown.efficiency)} tCO2e reduction</p>
          </div>
        </CardContent>
      </Card>

      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Emissions Trajectory ({currentYear}-{currentYear + 5})</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="baseline" stroke="#94a3b8" strokeDasharray="5 5" name="Baseline (No Action)" />
              <Line type="monotone" dataKey="projected" stroke="#86b027" strokeWidth={2} name="Projected (With Actions)" />
              <Line type="monotone" dataKey="target" stroke="#02a1e8" strokeDasharray="3 3" name="Science-Based Target" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Reduction Breakdown */}
      {reductionBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reduction Breakdown by Lever</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={reductionBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="lever" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="reduction" fill="#86b027" name="Reduction (tCO2e)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            <CardTitle>AI Recommendations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-slate-700">
            {scenarios.renewableEnergy < 50 && (
              <li className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-[#86b027] mt-0.5" />
                <span>Increase renewable energy to 50% for an additional {Math.round((0.5 - scenarios.renewableEnergy / 100) * currentScope2)} tCO2e reduction</span>
              </li>
            )}
            {scenarios.supplierEngagement < 20 && (
              <li className="flex items-start gap-2">
                <TrendingDown className="w-4 h-4 text-[#02a1e8] mt-0.5" />
                <span>Engage top 20% of suppliers by emissions for maximum Scope 3 impact</span>
              </li>
            )}
            {impact.reductionPercentage < 30 && (
              <li className="flex items-start gap-2">
                <Target className="w-4 h-4 text-amber-600 mt-0.5" />
                <span>Current scenario achieves {Math.round(impact.reductionPercentage)}% reduction. Consider more aggressive targets to align with SBTi standards (≥50%)</span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}