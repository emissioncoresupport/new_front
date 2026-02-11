import React, { useState } from 'react';
import DeveloperConsoleManager from '@/components/supplylens/DeveloperConsoleManager';
import PhaseV2StressTestRunner from '@/components/supplylens/PhaseV2StressTestRunner';
import PhaseC2UIStressTest from '@/components/supplylens/PhaseC2UIStressTest';
import PhaseB2BackendStressTest from '@/components/supplylens/PhaseB2BackendStressTest';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DeveloperConsole() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-[#86b027]/10 p-6">
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="console" className="space-y-6">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="console">Console Entries</TabsTrigger>
            <TabsTrigger value="phase-v2">Phase V2 Stress Test</TabsTrigger>
            <TabsTrigger value="phase-c2">Phase C.2 UI Test</TabsTrigger>
            <TabsTrigger value="phase-b2">Phase B.2 Backend Test</TabsTrigger>
          </TabsList>
          
          <TabsContent value="console">
            <DeveloperConsoleManager />
          </TabsContent>
          
          <TabsContent value="phase-v2">
            <PhaseV2StressTestRunner />
          </TabsContent>
          
          <TabsContent value="phase-c2">
            <PhaseC2UIStressTest />
          </TabsContent>
          
          <TabsContent value="phase-b2">
            <PhaseB2BackendStressTest />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}