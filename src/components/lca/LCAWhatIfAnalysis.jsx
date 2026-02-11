import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingDown, TrendingUp, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function LCAWhatIfAnalysis({ studyId }) {
  const [parameters, setParameters] = useState({
    materialReduction: 0,
    energyEfficiency: 0,
    recycledContent: 0,
    transportDistance: 0
  });
  const [liveImpacts, setLiveImpacts] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const { data: flows = [] } = useQuery({
    queryKey: ['lca-inventory-flows', studyId],
    queryFn: async () => {
      const all = await base44.entities.LCAInventoryFlow.list();
      return all.filter(f => f.study_id === studyId);
    }
  });

  const calculateLiveImpact = async () => {
    setIsCalculating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Calculate real-time LCA impact based on these parameter changes:

Material Reduction: ${parameters.materialReduction}%
Energy Efficiency Improvement: ${parameters.energyEfficiency}%
Recycled Content: ${parameters.recycledContent}%
Transport Distance Reduction: ${parameters.transportDistance}%

Current inventory has ${flows.length} flows.

Return predicted impacts:`,
        response_json_schema: {
          type: "object",
          properties: {
            climate_change: { type: "number" },
            climate_change_reduction: { type: "number" },
            water_use: { type: "number" },
            water_use_reduction: { type: "number" },
            cost_saving_estimate: { type: "number" },
            feasibility_score: { type: "number" }
          }
        }
      });
      setLiveImpacts(response);
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error('Failed to calculate impacts');
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    const hasChanges = Object.values(parameters).some(v => v !== 0);
    if (hasChanges) {
      const timer = setTimeout(() => {
        calculateLiveImpact();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [parameters]);

  const resetParameters = () => {
    setParameters({
      materialReduction: 0,
      energyEfficiency: 0,
      recycledContent: 0,
      transportDistance: 0
    });
    setLiveImpacts(null);
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            What-If Analysis
          </CardTitle>
          <Button 
            size="sm" 
            variant="outline"
            onClick={resetParameters}
          >
            <RotateCcw className="w-3 h-3 mr-2" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Parameter Controls */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Material Reduction</Label>
                <Badge variant="outline">{parameters.materialReduction}%</Badge>
              </div>
              <Slider
                value={[parameters.materialReduction]}
                onValueChange={([v]) => setParameters({...parameters, materialReduction: v})}
                max={50}
                step={5}
                className="py-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Energy Efficiency</Label>
                <Badge variant="outline">{parameters.energyEfficiency}%</Badge>
              </div>
              <Slider
                value={[parameters.energyEfficiency]}
                onValueChange={([v]) => setParameters({...parameters, energyEfficiency: v})}
                max={70}
                step={5}
                className="py-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Recycled Content</Label>
                <Badge variant="outline">{parameters.recycledContent}%</Badge>
              </div>
              <Slider
                value={[parameters.recycledContent]}
                onValueChange={([v]) => setParameters({...parameters, recycledContent: v})}
                max={100}
                step={10}
                className="py-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Transport Distance Reduction</Label>
                <Badge variant="outline">{parameters.transportDistance}%</Badge>
              </div>
              <Slider
                value={[parameters.transportDistance]}
                onValueChange={([v]) => setParameters({...parameters, transportDistance: v})}
                max={80}
                step={10}
                className="py-2"
              />
            </div>
          </div>

          {/* Live Impact Display */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className={`w-4 h-4 ${isCalculating ? 'animate-pulse text-amber-500' : 'text-slate-400'}`} />
              <span className="text-sm font-medium text-slate-700">Live Impact Prediction</span>
            </div>

            {liveImpacts ? (
              <div className="space-y-3">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-emerald-900">Climate Change</span>
                    <div className="flex items-center gap-1">
                      <TrendingDown className="w-4 h-4 text-emerald-600" />
                      <span className="text-lg font-bold text-emerald-600">
                        -{liveImpacts.climate_change_reduction?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-800">
                    {liveImpacts.climate_change?.toFixed(2)} kg CO₂e
                  </p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Water Use</span>
                    <div className="flex items-center gap-1">
                      <TrendingDown className="w-4 h-4 text-blue-600" />
                      <span className="text-lg font-bold text-blue-600">
                        -{liveImpacts.water_use_reduction?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-blue-800">
                    {liveImpacts.water_use?.toFixed(2)} m³
                  </p>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-900">Feasibility Score</span>
                    <span className="text-lg font-bold text-purple-600">
                      {liveImpacts.feasibility_score}/10
                    </span>
                  </div>
                </div>

                {liveImpacts.cost_saving_estimate && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800">
                      💰 Estimated cost savings: €{liveImpacts.cost_saving_estimate?.toLocaleString()}/year
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <p className="text-sm">Adjust parameters to see live predictions</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}