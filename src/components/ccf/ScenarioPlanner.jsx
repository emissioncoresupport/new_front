import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, LineChart, Line } from 'recharts';
import { Target, TrendingDown, Zap, Truck, Leaf, Save, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ScenarioPlanner() {
    const queryClient = useQueryClient();
    const [activeScenario, setActiveScenario] = useState(null);
    const [targetYear, setTargetYear] = useState(2030);
    const [baselineYear, setBaselineYear] = useState(2024);

    // Fetch Scenarios
    const { data: scenarios = [] } = useQuery({
        queryKey: ['ccf-scenarios'],
        queryFn: () => base44.entities.CCFScenario.list()
    });

    // Fetch Current Baseline Data
    const { data: currentEmissions = { scope1: 1200, scope2: 800, scope3: 15000 } } = useQuery({
        queryKey: ['ccf-baseline'],
        queryFn: async () => {
            const ccf = await base44.entities.CCFEntry.list();
            const s3 = await base44.entities.Scope3Entry.list();
            
            const s1 = ccf.filter(e => e.scope === 'Scope 1').reduce((a,b) => a + b.co2e_kg, 0) / 1000;
            const s2 = ccf.filter(e => e.scope === 'Scope 2').reduce((a,b) => a + b.co2e_kg, 0) / 1000;
            const s3_total = s3.reduce((a,b) => a + b.co2e_kg, 0) / 1000;
            
            return { scope1: s1 || 1200, scope2: s2 || 800, scope3: s3_total || 15000 }; // Fallbacks for demo if empty
        }
    });

    // Levers Configuration
    const defaultLevers = [
        { id: 'l1', name: 'Switch to 100% Renewable Energy (Scope 2)', scope: 'Scope 2', potential: 95, cost: 'Low', active: false },
        { id: 'l2', name: 'Electrify Fleet (Scope 1)', scope: 'Scope 1', potential: 80, cost: 'High', active: false },
        { id: 'l3', name: 'Supplier Engagement Program (Scope 3)', scope: 'Scope 3', potential: 20, cost: 'Medium', active: false },
        { id: 'l4', name: 'Logistics Optimization (Scope 3)', scope: 'Scope 3', potential: 15, cost: 'Low', active: false },
        { id: 'l5', name: 'Sustainable Materials Sourcing (Scope 3)', scope: 'Scope 3', potential: 30, cost: 'Medium', active: false },
        { id: 'l6', name: 'Reduce Business Travel (Scope 3)', scope: 'Scope 3', potential: 50, cost: 'Low', active: false },
    ];

    const [levers, setLevers] = useState(defaultLevers);

    // Calculation Logic
    const calculateProjection = () => {
        const years = [];
        const totalBaseline = currentEmissions.scope1 + currentEmissions.scope2 + currentEmissions.scope3;
        
        // Calculate reduction factors based on active levers
        let s1_red = 0;
        let s2_red = 0;
        let s3_red = 0;

        levers.filter(l => l.active).forEach(l => {
            if (l.scope === 'Scope 1') s1_red += l.potential;
            if (l.scope === 'Scope 2') s2_red += l.potential;
            if (l.scope === 'Scope 3') s3_red += l.potential; // Simplified additive logic for demo
        });

        // Cap reductions at 100%
        s1_red = Math.min(s1_red, 100) / 100;
        s2_red = Math.min(s2_red, 100) / 100;
        s3_red = Math.min(s3_red, 100) / 100;

        // Business as Usual (BAU) Growth Rate (e.g. 2% per year)
        const growthRate = 1.02;

        for (let y = baselineYear; y <= targetYear; y++) {
            const yearsPassed = y - baselineYear;
            const progress = Math.min(yearsPassed / (targetYear - baselineYear), 1); // Linear implementation ramp-up
            
            // BAU Path
            const bau_s1 = currentEmissions.scope1 * Math.pow(growthRate, yearsPassed);
            const bau_s2 = currentEmissions.scope2 * Math.pow(growthRate, yearsPassed);
            const bau_s3 = currentEmissions.scope3 * Math.pow(growthRate, yearsPassed);

            // Scenario Path
            const scen_s1 = bau_s1 * (1 - (s1_red * progress));
            const scen_s2 = bau_s2 * (1 - (s2_red * progress));
            const scen_s3 = bau_s3 * (1 - (s3_red * progress));

            years.push({
                year: y,
                BAU: Math.round(bau_s1 + bau_s2 + bau_s3),
                Target_1_5C: Math.round(totalBaseline * (1 - (0.042 * yearsPassed))), // SBTi 1.5C approx 4.2% annual reduction
                Scenario: Math.round(scen_s1 + scen_s2 + scen_s3),
                Scope1: Math.round(scen_s1),
                Scope2: Math.round(scen_s2),
                Scope3: Math.round(scen_s3)
            });
        }
        return years;
    };

    const projections = calculateProjection();
    const finalYear = projections[projections.length - 1];
    const totalReduction = ((1 - (finalYear.Scenario / finalYear.BAU)) * 100).toFixed(1);
    const sbtiStatus = finalYear.Scenario <= finalYear.Target_1_5C ? "Aligned (1.5°C)" : "Not Aligned";

    const saveMutation = useMutation({
        mutationFn: (data) => base44.entities.CCFScenario.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['ccf-scenarios']);
            toast.success("Scenario Saved");
        }
    });

    const handleSave = () => {
        saveMutation.mutate({
            name: `Scenario ${new Date().toLocaleDateString()}`,
            base_year: baselineYear,
            target_year: targetYear,
            reduction_target_percent: Number(totalReduction),
            sbti_aligned: sbtiStatus.includes("Aligned"),
            levers: levers.filter(l => l.active).map(l => ({
                scope: l.scope,
                lever_name: l.name,
                reduction_potential: l.potential,
                implementation_cost: l.cost,
                status: true
            })),
            projected_emissions: finalYear,
            notes: "Generated via Scenario Planner"
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Target className="w-6 h-6 text-[#86b027]" /> SBTi Scenario Planner
                    </h2>
                    <p className="text-slate-500">Model reduction pathways and check alignment with Science Based Targets (1.5°C).</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setLevers(defaultLevers)}>
                        <RotateCcw className="w-4 h-4 mr-2" /> Reset
                    </Button>
                    <Button onClick={handleSave} className="bg-[#86b027] hover:bg-[#769c22] text-white">
                        <Save className="w-4 h-4 mr-2" /> Save Scenario
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Controls */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg">Reduction Levers</CardTitle>
                        <CardDescription>Toggle initiatives to model impact</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {levers.map((lever, idx) => (
                            <div key={lever.id} className="flex items-center justify-between space-x-2 border-b pb-4 last:border-0 last:pb-0">
                                <div className="space-y-1 flex-1">
                                    <Label htmlFor={lever.id} className="text-sm font-medium flex items-center gap-2">
                                        {lever.name}
                                        <Badge variant="secondary" className="text-[10px] h-5">{lever.cost} Cost</Badge>
                                    </Label>
                                    <p className="text-xs text-slate-500">Reduces {lever.scope} by {lever.potential}%</p>
                                </div>
                                <Switch 
                                    id={lever.id} 
                                    checked={lever.active}
                                    onCheckedChange={(c) => {
                                        const newLevers = [...levers];
                                        newLevers[idx].active = c;
                                        setLevers(newLevers);
                                    }}
                                />
                            </div>
                        ))}
                        
                        <div className="pt-4 bg-slate-50 p-4 rounded-lg">
                            <Label>Target Year: {targetYear}</Label>
                            <Slider 
                                value={[targetYear]} 
                                min={2025} 
                                max={2050} 
                                step={1} 
                                onValueChange={(v) => setTargetYear(v[0])}
                                className="mt-2"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Visualization */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Results Banner */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card className={`${sbtiStatus.includes('Aligned') ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                            <CardContent className="p-4 text-center">
                                <p className="text-xs font-bold uppercase tracking-wider opacity-70">SBTi Status</p>
                                <div className={`text-lg font-bold flex items-center justify-center gap-2 ${sbtiStatus.includes('Aligned') ? 'text-emerald-700' : 'text-amber-700'}`}>
                                    {sbtiStatus.includes('Aligned') ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                    {sbtiStatus}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Reduction</p>
                                <div className="text-2xl font-bold text-indigo-600">-{totalReduction}%</div>
                                <p className="text-[10px] text-slate-400">vs BAU {targetYear}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Final Emissions</p>
                                <div className="text-2xl font-bold text-slate-700">{finalYear.Scenario.toLocaleString()} t</div>
                                <p className="text-[10px] text-slate-400">Target: {finalYear.Target_1_5C.toLocaleString()} t</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Trajectory Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Emission Trajectory</CardTitle>
                            <CardDescription>Business as Usual vs. Intervention Scenario vs. 1.5°C Path</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={projections} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorScenario" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#86b027" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#86b027" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="year" />
                                    <YAxis />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <Tooltip />
                                    <Legend />
                                    <Area type="monotone" dataKey="BAU" stroke="#94a3b8" fill="transparent" strokeDasharray="5 5" name="Business As Usual" />
                                    <Area type="monotone" dataKey="Scenario" stroke="#86b027" fillOpacity={1} fill="url(#colorScenario)" name="Planned Scenario" />
                                    <Area type="monotone" dataKey="Target_1_5C" stroke="#10b981" strokeWidth={2} fill="transparent" name="SBTi 1.5°C Target" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Scope Breakdown */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Projected Composition {targetYear}</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[finalYear]} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="year" hide />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="Scope1" name="Scope 1" stackId="a" fill="#ef4444" radius={[4,0,0,4]} barSize={40} />
                                    <Bar dataKey="Scope2" name="Scope 2" stackId="a" fill="#eab308" />
                                    <Bar dataKey="Scope3" name="Scope 3" stackId="a" fill="#475569" radius={[0,4,4,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}