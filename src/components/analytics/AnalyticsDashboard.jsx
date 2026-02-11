import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldCheck, TrendingUp, MapPin } from "lucide-react";

const COLORS = ['#1e293b', '#475569', '#94a3b8', '#cbd5e1'];

export default function AnalyticsDashboard({ suppliers = [], assessments = [], cbamInstallations = [] }) {
    
    // Metric: Risk Score Distribution
    const riskDistribution = [
        { name: 'Low Risk', value: suppliers.filter(s => s.risk_level === 'low').length },
        { name: 'Medium Risk', value: suppliers.filter(s => s.risk_level === 'medium').length },
        { name: 'High Risk', value: suppliers.filter(s => s.risk_level === 'high').length },
        { name: 'Critical', value: suppliers.filter(s => s.risk_level === 'critical').length },
    ];

    // Metric: Compliance Rates
    const pfasCompliance = assessments.filter(a => a.status === 'Compliant').length;
    const pfasTotal = assessments.length || 1;
    const pfasRate = Math.round((pfasCompliance / pfasTotal) * 100);

    const cbamCompliance = cbamInstallations.filter(i => i.verification_status === 'verified').length;
    const cbamTotal = cbamInstallations.length || 1;
    const cbamRate = Math.round((cbamCompliance / cbamTotal) * 100);

    // Mock trend data (since we don't have historical snapshots in entities usually)
    const trendData = [
        { month: 'Jan', risk: 65 },
        { month: 'Feb', risk: 62 },
        { month: 'Mar', risk: 58 },
        { month: 'Apr', risk: 55 },
        { month: 'May', risk: 52 },
        { month: 'Jun', risk: 48 },
    ];

    // Common Non-Compliant Substances (from assessments)
    const substanceMap = {};
    assessments.forEach(a => {
        if (a.detected_substances) {
            a.detected_substances.forEach(s => {
                if (s.is_restricted) {
                    substanceMap[s.name] = (substanceMap[s.name] || 0) + 1;
                }
            });
        }
    });
    const topSubstances = Object.entries(substanceMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // Geo Hotspots
    const countryRisk = {};
    suppliers.forEach(s => {
        if (s.country) {
            if (!countryRisk[s.country]) countryRisk[s.country] = { count: 0, totalRisk: 0 };
            countryRisk[s.country].count += 1;
            countryRisk[s.country].totalRisk += (s.risk_score || 0);
        }
    });
    const geoData = Object.entries(countryRisk)
        .map(([country, data]) => ({ 
            country, 
            avgRisk: Math.round(data.totalRisk / data.count) 
        }))
        .sort((a, b) => b.avgRisk - a.avgRisk)
        .slice(0, 7);

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Top Metrics - White Scorecards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Avg Supplier Risk */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
                    <p className="text-xs font-light text-slate-500 uppercase tracking-wider">Avg Supplier Risk</p>
                    <div className="flex items-end justify-between mt-4">
                        <h3 className="text-4xl font-light text-slate-900">
                            {Math.round(suppliers.reduce((acc, s) => acc + (s.risk_score || 0), 0) / (suppliers.length || 1))}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-emerald-600">
                            <TrendingUp className="w-3 h-3" /> -5%
                        </div>
                    </div>
                </div>

                {/* PFAS Compliance */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
                    <p className="text-xs font-light text-slate-500 uppercase tracking-wider">PFAS Compliance</p>
                    <div className="flex items-end justify-between mt-4">
                        <h3 className="text-4xl font-light text-slate-900">{pfasRate}%</h3>
                        <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500" style={{ width: `${pfasRate}%` }} />
                        </div>
                    </div>
                </div>

                {/* CBAM Readiness */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
                    <p className="text-xs font-light text-slate-500 uppercase tracking-wider">CBAM Readiness</p>
                    <div className="flex items-end justify-between mt-4">
                        <h3 className="text-4xl font-light text-slate-900">{cbamRate}%</h3>
                        <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500" style={{ width: `${cbamRate}%` }} />
                        </div>
                    </div>
                </div>

                {/* Critical Suppliers */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
                    <p className="text-xs font-light text-slate-500 uppercase tracking-wider">Critical Suppliers</p>
                    <div className="flex items-end justify-between mt-4">
                        <h3 className="text-4xl font-light text-slate-900">
                            {suppliers.filter(s => s.risk_level === 'critical').length}
                        </h3>
                        <AlertTriangle className="w-5 h-5 text-red-500 group-hover:text-red-600 transition-colors" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Risk Trend Chart */}
                <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl border border-white/20 rounded-xl p-6 shadow-lg">
                    <h3 className="text-lg font-light text-slate-900 mb-4">Supplier Risk Trend</h3>
                    <p className="text-sm text-slate-600 font-light mb-4">Average risk score over the last 6 months</p>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#e5e7eb" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#e5e7eb" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="month" stroke="#6b7280" />
                                <YAxis stroke="#6b7280" />
                                <Tooltip />
                                <Area type="monotone" dataKey="risk" stroke="#374151" fillOpacity={1} fill="url(#colorRisk)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Compliance Distribution */}
                <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl border border-white/20 rounded-xl p-6 shadow-lg">
                    <h3 className="text-lg font-light text-slate-900 mb-4">Risk Level Distribution</h3>
                    <p className="text-sm text-slate-600 font-light mb-4">Current supplier base stratification</p>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={riskDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {riskDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Geographical Hotspots */}
                <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl border border-white/20 rounded-xl p-6 shadow-lg">
                    <h3 className="text-lg font-light text-slate-900 mb-4">Geographical Risk Hotspots</h3>
                    <p className="text-sm text-slate-600 font-light mb-4">Average risk score by country (Top 7)</p>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={geoData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                <XAxis type="number" domain={[0, 100]} stroke="#6b7280" />
                                <YAxis dataKey="country" type="category" width={100} stroke="#6b7280" />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="avgRisk" fill="#64748b" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Substances */}
                <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl border border-white/20 rounded-xl p-6 shadow-lg">
                    <h3 className="text-lg font-light text-slate-900 mb-4">Common Restricted Substances</h3>
                    <p className="text-sm text-slate-600 font-light mb-4">Most frequently detected non-compliant materials</p>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topSubstances}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="name" stroke="#6b7280" />
                                <YAxis allowDecimals={false} stroke="#6b7280" />
                                <Tooltip />
                                <Bar dataKey="count" fill="#374151" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}