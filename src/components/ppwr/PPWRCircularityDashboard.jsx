import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Recycle, TrendingUp, Target, Loader2, Sparkles } from "lucide-react";
import PPWRCalculationService from './services/PPWRCalculationService';
import PPWRAIOptimizer from './services/PPWRAIOptimizer';
import { toast } from 'sonner';

export default function PPWRCircularityDashboard() {
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [circularityData, setCircularityData] = useState(null);

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const handleAnalyze = async (pkg) => {
    setAnalyzing(true);
    setSelectedPkg(pkg);
    toast.info('Analyzing circular economy potential...');

    try {
      // Calculate basic circularity score
      const basicScore = PPWRCalculationService.calculateCircularityScore(pkg);
      
      // Get AI insights
      const aiAnalysis = await PPWRAIOptimizer.analyzeCircularityPotential(pkg);
      
      setCircularityData({
        basic: basicScore,
        ai: aiAnalysis
      });
      
      // Update packaging with circularity score
      await base44.entities.PPWRPackaging.update(pkg.id, {
        circularity_score: basicScore.total_score
      });
      
      toast.success('Circularity analysis complete');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const avgCircularity = packaging.length > 0
    ? packaging.reduce((sum, p) => sum + (p.circularity_score || 0), 0) / packaging.length
    : 0;

  return (
    <div className="space-y-6">
      <Card className="border-[#86b027]/30 bg-gradient-to-br from-white to-[#86b027]/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#86b027]">
            <Recycle className="w-5 h-5" />
            Circular Economy Performance
          </CardTitle>
          <p className="text-sm text-slate-500">
            AI-powered circularity scoring and optimization insights
          </p>
        </CardHeader>
      </Card>

      {/* Overall Score */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/30 to-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Portfolio Circularity Score</h3>
            <Badge className={
              avgCircularity >= 70 ? 'bg-emerald-500' :
              avgCircularity >= 50 ? 'bg-amber-500' :
              'bg-rose-500'
            }>
              {avgCircularity >= 70 ? 'Excellent' : avgCircularity >= 50 ? 'Good' : 'Needs Improvement'}
            </Badge>
          </div>
          <div className="flex items-end gap-4">
            <div className="text-6xl font-extrabold text-[#86b027]">
              {Math.round(avgCircularity)}
            </div>
            <div className="flex-1">
              <Progress value={avgCircularity} className="h-4 mb-2" />
              <p className="text-sm text-slate-500">
                Industry benchmark: 55 points
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Packaging List with Analyze */}
      <Card>
        <CardHeader>
          <CardTitle>Packaging Items - Circularity Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {packaging.slice(0, 8).map(pkg => {
              const score = PPWRCalculationService.calculateCircularityScore(pkg);
              
              return (
                <div 
                  key={pkg.id}
                  className="p-4 bg-white rounded-lg border border-slate-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-slate-900">{pkg.packaging_name}</h4>
                        <Badge className={
                          score.grade === 'A' ? 'bg-emerald-500' :
                          score.grade === 'B' ? 'bg-blue-500' :
                          score.grade === 'C' ? 'bg-amber-500' :
                          'bg-rose-500'
                        }>
                          Grade {score.grade}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-5 gap-2 text-xs mt-3">
                        <div className="text-center">
                          <p className="text-slate-500 mb-1">PCR</p>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div 
                              className="bg-emerald-500 h-1.5 rounded-full"
                              style={{ width: `${score.breakdown.recycled_content}%` }}
                            />
                          </div>
                          <p className="font-bold text-slate-900 mt-1">{score.breakdown.recycled_content}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-500 mb-1">Recyclability</p>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div 
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{ width: `${score.breakdown.recyclability}%` }}
                            />
                          </div>
                          <p className="font-bold text-slate-900 mt-1">{score.breakdown.recyclability}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-500 mb-1">Reuse</p>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div 
                              className="bg-purple-500 h-1.5 rounded-full"
                              style={{ width: `${score.breakdown.reusability}%` }}
                            />
                          </div>
                          <p className="font-bold text-slate-900 mt-1">{score.breakdown.reusability}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-500 mb-1">Design</p>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div 
                              className="bg-amber-500 h-1.5 rounded-full"
                              style={{ width: `${score.breakdown.design}%` }}
                            />
                          </div>
                          <p className="font-bold text-slate-900 mt-1">{score.breakdown.design}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-500 mb-1">Safe</p>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div 
                              className="bg-[#86b027] h-1.5 rounded-full"
                              style={{ width: `${score.breakdown.hazard_free}%` }}
                            />
                          </div>
                          <p className="font-bold text-slate-900 mt-1">{score.breakdown.hazard_free}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <div className="text-right">
                        <p className="text-2xl font-extrabold text-[#86b027]">{score.total_score}</p>
                        <p className="text-xs text-slate-500">Circularity</p>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => handleAnalyze(pkg)}
                        disabled={analyzing}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {analyzing && selectedPkg?.id === pkg.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Result */}
      {circularityData && selectedPkg && (
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50/30 to-white">
          <CardHeader>
            <CardTitle className="text-purple-900">
              AI Circularity Analysis: {selectedPkg.packaging_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs text-slate-500 mb-1">Circularity Score</p>
                <p className="text-2xl font-bold text-purple-700">
                  {circularityData.ai.circularity_score}/100
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs text-slate-500 mb-1">MCI</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {circularityData.ai.material_circularity_indicator}/100
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs text-slate-500 mb-1">Recovery Potential</p>
                <p className="text-2xl font-bold text-blue-600">
                  {circularityData.ai.end_of_life_recovery_potential}/100
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs text-slate-500 mb-1">Value Retention</p>
                <p className="text-2xl font-bold text-amber-600">
                  {circularityData.ai.value_retention_score}/100
                </p>
              </div>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">Business Case</h4>
              <p className="text-sm text-slate-700">{circularityData.ai.business_case}</p>
            </div>

            {circularityData.ai.improvement_actions && (
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900">Improvement Actions</h4>
                {circularityData.ai.improvement_actions.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-white rounded-lg border">
                    <Target className="w-4 h-4 text-[#86b027] mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm">{action.action}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{action.impact}</Badge>
                        <Badge variant="outline" className="text-xs">{action.difficulty}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}