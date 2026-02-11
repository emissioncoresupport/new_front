import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, CheckCircle2, Circle, FileCheck } from "lucide-react";

const CHECKLIST_ITEMS = [
  {
    id: 'inventory',
    title: 'Inventory All Packaging',
    description: 'Create complete database of packaging SKUs including primary, secondary, and tertiary',
    action: 'Navigate to Packaging Registry'
  },
  {
    id: 'recyclability',
    title: 'Assess Recyclability',
    description: 'Score each package design based on material type, separability, and contamination risk',
    action: 'Run AI Recyclability Grading'
  },
  {
    id: 'empty_space',
    title: 'Calculate Empty Space',
    description: 'Measure void space ratio for transport and e-commerce packaging',
    action: 'Calculate Empty Space Ratios'
  },
  {
    id: 'recycled_content',
    title: 'Track Recycled Content',
    description: 'Document PCR percentages and maintain supplier declarations',
    action: 'Review PCR Tracking'
  },
  {
    id: 'optimize',
    title: 'Optimize Designs',
    description: 'Implement redesigns to meet recyclability and material reduction targets',
    action: 'Launch Design Optimizer'
  },
  {
    id: 'epr_reporting',
    title: 'Report to EPR Schemes',
    description: 'Submit packaging data to Extended Producer Responsibility organizations',
    action: 'Generate EPR Report'
  }
];

export default function PPWRComplianceChecklist() {
  const [expandedItems, setExpandedItems] = useState({});
  const queryClient = useQueryClient();

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  // Calculate completion
  const completionStatus = {
    inventory: packaging.length > 0,
    recyclability: packaging.filter(p => p.recyclability_score > 0).length > 0,
    empty_space: packaging.filter(p => p.empty_space_ratio !== null).length > 0,
    recycled_content: packaging.filter(p => p.recycled_content_percentage > 0).length > 0,
    optimize: packaging.filter(p => p.design_optimized).length > 0,
    epr_reporting: packaging.filter(p => p.epr_reported).length > 0
  };

  const completedCount = Object.values(completionStatus).filter(Boolean).length;
  const completionPercentage = Math.round((completedCount / CHECKLIST_ITEMS.length) * 100);

  const toggleItem = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">Compliance Checklist</CardTitle>
          <Badge className="bg-white/20 text-white text-lg px-4 py-1 font-bold">
            {completionPercentage}%
          </Badge>
        </div>
        <Progress value={completionPercentage} className="h-2 mt-3 bg-emerald-400" indicatorClassName="bg-white" />
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {CHECKLIST_ITEMS.map((item) => {
          const isComplete = completionStatus[item.id];
          const isExpanded = expandedItems[item.id];
          
          return (
            <div key={item.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleItem(item.id)}
                className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className="shrink-0">
                  {isComplete ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-slate-900">{item.title}</div>
                  <div className="text-xs text-indigo-600 mt-0.5">{item.description}</div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </button>
              
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 bg-slate-50 border-t animate-in slide-in-from-top-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full justify-start text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  >
                    <FileCheck className="w-4 h-4 mr-2" />
                    {item.action}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}