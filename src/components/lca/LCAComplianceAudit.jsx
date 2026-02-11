import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

export default function LCAComplianceAudit({ studyId, study }) {
  const { data: flows = [] } = useQuery({
    queryKey: ['lca-inventory-flows', studyId],
    queryFn: async () => {
      const all = await base44.entities.LCAInventoryFlow.list();
      return all.filter(f => f.study_id === studyId);
    }
  });

  const checks = [
    {
      id: 'allocation',
      name: 'Allocation Method Defined',
      requirement: 'ISO 14044 requires allocation method definition',
      passed: !!study?.allocation_method && study?.allocation_method !== 'None' ? !!study?.allocation_justification : true,
      details: study?.allocation_method || 'Not defined'
    },
    {
      id: 'data_quality',
      name: 'Data Quality Assessment',
      requirement: 'ISO 14044 requires data quality indicators',
      passed: flows.length > 0 && flows.every(f => f.data_quality_score),
      details: `${flows.filter(f => f.data_quality_score).length}/${flows.length} flows have quality scores`
    },
    {
      id: 'data_source',
      name: 'Primary/Secondary Data Classification',
      requirement: 'ISO 14067 requires data source type indication',
      passed: flows.length > 0 && flows.every(f => f.data_source_type),
      details: `${flows.filter(f => f.data_source_type).length}/${flows.length} flows classified`
    },
    {
      id: 'ghg_scope',
      name: 'GHG Protocol Scope Classification',
      requirement: 'GHG Protocol requires Scope 1, 2, 3 breakdown',
      passed: flows.length > 0 && flows.filter(f => f.ghg_scope).length > 0,
      details: `${flows.filter(f => f.ghg_scope).length}/${flows.length} flows have scope classification`
    },
    {
      id: 'lifecycle_coverage',
      name: 'Full Life Cycle Coverage',
      requirement: 'ISO 14044 requires complete system boundaries',
      passed: study?.includes_packaging && study?.includes_storage && study?.includes_waste_treatment,
      details: [
        study?.includes_packaging ? '✓ Packaging' : '✗ Packaging',
        study?.includes_storage ? '✓ Storage' : '✗ Storage',
        study?.includes_waste_treatment ? '✓ Waste' : '✗ Waste'
      ].join(', ')
    },
    {
      id: 'dataset_attribution',
      name: 'Dataset Source Attribution',
      requirement: 'ISO 14044 requires data source documentation',
      passed: flows.length > 0 && flows.every(f => f.database_source && f.geographic_scope && f.temporal_scope),
      details: `${flows.filter(f => f.database_source && f.geographic_scope).length}/${flows.length} flows properly attributed`
    }
  ];

  const passedChecks = checks.filter(c => c.passed).length;
  const complianceScore = Math.round((passedChecks / checks.length) * 100);

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">ISO 14067 & GHG Protocol Compliance</CardTitle>
          <Badge className={
            complianceScore === 100 ? 'bg-emerald-100 text-emerald-700 border-0' :
            complianceScore >= 70 ? 'bg-amber-100 text-amber-700 border-0' :
            'bg-rose-100 text-rose-700 border-0'
          }>
            {complianceScore}% Compliant
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {checks.map(check => (
          <div key={check.id} className="p-3 border border-slate-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {check.passed ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-1">
                  <p className="font-medium text-sm">{check.name}</p>
                  <Badge variant="outline" className="text-xs">
                    {check.passed ? 'Pass' : 'Fail'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 mb-1">{check.requirement}</p>
                <p className="text-xs text-slate-500 italic">{check.details}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}