import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Euro, Shield, TrendingUp, Loader2 } from "lucide-react";
import PPWRAIOptimizer from './services/PPWRAIOptimizer';
import { toast } from 'sonner';

export default function PPWRPenaltyRiskDashboard() {
  const [loading, setLoading] = useState(false);
  const [riskAssessments, setRiskAssessments] = useState([]);

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const runRiskAssessment = async () => {
    setLoading(true);
    toast.info('Analyzing penalty risks...');
    
    try {
      const assessments = [];
      
      for (const pkg of packaging) {
        const risk = await PPWRAIOptimizer.assessPenaltyRisk(pkg);
        assessments.push({
          packaging: pkg,
          risk: risk
        });
      }
      
      setRiskAssessments(assessments);
      toast.success('Risk assessment complete');
    } catch (error) {
      console.error('Risk assessment error:', error);
      toast.error('Risk assessment failed');
    } finally {
      setLoading(false);
    }
  };

  const totalFinancialExposure = riskAssessments.reduce(
    (sum, a) => sum + (a.risk.total_financial_exposure_eur || 0), 
    0
  );

  const criticalItems = riskAssessments.filter(a => a.risk.overall_risk_level === 'critical');
  const highItems = riskAssessments.filter(a => a.risk.overall_risk_level === 'high');

  return (
    <div className="space-y-6">
      <Card className="border-rose-200 bg-gradient-to-br from-white to-rose-50/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-rose-900">
                <Shield className="w-5 h-5" />
                Penalty Risk Assessment
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                AI-powered financial exposure analysis
              </p>
            </div>
            <Button 
              onClick={runRiskAssessment}
              disabled={loading || packaging.length === 0}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Run Assessment
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {riskAssessments.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-rose-200 bg-rose-50/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-rose-700 uppercase font-bold">Financial Exposure</p>
                    <h3 className="text-2xl font-extrabold text-rose-600 mt-2">
                      €{totalFinancialExposure.toLocaleString()}
                    </h3>
                  </div>
                  <Euro className="w-10 h-10 text-rose-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-700 uppercase font-bold">Critical Risks</p>
                    <h3 className="text-3xl font-extrabold text-amber-600 mt-2">{criticalItems.length}</h3>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-amber-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-700 uppercase font-bold">High Priority</p>
                    <h3 className="text-3xl font-extrabold text-blue-600 mt-2">{highItems.length}</h3>
                  </div>
                  <TrendingUp className="w-10 h-10 text-blue-300" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Details */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {riskAssessments
                  .filter(a => a.risk.overall_risk_level === 'critical' || a.risk.overall_risk_level === 'high')
                  .sort((a, b) => b.risk.risk_score - a.risk.risk_score)
                  .map((assessment, idx) => (
                    <div 
                      key={idx}
                      className="p-4 bg-white rounded-lg border-2 border-rose-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-slate-900">{assessment.packaging.packaging_name}</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            {assessment.packaging.material_category}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={
                            assessment.risk.overall_risk_level === 'critical' ? 'bg-rose-500' :
                            assessment.risk.overall_risk_level === 'high' ? 'bg-amber-500' :
                            'bg-blue-500'
                          }>
                            {assessment.risk.overall_risk_level}
                          </Badge>
                          <p className="text-sm font-bold text-slate-900 mt-1">
                            Risk Score: {assessment.risk.risk_score}/100
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {assessment.risk.risks.map((risk, i) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-start justify-between mb-1">
                              <p className="font-medium text-slate-800 text-sm">{risk.description}</p>
                              <Badge variant="outline" className="text-xs">{risk.type}</Badge>
                            </div>
                            <p className="text-xs text-slate-600 mb-2">{risk.potential_penalty}</p>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">
                                Likelihood: <span className="font-semibold text-rose-600">{risk.likelihood}</span>
                              </span>
                              <span className="text-slate-500">
                                Impact: <span className="font-bold text-rose-700">
                                  €{risk.financial_impact_eur?.toLocaleString()}
                                </span>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {assessment.risk.immediate_actions && assessment.risk.immediate_actions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-xs font-bold text-slate-700 mb-2">Immediate Actions Required:</p>
                          <ul className="space-y-1">
                            {assessment.risk.immediate_actions.map((action, i) => (
                              <li key={i} className="text-xs text-[#86b027] flex items-start gap-1">
                                <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" />
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {riskAssessments.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No Risk Assessment Yet
            </h3>
            <p className="text-slate-500 mb-6">
              Run penalty risk analysis to identify financial exposure
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}