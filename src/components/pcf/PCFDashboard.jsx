import React, { useMemo, useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend, ReferenceLine, ComposedChart, Line } from 'recharts';
import { Leaf, ShieldCheck, TrendingUp, AlertCircle, Euro, Database, CheckCircle2, Factory, Calculator, RefreshCcw } from "lucide-react";

const COLORS = ['#86b027', '#22c55e', '#eab308', '#f97316', '#ef4444'];

export default function PCFDashboard() {
    const { data: products = [] } = useQuery({
        queryKey: ['products'],
        queryFn: () => base44.entities.Product.list()
    });

    const { data: components = [] } = useQuery({
        queryKey: ['all-product-components'],
        queryFn: () => base44.entities.ProductComponent.list()
    });

    // Scenario State
    const [scenario, setScenario] = useState({
        reductionTarget: 20, // %
        carbonPrice: 85, // €/t
        sbtiTargetYear: 2030,
        sbtiBaseline: 100 // % relative to current
    });

    const metrics = useMemo(() => {
        const totalProducts = products.length;
        const completedProducts = products.filter(p => p.status === 'Completed' || p.status === 'Verified').length;
        const totalEmissions = products.reduce((sum, p) => sum + (p.total_co2e_kg || 0), 0);
        
        // Financial Impact (Dynamic based on scenario)
        const financialImpact = (totalEmissions / 1000) * scenario.carbonPrice;

        // Scenario Calculations
        const projectedEmissions = totalEmissions * (1 - scenario.reductionTarget / 100);
        const projectedFinancialImpact = (projectedEmissions / 1000) * scenario.carbonPrice;
        const potentialSavings = financialImpact - projectedFinancialImpact;

        // Data Quality Distribution (1-5)
        const dqrCounts = {1:0, 2:0, 3:0, 4:0, 5:0};
        components.forEach(c => {
            const rating = c.data_quality_rating || 3;
            dqrCounts[rating] = (dqrCounts[rating] || 0) + 1;
        });
        const dqrData = Object.entries(dqrCounts).map(([rating, count]) => ({
            name: `DQR ${rating}`,
            rating: parseInt(rating),
            value: count
        }));

        // Source Breakdown
        const primaryCount = components.filter(c => c.is_primary_data).length;
        const secondaryCount = components.length - primaryCount;
        const sourceData = [
            { name: 'Primary Data', value: primaryCount, color: '#86b027' },
            { name: 'Secondary Data', value: secondaryCount, color: '#64748b' }
        ];

        // Comparison Data
        const comparisonData = [
            { name: 'Current', emissions: totalEmissions / 1000, cost: financialImpact, fill: '#545454' },
            { name: 'Scenario', emissions: projectedEmissions / 1000, cost: projectedFinancialImpact, fill: '#86b027' }
        ];

        // Top Impact Products
        const topProducts = [...products]
            .sort((a,b) => (b.total_co2e_kg || 0) - (a.total_co2e_kg || 0))
            .slice(0, 5)
            .map(p => ({
                name: p.name,
                value: p.total_co2e_kg || 0
            }));

        return {
            totalProducts,
            completedProducts,
            totalEmissions,
            financialImpact,
            dqrData,
            sourceData,
            topProducts,
            comparisonData,
            potentialSavings,
            avgReadiness: products.reduce((sum, p) => sum + (p.audit_readiness_score || 0), 0) / (totalProducts || 1)
        };
    }, [products, components, scenario]);

    return (
        <div className="space-y-4">
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="relative text-center py-6 px-5">
                        <Factory className="w-6 h-6 text-[#86b027] mx-auto mb-3 group-hover:scale-110 transition-transform" />
                        <p className="text-4xl font-extralight text-slate-900 mb-2">{metrics.completedProducts}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Processed</p>
                        <p className="text-xs text-slate-400">of {metrics.totalProducts}</p>
                    </div>
                </div>

                <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-400/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="relative text-center py-6 px-5">
                        <Leaf className="w-6 h-6 text-slate-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                        <p className="text-4xl font-extralight text-slate-900 mb-2">{(metrics.totalEmissions / 1000).toFixed(2)}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Impact</p>
                        <p className="text-xs text-slate-400">tCO₂e</p>
                    </div>
                </div>

                <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="relative text-center py-6 px-5">
                        <Euro className="w-6 h-6 text-emerald-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                        <p className="text-4xl font-extralight text-slate-900 mb-2">€{(metrics.financialImpact / 1000).toFixed(0)}k</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Liability</p>
                        <p className="text-xs text-slate-400">@ €{scenario.carbonPrice}/t</p>
                    </div>
                </div>

                <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="relative text-center py-6 px-5">
                        <ShieldCheck className="w-6 h-6 text-amber-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                        <p className="text-4xl font-extralight text-slate-900 mb-2">{metrics.avgReadiness.toFixed(0)}%</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">Readiness</p>
                    </div>
                </div>
            </div>

            {/* Scenario Simulator Panel */}
            <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden mt-6">
                <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent pointer-events-none"></div>
                <div className="relative p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Calculator className="w-5 h-5 text-[#86b027]" />
                        <h3 className="text-xl font-light text-slate-900">Scenario Simulator</h3>
                    </div>
                    <p className="text-sm text-slate-500 font-light mb-6">Simulate reduction targets and carbon pricing impacts</p>
                    <div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <label className="text-slate-600 font-light">Reduction Target (Scope 3)</label>
                                    <span className="text-[#86b027] font-semibold">{scenario.reductionTarget}%</span>
                                </div>
                                <Slider 
                                    value={[scenario.reductionTarget]} 
                                    min={0} max={100} step={5} 
                                    onValueChange={(v) => setScenario({...scenario, reductionTarget: v[0]})}
                                    className="[&>.relative>.bg-primary]:bg-[#86b027]"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <label className="text-slate-600 font-light">Internal Carbon Price (€/t)</label>
                                    <span className="text-[#86b027] font-semibold">€{scenario.carbonPrice}</span>
                                </div>
                                <Slider 
                                    value={[scenario.carbonPrice]} 
                                    min={10} max={200} step={5} 
                                    onValueChange={(v) => setScenario({...scenario, carbonPrice: v[0]})}
                                    className="[&>.relative>.bg-primary]:bg-[#86b027]"
                                />
                            </div>
                        </div>
                        
                        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                             <div className="bg-white/40 p-4 rounded-lg border border-white/60 backdrop-blur-md">
                                 <p className="text-xs text-slate-500 uppercase tracking-widest">Projected Emissions</p>
                                 <div className="flex items-end gap-2 mt-1">
                                     <h3 className="text-2xl font-extralight text-slate-900">{(metrics.comparisonData[1].emissions).toFixed(1)} t</h3>
                                     <span className="text-xs text-emerald-600 mb-1 font-light">(-{(metrics.totalEmissions/1000 - metrics.comparisonData[1].emissions).toFixed(1)} t)</span>
                                 </div>
                                 <Progress value={100 - scenario.reductionTarget} className="h-1.5 mt-3 bg-slate-200" indicatorClassName="bg-[#86b027]" />
                             </div>
                             <div className="bg-white/40 p-4 rounded-lg border border-white/60 backdrop-blur-md">
                                 <p className="text-xs text-slate-500 uppercase tracking-widest">Financial Liability</p>
                                 <div className="flex items-end gap-2 mt-1">
                                     <h3 className="text-2xl font-extralight text-slate-900">€{metrics.comparisonData[1].cost.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
                                     <span className="text-xs text-emerald-600 mb-1 font-light">Savings: €{metrics.potentialSavings.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                 </div>
                                 <div className="flex items-center gap-1 mt-3 text-xs text-slate-600 font-light">
                                     <TrendingUp className="w-3 h-3" /> Based on €{scenario.carbonPrice}/t price
                                 </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Data Quality Chart */}
                <div className="lg:col-span-1 relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
                    <div className="relative p-6">
                        <h3 className="text-base font-light text-slate-900 flex items-center gap-2 mb-2">
                            <Database className="w-4 h-4" /> Data Quality Rating (ISO 14067)
                        </h3>
                        <p className="text-sm text-slate-500 font-light mb-4">Distribution of component data quality (1 = High, 5 = Low)</p>
                        <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metrics.dqrData}>
                                <XAxis dataKey="name" fontSize={10} />
                                <YAxis allowDecimals={false} fontSize={10} />
                                <Tooltip />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {metrics.dqrData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.rating <= 2 ? '#22c55e' : entry.rating <= 3 ? '#eab308' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Source Breakdown */}
                <div className="lg:col-span-1 relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent pointer-events-none"></div>
                    <div className="relative p-6">
                        <h3 className="text-base font-light text-slate-900 flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4" /> Data Sources
                        </h3>
                        <p className="text-sm text-slate-500 font-light mb-4">Primary vs Secondary Data</p>
                        <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={metrics.sourceData} 
                                    cx="50%" 
                                    cy="50%" 
                                    innerRadius={60} 
                                    outerRadius={80} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                >
                                    {metrics.sourceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Scenario Comparison Chart */}
                <div className="lg:col-span-1 relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#02a1e8]/5 via-transparent to-transparent pointer-events-none"></div>
                    <div className="relative p-6">
                        <h3 className="text-base font-light text-slate-900 flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4" /> Scenario Impact
                        </h3>
                        <p className="text-sm text-slate-500 font-light mb-4">Current vs Projected (tCO₂e)</p>
                        <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={metrics.comparisonData}>
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="emissions" name="Total Emissions (t)" barSize={40}>
                                    {metrics.comparisonData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                                <ReferenceLine y={metrics.comparisonData[0].emissions * 0.5} label="SBTi Target (50%)" stroke="#ef4444" strokeDasharray="3 3" />
                            </ComposedChart>
                        </ResponsiveContainer>
                        </div>
                        </div>
                        </div>
                        </div>
                        </div>
                        </div>
                        );
                        }