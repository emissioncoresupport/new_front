import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Euro, TrendingDown, AlertCircle, Lightbulb } from "lucide-react";
import PPWRCalculationService from './services/PPWRCalculationService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PPWRPlasticTaxDashboard() {
  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const plasticPackaging = packaging.filter(p => p.material_category === 'Plastic');
  
  const taxData = plasticPackaging.map(pkg => {
    const calc = PPWRCalculationService.calculatePlasticTax(pkg);
    return {
      packaging: pkg,
      calculation: calc
    };
  });

  const totalTax = taxData.reduce((sum, d) => sum + d.calculation.tax_eur, 0);
  const totalSavingsPotential = taxData.reduce((sum, d) => sum + (d.calculation.potential_savings || 0), 0);

  const chartData = taxData.slice(0, 10).map(d => ({
    name: d.packaging.packaging_name.substring(0, 20),
    tax: d.calculation.tax_eur,
    savings: d.calculation.potential_savings
  }));

  return (
    <div className="space-y-6">
      <Card className="border-amber-200 bg-gradient-to-br from-white to-amber-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <Euro className="w-5 h-5" />
            EU Plastic Tax Calculator
          </CardTitle>
          <p className="text-sm text-slate-500">
            €0.80 per kg of non-recycled plastic packaging waste
          </p>
        </CardHeader>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 uppercase font-bold">Total Tax Liability</p>
                <h3 className="text-3xl font-extrabold text-amber-600 mt-2">
                  €{totalTax.toFixed(2)}
                </h3>
              </div>
              <Euro className="w-10 h-10 text-amber-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-700 uppercase font-bold">Savings Potential</p>
                <h3 className="text-3xl font-extrabold text-emerald-600 mt-2">
                  €{totalSavingsPotential.toFixed(2)}
                </h3>
              </div>
              <TrendingDown className="w-10 h-10 text-emerald-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 uppercase font-bold">Plastic Items</p>
                <h3 className="text-3xl font-extrabold text-blue-600 mt-2">
                  {plasticPackaging.length}
                </h3>
              </div>
              <AlertCircle className="w-10 h-10 text-blue-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tax & Savings Potential by Item</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" angle={-20} textAnchor="end" height={80} tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis label={{ value: 'EUR', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }} tick={{ fill: '#64748b' }} />
              <Tooltip />
              <Bar dataKey="tax" fill="#f59e0b" name="Tax Liability" radius={[8, 8, 0, 0]} />
              <Bar dataKey="savings" fill="#10b981" name="Potential Savings" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Optimization Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-700">
            <Lightbulb className="w-5 h-5" />
            Top Tax Reduction Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {taxData
              .sort((a, b) => b.calculation.potential_savings - a.calculation.potential_savings)
              .slice(0, 5)
              .map((item, idx) => (
                <div key={idx} className="p-4 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-slate-900">{item.packaging.packaging_name}</h4>
                    <Badge className="bg-emerald-500 text-white">
                      Save €{item.calculation.potential_savings.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Current Tax</p>
                      <p className="font-bold text-amber-600">€{item.calculation.tax_eur.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Non-Recycled</p>
                      <p className="font-bold text-slate-900">{item.calculation.non_recycled_kg.toFixed(3)} kg</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#86b027] font-semibold mt-3">
                    💡 {item.calculation.recommendation}
                  </p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}