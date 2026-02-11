import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, Sparkles, Loader2, CheckCircle2, 
  AlertTriangle, Target, BarChart3, Zap
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PredictiveLCAEstimator({ productId, product, components }) {
  const [isPredicting, setIsPredicting] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const queryClient = useQueryClient();

  const { data: allProducts = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: allComponents = [] } = useQuery({
    queryKey: ['all-product-components'],
    queryFn: () => base44.entities.ProductComponent.list()
  });

  // Calculate data completeness
  const dataCompleteness = components.length > 0 
    ? (components.filter(c => c.emission_factor && c.co2e_kg).length / components.length) * 100
    : 0;

  const missingDataComponents = components.filter(c => !c.emission_factor || !c.co2e_kg);

  const predictImpact = async () => {
    setIsPredicting(true);
    try {
      // Find similar products with complete data
      const similarProducts = allProducts.filter(p => 
        p.id !== productId &&
        p.category === product.category &&
        p.pcf_co2e > 0 &&
        p.weight_kg > 0
      );

      const similarComponentsData = similarProducts.map(p => {
        const pComponents = allComponents.filter(c => c.product_id === p.id);
        return {
          product_name: p.name,
          category: p.category,
          weight_kg: p.weight_kg,
          total_pcf: p.pcf_co2e,
          component_count: pComponents.length,
          components: pComponents.map(c => ({
            name: c.name,
            material: c.material_type,
            quantity: c.quantity,
            unit: c.unit,
            ef: c.emission_factor,
            co2e: c.co2e_kg
          }))
        };
      });

      const prompt = `
        Predict LCA impact for product with incomplete data using ML-style estimation.
        
        **Target Product:**
        Name: ${product.name}
        Category: ${product.category}
        Weight: ${product.weight_kg || 'Unknown'} kg
        Current Components: ${components.length}
        Complete Data: ${dataCompleteness.toFixed(0)}%
        
        **Missing Data Components:**
        ${JSON.stringify(missingDataComponents.map(c => ({
          name: c.name,
          material: c.material_type,
          quantity: c.quantity,
          unit: c.unit
        })), null, 2)}
        
        **Similar Products (Training Set):**
        ${JSON.stringify(similarComponentsData, null, 2)}
        
        Using regression, analogy, and material-based estimation:
        1. Predict missing emission factors for incomplete components
        2. Estimate total product PCF based on weight, category, and similar products
        3. Calculate confidence intervals and uncertainty ranges
        4. Identify which data points have highest impact on accuracy
        
        Return predictions with statistical confidence measures.
      `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            predicted_total_pcf: { type: "number" },
            confidence_level: { type: "number" },
            uncertainty_range: {
              type: "object",
              properties: {
                min: { type: "number" },
                max: { type: "number" }
              }
            },
            component_predictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  component_id: { type: "string" },
                  component_name: { type: "string" },
                  predicted_ef: { type: "number" },
                  predicted_co2e: { type: "number" },
                  prediction_basis: { type: "string" },
                  confidence: { type: "number" }
                }
              }
            },
            data_priorities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  component_name: { type: "string" },
                  impact_on_accuracy: { type: "string" },
                  priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  reasoning: { type: "string" }
                }
              }
            },
            methodology: { type: "string" },
            similar_products_used: { type: "number" }
          }
        }
      });

      setPrediction(result);
      toast.success(`Prediction complete with ${result.confidence_level}% confidence`);

    } catch (error) {
      console.error('Prediction failed:', error);
      toast.error('Failed to predict LCA impact');
    } finally {
      setIsPredicting(false);
    }
  };

  const applyPredictionsMutation = useMutation({
    mutationFn: async () => {
      if (!prediction) return;

      // Update product with predicted PCF
      await base44.entities.Product.update(productId, {
        pcf_co2e: prediction.predicted_total_pcf,
        notes: (product.notes || '') + `\n\n[AI Prediction] Estimated PCF: ${prediction.predicted_total_pcf.toFixed(2)} kg CO₂e (${prediction.confidence_level}% confidence)\nMethodology: ${prediction.methodology}`
      });

      // Update components with predicted values
      for (const pred of prediction.component_predictions) {
        const component = components.find(c => c.id === pred.component_id);
        if (component && (!component.emission_factor || component.emission_factor === 0)) {
          await base44.entities.ProductComponent.update(pred.component_id, {
            emission_factor: pred.predicted_ef,
            co2e_kg: pred.predicted_co2e,
            data_quality_rating: 2, // Lower DQR for predicted data
            comment: (component.comment || '') + ` [AI Predicted: ${pred.prediction_basis}]`
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-components'] });
      toast.success('Predictions applied to product');
    }
  });

  return (
    <div className="space-y-4">
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-xl border border-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative">
          <div className="p-4 border-b border-white/30 bg-white/20 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-light text-sm text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#86b027]" />
                  Predictive Estimator
                </div>
                <p className="text-xs text-slate-500 font-light mt-0.5">ML-based impact prediction for incomplete data</p>
              </div>
              <Button 
                onClick={predictImpact}
                disabled={isPredicting || components.length === 0}
                size="sm"
                variant="ghost"
                className="rounded-lg hover:bg-white/20 backdrop-blur-sm text-slate-600 font-light h-8"
              >
                {isPredicting ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                    Predicting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 mr-1.5" />
                    Predict Impact
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="p-4 space-y-4">
          {/* Data Completeness */}
          <div>
            <div className="flex items-center justify-between mb-2 text-xs font-light">
              <span className="text-slate-600">Data Completeness</span>
              <span className="font-light text-slate-900">{dataCompleteness.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
              <div className="h-full bg-[#86b027] transition-all" style={{ width: `${dataCompleteness}%` }} />
            </div>
            {dataCompleteness < 100 && (
              <p className="text-[10px] text-slate-500 mt-2 font-light">
                {missingDataComponents.length} components missing emission data - AI can estimate
              </p>
            )}
          </div>

          {/* Prediction Results */}
          {prediction && (
            <div className="space-y-4 pt-4 border-t border-white/30">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/40 backdrop-blur-sm rounded-lg border border-white/60">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-light mb-1">Predicted Total PCF</p>
                  <p className="text-2xl font-extralight text-slate-900">
                    {prediction.predicted_total_pcf.toFixed(2)} <span className="text-sm text-slate-500 font-light">kg CO₂e</span>
                  </p>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-600 font-light">
                      <span>Range:</span>
                      <span>{prediction.uncertainty_range.min.toFixed(1)} - {prediction.uncertainty_range.max.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white/40 backdrop-blur-sm rounded-lg border border-white/60">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-light mb-1">Confidence Level</p>
                  <p className="text-2xl font-extralight text-slate-900">
                    {prediction.confidence_level}%
                  </p>
                  <p className="text-[10px] text-slate-500 mt-2 font-light">
                    Based on {prediction.similar_products_used} similar products
                  </p>
                </div>
              </div>

              {/* Component Predictions */}
              {prediction.component_predictions.length > 0 && (
                <div>
                  <p className="text-xs font-light text-slate-700 mb-2">Component Predictions</p>
                  <div className="space-y-2">
                    {prediction.component_predictions.slice(0, 5).map((pred, idx) => (
                      <div key={idx} className="p-2 bg-white/30 backdrop-blur-sm border border-white/60 rounded-lg text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-light text-slate-900">{pred.component_name}</span>
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-light border-slate-200/60 bg-white/40",
                            pred.confidence >= 80 ? 'text-[#86b027] border-[#86b027]/30' :
                            'text-slate-600'
                          )}>
                            {pred.confidence}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 font-light">
                          <div>EF: <span className="font-light text-slate-900">{pred.predicted_ef.toFixed(3)}</span></div>
                          <div>Impact: <span className="font-light text-slate-900">{pred.predicted_co2e.toFixed(3)} kg</span></div>
                        </div>
                        <p className="text-[10px] text-slate-500 italic mt-1 font-light">{pred.prediction_basis}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Collection Priorities */}
              {prediction.data_priorities.length > 0 && (
                <div>
                  <p className="text-xs font-light text-slate-700 mb-2">Data Collection Priorities</p>
                  <div className="space-y-2">
                    {prediction.data_priorities.slice(0, 3).map((priority, idx) => (
                      <div key={idx} className={cn(
                        "p-2 rounded-lg border bg-white/30 backdrop-blur-sm",
                        priority.priority === 'critical' ? 'border-red-300/60' :
                        priority.priority === 'high' ? 'border-amber-300/60' :
                        'border-slate-200/60'
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-light border-slate-200/60 bg-white/40",
                            priority.priority === 'critical' ? 'text-red-600 border-red-300/60' :
                            priority.priority === 'high' ? 'text-amber-600 border-amber-300/60' :
                            'text-slate-600'
                          )}>
                            {priority.priority}
                          </Badge>
                          <span className="font-light text-sm text-slate-900">{priority.component_name}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 font-light">Impact: {priority.impact_on_accuracy}</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-light">{priority.reasoning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => applyPredictionsMutation.mutate()}
                  disabled={applyPredictionsMutation.isPending}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-light h-9"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Apply Predictions
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setPrediction(null)}
                  className="rounded-lg hover:bg-white/20 backdrop-blur-sm font-light"
                >
                  Clear
                </Button>
              </div>

              <div className="relative bg-amber-50/40 backdrop-blur-sm border border-amber-200/60 rounded-lg p-3">
                <div className="flex items-start gap-2 text-[10px] text-slate-600 font-light">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-light text-slate-900 mb-1">Prediction Disclaimer</p>
                    <p>
                      These are AI-estimated values based on similar products and industry patterns. 
                      Replace with primary data for accurate LCA reporting. DQR automatically set to 2/5 for predicted values.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}