import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  TrendingDown, AlertTriangle, MapPin, BarChart3, 
  Search, Shield, CheckCircle2, XCircle
} from "lucide-react";
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

/**
 * Carbon Leakage Risk Assessment Module
 * Per Art. 10b EU ETS Directive + CBAM exposure analysis
 */

export default function CBAMCarbonLeakageModule() {
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [assessment, setAssessment] = useState(null);
  
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });
  
  const { data: entries = [] } = useQuery({
    queryKey: ['cbam-emission-entries'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });
  
  const assessMutation = useMutation({
    mutationFn: async (supplier_id) => {
      const { data } = await base44.functions.invoke('cbamCarbonLeakageAssessor', {
        action: 'assess_supplier',
        params: { supplier_id }
      });
      return data;
    },
    onSuccess: (data) => {
      setAssessment(data);
      toast.success(`Assessment complete - Risk: ${data.risk_tier.toUpperCase()}`);
    },
    onError: () => {
      toast.error('Assessment failed');
    }
  });
  
  const riskColors = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-amber-100 text-amber-700 border-amber-200',
    medium: 'bg-blue-100 text-blue-700 border-blue-200',
    low: 'bg-green-100 text-green-700 border-green-200'
  };
  
  // Aggregate risk by sector
  const sectorRisks = suppliers.reduce((acc, sup) => {
    const nace = sup.nace_code?.substring(0, 4);
    if (!nace) return acc;
    
    if (!acc[nace]) {
      acc[nace] = { count: 0, suppliers: [] };
    }
    acc[nace].count++;
    acc[nace].suppliers.push(sup);
    return acc;
  }, {});
  
  const topRiskSectors = Object.entries(sectorRisks)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);
  
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-[#86b027]" />
            Carbon Leakage Risk Assessment
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            NACE sector analysis per Art. 10b EU ETS + CBAM exposure
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Supplier Selection */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                className="w-full pl-10 pr-4 h-10 border border-slate-200 rounded-lg text-sm"
                value={selectedSupplier || ''}
                onChange={(e) => setSelectedSupplier(e.target.value)}
              >
                <option value="">Select supplier to assess...</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>
                    {sup.legal_name || sup.trade_name} - {sup.nace_code || 'No NACE'}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => selectedSupplier && assessMutation.mutate(selectedSupplier)}
              disabled={!selectedSupplier || assessMutation.isPending}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              {assessMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assessing...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Assess Risk
                </>
              )}
            </Button>
          </div>
          
          {/* Assessment Results */}
          {assessment && (
            <div className={`p-5 border rounded-lg ${riskColors[assessment.risk_tier]}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{assessment.sector_name}</h3>
                  <p className="text-sm mt-1">NACE Code: {assessment.nace_code}</p>
                </div>
                <Badge className={`${riskColors[assessment.risk_tier]} border-0 text-sm px-3 py-1`}>
                  {assessment.risk_tier.toUpperCase()} RISK
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700">Carbon Leakage Risk Score</span>
                    <span className="font-bold">{assessment.risk_score}/100</span>
                  </div>
                  <Progress value={assessment.risk_score} className="h-2" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-slate-600 mb-1">Trade Intensity</div>
                    <div className="font-semibold">{(assessment.trade_intensity * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-slate-600 mb-1">Emission Intensity</div>
                    <div className="font-semibold">{(assessment.emission_intensity * 100).toFixed(1)}%</div>
                  </div>
                </div>
                
                {assessment.cbam_relevant && (
                  <div className="flex items-center gap-2 p-2 bg-white/50 rounded">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium">CBAM Monitoring Required</span>
                  </div>
                )}
                
                {/* Recommendations */}
                {assessment.recommendations && assessment.recommendations.length > 0 && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <h4 className="font-semibold text-sm">Recommendations:</h4>
                    {assessment.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5" />
                        <p className="text-xs text-slate-700">{rec}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Top Risk Sectors */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">High-Risk Sectors in Portfolio</h4>
            <div className="space-y-2">
              {topRiskSectors.map(([nace, data], idx) => (
                <div key={nace} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-bold text-slate-600">{idx + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">NACE {nace}</div>
                      <div className="text-xs text-slate-500">{data.count} suppliers</div>
                    </div>
                  </div>
                  <Badge variant="outline">{data.count}</Badge>
                </div>
              ))}
            </div>
          </div>
          
          {/* Portfolio Overview */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-700">
                {suppliers.filter(s => s.risk_tier === 'critical').length}
              </div>
              <div className="text-xs text-red-600 mt-1">Critical Risk</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-2xl font-bold text-amber-700">
                {suppliers.filter(s => s.risk_tier === 'high' || s.risk_tier === 'strategic').length}
              </div>
              <div className="text-xs text-amber-600 mt-1">High Risk</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-700">
                {suppliers.filter(s => s.cbam_relevant).length}
              </div>
              <div className="text-xs text-green-600 mt-1">CBAM Relevant</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}