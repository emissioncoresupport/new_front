import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Globe, Factory, Download } from "lucide-react";
import html2canvas from 'html2canvas';
import { COUNTRY_FLAGS } from '../constants';

const COLORS = ['#86b027', '#02a1e8', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function CountrySectorBreakdown({ entries }) {
  const [activeTab, setActiveTab] = useState('country');
  const chartRef = React.useRef(null);

  const countryData = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    
    const grouped = {};
    entries.forEach(entry => {
      const country = entry.country_of_origin || 'Unknown';
      if (!grouped[country]) {
        grouped[country] = {
          country,
          emissions: 0,
          imports: 0,
          volume: 0
        };
      }
      grouped[country].emissions += entry.total_embedded_emissions || 0;
      grouped[country].imports += 1;
      grouped[country].volume += entry.quantity || 0;
    });

    return Object.values(grouped)
      .sort((a, b) => b.emissions - a.emissions)
      .slice(0, 8);
  }, [entries]);

  const sectorData = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    
    const grouped = {};
    entries.forEach(entry => {
      const sector = entry.aggregated_goods_category || 'Other';
      if (!grouped[sector]) {
        grouped[sector] = {
          sector,
          emissions: 0,
          imports: 0,
          value: 0
        };
      }
      grouped[sector].emissions += entry.total_embedded_emissions || 0;
      grouped[sector].imports += 1;
      grouped[sector].value += entry.total_embedded_emissions || 0;
    });

    return Object.values(grouped).sort((a, b) => b.emissions - a.emissions);
  }, [entries]);

  const handleExportCSV = () => {
    const data = activeTab === 'country' ? countryData : sectorData;
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTab}_breakdown_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportPNG = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: '#ffffff', scale: 2 });
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeTab}_breakdown_${new Date().toISOString().split('T')[0]}.png`;
      link.click();
    });
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    return (
      <div className="bg-white p-2.5 border border-slate-200/80 rounded-lg shadow-sm text-xs">
        <p className="font-medium text-slate-900 mb-1">
          {data.country || data.sector}
        </p>
        <p className="text-slate-600 text-xs">
          Emissions: <span className="font-medium">{(data.emissions || 0).toFixed(1)}</span> tCO2e
        </p>
        <p className="text-slate-600 text-xs">
          Imports: <span className="font-medium">{data.imports || 0}</span>
        </p>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-900">Origin & Sector</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-8 px-2 text-xs shadow-none">
            <Download className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPNG} className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-8 px-2 text-xs shadow-none">
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div ref={chartRef}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-50/50 mb-3 border border-slate-200/60 h-8">
            <TabsTrigger value="country" className="text-xs h-7">
              <Globe className="w-3 h-3 mr-1" /> By Country
            </TabsTrigger>
            <TabsTrigger value="sector" className="text-xs h-7">
              <Factory className="w-3 h-3 mr-1" /> By Sector
            </TabsTrigger>
          </TabsList>

          <TabsContent value="country">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={countryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="country" 
                  stroke="#94a3b8" 
                  fontSize={10}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="emissions" fill="#86b027" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="sector">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ sector, percent }) => `${sector}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}