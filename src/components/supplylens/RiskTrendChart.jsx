import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown } from "lucide-react";

export default function RiskTrendChart({ supplier, historicalData }) {
  // In a real app, fetch historical risk scores from a dedicated entity
  // For demo, generate mock trend data
  const generateTrendData = () => {
    if (historicalData && historicalData.length > 0) return historicalData;
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const baseScore = supplier?.risk_score || 50;
    
    return months.map((month, idx) => ({
      month,
      risk_score: Math.max(0, Math.min(100, baseScore + (Math.random() - 0.5) * 20 - idx * 2)),
      location_risk: supplier?.location_risk || 40,
      sector_risk: supplier?.sector_risk || 45,
      human_rights_risk: supplier?.human_rights_risk || 50,
      environmental_risk: supplier?.environmental_risk || 48
    }));
  };

  const data = generateTrendData();
  const currentScore = data[data.length - 1]?.risk_score || 0;
  const previousScore = data[data.length - 2]?.risk_score || 0;
  const trend = currentScore - previousScore;

  return (
    <Card className="border-slate-100 shadow-sm rounded-2xl">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold text-[#545454]">Risk Score Trend</CardTitle>
            <CardDescription>Historical risk assessment over time</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {trend > 0 ? (
              <TrendingUp className="w-5 h-5 text-rose-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-[#86b027]" />
            )}
            <span className={`text-sm font-bold ${trend > 0 ? 'text-rose-600' : 'text-[#86b027]'}`}>
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e2e8f0', 
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="risk_score" 
              stroke="#ef4444" 
              strokeWidth={2}
              fill="url(#riskGradient)" 
            />
            <Line type="monotone" dataKey="location_risk" stroke="#3b82f6" strokeWidth={1} strokeDasharray="5 5" />
            <Line type="monotone" dataKey="environmental_risk" stroke="#10b981" strokeWidth={1} strokeDasharray="5 5" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}