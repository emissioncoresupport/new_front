import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, BarChart3, Database, Target, GitBranch } from "lucide-react";
import LCAInventoryManager from './LCAInventoryManager';
import LCAImpactAssessment from './LCAImpactAssessment';
import LCAInterpretation from './LCAInterpretation';
import LCAGoalScope from './LCAGoalScope';
import LCAScenarioManager from './LCAScenarioManager';
import LCAWhatIfAnalysis from './LCAWhatIfAnalysis';
import LCAComplianceAudit from './LCAComplianceAudit';

export default function LCAStudyDetail({ studyId, onBack }) {
  const [activeTab, setActiveTab] = useState('goal-scope');

  const { data: study, isLoading } = useQuery({
    queryKey: ['lca-study', studyId],
    queryFn: async () => {
      const studies = await base44.entities.LCAStudy.list();
      return studies.find(s => s.id === studyId);
    }
  });

  const { data: product } = useQuery({
    queryKey: ['product', study?.product_id],
    queryFn: async () => {
      if (!study?.product_id) return null;
      const products = await base44.entities.Product.list();
      return products.find(p => p.id === study.product_id);
    },
    enabled: !!study?.product_id
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">Loading study...</div>;
  }

  if (!study) {
    return <div className="text-center py-12 text-slate-500">Study not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="rounded-xl hover:bg-white/20 backdrop-blur-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-extralight tracking-tight text-slate-900">{study.study_name}</h1>
            <p className="text-sm text-slate-500 font-light mt-1">
              {product?.name} • {study.impact_assessment_method} • {study.system_boundary}
            </p>
          </div>
        </div>
        </div>
      </div>

      {/* ISO 14040 Phases Tabs */}
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="relative bg-white/30 backdrop-blur-md border-b border-white/30 rounded-none h-auto p-0 w-full justify-start">
          <TabsTrigger value="goal-scope" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white/20 data-[state=active]:text-slate-900 hover:bg-white/10 px-8 py-4 text-base font-extralight text-slate-600 transition-all tracking-wide backdrop-blur-sm gap-2">
            <Target className="w-4 h-4" />
            Goal & Scope
          </TabsTrigger>
          <TabsTrigger value="inventory" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white/20 data-[state=active]:text-slate-900 hover:bg-white/10 px-8 py-4 text-base font-extralight text-slate-600 transition-all tracking-wide backdrop-blur-sm gap-2">
            <Database className="w-4 h-4" />
            Inventory Analysis
          </TabsTrigger>
          <TabsTrigger value="impact" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white/20 data-[state=active]:text-slate-900 hover:bg-white/10 px-8 py-4 text-base font-extralight text-slate-600 transition-all tracking-wide backdrop-blur-sm gap-2">
            <BarChart3 className="w-4 h-4" />
            Impact Assessment
          </TabsTrigger>
          <TabsTrigger value="interpretation" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white/20 data-[state=active]:text-slate-900 hover:bg-white/10 px-8 py-4 text-base font-extralight text-slate-600 transition-all tracking-wide backdrop-blur-sm gap-2">
            <FileText className="w-4 h-4" />
            Interpretation
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white/20 data-[state=active]:text-slate-900 hover:bg-white/10 px-8 py-4 text-base font-extralight text-slate-600 transition-all tracking-wide backdrop-blur-sm gap-2">
            <GitBranch className="w-4 h-4" />
            Scenario Modeling
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goal-scope" className="mt-0 p-6">
          <LCAGoalScope study={study} />
        </TabsContent>

        <TabsContent value="inventory" className="mt-0 p-6">
          <LCAInventoryManager studyId={studyId} study={study} />
        </TabsContent>

        <TabsContent value="impact" className="mt-0 p-6">
          <LCAImpactAssessment studyId={studyId} study={study} />
        </TabsContent>

        <TabsContent value="interpretation" className="mt-0 p-6">
          <div className="space-y-6">
            <LCAComplianceAudit studyId={studyId} study={study} />
            <LCAInterpretation studyId={studyId} study={study} />
          </div>
        </TabsContent>

        <TabsContent value="scenarios" className="mt-0 p-6">
          <div className="space-y-6">
            <LCAWhatIfAnalysis studyId={studyId} />
            <LCAScenarioManager studyId={studyId} study={study} />
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}