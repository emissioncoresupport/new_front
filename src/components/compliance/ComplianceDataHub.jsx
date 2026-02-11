import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import ERPConnector from './ERPConnector';
import RegulatoryAlertsConfig from './RegulatoryAlertsConfig';
import { Database, Bell, ShieldCheck } from 'lucide-react';

export default function ComplianceDataHub() {
    return (
        <div className="max-w-5xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Data Ingestion & Alerts</h2>
                <p className="text-slate-500">Manage external data connections and regulatory monitoring preferences.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <ERPConnector />
                </div>
                
                <div className="lg:col-span-1 space-y-8">
                    <RegulatoryAlertsConfig />
                    
                    <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                                Compliance Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Data Sources</span>
                                    <span className="font-medium text-emerald-600">Healthy</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Last Sync</span>
                                    <span className="font-medium text-slate-900">2 hours ago</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Active Alerts</span>
                                    <span className="font-medium text-amber-600">3 New</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}