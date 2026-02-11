import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, Filter, Download, Calendar, BarChart3, DollarSign, TrendingUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import CarbonCostAllocation from '@/components/analytics/CarbonCostAllocation';
import BusinessCaseGenerator from '@/components/analytics/BusinessCaseGenerator';
import XBRLExporter from '@/components/reporting/XBRLExporter';

export default function AnalyticsPage() {
    const [activeTab, setActiveTab] = useState('dashboard');
    
    // Fetch Data.
    const { data: suppliers = [], isLoading: sLoading } = useQuery({
        queryKey: ['suppliers'],
        queryFn: () => base44.entities.Supplier.list()
    });

    const { data: assessments = [], isLoading: aLoading } = useQuery({
        queryKey: ['pfas-assessments'],
        queryFn: () => base44.entities.PFASComplianceAssessment.list()
    });

    const { data: cbamInstallations = [], isLoading: cLoading } = useQuery({
        queryKey: ['cbam-installations'],
        queryFn: () => base44.entities.CBAMInstallation.list()
    });

    if (sLoading || aLoading || cLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/30 to-white p-6 md:p-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest font-light mb-2">
                        <BarChart3 className="w-3.5 h-3.5" />
                        Compliance Analytics
                    </div>
                    <h1 className="text-4xl font-extralight text-slate-900 tracking-tight">Analytics & Insights</h1>
                    <p className="text-slate-500 font-light mt-1">Supply chain intelligence and business case analysis.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select defaultValue="all">
                        <SelectTrigger className="w-[140px] bg-white/40 backdrop-blur-md border-slate-200/60 h-9 text-sm font-light">
                            <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Last 12 Months</SelectItem>
                            <SelectItem value="q1">Q1 2025</SelectItem>
                            <SelectItem value="q2">Q2 2025</SelectItem>
                            <SelectItem value="ytd">Year to Date</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" className="bg-white/40 backdrop-blur-md border-slate-200/60 hover:bg-white/60 hover:border-slate-300 transition-all h-9 text-sm font-light text-slate-700">
                        <Filter className="w-4 h-4 mr-2" /> Filter
                    </Button>
                    <Button variant="outline" className="bg-white/40 backdrop-blur-md border-slate-200/60 hover:bg-white/60 hover:border-slate-300 transition-all h-9 text-sm font-light text-slate-700">
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-white/40 backdrop-blur-xl border border-slate-200/60 p-1 h-auto shadow-sm rounded-xl inline-flex">
                    <TabsTrigger value="dashboard" className="gap-2 px-5 py-2.5 text-sm font-light text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
                        <BarChart3 className="w-4 h-4" />
                        Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="carbon-costs" className="gap-2 px-5 py-2.5 text-sm font-light text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
                        <DollarSign className="w-4 h-4" />
                        Carbon Costs
                    </TabsTrigger>
                    <TabsTrigger value="business-case" className="gap-2 px-5 py-2.5 text-sm font-light text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
                        <TrendingUp className="w-4 h-4" />
                        Business Cases
                    </TabsTrigger>
                    <TabsTrigger value="xbrl" className="gap-2 px-5 py-2.5 text-sm font-light text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
                        <FileText className="w-4 h-4" />
                        XBRL Export
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <AnalyticsDashboard 
                        suppliers={suppliers} 
                        assessments={assessments}
                        cbamInstallations={cbamInstallations}
                    />
                </TabsContent>
                
                <TabsContent value="carbon-costs" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <CarbonCostAllocation />
                </TabsContent>

                <TabsContent value="business-case" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <BusinessCaseGenerator />
                </TabsContent>

                <TabsContent value="xbrl" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <XBRLExporter />
                </TabsContent>
            </Tabs>
        </div>
    );
}