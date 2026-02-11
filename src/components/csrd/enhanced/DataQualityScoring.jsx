import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, AlertTriangle, TrendingUp, Shield, FileCheck } from "lucide-react";

export default function DataQualityScoring() {
  const { data: dataPoints = [] } = useQuery({
    queryKey: ['csrd-data-points'],
    queryFn: () => base44.entities.CSRDDataPoint.list()
  });

  const { data: materialTopics = [] } = useQuery({
    queryKey: ['csrd-materiality-topics'],
    queryFn: () => base44.entities.CSRDMaterialityTopic.list()
  });

  // Quality scoring algorithm (Coolset & Dcycle-inspired)
  const calculateQualityScore = (dataPoint) => {
    let score = 0;
    const weights = {
      hasValue: 20,
      hasSource: 20,
      hasUnit: 15,
      verification: 30,
      recentData: 15
    };

    // Has value
    if (dataPoint.value !== null && dataPoint.value !== undefined) score += weights.hasValue;

    // Has data source
    if (dataPoint.data_source) score += weights.hasSource;

    // Has unit
    if (dataPoint.unit) score += weights.hasUnit;

    // Verification status
    if (dataPoint.verification_status === 'Externally Assured') score += weights.verification;
    else if (dataPoint.verification_status === 'Internally Verified') score += weights.verification * 0.7;

    // Recent data (within last year)
    if (dataPoint.reporting_year >= new Date().getFullYear() - 1) score += weights.recentData;

    return Math.round(score);
  };

  const scoredDataPoints = dataPoints.map(dp => ({
    ...dp,
    qualityScore: calculateQualityScore(dp)
  }));

  const overallScore = scoredDataPoints.length > 0
    ? Math.round(scoredDataPoints.reduce((sum, dp) => sum + dp.qualityScore, 0) / scoredDataPoints.length)
    : 0;

  const qualityTiers = {
    excellent: scoredDataPoints.filter(dp => dp.qualityScore >= 90).length,
    good: scoredDataPoints.filter(dp => dp.qualityScore >= 70 && dp.qualityScore < 90).length,
    fair: scoredDataPoints.filter(dp => dp.qualityScore >= 50 && dp.qualityScore < 70).length,
    poor: scoredDataPoints.filter(dp => dp.qualityScore < 50).length
  };

  // Data completeness by ESRS
  const esrsStandards = ['ESRS E1', 'ESRS E2', 'ESRS E3', 'ESRS E4', 'ESRS E5', 'ESRS S1', 'ESRS S2', 'ESRS S3', 'ESRS S4', 'ESRS G1'];
  const esrsQuality = esrsStandards.map(std => {
    const stdDataPoints = scoredDataPoints.filter(d => d.esrs_standard === std);
    const avgScore = stdDataPoints.length > 0
      ? Math.round(stdDataPoints.reduce((sum, dp) => sum + dp.qualityScore, 0) / stdDataPoints.length)
      : 0;
    const isMaterial = materialTopics.some(t => t.esrs_standard === std && t.is_material);

    return {
      standard: std,
      avgScore,
      count: stdDataPoints.length,
      isMaterial
    };
  });

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-[#86b027]';
    if (score >= 50) return 'text-amber-600';
    return 'text-rose-600';
  };

  const getScoreBadge = (score) => {
    if (score >= 90) return <Badge className="bg-emerald-500">Excellent</Badge>;
    if (score >= 70) return <Badge className="bg-[#86b027]">Good</Badge>;
    if (score >= 50) return <Badge className="bg-amber-500">Fair</Badge>;
    return <Badge className="bg-rose-500">Needs Improvement</Badge>;
  };

  return (
    <Card className="border-purple-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Data Quality Scoring</CardTitle>
              <p className="text-xs text-slate-600">Comprehensive data quality assessment</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>{overallScore}</p>
            <p className="text-xs text-slate-600">Overall Score</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quality Tiers */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-emerald-50 p-3 rounded-lg text-center border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
            <p className="text-2xl font-bold text-emerald-600">{qualityTiers.excellent}</p>
            <p className="text-xs text-slate-600">Excellent (90+)</p>
          </div>
          <div className="bg-[#86b027]/10 p-3 rounded-lg text-center border border-[#86b027]/30">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-[#86b027]" />
            <p className="text-2xl font-bold text-[#86b027]">{qualityTiers.good}</p>
            <p className="text-xs text-slate-600">Good (70-89)</p>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg text-center border border-amber-200">
            <FileCheck className="w-5 h-5 mx-auto mb-1 text-amber-600" />
            <p className="text-2xl font-bold text-amber-600">{qualityTiers.fair}</p>
            <p className="text-xs text-slate-600">Fair (50-69)</p>
          </div>
          <div className="bg-rose-50 p-3 rounded-lg text-center border border-rose-200">
            <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-rose-600" />
            <p className="text-2xl font-bold text-rose-600">{qualityTiers.poor}</p>
            <p className="text-xs text-slate-600">Poor {'(<50)'}</p>
          </div>
        </div>

        {/* Quality by ESRS */}
        <div>
          <p className="text-sm font-bold text-slate-900 mb-3">Quality Score by ESRS Standard</p>
          <div className="space-y-2">
            {esrsQuality.filter(e => e.isMaterial).map(esrs => (
              <div key={esrs.standard} className="flex items-center gap-3">
                <div className="w-24 text-xs font-medium text-slate-700">{esrs.standard}</div>
                <div className="flex-1">
                  <Progress 
                    value={esrs.avgScore} 
                    className="h-3"
                    indicatorClassName={
                      esrs.avgScore >= 90 ? "bg-emerald-500" :
                      esrs.avgScore >= 70 ? "bg-[#86b027]" :
                      esrs.avgScore >= 50 ? "bg-amber-500" :
                      "bg-rose-500"
                    }
                  />
                </div>
                <div className={`w-12 text-right text-sm font-bold ${getScoreColor(esrs.avgScore)}`}>
                  {esrs.avgScore}
                </div>
                <div className="text-xs text-slate-500 w-16 text-right">
                  {esrs.count} points
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Criteria */}
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4">
            <p className="text-sm font-bold text-slate-900 mb-3">Quality Criteria Breakdown</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#86b027]" />
                <span>Value Provided (20pts)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#02a1e8]" />
                <span>Data Source (20pts)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-600" />
                <span>Unit Specified (15pts)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>Verification (30pts)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-600" />
                <span>Recent Data (15pts)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Improvement Suggestions */}
        {overallScore < 80 && (
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <p className="text-sm font-bold text-amber-900 mb-2">🎯 Improvement Actions</p>
            <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
              {qualityTiers.poor > 0 && <li>Review and enhance {qualityTiers.poor} data points with quality scores below 50</li>}
              {dataPoints.filter(d => d.verification_status === 'Unverified').length > 0 && (
                <li>Get verification for {dataPoints.filter(d => d.verification_status === 'Unverified').length} unverified data points</li>
              )}
              {dataPoints.filter(d => !d.data_source).length > 0 && (
                <li>Add data sources for {dataPoints.filter(d => !d.data_source).length} data points</li>
              )}
            </ul>
          </div>
        )}

        {/* Best Practice Note */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="text-xs font-bold text-blue-900 mb-1">💡 Best Practice</p>
          <p className="text-xs text-blue-800">
            Aim for 90+ quality scores on all material ESRS topics. External assurance is the highest quality indicator 
            and accounts for 30% of the score. TÜV-certified methodologies ensure audit readiness.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}