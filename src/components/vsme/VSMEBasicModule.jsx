import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Circle, ChevronRight, Building2, Leaf, Users, Shield } from "lucide-react";
import VSMEDisclosureModal from './VSMEDisclosureModal';

const BASIC_DISCLOSURES = [
  // General Information
  { code: 'B1', title: 'Basis for Preparation', category: 'general', description: 'Company details, size, activities, legal form' },
  { code: 'B2', title: 'Sustainability Practices & Policies', category: 'general', description: 'Existing or planned sustainability initiatives' },
  
  // Environmental
  { code: 'B3', title: 'Energy & GHG Emissions', category: 'environmental', description: 'Energy consumption and greenhouse gas emissions (Scope 1 & 2)' },
  { code: 'B4', title: 'Pollutant Emissions', category: 'environmental', description: 'Air, water, and soil pollutant emissions' },
  { code: 'B5', title: 'Biodiversity Impact', category: 'environmental', description: 'Sites in or near biodiversity-sensitive areas' },
  { code: 'B6', title: 'Water Withdrawal & Consumption', category: 'environmental', description: 'Water usage and consumption data' },
  { code: 'B7', title: 'Resource Use & Circular Economy', category: 'environmental', description: 'Waste generation and circular economy practices' },
  
  // Social
  { code: 'B8', title: 'Workforce Characteristics', category: 'social', description: 'Employee numbers by type, gender, country' },
  { code: 'B9', title: 'Health & Safety', category: 'social', description: 'Work-related accidents, fatalities, illness' },
  { code: 'B10', title: 'Employee Rights & Development', category: 'social', description: 'Remuneration, collective bargaining, training' },
  
  // Governance
  { code: 'B11', title: 'Corruption & Bribery', category: 'governance', description: 'Convictions and fines for corruption/bribery' }
];

export default function VSMEBasicModule({ report }) {
  const [selectedDisclosure, setSelectedDisclosure] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: disclosures = [] } = useQuery({
    queryKey: ['vsme-disclosures', 'basic'],
    queryFn: async () => {
      const all = await base44.entities.VSMEDisclosure.list();
      return all.filter(d => d.module_type === 'basic');
    }
  });

  const getDisclosureStatus = (code) => {
    return disclosures.find(d => d.disclosure_code === code);
  };

  const handleOpenDisclosure = (disclosure) => {
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

  const completedCount = disclosures.filter(d => d.status === 'completed').length;
  const progress = (completedCount / 11) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="bg-white border-[#86b027]/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-[#545454]">Basic Module Progress</h3>
              <p className="text-sm text-slate-600 mt-1">11 mandatory disclosures for all SMEs</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-[#86b027]">{completedCount}/11</div>
              <p className="text-xs text-slate-500">Completed</p>
            </div>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {/* Disclosure Categories */}
      {categories.map(category => {
        const categoryDisclosures = BASIC_DISCLOSURES.filter(d => d.category === category);
        const Icon = categoryIcons[category];
        const categoryCompleted = categoryDisclosures.filter(d => 
          getDisclosureStatus(d.code)?.status === 'completed'
        ).length;

        return (
          <Card key={category}>
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-base font-bold text-[#545454] flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <Icon className="w-5 h-5 text-[#86b027]" />
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
                      className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-[#86b027] hover:shadow-md transition-all group bg-white"
                    >
                      <div className="flex items-center gap-3 flex-1 text-left">
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-[#86b027] shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-[#545454] group-hover:text-[#86b027] transition-colors">
                            {disclosure.code} - {disclosure.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {disclosure.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {isCompleted && (
                          <Badge className="bg-[#86b027]/10 text-[#86b027] border-0">
                            Complete
                          </Badge>
                        )}
                        {isInProgress && (
                          <Badge className="bg-amber-100 text-amber-700 border-0">
                            In Progress
                          </Badge>
                        )}
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#86b027] group-hover:translate-x-1 transition-all" />
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
          moduleType="basic"
        />
      )}
    </div>
  );
}