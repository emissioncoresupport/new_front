import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock, ScanLine, ArrowRight, ShieldAlert, Edit2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useState } from 'react';
import PFASEditModal from './PFASEditModal';
import RegulatoryFeed from '../compliance/RegulatoryFeed';

export default function PFASDashboard({ setActiveTab }) {
    const [selectedAssessment, setSelectedAssessment] = useState(null);

    const { data: assessments = [] } = useQuery({
        queryKey: ['pfas-compliance-assessments'],
        queryFn: () => base44.entities.PFASComplianceAssessment.list('-assessed_at')
    });

    const { data: scenarios = [] } = useQuery({
        queryKey: ['substitution-scenarios'],
        queryFn: () => base44.entities.SubstitutionScenario.list('-created_date')
    });

    const stats = {
        total: assessments.length,
        compliant: assessments.filter(a => a.status === 'compliant').length,
        nonCompliant: assessments.filter(a => a.status === 'non_compliant').length,
        suspected: assessments.filter(a => a.status === 'requires_action').length,
        pending: assessments.filter(a => a.status === 'under_review').length
    };

    const activeScenarios = scenarios.slice(0, 3);
    const potentialSavings = scenarios.reduce((acc, curr) => acc + (curr.five_year_savings || 0), 0);

    const data = [
        { name: 'Compliant', value: stats.compliant, color: '#10b981' }, // Emerald
        { name: 'Non-Compliant', value: stats.nonCompliant, color: '#ef4444' }, // Red
        { name: 'Suspected', value: stats.suspected, color: '#f59e0b' }, // Amber
        { name: 'Pending', value: stats.pending, color: '#94a3b8' }, // Slate
    ].filter(d => d.value > 0);

    return (
        <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-rose-50/80 to-white/80 backdrop-blur-sm border-rose-200/50">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-light mb-1">Non-Compliant</p>
                                <p className="text-3xl font-light text-rose-600">{stats.nonCompliant}</p>
                                <p className="text-xs text-slate-400 font-light mt-1">Action Required</p>
                            </div>
                            <ShieldAlert className="w-10 h-10 text-rose-400 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50/80 to-white/80 backdrop-blur-sm border-amber-200/50">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-light mb-1">Suspected Risk</p>
                                <p className="text-3xl font-light text-amber-600">{stats.suspected}</p>
                                <p className="text-xs text-slate-400 font-light mt-1">Needs Investigation</p>
                            </div>
                            <AlertTriangle className="w-10 h-10 text-amber-400 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-50/80 to-white/80 backdrop-blur-sm border-emerald-200/50">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-light mb-1">Compliant</p>
                                <p className="text-3xl font-light text-emerald-600">{stats.compliant}</p>
                                <p className="text-xs text-slate-400 font-light mt-1">Safe Materials</p>
                            </div>
                            <CheckCircle2 className="w-10 h-10 text-emerald-400 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-slate-50/80 to-white/80 backdrop-blur-sm border-slate-200/50">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-light mb-1">Pending Analysis</p>
                                <p className="text-3xl font-light text-slate-600">{stats.pending}</p>
                                <p className="text-xs text-slate-400 font-light mt-1">In Progress</p>
                            </div>
                            <Clock className="w-10 h-10 text-slate-400 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Financial Risk & Exposure Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent pointer-events-none"></div>
                    <div className="relative p-6">
                        <h3 className="text-lg font-light text-slate-900 mb-1">Financial Impact Analysis</h3>
                        <p className="text-sm text-slate-500 font-light mb-6">Exposure vs. Mitigation Opportunities</p>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-end mb-1">
                                    <p className="text-sm text-slate-500 font-light">Revenue at Risk (Non-Compliant)</p>
                                    <span className="text-xs text-rose-600 font-light">High Priority</span>
                                </div>
                                <h3 className="text-3xl font-extralight text-rose-600">
                                    ${(stats.nonCompliant * 125000).toLocaleString()}
                                </h3>
                                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${Math.min((stats.nonCompliant / (stats.total || 1)) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-end mb-1">
                                    <p className="text-sm text-slate-500 font-light">Identified Savings (5yr)</p>
                                    <span className="text-xs text-emerald-600 font-light">Substitution</span>
                                </div>
                                <h3 className="text-3xl font-extralight text-emerald-600">
                                    {potentialSavings.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                                </h3>
                                <p className="text-xs text-slate-500 font-light mt-1">From {scenarios.length} active scenarios</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2 relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#02a1e8]/5 via-transparent to-transparent pointer-events-none"></div>
                    <div className="relative p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-light text-slate-900">Substitution Pipeline</h3>
                                <p className="text-sm text-slate-500 font-light mt-0.5">Active material replacement projects</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setActiveTab('scenarios')} className="text-[#02a1e8] border-[#02a1e8]/20 bg-[#02a1e8]/5 hover:bg-[#02a1e8]/10">
                                View All <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                         <div className="space-y-3">
                            {activeScenarios.length > 0 ? activeScenarios.map(scenario => (
                                <div key={scenario.id} className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors rounded-xl border border-slate-100 group">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2.5 rounded-lg ${
                                            scenario.five_year_savings > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                        }`}>
                                            {scenario.five_year_savings > 0 ? <CheckCircle2 className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-700 group-hover:text-[#86b027] transition-colors">{scenario.name}</h4>
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <span>{scenario.current_material}</span>
                                                <ArrowRight className="w-3 h-3 text-slate-300" />
                                                <span className="font-medium text-slate-700">{scenario.substitute_material}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            <Badge variant="outline" className={
                                                scenario.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                scenario.status === 'Under Review' ? 'bg-[#02a1e8]/10 text-[#02a1e8] border-[#02a1e8]/20' :
                                                'bg-slate-50 text-slate-600 border-slate-200'
                                            }>
                                                {scenario.status}
                                            </Badge>
                                            {scenario.five_year_savings > 0 && (
                                                <span className="text-xs font-bold text-emerald-600">
                                                    +{scenario.five_year_savings.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} saved
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <p className="mb-2">No active substitution scenarios.</p>
                                    <Button variant="link" onClick={() => setActiveTab('scenarios')} className="text-[#86b027]">
                                        Create your first scenario
                                    </Button>
                                </div>
                                )}
                                </div>
                                </div>
                                </div>
                                </div>
            
            {/* Regulatory Feed Section */}
            <div className="grid grid-cols-1">
                <RegulatoryFeed />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Recent Assessments */}
                <div className="lg:col-span-2 relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent pointer-events-none"></div>
                    <div className="relative p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-light text-slate-900">Recent Assessments</h3>
                            <Button variant="outline" size="sm" onClick={() => setActiveTab('scanner')}>
                                <ScanLine className="w-4 h-4 mr-2" /> New Scan
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {assessments.slice(0, 5).map(assessment => (
                                <div key={assessment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${
                                            assessment.status === 'Compliant' ? 'bg-emerald-100 text-emerald-600' :
                                            assessment.status === 'Non-Compliant' ? 'bg-rose-100 text-rose-600' :
                                            assessment.status === 'Suspected' ? 'bg-amber-100 text-amber-600' :
                                            'bg-slate-200 text-slate-500'
                                        }`}>
                                            {assessment.entity_type === 'Supplier' ? <CheckCircle2 className="w-4 h-4" /> : <ScanLine className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-700">{assessment.name}</p>
                                            <p className="text-xs text-slate-500">{assessment.entity_type} • {new Date(assessment.last_checked).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge className={`
                                            ${assessment.status === 'Compliant' ? 'bg-emerald-100 text-emerald-800' :
                                              assessment.status === 'Non-Compliant' ? 'bg-rose-100 text-rose-800' :
                                              assessment.status === 'Suspected' ? 'bg-amber-100 text-amber-800' :
                                              'bg-slate-100 text-slate-800'}
                                        `}>
                                            {assessment.status}
                                        </Badge>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedAssessment(assessment)}>
                                            <Edit2 className="w-4 h-4 text-slate-400 hover:text-[#86b027]" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {assessments.length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <p>No assessments performed yet.</p>
                                    <Button variant="link" onClick={() => setActiveTab('scanner')}>Start your first scan</Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Distribution Chart */}
                <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#02a1e8]/5 via-transparent to-transparent pointer-events-none"></div>
                    <div className="relative p-6">
                        <h3 className="text-lg font-light text-slate-900 mb-6">Compliance Overview</h3>
                        <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.map((entry, index) => (
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
            </div>

            <PFASEditModal 
                assessment={selectedAssessment} 
                open={!!selectedAssessment} 
                onOpenChange={(o) => !o && setSelectedAssessment(null)} 
            />
        </div>
    );
}