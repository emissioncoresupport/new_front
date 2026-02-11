import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, TrendingDown, AlertCircle, Calendar, RefreshCw } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ForecastCosts() {
  const [scenario, setScenario] = useState('baseline');
  const [timeHorizon, setTimeHorizon] = useState('12');

  const { data: entries = [] } = useQuery({
    queryKey: ['cbam-emission-entries'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });

  // Generate forecast data
  const forecastData = useMemo(() => {
    const months = parseInt(timeHorizon);
    const data = [];
    const baseEmissions = entries.reduce((sum, e) => sum + (e.total_embedded_emissions || 0), 0) / 12;
    
    for (let i = 0; i < months; i++) {
      const month = new Date();
      month.setMonth(month.getMonth() + i);
      
      const baselineEmissions = baseEmissions * (1 + Math.random() * 0.1);
      const optimisticEmissions = baseEmissions * 0.7 * (1 + Math.random() * 0.1);
      const pessimisticEmissions = baseEmissions * 1.3 * (1 + Math.random() * 0.1);
      
      const carbonPrice = 80 + (i * 2) + (Math.random() * 10);
      
      data.push({
        month: month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        baseline: baselineEmissions * carbonPrice,
        optimistic: optimisticEmissions * carbonPrice,
        pessimistic: pessimisticEmissions * carbonPrice,
        carbonPrice
      });
    }
    
    return data;
  }, [entries, timeHorizon]);

  const totalCost = useMemo(() => {
    const key = scenario;
    return forecastData.reduce((sum, d) => sum + (d[key] || 0), 0);
  }, [forecastData, scenario]);

  const avgMonthly = forecastData.length > 0 ? totalCost / forecastData.length : 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base font-medium text-slate-900">Forecast Costs</h2>
            <p className="text-xs text-slate-500 mt-0.5">Project future costs by scenario</p>
          </div>
          <div className="flex gap-2">
            <Select value={timeHorizon} onValueChange={setTimeHorizon}>
              <SelectTrigger className="w-[130px] h-9 border-slate-200/80 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 Months</SelectItem>
                <SelectItem value="12">12 Months</SelectItem>
                <SelectItem value="18">18 Months</SelectItem>
                <SelectItem value="24">24 Months</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={scenario} onValueChange={setScenario}>
              <SelectTrigger className="w-[160px] h-9 border-slate-200/80 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baseline">Baseline</SelectItem>
                <SelectItem value="optimistic">Optimistic (-30%)</SelectItem>
                <SelectItem value="pessimistic">Pessimistic (+30%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Clean Summary Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Total Forecast</p>
          <p className="text-3xl font-light text-slate-900">€{totalCost.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          <p className="text-xs text-slate-400 mt-1">{timeHorizon} months</p>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Avg Monthly</p>
          <p className="text-3xl font-light text-slate-900">€{avgMonthly.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          <p className="text-xs text-slate-400 mt-1">Expected spend</p>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Budget Impact</p>
          <p className="text-3xl font-light text-slate-900">
            {scenario === 'optimistic' ? '-30%' : scenario === 'pessimistic' ? '+30%' : '±0%'}
          </p>
          <p className="text-xs text-slate-400 mt-1">vs baseline</p>
        </div>
      </div>

      {/* Clean Chart */}
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="border-b border-slate-200/60 px-5 py-4">
          <h3 className="text-sm font-medium text-slate-900">Cost Projection ({scenario})</h3>
        </div>
        <div className="p-5">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#86b027" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#86b027" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip formatter={(value) => value != null ? `€${value.toLocaleString(undefined, {maximumFractionDigits: 0})}` : '€0'} />
                <Area 
                  type="monotone" 
                  dataKey={scenario} 
                  stroke="#86b027" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorCost)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Clean Comparison */}
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="border-b border-slate-200/60 px-5 py-4">
          <h3 className="text-sm font-medium text-slate-900">Scenario Comparison</h3>
        </div>
        <div className="p-5">
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip formatter={(value) => value != null ? `€${value.toLocaleString(undefined, {maximumFractionDigits: 0})}` : '€0'} />
                <Legend />
                <Line type="monotone" dataKey="baseline" stroke="#3b82f6" strokeWidth={2} name="Baseline" />
                <Line type="monotone" dataKey="optimistic" stroke="#22c55e" strokeWidth={2} name="Optimistic" strokeDasharray="5 5" />
                <Line type="monotone" dataKey="pessimistic" stroke="#ef4444" strokeWidth={2} name="Pessimistic" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Clean Recommendations */}
      <div className="bg-blue-50/50 border border-blue-200/60 rounded-lg p-3">
        <h4 className="font-medium text-slate-900 text-xs mb-2">Cost Reduction Tips</h4>
        <ul className="space-y-0.5 text-xs text-slate-600">
          <li>• Source from verified low-carbon suppliers</li>
          <li>• Consider EU/US suppliers with free allocations</li>
          <li>• Optimize import schedules</li>
        </ul>
      </div>
    </div>
  );
}