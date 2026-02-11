import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie, Legend } from 'recharts';
import { Activity, Factory, Truck, Zap, Recycle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STAGE_COLORS = {
    "Raw Material Acquisition": "#86b027",
    "Production": "#6b8e23",
    "Distribution": "#546e1a",
    "Usage": "#3f5214",
    "End-of-Life": "#2a3609"
};

const STAGE_ICONS = {
    "Raw Material Acquisition": Activity,
    "Production": Factory,
    "Distribution": Truck,
    "Usage": Zap,
    "End-of-Life": Recycle
};

export default function LifecycleBreakdown({ components, systemBoundary }) {
    // Filter stages based on System Boundary
    const relevantStages = Object.keys(STAGE_COLORS).filter(stage => {
        if (systemBoundary === "Cradle-to-Gate") {
            return !["Usage", "End-of-Life"].includes(stage);
        }
        // "Cradle-to-Grave" includes all
        // "Gate-to-Gate" technically only includes Production, but usually we keep upstream in context or handle differently. 
        // For now assume default behavior is inclusive unless strictly excluded.
        return true;
    });

    // Aggregate data
    const data = components.reduce((acc, curr) => {
        const stage = curr.lifecycle_stage || "Raw Material Acquisition";
        const val = curr.co2e_kg || 0;
        acc[stage] = (acc[stage] || 0) + val;
        return acc;
    }, {});

    // Calculate total only for relevant stages to show correct % distribution within boundary
    const total = relevantStages.reduce((sum, stage) => sum + (data[stage] || 0), 0);

    const chartData = relevantStages.map(stage => ({
        name: stage,
        value: data[stage] || 0,
        percentage: total > 0 ? ((data[stage] || 0) / total) * 100 : 0,
        fill: STAGE_COLORS[stage]
    }));

    return (
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
            <div className="relative">
                <div className="p-5 border-b border-white/30 bg-white/20 backdrop-blur-sm">
                    <div className="font-light text-sm text-slate-900 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#86b027]" />
                        Lifecycle Impact
                    </div>
                    <p className="text-xs text-slate-500 font-light mt-0.5">ISO 14067 distribution</p>
                </div>
                <div className="p-5 space-y-4">
                {/* Pie Chart */}
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={2}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(value) => [`${value.toFixed(2)} kg CO₂e`, '']}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '11px', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Stage Breakdown */}
                <div className="space-y-2">
                    {chartData.map((item) => {
                        const Icon = STAGE_ICONS[item.name] || Activity;
                        return (
                            <div key={item.name} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 flex-1">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                                    <Icon className="w-3 h-3 text-slate-400" />
                                    <span className="text-slate-600 text-[10px] truncate font-light">{item.name.split(' ')[0]}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 text-[10px] font-light">{item.percentage.toFixed(0)}%</span>
                                    <span className="font-light text-slate-900 text-xs">{item.value.toFixed(2)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Total */}
                <div className="pt-3 border-t border-white/30">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-light text-slate-700">Total Emissions</span>
                        <span className="text-sm font-light text-[#86b027]">{total.toFixed(3)} kg CO₂e</span>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
}