import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Activity } from "lucide-react";

export default function CBAMSystemHealthMonitor() {
  const { data: healthData } = useQuery({
    queryKey: ['cbam-system-health'],
    queryFn: async () => {
      const [entries, reports, priceHistory, suppliers, verifiers] = await Promise.all([
        base44.entities.CBAMEmissionEntry.list(),
        base44.entities.CBAMReport.list(),
        base44.entities.CBAMPriceHistory.list('-date', 1),
        base44.entities.Supplier.filter({ cbam_relevant: true }),
        base44.entities.CBAMVerifier.list()
      ]);

      const now = Date.now();
      const priceAge = priceHistory[0] ? (now - new Date(priceHistory[0].date).getTime()) / 60000 : 999;
      
      return {
        entries_count: entries.length,
        entries_validated: entries.filter(e => e.validation_status === 'validated').length,
        reports_count: reports.length,
        reports_submitted: reports.filter(r => r.status === 'submitted').length,
        ets_price_current: priceHistory[0]?.cbam_certificate_price,
        ets_price_age_minutes: Math.round(priceAge),
        ets_price_fresh: priceAge < 20,
        suppliers_integrated: suppliers.filter(s => s.cbam_relevant).length,
        verifiers_available: verifiers.filter(v => v.accreditation_status === 'active').length
      };
    },
    refetchInterval: 30000 // Refresh every 30s
  });

  const checks = [
    {
      name: 'Entry Validation',
      status: healthData?.entries_validated > 0 ? 'healthy' : 'warning',
      message: `${healthData?.entries_validated || 0}/${healthData?.entries_count || 0} validated`
    },
    {
      name: 'ETS Pricing',
      status: healthData?.ets_price_fresh ? 'healthy' : 'warning',
      message: healthData?.ets_price_current ? 
        `€${healthData.ets_price_current.toFixed(2)} (${healthData.ets_price_age_minutes}m ago)` : 
        'No data'
    },
    {
      name: 'Supplier Integration',
      status: healthData?.suppliers_integrated > 0 ? 'healthy' : 'info',
      message: `${healthData?.suppliers_integrated || 0} suppliers linked`
    },
    {
      name: 'Verifier Network',
      status: healthData?.verifiers_available > 0 ? 'healthy' : 'info',
      message: `${healthData?.verifiers_available || 0} accredited`
    },
    {
      name: 'Report Submissions',
      status: healthData?.reports_submitted > 0 ? 'healthy' : 'info',
      message: `${healthData?.reports_submitted || 0} submitted`
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200/60 shadow-sm p-5">
      <h3 className="text-base font-medium text-slate-900 mb-4">System Health</h3>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {checks.map(check => (
          <div key={check.name} className="bg-slate-50/50 rounded-lg border border-slate-200/60 p-3">
            <div className="flex items-center gap-2 mb-1">
              {getStatusIcon(check.status)}
              <span className="text-xs font-medium text-slate-700">{check.name}</span>
            </div>
            <div className="text-xs text-slate-600">{check.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}