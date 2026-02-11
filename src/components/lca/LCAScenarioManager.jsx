import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { toast } from "sonner";
import CreateScenarioModal from './CreateScenarioModal';
import ScenarioFlowEditor from './ScenarioFlowEditor';
import LCAScenarioComparison from './LCAScenarioComparison';

export default function LCAScenarioManager({ studyId, study }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const queryClient = useQueryClient();

  const { data: scenarios = [] } = useQuery({
    queryKey: ['lca-scenarios', studyId],
    queryFn: async () => {
      const all = await base44.entities.LCAScenario.list();
      return all.filter(s => s.study_id === studyId);
    }
  });

  const { data: flows = [] } = useQuery({
    queryKey: ['lca-inventory-flows', studyId],
    queryFn: async () => {
      const all = await base44.entities.LCAInventoryFlow.list();
      return all.filter(f => f.study_id === studyId);
    }
  });

  const duplicateStudyMutation = useMutation({
    mutationFn: async (scenarioName) => {
      const loadingToast = toast.loading('Creating scenario and duplicating flows...');
      
      try {
        // Create new scenario
        const scenario = await base44.entities.LCAScenario.create({
          study_id: studyId,
          scenario_name: scenarioName,
          status: 'Draft',
          is_baseline: scenarios.length === 0
        });

        // Duplicate all flows for this scenario with calculations preserved
        const duplicatePromises = flows.map(flow => 
          base44.entities.LCAInventoryFlow.create({
            study_id: studyId,
            scenario_id: scenario.id,
            process_name: flow.process_name,
            lifecycle_stage: flow.lifecycle_stage,
            activity_type: flow.activity_type,
            quantity: flow.quantity,
            unit: flow.unit,
            database_source: flow.database_source,
            dataset_id: flow.dataset_id,
            dataset_name: flow.dataset_name,
            emission_factor_climate: flow.emission_factor_climate,
            emission_factor_water: flow.emission_factor_water,
            emission_factor_acidification: flow.emission_factor_acidification,
            calculated_climate_impact: flow.calculated_climate_impact,
            calculated_water_impact: flow.calculated_water_impact,
            calculated_acidification_impact: flow.calculated_acidification_impact,
            data_quality_indicator: flow.data_quality_indicator,
            geographic_scope: flow.geographic_scope,
            temporal_scope: flow.temporal_scope
          })
        );
        
        await Promise.all(duplicatePromises);
        
        toast.dismiss(loadingToast);
        toast.success(`${flows.length} flows duplicated for new scenario`);
        
        return scenario;
      } catch (error) {
        toast.dismiss(loadingToast);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lca-scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['lca-inventory-flows'] });
      setShowCreateModal(false);
    }
  });

  const calculateScenarioMutation = useMutation({
    mutationFn: async (scenarioId) => {
      const loadingToast = toast.loading('Calculating scenario impacts...');
      
      try {
        // Get all flows for this scenario
        const allFlows = await base44.entities.LCAInventoryFlow.list();
        const scenarioFlows = allFlows.filter(f => f.scenario_id === scenarioId);

        // Calculate totals from actual flow data
        const totals = scenarioFlows.reduce((acc, flow) => ({
          climate: acc.climate + (flow.calculated_climate_impact || 0),
          water: acc.water + (flow.calculated_water_impact || 0),
          acidification: acc.acidification + (flow.calculated_acidification_impact || 0)
        }), { climate: 0, water: 0, acidification: 0 });

        // Calculate improvement vs baseline
        const baseline = scenarios.find(s => s.is_baseline);
        const improvement = baseline?.total_climate_change 
          ? ((baseline.total_climate_change - totals.climate) / baseline.total_climate_change * 100)
          : 0;

        await base44.entities.LCAScenario.update(scenarioId, {
          total_climate_change: totals.climate,
          total_water_use: totals.water,
          total_acidification: totals.acidification,
          improvement_percentage: improvement,
          status: 'Calculated'
        });

        toast.dismiss(loadingToast);
        toast.success(`Calculated: ${totals.climate.toFixed(2)} kg CO₂e`);
      } catch (error) {
        toast.dismiss(loadingToast);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lca-scenarios'] });
    }
  });

  const baseline = scenarios.find(s => s.is_baseline);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#545454]">Scenario Modeling</h3>
          <p className="text-sm text-slate-500">Compare different production scenarios</p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Scenario
        </Button>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-3 gap-4">
        {scenarios.map(scenario => (
          <Card 
            key={scenario.id}
            className={`border-2 cursor-pointer transition-all ${
              scenario.is_baseline 
                ? 'border-blue-300 bg-blue-50/30' 
                : 'border-slate-200 hover:border-emerald-300'
            }`}
            onClick={() => setSelectedScenario(scenario)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">{scenario.scenario_name}</CardTitle>
                  {scenario.is_baseline && (
                    <Badge className="mt-1 bg-blue-100 text-blue-700 border-0 text-xs">
                      Baseline
                    </Badge>
                  )}
                </div>
                <Badge className={
                  scenario.status === 'Calculated' ? 'bg-emerald-100 text-emerald-700 border-0' :
                  'bg-slate-100 text-slate-700 border-0'
                }>
                  {scenario.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {scenario.status === 'Calculated' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Climate Change</span>
                    <span className="font-bold">{scenario.total_climate_change?.toFixed(2)} kg CO₂e</span>
                  </div>
                  {baseline && !scenario.is_baseline && scenario.total_climate_change && baseline.total_climate_change && (
                    <div className="flex items-center gap-1 text-xs">
                      {scenario.total_climate_change < baseline.total_climate_change ? (
                        <>
                          <TrendingDown className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-medium">
                            {((1 - scenario.total_climate_change / baseline.total_climate_change) * 100).toFixed(1)}% reduction
                          </span>
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-3 h-3 text-rose-600" />
                          <span className="text-rose-600 font-medium">
                            {(((scenario.total_climate_change / baseline.total_climate_change) - 1) * 100).toFixed(1)}% increase
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedScenario(scenario);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              ) : (
                <Button 
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    calculateScenarioMutation.mutate(scenario.id);
                  }}
                >
                  <Zap className="w-3 h-3 mr-2" />
                  Calculate Impacts
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        {scenarios.length === 0 && (
          <Card className="border-dashed border-2 border-slate-300 col-span-3">
            <CardContent className="py-12 text-center">
              <Copy className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 mb-2">No scenarios yet</p>
              <p className="text-xs text-slate-400">Create scenarios to compare alternatives</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Scenario Comparison */}
      {scenarios.filter(s => s.status === 'Calculated').length >= 2 && (
        <LCAScenarioComparison scenarios={scenarios} />
      )}

      {/* Flow Editor Modal */}
      {selectedScenario && (
        <ScenarioFlowEditor 
          scenario={selectedScenario}
          studyId={studyId}
          onClose={() => setSelectedScenario(null)}
        />
      )}

      <CreateScenarioModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={(name) => duplicateStudyMutation.mutate(name)}
      />
    </div>
  );
}