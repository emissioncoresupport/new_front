import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { 
  Brain, 
  Satellite, 
  MapPin, 
  FileText, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Shield
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export default function EUDREnhancedRiskAssessment({ 
  ddsData, 
  plots, 
  supplierData, 
  geoFeatures,
  onRiskCalculated 
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [riskResult, setRiskResult] = useState(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      setAnalyzing(true);

      const analysisPrompt = `Conduct comprehensive EUDR risk assessment:

Transaction Details:
- DDS Reference: ${ddsData.dds_reference}
- Commodity: ${ddsData.commodity_description}
- HS Code: ${ddsData.hs_code}
- Quantity: ${ddsData.quantity} ${ddsData.unit}
- Chain of Custody: ${ddsData.chain_of_custody}

Supplier Profile:
- Name: ${supplierData?.legal_name}
- Country: ${supplierData?.country}
- Risk Score: ${supplierData?.risk_score}/100
- Certifications: ${supplierData?.certifications?.length || 0}

Geolocation Analysis:
- Total Plots: ${plots.length}
- Verified Plots: ${plots.filter(p => p.satellite_verification_status === "Pass").length}
- Deforestation Detected: ${plots.filter(p => p.deforestation_detected).length}
- Average NDVI: ${plots.length > 0 ? (plots.reduce((sum, p) => sum + (p.ndvi_current || 0), 0) / plots.length).toFixed(2) : 'N/A'}

Provide detailed assessment with:
1. Overall risk score (0-100)
2. Risk level (Low/Medium/High/Critical)
3. Component scores:
   - Country context (0-100)
   - Geolocation quality (0-100)
   - Satellite verification (0-100)
   - Documentation completeness (0-100)
   - Supplier track record (0-100)
   - Chain of custody integrity (0-100)
4. Deforestation probability (0-100)
5. Key risk factors (array)
6. Mitigation recommendations (array)
7. Compliance confidence (0-100)
8. Detailed reasoning`;

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            overall_risk_score: { type: "number" },
            risk_level: { type: "string" },
            country_context_score: { type: "number" },
            geolocation_quality_score: { type: "number" },
            satellite_verification_score: { type: "number" },
            documentation_score: { type: "number" },
            supplier_track_record_score: { type: "number" },
            chain_of_custody_score: { type: "number" },
            deforestation_probability: { type: "number" },
            key_risk_factors: {
              type: "array",
              items: { type: "string" }
            },
            mitigation_recommendations: {
              type: "array",
              items: { type: "string" }
            },
            compliance_confidence: { type: "number" },
            reasoning: { type: "string" }
          }
        }
      });

      return aiResponse;
    },
    onSuccess: (result) => {
      setRiskResult(result);
      setAnalyzing(false);
      toast.success('Risk assessment complete');
      onRiskCalculated?.(result);
    },
    onError: () => {
      setAnalyzing(false);
      toast.error('Risk assessment failed');
    }
  });

  const radarData = riskResult ? [
    { component: 'Country', score: 100 - riskResult.country_context_score },
    { component: 'Geolocation', score: riskResult.geolocation_quality_score },
    { component: 'Satellite', score: riskResult.satellite_verification_score },
    { component: 'Documents', score: riskResult.documentation_score },
    { component: 'Supplier', score: riskResult.supplier_track_record_score },
    { component: 'Chain', score: riskResult.chain_of_custody_score }
  ] : [];

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50 to-white">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-600" />
            AI-Enhanced Risk Assessment
          </CardTitle>
          <Button
            size="sm"
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzing || plots.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {analyzing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
            ) : (
              <><Brain className="w-4 h-4 mr-2" /> Run Deep Analysis</>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {!riskResult ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
            <Brain className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Click "Run Deep Analysis" for AI-powered multi-factor risk assessment</p>
            <p className="text-xs text-slate-400 mt-1">Analyzes country, satellite, documentation, and chain of custody</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall Score */}
            <div className={`p-6 rounded-xl border-2 ${
              riskResult.risk_level === "Low" ? 'bg-emerald-50 border-emerald-200' :
              riskResult.risk_level === "Medium" ? 'bg-amber-50 border-amber-200' :
              riskResult.risk_level === "High" ? 'bg-rose-50 border-rose-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className={`text-2xl font-bold ${
                    riskResult.risk_level === "Low" ? 'text-emerald-800' :
                    riskResult.risk_level === "Medium" ? 'text-amber-800' :
                    'text-rose-800'
                  }`}>
                    {riskResult.risk_level} Risk
                  </h4>
                  <p className="text-sm text-slate-600 mt-1">{riskResult.reasoning}</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-slate-900">{riskResult.overall_risk_score}</div>
                  <div className="text-xs text-slate-500">Risk Score</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-lg border">
                  <div className="text-xs text-slate-500 mb-1">Deforestation Risk</div>
                  <div className="text-lg font-bold text-rose-600">{riskResult.deforestation_probability}%</div>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <div className="text-xs text-slate-500 mb-1">Compliance Confidence</div>
                  <div className="text-lg font-bold text-emerald-600">{riskResult.compliance_confidence}%</div>
                </div>
              </div>
            </div>

            {/* Radar Chart */}
            <div>
              <h5 className="text-sm font-bold text-slate-700 mb-3">Multi-Factor Analysis</h5>
              <div className="h-[300px] bg-white rounded-lg border p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="component" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Score" dataKey="score" stroke="#86b027" fill="#86b027" fillOpacity={0.6} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Risk Factors */}
            {riskResult.key_risk_factors?.length > 0 && (
              <div>
                <h5 className="text-sm font-bold text-slate-700 mb-2">Key Risk Factors</h5>
                <div className="space-y-2">
                  {riskResult.key_risk_factors.map((factor, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span className="text-slate-700">{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mitigation */}
            {riskResult.mitigation_recommendations?.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Recommended Mitigations
                </h5>
                <ul className="space-y-1">
                  {riskResult.mitigation_recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}