import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, AlertTriangle, FileCheck, FileText } from "lucide-react";
import AssuranceDashboard from './assurance/AssuranceDashboard';
import FindingsManager from './assurance/FindingsManager';
import AuditorDataAccess from './assurance/AuditorDataAccess';
import AssuranceReports from './assurance/AssuranceReports';

export default function CSRDAssurance() {
  const [activeView, setActiveView] = useState('dashboard');

  return (
    <Tabs value={activeView} onValueChange={setActiveView}>
      <TabsList className="bg-white p-1.5 rounded-full border border-slate-100 inline-flex h-auto shadow-sm">
        <TabsTrigger value="dashboard" className="gap-2 rounded-full px-6 py-2.5 text-sm font-medium data-[state=active]:bg-[#86b027] data-[state=active]:text-white transition-all text-[#545454] hover:text-[#86b027]">
          <Shield className="w-4 h-4" />
          Dashboard
        </TabsTrigger>
        <TabsTrigger value="findings" className="gap-2 rounded-full px-6 py-2.5 text-sm font-medium data-[state=active]:bg-[#86b027] data-[state=active]:text-white transition-all text-[#545454] hover:text-[#86b027]">
          <AlertTriangle className="w-4 h-4" />
          Findings
        </TabsTrigger>
        <TabsTrigger value="data-access" className="gap-2 rounded-full px-6 py-2.5 text-sm font-medium data-[state=active]:bg-[#86b027] data-[state=active]:text-white transition-all text-[#545454] hover:text-[#86b027]">
          <FileCheck className="w-4 h-4" />
          Data Access
        </TabsTrigger>
        <TabsTrigger value="reports" className="gap-2 rounded-full px-6 py-2.5 text-sm font-medium data-[state=active]:bg-[#86b027] data-[state=active]:text-white transition-all text-[#545454] hover:text-[#86b027]">
          <FileText className="w-4 h-4" />
          Reports
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard" className="mt-6">
        <AssuranceDashboard setActiveView={setActiveView} />
      </TabsContent>

      <TabsContent value="findings" className="mt-6">
        <FindingsManager />
      </TabsContent>

      <TabsContent value="data-access" className="mt-6">
        <AuditorDataAccess />
      </TabsContent>

      <TabsContent value="reports" className="mt-6">
        <AssuranceReports />
      </TabsContent>
    </Tabs>
  );
}