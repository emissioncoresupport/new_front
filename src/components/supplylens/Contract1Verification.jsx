import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Contract1ExecutableTests from './Contract1ExecutableTests';
import Contract1GapRegister from './Contract1GapRegister';
import Contract1ReleaseGate from './Contract1ReleaseGate';

export default function Contract1Verification() {
  const [activeTab, setActiveTab] = useState('tests');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Contract 1: Verification</h2>
        <p className="text-sm text-slate-600 mt-1">
          Executable tests + gap register + release gate. No claims of compliance, only platform control verification.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-100">
          <TabsTrigger value="tests">Executable Tests</TabsTrigger>
          <TabsTrigger value="gaps">Gap Register</TabsTrigger>
          <TabsTrigger value="gate">Release Gate</TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-4">
          <Contract1ExecutableTests />
        </TabsContent>

        <TabsContent value="gaps" className="space-y-4">
          <Contract1GapRegister />
        </TabsContent>

        <TabsContent value="gate" className="space-y-4">
          <Contract1ReleaseGate />
        </TabsContent>
      </Tabs>
    </div>
  );
}