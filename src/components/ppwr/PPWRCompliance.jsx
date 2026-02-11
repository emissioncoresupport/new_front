import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckSquare, Sparkles, Map, Shield, Scale, FileCode } from "lucide-react";
import PPWRComplianceChecklist from './PPWRComplianceChecklist';
import PPWRAdvancedFeatures from './PPWRAdvancedFeatures';
import PPWRImplementationRoadmap from './PPWRImplementationRoadmap';
import PPWRPenaltyRiskDashboard from './PPWRPenaltyRiskDashboard';
import PPWRMassBalanceVerifier from './PPWRMassBalanceVerifier';
import PPWRXMLExporter from './PPWRXMLExporter';

export default function PPWRCompliance() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="checklist" className="w-full">
        <TabsList className="bg-white border">
          <TabsTrigger value="checklist" className="gap-2">
            <CheckSquare className="w-4 h-4" />
            Compliance Checklist
          </TabsTrigger>
          <TabsTrigger value="mass-balance" className="gap-2">
            <Scale className="w-4 h-4" />
            Mass Balance
          </TabsTrigger>
          <TabsTrigger value="risk" className="gap-2">
            <Shield className="w-4 h-4" />
            Penalty Risk
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2">
            <FileCode className="w-4 h-4" />
            XML Export
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Advanced
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="gap-2">
            <Map className="w-4 h-4" />
            Roadmap
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="mt-6">
          <PPWRComplianceChecklist />
        </TabsContent>

        <TabsContent value="mass-balance" className="mt-6">
          <PPWRMassBalanceVerifier />
        </TabsContent>

        <TabsContent value="risk" className="mt-6">
          <PPWRPenaltyRiskDashboard />
        </TabsContent>

        <TabsContent value="export" className="mt-6">
          <PPWRXMLExporter />
        </TabsContent>

        <TabsContent value="features" className="mt-6">
          <PPWRAdvancedFeatures />
        </TabsContent>

        <TabsContent value="roadmap" className="mt-6">
          <PPWRImplementationRoadmap />
        </TabsContent>
      </Tabs>
    </div>
  );
}