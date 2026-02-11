import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  ShieldCheck, AlertTriangle, FileText, Calendar, CheckCircle2,
  TrendingUp, Scale, Globe, Database, Layers, RefreshCw, Info
} from "lucide-react";
import { toast } from "sonner";
import CBAMRegulatoryValidator from './CBAMRegulatoryValidator';
import CBAMCertificatePricingEngine from './CBAMCertificatePricingEngine';

export default function CBAMCompliance2026Dashboard() {
  const [selectedYear, setSelectedYear] = useState(2026);
  const queryClient = useQueryClient();

  const { data: monitoringPlans = [] } = useQuery({
    queryKey: ['monitoring-plans', selectedYear],
    queryFn: () => base44.entities.CBAMMonitoringPlan.filter({ reporting_period_year: selectedYear })
  });

  const { data: operatorReports = [] } = useQuery({
    queryKey: ['operator-reports', selectedYear],
    queryFn: () => base44.entities.CBAMOperatorEmissionReport.filter({ reporting_period_year: selectedYear })
  });

  const { data: verificationReports = [] } = useQuery({
    queryKey: ['verification-reports', selectedYear],
    queryFn: () => base44.entities.CBAMVerificationReport.filter({ reporting_period_year: selectedYear })
  });

  const { data: defaultValues = [] } = useQuery({
    queryKey: ['cbam-default-values'],
    queryFn: () => base44.entities.CBAMDefaultValue.list('-last_updated', 100)
  });

  const { data: freeAllocationBenchmarks = [] } = useQuery({
    queryKey: ['free-allocation-benchmarks'],
    queryFn: () => base44.entities.CBAMFreeAllocationBenchmark.list()
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['cbam-emissions'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list('-import_date')
  });

  const complianceMetrics = {
    plansApproved: monitoringPlans.filter(p => p.status === 'approved').length,
    plansPending: monitoringPlans.filter(p => p.status === 'draft' || p.status === 'submitted').length,
    reportsVerified: operatorReports.filter(r => r.verification_status === 'verified').length,
    reportsPending: operatorReports.filter(r => r.verification_status === 'not_verified').length,
    siteVisitsCompleted: verificationReports.filter(v => v.site_visit_type === 'physical').length,
    virtualVisits: verificationReports.filter(v => v.site_visit_type === 'virtual').length,
    satisfactoryOpinions: verificationReports.filter(v => v.verification_opinion === 'satisfactory').length,
    unsatisfactoryOpinions: verificationReports.filter(v => v.verification_opinion === 'unsatisfactory').length
  };

  // Calculate weighted average default value with mark-up
  const avgDefaultValue2026 = defaultValues.length > 0
    ? defaultValues.reduce((sum, dv) => sum + (dv.total_default_value_2026 || 0), 0) / defaultValues.length
    : 0;

  // Reporting period compliance (Art. 7)
  const entriesWithCorrectPeriod = entries.filter(e => {
    const importYear = e.import_date ? new Date(e.import_date).getFullYear() : null;
    // Default: reporting period = year of import
    return importYear === selectedYear || e.reporting_period_year === selectedYear;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-[#86b027] to-[#6d8f20] rounded-xl shadow-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-[#86b027] to-[#6d8f20] bg-clip-text text-transparent">
              2026 Compliance Dashboard
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Verification, monitoring plans, and audit readiness
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>



      <div className="grid grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[#86b027]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#86b027]/10">
                <FileText className="w-5 h-5 text-[#86b027]" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Monitoring Plans</p>
                <p className="text-2xl font-bold text-slate-900">{complianceMetrics.plansApproved}</p>
                <p className="text-xs text-slate-500">{complianceMetrics.plansPending} pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-100">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Verified Reports</p>
                <p className="text-2xl font-bold text-slate-900">{complianceMetrics.reportsVerified}</p>
                <p className="text-xs text-slate-500">{complianceMetrics.reportsPending} in progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-100">
                <Globe className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Site Visits</p>
                <p className="text-2xl font-bold text-slate-900">{complianceMetrics.siteVisitsCompleted}</p>
                <p className="text-xs text-slate-500">{complianceMetrics.virtualVisits} virtual</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Satisfactory</p>
                <p className="text-2xl font-bold text-slate-900">{complianceMetrics.satisfactoryOpinions}</p>
                <p className="text-xs text-rose-600">
                  {complianceMetrics.unsatisfactoryOpinions} unsatisfactory
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="validator">
        <TabsList>
          <TabsTrigger value="validator">Compliance Audit</TabsTrigger>
          <TabsTrigger value="pricing">Certificate Pricing</TabsTrigger>
          <TabsTrigger value="monitoring-plans">Monitoring Plans ({monitoringPlans.length})</TabsTrigger>
          <TabsTrigger value="operator-reports">Operator Reports ({operatorReports.length})</TabsTrigger>
          <TabsTrigger value="verification">Verification ({verificationReports.length})</TabsTrigger>
          <TabsTrigger value="default-values">Default Values ({defaultValues.length})</TabsTrigger>
          <TabsTrigger value="benchmarks">Free Allocation ({freeAllocationBenchmarks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="validator" className="mt-6">
          <CBAMRegulatoryValidator />
        </TabsContent>

        <TabsContent value="pricing" className="mt-6">
          <CBAMCertificatePricingEngine />
        </TabsContent>


        <TabsContent value="monitoring-plans" className="mt-6">
          <MonitoringPlansView plans={monitoringPlans} />
        </TabsContent>

        <TabsContent value="operator-reports" className="mt-6">
          <OperatorReportsView reports={operatorReports} />
        </TabsContent>

        <TabsContent value="verification" className="mt-6">
          <VerificationReportsView reports={verificationReports} />
        </TabsContent>

        <TabsContent value="default-values" className="mt-6">
          <DefaultValuesView values={defaultValues} />
        </TabsContent>

        <TabsContent value="benchmarks" className="mt-6">
          <FreeAllocationBenchmarksView benchmarks={freeAllocationBenchmarks} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MonitoringPlansView({ plans }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Monitoring Plans</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {plans.map(plan => (
            <div key={plan.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900">{plan.plan_reference}</h4>
                  <p className="text-sm text-slate-600">Year: {plan.reporting_period_year}</p>
                  <p className="text-xs text-slate-500 mt-1">Language: {plan.language}</p>
                </div>
                <Badge className={
                  plan.status === 'approved' ? 'bg-emerald-500' :
                  plan.status === 'submitted' ? 'bg-blue-500' :
                  plan.status === 'requires_revision' ? 'bg-amber-500' : 'bg-slate-400'
                }>
                  {plan.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OperatorReportsView({ reports }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Operator Emission Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {reports.map(report => (
            <div key={report.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900">{report.report_reference}</h4>
                  <p className="text-sm text-slate-600">Reporting Period: {report.reporting_period_year}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Total Emissions: {report.total_installation_emissions?.toFixed(2) || 'N/A'} tCO2e
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline">{report.verification_status}</Badge>
                  {report.submitted_via_registry && (
                    <Badge className="mt-2 bg-blue-100 text-blue-700">Registry</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function VerificationReportsView({ reports }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Verification Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {reports.map(report => (
            <div key={report.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-slate-900">{report.verifier_name}</h4>
                  <p className="text-xs text-slate-500">Year: {report.reporting_period_year}</p>
                </div>
                <Badge className={
                  report.verification_opinion === 'satisfactory' ? 'bg-emerald-500' :
                  report.verification_opinion === 'satisfactory_with_comments' ? 'bg-blue-500' :
                  'bg-rose-500'
                }>
                  {report.verification_opinion}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">Site Visit:</span>
                  <Badge variant="outline" className="ml-2 capitalize">{report.site_visit_type}</Badge>
                </div>
                <div>
                  <span className="text-slate-500">Material Misstatements:</span>
                  <span className={`ml-2 font-semibold ${
                    report.materiality_assessment?.material_misstatements_found ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {report.materiality_assessment?.material_misstatements_found ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DefaultValuesView({ values }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Default Values with Mark-ups</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {values.slice(0, 10).map(dv => (
            <div key={dv.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
              <div className="flex-1">
                <p className="font-medium text-slate-900">{dv.cn_code}</p>
                <p className="text-xs text-slate-600">{dv.country_of_origin} - {dv.aggregated_goods_category}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">
                  {dv.total_default_value_2026?.toFixed(2) || dv.default_direct_emissions?.toFixed(2) || '0.00'} tCO2e/t
                </p>
                <p className="text-xs text-amber-600">+{dv.mark_up_2026 || 10}% mark-up</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FreeAllocationBenchmarksView({ benchmarks }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Free Allocation Benchmarks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {benchmarks.slice(0, 10).map(bm => (
            <div key={bm.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
              <div>
                <p className="font-medium text-slate-900">{bm.cn_code}</p>
                <p className="text-xs text-slate-600">{bm.aggregated_goods_category} - {bm.production_route}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">
                  {bm.cbam_benchmark_2026?.toFixed(2) || 'TBD'} tCO2e/t
                </p>
                <p className="text-xs text-slate-500">Factor: {((bm.cbam_factor_2026 || 0.025) * 100).toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}