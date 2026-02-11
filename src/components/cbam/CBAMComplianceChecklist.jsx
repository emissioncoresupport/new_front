import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, FileText } from 'lucide-react';

/**
 * CBAM Compliance Checklist
 * Shows regulatory readiness for 2026
 */
export default function CBAMComplianceChecklist() {
  const { data: entries = [] } = useQuery({
    queryKey: ['cbam-entries'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });
  
  const checklist = [
    {
      id: 'cn_codes',
      label: 'CN codes are 8 digits',
      check: entries.every(e => e.cn_code && e.cn_code.length === 8),
      regulation: 'Art. 4'
    },
    {
      id: 'year_2026',
      label: 'Reporting year ≥ 2026',
      check: entries.every(e => e.reporting_period_year >= 2026),
      regulation: 'Art. 7'
    },
    {
      id: 'functional_units',
      label: 'Functional units defined',
      check: entries.every(e => e.functional_unit),
      regulation: 'Art. 4'
    },
    {
      id: 'production_routes',
      label: 'Production routes for defaults',
      check: entries.filter(e => e.calculation_method === 'Default_values').every(e => e.production_route),
      regulation: 'Chapter 3'
    },
    {
      id: 'installations',
      label: 'Installation linkage for actual data',
      check: entries.filter(e => e.calculation_method === 'actual_values').every(e => e.installation_id),
      regulation: 'Art. 3(1)(c)'
    },
    {
      id: 'free_allocation',
      label: 'Free allocation calculated (97.5% in 2026)',
      check: entries.every(e => e.free_allocation_adjustment !== undefined),
      regulation: 'Art. 31'
    },
    {
      id: 'language',
      label: 'All documents in English',
      check: entries.every(e => !e.language || e.language === 'English' || e.language === 'en'),
      regulation: 'Art. 5(6)'
    },
    {
      id: 'verification',
      label: 'Verification status recorded',
      check: entries.every(e => e.verification_status),
      regulation: 'C(2025) 8150'
    }
  ];
  
  const passed = checklist.filter(c => c.check).length;
  const total = checklist.length;
  const readiness = Math.round((passed / total) * 100);
  
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">2026 Compliance Checklist</h3>
          <p className="text-sm text-slate-500 mt-1">Regulatory readiness assessment</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-light text-slate-900">{readiness}%</p>
          <p className="text-xs text-slate-500">{passed}/{total} passed</p>
        </div>
      </div>
      
      <div className="space-y-3">
        {checklist.map(item => (
          <div key={item.id} className="flex items-start justify-between p-3 bg-slate-50/50 rounded-lg">
            <div className="flex items-start gap-3 flex-1">
              {item.check ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.regulation}</p>
              </div>
            </div>
            <Badge variant={item.check ? 'default' : 'destructive'} className="ml-3">
              {item.check ? 'Pass' : 'Fail'}
            </Badge>
          </div>
        ))}
      </div>
      
      {readiness < 100 && (
        <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200/60 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
            <p className="text-xs text-amber-800">
              <strong>Action required:</strong> Complete all checklist items before May 31, 2026 submission deadline.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}