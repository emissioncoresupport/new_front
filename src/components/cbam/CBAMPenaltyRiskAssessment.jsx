import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { AlertTriangle, ShieldAlert, Euro, TrendingUp, Loader2, Brain } from "lucide-react";

export default function CBAMPenaltyRiskAssessment() {
  const [riskAssessment, setRiskAssessment] = useState(null);

  const { data: reports = [] } = useQuery({
    queryKey: ['cbam-reports'],
    queryFn: () => base44.entities.CBAMReport.list()
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['cbam-emission-entries'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['cbam-certificates'],
    queryFn: () => base44.entities.CBAMCertificate.list()
  });

  const assessRiskMutation = useMutation({
    mutationFn: async () => {
      toast.loading('Analyzing penalty risk...');

      // Calculate current compliance status
      const draftReports = reports.filter(r => r.status === 'draft').length;
      const lateReports = reports.filter(r => {
        if (!r.submission_date) return false;
        const deadline = new Date(r.year, parseInt(r.period.split('Q')[1]) * 3, 0);
        return new Date(r.submission_date) > deadline;
      }).length;

      const unverifiedEntries = entries.filter(e => 
        e.validation_status === 'pending' || e.validation_status === 'flagged'
      ).length;

      const totalEmissions = entries.reduce((sum, e) => sum + (e.total_embedded_emissions || 0), 0);
      const certsBalance = certificates
        .filter(c => c.status === 'active')
        .reduce((sum, c) => sum + (c.quantity || 0), 0);
      const certShortfall = Math.max(0, Math.ceil(totalEmissions) - certsBalance);

      const prompt = `Assess CBAM penalty risk based on compliance metrics:

Current Status:
- Draft Reports: ${draftReports}
- Late Submissions: ${lateReports}
- Unverified Entries: ${unverifiedEntries}
- Certificate Shortfall: ${certShortfall} units
- Total Emissions: ${totalEmissions} tCO2e

CBAM Penalty Framework (Regulation 2023/956):
- Late reporting: €10-50 per day
- False/incomplete data: €10-50 per tonne CO2e
- Certificate shortage: 3-5x market price (currently ~€80/unit)

Calculate:
1. Overall risk level (Low/Medium/High/Critical)
2. Estimated penalty exposure (EUR)
3. Risk breakdown by category
4. Mitigation recommendations
5. Priority actions`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            risk_level: { type: "string" },
            total_penalty_exposure: { type: "number" },
            risk_breakdown: {
              type: "object",
              properties: {
                late_reporting: { type: "number" },
                data_quality: { type: "number" },
                certificate_shortage: { type: "number" }
              }
            },
            mitigation_actions: {
              type: "array",
              items: { type: "string" }
            },
            priority_actions: {
              type: "array",
              items: { type: "string" }
            },
            timeline_to_compliance: { type: "string" }
          }
        }
      });

      return result;
    },
    onSuccess: (data) => {
      toast.dismiss();
      toast.success('Risk assessment complete');
      setRiskAssessment(data);
    },
    onError: () => {
      toast.dismiss();
      toast.error('Assessment failed');
    }
  });

  const getRiskColor = (level) => {
    switch(level) {
      case 'Low': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Critical': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-rose-200 bg-gradient-to-br from-white to-rose-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            Penalty Risk Assessment
          </CardTitle>
          <p className="text-sm text-slate-600">
            AI-powered analysis of non-compliance risks and penalty exposure
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => assessRiskMutation.mutate()}
            disabled={assessRiskMutation.isPending}
            className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700"
          >
            {assessRiskMutation.isPending ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analyzing...</>
            ) : (
              <><Brain className="w-5 h-5 mr-2" /> Run Risk Assessment</>
            )}
          </Button>

          {riskAssessment && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              {/* Overall Risk */}
              <div className={`p-4 rounded-xl border-2 ${getRiskColor(riskAssessment.risk_level)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6" />
                    <span className="text-xl font-bold">
                      {riskAssessment.risk_level} Risk
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black">
                      €{riskAssessment.total_penalty_exposure.toLocaleString()}
                    </div>
                    <div className="text-xs opacity-70">Potential Exposure</div>
                  </div>
                </div>
                <div className="text-sm mt-2">
                  Timeline to compliance: <strong>{riskAssessment.timeline_to_compliance}</strong>
                </div>
              </div>

              {/* Risk Breakdown */}
              <div className="space-y-3">
                <div className="font-bold text-sm text-slate-800">Risk Breakdown:</div>
                
                <div className="p-3 bg-white rounded-lg border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Late Reporting</span>
                    <span className="font-bold text-orange-600">
                      €{riskAssessment.risk_breakdown.late_reporting.toLocaleString()}
                    </span>
                  </div>
                  <Progress 
                    value={(riskAssessment.risk_breakdown.late_reporting / riskAssessment.total_penalty_exposure) * 100} 
                    className="h-2"
                  />
                </div>

                <div className="p-3 bg-white rounded-lg border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Data Quality Issues</span>
                    <span className="font-bold text-amber-600">
                      €{riskAssessment.risk_breakdown.data_quality.toLocaleString()}
                    </span>
                  </div>
                  <Progress 
                    value={(riskAssessment.risk_breakdown.data_quality / riskAssessment.total_penalty_exposure) * 100} 
                    className="h-2"
                  />
                </div>

                <div className="p-3 bg-white rounded-lg border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Certificate Shortage</span>
                    <span className="font-bold text-rose-600">
                      €{riskAssessment.risk_breakdown.certificate_shortage.toLocaleString()}
                    </span>
                  </div>
                  <Progress 
                    value={(riskAssessment.risk_breakdown.certificate_shortage / riskAssessment.total_penalty_exposure) * 100} 
                    className="h-2"
                  />
                </div>
              </div>

              {/* Priority Actions */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="font-bold text-emerald-900 text-sm mb-3">🎯 Priority Actions:</div>
                <div className="space-y-2">
                  {riskAssessment.priority_actions.map((action, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-emerald-800">
                      <span className="font-bold">{idx + 1}.</span>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mitigation Recommendations */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="font-bold text-blue-900 text-sm mb-3">💡 Mitigation Recommendations:</div>
                <ul className="space-y-1">
                  {riskAssessment.mitigation_actions.map((action, idx) => (
                    <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}