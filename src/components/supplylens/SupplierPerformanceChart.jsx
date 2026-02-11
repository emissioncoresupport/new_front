import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-slate-100 text-xs">
        <p className="font-semibold text-slate-900 mb-1">{label}</p>
        <p className="text-emerald-600 font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Avg Score: {payload[0].value}
        </p>
        <p className="text-slate-500 mt-1">
          Active Suppliers: {payload[0].payload.count}
        </p>
      </div>
    );
  }
  return null;
};

export default function SupplierPerformanceChart({ data }) {
  // Simulate trend data based on current suppliers
  // In a real app, this would come from historical snapshots or logs
  const chartData = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, i) => {
      // Create a gentle upward trend with some randomness
      const baseScore = 75 + (i * 1.5); 
      const randomVar = Math.random() * 5 - 2.5;
      return {
        name: month,
        score: Math.min(100, Math.round(baseScore + randomVar)),
        count: Math.round(data.length * (0.8 + (i * 0.05))) // Simulating growth
      };
    });
  }, [data.length]);

  return (
    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Supplier Performance Trend
          </CardTitle>
          <p className="text-xs text-slate-500">Average risk & compliance scores (6 Months)</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            +4.2% vs last month
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b' }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b' }}
                domain={[60, 100]}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }} />
              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorScore)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}