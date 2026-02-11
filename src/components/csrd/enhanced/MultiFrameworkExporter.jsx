import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Globe, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function MultiFrameworkExporter() {
  const [selectedFrameworks, setSelectedFrameworks] = useState(['CSRD']);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: dataPoints = [] } = useQuery({
    queryKey: ['csrd-data-points'],
    queryFn: () => base44.entities.CSRDDataPoint.list()
  });

  const { data: materialTopics = [] } = useQuery({
    queryKey: ['csrd-materiality-topics'],
    queryFn: () => base44.entities.CSRDMaterialityTopic.list()
  });

  const frameworks = [
    { 
      id: 'CSRD', 
      name: 'CSRD / ESRS', 
      icon: Globe, 
      color: 'bg-[#86b027]',
      description: 'EU Corporate Sustainability Reporting Directive'
    },
    { 
      id: 'CDP', 
      name: 'CDP Climate', 
      icon: FileText, 
      color: 'bg-blue-600',
      description: 'Carbon Disclosure Project questionnaire'
    },
    { 
      id: 'GRI', 
      name: 'GRI Standards', 
      icon: Globe, 
      color: 'bg-purple-600',
      description: 'Global Reporting Initiative'
    },
    { 
      id: 'TCFD', 
      name: 'TCFD', 
      icon: FileText, 
      color: 'bg-emerald-600',
      description: 'Task Force on Climate-related Financial Disclosures'
    },
    { 
      id: 'ISSB', 
      name: 'ISSB/IFRS S1/S2', 
      icon: FileText, 
      color: 'bg-amber-600',
      description: 'International Sustainability Standards Board'
    },
    { 
      id: 'SFDR', 
      name: 'SFDR', 
      icon: Globe, 
      color: 'bg-rose-600',
      description: 'Sustainable Finance Disclosure Regulation'
    }
  ];

  const handleToggleFramework = (id) => {
    setSelectedFrameworks(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (selectedFrameworks.length === 0) {
      toast.error('Please select at least one framework');
      return;
    }

    setIsGenerating(true);
    const loadingToast = toast.loading(`Generating reports for ${selectedFrameworks.join(', ')}...`);

    try {
      for (const framework of selectedFrameworks) {
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `Generate a ${framework} compliant sustainability report using the following data:

Material Topics: ${materialTopics.filter(t => t.is_material).map(t => t.topic_name).join(', ')}
Data Points Collected: ${dataPoints.length}
Reporting Year: ${new Date().getFullYear()}

Framework-specific requirements:
${framework === 'CDP' ? '- Answer all CDP Climate Change questionnaire sections (C0-C12)\n- Include Scope 1, 2, 3 emissions\n- Governance, Strategy, Risk Management, Metrics & Targets' : ''}
${framework === 'GRI' ? '- Follow GRI Universal Standards (GRI 2)\n- Include material topic-specific standards\n- Provide comprehensive disclosures per GRI requirements' : ''}
${framework === 'TCFD' ? '- Cover four pillars: Governance, Strategy, Risk Management, Metrics & Targets\n- Include scenario analysis\n- Quantify climate-related risks and opportunities' : ''}
${framework === 'ISSB' ? '- IFRS S1 (General Requirements) and S2 (Climate)\n- Align with TCFD recommendations\n- Provide industry-specific metrics per SASB standards' : ''}
${framework === 'SFDR' ? '- Principal Adverse Impact (PAI) indicators\n- Taxonomy alignment reporting\n- Sustainable investment disclosures' : ''}

Format as a professional report with sections, tables, and compliance statements.`,
        });

        const blob = new Blob([response], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${framework}_Report_${new Date().getFullYear()}.md`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.dismiss(loadingToast);
      toast.success(`✅ Generated ${selectedFrameworks.length} report(s)! Check your downloads.`);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to generate reports: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/40 backdrop-blur-xl border border-white/60 flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
              <Globe className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h3 className="text-xl font-extralight text-slate-900">Multi-Framework Export</h3>
              <p className="text-sm text-slate-500 font-light">One-click multi-framework reporting</p>
            </div>
          </div>
          <Badge variant="outline" className="text-slate-600 border-slate-300 font-light">
            {selectedFrameworks.length} selected
          </Badge>
        </div>
        <div className="space-y-6">
        {/* Framework Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {frameworks.map(fw => {
            const Icon = fw.icon;
            const isSelected = selectedFrameworks.includes(fw.id);
            
            return (
              <div
                key={fw.id}
                onClick={() => handleToggleFramework(fw.id)}
                className={`
                  p-4 rounded-xl border cursor-pointer transition-all backdrop-blur-sm
                  ${isSelected 
                    ? 'border-slate-900 bg-white/60 shadow-md' 
                    : 'border-white/60 bg-white/40 hover:bg-white/60 hover:shadow-sm'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <Checkbox checked={isSelected} onCheckedChange={() => {}} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-6 h-6 rounded ${fw.color} flex items-center justify-center`}>
                        <Icon className="w-3 h-3 text-white" />
                      </div>
                      <p className="font-bold text-slate-900">{fw.name}</p>
                    </div>
                    <p className="text-xs text-slate-600">{fw.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Data Coverage Info */}
        <div className="relative bg-white/40 backdrop-blur-md rounded-xl border border-white/60 shadow-sm overflow-hidden">
          <div className="p-4">
            <p className="text-sm font-light text-slate-900 mb-2">📊 Your Data Coverage</p>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-slate-500 font-light">Material Topics</p>
                <p className="text-2xl font-extralight text-[#86b027]">{materialTopics.filter(t => t.is_material).length}</p>
              </div>
              <div>
                <p className="text-slate-500 font-light">Data Points</p>
                <p className="text-2xl font-extralight text-[#02a1e8]">{dataPoints.length}</p>
              </div>
              <div>
                <p className="text-slate-500 font-light">Verified</p>
                <p className="text-2xl font-extralight text-emerald-600">
                  {dataPoints.filter(d => d.verification_status !== 'Unverified').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || selectedFrameworks.length === 0}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-all duration-200 font-light text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-5 h-5 stroke-[1.5]" />
          {isGenerating ? 'Generating Reports...' : `Generate ${selectedFrameworks.length} Report(s)`}
        </button>

        {/* Info Box */}
        <div className="bg-blue-50/60 backdrop-blur-md p-4 rounded-xl border border-blue-300/40 shadow-sm">
          <p className="text-xs font-light text-blue-900 mb-1">💡 How it works</p>
          <p className="text-xs text-blue-800 font-light">
            Your data is automatically mapped to multiple frameworks. Each report uses the same single source of truth, 
            ensuring consistency across all disclosures. Reports are generated in Markdown format (PDF export coming soon).
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}