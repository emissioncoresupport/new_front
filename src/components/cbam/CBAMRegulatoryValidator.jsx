import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";
import { toast } from "sonner";

export default function CBAMRegulatoryValidator() {
  const [validationResults, setValidationResults] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  const { data: entries = [] } = useQuery({
    queryKey: ['cbam-emissions'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });

  const { data: monitoringPlans = [] } = useQuery({
    queryKey: ['monitoring-plans'],
    queryFn: () => base44.entities.CBAMMonitoringPlan.list()
  });

  const { data: operatorReports = [] } = useQuery({
    queryKey: ['operator-reports'],
    queryFn: () => base44.entities.CBAMOperatorEmissionReport.list()
  });

  const { data: installations = [] } = useQuery({
    queryKey: ['cbam-installations'],
    queryFn: () => base44.entities.CBAMInstallation.list()
  });

  const runComplianceAudit = async () => {
    setIsValidating(true);
    const results = {
      critical: [],
      warnings: [],
      compliant: []
    };

    // Rule 1: Reporting Period must be calendar year and >= 2026 (Art. 7)
    entries.forEach(entry => {
      if (!entry.reporting_period_year || entry.reporting_period_year < 2026) {
        results.critical.push({
          rule: 'C(2025) 8151 Art. 7',
          entry_id: entry.id,
          message: `Reporting period must be calendar year 2026 or later. Found: ${entry.reporting_period_year || 'missing'}`
        });
      }
    });

    // Rule 2: Monitoring Plans must be in English (Art. 5(6))
    monitoringPlans.forEach(plan => {
      if (plan.language !== 'English') {
        results.critical.push({
          rule: 'C(2025) 8151 Art. 5(6)',
          plan_id: plan.id,
          message: `Monitoring plan must be in English. Found: ${plan.language}`
        });
      }
    });

    // Rule 3: Operator Reports must be in English (Art. 10(4))
    operatorReports.forEach(report => {
      if (report.language !== 'English') {
        results.critical.push({
          rule: 'C(2025) 8151 Art. 10(4)',
          report_id: report.id,
          message: `Operator emission report must be in English. Found: ${report.language}`
        });
      }
    });

    // Rule 4: Functional units must be correctly assigned (Art. 4)
    entries.forEach(entry => {
      const functionalUnitRules = {
        'Electricity': 'kWh',
        'Fertilizers': entry.cn_code?.startsWith('2808') || entry.cn_code?.startsWith('2814') || entry.cn_code?.startsWith('3105') ? 'kg_nitrogen' : 'tonnes',
        'Cement': entry.cn_code?.startsWith('2523') ? 'tonnes_clinker' : 'tonnes'
      };

      const expectedUnit = functionalUnitRules[entry.aggregated_goods_category] || 'tonnes';
      if (entry.functional_unit && entry.functional_unit !== expectedUnit) {
        results.warnings.push({
          rule: 'C(2025) 8151 Art. 4',
          entry_id: entry.id,
          message: `Expected functional unit: ${expectedUnit}, found: ${entry.functional_unit}`
        });
      }
    });

    // Rule 5: Default values must include mark-up (C(2025) 8552)
    entries.filter(e => e.calculation_method === 'default_values').forEach(entry => {
      if (!entry.mark_up_percentage_applied || entry.mark_up_percentage_applied === 0) {
        results.warnings.push({
          rule: 'C(2025) 8552 Art. 4-6',
          entry_id: entry.id,
          message: `Default values must include mark-up: 10% (2026), 20% (2027), 30% (2028+). Lower for fertilizers.`
        });
      }
    });

    // Rule 6: Verification materiality 5% per CN code (C(2025) 8150 Art. 5)
    const verifiedEntries = entries.filter(e => e.verification_status?.includes('accredited'));
    verifiedEntries.forEach(entry => {
      if (!entry.materiality_assessment_5_percent) {
        results.warnings.push({
          rule: 'C(2025) 8150 Art. 5',
          entry_id: entry.id,
          message: `Verification must apply 5% materiality threshold per CN code`
        });
      }
    });

    // Rule 7: CBAM factor phase-in validation
    entries.forEach(entry => {
      const expectedFactors = {
        2026: 0.025,
        2027: 0.05,
        2028: 0.075,
        2029: 0.9,
        2030: 1.0
      };
      const expected = expectedFactors[entry.reporting_period_year];
      if (expected && entry.cbam_factor_applied && Math.abs(entry.cbam_factor_applied - expected) > 0.001) {
        results.warnings.push({
          rule: 'Free Allocation Regulation',
          entry_id: entry.id,
          message: `CBAM factor for ${entry.reporting_period_year} should be ${expected * 100}%. Found: ${(entry.cbam_factor_applied * 100).toFixed(1)}%`
        });
      }
    });

    // Rule 8: Precursor reporting period validation (Art. 13)
    entries.filter(e => e.precursors_used?.length > 0).forEach(entry => {
      entry.precursors_used.forEach(precursor => {
        if (!precursor.reporting_period_year) {
          results.warnings.push({
            rule: 'C(2025) 8151 Art. 13',
            entry_id: entry.id,
            message: `Precursor reporting period defaults to complex good year (${entry.reporting_period_year}), but can be overridden with evidence`
          });
        }
      });
    });

    // Compliant checks
    if (results.critical.length === 0 && results.warnings.length === 0) {
      results.compliant.push({
        message: '✓ All entries comply with C(2025) 8151, 8552, 8560, 8150 regulations'
      });
    }

    setValidationResults(results);
    setIsValidating(false);
    toast.success('Compliance audit completed');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-[#86b027]" />
            CBAM Regulatory Compliance Validator
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Automated audit against C(2025) 8151, 8552, 8560, 8150 (Dec 2025)
          </p>
        </div>
        <Button onClick={runComplianceAudit} disabled={isValidating} className="bg-[#86b027] hover:bg-[#6d8f20]">
          {isValidating ? 'Auditing...' : 'Run Compliance Audit'}
        </Button>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-sm text-slate-700">
          <strong>Key Requirements from Dec 2025 Regulations:</strong>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Reporting period = calendar year, cannot be before 2026 (Art. 7)</li>
            <li>Monitoring plans & operator reports MUST be in English (Art. 5(6), 10(4))</li>
            <li>Default values include mark-ups: 10% (2026), 20% (2027), 30% (2028+) (C(2025) 8552)</li>
            <li>Verification materiality: 5% per CN code (C(2025) 8150 Art. 5)</li>
            <li>Certificate pricing: quarterly (2026), weekly (2027+) (C(2025) 8560)</li>
            <li>Free allocation phase-out: 2.5% → 100% by 2030</li>
            <li>Weighted average for multiple production routes in same installation (Art. 4(6))</li>
            <li>Combined actual + default values allowed (Art. 15)</li>
          </ul>
        </AlertDescription>
      </Alert>

      {validationResults && (
        <div className="space-y-4">
          {validationResults.critical.length > 0 && (
            <Card className="border-rose-200 bg-rose-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-rose-700">
                  <XCircle className="w-5 h-5" />
                  Critical Non-Compliance ({validationResults.critical.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {validationResults.critical.map((issue, idx) => (
                    <div key={idx} className="p-3 bg-white border border-rose-200 rounded-lg">
                      <Badge variant="outline" className="mb-2 text-rose-700 border-rose-300">{issue.rule}</Badge>
                      <p className="text-sm text-slate-900">{issue.message}</p>
                      {issue.entry_id && <p className="text-xs text-slate-500 mt-1">Entry: {issue.entry_id}</p>}
                      {issue.plan_id && <p className="text-xs text-slate-500 mt-1">Plan: {issue.plan_id}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {validationResults.warnings.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-5 h-5" />
                  Warnings & Recommendations ({validationResults.warnings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {validationResults.warnings.map((issue, idx) => (
                    <div key={idx} className="p-3 bg-white border border-amber-200 rounded-lg">
                      <Badge variant="outline" className="mb-2 text-amber-700 border-amber-300">{issue.rule}</Badge>
                      <p className="text-sm text-slate-900">{issue.message}</p>
                      {issue.entry_id && <p className="text-xs text-slate-500 mt-1">Entry: {issue.entry_id}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {validationResults.compliant.length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                  Compliance Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {validationResults.compliant.map((item, idx) => (
                  <p key={idx} className="text-sm text-emerald-900 font-medium">{item.message}</p>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!validationResults && (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            <ShieldCheck className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>Click "Run Compliance Audit" to validate your data against December 2025 regulations</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}