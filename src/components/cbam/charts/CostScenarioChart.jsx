import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Euro, TrendingUp, Download, Info } from "lucide-react";
import html2canvas from 'html2canvas';

const ETS_SCENARIOS = [
  { name: 'Conservative', price: 70, color: '#84cc16' },
  { name: 'Base Case', price: 88, color: '#86b027' },
  { name: 'Moderate', price: 100, color: '#f59e0b' },
  { name: 'Aggressive', price: 120, color: '#ef4444' }
];

export default function CostScenarioChart({ entries }) {
  const chartRef = React.useRef(null);

  const scenarioData = useMemo(() => {
    if (!entries || entries.length === 0) return [];

    const totalEmissions = entries.reduce((sum, e) => sum + (e.total_embedded_emissions || 0), 0);
    const cbamRate2026 = 0.025; // 2.5% obligation in 2026
    const certificatesRequired = Math.ceil(totalEmissions * cbamRate2026);

    // Calculate deductions
    const totalDeductions = entries.reduce((sum, e) => {
      if (e.carbon_price_due_paid && e.total_embedded_emissions) {
        return sum + (e.total_embedded_emissions * e.carbon_price_due_paid);
      }
      return sum;
    }, 0);

    return ETS_SCENARIOS.map(scenario => {
      const grossCost = certificatesRequired * scenario.price;
      const netCost = Math.max(0, grossCost - totalDeductions);
      
      return {
        scenario: scenario.name,
        price: scenario.price,
        certificates: certificatesRequired,
        grossCost,
        deductions: totalDeductions,
        netCost,
        costPerTonne: totalEmissions > 0 ? netCost / totalEmissions : 0,
        color: scenario.color
      };
    });
  }, [entries]);

  const handleExportCSV = () => {
    const headers = Object.keys(scenarioData[0]);
    const csv = [
      headers.join(','),
      ...scenarioData.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cost_scenarios_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportPNG = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: '#ffffff', scale: 2 });
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cost_scenarios_${new Date().toISOString().split('T')[0]}.png`;
      link.click();
    });
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Euro className="w-5 h-5 text-[#86b027]" />
              CBAM Cost Scenarios (2026)
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">Projected costs at different EUA price levels</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="w-3 h-3 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPNG}>
              <Download className="w-3 h-3 mr-1" /> PNG
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent ref={chartRef} className="space-y-4">
        {/* Scenario Cards */}
        <div className="grid grid-cols-4 gap-3">
          {scenarioData.map((scenario, idx) => (
            <div 
              key={idx}
              className="p-3 border-2 rounded-lg hover:shadow-md transition-shadow"
              style={{ borderColor: scenario.color }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">{scenario.scenario}</span>
                <Badge 
                  variant="outline" 
                  className="text-[10px] font-mono"
                  style={{ borderColor: scenario.color, color: scenario.color }}
                >
                  €{scenario.price}
                </Badge>
              </div>
              <div className="text-lg font-bold text-slate-900">
                €{scenario.netCost.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {scenario.certificates.toLocaleString()} certs
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={scenarioData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="scenario" 
              stroke="#94a3b8" 
              fontSize={11}
            />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value) => `€${value.toLocaleString()}`}
            />
            <Line 
              type="monotone" 
              dataKey="netCost" 
              stroke="#86b027" 
              strokeWidth={3}
              dot={{ fill: '#86b027', r: 5 }}
              activeDot={{ r: 7 }}
              name="Net Payable"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Info Box */}
        <div className="p-3 bg-[#02a1e8]/5 border border-[#02a1e8]/20 rounded-lg flex items-start gap-2 text-xs">
          <Info className="w-4 h-4 text-[#02a1e8] mt-0.5 shrink-0" />
          <div className="text-slate-700">
            <strong>2026 Phase-in:</strong> Calculations assume 2.5% certificate obligation rate. 
            Deductions for carbon prices paid abroad are automatically applied per Article 9.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}