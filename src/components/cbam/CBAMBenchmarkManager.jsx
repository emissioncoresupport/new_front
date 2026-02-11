import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, TrendingDown, AlertCircle, Download, Calendar, ExternalLink } from "lucide-react";
import { 
  EU_DEFAULT_VALUES_TRANSITIONAL, 
  CBAM_2026_BENCHMARKS
} from './constants.jsx';
import { CBAM_PHASE_IN_REFERENCE } from './CBAMPhaseInReference';

export default function CBAMBenchmarkManager() {
  const [activeTab, setActiveTab] = useState('transitional');
  const [searchTerm, setSearchTerm] = useState('');

  // Convert transitional defaults to display format
  const transitionalBenchmarks = Object.entries(EU_DEFAULT_VALUES_TRANSITIONAL).map(([cn, data]) => ({
    cn_code: cn,
    product: data.description,
    benchmark: data.total,
    direct: data.direct,
    indirect: data.indirect,
    category: data.category,
    unit: 'tCO2/t'
  }));

  // Convert 2026 production route benchmarks
  const benchmarks2026 = Object.entries(CBAM_2026_BENCHMARKS).map(([key, data]) => ({
    key,
    cn_code: data.cn,
    product: data.product,
    route: data.route,
    benchmark: data.value,
    unit: 'tCO2/t'
  }));

  const filteredTransitional = transitionalBenchmarks.filter(b => 
    b.cn_code.includes(searchTerm) || 
    b.product.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filtered2026 = benchmarks2026.filter(b => 
    b.cn_code.includes(searchTerm) || 
    b.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.route.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Clean Header */}
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-base font-medium text-slate-900">CBAM Benchmarks & Default Values</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Official EU values - Last updated December 10, 2025
            </p>
          </div>
          <Button variant="outline" asChild className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-9 px-3 text-sm shadow-none">
            <a href="https://eur-lex.europa.eu/eli/reg/2025/2083/oj/eng" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5 mr-2" />
              Regulation
            </a>
          </Button>
        </div>
      </div>

      {/* Clean Notice */}
      <div className="bg-blue-50/50 border border-blue-200/60 rounded-lg p-3">
        <div className="text-xs text-slate-700">
          <p className="font-medium mb-1.5">Regulation 2025/2083 - December 10, 2025</p>
          <ul className="space-y-0.5 text-xs text-slate-600">
            <li>• Production route-specific benchmarks (steel BF-BOF: 1.370, DRI-EAF: 0.481)</li>
            <li>• Country-specific defaults with mark-ups: 10% (2026), 20% (2027), 30% (2028+)</li>
            <li>• 50-tonne de minimis threshold</li>
          </ul>
        </div>
      </div>

      {/* Clean Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Transitional</p>
          <p className="text-3xl font-light text-slate-900">{transitionalBenchmarks.length}</p>
          <p className="text-xs text-slate-400 mt-1.5">Until Dec 31, 2025</p>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">2026+ Benchmarks</p>
          <p className="text-3xl font-light text-slate-900">{benchmarks2026.length}</p>
          <p className="text-xs text-slate-400 mt-1.5">Production routes</p>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Penalty 2026</p>
          <p className="text-3xl font-light text-amber-600">+10%</p>
          <p className="text-xs text-slate-400 mt-1.5">Mark-up</p>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Last Updated</p>
          <p className="text-2xl font-light text-slate-900">Dec 10, 2025</p>
          <p className="text-xs text-slate-400 mt-1.5">Final regulation</p>
        </div>
      </div>

      {/* Search */}
      <div>
        <Input
          placeholder="Search by CN code or product name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md border-slate-200/80 h-9 text-sm"
        />
      </div>

      {/* Clean Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-50/50 border-b border-slate-200/60 rounded-none h-auto p-0 w-full justify-start">
          <TabsTrigger value="transitional" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">Transitional (2023-2025)</TabsTrigger>
          <TabsTrigger value="definitive" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">2026+ Benchmarks</TabsTrigger>
          <TabsTrigger value="phase-in" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">Phase-in Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="transitional" className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="border-b border-slate-200/60 px-5 py-4">
              <h3 className="text-sm font-medium text-slate-900">Default Emission Values - Transitional Period</h3>
              <p className="text-xs text-slate-500 mt-0.5">Valid for Oct 2023 - Dec 31, 2025</p>
            </div>
            <div className="p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b-2 border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">CN Code</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Product</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Category</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Direct</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Indirect</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransitional.map((benchmark, idx) => (
                      <tr key={idx} className="hover:bg-[#86b027]/5 transition-colors">
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className="font-mono text-xs">{benchmark.cn_code}</Badge>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{benchmark.product}</td>
                        <td className="px-4 py-2.5 text-slate-600 text-xs">{benchmark.category}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{benchmark.direct?.toFixed(3) || '0.000'}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{benchmark.indirect?.toFixed(3) || '0.000'}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="font-bold text-[#86b027]">{benchmark.benchmark?.toFixed(3) || '0.000'}</span>
                          <span className="text-xs text-slate-400 ml-1">tCO2/t</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="definitive" className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="border-b border-slate-200/60 px-5 py-4">
              <h3 className="text-sm font-medium text-slate-900">Production Route-Specific Benchmarks (2026+)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Final values approved Dec 10, 2025</p>
            </div>
            <div className="p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b-2 border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">CN Code</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Product</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Production Route</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Benchmark (tCO2/t)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered2026.map((benchmark, idx) => (
                      <tr key={idx} className="hover:bg-[#86b027]/5 transition-colors">
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className="font-mono text-xs">{benchmark.cn_code}</Badge>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{benchmark.product}</td>
                        <td className="px-4 py-2.5">
                          <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">
                            {benchmark.route}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="font-bold text-[#86b027] text-base">{benchmark.benchmark?.toFixed(3) || '0.000'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="phase-in" className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="border-b border-slate-200/60 px-5 py-4">
              <h3 className="text-sm font-medium text-slate-900">CBAM Phase-in Schedule (2026-2034)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Certificate obligation rates and penalties</p>
            </div>
            <div className="p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b-2 border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Year</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Phase Description</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Chargeable %</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Free Allocation Remaining</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Default Penalty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(CBAM_PHASE_IN_REFERENCE).map(([year, data]) => (
                      <tr key={year} className="hover:bg-[#86b027]/5 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900 text-base">{year}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{data.description}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-[#86b027] text-base">{(data.certificates_chargeable * 100).toFixed(1)}%</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-slate-700">{(data.free_allocation_remaining * 100).toFixed(1)}%</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-amber-600">+{(data.default_markup * 100)}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Clean Note */}
      <div className="bg-amber-50/50 border border-amber-200/60 rounded-lg p-3">
        <p className="font-medium text-slate-900 mb-1 text-xs">When to Use Defaults</p>
        <p className="text-xs text-slate-600">
          Only use when actual producer data unavailable. Supplier data typically reduces costs.
        </p>
      </div>
    </div>
  );
}