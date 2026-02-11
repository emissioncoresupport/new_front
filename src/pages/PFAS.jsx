import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, ScanLine, Search, AlertTriangle, FileText, Sparkles, BookOpen, Scale, Database, FlaskConical } from "lucide-react";
import PFASDashboard from '@/components/pfas/PFASDashboard';
import PFASUnifiedScanner from '@/components/pfas/PFASUnifiedScanner';
import PFASSubstanceCheck from '@/components/pfas/PFASSubstanceCheck';
import MaterialSubstitutionAdvisor from '@/components/pfas/MaterialSubstitutionAdvisor';
import PFASKnowledgeHub from './PFASKnowledgeHub';
import PFASScenarioBuilder from '@/components/pfas/PFASScenarioBuilder';
import ComplianceDataHub from '@/components/compliance/ComplianceDataHub';
import EvidenceVault from '@/components/logistics/EvidenceVault';
import PFASSupplyLensIntegration from '@/components/pfas/PFASSupplyLensIntegration';
import PFASBlockchainAuditTrail from '@/components/pfas/PFASBlockchainAuditTrail';
import PFASEvidenceReviewWorkflow from '@/components/pfas/PFASEvidenceReviewWorkflow';

import PFASLabAPIConfiguration from '@/components/pfas/PFASLabAPIConfiguration';
import PFASLabResultsInbox from '@/components/pfas/PFASLabResultsInbox';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ShieldCheck, Shield, Package, CheckSquare } from "lucide-react";

export default function PFASPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || 'dashboard';
  const initialType = urlParams.get('type');
  const initialId = urlParams.get('id');

  const [activeTab, setActiveTab] = useState(initialTab);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  // Fetch Data for Supplier/Evidence tabs
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['onboarding-tasks'],
    queryFn: () => base44.entities.OnboardingTask.list()
  });

  // Filter for PFAS-related tasks
  const pfasTasks = tasks.filter(t => 
    t.questionnaire_type === 'pfas' || 
    t.title?.toLowerCase().includes('pfas') ||
    t.description?.toLowerCase().includes('pfas')
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/30 to-white p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest font-light mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            PFAS Compliance
          </div>
          <h1 className="text-4xl font-light text-slate-900 tracking-tight">PFAS Management</h1>
          <p className="text-slate-500 font-light mt-1">Monitor PFAS risks and plan material substitutions.</p>
        </div>
      </div>

      <div className="relative z-10">
        <div className="relative bg-white/50 backdrop-blur-sm rounded-lg border border-slate-200/60 shadow-sm overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/50 backdrop-blur-md border-b border-slate-200/60 rounded-none h-auto p-0 w-full justify-start">
            <TabsTrigger 
              value="dashboard"
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
            >
              <span className="relative z-10">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger 
              value="scanner"
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
            >
              <span className="relative z-10">Scanner</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analysis"
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
            >
              <span className="relative z-10">Substitution</span>
            </TabsTrigger>
            <TabsTrigger 
              value="scenarios"
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
            >
              <span className="relative z-10">Scenarios</span>
            </TabsTrigger>
            <TabsTrigger 
              value="requests"
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
            >
              <span className="relative z-10">Data Collection</span>
            </TabsTrigger>
            <TabsTrigger 
              value="evidence-review"
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
            >
              <span className="relative z-10">Evidence</span>
            </TabsTrigger>
            <TabsTrigger 
              value="data"
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
            >
              <span className="relative z-10">Data Sources</span>
            </TabsTrigger>
            <TabsTrigger 
              value="integrations"
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
            >
              <span className="relative z-10">Integrations</span>
            </TabsTrigger>
            <TabsTrigger 
              value="audit"
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
            >
              <span className="relative z-10">Blockchain</span>
            </TabsTrigger>

            <TabsTrigger 
              value="lab-integration"
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
            >
              <span className="relative z-10">Lab</span>
            </TabsTrigger>
            </TabsList>

          <TabsContent value="dashboard" className="mt-0 p-6">
            <PFASDashboard setActiveTab={setActiveTab} />
          </TabsContent>
          
          <TabsContent value="scanner" className="mt-0 p-6">
            <PFASUnifiedScanner />
          </TabsContent>

          <TabsContent value="analysis" className="mt-0 p-6">
            <div className="grid grid-cols-1 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-[#86b027]/10 rounded-lg">
                    <Search className="w-6 h-6 text-[#86b027]" />
                  </div>
                  <h2 className="text-xl font-bold text-[#545454]">Substance AI Check</h2>
                </div>
                <PFASSubstanceCheck />
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-[#02a1e8]/10 rounded-lg">
                    <Sparkles className="w-6 h-6 text-[#02a1e8]" />
                  </div>
                  <h2 className="text-xl font-bold text-[#545454]">Material Substitution Advisor</h2>
                </div>
                <MaterialSubstitutionAdvisor />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scenarios" className="mt-0 p-6">
            <PFASScenarioBuilder />
          </TabsContent>

          <TabsContent value="knowledge" className="mt-0 p-6">
            <PFASKnowledgeHub />
          </TabsContent>

          <TabsContent value="requests" className="mt-0 p-6">
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <h3 className="text-lg font-bold text-[#545454]">PFAS Supplier Declarations</h3>
                   <p className="text-sm text-slate-500">Manage data requests specifically for PFAS compliance.</p>
                </div>
                <div className="bg-white/50 backdrop-blur-sm rounded-lg border border-slate-200/60 p-8 text-center">
                   <AlertTriangle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                   <p className="text-slate-500">PFAS data collection will be rebuilt with SupplyLens integration</p>
                </div>
             </div>
          </TabsContent>

          <TabsContent value="evidence" className="mt-0 p-6">
             <EvidenceVault />
          </TabsContent>

          <TabsContent value="data" className="mt-0 p-6">
            <ComplianceDataHub />
          </TabsContent>

          <TabsContent value="integrations" className="mt-0 p-6">
            <PFASSupplyLensIntegration />
          </TabsContent>

          <TabsContent value="audit" className="mt-0 p-6">
            <PFASBlockchainAuditTrail />
          </TabsContent>

          <TabsContent value="lab-integration" className="mt-0 p-6">
            <div className="space-y-6">
              <PFASLabResultsInbox />
              <PFASLabAPIConfiguration />
            </div>
          </TabsContent>

          <TabsContent value="evidence-review" className="mt-0 p-6">
            <PFASEvidenceReviewWorkflow />
          </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}