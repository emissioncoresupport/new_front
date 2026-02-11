import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3 } from "lucide-react";

export default function LCAImpactAssessment({ studyId, study }) {
  const { data: flows = [] } = useQuery({
    queryKey: ['lca-inventory-flows', studyId],
    queryFn: async () => {
      const all = await base44.entities.LCAInventoryFlow.list();
      return all.filter(f => f.study_id === studyId);
    }
  });

  const calculateImpactsByCategory = () => {
    const stages = ['Raw Material Acquisition', 'Production', 'Distribution', 'Use', 'End-of-Life'];
    return stages.map(stage => {
      const stageFlows = flows.filter(f => f.lifecycle_stage === stage);
      return {
        stage,
        climate: stageFlows.reduce((sum, f) => sum + (f.calculated_climate_impact || 0), 0),
        water: stageFlows.reduce((sum, f) => sum + (f.calculated_water_impact || 0), 0),
        acidification: stageFlows.reduce((sum, f) => sum + (f.calculated_acidification_impact || 0), 0)
      };
    });
  };

  const impactsByStage = calculateImpactsByCategory();
  const totalImpacts = impactsByStage.reduce((acc, stage) => ({
    climate: acc.climate + stage.climate,
    water: acc.water + stage.water,
    acidification: acc.acidification + stage.acidification
  }), { climate: 0, water: 0, acidification: 0 });

  const impactCategories = [
    'Climate Change',
    'Ozone Depletion',
    'Human Toxicity',
    'Acidification',
    'Eutrophication Freshwater',
    'Resource Depletion Fossils'
  ];

  return (
    <div className="space-y-6">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            LCIA Results (ISO 14040 Phase 3)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-6">
            Impact assessment using {study.impact_assessment_method}
          </p>

          {flows.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">No inventory flows yet</p>
              <p className="text-xs mt-1">Add flows from LCA databases to calculate impacts</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-xs text-emerald-700 font-medium mb-1">Climate Change</p>
                  <p className="text-2xl font-bold text-emerald-900">{totalImpacts.climate.toFixed(2)}</p>
                  <p className="text-xs text-emerald-600">kg CO₂e</p>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700 font-medium mb-1">Water Use</p>
                  <p className="text-2xl font-bold text-blue-900">{totalImpacts.water.toFixed(2)}</p>
                  <p className="text-xs text-blue-600">m³</p>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700 font-medium mb-1">Acidification</p>
                  <p className="text-2xl font-bold text-amber-900">{totalImpacts.acidification.toFixed(3)}</p>
                  <p className="text-xs text-amber-600">kg SO₂ eq</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-sm text-slate-700">Impact by Life Cycle Stage</h4>
                {impactsByStage.map(stage => {
                  if (stage.climate === 0) return null;
                  const percentage = (stage.climate / totalImpacts.climate * 100).toFixed(1);
                  return (
                    <div key={stage.stage} className="p-3 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{stage.stage}</span>
                        <span className="text-xs text-slate-600">{percentage}% of total</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500">Climate:</span>
                          <span className="font-bold ml-1">{stage.climate.toFixed(2)} kg CO₂e</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Water:</span>
                          <span className="font-bold ml-1">{stage.water.toFixed(2)} m³</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Acid:</span>
                          <span className="font-bold ml-1">{stage.acidification.toFixed(3)} kg SO₂eq</span>
                        </div>
                      </div>
                      <Progress value={parseFloat(percentage)} className="h-1.5 mt-2" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}