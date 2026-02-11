import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf, Truck, ShieldCheck, LayoutDashboard, FileText, Users, Satellite, Send, GitBranch, FileSpreadsheet, Zap, Shield } from "lucide-react";
import EUDRDashboard from '../components/eudr/EUDRDashboard';
import EUDRImporterPortal from '../components/eudr/EUDRImporterPortal';
import EUDRAuditVault from '../components/eudr/EUDRAuditVault';
import EUDRTracesDashboard from '../components/eudr/EUDRTracesDashboard';
import EUDRTraceabilityDashboard from '../components/eudr/EUDRTraceabilityDashboard';
import EUDRReportGenerator from '../components/eudr/EUDRReportGenerator';
import EUDRAPIIntegration from '../components/eudr/EUDRAPIIntegration';
import EUDRRealTimeAlertMonitor from '../components/eudr/EUDRRealTimeAlertMonitor';
import { Button } from "@/components/ui/button";

export default function EUDRPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header - Tesla Minimalistic */}
      <div className="border-b border-slate-200 bg-white/60 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-8 py-6">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-white/40 backdrop-blur-xl border border-white/60 flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
              <Leaf className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h1 className="text-3xl font-light tracking-tight text-slate-900">EUDR Compliance</h1>
              <p className="text-sm text-slate-600 font-light mt-1">Deforestation Regulation • Enforcement: Dec 30, 2026</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="importer" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              DDS Manager
            </TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              Audit Vault
            </TabsTrigger>
            <TabsTrigger value="traces" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              TRACES
            </TabsTrigger>
            <TabsTrigger value="traceability" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              Traceability
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              Reports
            </TabsTrigger>
            <TabsTrigger value="api" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              API
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              Monitoring
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
              <EUDRDashboard onNavigate={setActiveTab} />
          </TabsContent>

          <TabsContent value="importer" className="space-y-6">
              <EUDRImporterPortal />
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
              <EUDRAuditVault />
          </TabsContent>

          <TabsContent value="traces" className="space-y-6">
              <EUDRTracesDashboard />
          </TabsContent>

          <TabsContent value="traceability" className="space-y-6">
              <EUDRTraceabilityDashboard />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
              <EUDRReportGenerator />
          </TabsContent>

          <TabsContent value="api" className="space-y-6">
              <EUDRAPIIntegration />
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
              <EUDRRealTimeAlertMonitor />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}