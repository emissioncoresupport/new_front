import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, FileText, 
  Database, Layers, MapPin, Scale, FileCheck, Loader2, Brain,
  Info, ChevronRight, ChevronDown
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ISO14067ComplianceAudit() {
  const [auditResult, setAuditResult] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: components = [] } = useQuery({
    queryKey: ['all-components'],
    queryFn: () => base44.entities.ProductComponent.list()
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const runAuditMutation = useMutation({
    mutationFn: async () => {
      setIsAuditing(true);
      toast.loading('Running ISO 14067:2018 compliance audit...');

      // Prepare comprehensive data summary
      const dataSnapshot = {
        total_products: products.length,
        products_with_pcf: products.filter(p => p.total_co2e_kg > 0).length,
        total_components: components.length,
        components_with_factors: components.filter(c => c.emission_factor).length,
        primary_data_ratio: components.filter(c => c.is_primary_data).length / (components.length || 1),
        avg_dqr: components.reduce((sum, c) => sum + (c.data_quality_rating || 3), 0) / (components.length || 1),
        products_sample: products.slice(0, 3).map(p => ({
          name: p.name,
          system_boundary: p.system_boundary,
          total_co2e: p.total_co2e_kg,
          components_count: components.filter(c => c.product_id === p.id).length
        })),
        components_sample: components.slice(0, 5).map(c => ({
          name: c.name,
          lifecycle_stage: c.lifecycle_stage,
          has_ef: !!c.emission_factor,
          dqr: c.data_quality_rating,
          allocation: c.allocation_method,
          geographic_origin: c.geographic_origin
        }))
      };

      const prompt = `Conduct comprehensive ISO 14067:2018 compliance audit for Product Carbon Footprint system:

DATA SNAPSHOT:
${JSON.stringify(dataSnapshot, null, 2)}

ISO 14067:2018 REQUIREMENTS TO AUDIT:

1. SYSTEM BOUNDARY (Clause 6.4.3)
   - Check if products define cradle-to-gate minimum
   - Verify all relevant lifecycle stages included
   - Check for boundary completeness

2. DATA QUALITY (Clause 6.4.6)
   - Verify Data Quality Rating (DQR) usage
   - Check primary vs secondary data ratio
   - Assess temporal, geographical, technological representativeness

3. ALLOCATION (Clause 6.4.7)
   - Verify allocation methodology (physical, economic)
   - Check if avoided emissions properly handled
   - Validate multi-output process allocation

4. EMISSION FACTORS (Clause 6.4.5)
   - Check data sources (Ecoinvent, CEDA, etc.)
   - Verify factor currency (<5 years)
   - Assess geographic appropriateness

5. TRACEABILITY & DOCUMENTATION (Clause 8)
   - Check if audit trail exists
   - Verify calculation transparency
   - Assess evidence documentation

6. UNCERTAINTY ASSESSMENT (Clause 7.5)
   - Check if uncertainty is quantified
   - Verify monte carlo or pedigree matrix usage

7. GHG PROTOCOL ALIGNMENT
   - Product Standard compliance
   - Scope 3 Category 1 & 11 methodology

8. DATA GAPS
   - Missing emission factors
   - Missing lifecycle stages
   - Incomplete geographic data
   - Missing allocation rules

OUTPUT REQUIREMENTS:
- Overall compliance score (0-100)
- Pass/Fail per requirement category
- Critical gaps list
- Recommendations prioritized (High/Medium/Low)
- Certification readiness assessment

Return detailed structured JSON.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_compliance_score: { type: "number" },
            iso_14067_compliant: { type: "boolean" },
            certification_ready: { type: "boolean" },
            audit_categories: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  clause: { type: "string" },
                  status: { type: "string" },
                  score: { type: "number" },
                  findings: { type: "string" },
                  critical_gaps: { 
                    type: "array", 
                    items: { type: "string" } 
                  }
                }
              }
            },
            critical_gaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  gap: { type: "string" },
                  severity: { type: "string" },
                  impact: { type: "string" },
                  recommendation: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  priority: { type: "string" },
                  action: { type: "string" },
                  expected_impact: { type: "string" }
                }
              }
            },
            data_quality_assessment: {
              type: "object",
              properties: {
                primary_data_percentage: { type: "number" },
                avg_dqr: { type: "number" },
                geographic_coverage: { type: "string" },
                temporal_coverage: { type: "string" }
              }
            },
            next_steps: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      return result;
    },
    onSuccess: (data) => {
      toast.dismiss();
      setAuditResult(data);
      if (data.iso_14067_compliant) {
        toast.success('✅ System is ISO 14067 compliant!');
      } else {
        toast.warning(`⚠️ ${data.critical_gaps.length} critical gaps found`);
      }
      setIsAuditing(false);
    },
    onError: () => {
      toast.dismiss();
      toast.error('Audit failed');
      setIsAuditing(false);
    }
  });

  const getStatusColor = (status) => {
    if (status === 'Pass' || status === 'Compliant') return 'text-emerald-600';
    if (status === 'Partial' || status === 'Warning') return 'text-amber-600';
    return 'text-rose-600';
  };

  const getStatusIcon = (status) => {
    if (status === 'Pass' || status === 'Compliant') return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
    if (status === 'Partial' || status === 'Warning') return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    return <XCircle className="w-5 h-5 text-rose-600" />;
  };

  const getPriorityColor = (priority) => {
    if (priority === 'High' || priority === 'Critical') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (priority === 'Medium') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
            ISO 14067:2018 Compliance Audit
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Comprehensive assessment of PCF data quality, methodology, and certification readiness
          </p>
        </div>
        <Button
          onClick={() => runAuditMutation.mutate()}
          disabled={isAuditing}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg"
          size="lg"
        >
          {isAuditing ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Auditing...</>
          ) : (
            <><Brain className="w-5 h-5 mr-2" /> Run Full Audit</>
          )}
        </Button>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 uppercase font-bold mb-1">Total Products</div>
            <div className="text-2xl font-bold text-slate-900">{products.length}</div>
            <div className="text-xs text-slate-400 mt-1">
              {products.filter(p => p.total_co2e_kg > 0).length} with calculated PCF
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 uppercase font-bold mb-1">BOM Components</div>
            <div className="text-2xl font-bold text-slate-900">{components.length}</div>
            <div className="text-xs text-slate-400 mt-1">
              {components.filter(c => c.emission_factor).length} with emission factors
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 uppercase font-bold mb-1">Primary Data</div>
            <div className="text-2xl font-bold text-slate-900">
              {((components.filter(c => c.is_primary_data).length / (components.length || 1)) * 100).toFixed(0)}%
            </div>
            <Progress 
              value={(components.filter(c => c.is_primary_data).length / (components.length || 1)) * 100} 
              className="h-1 mt-2" 
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 uppercase font-bold mb-1">Avg DQR</div>
            <div className="text-2xl font-bold text-slate-900">
              {(components.reduce((sum, c) => sum + (c.data_quality_rating || 3), 0) / (components.length || 1)).toFixed(1)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {components.filter(c => (c.data_quality_rating || 3) <= 2).length} high quality
            </div>
          </CardContent>
        </Card>
      </div>

      {!auditResult && !isAuditing && (
        <Card className="border-2 border-dashed border-slate-300 bg-slate-50">
          <CardContent className="p-12 text-center">
            <ShieldCheck className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">Ready to Audit</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              Run a comprehensive audit to identify data gaps, methodology issues, and certification readiness
              against ISO 14067:2018 requirements.
            </p>
            <Button
              onClick={() => runAuditMutation.mutate()}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              <Brain className="w-4 h-4 mr-2" />
              Start Compliance Audit
            </Button>
          </CardContent>
        </Card>
      )}

      {auditResult && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          {/* Overall Status Banner */}
          <Card className={`border-2 ${
            auditResult.iso_14067_compliant 
              ? 'bg-emerald-50 border-emerald-300' 
              : 'bg-amber-50 border-amber-300'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {auditResult.iso_14067_compliant ? (
                    <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-12 h-12 text-amber-600" />
                  )}
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {auditResult.iso_14067_compliant ? 'ISO 14067 Compliant ✓' : 'Compliance Gaps Detected'}
                    </h3>
                    <p className="text-sm text-slate-700 mt-1">
                      {auditResult.certification_ready 
                        ? 'System is ready for third-party certification' 
                        : `${auditResult.critical_gaps.length} critical issues require attention`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-black text-slate-900">
                    {auditResult.overall_compliance_score}%
                  </div>
                  <div className="text-xs text-slate-500 uppercase font-bold">Compliance Score</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="categories" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-white border">
              <TabsTrigger value="categories">Requirements</TabsTrigger>
              <TabsTrigger value="gaps">Critical Gaps</TabsTrigger>
              <TabsTrigger value="data-quality">Data Quality</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            {/* Requirements Breakdown */}
            <TabsContent value="categories" className="space-y-3">
              {auditResult.audit_categories.map((cat, idx) => (
                <Card key={idx} className="border-slate-200">
                  <CardHeader className="pb-3">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleSection(cat.category)}
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(cat.status)}
                        <div>
                          <CardTitle className="text-base font-bold text-slate-900">
                            {cat.category}
                          </CardTitle>
                          <p className="text-xs text-slate-500">ISO 14067 {cat.clause}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={
                          cat.score >= 90 ? 'bg-emerald-100 text-emerald-700' :
                          cat.score >= 70 ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }>
                          {cat.score}%
                        </Badge>
                        {expandedSections[cat.category] ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {expandedSections[cat.category] && (
                    <CardContent className="pt-0">
                      <div className="bg-slate-50 p-4 rounded-lg border space-y-3">
                        <div>
                          <div className="text-xs font-bold text-slate-700 uppercase mb-1">Findings:</div>
                          <p className="text-sm text-slate-600">{cat.findings}</p>
                        </div>
                        {cat.critical_gaps?.length > 0 && (
                          <div>
                            <div className="text-xs font-bold text-rose-700 uppercase mb-2">Critical Gaps:</div>
                            <ul className="space-y-1">
                              {cat.critical_gaps.map((gap, i) => (
                                <li key={i} className="text-sm text-rose-600 flex items-start gap-2">
                                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                  {gap}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </TabsContent>

            {/* Critical Gaps */}
            <TabsContent value="gaps" className="space-y-3">
              {auditResult.critical_gaps.length === 0 ? (
                <Card className="bg-emerald-50 border-emerald-200">
                  <CardContent className="p-6 text-center">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600 mb-3" />
                    <h3 className="font-bold text-emerald-900">No Critical Gaps!</h3>
                    <p className="text-sm text-emerald-700 mt-1">Your PCF system meets all essential requirements.</p>
                  </CardContent>
                </Card>
              ) : (
                auditResult.critical_gaps.map((gap, idx) => (
                  <Card key={idx} className={`border-l-4 ${
                    gap.severity === 'Critical' ? 'border-l-rose-500' :
                    gap.severity === 'High' ? 'border-l-orange-500' :
                    'border-l-amber-500'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
                            gap.severity === 'Critical' ? 'text-rose-600' :
                            gap.severity === 'High' ? 'text-orange-600' :
                            'text-amber-600'
                          }`} />
                          <div>
                            <h4 className="font-bold text-slate-900">{gap.gap}</h4>
                            <p className="text-sm text-slate-600 mt-1">{gap.impact}</p>
                          </div>
                        </div>
                        <Badge className={getPriorityColor(gap.priority)}>
                          {gap.severity}
                        </Badge>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="text-xs font-bold text-blue-900 mb-1">📋 Recommended Action:</div>
                        <p className="text-sm text-blue-800">{gap.recommendation}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Data Quality Assessment */}
            <TabsContent value="data-quality" className="space-y-4">
              <Card className="border-indigo-200 bg-gradient-to-br from-white to-indigo-50/30">
                <CardHeader>
                  <CardTitle className="text-base">ISO 14067 Data Quality Assessment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-lg border">
                      <div className="text-xs text-slate-500 uppercase font-bold mb-1">Primary Data Coverage</div>
                      <div className="text-3xl font-bold text-slate-900">
                        {auditResult.data_quality_assessment.primary_data_percentage.toFixed(0)}%
                      </div>
                      <Progress 
                        value={auditResult.data_quality_assessment.primary_data_percentage} 
                        className="h-2 mt-2"
                        indicatorClassName={
                          auditResult.data_quality_assessment.primary_data_percentage >= 70 ? 'bg-emerald-500' :
                          auditResult.data_quality_assessment.primary_data_percentage >= 40 ? 'bg-amber-500' :
                          'bg-rose-500'
                        }
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        {auditResult.data_quality_assessment.primary_data_percentage >= 70 
                          ? '✅ Excellent - Meets ISO requirements' 
                          : '⚠️ Increase primary data for certification'}
                      </p>
                    </div>

                    <div className="p-4 bg-white rounded-lg border">
                      <div className="text-xs text-slate-500 uppercase font-bold mb-1">Average DQR</div>
                      <div className="text-3xl font-bold text-slate-900">
                        {auditResult.data_quality_assessment.avg_dqr.toFixed(1)}/5
                      </div>
                      <div className="flex gap-1 mt-2">
                        {[1, 2, 3, 4, 5].map(star => (
                          <div
                            key={star}
                            className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                              star <= Math.round(auditResult.data_quality_assessment.avg_dqr)
                                ? 'bg-amber-100 text-amber-600'
                                : 'bg-slate-100 text-slate-300'
                            }`}
                          >
                            ★
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        {auditResult.data_quality_assessment.avg_dqr <= 2 
                          ? '✅ High quality data' 
                          : '⚠️ Improve data quality ratings'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-lg border">
                      <div className="text-xs text-slate-500 uppercase font-bold mb-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Geographic Coverage
                      </div>
                      <p className="text-sm font-medium text-slate-700">
                        {auditResult.data_quality_assessment.geographic_coverage}
                      </p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border">
                      <div className="text-xs text-slate-500 uppercase font-bold mb-2 flex items-center gap-1">
                        <Database className="w-3 h-3" /> Temporal Coverage
                      </div>
                      <p className="text-sm font-medium text-slate-700">
                        {auditResult.data_quality_assessment.temporal_coverage}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recommendations */}
            <TabsContent value="recommendations" className="space-y-3">
              <div className="grid gap-3">
                {auditResult.recommendations.map((rec, idx) => (
                  <Card key={idx} className="border-slate-200 hover:border-blue-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            rec.priority === 'High' ? 'bg-rose-100' :
                            rec.priority === 'Medium' ? 'bg-amber-100' :
                            'bg-blue-100'
                          }`}>
                            <FileCheck className={`w-4 h-4 ${
                              rec.priority === 'High' ? 'text-rose-600' :
                              rec.priority === 'Medium' ? 'text-amber-600' :
                              'text-blue-600'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-900 mb-1">{rec.title}</h4>
                            <p className="text-sm text-slate-600 mb-2">{rec.action}</p>
                            <div className="bg-green-50 p-2 rounded border border-green-200">
                              <span className="text-xs font-bold text-green-900">Expected Impact: </span>
                              <span className="text-xs text-green-800">{rec.expected_impact}</span>
                            </div>
                          </div>
                        </div>
                        <Badge className={getPriorityColor(rec.priority)}>
                          {rec.priority}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Next Steps Action Plan */}
          <Card className="border-blue-200 bg-gradient-to-br from-white to-blue-50/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Immediate Action Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {auditResult.next_steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-slate-700 flex-1">{step}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Certification Readiness */}
          <Card className="border-purple-200 bg-gradient-to-br from-white to-purple-50/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-purple-600" />
                Certification Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                <div>
                  <div className="font-bold text-slate-900 mb-1">Third-Party Certification Readiness</div>
                  <p className="text-sm text-slate-600">
                    {auditResult.certification_ready 
                      ? 'Ready to submit to TÜV, SGS, or DNV for ISO 14067 certification' 
                      : 'Address critical gaps before submitting for certification'}
                  </p>
                </div>
                {auditResult.certification_ready ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-amber-600" />
                )}
              </div>
              
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-xs text-slate-500 mb-1">ISO 14067:2018</div>
                  <Badge className={auditResult.iso_14067_compliant ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                    {auditResult.iso_14067_compliant ? 'Pass' : 'Needs Work'}
                  </Badge>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-xs text-slate-500 mb-1">GHG Protocol</div>
                  <Badge className={auditResult.overall_compliance_score >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                    {auditResult.overall_compliance_score >= 80 ? 'Aligned' : 'Partial'}
                  </Badge>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-xs text-slate-500 mb-1">PAS 2050</div>
                  <Badge className={auditResult.overall_compliance_score >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                    {auditResult.overall_compliance_score >= 75 ? 'Compatible' : 'Review'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}