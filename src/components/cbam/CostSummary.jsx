import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calendar, Euro, TrendingUp, RefreshCw, Info, Download, ChevronDown, ChevronUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { toast } from "sonner";

export default function CostSummary({ purchaseOrders = [] }) {
  const queryClient = useQueryClient();
  
  // Date Range State
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-12-31');
  
  // Carbon Price State (Quarterly)
  const [carbonPrices, setCarbonPrices] = useState({
    Q1: 75,
    Q2: 79,
    Q3: 84,
    Q4: 94
  });
  
  // Benchmarks (Default EU Standards)
  const [benchmarks, setBenchmarks] = useState({
    Aluminium: 1.464,
    Steel: 0.215,
    Cement: 0.766,
    Fertilizers: 0.382,
    Electricity: 0.385,
    Hydrogen: 4.137
  });
  
  const [expandedRows, setExpandedRows] = useState({});

  // Fetch Purchase Orders with Date Filter
  const { data: filteredPOs = [] } = useQuery({
    queryKey: ['cbam-purchase-orders', startDate, endDate],
    queryFn: async () => {
      const pos = await base44.entities.CBAMPurchaseOrder.list();
      return pos.filter(po => {
        if (!po.created_date) return true;
        const poDate = new Date(po.created_date);
        return poDate >= new Date(startDate) && poDate <= new Date(endDate);
      });
    }
  });

  // Fetch Emission Entries
  const { data: entries = [] } = useQuery({
    queryKey: ['cbam-emission-entries'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });

  // Calculate Cost Metrics
  const totalEmissions = useMemo(() => 
    entries.reduce((sum, e) => sum + (e.total_embedded_emissions || 0), 0) || 0,
    [entries]
  );

  const chargeableEmissions = useMemo(() => 
    entries.reduce((sum, e) => sum + (e.chargeable_emissions || e.certificates_required || 0), 0) || 0,
    [entries]
  );

  const avgCarbonPrice = useMemo(() => 
    Object.values(carbonPrices).reduce((a, b) => (a || 0) + (b || 0), 0) / 4 || 0,
    [carbonPrices]
  );

  const forecastCost = useMemo(() => 
    (chargeableEmissions || 0) * (avgCarbonPrice || 0),
    [chargeableEmissions, avgCarbonPrice]
  );

  const totalCertificates = Math.ceil(chargeableEmissions || 0);

  // Prepare Carbon Price Chart Data
  const chartData = [
    { quarter: 'Q1', price: carbonPrices.Q1 },
    { quarter: 'Q2', price: carbonPrices.Q2 },
    { quarter: 'Q3', price: carbonPrices.Q3 },
    { quarter: 'Q4', price: carbonPrices.Q4 }
  ];

  // Calculate per-line costs
  const lineItemCosts = useMemo(() => {
    return filteredPOs.map(po => {
      const month = po.created_date ? new Date(po.created_date).getMonth() : 0;
      const quarter = month < 3 ? 'Q1' : month < 6 ? 'Q2' : month < 9 ? 'Q3' : 'Q4';
      const quarterPrice = carbonPrices[quarter];
      
      const emissions = po.quantity || 0;
      // Use actual chargeable emissions from calculation, not simplified formula
      const chargeable = emissions; // Purchase orders already represent chargeable certificates
      const cost = chargeable * quarterPrice;
      
      return {
        ...po,
        quarter,
        quarterPrice,
        emissions,
        chargeableEmissions: chargeable,
        cost
      };
    });
  }, [filteredPOs, carbonPrices]);

  const resetPrices = () => {
    setCarbonPrices({ Q1: 75, Q2: 79, Q3: 84, Q4: 94 });
    toast.success('Carbon prices reset to defaults');
  };

  const resetBenchmarks = () => {
    setBenchmarks({
      Aluminium: 1.464,
      Steel: 0.215,
      Cement: 0.766,
      Fertilizers: 0.382,
      Electricity: 0.385,
      Hydrogen: 4.137
    });
    toast.success('Benchmarks reset to EU standards');
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4">
      {/* Clean Header */}
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base font-medium text-slate-900">Cost Summary</h2>
            <p className="text-xs text-slate-500 mt-0.5">Estimate certificate requirements and costs</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-8 px-3 text-xs shadow-none">
              <Info className="w-3 h-3 mr-1" />
              Help
            </Button>
            <Button variant="outline" size="sm" className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-8 px-3 text-xs shadow-none">
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Clean Parameters */}
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="border-b border-slate-200/60 px-5 py-4">
          <h3 className="text-sm font-medium text-slate-900">Calculation Parameters</h3>
        </div>
        <div className="p-5 space-y-5">
          {/* Date Range */}
          <div>
            <Label className="text-xs font-semibold text-slate-700 uppercase mb-2 block">Purchase orders made between</Label>
            <div className="flex items-center gap-3">
              <Input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="max-w-xs"
              />
              <span className="text-slate-400">and</span>
              <Input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </div>

          {/* Carbon Prices */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <Label className="text-xs font-semibold text-slate-700 uppercase">Carbon Price (€/tCO2e)</Label>
              <Button variant="ghost" size="sm" onClick={resetPrices}>
                <RefreshCw className="w-3 h-3 mr-2" />
                Reset to defaults
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Label className="w-16 text-sm">Q1</Label>
                  <Input 
                    type="number" 
                    value={carbonPrices.Q1}
                    onChange={(e) => setCarbonPrices({...carbonPrices, Q1: parseFloat(e.target.value) || 0})}
                    className="max-w-[100px]"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Label className="w-16 text-sm">Q2</Label>
                  <Input 
                    type="number" 
                    value={carbonPrices.Q2}
                    onChange={(e) => setCarbonPrices({...carbonPrices, Q2: parseFloat(e.target.value) || 0})}
                    className="max-w-[100px]"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Label className="w-16 text-sm">Q3</Label>
                  <Input 
                    type="number" 
                    value={carbonPrices.Q3}
                    onChange={(e) => setCarbonPrices({...carbonPrices, Q3: parseFloat(e.target.value) || 0})}
                    className="max-w-[100px]"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Label className="w-16 text-sm">Q4</Label>
                  <Input 
                    type="number" 
                    value={carbonPrices.Q4}
                    onChange={(e) => setCarbonPrices({...carbonPrices, Q4: parseFloat(e.target.value) || 0})}
                    className="max-w-[100px]"
                  />
                </div>
              </div>

              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="quarter" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="price" stroke="#86b027" strokeWidth={3} dot={{ r: 5, fill: '#86b027' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Benchmarks */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <Label className="text-xs font-semibold text-slate-700 uppercase">Benchmarks (tCO2e/t)</Label>
              <Button variant="ghost" size="sm" onClick={resetBenchmarks}>
                <RefreshCw className="w-3 h-3 mr-2" />
                Reset to EU standards
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(benchmarks).map(([material, value]) => (
                <div key={material} className="flex items-center gap-3">
                  <Label className="w-32 text-sm">{material}</Label>
                  <Input 
                    type="number" 
                    step="0.001"
                    value={value}
                    onChange={(e) => setBenchmarks({...benchmarks, [material]: parseFloat(e.target.value) || 0})}
                    className="max-w-[120px]"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Clean Cost Grid */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Total Emissions</p>
          <p className="text-3xl font-light text-slate-900">{totalEmissions.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">tCO2e</p>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Chargeable</p>
          <p className="text-3xl font-light text-slate-900">{chargeableEmissions.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">tCO2e</p>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Certificates</p>
          <p className="text-3xl font-light text-slate-900">{totalCertificates.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">Required</p>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Forecast Cost</p>
          <p className="text-3xl font-light text-slate-900">€{forecastCost.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          <p className="text-xs text-slate-400 mt-1">Estimated</p>
        </div>
      </div>

      {/* Clean Ledger */}
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="border-b border-slate-200/60 px-5 py-4">
          <h3 className="text-sm font-medium text-slate-900">Carbon Ledger Costs</h3>
          <p className="text-xs text-slate-500 mt-0.5">Line items expected from 2026 onwards</p>
        </div>
        <div className="p-5">
          <Tabs defaultValue="line-item">
            <TabsList className="bg-slate-50 border border-slate-200">
              <TabsTrigger value="line-item">Line Item Cost</TabsTrigger>
              <TabsTrigger value="quarterly">Quarterly Cost</TabsTrigger>
            </TabsList>

            <TabsContent value="line-item" className="mt-4">
              {lineItemCosts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product ID</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Expected Arrival</TableHead>
                      <TableHead>Supplier Name</TableHead>
                      <TableHead>Commodity Code</TableHead>
                      <TableHead className="text-right">Emissions (tCO2e)</TableHead>
                      <TableHead className="text-right">Chargeable (tCO2e)</TableHead>
                      <TableHead className="text-right">CBAM Cost (€)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItemCosts.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.order_number}</TableCell>
                        <TableCell className="text-sm">{item.created_date ? format(new Date(item.created_date), 'dd MMM yyyy') : '-'}</TableCell>
                        <TableCell className="text-sm">-</TableCell>
                        <TableCell className="text-sm">-</TableCell>
                        <TableCell className="text-sm">-</TableCell>
                        <TableCell className="text-right font-medium">{item.emissions.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-medium">{item.chargeableEmissions.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-bold">€{item.cost.toLocaleString(undefined, {maximumFractionDigits: 2})}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">No line items in selected period</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="quarterly" className="mt-4">
              <div className="space-y-2">
                {['Q1', 'Q2', 'Q3', 'Q4'].map(quarter => {
                  const quarterItems = lineItemCosts.filter(i => i.quarter === quarter);
                  const quarterCost = quarterItems.reduce((sum, i) => sum + i.cost, 0);
                  const quarterEmissions = quarterItems.reduce((sum, i) => sum + i.chargeableEmissions, 0);
                  
                  return (
                    <Card key={quarter}>
                      <CardHeader className="p-4 cursor-pointer" onClick={() => toggleRow(quarter)}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            {expandedRows[quarter] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            <div>
                              <p className="font-bold">{quarter} 2026</p>
                              <p className="text-xs text-slate-500">{quarterItems.length} orders</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-600">{quarterEmissions.toFixed(1)} tCO2e</p>
                            <p className="font-bold text-lg">€{quarterCost.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                          </div>
                        </div>
                      </CardHeader>
                      {expandedRows[quarter] && (
                        <CardContent className="p-4 pt-0">
                          <div className="space-y-2">
                            {quarterItems.map(item => (
                              <div key={item.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                <span className="text-sm font-mono">{item.order_number}</span>
                                <span className="text-sm font-bold">€{item.cost.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}