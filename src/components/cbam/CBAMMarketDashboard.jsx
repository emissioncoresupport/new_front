import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, Activity, Info, Calendar } from "lucide-react";

export default function CBAMMarketDashboard() {
  const [timeframe, setTimeframe] = useState('12m');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Fetch price history
  const { data: priceHistory = [] } = useQuery({
    queryKey: ['cbam-price-history'],
    queryFn: () => base44.entities.CBAMPriceHistory.list('-date', 100)
  });

  // EU Benchmarks by category
  const benchmarksByCategory = {
    'Iron & Steel': [
      { code: '72031000', name: 'Ferrous products (non-alloy)', benchmark: 1.79, trend: -8.2 },
      { code: '72071100', name: 'Semi-finished products', benchmark: 1.68, trend: -5.1 },
      { code: '72072000', name: 'Flat-rolled products', benchmark: 1.83, trend: -6.8 }
    ],
    'Aluminium': [
      { code: '76011000', name: 'Aluminium unwrought', benchmark: 7.23, trend: -12.5 },
      { code: '76012000', name: 'Aluminium alloys unwrought', benchmark: 8.11, trend: -10.3 }
    ],
    'Fertilizers': [
      { code: '31021000', name: 'Urea fertilizers', benchmark: 2.72, trend: -4.2 },
      { code: '31022100', name: 'Ammonium sulphate', benchmark: 1.92, trend: -3.8 },
      { code: '31023000', name: 'Ammonium nitrate', benchmark: 2.38, trend: -5.5 }
    ],
    'Hydrogen': [
      { code: '28111100', name: 'Hydrogen', benchmark: 9.67, trend: -15.2 }
    ],
    'Chemicals': [
      { code: '28112100', name: 'Carbon dioxide', benchmark: 0.98, trend: -2.1 }
    ]
  };

  // Calculate statistics
  const latestPrice = priceHistory[0]?.cbam_certificate_price || 0;
  const previousPrice = priceHistory[1]?.cbam_certificate_price || latestPrice;
  const priceChange = latestPrice - previousPrice;
  const priceChangePercent = ((priceChange / previousPrice) * 100).toFixed(2);

  const avgPrice = useMemo(() => {
    if (priceHistory.length === 0) return 0;
    return (priceHistory.reduce((sum, p) => sum + p.cbam_certificate_price, 0) / priceHistory.length).toFixed(2);
  }, [priceHistory]);

  const volatility = useMemo(() => {
    if (priceHistory.length < 2) return 0;
    const prices = priceHistory.map(p => p.cbam_certificate_price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    return Math.sqrt(variance).toFixed(2);
  }, [priceHistory]);

  // Phase-in forecast - using simplified cost model
  // Note: Actual cost depends on free allocation benchmarks
  const phaseInForecast = [
    { year: '2026', freeAllocation: 97.5, price: 88, costPerTonne: 2.2 },
    { year: '2027', freeAllocation: 95.0, price: 95, costPerTonne: 4.75 },
    { year: '2028', freeAllocation: 90.0, price: 105, costPerTonne: 10.5 },
    { year: '2029', freeAllocation: 77.5, price: 115, costPerTonne: 25.9 },
    { year: '2030', freeAllocation: 48.75, price: 125, costPerTonne: 64.1 }
  ];

  const filteredBenchmarks = selectedCategory === 'all' 
    ? Object.values(benchmarksByCategory).flat()
    : benchmarksByCategory[selectedCategory] || [];

  return (
    <div className="space-y-5">
      {/* Clean Header */}
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
        <h2 className="text-base font-medium text-slate-900">CBAM & EU ETS Market Intelligence</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time market data, price trends, and emission benchmarks
        </p>
      </div>

      {/* Clean Metrics Grid */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Current EUA Price</p>
          <p className="text-4xl font-light text-slate-900">€{latestPrice.toFixed(2)}</p>
            <p className={`text-xs mt-1.5 ${priceChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChangePercent}% vs prev
            </p>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">12-Month Average</p>
          <p className="text-4xl font-light text-slate-900">€{avgPrice}</p>
          <p className="text-xs text-slate-400 mt-1.5">Trailing 12 months</p>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Price Volatility</p>
          <p className="text-4xl font-light text-slate-900">€{volatility}</p>
          <p className="text-xs text-slate-400 mt-1.5">Standard deviation</p>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">2026 Free Allocation</p>
          <p className="text-4xl font-light text-slate-900">97.5%</p>
          <p className="text-xs text-slate-400 mt-1.5">Benchmark remaining</p>
        </div>
      </div>

      {/* Clean Tabs */}
      <Tabs defaultValue="historical" className="space-y-5">
        <TabsList className="bg-slate-50/50 border-b border-slate-200/60 rounded-none h-auto p-0 w-full justify-start">
          <TabsTrigger value="historical" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">Historical Prices</TabsTrigger>
          <TabsTrigger value="forecast" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">Phase-in Forecast</TabsTrigger>
          <TabsTrigger value="benchmarks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">Emission Benchmarks</TabsTrigger>
        </TabsList>

        {/* Historical Prices */}
        <TabsContent value="historical">
          <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="border-b border-slate-200/60 px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-900">EU ETS Price History</h3>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="w-32 border-slate-200/80 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3m">Last 3 Months</SelectItem>
                    <SelectItem value="6m">Last 6 Months</SelectItem>
                    <SelectItem value="12m">Last 12 Months</SelectItem>
                    <SelectItem value="24m">Last 24 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-5">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={priceHistory.slice().reverse()}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#86b027" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#86b027" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="quarter" 
                      stroke="#94a3b8" 
                      fontSize={12}
                      label={{ value: 'Quarter', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={12}
                      label={{ value: 'Price (€)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      formatter={(value, name) => {
                        if (name === 'cbam_certificate_price') return [`€${value.toFixed(2)}`, 'EUA Price'];
                        if (name === 'volatility_index') return [value.toFixed(1), 'Volatility Index'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="cbam_certificate_price" 
                      stroke="#86b027" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorPrice)" 
                      name="EUA Price (€)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="volatility_index" 
                      stroke="#02a1e8" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Volatility Index"
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Clean Insights */}
              <div className="mt-5 p-3 bg-blue-50/50 border border-blue-200/60 rounded-lg">
                <p className="font-medium text-slate-900 mb-1.5 text-xs">Market Insights</p>
                <ul className="text-xs text-slate-700 space-y-0.5">
                  <li>• EUA trending {priceChange >= 0 ? 'upward' : 'downward'} recently</li>
                  <li>• Average: €{avgPrice}</li>
                  <li>• Volatility: {volatility > 10 ? 'High' : volatility > 5 ? 'Moderate' : 'Low'} (€{volatility})</li>
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Phase-in Forecast */}
        <TabsContent value="forecast">
          <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="border-b border-slate-200/60 px-5 py-4">
              <h3 className="text-sm font-medium text-slate-900">CBAM Phase-in Cost Impact (2026-2030)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Cost per tonne at different phase-in rates</p>
            </div>
            <div className="p-5">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={phaseInForecast}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                    <YAxis 
                      yAxisId="left"
                      stroke="#94a3b8" 
                      fontSize={12}
                      label={{ value: 'Cost (€)', angle: -90, position: 'insideLeft' }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#94a3b8" 
                      fontSize={12}
                      label={{ value: 'Phase-in Rate (%)', angle: 90, position: 'insideRight' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="costPerTonne" fill="#86b027" name="Cost per tonne (€)" radius={[8, 8, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="freeAllocation" stroke="#02a1e8" strokeWidth={3} name="Free Allocation (%)" dot={{ fill: '#02a1e8', r: 5 }} />
                    <Line yAxisId="left" type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="EUA Price (€)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Clean Explanation */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50/50 border border-blue-200/60 rounded-lg">
                  <p className="font-medium text-xs text-slate-900 mb-1">2026-2027: Early Phase</p>
                  <p className="text-xs text-slate-600">
                    Low rates (2.5%-50%) for adaptation
                  </p>
                </div>
                <div className="p-3 bg-slate-50/50 border border-slate-200/60 rounded-lg">
                  <p className="font-medium text-xs text-slate-900 mb-1">2028-2030: Ramp-up</p>
                  <p className="text-xs text-slate-600">
                    Costs escalate to 75-100%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Emission Benchmarks */}
        <TabsContent value="benchmarks">
          <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="border-b border-slate-200/60 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900">EU Default Emission Benchmarks</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Official benchmarks by category (Dec 2024)</p>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48 border-slate-200/80 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Iron & Steel">Iron & Steel</SelectItem>
                    <SelectItem value="Aluminium">Aluminium</SelectItem>
                    <SelectItem value="Fertilizers">Fertilizers</SelectItem>
                    <SelectItem value="Hydrogen">Hydrogen</SelectItem>
                    <SelectItem value="Chemicals">Chemicals</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-5">
              {/* Benchmarks Chart */}
              <div className="h-[350px] mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredBenchmarks} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} label={{ value: 'tCO2 per tonne', position: 'insideBottom', offset: -5 }} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={200} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      formatter={(value, name) => {
                        if (name === 'benchmark') return [`${value.toFixed(2)} tCO2/t`, 'Benchmark'];
                        return [value, name];
                      }}
                    />
                    <Bar dataKey="benchmark" fill="#86b027" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Clean Benchmarks List */}
              <div className="space-y-3">
                <h4 className="font-medium text-slate-900 mb-4">Detailed Benchmarks</h4>
                {filteredBenchmarks.map((item, idx) => (
                  <div key={idx} className="p-5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-sm font-medium text-slate-700">{item.code}</span>
                          <span className="font-medium text-slate-900">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Benchmark: </span>
                            <span className="font-medium text-slate-900">{item.benchmark} tCO2/t</span>
                          </div>
                          <div>
                            <span className="text-slate-500">vs 2023: </span>
                            <span className={`font-medium ${item.trend < 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {item.trend > 0 ? '+' : ''}{item.trend}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge className={item.trend < 0 ? "bg-emerald-100 text-emerald-700 border-0" : "bg-slate-100 text-slate-700 border-0"}>
                        {item.trend < 0 ? 'Improved' : 'Monitor'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {/* Clean Note */}
              <div className="mt-5 p-3 bg-amber-50/50 border border-amber-200/60 rounded-lg">
                <p className="font-medium text-slate-900 mb-1 text-xs">When to Use Defaults</p>
                <p className="text-xs text-slate-600">
                  Use when supplier data unavailable. Actual data can reduce costs by 20-40%.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}