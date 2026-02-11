/**
 * CSDDD Compliance Module
 * EU Corporate Sustainability Due Diligence Directive (CS3D) - Effective 2027-2029
 * Manages adverse impact identification, prevention, mitigation, and remediation
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    AlertTriangle, Shield, CheckCircle2, TrendingUp, 
    FileText, Target, Zap, Eye, Clock, Users
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function CSDDDComplianceModule({ supplierId }) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("impacts");

    const { data: impacts = [] } = useQuery({
        queryKey: ['adverse-impacts', supplierId],
        queryFn: () => base44.entities.SupplierAdverseImpact.filter({ supplier_id: supplierId }),
        enabled: !!supplierId
    });

    const { data: actionPlans = [] } = useQuery({
        queryKey: ['action-plans', supplierId],
        queryFn: () => base44.entities.ActionPlan.filter({ supplier_id: supplierId }),
        enabled: !!supplierId
    });

    const { data: grievances = [] } = useQuery({
        queryKey: ['grievances', supplierId],
        queryFn: () => base44.entities.GrievanceMechanism.filter({ supplier_id: supplierId }),
        enabled: !!supplierId
    });

    const criticalImpacts = impacts.filter(i => i.severity === 'critical' || i.severity === 'high');
    const activeActionPlans = actionPlans.filter(p => p.status === 'in_progress');
    const openGrievances = grievances.filter(g => g.status !== 'resolved' && g.status !== 'rejected');

    return (
        <div className="space-y-6">
            {/* CSDDD Header */}
            <div className="relative bg-gradient-to-br from-red-50/40 via-orange-50/30 to-white/30 backdrop-blur-3xl rounded-2xl border border-red-200/40 shadow-[0_8px_32px_rgba(239,68,68,0.12)] overflow-hidden p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent pointer-events-none"></div>
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/60 backdrop-blur-xl border border-red-200/60 flex items-center justify-center shadow-[0_4px_16px_rgba(239,68,68,0.15)]">
                            <Shield className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-extralight tracking-tight text-slate-900">CSDDD Due Diligence</h3>
                            <p className="text-xs text-slate-500 font-light mt-0.5">Corporate Sustainability Due Diligence Directive</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <MetricBadge 
                            label="Critical Impacts" 
                            value={criticalImpacts.length}
                            variant={criticalImpacts.length > 0 ? "danger" : "success"}
                        />
                        <MetricBadge 
                            label="Active Plans" 
                            value={activeActionPlans.length}
                            variant="info"
                        />
                        <MetricBadge 
                            label="Open Cases" 
                            value={openGrievances.length}
                            variant={openGrievances.length > 0 ? "warning" : "success"}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-white/30 backdrop-blur-md border border-white/30 rounded-xl">
                    <TabsTrigger value="impacts" className="data-[state=active]:bg-white/40">
                        <AlertTriangle className="w-4 h-4 mr-2" /> Adverse Impacts
                    </TabsTrigger>
                    <TabsTrigger value="action-plans" className="data-[state=active]:bg-white/40">
                        <Target className="w-4 h-4 mr-2" /> Action Plans
                    </TabsTrigger>
                    <TabsTrigger value="grievances" className="data-[state=active]:bg-white/40">
                        <Users className="w-4 h-4 mr-2" /> Grievances
                    </TabsTrigger>
                    <TabsTrigger value="monitoring" className="data-[state=active]:bg-white/40">
                        <Eye className="w-4 h-4 mr-2" /> Monitoring
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="impacts">
                    <ImpactsList impacts={impacts} />
                </TabsContent>

                <TabsContent value="action-plans">
                    <ActionPlansList plans={actionPlans} />
                </TabsContent>

                <TabsContent value="grievances">
                    <GrievancesList grievances={grievances} />
                </TabsContent>

                <TabsContent value="monitoring">
                    <MonitoringDashboard supplierId={supplierId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function MetricBadge({ label, value, variant = "default" }) {
    const variantStyles = {
        danger: "bg-red-100 text-red-700 border-red-200",
        warning: "bg-amber-100 text-amber-700 border-amber-200",
        info: "bg-blue-100 text-blue-700 border-blue-200",
        success: "bg-emerald-100 text-emerald-700 border-emerald-200"
    };

    return (
        <div className={cn("flex flex-col items-center px-4 py-2 rounded-lg border backdrop-blur-sm", variantStyles[variant])}>
            <span className="text-2xl font-extralight">{value}</span>
            <span className="text-[9px] uppercase tracking-widest font-light">{label}</span>
        </div>
    );
}

function ImpactsList({ impacts }) {
    if (impacts.length === 0) {
        return (
            <Card className="bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl border-white/50">
                <CardContent className="py-12 text-center">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-[#86b027]" />
                    <p className="text-slate-600 font-light">No adverse impacts identified</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {impacts.map(impact => (
                <ImpactCard key={impact.id} impact={impact} />
            ))}
        </div>
    );
}

function ImpactCard({ impact }) {
    const severityColors = {
        low: "bg-blue-100 text-blue-700 border-blue-200",
        medium: "bg-amber-100 text-amber-700 border-amber-200",
        high: "bg-orange-100 text-orange-700 border-orange-200",
        critical: "bg-red-100 text-red-700 border-red-200"
    };

    return (
        <Card className="bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl border-white/50 hover:shadow-[0_20px_60px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <Badge className={cn("font-light", severityColors[impact.severity])}>
                                {impact.severity.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="font-light">
                                {impact.actual_or_potential === 'actual' ? '⚠️ Actual' : '⏳ Potential'}
                            </Badge>
                            <Badge variant="outline" className="font-light">
                                {impact.impact_type.replace(/_/g, ' ')}
                            </Badge>
                        </div>
                        <p className="text-sm text-slate-900 font-light mb-2">{impact.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500 font-light">
                            <span>📅 {new Date(impact.discovery_date).toLocaleDateString()}</span>
                            <span>📍 {impact.value_chain_stage}</span>
                            <span>📋 {impact.discovery_source.replace(/_/g, ' ')}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <Badge className={cn(
                            "font-light",
                            impact.status === 'closed' ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200"
                        )}>
                            {impact.status.replace(/_/g, ' ')}
                        </Badge>
                        <Button size="sm" variant="ghost" className="h-7 text-xs font-light">
                            View Details
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ActionPlansList({ plans }) {
    if (plans.length === 0) {
        return (
            <Card className="bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl border-white/50">
                <CardContent className="py-12 text-center">
                    <Target className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                    <p className="text-slate-600 font-light">No action plans created yet</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {plans.map(plan => (
                <ActionPlanCard key={plan.id} plan={plan} />
            ))}
        </div>
    );
}

function ActionPlanCard({ plan }) {
    const progress = plan.actions ? 
        Math.round((plan.actions.filter(a => a.status === 'completed').length / plan.actions.length) * 100) : 0;

    return (
        <Card className="bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl border-white/50">
            <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <h4 className="text-base font-light text-slate-900 mb-1">{plan.title}</h4>
                        <p className="text-sm text-slate-600 font-light">{plan.description}</p>
                    </div>
                    <Badge className="font-light">
                        {plan.plan_type.replace(/_/g, ' ')}
                    </Badge>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-600 font-light">
                        <span>Progress: {progress}%</span>
                        <span>Due: {new Date(plan.target_completion_date).toLocaleDateString()}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden">
                        <div className="h-full bg-[#86b027] transition-all" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function GrievancesList({ grievances }) {
    if (grievances.length === 0) {
        return (
            <Card className="bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl border-white/50">
                <CardContent className="py-12 text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                    <p className="text-slate-600 font-light">No grievances reported</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {grievances.map(grievance => (
                <GrievanceCard key={grievance.id} grievance={grievance} />
            ))}
        </div>
    );
}

function GrievanceCard({ grievance }) {
    return (
        <Card className="bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl border-white/50">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline" className="font-light">
                                {grievance.case_number}
                            </Badge>
                            {grievance.anonymous && (
                                <Badge className="bg-slate-100 text-slate-700 font-light">
                                    🔒 Anonymous
                                </Badge>
                            )}
                            <Badge className="font-light">
                                {grievance.priority}
                            </Badge>
                        </div>
                        <p className="text-sm text-slate-900 font-light mb-2">{grievance.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500 font-light">
                            <span>📅 {new Date(grievance.created_date).toLocaleDateString()}</span>
                            <span>👤 {grievance.reporter_type.replace(/_/g, ' ')}</span>
                        </div>
                    </div>
                    <Badge className="font-light">
                        {grievance.status.replace(/_/g, ' ')}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}

function MonitoringDashboard({ supplierId }) {
    return (
        <div className="text-center py-12">
            <Eye className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <p className="text-slate-600 font-light">Continuous monitoring dashboard coming soon</p>
        </div>
    );
}