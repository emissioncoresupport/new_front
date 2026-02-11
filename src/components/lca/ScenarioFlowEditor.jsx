import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Edit2, Save, X, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export default function ScenarioFlowEditor({ scenario, studyId, onClose }) {
  const [editingFlow, setEditingFlow] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [aiPrediction, setAiPrediction] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const queryClient = useQueryClient();

  const { data: flows = [] } = useQuery({
    queryKey: ['lca-inventory-flows', studyId],
    queryFn: async () => {
      const all = await base44.entities.LCAInventoryFlow.list();
      return all.filter(f => f.study_id === studyId);
    }
  });

  const updateFlowMutation = useMutation({
    mutationFn: async ({ flowId, updates, flow }) => {
      // Recalculate impacts based on new quantity
      const calculated_climate = updates.amount * (flow.emission_factor_climate || 0);
      const calculated_water = updates.amount * (flow.emission_factor_water || 0);
      const calculated_acidification = updates.amount * (flow.emission_factor_acidification || 0);

      return await base44.entities.LCAInventoryFlow.update(flowId, {
        ...updates,
        calculated_climate_impact: calculated_climate,
        calculated_water_impact: calculated_water,
        calculated_acidification_impact: calculated_acidification
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lca-inventory-flows'] });
      queryClient.invalidateQueries({ queryKey: ['lca-scenarios'] });
      toast.success('Flow updated and impacts recalculated');
      setEditingFlow(null);
    }
  });

  const handleEdit = (flow) => {
    setEditingFlow(flow.id);
    setEditValues({
      amount: flow.amount,
      data_quality_rating: flow.data_quality_rating
    });
    setAiPrediction(null);
  };

  const predictImpact = async (flow, newAmount) => {
    setIsPredicting(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Predict the environmental impact change for this inventory flow modification:

Flow: ${flow.flow_name}
Type: ${flow.flow_type}
Current Amount: ${flow.amount} ${flow.unit}
New Amount: ${newAmount} ${flow.unit}
Life Cycle Stage: ${flow.lifecycle_stage}

Calculate the expected change in:
- Climate change (kg CO2 eq)
- Water use (m3)
- Resource depletion (kg Sb eq)
- Acidification (kg SO2 eq)

Return the percentage change and absolute values.`,
        response_json_schema: {
          type: "object",
          properties: {
            climate_change_delta: { type: "number" },
            climate_change_percent: { type: "number" },
            water_use_delta: { type: "number" },
            acidification_delta: { type: "number" },
            recommendation: { type: "string" }
          }
        }
      });
      setAiPrediction(response);
    } catch (error) {
      console.error('Prediction error:', error);
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Scenario: {scenario.scenario_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {flows.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No flows to edit</p>
          ) : (
            flows.map(flow => (
              <div key={flow.id} className="p-3 border border-slate-200 rounded-lg">
                {editingFlow === flow.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{flow.flow_name}</span>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => setEditingFlow(null)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => updateFlowMutation.mutate({
                            flowId: flow.id,
                            updates: editValues,
                            flow: flow
                          })}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Save & Recalculate
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Amount</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="number"
                            step="0.001"
                            value={editValues.amount}
                            onChange={(e) => {
                              const newAmount = parseFloat(e.target.value);
                              setEditValues({
                                ...editValues,
                                amount: newAmount
                              });
                              if (newAmount !== flow.amount) {
                                predictImpact(flow, newAmount);
                              }
                            }}
                            className="h-8"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => predictImpact(flow, editValues.amount)}
                            disabled={isPredicting}
                            className="h-8"
                          >
                            <Sparkles className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Data Quality (1-5)</Label>
                        <Input 
                          type="number"
                          min="1"
                          max="5"
                          value={editValues.data_quality_rating}
                          onChange={(e) => setEditValues({
                            ...editValues,
                            data_quality_rating: parseInt(e.target.value)
                          })}
                          className="h-8"
                        />
                      </div>
                    </div>

                    {isPredicting && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-blue-700">
                          <Sparkles className="w-4 h-4 animate-pulse" />
                          <span>AI analyzing impact...</span>
                        </div>
                        <Progress value={60} className="h-1 mt-2" />
                      </div>
                    )}

                    {aiPrediction && !isPredicting && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-emerald-900">AI Impact Prediction</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            {aiPrediction.climate_change_percent < 0 ? (
                              <TrendingDown className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <TrendingUp className="w-3 h-3 text-rose-600" />
                            )}
                            <span className={aiPrediction.climate_change_percent < 0 ? 'text-emerald-700' : 'text-rose-700'}>
                              Climate: {aiPrediction.climate_change_percent > 0 ? '+' : ''}{aiPrediction.climate_change_percent?.toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-slate-600">
                            Water: {aiPrediction.water_use_delta?.toFixed(2)} m³
                          </div>
                        </div>
                        {aiPrediction.recommendation && (
                          <p className="text-xs text-emerald-800 italic mt-2">
                            {aiPrediction.recommendation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{flow.flow_name}</span>
                        <Badge variant="outline" className="text-xs">{flow.flow_type}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-600">
                        <span>{flow.amount} {flow.unit}</span>
                        <span>•</span>
                        <span>{flow.lifecycle_stage}</span>
                        <span>•</span>
                        <span>DQR: {flow.data_quality_rating}/5</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEdit(flow)}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}