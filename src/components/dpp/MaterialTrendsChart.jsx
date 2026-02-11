import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function MaterialTrendsChart({ dppRecords }) {
  // Simulate material usage trends over time
  const materialTrends = [
    { month: 'Jan', Aluminum: 35, Steel: 25, Plastic: 40, Copper: 15, Textile: 20 },
    { month: 'Feb', Aluminum: 38, Steel: 23, Plastic: 38, Copper: 17, Textile: 22 },
    { month: 'Mar', Aluminum: 40, Steel: 22, Plastic: 35, Copper: 18, Textile: 25 },
    { month: 'Apr', Aluminum: 42, Steel: 20, Plastic: 33, Copper: 20, Textile: 27 },
    { month: 'May', Aluminum: 45, Steel: 18, Plastic: 30, Copper: 22, Textile: 30 },
    { month: 'Jun', Aluminum: 48, Steel: 17, Plastic: 28, Copper: 25, Textile: 32 }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Material Usage Trends</CardTitle>
        <p className="text-sm text-slate-500">Percentage composition changes over time</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={materialTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="Aluminum" stackId="1" stroke="#86b027" fill="#86b027" fillOpacity={0.6} />
            <Area type="monotone" dataKey="Steel" stackId="1" stroke="#02a1e8" fill="#02a1e8" fillOpacity={0.6} />
            <Area type="monotone" dataKey="Plastic" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
            <Area type="monotone" dataKey="Copper" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
            <Area type="monotone" dataKey="Textile" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}