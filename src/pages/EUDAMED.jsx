import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Users, FileText, AlertTriangle, FlaskConical, BarChart3, Send, Shield, Bell, CheckSquare } from "lucide-react";
import EUDAMEDDashboard from '@/components/eudamed/EUDAMEDDashboard';
import EUDAMEDActorRegistry from '@/components/eudamed/ActorRegistry';
import EUDAMEDDeviceRegistry from '@/components/eudamed/DeviceRegistry';
import EUDAMEDVigilance from '@/components/eudamed/EUDAMEDVigilance';
import EUDAMEDClinicalStudies from '@/components/eudamed/EUDAMEDClinicalStudies';
import EUDAMEDReportingCenter from '@/components/eudamed/EUDAMEDReportingCenter';
import EUDAMEDAuditTrail from '@/components/eudamed/EUDAMEDAuditTrail';
import EUDAMEDNotificationCenter from '@/components/eudamed/EUDAMEDNotificationCenter';
import EUDAMEDAssistant from '@/components/eudamed/EUDAMEDAssistant';
import SupplierClassificationDashboard from '@/components/eudamed/SupplierClassificationDashboard';

import { runAutomatedSync } from '@/components/eudamed/EUDAMEDAPIIntegration';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function EUDAMEDPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Auto-check deadlines and regulatory updates
  useQuery({
    queryKey: ['eudamed-automated-sync'],
    queryFn: () => runAutomatedSync(),
    refetchInterval: 3600000, // Check every hour
    refetchOnWindowFocus: true
  });

  // Fetch unread notification count
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list(),
    refetchInterval: 30000
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/30 to-white p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest font-light mb-2">
            <Activity className="w-3.5 h-3.5" />
            EUDAMED Compliance
          </div>
          <h1 className="text-4xl font-light text-slate-900 tracking-tight">EUDAMED Management</h1>
          <p className="text-slate-500 font-light mt-1">European Database on Medical Devices (MDR/IVDR).</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/50 backdrop-blur-md border border-slate-200/60 p-1 h-auto shadow-sm rounded-xl inline-flex">
          <TabsTrigger value="dashboard" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="actors" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            <Users className="w-4 h-4" />
            Actor Registry
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            <Activity className="w-4 h-4" />
            Device Registry (UDI)
          </TabsTrigger>
          <TabsTrigger value="reporting" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            <Send className="w-4 h-4" />
            Reporting
          </TabsTrigger>
          <TabsTrigger value="vigilance" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            <AlertTriangle className="w-4 h-4" />
            Vigilance & Safety
          </TabsTrigger>
          <TabsTrigger value="clinical" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            <FlaskConical className="w-4 h-4" />
            Clinical Studies
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            <Shield className="w-4 h-4" />
            Audit Trail
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all relative">
            <Bell className="w-4 h-4" />
            Notifications
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <EUDAMEDDashboard />
        </TabsContent>

        <TabsContent value="actors" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <EUDAMEDActorRegistry />
        </TabsContent>

        <TabsContent value="devices" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <EUDAMEDDeviceRegistry />
        </TabsContent>

        <TabsContent value="reporting" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <EUDAMEDReportingCenter />
        </TabsContent>

        <TabsContent value="vigilance" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <EUDAMEDVigilance />
        </TabsContent>

        <TabsContent value="clinical" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <EUDAMEDClinicalStudies />
        </TabsContent>

        <TabsContent value="audit" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <EUDAMEDAuditTrail />
        </TabsContent>

        <TabsContent value="notifications" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <EUDAMEDNotificationCenter />
        </TabsContent>
      </Tabs>

      {/* AI Assistant - Always Available */}
      <EUDAMEDAssistant />
    </div>
  );
}