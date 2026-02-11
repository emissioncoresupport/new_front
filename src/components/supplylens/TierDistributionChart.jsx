import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = {
  tier_1: '#0ea5e9', // Sky
  tier_2: '#84cc16', // Lime
  tier_3: '#eab308', // Yellow
  unknown: '#cbd5e1'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-100">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-sm text-slate-600">{payload[0].value} suppliers</p>
      </div>
    );
  }
  return null;
};

export default function TierDistributionChart({ suppliers }) {
  const data = React.useMemo(() => {
    const counts = { tier_1: 0, tier_2: 0, tier_3: 0, unknown: 0 };
    suppliers.forEach(s => {
      const tier = s.tier || 'unknown';
      counts[tier] = (counts[tier] || 0) + 1;
    });
    
    return [
      { name: 'Tier 1', value: counts.tier_1, fill: COLORS.tier_1 },
      { name: 'Tier 2', value: counts.tier_2, fill: COLORS.tier_2 },
      { name: 'Tier 3', value: counts.tier_3, fill: COLORS.tier_3 },
      { name: 'Unknown', value: counts.unknown, fill: COLORS.unknown }
    ].filter(d => d.value > 0);
  }, [suppliers]);

  return (
    <Card className="bg-white/80 backdrop-blur-md border-slate-200 shadow-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-900">
          Supply Chain Tiers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} />
              </BarChart>
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