import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingDown, Award } from "lucide-react";

export default function LCAScenarioComparison({ scenarios }) {
  const calculatedScenarios = scenarios.filter(s => s.status === 'Calculated');
  
  if (calculatedScenarios.length < 2) return null;

  const impactCategories = [
    { key: 'total_climate_change', label: 'Climate Change', unit: 'kg CO₂e' },
    { key: 'total_water_use', label: 'Water Use', unit: 'm³' },
    { key: 'total_resource_depletion', label: 'Resource Depletion', unit: 'kg Sb eq' },
    { key: 'total_acidification', label: 'Acidification', unit: 'kg SO₂ eq' }
  ];

  const chartData = impactCategories.map(category => {
    const data = { name: category.label };
    calculatedScenarios.forEach(scenario => {
      data[scenario.scenario_name] = scenario[category.key] || 0;
    });
    return data;
  });

  const baseline = calculatedScenarios.find(s => s.is_baseline);
  const bestScenario = calculatedScenarios.reduce((best, current) => {
    if (!best) return current;
    return (current.total_climate_change || 0) < (best.total_climate_change || 0) ? current : best;
  }, null);

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-emerald-600" />
          Scenario Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Best Scenario Highlight */}
        {baseline && bestScenario && !bestScenario.is_baseline && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
            <Award className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-900 mb-1">Best Performing Scenario</p>
              <p className="text-sm text-emerald-800">
                <strong>{bestScenario.scenario_name}</strong> shows {
                  ((1 - (bestScenario.total_climate_change || 0) / (baseline.total_climate_change || 1)) * 100).toFixed(1)
                }% reduction in climate change impact compared to baseline
              </p>
            </div>
          </div>
        )}

        {/* Comparison Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {calculatedScenarios.map((scenario, idx) => (
                <Bar 
                  key={scenario.id}
                  dataKey={scenario.scenario_name}
                  fill={scenario.is_baseline ? '#3b82f6' : `hsl(${120 + idx * 40}, 70%, 50%)`}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b-2 border-slate-200">
              <tr>
                <th className="text-left p-3 font-bold text-slate-700">Impact Category</th>
                {calculatedScenarios.map(s => (
                  <th key={s.id} className="text-right p-3 font-bold text-slate-700">
                    {s.scenario_name}
                    {s.is_baseline && <span className="text-blue-600 ml-1">★</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {impactCategories.map(category => (
                <tr key={category.key} className="hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-700">{category.label}</td>
                  {calculatedScenarios.map(scenario => (
                    <td key={scenario.id} className="text-right p-3">
                      <span className="font-mono text-slate-900">
                        {(scenario[category.key] || 0).toFixed(3)}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">{category.unit}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}