import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DollarSign, TrendingUp, Building, Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function CarbonCostAllocation() {
  const [allocationMethod, setAllocationMethod] = useState('revenue');

  const { data: ccfEntries = [] } = useQuery({
    queryKey: ['ccf-entries'],
    queryFn: () => base44.entities.CCFEntry.list()
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => base44.entities.Facility.list()
  });

  const { data: cbamPOs = [] } = useQuery({
    queryKey: ['cbam-purchase-orders'],
    queryFn: () => base44.entities.CBAMPurchaseOrder.list()
  });

  // Calculate total emissions
  const totalEmissions = ccfEntries.reduce((sum, e) => sum + (e.co2e_tonnes || 0), 0);
  
  // Calculate CBAM costs
  const cbamCosts = cbamPOs.reduce((sum, po) => {
    const totalEmissions = po.line_items?.reduce((s, li) => s + (li.total_emissions || 0), 0) || 0;
    return sum + (totalEmissions * 75); // €75/tonne
  }, 0);

  // Internal carbon price (example: €50/tonne)
  const internalCarbonPrice = 50;
  const totalCarbonCost = (totalEmissions * internalCarbonPrice) + cbamCosts;

  // Mock cost center data
  const costCenters = [
    { id: 'manufacturing', name: 'Manufacturing', revenue: 5000000, headcount: 120, floorSpace: 15000 },
    { id: 'logistics', name: 'Logistics & Distribution', revenue: 2000000, headcount: 45, floorSpace: 8000 },
    { id: 'admin', name: 'Admin & Support', revenue: 500000, headcount: 30, floorSpace: 2000 },
    { id: 'sales', name: 'Sales & Marketing', revenue: 3000000, headcount: 50, floorSpace: 3000 }
  ];

  // Calculate allocation based on selected method
  const calculateAllocation = () => {
    const totalRevenue = costCenters.reduce((sum, cc) => sum + cc.revenue, 0);
    const totalHeadcount = costCenters.reduce((sum, cc) => sum + cc.headcount, 0);
    const totalFloorSpace = costCenters.reduce((sum, cc) => sum + cc.floorSpace, 0);

    return costCenters.map(cc => {
      let allocationPercent = 0;
      
      switch (allocationMethod) {
        case 'revenue':
          allocationPercent = (cc.revenue / totalRevenue) * 100;
          break;
        case 'headcount':
          allocationPercent = (cc.headcount / totalHeadcount) * 100;
          break;
        case 'floorspace':
          allocationPercent = (cc.floorSpace / totalFloorSpace) * 100;
          break;
        case 'equal':
          allocationPercent = 100 / costCenters.length;
          break;
      }

      const allocatedCost = (allocationPercent / 100) * totalCarbonCost;
      const allocatedEmissions = (allocationPercent / 100) * totalEmissions;

      return {
        ...cc,
        allocationPercent: Math.round(allocationPercent * 10) / 10,
        allocatedCost: Math.round(allocatedCost),
        allocatedEmissions: Math.round(allocatedEmissions * 10) / 10
      };
    });
  };

  const allocatedData = calculateAllocation();

  const COLORS = ['#1e293b', '#475569', '#64748b', '#94a3b8'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-light text-white">Carbon Cost Allocation</h3>
          <p className="text-xs text-slate-400 mt-1">Enterprise carbon accounting and P&L integration</p>
        </div>
        <Select value={allocationMethod} onValueChange={setAllocationMethod}>
          <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10">
            <SelectItem value="revenue">By Revenue</SelectItem>
            <SelectItem value="headcount">By Headcount</SelectItem>
            <SelectItem value="floorspace">By Floor Space</SelectItem>
            <SelectItem value="equal">Equal Split</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Total Carbon Cost - Glassmorphic */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/[0.08] transition-all group">
          <DollarSign className="w-5 h-5 text-slate-300 mb-3" />
          <p className="text-xs font-light text-slate-400 uppercase tracking-wider">Total Carbon Cost</p>
          <p className="text-3xl font-light text-white mt-3">€{totalCarbonCost.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-2">Internal price + CBAM</p>
          <div className="mt-4 h-0.5 bg-gradient-to-r from-slate-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/[0.08] transition-all group">
          <TrendingUp className="w-5 h-5 text-slate-300 mb-3" />
          <p className="text-xs font-light text-slate-400 uppercase tracking-wider">Internal Carbon Price</p>
          <p className="text-3xl font-light text-white mt-3">€{internalCarbonPrice}/t</p>
          <p className="text-xs text-slate-500 mt-2">{Math.round(totalEmissions)} tCO2e</p>
          <div className="mt-4 h-0.5 bg-gradient-to-r from-slate-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/[0.08] transition-all group">
          <Package className="w-5 h-5 text-slate-300 mb-3" />
          <p className="text-xs font-light text-slate-400 uppercase tracking-wider">CBAM Costs</p>
          <p className="text-3xl font-light text-white mt-3">€{Math.round(cbamCosts).toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-2">Imported goods</p>
          <div className="mt-4 h-0.5 bg-gradient-to-r from-slate-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Allocation Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Allocation by Cost Center</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={allocatedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="allocatedCost" fill="#86b027" name="Allocated Cost (€)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pie Chart */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Cost Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={allocatedData}
                  dataKey="allocatedCost"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {allocatedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emissions Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={allocatedData}
                  dataKey="allocatedEmissions"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {allocatedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* P&L Mapping */}
      <Card className="border-[#02a1e8]">
        <CardHeader>
          <CardTitle>Financial Statement Integration</CardTitle>
          <p className="text-sm text-slate-600">Carbon cost mapping to P&L accounts</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-sm">Direct Carbon Costs (P&L Line Item)</span>
                <Badge className="bg-[#02a1e8]">GL Account: 6500</Badge>
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>CBAM Import Costs</span>
                  <span className="font-bold">€{Math.round(cbamCosts).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Internal Carbon Price (Shadow Cost)</span>
                  <span className="font-bold">€{Math.round(totalEmissions * internalCarbonPrice).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold">
                  <span>Total Carbon Cost</span>
                  <span>€{totalCarbonCost.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border rounded-lg">
                <p className="text-xs text-slate-600 mb-1">Cost of Goods Sold (COGS)</p>
                <p className="text-lg font-bold">€{Math.round(cbamCosts).toLocaleString()}</p>
                <p className="text-xs text-slate-500">CBAM allocated to COGS</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-xs text-slate-600 mb-1">Operating Expenses (OPEX)</p>
                <p className="text-lg font-bold">€{Math.round(totalEmissions * internalCarbonPrice).toLocaleString()}</p>
                <p className="text-xs text-slate-500">Internal carbon price</p>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-xs font-bold text-blue-900">📊 P&L Integration</p>
              <p className="text-xs text-blue-800 mt-1">
                Carbon costs can be exported to SAP/Oracle ERP systems via GL account mapping. 
                CBAM costs flow through COGS, internal carbon pricing through OPEX.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Allocation Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Cost Center</th>
                  <th className="text-right p-3">Allocation %</th>
                  <th className="text-right p-3">Carbon Cost (€)</th>
                  <th className="text-right p-3">Emissions (tCO2e)</th>
                  <th className="text-right p-3">Cost/Unit Revenue</th>
                </tr>
              </thead>
              <tbody>
                {allocatedData.map((cc, idx) => (
                  <tr key={cc.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-medium">{cc.name}</td>
                    <td className="text-right p-3">{cc.allocationPercent}%</td>
                    <td className="text-right p-3 font-bold">€{cc.allocatedCost.toLocaleString()}</td>
                    <td className="text-right p-3">{cc.allocatedEmissions}</td>
                    <td className="text-right p-3 text-xs text-slate-600">
                      €{((cc.allocatedCost / cc.revenue) * 100).toFixed(2)}/€100
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-xs font-bold text-blue-900 mb-1">💡 Carbon Cost Accounting</p>
        <p className="text-xs text-blue-800">
          Internal carbon pricing creates financial accountability. Allocated costs can be integrated into P&L statements, 
          cost center budgets, and product pricing. CBAM costs are tracked separately as direct import costs.
        </p>
      </div>
    </div>
  );
}