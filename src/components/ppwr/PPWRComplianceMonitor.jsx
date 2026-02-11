import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { 
  PlayCircle, AlertTriangle, CheckCircle2, TrendingUp, 
  RefreshCw, FileText, Zap, Shield, Loader2 
} from "lucide-react";
import PPWRAutomationEngine from './services/PPWRAutomationEngine';

export default function PPWRComplianceMonitor() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const queryClient = useQueryClient();

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const runComplianceCheck = async () => {
    setIsRunning(true);
    toast.info('Running automated compliance checks...');

    try {
      const batchResults = await PPWRAutomationEngine.runBatchCompliance(packaging);
      setResults(batchResults);
      
      // Update all packaging items with latest compliance status
      for (const item of batchResults.items) {
        await base44.entities.PPWRPackaging.update(item.id, {
          compliance_status: item.status,
          compliance_score: item.score,
          last_compliance_check: new Date().toISOString()
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['ppwr-packaging'] });
      
      toast.success(`Compliance check complete: ${batchResults.compliant} compliant, ${batchResults.critical} critical issues`);
    } catch (error) {
      console.error('Compliance check error:', error);
      toast.error('Compliance check failed');
    } finally {
      setIsRunning(false);
    }
  };

  // Auto-run on mount if no recent check
  useEffect(() => {
    if (packaging.length > 0 && !results) {
      const recentCheck = packaging.some(p => {
        if (!p.last_compliance_check) return false;
        const checkDate = new Date(p.last_compliance_check);
        const daysSince = (Date.now() - checkDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince < 1; // Checked within last 24h
      });
      
      if (!recentCheck) {
        runComplianceCheck();
      }
    }
  }, [packaging.length]);

  const getRiskBadge = (level) => {
    const styles = {
      critical: 'bg-rose-500 text-white',
      high: 'bg-amber-500 text-white',
      medium: 'bg-blue-500 text-white',
      low: 'bg-emerald-500 text-white'
    };
    return <Badge className={styles[level] || styles.medium}>{level}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card className="border-[#86b027]/30 bg-gradient-to-br from-white to-[#86b027]/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#86b027]" />
                Automated Compliance Monitor
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Real-time PPWR compliance checking per Regulation (EU) 2024/1852
              </p>
            </div>
            <Button 
              onClick={runComplianceCheck}
              disabled={isRunning || packaging.length === 0}
              className="bg-[#86b027] hover:bg-[#769c22] text-white"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Run Check
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Results Dashboard */}
      {results && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Card className="border-slate-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Total Checked</p>
                    <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{results.total}</h3>
                  </div>
                  <div className="p-3 bg-slate-100 rounded-xl">
                    <FileText className="w-6 h-6 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-700 uppercase font-bold">Compliant</p>
                    <h3 className="text-3xl font-extrabold text-emerald-700 mt-2">{results.compliant}</h3>
                    <p className="text-xs text-emerald-600 mt-1">
                      {results.total > 0 ? Math.round((results.compliant / results.total) * 100) : 0}%
                    </p>
                  </div>
                  <CheckCircle2 className="w-10 h-10 text-emerald-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-700 uppercase font-bold">Warnings</p>
                    <h3 className="text-3xl font-extrabold text-amber-600 mt-2">{results.warnings}</h3>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-amber-300" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-rose-200 bg-rose-50/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-rose-700 uppercase font-bold">Critical</p>
                    <h3 className="text-3xl font-extrabold text-rose-600 mt-2">{results.critical}</h3>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-rose-300" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Avg Compliance Score */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Average Compliance Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-slate-900">{results.avgScore}/100</span>
                  <Badge className={
                    results.avgScore >= 80 ? 'bg-emerald-500' :
                    results.avgScore >= 60 ? 'bg-amber-500' :
                    'bg-rose-500'
                  }>
                    {results.avgScore >= 80 ? 'Excellent' : results.avgScore >= 60 ? 'Good' : 'Needs Improvement'}
                  </Badge>
                </div>
                <Progress value={results.avgScore} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Issues Breakdown */}
          {results.items.filter(item => item.issues.length > 0 || item.warnings.length > 0).length > 0 && (
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-900">
                  <AlertTriangle className="w-5 h-5" />
                  Issues Detected ({results.items.filter(item => item.issues.length > 0 || item.warnings.length > 0).length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.items
                    .filter(item => item.issues.length > 0 || item.warnings.length > 0)
                    .slice(0, 10)
                    .map((item, idx) => (
                      <div key={idx} className="p-4 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900">{item.name}</h4>
                            {getRiskBadge(item.status.toLowerCase())}
                          </div>
                          <span className="text-sm font-bold text-slate-500">
                            Score: {item.score}/100
                          </span>
                        </div>
                        
                        <div className="space-y-2 mt-3">
                          {item.issues.map((issue, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                                issue.severity === 'critical' ? 'text-rose-600' : 'text-amber-600'
                              }`} />
                              <div>
                                <p className="font-medium text-slate-800">{issue.message}</p>
                                <p className="text-xs text-slate-500 mt-1">{issue.regulation}</p>
                                <p className="text-xs text-[#86b027] font-semibold mt-1">
                                  → {issue.action}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty State */}
      {!results && !isRunning && packaging.length === 0 && (
        <Card className="border-slate-200">
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No Packaging Data
            </h3>
            <p className="text-slate-500 mb-6">
              Add packaging items to run compliance checks
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}