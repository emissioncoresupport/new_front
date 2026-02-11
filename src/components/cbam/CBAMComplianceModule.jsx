import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, ShieldCheck, AlertTriangle, FileCheck, GitBranch } from "lucide-react";
import CBAMComplianceTracker from './CBAMComplianceTracker';
import CBAMUnifiedVerificationHub from './unified/CBAMUnifiedVerificationHub';
import AuditorVerificationHub from './AuditorVerificationHub';
import CBAMWorkflowEngine from './workflow/CBAMWorkflowEngine';

export default function CBAMComplianceModule({ reports, entries }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-medium text-slate-900">Compliance & Verification</h2>
        <p className="text-sm text-slate-500 mt-1">
          Workflow, validation, verification, and regulatory compliance
        </p>
      </div>

      <Tabs defaultValue="workflow" className="space-y-6">
        <TabsList className="bg-slate-50 border-b border-slate-200 rounded-none h-auto p-0 w-full justify-start">
          <TabsTrigger value="workflow" className="rounded-none border-b-3 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-6 py-3 text-sm font-medium text-slate-700 transition-all">
            Workflow Engine
          </TabsTrigger>
          <TabsTrigger value="tracker" className="rounded-none border-b-3 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-6 py-3 text-sm font-medium text-slate-700 transition-all">
            Compliance Tracker
          </TabsTrigger>
          <TabsTrigger value="verification" className="rounded-none border-b-3 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-6 py-3 text-sm font-medium text-slate-700 transition-all">
            Verification Hub
          </TabsTrigger>
          <TabsTrigger value="auditor" className="rounded-none border-b-3 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-6 py-3 text-sm font-medium text-slate-700 transition-all">
            Auditor Portal
          </TabsTrigger>
          {/* AI Advisor tab removed - feature quarantined */}
        </TabsList>

        <TabsContent value="workflow">
          <CBAMWorkflowEngine reports={reports} entries={entries} suppliers={[]} />
        </TabsContent>

        <TabsContent value="tracker">
          <CBAMComplianceTracker />
        </TabsContent>

        <TabsContent value="verification">
          <CBAMUnifiedVerificationHub />
        </TabsContent>

        <TabsContent value="auditor">
          <AuditorVerificationHub />
        </TabsContent>

        {/* AI Advisor removed - feature quarantined */}
      </Tabs>
    </div>
  );
}