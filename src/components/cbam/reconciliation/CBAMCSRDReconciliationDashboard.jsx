/**
 * CBAM–CSRD Reconciliation Dashboard
 * Read-only visualization of cross-module alignment
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, Info, TrendingUp, Users, DollarSign } from 'lucide-react';
import CBAMCSRDReconciliationService from '../lifecycles/shared/CBAMCSRDReconciliationService';

export default function CBAMCSRDReconciliationDashboard() {
  const [year, setYear] = useState(2026);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    loadReconciliation();
  }, [year]);

  const loadReconciliation = async () => {
    setLoading(true);
    const result = await CBAMCSRDReconciliationService.getReconciliationDashboard(year);
    if (result.success) {
      setDashboard(result.dashboard);
    }
    setLoading(false);
  };

  const generateExplanation = async () => {
    if (!dashboard) return;
    setLoadingAI(true);
    const result = await CBAMCSRDReconciliationService.generateDiscrepancyExplanation(dashboard);
    if (result.success) {
      setAiExplanation(result.explanation);
    }
    setLoadingAI(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-slate-500">Loading reconciliation...</div>
      </div>
    );
  }

  if (!dashboard) return null;

  const statusConfig = {
    ALIGNED: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    PARTIAL: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Info },
    MISALIGNED: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
    INCONSISTENT: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle }
  };

  const config = statusConfig[dashboard.overall_status] || statusConfig.ALIGNED;
  const StatusIcon = config.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light text-slate-900">CBAM–CSRD Reconciliation</h2>
          <p className="text-sm text-slate-500 mt-1">Cross-module alignment analysis · Read-only</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-white/80 backdrop-blur text-sm"
          >
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
            <option value={2028}>2028</option>
          </select>
        </div>
      </div>

      {/* Overall Status */}
      <Card className="border-2 bg-white/60 backdrop-blur">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${config.color} border`}>
              <StatusIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-slate-500 mb-1">Overall Alignment Status</div>
              <div className="text-2xl font-light text-slate-900">{dashboard.overall_status}</div>
              <div className="text-xs text-slate-600 mt-1">{dashboard.action_required}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-light text-slate-900">{dashboard.total_flags}</div>
              <div className="text-xs text-slate-500">Total Flags</div>
              <div className="text-sm text-red-600 font-medium mt-1">{dashboard.high_severity_flags} High</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Explanation */}
      {dashboard.high_severity_flags > 0 && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-700">AI Analysis</CardTitle>
              <Button
                onClick={generateExplanation}
                disabled={loadingAI}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                {loadingAI ? 'Analyzing...' : 'Explain Discrepancies'}
              </Button>
            </div>
          </CardHeader>
          {aiExplanation && (
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-700">{aiExplanation.summary}</p>
              
              {aiExplanation.recommendations?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-600">Recommendations:</div>
                  {aiExplanation.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <Badge variant="outline" className="mt-0.5">{rec.priority}</Badge>
                      <div>
                        <div className="text-slate-700">{rec.action}</div>
                        <div className="text-slate-500 text-xs">{rec.esrs_data_point}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="text-xs text-slate-500 italic mt-3 pt-3 border-t border-blue-200">
                AI-generated explanation. Review and validate before acting.
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Reconciliation Tabs */}
      <Tabs defaultValue="emissions" className="space-y-4">
        <TabsList className="bg-white/80 backdrop-blur border border-slate-200">
          <TabsTrigger value="emissions">Emissions Alignment</TabsTrigger>
          <TabsTrigger value="financial">Financial Reconciliation</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier Concentration</TabsTrigger>
          <TabsTrigger value="horizons">Time Horizons</TabsTrigger>
        </TabsList>

        {/* Emissions Alignment */}
        <TabsContent value="emissions" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-white/60 backdrop-blur">
              <CardContent className="pt-6">
                <div className="text-xs text-slate-500 mb-1">CBAM Total Emissions</div>
                <div className="text-2xl font-light text-slate-900">
                  {dashboard.emissions_alignment?.emissions_cbam_tco2e?.toLocaleString()} tCO₂e
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur">
              <CardContent className="pt-6">
                <div className="text-xs text-slate-500 mb-1">CSRD Scope 3 Cat 1</div>
                <div className="text-2xl font-light text-slate-900">
                  {dashboard.emissions_alignment?.emissions_csrd_scope3_cat1_tco2e?.toLocaleString()} tCO₂e
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur">
              <CardContent className="pt-6">
                <div className="text-xs text-slate-500 mb-1">Delta</div>
                <div className={`text-2xl font-light ${dashboard.emissions_alignment?.emissions_delta_tco2e > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {dashboard.emissions_alignment?.emissions_delta_tco2e > 0 ? '+' : ''}
                  {dashboard.emissions_alignment?.emissions_delta_tco2e?.toLocaleString()} tCO₂e
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {dashboard.emissions_alignment?.delta_percent > 0 ? '+' : ''}
                  {dashboard.emissions_alignment?.delta_percent}%
                </div>
              </CardContent>
            </Card>
          </div>

          {dashboard.emissions_alignment?.flags?.map((flag, idx) => (
            <Alert key={idx} className={flag.severity === 'HIGH' ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium text-sm">{flag.message}</div>
                <div className="text-xs text-slate-600 mt-1">{flag.regulation}</div>
              </AlertDescription>
            </Alert>
          ))}
        </TabsContent>

        {/* Financial Reconciliation */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-white/60 backdrop-blur">
              <CardContent className="pt-6">
                <div className="text-xs text-slate-500 mb-1">CBAM Cost Exposure</div>
                <div className="text-2xl font-light text-slate-900">
                  €{dashboard.financial_alignment?.cbam_cost_exposure_eur?.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {dashboard.financial_alignment?.cbam_certificates_required} certificates @ €{dashboard.financial_alignment?.cbam_ets_price_eur}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur">
              <CardContent className="pt-6">
                <div className="text-xs text-slate-500 mb-1">CSRD Transition Risk</div>
                <div className="text-2xl font-light text-slate-900">
                  €{dashboard.financial_alignment?.csrd_transition_risk_eur?.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  ESRS E1-9 disclosed impact
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur">
              <CardContent className="pt-6">
                <div className="text-xs text-slate-500 mb-1">Financial Delta</div>
                <div className={`text-2xl font-light ${dashboard.financial_alignment?.financial_delta_eur > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {dashboard.financial_alignment?.financial_delta_eur > 0 ? '+' : ''}
                  €{Math.abs(dashboard.financial_alignment?.financial_delta_eur || 0).toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {dashboard.financial_alignment?.financial_delta_percent > 0 ? '+' : ''}
                  {dashboard.financial_alignment?.financial_delta_percent}%
                </div>
              </CardContent>
            </Card>
          </div>

          {dashboard.financial_alignment?.flags?.map((flag, idx) => (
            <Alert key={idx} className={flag.severity === 'HIGH' ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'}>
              <DollarSign className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium text-sm">{flag.message}</div>
                <div className="text-xs text-slate-600 mt-1">{flag.regulation}</div>
              </AlertDescription>
            </Alert>
          ))}
        </TabsContent>

        {/* Supplier Concentration */}
        <TabsContent value="suppliers" className="space-y-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Card className="bg-white/60 backdrop-blur">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-slate-500" />
                  <div>
                    <div className="text-xs text-slate-500">Total Suppliers</div>
                    <div className="text-2xl font-light text-slate-900">
                      {dashboard.supplier_concentration?.total_suppliers}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-slate-500" />
                  <div>
                    <div className="text-xs text-slate-500">Top 10 Concentration</div>
                    <div className="text-2xl font-light text-slate-900">
                      {dashboard.supplier_concentration?.top_10_cost_concentration_pct}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-700">Top Suppliers by Cost Exposure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard.supplier_concentration?.top_10_suppliers?.map((supplier, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 bg-white rounded-lg border border-slate-200">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900">{supplier.supplier_name}</div>
                      <div className="text-xs text-slate-500">{supplier.supplier_country} · {supplier.entries_count} entries</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-900">€{supplier.cost_exposure_eur.toLocaleString()}</div>
                      <div className="text-xs text-slate-500">{supplier.total_certificates_required.toFixed(1)} certs</div>
                    </div>
                    <div>
                      <Badge variant="outline" className="text-xs">
                        DQ: {supplier.data_quality_score}%
                      </Badge>
                    </div>
                    {supplier.risk_flags?.length > 0 && (
                      <div>
                        <Badge className="bg-red-100 text-red-700 text-xs">
                          {supplier.risk_flags.length} risks
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Horizons */}
        <TabsContent value="horizons" className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <Card className="bg-white/60 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-700">CBAM Quarterly Obligations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboard.time_horizon_alignment?.cbam_quarterly_obligations?.map((q, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                      <div className="text-sm text-slate-700">{q.quarter} {year}</div>
                      <div className="text-sm font-medium text-slate-900">
                        {q.certificates.toFixed(0)} certs
                      </div>
                      <Badge variant={q.status === 'submitted' ? 'default' : 'outline'} className="text-xs">
                        {q.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-700">CSRD Time Horizons</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Short-term (1-3 years)</div>
                    <div className="text-sm text-slate-700">
                      {dashboard.time_horizon_alignment?.csrd_horizons?.short_term?.length || 0} goals
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Medium-term (3-5 years)</div>
                    <div className="text-sm text-slate-700">
                      {dashboard.time_horizon_alignment?.csrd_horizons?.medium_term?.length || 0} goals
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Long-term (5+ years)</div>
                    <div className="text-sm text-slate-700">
                      {dashboard.time_horizon_alignment?.csrd_horizons?.long_term?.length || 0} goals
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {dashboard.time_horizon_alignment?.flags?.map((flag, idx) => (
            <Alert key={idx} className="border-red-300 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium text-sm">{flag.message}</div>
                <div className="text-xs text-slate-600 mt-1">{flag.regulation}</div>
              </AlertDescription>
            </Alert>
          ))}
        </TabsContent>
      </Tabs>

      {/* All Flags Summary */}
      {dashboard.all_flags?.length > 0 && (
        <Card className="bg-white/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-700">All Discrepancy Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboard.all_flags.map((flag, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Badge 
                    className={
                      flag.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                      flag.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }
                  >
                    {flag.severity}
                  </Badge>
                  <div className="flex-1">
                    <div className="text-sm text-slate-900">{flag.message}</div>
                    <div className="text-xs text-slate-500 mt-1">{flag.regulation}</div>
                    <div className="text-xs text-slate-400 mt-1">Type: {flag.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regulatory Framework Reference */}
      <div className="text-xs text-slate-400 text-center py-3">
        {dashboard.regulatory_framework} · Generated {new Date(dashboard.generated_at).toLocaleString()}
      </div>
    </div>
  );
}