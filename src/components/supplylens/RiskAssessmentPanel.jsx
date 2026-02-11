import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw, AlertTriangle, CheckCircle, Loader2, 
  TrendingUp, TrendingDown, Minus, Zap, Shield, BrainCircuit,
  Info, Database, Lock
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { 
  recalculateSupplierRisk, 
  updateSupplierRiskAndGenerateAlerts,
  runFullRiskAssessment,
  performProactiveMonitoring,
  getRiskDataSource
} from './RiskEngine';
import RiskBadge from "./RiskBadge";
import RiskScoreGauge from "./RiskScoreGauge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const riskDimensions = [
  { key: 'location_risk', label: 'Location', color: 'bg-gradient-to-r from-blue-500 to-blue-400' },
  { key: 'sector_risk', label: 'Sector', color: 'bg-gradient-to-r from-purple-500 to-purple-400' },
  { key: 'human_rights_risk', label: 'Human Rights', color: 'bg-gradient-to-r from-rose-500 to-rose-400' },
  { key: 'environmental_risk', label: 'Environmental', color: 'bg-gradient-to-r from-emerald-500 to-emerald-400' },
  { key: 'chemical_risk', label: 'Chemical/PFAS', color: 'bg-gradient-to-r from-amber-500 to-amber-400' },
  { key: 'mineral_risk', label: 'Minerals', color: 'bg-gradient-to-r from-cyan-500 to-cyan-400' },
  { key: 'performance_risk', label: 'Performance', color: 'bg-gradient-to-r from-orange-500 to-orange-400' }
];

