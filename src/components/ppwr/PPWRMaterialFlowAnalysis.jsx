import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { GitBranch, ArrowRight } from "lucide-react";
import { Sankey } from 'recharts';

export default function PPWRMaterialFlowAnalysis() {
  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const flowData = {
    nodes: [
      { name: 'Virgin Materials' },
      { name: 'Recycled Materials' },
      { name: 'Production' },
      { name: 'Use Phase' },
      { name: 'Waste' },
      { name: 'Recycling' },
      { name: 'Landfill' }
    ],
    links: []
  };

  const totalWeight = packaging.reduce((sum, p) => sum + (p.total_weight_kg || 0), 0);
  const recycledWeight = packaging.reduce((sum, p) => sum + (p.total_weight_kg || 0) * (p.recycled_content_percentage || 0) / 100, 0);

  return (
    <Card className="border-cyan-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-cyan-600" />
          Material Flow Analysis
        </CardTitle>
        <p className="text-sm text-slate-600">Track material flows from sourcing to end-of-life</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg border text-center">
            <div className="text-xs text-slate-500 uppercase mb-1">Virgin Input</div>
            <div className="text-2xl font-bold text-slate-900">
              {(totalWeight - recycledWeight).toFixed(0)} kg
            </div>
          </div>
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
            <div className="text-xs text-emerald-700 uppercase mb-1">Recycled Input</div>
            <div className="text-2xl font-bold text-emerald-900">
              {recycledWeight.toFixed(0)} kg
            </div>
          </div>
          <div className="p-4 bg-white rounded-lg border text-center">
            <div className="text-xs text-slate-500 uppercase mb-1">Total Packaging</div>
            <div className="text-2xl font-bold text-slate-900">
              {totalWeight.toFixed(0)} kg
            </div>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border-2 border-dashed border-slate-300">
          <div className="text-center text-slate-400">
            <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Sankey diagram visualization coming soon</p>
            <p className="text-xs mt-1">Track material flows across the value chain</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-bold text-sm text-slate-800">Flow Summary:</div>
          <div className="flex items-center gap-2 text-sm p-2 bg-white rounded border">
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600">Virgin materials:</span>
            <span className="font-bold">{((totalWeight - recycledWeight) / totalWeight * 100).toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-2 text-sm p-2 bg-emerald-50 rounded border border-emerald-200">
            <ArrowRight className="w-4 h-4 text-emerald-600" />
            <span className="text-emerald-700">Recycled input:</span>
            <span className="font-bold text-emerald-900">{(recycledWeight / totalWeight * 100).toFixed(1)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}