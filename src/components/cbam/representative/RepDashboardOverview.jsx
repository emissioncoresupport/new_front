import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Users, FileText, AlertCircle, Link2 } from "lucide-react";
import CBAMIntegrationStatus from '../integration/CBAMIntegrationStatus';

export default function RepDashboardOverview({ clients = [], entries = [], reports = [] }) {
  const [showIntegrationStatus, setShowIntegrationStatus] = useState(false);
  const clientsByCountry = clients.reduce((acc, c) => {
    const country = c.member_state || 'Unknown';
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {});
  
  const countryData = Object.entries(clientsByCountry).map(([country, count]) => ({
    country,
    count
  }));
  
  const COLORS = ['#86b027', '#02a1e8', '#f59e0b', '#ef4444', '#8b5cf6'];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <Button 
          variant="outline"
          onClick={() => setShowIntegrationStatus(true)}
          className="h-9 gap-2 bg-white/60 backdrop-blur-sm border-white/80 hover:bg-white/80"
        >
          <Link2 className="w-4 h-4" />
          Integration Status
        </Button>
      </div>
      
      {showIntegrationStatus && (
        <CBAMIntegrationStatus onClose={() => setShowIntegrationStatus(false)} />
      )}
      
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200/30">
            <h3 className="text-sm font-light text-slate-900">Clients by Member State</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={countryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ country }) => country}
                >
                  {countryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200/30">
            <h3 className="text-sm font-light text-slate-900">Total Emissions Managed</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-12">
              <p className="text-4xl font-light text-slate-900">
                {entries.reduce((sum, e) => sum + (e.total_embedded_emissions || 0), 0).toFixed(0)}
              </p>
              <p className="text-xs text-slate-500 font-light mt-2">tCO₂e total</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}