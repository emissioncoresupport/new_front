import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Lightbulb, TrendingUp, ArrowRight, Loader2 } from "lucide-react";
import PPWRAIOptimizer from './services/PPWRAIOptimizer';
import { toast } from 'sonner';

export default function PPWRAIRecommendationPanel({ packaging }) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [pfasAlternatives, setPfasAlternatives] = useState(null);

  const handleGenerateRecommendations = async () => {
    setLoading(true);
    try {
      const result = await PPWRAIOptimizer.generateDesignRecommendations(packaging);
      setRecommendations(result);
      toast.success('AI recommendations generated');
    } catch (error) {
      toast.error('Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handlePFASAlternatives = async () => {
    setLoading(true);
    try {
      const result = await PPWRAIOptimizer.suggestPFASAlternatives(packaging);
      setPfasAlternatives(result);
      if (!result.required) {
        toast.success('No PFAS detected - packaging compliant');
      }
    } catch (error) {
      toast.error('Failed to generate alternatives');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'bg-rose-500',
      high: 'bg-amber-500',
      medium: 'bg-blue-500',
      low: 'bg-slate-400'
    };
    return colors[priority] || colors.medium;
  };

  const getDifficultyBadge = (difficulty) => {
    const styles = {
      easy: 'bg-emerald-100 text-emerald-700',
      moderate: 'bg-amber-100 text-amber-700',
      complex: 'bg-rose-100 text-rose-700'
    };
    return <Badge className={styles[difficulty] || styles.moderate}>{difficulty}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card className="border-purple-200 bg-gradient-to-br from-white to-purple-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Sparkles className="w-5 h-5" />
            AI Design Optimization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            AI-powered recommendations to improve compliance, reduce costs, and enhance circularity
          </p>
          
          <div className="flex gap-3">
            <Button 
              onClick={handleGenerateRecommendations}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate Recommendations
            </Button>

            {packaging.contains_pfas && (
              <Button 
                onClick={handlePFASAlternatives}
                disabled={loading}
                variant="outline"
                className="border-rose-300 text-rose-700 hover:bg-rose-50"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                PFAS Alternatives
              </Button>
            )}
          </div>

          {/* Recommendations Display */}
          {recommendations && recommendations.recommendations && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-2">Overall Assessment</h4>
                <p className="text-sm text-slate-700">{recommendations.assessment}</p>
                <div className="mt-3 flex gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Improvement Potential:</span>
                    <span className="ml-2 font-bold text-purple-700">
                      +{recommendations.improvement_potential}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Est. ROI:</span>
                    <span className="ml-2 font-bold text-emerald-700">
                      {recommendations.roi_months} months
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {recommendations.recommendations.map((rec, idx) => (
                  <div 
                    key={idx}
                    className="p-4 bg-white rounded-lg border border-slate-200 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(rec.priority)}`} />
                        <h4 className="font-semibold text-slate-900">{rec.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{rec.category}</Badge>
                        {getDifficultyBadge(rec.implementation_difficulty)}
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-3">{rec.description}</p>
                    
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      {rec.impact_recycled_content > 0 && (
                        <div className="p-2 bg-emerald-50 rounded">
                          <span className="text-slate-600">PCR Impact:</span>
                          <span className="ml-1 font-bold text-emerald-700">
                            +{rec.impact_recycled_content}%
                          </span>
                        </div>
                      )}
                      {rec.impact_recyclability > 0 && (
                        <div className="p-2 bg-blue-50 rounded">
                          <span className="text-slate-600">Recyclability:</span>
                          <span className="ml-1 font-bold text-blue-700">
                            +{rec.impact_recyclability}
                          </span>
                        </div>
                      )}
                      {rec.impact_weight && (
                        <div className="p-2 bg-purple-50 rounded">
                          <span className="text-slate-600">Weight:</span>
                          <span className="ml-1 font-bold text-purple-700">
                            {rec.impact_weight}%
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {rec.estimated_cost && (
                      <p className="text-xs text-slate-500 mt-2">
                        Cost: {rec.estimated_cost}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PFAS Alternatives */}
          {pfasAlternatives && pfasAlternatives.required && pfasAlternatives.alternatives && (
            <div className="mt-6 space-y-3">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
                <h4 className="font-semibold text-rose-900 mb-2">
                  PFAS-Free Alternatives (Critical - Banned 2026)
                </h4>
                <p className="text-sm text-slate-700 mb-3">{pfasAlternatives.transition_timeline}</p>
              </div>

              {pfasAlternatives.alternatives.map((alt, idx) => (
                <div 
                  key={idx}
                  className="p-4 bg-white rounded-lg border-2 border-emerald-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-slate-900">{alt.material_name}</h4>
                    <Badge className={alt.food_contact_approved ? 'bg-emerald-500' : 'bg-slate-400'}>
                      {alt.food_contact_approved ? 'Food Safe' : 'Industrial'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{alt.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                    <div>
                      <span className="text-slate-500">Performance:</span>
                      <span className="ml-2 text-slate-900">{alt.performance_vs_pfas}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Cost Factor:</span>
                      <span className="ml-2 font-bold text-slate-900">{alt.cost_factor}x</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Availability:</span>
                      <span className="ml-2 text-slate-900">{alt.availability}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Recyclability:</span>
                      <span className="ml-2 text-slate-900">{alt.recyclability_impact}</span>
                    </div>
                  </div>
                  {alt.suppliers && alt.suppliers.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-500">
                        Suppliers: {alt.suppliers.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}