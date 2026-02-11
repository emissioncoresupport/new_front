import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Package, Download } from "lucide-react";
import html2canvas from 'html2canvas';

export default function ClientPerformanceCharts({ clients, imports }) {
  const readinessChartRef = React.useRef(null);
  const volumeChartRef = React.useRef(null);

  const readinessData = useMemo(() => {
    // Simulate readiness over time (in production, fetch historical data)
    const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    
    return clients.slice(0, 5).map(client => {
      const currentScore = client.readiness_score || 0;
      return {
        name: client.name,
        data: months.map((month, idx) => ({
          month,
          score: Math.max(0, currentScore - (5 - idx) * 10) // Simulate improvement
        }))
      };
    });
  }, [clients]);

  const volumeData = useMemo(() => {
    return clients.map(client => {
      const clientImports = imports.filter(i => i.eori_number === client.eori_number);
      const totalVolume = clientImports.reduce((sum, i) => sum + (i.quantity || 0), 0);
      const totalEmissions = clientImports.reduce((sum, i) => sum + (i.total_embedded_emissions || 0), 0);
      
      return {
        name: client.name.length > 15 ? client.name.substring(0, 15) + '...' : client.name,
        imports: clientImports.length,
        volume: parseFloat(totalVolume.toFixed(1)),
        emissions: parseFloat(totalEmissions.toFixed(1))
      };
    }).sort((a, b) => b.volume - a.volume).slice(0, 8);
  }, [clients, imports]);

  const handleExportReadiness = () => {
    const flatData = readinessData.flatMap(client => 
      client.data.map(d => ({ client: client.name, ...d }))
    );
    const headers = Object.keys(flatData[0]);
    const csv = [
      headers.join(','),
      ...flatData.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `client_readiness_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportVolume = () => {
    const headers = Object.keys(volumeData[0]);
    const csv = [
      headers.join(','),
      ...volumeData.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `client_volumes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Readiness Trend */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#86b027]" />
                Client Readiness Trends
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Compliance progress over time</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportReadiness}>
              <Download className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent ref={readinessChartRef}>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="month" 
                stroke="#94a3b8" 
                fontSize={10}
                allowDuplicatedCategory={false}
              />
              <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '11px'
                }}
                formatter={(value) => `${value}%`}
              />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              {readinessData.map((client, idx) => (
                <Line
                  key={client.name}
                  data={client.data}
                  type="monotone"
                  dataKey="score"
                  name={client.name.substring(0, 20)}
                  stroke={['#86b027', '#02a1e8', '#f59e0b', '#ef4444', '#8b5cf6'][idx]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Import Volumes */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-[#02a1e8]" />
                Import Volumes by Client
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Total quantities and emissions</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportVolume}>
              <Download className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent ref={volumeChartRef}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                fontSize={9}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#94a3b8" fontSize={10} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '11px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Bar dataKey="volume" fill="#02a1e8" radius={[4, 4, 0, 0]} name="Volume (t)" />
              <Bar dataKey="emissions" fill="#86b027" radius={[4, 4, 0, 0]} name="Emissions (tCO2e)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}