export default function RiskAssessmentPanel({ 
  supplier, 
  suppliers, 
  sites, 
  tasks, 
  onRefresh 
}) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [isRunningFull, setIsRunningFull] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [monitoringResult, setMonitoringResult] = useState(null);

  const handleRecalculate = async () => {
    setIsCalculating(true);
    const toastId = toast.loading('Recalculating risk scores...');
    try {
      const result = await updateSupplierRiskAndGenerateAlerts(
        supplier.id, suppliers, sites, tasks
      );
      setLastResult(result);
      toast.dismiss(toastId);
      toast.success(
        result.alerts.length > 0 
          ? `✓ Risk updated. ${result.alerts.length} alert(s) generated.`
          : '✓ Risk scores recalculated successfully.'
      );
      onRefresh?.();
    } catch (error) {
      toast.dismiss(toastId);
      toast.error('Failed to recalculate risk');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleRunDueDiligence = async () => {
    setIsAnalyzing(true);
    const toastId = toast.loading('Running deep risk analysis...');
    try {
      const result = await performProactiveMonitoring(supplier);
      setMonitoringResult(result);
      toast.dismiss(toastId);
      if (result.newAlerts.length > 0) {
        toast.warning(`${result.newAlerts.length} risk alerts generated from analysis`);
        onRefresh?.();
      } else {
        toast.success("✓ Analysis complete. No significant new risks found.");
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getTrendIcon = () => {
    if (!lastResult?.riskData) return null;
    const diff = lastResult.riskData.risk_score - (lastResult.riskData.previous_score || 0);
    if (diff > 0) return <TrendingUp className="w-4 h-4 text-rose-500" />;
    if (diff < 0) return <TrendingDown className="w-4 h-4 text-emerald-500" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="space-y-4">
      {/* Hero Risk Score - Tesla Minimalist */}
      <div className="relative bg-white/60 backdrop-blur-3xl rounded-2xl border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-transparent to-[#86b027]/5"></div>
        <div className="relative p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/80 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-sm">
                <Shield className="w-7 h-7 text-[#86b027]" />
              </div>
              <div>
                <h3 className="text-2xl font-extralight tracking-tight text-slate-900">Risk Assessment</h3>
                <p className="text-xs text-slate-600 font-medium mt-1">Real-time risk evaluation</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRecalculate}
                disabled={!supplier?.id || isCalculating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/80 backdrop-blur-md border border-[#86b027]/20 text-[#86b027] hover:bg-[#86b027]/10 hover:border-[#86b027]/40 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span className="text-sm font-medium">Recalculate</span>
              </button>
              <button
                type="button"
                onClick={handleRunDueDiligence}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/80 backdrop-blur-md border border-[#02a1e8]/20 text-[#02a1e8] hover:bg-[#02a1e8]/10 hover:border-[#02a1e8]/40 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                <span className="text-sm font-medium">Deep Analysis</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <RiskScoreGauge score={supplier.risk_score} size="lg" />
              <p className="text-xs text-slate-600 mt-4 font-medium uppercase tracking-wider">Overall Score</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center mb-3">
                <RiskBadge level={supplier.risk_level} />
              </div>
              <p className="text-xs text-slate-600 font-medium uppercase tracking-wider">Risk Level</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-extralight text-slate-900 mb-2">
                {supplier.data_completeness || 0}<span className="text-2xl text-slate-500">%</span>
              </div>
              <p className="text-xs text-slate-600 font-medium uppercase tracking-wider">Data Quality</p>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Dimensions - Minimal Grid */}
      <div className="bg-white/60 backdrop-blur-3xl rounded-2xl border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6">
        <h3 className="text-sm font-medium text-slate-900 mb-5 uppercase tracking-wider">Risk Dimensions</h3>
        <div className="grid grid-cols-2 gap-4">
          {riskDimensions.map((dim) => (
            <div key={dim.key} className="bg-white/40 backdrop-blur-md rounded-xl border border-white/40 p-5 hover:shadow-md transition-all group cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-600 font-medium uppercase tracking-wide">{dim.label}</span>
                <span className="text-3xl font-extralight text-slate-900">{supplier[dim.key] || 0}</span>
              </div>
              <div className="h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all duration-700 shadow-sm", dim.color)}
                  style={{ width: `${supplier[dim.key] || 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Analysis Results */}
      {monitoringResult && (
        <div className="bg-indigo-50/60 backdrop-blur-2xl rounded-2xl border border-indigo-200/40 shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-indigo-200/60">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-indigo-700" />
            </div>
            <div>
              <h4 className="font-medium text-indigo-900">AI Risk Analysis</h4>
              <p className="text-xs text-indigo-600">Latest assessment results</p>
            </div>
          </div>
          
          {monitoringResult.summary && (
            <p className="text-sm text-slate-700 leading-relaxed mb-4">{monitoringResult.summary}</p>
          )}
          
          {monitoringResult.events && monitoringResult.events.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-indigo-800 uppercase tracking-wider mb-2">Risk Events Identified</p>
              {monitoringResult.events.map((event, i) => (
                <div key={i} className="bg-white/70 backdrop-blur-sm p-3 rounded-xl border border-indigo-200/40">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-slate-900 text-sm">{event.title}</span>
                    <Badge variant="outline" className="text-xs">{event.severity}</Badge>
                  </div>
                  <p className="text-xs text-slate-600">{event.description}</p>
                  <div className="flex justify-between mt-2 text-[10px] text-slate-500">
                    <span>{event.source}</span>
                    <span>{event.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Last Assessment Result */}
      {lastResult && (
        <div className="bg-slate-50/60 backdrop-blur-2xl rounded-2xl border border-slate-200/40 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-700">Last Assessment</span>
            {getTrendIcon()}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Previous:</span>
              <span className="ml-2 font-medium text-slate-900">{lastResult.riskData.previous_score || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500">New:</span>
              <span className="ml-2 font-medium text-slate-900">{lastResult.riskData.risk_score}</span>
            </div>
          </div>
          {lastResult.alerts.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                {lastResult.alerts.length} alert(s) generated
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Sources Footer */}
      <div className="bg-white/40 backdrop-blur-2xl rounded-xl border border-white/30 p-4 space-y-2">
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <Database className="w-3 h-3 text-slate-400" />
          <span>Sources: World Bank WGI, ILO, NACE/SIC, Transparency Int.</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3 h-3 text-slate-300 hover:text-slate-500 transition-colors" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs font-medium max-w-[250px]">
                  Risk scores integrate data from official international databases (World Bank, ILO) combined with internal audit performance.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <Lock className="w-3 h-3 text-slate-400" />
          <span>GDPR Compliant Storage (EU/Frankfurt) • AES-256 Encrypted</span>
        </div>
      </div>
    </div>
  );
}