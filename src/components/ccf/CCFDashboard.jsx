import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { Factory, Zap, Cloud, TrendingUp, Building2, ArrowUpRight, Download, Filter, Target, ShieldCheck, AlertTriangle, Euro, BrainCircuit, RefreshCcw, Sparkles, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CarbonFinancials from "@/components/analytics/CarbonFinancials";
import { base44 } from "@/api/base44Client";

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

export default function CCFDashboard({ year, onYearChange }) {
    const { data: entries = [] } = useQuery({
        queryKey: ['ccf-entries', year],
        queryFn: async () => {
            const ccf = await base44.entities.CCFEntry.list();
            const scope3 = await base44.entities.Scope3Entry.list();
            // Merge standard CCF entries with Scope 3 entries for dashboard
            const s3Formatted = scope3.map(s => ({
                ...s,
                scope: 'Scope 3',
                category: `Cat ${s.category_id} (Scope 3)`, // Ideally fetch cat name
                co2e_kg: s.co2e_kg
            }));
            return [...ccf, ...s3Formatted].filter(e => {
                const d = new Date(e.date || `${e.reporting_year}-01-01`);
                return d.getFullYear() === year || e.reporting_year === year;
            });
        }
    });

    // Task Stats Query
    const { data: tasks = [] } = useQuery({
        queryKey: ['ccf-dashboard-tasks'],
        queryFn: () => base44.entities.CCFTask.list()
    });

    const taskStats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'Pending').length,
        completed: tasks.filter(t => t.status === 'Submitted' || t.status === 'Approved').length,
    };

    // AI Anomaly Detection State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [anomalies, setAnomalies] = useState(null);

    const analyzeDataMutation = useMutation({
        mutationFn: async () => {
            setIsAnalyzing(true);
            try {
                // Simulate AI Analysis
                const response = await base44.integrations.Core.InvokeLLM({
                    prompt: `Analyze this carbon data for anomalies: 
                    Total Emissions: ${totalEmissions}t. 
                    Scope 1: ${scopeStats["Scope 1"]}t.
                    Scope 2: ${scopeStats["Scope 2"]}t.
                    Scope 3: ${scopeStats["Scope 3"]}t.
                    Data Quality High: ${dataQualityStats.High}, Low: ${dataQualityStats.Low}.
                    Identify 3 specific potential anomalies or improvements. Return JSON: { "issues": [{ "title": "string", "description": "string", "severity": "High|Medium" }] }`,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            issues: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        title: { type: "string" },
                                        description: { type: "string" },
                                        severity: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                });
                const result = typeof response === 'string' ? JSON.parse(response) : response;
                setAnomalies(result.issues);
                return result;
            } finally {
                setIsAnalyzing(false);
            }
        }
    });

    // Aggregations
    const totalEmissions = entries.reduce((sum, e) => sum + (e.co2e_kg || 0), 0) / 1000; // tonnes
    
    const scopeStats = {
        "Scope 1": entries.filter(e => e.scope === "Scope 1").reduce((sum, e) => sum + (e.co2e_kg || 0), 0) / 1000,
        "Scope 2": entries.filter(e => e.scope === "Scope 2").reduce((sum, e) => sum + (e.co2e_kg || 0), 0) / 1000,
        "Scope 3": entries.filter(e => e.scope === "Scope 3").reduce((sum, e) => sum + (e.co2e_kg || 0), 0) / 1000,
    };

    const dataQualityStats = {
        "High": entries.filter(e => e.data_quality_score?.includes("High")).length,
        "Medium": entries.filter(e => e.data_quality_score?.includes("Medium")).length,
        "Low": entries.filter(e => e.data_quality_score?.includes("Low") || !e.data_quality_score).length,
    };

    const scopeData = [
        { name: "Scope 1", value: scopeStats["Scope 1"], color: "#ef4444" }, 
        { name: "Scope 2", value: scopeStats["Scope 2"], color: "#eab308" }, 
        { name: "Scope 3", value: scopeStats["Scope 3"], color: "#3b82f6" }, 
    ].filter(d => d.value > 0);

    // Scope 3 Breakdown
    const s3Entries = entries.filter(e => e.scope === "Scope 3");
    const s3Breakdown = s3Entries.reduce((acc, e) => {
        const cat = e.description?.split('(')[0] || e.category || "Uncategorized"; // Fallback grouping
        acc[cat] = (acc[cat] || 0) + (e.co2e_kg || 0);
        return acc;
    }, {});
    
    const s3ChartData = Object.entries(s3Breakdown)
        .map(([name, val]) => ({ name: name.substring(0, 15) + '...', full: name, value: val / 1000 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    // Trend Data (Mocked for demo based on year)
    const trendData = [
        { year: year - 2, Scope1: scopeStats["Scope 1"] * 1.1, Scope2: scopeStats["Scope 2"] * 1.2, Scope3: scopeStats["Scope 3"] * 1.05 },
        { year: year - 1, Scope1: scopeStats["Scope 1"] * 1.05, Scope2: scopeStats["Scope 2"] * 1.1, Scope3: scopeStats["Scope 3"] * 1.02 },
        { year: year, Scope1: scopeStats["Scope 1"], Scope2: scopeStats["Scope 2"], Scope3: scopeStats["Scope 3"] },
        { year: year + 1, Scope1: scopeStats["Scope 1"] * 0.95, Scope2: scopeStats["Scope 2"] * 0.9, Scope3: scopeStats["Scope 3"] * 0.98 } // Projected
    ];

    // Hotspots Data
    const hotspots = [
        ...entries.map(e => ({ name: e.category || e.description || 'Source', value: e.co2e_kg, type: 'Emission' }))
    ].sort((a,b) => b.value - a.value).slice(0, 5);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-10">
            {/* GHG Protocol Compliance Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-900 text-white p-6 rounded-xl flex items-center justify-between shadow-xl relative overflow-hidden">
                    <div className="z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-[#86b027] text-black hover:bg-[#769c22]">GHG Protocol Compliant</Badge>
                            <Badge variant="outline" className="text-slate-300 border-slate-600">ISO 14064-1</Badge>
                        </div>
                        <h2 className="text-2xl font-bold">Corporate Carbon Footprint {year}</h2>
                        <p className="text-slate-400 text-sm mt-1">Consolidated Scope 1, 2 & 3 Inventory</p>
                    </div>
                    <div className="text-right z-10">
                        <div className="text-4xl font-bold text-[#86b027]">{totalEmissions.toFixed(1)} tCO₂e</div>
                        <div className="text-sm text-slate-400">Total Gross Emissions</div>
                    </div>
                    {/* Decorative blob */}
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#86b027] rounded-full blur-3xl opacity-10 pointer-events-none"></div>
                </div>

                {/* Financial Impact Card */}
                <CarbonFinancials emissions={totalEmissions} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* KPI Grid - Green Shadow & Animation */}
                    <Card className="border-l-4 border-l-[#545454] shadow-sm hover:shadow-[0_0_15px_rgba(134,176,39,0.3)] hover:scale-[1.02] transition-all duration-300">
                        <CardContent className="p-5">
                            <div className="flex justify-between items-center">
                                <p className="text-xs font-bold text-slate-500 uppercase">Scope 1</p>
                                <Factory className="w-4 h-4 text-[#545454]" />
                            </div>
                            <h3 className="text-2xl font-bold text-[#545454] mt-2">{scopeStats["Scope 1"].toFixed(1)} t</h3>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500">Direct</Badge>
                                <span className="text-[10px] text-slate-400 ml-auto">{(scopeStats["Scope 1"]/totalEmissions*100).toFixed(0)}% of total</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-[#545454] shadow-sm hover:shadow-[0_0_15px_rgba(134,176,39,0.3)] hover:scale-[1.02] transition-all duration-300">
                        <CardContent className="p-5">
                            <div className="flex justify-between items-center">
                                <p className="text-xs font-bold text-slate-500 uppercase">Scope 2</p>
                                <Zap className="w-4 h-4 text-[#545454]" />
                            </div>
                            <h3 className="text-2xl font-bold text-[#545454] mt-2">{scopeStats["Scope 2"].toFixed(1)} t</h3>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500">Energy</Badge>
                                <span className="text-[10px] text-slate-400 ml-auto">{(scopeStats["Scope 2"]/totalEmissions*100).toFixed(0)}% of total</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-[#545454] shadow-sm hover:shadow-[0_0_15px_rgba(134,176,39,0.3)] hover:scale-[1.02] transition-all duration-300">
                        <CardContent className="p-5">
                            <div className="flex justify-between items-center">
                                <p className="text-xs font-bold text-slate-500 uppercase">Scope 3</p>
                                <Cloud className="w-4 h-4 text-[#545454]" />
                            </div>
                            <h3 className="text-2xl font-bold text-[#545454] mt-2">{scopeStats["Scope 3"].toFixed(1)} t</h3>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500">Value Chain</Badge>
                                <span className="text-[10px] text-slate-400 ml-auto">{(scopeStats["Scope 3"]/totalEmissions*100).toFixed(0)}% of total</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-[#86b027] shadow-sm hover:shadow-[0_0_15px_rgba(134,176,39,0.3)] hover:scale-[1.02] transition-all duration-300">
                        <CardContent className="p-5">
                            <div className="flex justify-between items-center">
                                <p className="text-xs font-bold text-slate-500 uppercase">Data Quality</p>
                                <ShieldCheck className="w-4 h-4 text-[#86b027]" />
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                <div className="h-8 w-8 rounded bg-[#86b027]/10 flex items-center justify-center text-[#86b027] font-bold text-sm">
                                    {dataQualityStats.High}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-700">High Quality</p>
                                    <p className="text-[10px] text-slate-400">Entries Verified</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Pending Tasks List - Reintroduced */}
                <Card className="h-full border-l-4 border-l-[#86b027] shadow-sm hover:shadow-[0_0_15px_rgba(134,176,39,0.3)] transition-all duration-300">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between">
                            <span className="text-lg font-bold text-slate-800">Pending Tasks</span>
                            <Badge className="bg-[#86b027] text-white hover:bg-[#769c22]">{taskStats.pending}</Badge>
                        </CardTitle>
                        <CardDescription>Actions requiring your attention</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {tasks.filter(t => t.status === 'Pending').slice(0, 3).map((task, i) => (
                                <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center group hover:border-[#86b027]/30 transition-colors">
                                    <div>
                                        <p className="text-sm font-medium text-slate-700 truncate max-w-[150px]" title={task.title}>{task.title}</p>
                                        <p className="text-[10px] text-slate-400">{task.due_date || 'No due date'}</p>
                                    </div>
                                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#86b027]" />
                                </div>
                            ))}
                            {taskStats.pending === 0 && (
                                <div className="text-center py-4 text-slate-400">
                                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-xs">All caught up!</p>
                                </div>
                            )}
                            {taskStats.pending > 3 && (
                                <Button variant="ghost" size="sm" className="w-full text-xs text-[#86b027] hover:text-[#769c22]">
                                    View all {taskStats.pending} tasks
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Emissions Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle>Emission Trends & Projections</CardTitle>
                        <CardDescription>Historical data vs Projected based on current reduction initiatives</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorS1" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorS3" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey="year" />
                                <YAxis />
                                <Tooltip formatter={(value) => `${(value/1000).toFixed(1)} t`} />
                                <Legend />
                                <Area type="monotone" dataKey="Scope1" stackId="1" stroke="#ef4444" fill="url(#colorS1)" name="Scope 1" />
                                <Area type="monotone" dataKey="Scope2" stackId="1" stroke="#f97316" fill="#f97316" name="Scope 2" />
                                <Area type="monotone" dataKey="Scope3" stackId="1" stroke="#3b82f6" fill="url(#colorS3)" name="Scope 3" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Hotspots */}
                <Card>
                    <CardHeader>
                        <CardTitle>Emission Hotspots</CardTitle>
                        <CardDescription>Top 5 contributing categories/facilities</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {hotspots.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={hotspots}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 11}} />
                                    <Tooltip cursor={{fill: 'transparent'}} formatter={(value) => `${(value/1000).toFixed(2)} tCO₂e`} />
                                    <Bar dataKey="value" fill="#86b027" radius={[0, 4, 4, 0]}>
                                        {hotspots.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : index === 1 ? '#f97316' : '#86b027'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <Target className="w-10 h-10 mb-2 opacity-20" />
                                <p className="text-sm">No emission data available for this year.</p>
                                <p className="text-xs opacity-70">Add CCF entries to see hotspots.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            {/* Benchmarking & SBTi */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                     <Card>
                        <CardHeader>
                            <CardTitle>Industry Benchmark</CardTitle>
                            <CardDescription>Intensity (tCO₂e / $M Revenue) vs Sector Average</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="font-bold text-slate-700">Your Intensity</span>
                                        <span className="font-bold text-slate-700">12.4</span>
                                    </div>
                                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden relative">
                                        <div className="absolute top-0 left-0 h-full bg-emerald-500 w-[40%]"></div>
                                        {/* Marker for Industry Avg */}
                                        <div className="absolute top-0 left-[60%] h-full w-1 bg-slate-900"></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                                        <span>0</span>
                                        <span className="pl-[20%]">Industry Avg: 18.5</span>
                                        <span>30</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                                    <p className="text-sm text-emerald-800 font-medium">
                                        You are performing better than 65% of peers in the Manufacturing sector.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                     </Card>
                </div>
                
                <div>
                    <Card className="bg-slate-900 text-white border-none h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-[#86b027]" />
                                SBTi Targets
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-400">2030 Goal</span>
                                        <span className="font-bold text-[#86b027]">42% Red.</span>
                                    </div>
                                    <Progress value={35} className="h-2 bg-slate-700" indicatorClassName="bg-[#86b027]" />
                                    <p className="text-xs text-slate-500 mt-1">On track (35% achieved)</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-3 bg-white/10 rounded-lg text-center">
                                        <p className="text-xs text-slate-400">Base Year</p>
                                        <p className="font-bold">2020</p>
                                    </div>
                                    <div className="p-3 bg-white/10 rounded-lg text-center">
                                        <p className="text-xs text-slate-400">Target Year</p>
                                        <p className="font-bold">2030</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* AI Anomaly Detection */}
            <div className="grid grid-cols-1 gap-6">
                <Card className="border-l-4 border-l-[#86b027] bg-slate-50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-full shadow-sm text-[#86b027]">
                                    <BrainCircuit className="w-5 h-5" />
                                </div>
                                <h4 className="font-bold text-slate-800">AI Data Anomaly Detection</h4>
                            </div>
                            <Button 
                                size="sm" 
                                onClick={() => analyzeDataMutation.mutate()} 
                                disabled={isAnalyzing}
                                className="bg-[#86b027] hover:bg-[#769c22] text-white"
                            >
                                {isAnalyzing ? <RefreshCcw className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                Analyze Data
                            </Button>
                        </div>

                        {anomalies ? (
                            <div className="space-y-3">
                                {anomalies.map((issue, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex gap-3">
                                        <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${issue.severity === 'High' ? 'text-red-500' : 'text-amber-500'}`} />
                                        <div>
                                            <h5 className="font-bold text-sm text-slate-800">{issue.title}</h5>
                                            <p className="text-xs text-slate-600 mt-1">{issue.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white p-4 rounded-lg border border-slate-200 text-center">
                                <p className="text-sm text-slate-500">Click "Analyze Data" to scan for inconsistencies and improvement opportunities.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}