import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Globe } from 'lucide-react';

const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-slate-100 text-xs">
        <p className="font-semibold text-slate-900">{payload[0].payload.fullName}</p>
        <p className="text-slate-600">
          {payload[0].value} Suppliers
        </p>
        <p className="text-slate-400 text-[10px] mt-1">
          {(payload[0].payload.percentage)}% of total
        </p>
      </div>
    );
  }
  return null;
};

export default function TopCountriesChart({ suppliers }) {
  const data = React.useMemo(() => {
    const counts = {};
    suppliers.forEach(s => {
      if (!s.country) return;
      counts[s.country] = (counts[s.country] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({
        name: name.length > 3 && name !== 'USA' && name !== 'UK' ? name.substring(0, 3).toUpperCase() : name,
        fullName: name,
        value,
        percentage: ((value / suppliers.length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [suppliers]);

  return (
    <Card className="bg-white/80 backdrop-blur-md border-slate-200 shadow-xl hover:shadow-2xl transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-600" />
          Top Sourcing Regions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                  width={30}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              No country data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}