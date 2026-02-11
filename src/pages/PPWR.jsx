import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PackageOpen, Recycle, Target, BarChart3, FileCheck, Leaf, Link2, Zap } from "lucide-react";
import PPWRDashboard from '@/components/ppwr/PPWRDashboard';
import PPWRPackagingRegistry from '@/components/ppwr/PPWRPackagingRegistry';
import PPWRRecycledContent from '@/components/ppwr/PPWRRecycledContent';
import PPWRCompliance from '@/components/ppwr/PPWRCompliance';
import PPWRTargetsReduction from '@/components/ppwr/PPWRTargetsReduction';
import PPWRAnalytics from '@/components/ppwr/PPWRAnalytics';
import PPWRSupplierDeclarations from '@/components/ppwr/PPWRSupplierDeclarations';
import PPWRDueDiligenceModule from '@/components/ppwr/PPWRDueDiligenceModule';
import PPWRDepositReturnSystem from '@/components/ppwr/PPWRDepositReturnSystem';
import PPWRLabelingModule from '@/components/ppwr/PPWRLabelingModule';
import PPWRAIAdvisor from '@/components/ppwr/PPWRAIAdvisor';
import PPWREPRReporting from '@/components/ppwr/PPWREPRReporting';
import PPWRSupplyLensIntegration from '@/components/ppwr/PPWRSupplyLensIntegration';
import PPWRComplianceMonitor from '@/components/ppwr/PPWRComplianceMonitor';
import PPWRIntegrationDashboard from '@/components/ppwr/PPWRIntegrationDashboard';
import PPWRSupplierDeclarationWorkflow from '@/components/ppwr/PPWRSupplierDeclarationWorkflow';
import PPWRAutomatedEPRReporting from '@/components/ppwr/PPWRAutomatedEPRReporting';
import PPWRCircularityDashboard from '@/components/ppwr/PPWRCircularityDashboard';
import PPWRPlasticTaxDashboard from '@/components/ppwr/PPWRPlasticTaxDashboard';
import PPWRScenarioComparison from '@/components/ppwr/PPWRScenarioComparison';

export default function PPWRPage() {
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
            <Recycle className="w-3.5 h-3.5" />
            PPWR Compliance
          </div>
          <h1 className="text-4xl font-light text-slate-900 tracking-tight">PPWR Management</h1>
          <p className="text-slate-500 font-light mt-1">Packaging & Packaging Waste Regulation.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/50 backdrop-blur-md border border-slate-200/60 p-1 h-auto shadow-sm rounded-xl inline-flex">
          <TabsTrigger value="dashboard" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="registry" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            Packaging
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            Compliance
          </TabsTrigger>
          <TabsTrigger value="circularity" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            Circularity
          </TabsTrigger>
          <TabsTrigger value="documentation" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            Documentation
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            EPR
          </TabsTrigger>
          <TabsTrigger value="ai-advisor" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            AI Advisor
          </TabsTrigger>
          <TabsTrigger value="integration" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            Integration
          </TabsTrigger>
          <TabsTrigger value="monitor" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">
            Monitor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <PPWRDashboard setActiveTab={setActiveTab} />
        </TabsContent>

        <TabsContent value="registry" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <PPWRPackagingRegistry />
        </TabsContent>

        <TabsContent value="compliance" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <PPWRCompliance />
        </TabsContent>

        <TabsContent value="documentation" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Tabs defaultValue="workflow" className="w-full">
            <TabsList className="bg-white/50 backdrop-blur-md border border-slate-200/60 p-1 h-auto shadow-sm rounded-xl inline-flex mb-4">
              <TabsTrigger value="workflow" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">Declaration Workflow</TabsTrigger>
              <TabsTrigger value="declarations" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">Supplier Declarations</TabsTrigger>
              <TabsTrigger value="labeling" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">Labeling & Passports</TabsTrigger>
              <TabsTrigger value="due-diligence" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">Due Diligence</TabsTrigger>
            </TabsList>
            <TabsContent value="workflow">
              <PPWRSupplierDeclarationWorkflow />
            </TabsContent>
            <TabsContent value="declarations">
              <PPWRSupplierDeclarations />
            </TabsContent>
            <TabsContent value="labeling">
              <PPWRLabelingModule />
            </TabsContent>
            <TabsContent value="due-diligence">
              <PPWRDueDiligenceModule />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="financial" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Tabs defaultValue="plastic-tax" className="w-full">
            <TabsList className="bg-white/50 backdrop-blur-md border border-slate-200/60 p-1 h-auto shadow-sm rounded-xl inline-flex mb-4">
              <TabsTrigger value="plastic-tax" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">Plastic Tax</TabsTrigger>
              <TabsTrigger value="automated" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">Automated EPR</TabsTrigger>
              <TabsTrigger value="epr" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">EPR Reporting</TabsTrigger>
              <TabsTrigger value="drs" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">Deposit Return System</TabsTrigger>
            </TabsList>
            <TabsContent value="plastic-tax">
              <PPWRPlasticTaxDashboard />
            </TabsContent>
            <TabsContent value="automated">
              <PPWRAutomatedEPRReporting />
            </TabsContent>
            <TabsContent value="epr">
              <PPWREPRReporting />
            </TabsContent>
            <TabsContent value="drs">
              <PPWRDepositReturnSystem />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="ai-advisor" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Tabs defaultValue="advisor" className="w-full">
            <TabsList className="bg-white/50 backdrop-blur-md border border-slate-200/60 p-1 h-auto shadow-sm rounded-xl inline-flex mb-4">
              <TabsTrigger value="advisor" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">AI Recommendations</TabsTrigger>
              <TabsTrigger value="scenarios" className="gap-2 px-5 py-2.5 text-sm font-light data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-lg transition-all">Scenario Modeling</TabsTrigger>
            </TabsList>
            <TabsContent value="advisor">
              <PPWRAIAdvisor />
            </TabsContent>
            <TabsContent value="scenarios">
              <PPWRScenarioComparison />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="integration" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <PPWRIntegrationDashboard />
        </TabsContent>

        <TabsContent value="monitor" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <PPWRComplianceMonitor />
        </TabsContent>

        <TabsContent value="circularity" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <PPWRCircularityDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}