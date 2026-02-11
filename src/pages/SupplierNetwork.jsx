import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Search, Filter, Layers, Zap, AlertTriangle, TrendingUp } from "lucide-react";
import SupplierNetworkMap from '@/components/supplychain/SupplierNetworkMap';
import RegulatoryMonitor from '@/components/compliance/RegulatoryMonitor';
import RealTimeRiskDashboard from '@/components/supplylens/RealTimeRiskDashboard';
import IncidentTracking from '@/components/supplylens/IncidentTracking';

export default function SupplierNetwork() {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("map");
    
    const { data: suppliers = [], isLoading } = useQuery({
        queryKey: ['suppliers'],
        queryFn: () => base44.entities.Supplier.list()
    });

    const { data: components = [] } = useQuery({
        queryKey: ['product-components'],
        queryFn: () => base44.entities.ProductComponent.list()
    });

    const filteredSuppliers = suppliers.filter(s => 
        s.legal_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.country.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const riskStats = {
        critical: suppliers.filter(s => s.risk_level === 'critical').length,
        high: suppliers.filter(s => s.risk_level === 'high').length,
        medium: suppliers.filter(s => s.risk_level === 'medium').length,
        low: suppliers.filter(s => s.risk_level === 'low').length,
    };

    return (
        <div className="min-h-screen bg-transparent p-8">
            <div className="max-w-[1600px] mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                            <Globe className="w-8 h-8 text-indigo-600" />
                            Supplier Network
                        </h1>
                        <p className="text-slate-500 mt-1">Global supply chain visualization and risk monitoring</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <RegulatoryMonitor />
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                            <Layers className="w-4 h-4 mr-2" />
                            Analyze Tier-N
                        </Button>
                    </div>
                </div>

                {/* Risk Stats Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-rose-50 border-rose-100">
                        <CardContent className="p-4 flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold text-rose-600 uppercase">Critical Risk</p>
                                <p className="text-2xl font-bold text-rose-700">{riskStats.critical}</p>
                            </div>
                            <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></div>
                        </CardContent>
                    </Card>
                    <Card className="bg-amber-50 border-amber-100">
                        <CardContent className="p-4 flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold text-amber-600 uppercase">High Risk</p>
                                <p className="text-2xl font-bold text-amber-700">{riskStats.high}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-50 border-blue-100">
                        <CardContent className="p-4 flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold text-blue-600 uppercase">Medium Risk</p>
                                <p className="text-2xl font-bold text-blue-700">{riskStats.medium}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-50 border-emerald-100">
                        <CardContent className="p-4 flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold text-emerald-600 uppercase">Low Risk</p>
                                <p className="text-2xl font-bold text-emerald-700">{riskStats.low}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabbed Content */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-white border border-slate-200 p-1">
                        <TabsTrigger value="map" className="gap-2">
                            <Globe className="w-4 h-4" />
                            Network Map
                        </TabsTrigger>
                        <TabsTrigger value="risk" className="gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Risk Analysis
                        </TabsTrigger>
                        <TabsTrigger value="incidents" className="gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Incidents
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="map" className="mt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <SupplierNetworkMap suppliers={filteredSuppliers} components={components} />
                            </div>

                            <div className="space-y-6">
                                <Card className="h-full max-h-[600px] flex flex-col">
                                    <CardHeader>
                                        <CardTitle>Suppliers</CardTitle>
                                        <CardDescription>{filteredSuppliers.length} active nodes</CardDescription>
                                        <div className="relative mt-2">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                                            <Input 
                                                placeholder="Search network..." 
                                                className="pl-8"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1 overflow-auto">
                                        <div className="space-y-3">
                                            {filteredSuppliers.map(supplier => (
                                                <div key={supplier.id} className="p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-bold text-slate-700 group-hover:text-indigo-600">{supplier.legal_name}</h4>
                                                        <Badge variant="outline" className="text-[10px]">{supplier.country}</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className={`w-2 h-2 rounded-full ${
                                                            supplier.risk_level === 'critical' ? 'bg-rose-500' :
                                                            supplier.risk_level === 'high' ? 'bg-amber-500' :
                                                            supplier.risk_level === 'medium' ? 'bg-blue-500' : 'bg-emerald-500'
                                                        }`}></span>
                                                        <span className="text-xs text-slate-500 capitalize">{supplier.risk_level} Risk</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {filteredSuppliers.length === 0 && (
                                                <div className="text-center py-8 text-slate-400">
                                                    No suppliers found.
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="risk" className="mt-6">
                        <RealTimeRiskDashboard suppliers={suppliers} />
                    </TabsContent>

                    <TabsContent value="incidents" className="mt-6">
                        <IncidentTracking suppliers={suppliers} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}