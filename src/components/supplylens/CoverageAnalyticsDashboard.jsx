import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, CheckCircle, AlertTriangle, Database } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CoverageAnalyticsDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['coverage-metrics'],
    queryFn: async () => {
      const result = await base44.functions.invoke('getCoverageMetrics');
      return result.data.metrics;
    },
    refetchInterval: 300000, // Refresh every 5 minutes
    initialData: {
      total_suppliers: 0,
      overall_quality: 0,
      modules: {
        cbam: { complete: 0, relevant: 0, coverage_pct: 0 },
        eudr: { complete: 0, relevant: 0, coverage_pct: 0 },
        pcf: { complete: 0, relevant: 0, coverage_pct: 0 },
        pfas: { complete: 0, relevant: 0, coverage_pct: 0 },
        eudamed: { complete: 0, relevant: 0, coverage_pct: 0 }
      }
    }
  });

  if (isLoading || !metrics) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-400 font-light">
        Calculating coverage metrics...
      </div>
    );
  }

  const moduleConfig = {
    cbam: { label: 'CBAM', color: 'bg-blue-500', icon: Database },
    eudr: { label: 'EUDR', color: 'bg-green-500', icon: Database },
    pcf: { label: 'PCF', color: 'bg-purple-500', icon: Database },
    pfas: { label: 'PFAS', color: 'bg-orange-500', icon: Database },
    eudamed: { label: 'EUDAMED', color: 'bg-teal-500', icon: Database }
  };

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="bg-white/40 backdrop-blur-xl border-white/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Supplier Data Coverage</CardTitle>
            <Badge className="bg-[#86b027]">
              {metrics.overall_quality}% Average Quality
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-[#86b027]/10 flex items-center justify-center">
                <Database className="w-8 h-8 text-[#86b027]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{metrics.total_suppliers}</p>
                <p className="text-sm text-slate-600">Total Suppliers</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{metrics.overall_quality}%</p>
                <p className="text-sm text-slate-600">Data Quality</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module-by-Module Coverage */}
      <Card className="bg-white/40 backdrop-blur-xl border-white/30">
        <CardHeader>
          <CardTitle>Coverage by Compliance Module</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(metrics.modules).map(([key, data]) => {
            const config = moduleConfig[key];
            const Icon = config.icon;
            
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.color, "text-white")}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{config.label}</p>
                      <p className="text-sm text-slate-600">
                        {data.complete} of {data.relevant} suppliers complete
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={data.coverage_pct >= 80 ? 'default' : data.coverage_pct >= 50 ? 'secondary' : 'destructive'}>
                      {data.coverage_pct}%
                    </Badge>
                    {data.coverage_pct >= 80 ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                </div>
                <Progress value={data.coverage_pct} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="text-amber-900">Data Quality Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-amber-900">
          {Object.entries(metrics.modules).map(([key, data]) => {
            if (data.coverage_pct < 80 && data.relevant > 0) {
              return (
                <div key={key} className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    <strong>{moduleConfig[key].label}:</strong> {data.relevant - data.complete} suppliers missing critical data
                  </span>
                </div>
              );
            }
            return null;
          })}
        </CardContent>
      </Card>
    </div>
  );
}