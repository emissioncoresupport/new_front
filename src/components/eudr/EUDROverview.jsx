import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, FileText, Map as MapIcon, Users, Link as LinkIcon, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const StatCard = ({ title, value, subtitle, icon: Icon, color = "indigo" }) => (
  <Card className="border-l-4 border-l-transparent hover:border-l-slate-800 transition-all hover:shadow-md">
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        <div className={`p-2 rounded-lg bg-${color}-50 text-${color}-600`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
      </div>
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    </CardContent>
  </Card>
);

const SupplierInviteCard = () => {
    const copyLink = () => {
        const link = `${window.location.origin}/EUDRSupplierAccess`;
        navigator.clipboard.writeText(link);
        toast.success("Portal link copied to clipboard");
    };

    return (
        <Card className="bg-slate-900 text-white border-none h-full">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5" /> Supplier Onboarding
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-slate-300 text-sm">
                    Invite suppliers to the standalone EUDR Portal to upload geolocation data and compliance documents securely.
                </p>
                <div className="p-3 bg-white/10 rounded-lg flex items-center justify-between border border-white/10">
                    <code className="text-xs text-emerald-400 font-mono truncate max-w-[200px]">
                        .../EUDRSupplierAccess
                    </code>
                    <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 h-7" onClick={copyLink}>
                        <LinkIcon className="w-3 h-3 mr-1" /> Copy Link
                    </Button>
                </div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                    <Plus className="w-4 h-4 mr-2" /> Create Supplier Invite
                </Button>
            </CardContent>
        </Card>
    );
};

export default function EUDROverview() {
  const { data: ddsList = [] } = useQuery({
    queryKey: ['eudr-dds-overview'],
    queryFn: () => base44.entities.EUDRDDS.list()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['eudr-suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const stats = {
    totalDDS: ddsList.length,
    compliant: ddsList.filter(d => d.risk_decision === 'Negligible').length,
    highRisk: ddsList.filter(d => d.risk_level === 'High').length,
    suppliers: suppliers.length
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Statements" 
          value={stats.totalDDS} 
          subtitle="Due Diligence Statements" 
          icon={FileText}
          color="indigo"
        />
        <StatCard 
          title="Compliant Imports" 
          value={`${stats.totalDDS ? Math.round((stats.compliant / stats.totalDDS) * 100) : 0}%`} 
          subtitle="Negligible Risk Decision" 
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard 
          title="Active Suppliers" 
          value={stats.suppliers} 
          subtitle="Integrated via SupplyLens" 
          icon={Users}
          color="blue"
        />
        <StatCard 
          title="High Risk Alerts" 
          value={stats.highRisk} 
          subtitle="Requires Action" 
          icon={AlertTriangle}
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapIcon className="w-5 h-5 text-slate-500" />
                        Recent Activity
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                        {ddsList.slice(0, 5).map((dds) => (
                            <div key={dds.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${dds.risk_level === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {dds.risk_level === 'High' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm text-slate-900">{dds.commodity_description || dds.hs_code}</p>
                                        <p className="text-xs text-slate-500">{dds.dds_reference} • {new Date(dds.submission_date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <Badge variant="outline">{dds.risk_decision}</Badge>
                            </div>
                        ))}
                        {ddsList.length === 0 && (
                            <div className="p-8 text-center text-slate-400 text-sm">No activity yet.</div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1">
            <SupplierInviteCard />
        </div>
      </div>
    </div>
  );
}