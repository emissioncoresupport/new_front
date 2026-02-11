import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shield, AlertTriangle, CheckCircle, Info, Database, Lock, Server, Globe, TrendingUp, Flag } from 'lucide-react';
import RiskScoreGauge from '../supplylens/RiskScoreGauge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getRiskDataSource } from '../supplylens/RiskEngine';

export default function RiskProfile({ supplier, simple = false }) {
  const riskDimensions = [
    { key: 'location_risk', label: 'Location', color: 'bg-blue-500' },
    { key: 'sector_risk', label: 'Sector', color: 'bg-purple-500' },
    { key: 'human_rights_risk', label: 'Human Rights', color: 'bg-rose-500' },
    { key: 'environmental_risk', label: 'Environmental', color: 'bg-green-500' },
    { key: 'chemical_risk', label: 'Chemical/PFAS', color: 'bg-amber-500' },
    { key: 'mineral_risk', label: 'Minerals', color: 'bg-cyan-500' },
  ];

  if (simple) {
    return (
      <Card className="border-slate-200 h-full">
        <CardContent className="p-6 flex flex-col items-center justify-center h-full">
          <RiskScoreGauge score={supplier.risk_score} size="lg" />
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-500">Current Risk Score</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="font-medium text-slate-900 capitalize">{supplier.risk_level} Risk</span>
            </div>
          </div>
          <div className="w-full mt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Data Completeness</span>
              <span className="font-medium">{supplier.data_completeness}%</span>
            </div>
            <Progress value={supplier.data_completeness} className="h-2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-sky-600" />
          Detailed Risk Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <RiskScoreGauge score={supplier.risk_score} size="md" />
          <div>
            <h4 className="font-semibold text-slate-900">Overall Assessment</h4>
            <p className="text-sm text-slate-600 mt-1">
              Your risk score is calculated based on location, industry sector, and provided documentation.
              Lower scores indicate better compliance and lower risk.
            </p>
          </div>
        </div>

        {/* AI Risk Insights */}
        {(supplier.geopolitical_risk_flag || supplier.financial_risk_flag || supplier.ai_risk_analysis) && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-indigo-50 to-white px-4 py-3 border-b border-indigo-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-600" />
              <h4 className="font-semibold text-slate-800 text-sm">AI Due Diligence Insights</h4>
              {supplier.last_ai_analysis_date && (
                <span className="text-[10px] text-slate-400 ml-auto">
                  Updated: {new Date(supplier.last_ai_analysis_date).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-3">
                {supplier.geopolitical_risk_flag && (
                  <div className="flex-1 bg-rose-50 border border-rose-100 rounded-lg p-3 flex items-start gap-3">
                    <Flag className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-rose-700 uppercase mb-1">Geopolitical Risk</p>
                      <p className="text-xs text-rose-800">
                        Elevated risk detected in operating region. Potential for supply chain disruption due to instability or trade restrictions.
                      </p>
                    </div>
                  </div>
                )}
                {supplier.financial_risk_flag && (
                  <div className="flex-1 bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-700 uppercase mb-1">Financial Instability</p>
                      <p className="text-xs text-amber-800">
                        Indicators of financial distress or negative market sentiment detected in recent reports.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {supplier.ai_risk_analysis && (
                <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 border border-slate-100">
                  <p className="font-medium text-slate-900 mb-1 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-indigo-500" /> Analysis Summary
                  </p>
                  <p className="leading-relaxed text-xs">{supplier.ai_risk_analysis}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h4 className="font-medium text-slate-800">Risk Dimensions & Sources</h4>
          <div className="grid gap-4">
            {riskDimensions.map((dim) => (
              <div key={dim.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">{dim.label}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-slate-300 hover:text-slate-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs font-medium">Source: {getRiskDataSource(dim.key)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className="font-medium text-slate-900">{supplier[dim.key] || 50}/100</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${dim.color}`} 
                    style={{ width: `${supplier[dim.key] || 50}%` }}
                  />
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                   <Database className="w-3 h-3" />
                   <span className="truncate max-w-[300px]">{getRiskDataSource(dim.key)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
           <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
              <Lock className="w-4 h-4" /> Compliance & Data Privacy
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                 <p className="text-xs font-medium text-slate-500 uppercase">Data Residency</p>
                 <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Server className="w-3 h-3 text-slate-400" />
                    EU (Frankfurt) - GDPR Compliant
                 </div>
              </div>
              <div className="space-y-1">
                 <p className="text-xs font-medium text-slate-500 uppercase">Evidence Storage</p>
                 <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Lock className="w-3 h-3 text-slate-400" />
                    AES-256 Encrypted Storage
                 </div>
              </div>
           </div>
           <p className="text-xs text-slate-500 pt-2 border-t border-slate-200">
              All uploaded evidence and certificates are stored in a secure, encrypted environment. Access is strictly logged and restricted to authorized compliance personnel.
           </p>
        </div>

        <div className="p-4 bg-sky-50 rounded-lg border border-sky-100 text-sm text-sky-800 flex gap-3">
          <CheckCircle className="w-5 h-5 shrink-0 text-sky-600" />
          <p>
            Complete outstanding tasks and upload valid certificates to improve your risk score.
            Verified documentation automatically lowers your risk rating.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}