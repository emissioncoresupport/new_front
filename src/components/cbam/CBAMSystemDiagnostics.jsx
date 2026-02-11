import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, TestTube, FileCheck } from "lucide-react";
import CBAMDataImportTestPanel from './CBAMDataImportTestPanel';
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * System Diagnostics & Health Monitoring
 * Tests backend functions, data integrity, and compliance status
 */
export default function CBAMSystemDiagnostics() {
  return (
    <div className="space-y-5">
      <Alert className="border-slate-200/60 bg-slate-50/50">
        <Activity className="h-4 w-4 text-slate-600" />
        <AlertDescription className="text-xs text-slate-700">
          <strong>System Health:</strong> Run automated tests to verify calculation engines, integrations, 
          and data quality across the entire CBAM module.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="tests" className="space-y-5">
        <TabsList className="bg-slate-50 border border-slate-200 rounded-lg p-1">
          <TabsTrigger value="tests" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <TestTube className="w-3.5 h-3.5 mr-2" />
            Automated Tests
          </TabsTrigger>
          <TabsTrigger value="compliance" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FileCheck className="w-3.5 h-3.5 mr-2" />
            Compliance Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tests">
          <CBAMDataImportTestPanel />
        </TabsContent>

        <TabsContent value="compliance">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 text-center">
            <h3 className="text-base font-medium text-slate-900 mb-2">Compliance Dashboard</h3>
            <p className="text-sm text-slate-500">Coming Soon: Real-time compliance scoring and audit trail</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}