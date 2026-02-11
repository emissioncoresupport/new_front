import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = {
  low: '#84cc16', // Lime
  medium: '#eab308', // Yellow
  high: '#f97316', // Orange
  critical: '#f43f5e' // Rose
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-100">
        <p className="text-sm font-semibold text-slate-900 capitalize">{payload[0].name}</p>
        <p className="text-sm text-slate-600">
          {payload[0].value} suppliers ({payload[0].payload.percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

export default function RiskDistributionChart({ suppliers }) {
  const data = React.useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0, critical: 0 };
    suppliers.forEach(s => {
      const level = s.risk_level || 'medium';
      counts[level] = (counts[level] || 0) + 1;
    });
    
    const total = suppliers.length || 1;
    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({
        name,
        value,
        percentage: ((value / total) * 100).toFixed(1)
      }));
  }, [suppliers]);

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-900">
          Risk Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={index} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => (
                    <span className="text-sm text-slate-600 capitalize">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              No data
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}