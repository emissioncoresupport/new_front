import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Layers } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const MATERIAL_COLORS = {
  'Plastic': '#ef4444',
  'Paper/Cardboard': '#f59e0b',
  'Glass': '#06b6d4',
  'Metal': '#64748b',
  'Wood': '#a3e635',
  'Composite': '#8b5cf6'
};

export default function PPWRComponentBreakdown() {
  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const materialBreakdown = Object.keys(MATERIAL_COLORS).map(material => ({
    name: material,
    value: packaging.filter(p => p.material_category === material).reduce((sum, p) => sum + (p.total_weight_kg || 0), 0),
    count: packaging.filter(p => p.material_category === material).length,
    fill: MATERIAL_COLORS[material]
  })).filter(m => m.value > 0);

  return (
    <Card className="border-indigo-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          Packaging Component Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={materialBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                dataKey="value"
              >
                {materialBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value.toFixed(2)} kg`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          {materialBreakdown.map(mat => (
            <div key={mat.name} className="p-3 bg-white rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: mat.fill }} />
                <span className="font-medium text-sm">{mat.name}</span>
              </div>
              <div className="text-xs text-slate-500">
                {mat.count} packages • {mat.value.toFixed(2)} kg
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}