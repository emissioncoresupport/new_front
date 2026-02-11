import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Download, Eye, Sparkles } from "lucide-react";
import CSRDNarrativeAssistant from './CSRDNarrativeAssistant';
import MultiFrameworkExporter from './enhanced/MultiFrameworkExporter';
import { toast } from "sonner";

export default function CSRDReporting() {
  const [activeESRS, setActiveESRS] = useState('E1');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: materialTopics = [] } = useQuery({
    queryKey: ['csrd-materiality-topics'],
    queryFn: () => base44.entities.CSRDMaterialityTopic.list()
  });

  const { data: dataPoints = [] } = useQuery({
    queryKey: ['csrd-data-points'],
    queryFn: () => base44.entities.CSRDDataPoint.list()
  });

  const { data: narratives = [] } = useQuery({
    queryKey: ['csrd-narratives'],
    queryFn: () => base44.entities.CSRDNarrative.list()
  });

  const esrsStandards = [
    { code: 'E1', name: 'Climate Change', material: materialTopics.some(t => t.esrs_standard === 'ESRS E1' && t.is_material) },
    { code: 'E2', name: 'Pollution', material: materialTopics.some(t => t.esrs_standard === 'ESRS E2' && t.is_material) },
    { code: 'E3', name: 'Water & Marine', material: materialTopics.some(t => t.esrs_standard === 'ESRS E3' && t.is_material) },
    { code: 'E4', name: 'Biodiversity', material: materialTopics.some(t => t.esrs_standard === 'ESRS E4' && t.is_material) },
    { code: 'E5', name: 'Circular Economy', material: materialTopics.some(t => t.esrs_standard === 'ESRS E5' && t.is_material) },
    { code: 'S1', name: 'Own Workforce', material: materialTopics.some(t => t.esrs_standard === 'ESRS S1' && t.is_material) },
    { code: 'S2', name: 'Workers in Value Chain', material: materialTopics.some(t => t.esrs_standard === 'ESRS S2' && t.is_material) },
    { code: 'S3', name: 'Affected Communities', material: materialTopics.some(t => t.esrs_standard === 'ESRS S3' && t.is_material) },
    { code: 'S4', name: 'Consumers & End-users', material: materialTopics.some(t => t.esrs_standard === 'ESRS S4' && t.is_material) },
    { code: 'G1', name: 'Business Conduct', material: materialTopics.some(t => t.esrs_standard === 'ESRS G1' && t.is_material) }
  ];

  const currentStandard = esrsStandards.find(s => s.code === activeESRS);
  const currentDataPoints = dataPoints.filter(d => d.esrs_standard === `ESRS ${activeESRS}`);
  const currentNarratives = narratives.filter(n => n.esrs_standard === `ESRS ${activeESRS}`);

  const handleGenerateFullReport = async () => {
    setIsGenerating(true);
    toast.loading('Generating comprehensive CSRD report...');

    try {
      const report = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a complete CSRD Sustainability Statement following EFRAG standards (December 2024).

Company Data Summary:
- Material Topics: ${materialTopics.filter(t => t.is_material).map(t => t.topic_name).join(', ')}
- Data Points Collected: ${dataPoints.length}
- Reporting Year: ${new Date().getFullYear()}

Include:
1. General Information (ESRS 2)
2. Strategy & Business Model
3. Governance
4. Material Topics Coverage (${materialTopics.filter(t => t.is_material).length} topics)
5. Environmental Standards (${esrsStandards.filter(s => s.code.startsWith('E') && s.material).map(s => s.code).join(', ')})
6. Social Standards (${esrsStandards.filter(s => s.code.startsWith('S') && s.material).map(s => s.code).join(', ')})
7. Governance (G1)

Format: Professional sustainability report structure with sections and subsections.`,
      });

      toast.dismiss();
      toast.success('Report generated! Review and refine as needed.');
      
      // Create downloadable report (in production, convert to PDF)
      const blob = new Blob([report], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CSRD_Report_${new Date().getFullYear()}.md`;
      a.click();
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative flex justify-between items-center">
          <div>
            <h2 className="text-xl font-extralight text-slate-900 mb-1">CSRD Report Generation</h2>
            <p className="text-sm text-slate-500 font-light">Generate EFRAG-compliant sustainability statements</p>
          </div>
          <button
            type="button"
            onClick={handleGenerateFullReport}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-all duration-200 font-light text-sm tracking-wide disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 stroke-[1.5]" />
            {isGenerating ? 'Generating...' : 'Generate Full Report'}
          </button>
        </div>
      </div>

      {/* Multi-Framework Export */}
      <MultiFrameworkExporter />

      {/* Report Status Overview */}
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative p-6">
          <h3 className="text-xl font-extralight text-slate-900 mb-6">Report Readiness</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-6 bg-white/40 backdrop-blur-md rounded-xl border border-white/60 shadow-sm">
              <p className="text-sm text-slate-500 font-light mb-2">Material Topics</p>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-extralight text-[#86b027]">
                  {materialTopics.filter(t => t.is_material).length}
                </p>
                <Badge className="bg-[#86b027] font-light">Assessed</Badge>
              </div>
            </div>
            <div className="p-6 bg-white/40 backdrop-blur-md rounded-xl border border-white/60 shadow-sm">
              <p className="text-sm text-slate-500 font-light mb-2">Data Points</p>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-extralight text-[#02a1e8]">{dataPoints.length}</p>
                <Badge className="bg-[#02a1e8] font-light">Collected</Badge>
              </div>
            </div>
            <div className="p-6 bg-white/40 backdrop-blur-md rounded-xl border border-white/60 shadow-sm">
              <p className="text-sm text-slate-500 font-light mb-2">Narratives</p>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-extralight text-purple-600">{narratives.length}</p>
                <Badge className="bg-purple-500 font-light">Drafted</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ESRS Standards Tabs */}
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative p-6">
          <h3 className="text-xl font-extralight text-slate-900 mb-6">ESRS Narratives by Standard</h3>
          <div>
          <Tabs value={activeESRS} onValueChange={setActiveESRS}>
            <TabsList className="grid grid-cols-5 lg:grid-cols-10 gap-1">
              {esrsStandards.map(std => (
                <TabsTrigger
                  key={std.code}
                  value={std.code}
                  className="relative data-[state=active]:bg-[#86b027] data-[state=active]:text-white"
                >
                  {std.code}
                  {std.material && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {esrsStandards.map(std => (
              <TabsContent key={std.code} value={std.code} className="space-y-4 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#545454]">ESRS {std.code}: {std.name}</h3>
                    <p className="text-sm text-slate-600">
                      {std.material ? (
                        <Badge className="bg-emerald-500">Material - Full Disclosure Required</Badge>
                      ) : (
                        <Badge variant="outline">Not Material - Limited Disclosure</Badge>
                      )}
                    </p>
                  </div>
                  <div className="text-sm text-slate-600">
                    {currentDataPoints.length} data points collected
                  </div>
                </div>

                {std.material ? (
                  <CSRDNarrativeAssistant
                    esrsStandard={`ESRS ${std.code}`}
                    disclosureRequirement={`ESRS ${std.code}-1`}
                    existingContent={currentNarratives[0]?.content || ''}
                    onContentUpdate={(content) => {
                      // Save narrative
                    }}
                  />
                ) : (
                  <Card className="border-slate-200 bg-slate-50">
                    <CardContent className="p-8 text-center">
                      <p className="text-slate-600">
                        This standard is not material based on your Double Materiality Assessment.
                        You may include a brief statement explaining why it's not material.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
        </div>
      </div>
    </div>
  );
}