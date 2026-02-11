import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sparkles, Save, RotateCcw, TrendingDown } from "lucide-react";
import { toast } from "sonner";

export default function ProductScenarioModeler({ product, components }) {
    const queryClient = useQueryClient();
    const [scenarios, setScenarios] = useState([]);
    const [activeScenario, setActiveScenario] = useState({
        name: "New Scenario",
        transport_reduction: 0, // %
        material_efficiency: 0, // %
        energy_mix: "Current", // Current, Renewable, Mixed
        eol_strategy: "Landfill" // Landfill, Recycling, Incineration
    });

    const baselineImpact = components.reduce((sum, c) => sum + (c.co2e_kg || 0), 0);

    // Calculate Scenario Impact on the fly
    const calculateScenarioImpact = () => {
        let impact = 0;
        components.forEach(c => {
            let itemImpact = c.co2e_kg || 0;
            
            // Apply Transport Reduction
            if (c.node_type === 'Transport' || c.lifecycle_stage === 'Distribution') {
                itemImpact = itemImpact * (1 - (activeScenario.transport_reduction / 100));
            }

            // Apply Material Efficiency (Reduced Quantity/Waste)
            if (c.node_type === 'Component' || c.lifecycle_stage === 'Raw Material Acquisition') {
                itemImpact = itemImpact * (1 - (activeScenario.material_efficiency / 100));
            }

            // Apply Energy Mix (Mock logic: reduce Production emission by 40% if Renewable)
            if ((c.node_type === 'Energy' || c.lifecycle_stage === 'Production') && activeScenario.energy_mix === 'Renewable') {
                itemImpact = itemImpact * 0.6; 
            }

            impact += itemImpact;
        });

        // Add EoL Impact (Simulated)
        // If Recycling, we assume a credit or reduction in total impact (e.g. -10% of total) or just lower EoL burden
        if (activeScenario.eol_strategy === 'Recycling') {
            impact = impact * 0.9; // 10% credit
        } else if (activeScenario.eol_strategy === 'Incineration') {
            impact = impact * 0.95; // 5% credit (energy recovery)
        }
        // Landfill is baseline (no credit)

        return impact;
    };

    const scenarioImpact = calculateScenarioImpact();
    const reduction = baselineImpact > 0 ? ((baselineImpact - scenarioImpact) / baselineImpact) * 100 : 0;

    const chartData = [
        { name: 'Baseline', impact: baselineImpact },
        { name: 'Scenario', impact: scenarioImpact },
    ];

    const saveScenarioMutation = useMutation({
        mutationFn: async () => {
            await base44.entities.ProductScenario.create({
                product_id: product.id,
                name: activeScenario.name,
                description: `Transport: -${activeScenario.transport_reduction}%, Material: -${activeScenario.material_efficiency}%, Energy: ${activeScenario.energy_mix}, EoL: ${activeScenario.eol_strategy}`,
                parameters: JSON.stringify(activeScenario),
                result_co2e: scenarioImpact,
                reduction_potential: reduction,
                status: 'Active'
            });
        },
        onSuccess: () => {
            toast.success("Scenario Saved");
        }
    });

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
            {/* Controls */}
            <div className="md:col-span-1 space-y-6">
                <div className="h-full relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-xl border border-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
                    <div className="relative">
                        <div className="p-5 border-b border-white/30 bg-white/10 backdrop-blur-sm">
                            <h3 className="text-base font-extralight tracking-tight text-slate-900">Scenario Parameters</h3>
                            <p className="text-xs text-slate-500 font-light mt-0.5">Adjust levers to see impact</p>
                        </div>
                    <div className="p-6 space-y-6">
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <label className="text-sm font-light text-slate-900">Logistics Optimization</label>
                                <span className="text-xs text-[#86b027] font-light">-{activeScenario.transport_reduction}%</span>
                            </div>
                            <Slider 
                                value={[activeScenario.transport_reduction]} 
                                max={50} 
                                step={5} 
                                onValueChange={(v) => setActiveScenario({...activeScenario, transport_reduction: v[0]})} 
                                className="py-2"
                            />
                            <p className="text-xs text-slate-500 font-light">Reduce distance or switch modes</p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <label className="text-sm font-light text-slate-900">Material Efficiency</label>
                                <span className="text-xs text-[#86b027] font-light">-{activeScenario.material_efficiency}%</span>
                            </div>
                            <Slider 
                                value={[activeScenario.material_efficiency]} 
                                max={30} 
                                step={1} 
                                onValueChange={(v) => setActiveScenario({...activeScenario, material_efficiency: v[0]})} 
                                className="py-2"
                            />
                            <p className="text-xs text-slate-500 font-light">Reduce waste or weight</p>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-light text-slate-900">Energy Source (Production)</label>
                            <Select value={activeScenario.energy_mix} onValueChange={(v) => setActiveScenario({...activeScenario, energy_mix: v})}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Current">Current Grid Mix</SelectItem>
                                    <SelectItem value="Renewable">100% Renewable</SelectItem>
                                    <SelectItem value="Mixed">Hybrid (50/50)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-light text-slate-900">End-of-Life Strategy</label>
                            <Select value={activeScenario.eol_strategy} onValueChange={(v) => setActiveScenario({...activeScenario, eol_strategy: v})}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Landfill">Landfill (Baseline)</SelectItem>
                                    <SelectItem value="Recycling">Recycling (Circular)</SelectItem>
                                    <SelectItem value="Incineration">Incineration (Energy Recovery)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500 font-light">Circular economy strategy impact</p>
                        </div>

                        <div className="pt-4 border-t border-white/30 flex gap-2">
                            <Button className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 transition-all font-light" onClick={() => saveScenarioMutation.mutate()}>
                                <Save className="w-4 h-4 mr-2" /> Save Scenario
                            </Button>
                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/20 backdrop-blur-sm" onClick={() => setActiveScenario({name: "New Scenario", transport_reduction: 0, material_efficiency: 0, energy_mix: "Current", eol_strategy: "Landfill"})}>
                                <RotateCcw className="w-4 h-4 text-slate-600" />
                            </Button>
                        </div>
                    </div>
                    </div>
                </div>
            </div>

            {/* Visuals */}
            <div className="md:col-span-2 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-xl border border-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
                        <div className="relative p-5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-light mb-2">Projected Impact</p>
                                <p className="text-3xl font-extralight text-slate-900">{scenarioImpact.toFixed(2)} <span className="text-sm font-light text-slate-500">kg CO₂e</span></p>
                            </div>
                            <div className="h-10 w-10 bg-white/40 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/60 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                                <Sparkles className="w-5 h-5 text-[#86b027]" />
                            </div>
                        </div>
                    </div>
                    <div className="relative bg-gradient-to-br from-[#86b027]/10 via-[#86b027]/5 to-white/30 backdrop-blur-3xl rounded-xl border border-[#86b027]/30 shadow-[0_4px_16px_rgba(134,176,39,0.12)] overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent pointer-events-none"></div>
                        <div className="relative p-5 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-[#86b027] uppercase tracking-widest font-light mb-2">Potential Reduction</p>
                                <p className="text-3xl font-extralight text-slate-900">-{reduction.toFixed(1)}%</p>
                            </div>
                            <div className="h-10 w-10 bg-white/40 backdrop-blur-xl rounded-full flex items-center justify-center border border-[#86b027]/30 shadow-[0_4px_16px_rgba(134,176,39,0.12)]">
                                <TrendingDown className="w-5 h-5 text-[#86b027]" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-xl border border-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden h-[300px]">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
                    <div className="relative">
                        <div className="p-4 border-b border-white/30 bg-white/10 backdrop-blur-sm">
                            <h4 className="text-sm font-light text-slate-900">Impact Comparison</h4>
                        </div>
                        <div className="h-[250px] p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148, 163, 184, 0.2)" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12, fontWeight: 300, fill: '#64748b'}} />
                                    <Tooltip 
                                        formatter={(val) => `${val.toFixed(2)} kg CO₂e`} 
                                        cursor={{fill: 'rgba(134, 176, 39, 0.05)'}}
                                        contentStyle={{ 
                                            background: 'rgba(255, 255, 255, 0.95)', 
                                            backdropFilter: 'blur(12px)',
                                            border: '1px solid rgba(255, 255, 255, 0.5)',
                                            borderRadius: '12px',
                                            fontWeight: 300
                                        }}
                                    />
                                    <Bar dataKey="impact" barSize={40} radius={[0, 8, 8, 0]}>
                                        {chartData.map((entry, index) => (
                                            <cell key={`cell-${index}`} fill={index === 0 ? '#94a3b8' : '#86b027'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}