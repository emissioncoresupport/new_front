import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileBarChart, Target, Users, TrendingUp, FileCheck, Globe } from "lucide-react";
import CSRDDashboard from '@/components/csrd/CSRDDashboard';
import DoubleMateriality from '@/components/csrd/DoubleMateriality';
import ESRSDataCollection from '@/components/csrd/ESRSDataCollection';
import CSRDTaskManager from '@/components/csrd/CSRDTaskManager';
import CSRDReporting from '@/components/csrd/CSRDReporting';
import StakeholderEngagement from '@/components/csrd/StakeholderEngagement';
import CSRDAssurance from '@/components/csrd/CSRDAssurance';
import CSRDAssistant from '@/components/csrd/CSRDAssistant';

export default function CSRDPage() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const initialTab = urlParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) setActiveTab(tab);
  }, [location.search]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/30 to-white p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest font-light mb-2">
            <FileBarChart className="w-3.5 h-3.5" />
            CSRD Reporting
          </div>
          <h1 className="text-4xl font-light text-slate-900 tracking-tight">CSRD Management</h1>
          <p className="text-slate-500 font-light mt-1">Corporate Sustainability Reporting Directive.</p>
        </div>
      </div>

      <div className="relative z-10">
        <div className="relative bg-white/50 backdrop-blur-sm rounded-lg border border-slate-200/60 shadow-sm overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/50 backdrop-blur-md border-b border-slate-200/60 rounded-none h-auto p-0 w-full justify-start">
            <TabsTrigger value="dashboard" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="materiality" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Materiality</span>
            </TabsTrigger>
            <TabsTrigger value="datacollection" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Data Collection</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="reporting" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Reporting</span>
            </TabsTrigger>
            <TabsTrigger value="stakeholders" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Stakeholders</span>
            </TabsTrigger>
            <TabsTrigger value="assurance" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Assurance</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-0 p-6">
            <CSRDDashboard setActiveTab={setActiveTab} />
          </TabsContent>

          <TabsContent value="materiality" className="mt-0 p-6">
            <DoubleMateriality />
          </TabsContent>

          <TabsContent value="datacollection" className="mt-0 p-6">
            <ESRSDataCollection />
          </TabsContent>

          <TabsContent value="tasks" className="mt-0 p-6">
            <CSRDTaskManager />
          </TabsContent>

          <TabsContent value="reporting" className="mt-0 p-6">
            <CSRDReporting />
          </TabsContent>

          <TabsContent value="stakeholders" className="mt-0 p-6">
            <StakeholderEngagement />
          </TabsContent>

          <TabsContent value="assurance" className="mt-0 p-6">
            <CSRDAssurance />
          </TabsContent>
        </Tabs>
        </div>
      </div>

      <CSRDAssistant />
    </div>
  );
}