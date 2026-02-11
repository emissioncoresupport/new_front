import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Truck, 
    Plane, 
    Ship, 
    Train, 
    TrendingUp, 
    Leaf, 
    Scale, 
    BarChart3,
    Map,
    Package,
    CheckCircle2,
    AlertTriangle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import ShipmentRouteMap from "./ShipmentRouteMap";
import UsageMeteringService from '@/components/billing/UsageMeteringService';

export default function LogisticsDashboard({ onNavigate }) {
    const { data: shipments = [] } = useQuery({
        queryKey: ['logistics-shipments'],
        queryFn: () => base44.entities.LogisticsShipment.list()
    });

    // Calculate Aggregates
    const totalShipments = shipments.length;
    const totalCO2e = shipments.reduce((acc, s) => acc + (s.total_co2e_kg || 0), 0);
    const avgCO2ePerShipment = totalShipments ? Math.round(totalCO2e / totalShipments) : 0;
    
    // Calculate tracking stats
    const inTransit = shipments.filter(s => s.tracking_status === 'In Transit').length;
    const delivered = shipments.filter(s => s.tracking_status === 'Delivered').length;
    const delayed = shipments.filter(s => s.tracking_status === 'Delayed').length;
    
    // Calculate efficiency (Mock for demo)
    const efficiencyBenchmark = 50; // g CO2e/t-km

    // Mode breakdown
    const modeStats = shipments.reduce((acc, s) => {
        const mode = s.main_transport_mode || 'Other';
        if (!acc[mode]) acc[mode] = 0;
        acc[mode] += s.total_co2e_kg || 0;
        return acc;
    }, {});

    const modeData = Object.entries(modeStats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // Mock Route Data for Top 5
    const routeData = [
        { name: 'Shanghai -> Amsterdam', co2e: 1130, mode: 'Air' },
        { name: 'Beijing -> Maastricht', co2e: 978, mode: 'Air' },
        { name: 'Shenzhen -> Liege', co2e: 630, mode: 'Air' },
        { name: 'China -> PVG', co2e: 583, mode: 'Road' },
        { name: 'Ningbo -> Rotterdam', co2e: 450, mode: 'Sea' },
    ];

    // Mock Carrier Performance
    const carrierData = [
        { name: 'DHL Express', intensity: 245 },
        { name: 'FedEx Global', intensity: 280 },
        { name: 'Maersk Line', intensity: 180 },
        { name: 'UPS Freight', intensity: 310 },
        { name: 'DB Schenker', intensity: 220 },
    ];

    return (
        <div className="space-y-6 pb-10">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

                <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-400/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="relative text-center py-6 px-5">
                        <Truck className="w-6 h-6 text-slate-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                        <p className="text-4xl font-extralight text-slate-900 mb-2">{totalShipments}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Shipments</p>
                        <p className="text-xs text-slate-400">Active Records</p>
                    </div>
                </div>

                <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="relative text-center py-6 px-5">
                        <Leaf className="w-6 h-6 text-[#86b027] mx-auto mb-3 group-hover:scale-110 transition-transform" />
                        <p className="text-4xl font-extralight text-slate-900 mb-2">{(totalCO2e / 1000).toFixed(2)}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Emissions</p>
                        <p className="text-xs text-slate-400">tCO₂e Total</p>
                    </div>
                </div>

                <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-400/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="relative text-center py-6 px-5">
                        <Scale className="w-6 h-6 text-slate-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                        <p className="text-4xl font-extralight text-slate-900 mb-2">{avgCO2ePerShipment}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Average</p>
                        <p className="text-xs text-slate-400">kg per Shipment</p>
                    </div>
                </div>

                <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="relative text-center py-6 px-5">
                        <BarChart3 className="w-6 h-6 text-amber-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                        <p className="text-4xl font-extralight text-slate-900 mb-2">{efficiencyBenchmark}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Efficiency</p>
                        <p className="text-xs text-slate-400">g CO₂e/t-km</p>
                    </div>
                </div>

                <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#02a1e8]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="relative text-center py-6 px-5">
                        <Package className="w-6 h-6 text-[#02a1e8] mx-auto mb-3 group-hover:scale-110 transition-transform" />
                        <p className="text-4xl font-extralight text-slate-900 mb-2">{inTransit}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">In Transit</p>
                        <p className="text-xs text-slate-400">{delivered} Delivered {delayed > 0 && `• ${delayed} Delayed`}</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div onClick={() => onNavigate('factors')} className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden cursor-pointer group">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="relative p-6 flex items-center gap-4">
                        <div className="p-3 bg-[#86b027]/10 rounded-xl group-hover:scale-110 transition-transform">
                            <BarChart3 className="w-6 h-6 text-[#86b027]" />
                        </div>
                        <div>
                            <h3 className="font-light text-slate-900 text-lg">Calculation Engine</h3>
                            <p className="text-xs text-slate-500 mt-1 font-light">Manage emission factors & calculation methods</p>
                        </div>
                    </div>
                </div>

                <div onClick={() => onNavigate('carriers')} className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden cursor-pointer group">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#02a1e8]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="relative p-6 flex items-center gap-4">
                        <div className="p-3 bg-[#02a1e8]/10 rounded-xl group-hover:scale-110 transition-transform">
                            <Truck className="w-6 h-6 text-[#02a1e8]" />
                        </div>
                        <div>
                            <h3 className="font-light text-slate-900 text-lg">Carrier Management</h3>
                            <p className="text-xs text-slate-500 mt-1 font-light">Configure carriers & performance tracking</p>
                        </div>
                    </div>
                </div>

                <div onClick={() => onNavigate('tms')} className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden cursor-pointer group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="relative p-6 flex items-center gap-4">
                        <div className="p-3 bg-purple-100 rounded-xl group-hover:scale-110 transition-transform">
                            <Package className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="font-light text-slate-900 text-lg">TMS Integration</h3>
                            <p className="text-xs text-slate-500 mt-1 font-light">Connect ERP & TMS systems</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Map */}
            <ShipmentRouteMap shipments={shipments} />

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Top Routes Chart */}
                <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                    <div className="relative p-6">
                        <div className="flex items-center gap-2 mb-1">
                            <Map className="w-5 h-5 text-slate-500" />
                            <h3 className="text-lg font-light text-slate-900">Top 5 Routes by CO₂e Emissions</h3>
                        </div>
                        <p className="text-sm text-slate-500 font-light mb-4">Highest emitting lanes based on current data</p>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={routeData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: '#64748b' }} />
                                    <Tooltip 
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="co2e" fill="#86b027" radius={[0, 4, 4, 0]} barSize={20}>
                                        {routeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#f43f5e' : '#86b027'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Carrier Performance Chart */}
                <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                    <div className="relative p-6">
                        <div className="flex items-center gap-2 mb-1">
                            <Truck className="w-5 h-5 text-slate-500" />
                            <h3 className="text-lg font-light text-slate-900">Carrier Performance - CO₂e Intensity</h3>
                        </div>
                        <p className="text-sm text-slate-500 font-light mb-4">Emission intensity (g CO₂e/t-km) comparison</p>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={carrierData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <Tooltip 
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="intensity" fill="#86b027" radius={[4, 4, 0, 0]} barSize={35} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}