import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Download, Calendar } from "lucide-react";
import html2canvas from 'html2canvas';

export default function EmissionsTrendChart({ entries }) {
  const [timeframe, setTimeframe] = React.useState('6m');
  const [view, setView] = React.useState('monthly');
  const chartRef = React.useRef(null);

  const chartData = useMemo(() => {
    if (!entries || entries.length === 0) return [];

    // Group by month
    const grouped = {};
    entries.forEach(entry => {
      if (!entry.import_date) return;
      
      const date = new Date(entry.import_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          month: monthKey,
          totalEmissions: 0,
          directEmissions: 0,
          indirectEmissions: 0,
          imports: 0,
          avgIntensity: 0
        };
      }
      
      grouped[monthKey].totalEmissions += entry.total_embedded_emissions || 0;
      grouped[monthKey].directEmissions += (entry.quantity || 0) * (entry.direct_emissions_specific || 0);
      grouped[monthKey].indirectEmissions += (entry.quantity || 0) * (entry.indirect_emissions_specific || 0);
      grouped[monthKey].imports += 1;
    });

    // Convert to array and sort
    const data = Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
    
    // Calculate average intensity
    data.forEach(item => {
      item.avgIntensity = item.totalEmissions / Math.max(1, item.imports);
    });

    // Filter by timeframe
    const months = timeframe === '3m' ? 3 : timeframe === '6m' ? 6 : 12;
    return data.slice(-months);
  }, [entries, timeframe]);

  const handleExportCSV = () => {
    const headers = Object.keys(chartData[0]);
    const csv = [
      headers.join(','),
      ...chartData.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `emissions_trend_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportPNG = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: '#ffffff', scale: 2 });
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `emissions_trend_${new Date().toISOString().split('T')[0]}.png`;
      link.click();
    });
  };

  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-slate-900">Emissions Trend</h3>
          <p className="text-xs text-slate-500 mt-0.5">Monthly embedded emissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[100px] h-8 text-xs border-slate-200/80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">3 Months</SelectItem>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="12m">12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-8 px-2 text-xs shadow-none">
            <Download className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPNG} className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-8 px-2 text-xs shadow-none">
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div ref={chartRef}>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#86b027" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#86b027" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorDirect" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#02a1e8" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#02a1e8" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="month" 
              tickFormatter={formatMonth}
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
              formatter={(value) => `${(value || 0).toFixed(1)} tCO2e`}
            />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="circle"
            />
            <Area 
              type="monotone" 
              dataKey="totalEmissions" 
              stroke="#86b027" 
              fillOpacity={1} 
              fill="url(#colorTotal)"
              name="Total Emissions"
            />
            <Area 
              type="monotone" 
              dataKey="directEmissions" 
              stroke="#02a1e8" 
              fillOpacity={1} 
              fill="url(#colorDirect)"
              name="Direct Emissions"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}