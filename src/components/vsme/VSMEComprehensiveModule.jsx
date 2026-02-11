import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Circle, ChevronRight, Lock, AlertCircle, Building2, Leaf, Users, Shield } from "lucide-react";
import VSMEDisclosureModal from './VSMEDisclosureModal';

const COMPREHENSIVE_DISCLOSURES = [
  // General
  { code: 'C1', title: 'Business Model & Strategy', category: 'general', description: 'Sustainability integration in business model' },
  { code: 'C2', title: 'Extended Sustainability Practices', category: 'general', description: 'Detailed policies from B2' },
  
  // Environmental
  { code: 'C3', title: 'GHG Reduction Targets', category: 'environmental', description: 'Climate transition plans and targets' },
  { code: 'C4', title: 'Climate Risks & Timeframes', category: 'environmental', description: 'Climate-related risks and adaptation' },
  { code: 'B3-Scope3', title: 'Scope 3 GHG Emissions', category: 'environmental', description: 'Value chain indirect emissions' },
  
  // Social
  { code: 'C5', title: 'Extended Workforce Data', category: 'social', description: 'Additional workforce characteristics' },
  { code: 'C6', title: 'Human Rights Policies', category: 'social', description: 'Human rights due diligence processes' },
  { code: 'C7', title: 'Human Rights Incidents', category: 'social', description: 'Severe incidents and corrective actions' },
  
  // Governance
  { code: 'C8', title: 'Sector Revenues & Exclusions', category: 'governance', description: 'Paris Agreement alignment' },
  { code: 'C9', title: 'Governance Gender Diversity', category: 'governance', description: 'Board and leadership diversity' }
];

export default function VSMEComprehensiveModule({ report }) {
  const [selectedDisclosure, setSelectedDisclosure] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const { data: basicDisclosures = [] } = useQuery({
    queryKey: ['vsme-disclosures', 'basic'],
    queryFn: async () => {
      const all = await base44.entities.VSMEDisclosure.list();
      return all.filter(d => d.module_type === 'basic');
    }
  });

  const { data: comprehensiveDisclosures = [] } = useQuery({
    queryKey: ['vsme-disclosures', 'comprehensive'],
    queryFn: async () => {
      const all = await base44.entities.VSMEDisclosure.list();
      return all.filter(d => d.module_type === 'comprehensive');
    }
  });

  const basicCompleted = basicDisclosures.filter(d => d.status === 'completed').length;
  const isBasicComplete = basicCompleted === 11;

  const comprehensiveCompleted = comprehensiveDisclosures.filter(d => d.status === 'completed').length;
  const progress = (comprehensiveCompleted / 9) * 100;

  const getDisclosureStatus = (code) => {
    return comprehensiveDisclosures.find(d => d.disclosure_code === code);
  };

  const handleOpenDisclosure = (disclosure) => {
    if (!isBasicComplete) return;
    const existing = getDisclosureStatus(disclosure.code);
    setSelectedDisclosure({ ...disclosure, existing });
    setShowModal(true);
  };

  const categoryIcons = {
    general: Building2,
    environmental: Leaf,
    social: Users,
    governance: Shield
  };

  const categories = ['general', 'environmental', 'social', 'governance'];

  if (!isBasicComplete) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-12 text-center">
          <Lock className="w-16 h-16 mx-auto mb-4 text-amber-500" />
          <h3 className="text-xl font-bold text-amber-900 mb-2">Basic Module Required</h3>
          <p className="text-amber-700 mb-6">
            You must complete all 11 Basic Module disclosures before accessing the Comprehensive Module.
          </p>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Progress value={(basicCompleted / 11) * 100} className="w-64 h-3" />
            <span className="text-sm font-bold text-amber-800">{basicCompleted}/11</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="bg-gradient-to-r from-[#02a1e8]/5 to-white border-[#02a1e8]/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-[#545454]">Comprehensive Module</h3>
              <p className="text-sm text-slate-600 mt-1">9 additional disclosures for advanced ESG reporting</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-[#02a1e8]">{comprehensiveCompleted}/9</div>
              <p className="text-xs text-slate-500">Completed</p>
            </div>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {/* Disclosure Categories */}
      {categories.map(category => {
        const categoryDisclosures = COMPREHENSIVE_DISCLOSURES.filter(d => d.category === category);
        const Icon = categoryIcons[category];
        const categoryCompleted = categoryDisclosures.filter(d => 
          getDisclosureStatus(d.code)?.status === 'completed'
        ).length;

        return (
          <Card key={category}>
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-base font-bold text-[#545454] flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <Icon className="w-5 h-5 text-[#02a1e8]" />
                </div>
                <div className="flex-1">
                  {category.charAt(0).toUpperCase() + category.slice(1)} Metrics
                  <span className="text-xs text-slate-500 ml-2">
                    ({categoryCompleted}/{categoryDisclosures.length} completed)
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {categoryDisclosures.map(disclosure => {
                  const status = getDisclosureStatus(disclosure.code);
                  const isCompleted = status?.status === 'completed';
                  const isInProgress = status?.status === 'in_progress';

                  return (
                    <button
                      key={disclosure.code}
                      onClick={() => handleOpenDisclosure(disclosure)}
                      className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-[#02a1e8] hover:shadow-md transition-all group bg-white"
                    >
                      <div className="flex items-center gap-3 flex-1 text-left">
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-[#02a1e8] shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-[#545454] group-hover:text-[#02a1e8] transition-colors">
                            {disclosure.code} - {disclosure.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {disclosure.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {isCompleted && (
                          <Badge className="bg-[#02a1e8]/10 text-[#02a1e8] border-0">
                            Complete
                          </Badge>
                        )}
                        {isInProgress && (
                          <Badge className="bg-amber-100 text-amber-700 border-0">
                            In Progress
                          </Badge>
                        )}
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#02a1e8] group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {showModal && selectedDisclosure && (
        <VSMEDisclosureModal
          disclosure={selectedDisclosure}
          open={showModal}
          onOpenChange={setShowModal}
          moduleType="comprehensive"
        />
      )}
    </div>
  );
}