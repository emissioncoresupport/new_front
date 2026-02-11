import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, LayoutDashboard, ClipboardCheck, FileText, TrendingUp, Settings, ClipboardList, Sparkles, BarChart3, Target, Badge } from "lucide-react";

import VSMEDashboard from '../components/vsme/VSMEDashboard';
import VSMEBasicModule from '../components/vsme/VSMEBasicModule';
import VSMEComprehensiveModule from '../components/vsme/VSMEComprehensiveModule';
import VSMEGapAnalysis from '../components/vsme/VSMEGapAnalysis';
import VSMEReportGenerator from '../components/vsme/VSMEReportGenerator';
import VSMESettings from '../components/vsme/VSMESettings';
import VSMEKnowledgeHub from '../components/vsme/VSMEKnowledgeHub';
import VSMETaskManager from '../components/vsme/VSMETaskManager';
import VSMECollaboratorManager from '../components/vsme/VSMECollaboratorManager';
import VSMENotificationCenter from '../components/vsme/VSMENotificationCenter';
import VSMEAIInsights from '../components/vsme/VSMEAIInsights';
import VSMEBenchmarking from '../components/vsme/VSMEBenchmarking';
import VSMEGoalsTargets from '../components/vsme/VSMEGoalsTargets';
import VSMESidebar from '../components/vsme/VSMESidebar';
import { checkAndSendReminders } from '../components/vsme/VSMEReminderSystem';

export default function VSMEPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);

  // Get current user
  React.useEffect(() => {
    base44.auth.me().then(user => setCurrentUser(user)).catch(() => {});
  }, []);

  const { data: reports = [] } = useQuery({
    queryKey: ['vsme-reports'],
    queryFn: () => base44.entities.VSMEReport.list('-created_date')
  });

  const { data: disclosures = [] } = useQuery({
    queryKey: ['vsme-disclosures'],
    queryFn: () => base44.entities.VSMEDisclosure.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['vsme-tasks'],
    queryFn: () => base44.entities.VSMETask.list('-due_date')
  });

  // Auto-check reminders on mount and every 30 minutes
  React.useEffect(() => {
    checkAndSendReminders();
    const interval = setInterval(() => {
      checkAndSendReminders();
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const currentReport = reports[0]; // Latest report
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/30 to-white p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest font-light mb-2">
            <Building2 className="w-3.5 h-3.5" />
            VSME Reporting
          </div>
          <h1 className="text-4xl font-light text-slate-900 tracking-tight">VSME Management</h1>
          <p className="text-slate-500 font-light mt-1">SME Sustainability Standard.</p>
        </div>
        {currentUser && (
          <div className="flex items-center gap-2">
            <VSMESidebar />
            <VSMENotificationCenter userEmail={currentUser.email} />
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/50 backdrop-blur-md border border-slate-200/60 p-1 h-auto shadow-sm rounded-xl inline-flex">
          <TabsTrigger value="dashboard" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="basic" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            Basic
          </TabsTrigger>
          <TabsTrigger value="comprehensive" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            Comprehensive
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            Tasks {overdueTasks > 0 && `(${overdueTasks})`}
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            AI Insights
          </TabsTrigger>
          <TabsTrigger value="benchmarking" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            Benchmarking
          </TabsTrigger>
          <TabsTrigger value="goals" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            Goals
          </TabsTrigger>
          <TabsTrigger value="gap-analysis" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            Gap Analysis
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            Reports
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <VSMEDashboard report={currentReport} disclosures={disclosures} setActiveTab={setActiveTab} />
        </TabsContent>

        <TabsContent value="basic" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <VSMEBasicModule report={currentReport} />
        </TabsContent>

        <TabsContent value="comprehensive" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <VSMEComprehensiveModule report={currentReport} />
        </TabsContent>

        <TabsContent value="gap-analysis" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <VSMEGapAnalysis report={currentReport} disclosures={disclosures} />
        </TabsContent>

        <TabsContent value="reports" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <VSMEReportGenerator reports={reports} />
        </TabsContent>

        <TabsContent value="tasks" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <VSMETaskManager report={currentReport} />
        </TabsContent>

        <TabsContent value="insights" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <VSMEAIInsights disclosures={disclosures} report={currentReport} />
        </TabsContent>

        <TabsContent value="benchmarking" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <VSMEBenchmarking disclosures={disclosures} report={currentReport} />
        </TabsContent>

        <TabsContent value="goals" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <VSMEGoalsTargets disclosures={disclosures} />
        </TabsContent>

        <TabsContent value="settings" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <VSMESettings report={currentReport} />
        </TabsContent>
      </Tabs>
    </div>
  );
}