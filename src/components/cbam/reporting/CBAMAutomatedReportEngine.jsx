import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { jsPDF } from 'jspdf';
import { 
  FileText, Download, CheckCircle2, AlertTriangle, Loader2, 
  FileCode, Send, Shield, Calendar, TrendingUp 
} from "lucide-react";
import { validateCBAMEntry, validateCBAMReport } from '../CBAMValidationEngine';

/**
 * Automated CBAM Report Engine
 * Generates compliant PDF and XML reports per C(2025) 8151, 8552, 8560, 8150
 * Includes:
 * - Free allocation adjustment calculation (2026-2034 phase-in)
 * - Certificate obligation with CBAM factor
 * - Production route-specific benchmarks
 * - Validation against materiality thresholds
 * - English-only documentation requirement
 */

export default function CBAMAutomatedReportEngine({ reportId, entries = [] }) {
  const [generationProgress, setGenerationProgress] = useState(0);
  const [validationResults, setValidationResults] = useState(null);
  const queryClient = useQueryClient();

  // Fetch report details
  const { data: report } = useQuery({
    queryKey: ['cbam-report', reportId],
    queryFn: async () => {
      const reports = await base44.entities.CBAMReport.list();
      return reports.find(r => r.id === reportId);
    },
    enabled: !!reportId
  });

  // Fetch all related data
  const { data: benchmarks = [] } = useQuery({
    queryKey: ['cbam-benchmarks'],
    queryFn: () => base44.entities.CBAMFreeAllocationBenchmark.list()
  });

  const { data: defaultValues = [] } = useQuery({
    queryKey: ['cbam-defaults'],
    queryFn: () => base44.entities.CBAMDefaultValue.list()
  });

  const { data: monitoringPlans = [] } = useQuery({
    queryKey: ['cbam-monitoring-plans'],
    queryFn: () => base44.entities.CBAMMonitoringPlan.list()
  });

  const { data: operatorReports = [] } = useQuery({
    queryKey: ['cbam-operator-reports'],
    queryFn: () => base44.entities.CBAMOperatorEmissionReport.list()
  });

  const { data: verificationReports = [] } = useQuery({
    queryKey: ['cbam-verification-reports'],
    queryFn: () => base44.entities.CBAMVerificationReport.list()
  });

  // Calculate free allocation adjustment per Art. 31 & C(2025) 8151
  const calculateFreeAllocation = (entry, year = 2026) => {
    // Find applicable benchmark based on CN code and production route
    const benchmark = benchmarks.find(b => 
      b.cn_code === entry.cn_code && 
      (b.production_route === entry.production_route || b.production_route === 'General')
    );

    if (!benchmark) return { freeAllocation: 0, certificatesRequired: 0, cbamFactor: 0 };

    // Get CBAM factor for the year (progressive phase-in)
    const cbamFactor = year === 2026 ? benchmark.cbam_factor_2026 :
                       year === 2027 ? benchmark.cbam_factor_2027 :
                       year === 2028 ? benchmark.cbam_factor_2028 :
                       year === 2029 ? benchmark.cbam_factor_2029 :
                       benchmark.cbam_factor_2030; // Full phase-in by 2030

    // Free allocation = Benchmark × (1 - CBAM factor)
    const benchmarkValue = year === 2026 ? benchmark.cbam_benchmark_2026 : benchmark.cbam_benchmark_2027_onwards;
    const freeAllocation = benchmarkValue * (1 - cbamFactor) * (entry.quantity || 0);

    // Apply cross-sectoral correction factor if present
    const correctionFactor = benchmark.cross_sectoral_correction_factor || 1.0;
    const adjustedFreeAllocation = freeAllocation * correctionFactor;

    // Certificate obligation = (Actual Emissions - Free Allocation) × CBAM factor
    const actualEmissions = entry.total_embedded_emissions || 0;
    const obligationBase = Math.max(0, actualEmissions - adjustedFreeAllocation);
    const certificatesRequired = obligationBase * cbamFactor;

    return {
      freeAllocation: adjustedFreeAllocation,
      certificatesRequired,
      cbamFactor,
      benchmarkValue,
      correctionFactor
    };
  };

  // Comprehensive validation
  const performValidation = async () => {
    setGenerationProgress(10);
    
    const results = {
      entries: [],
      report: null,
      criticalIssues: [],
      warnings: [],
      compliant: true
    };

    // Validate each entry
    for (const entry of entries) {
      const validation = validateCBAMEntry(entry, defaultValues, monitoringPlans);
      results.entries.push({ entry, validation });
      
      if (validation.errors.some(e => e.severity === 'critical')) {
        results.criticalIssues.push({
          entryId: entry.id,
          issues: validation.errors.filter(e => e.severity === 'critical')
        });
        results.compliant = false;
      }
      
      results.warnings.push(...validation.warnings);
    }

    setGenerationProgress(30);

    // Validate report
    if (report) {
      const reportValidation = validateCBAMReport(report, entries);
      results.report = reportValidation;
      
      if (!reportValidation.valid) {
        results.compliant = false;
        results.criticalIssues.push(...reportValidation.errors);
      }
    }

    setValidationResults(results);
    setGenerationProgress(40);
    return results;
  };

  // Generate PDF Report with jsPDF
  const generatePDF = async () => {
    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('CBAM Quarterly Report', 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Period: ${report.reporting_period} | Year: ${report.reporting_year}`, 20, y);
    y += 7;
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} | Language: English (per Art. 5(6))`, 20, y);
    y += 15;

    // Regulatory compliance notice
    doc.setFillColor(134, 176, 39);
    doc.rect(15, y - 5, 180, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('Compliant with C(2025) 8151, 8552, 8560, 8150 - Free Allocation Adjustment Applied', 20, y + 3);
    doc.setTextColor(0, 0, 0);
    y += 20;

    // Declarant Information
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Declarant Information', 20, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`EORI Number: ${report.eori_number}`, 25, y);
    y += 6;
    doc.text(`Declarant Name: ${report.declarant_name}`, 25, y);
    y += 6;
    doc.text(`Member State: ${report.member_state}`, 25, y);
    y += 6;
    doc.text(`CBAM Account: ${report.cbam_account_number || 'N/A'}`, 25, y);
    y += 12;

    // Summary Statistics
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Emission Summary', 20, y);
    y += 8;

    const stats = [
      ['Total Imports', `${report.total_imports_count}`],
      ['Total Quantity', `${report.total_goods_quantity_tonnes?.toFixed(2)} tonnes`],
      ['Direct Emissions', `${report.total_direct_emissions?.toFixed(2)} tCO2e`],
      ['Indirect Emissions', `${report.total_indirect_emissions?.toFixed(2)} tCO2e`],
      ['Total Embedded Emissions', `${report.total_embedded_emissions?.toFixed(2)} tCO2e`],
      ['Free Allocation Adjustment', `${report.free_allocation_adjustment_total?.toFixed(2)} tCO2e`],
      ['CBAM Factor Applied', `${(report.cbam_factor_applied * 100).toFixed(1)}%`],
      ['Certificates Required', `${report.certificates_required}`]
    ];

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    stats.forEach(([label, value]) => {
      doc.text(label, 25, y);
      doc.text(value, 120, y);
      y += 5;
    });
    y += 10;

    // Breakdown by Category
    if (report.breakdown_by_category && Object.keys(report.breakdown_by_category).length > 0) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Emissions by Category', 20, y);
      y += 8;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      Object.entries(report.breakdown_by_category).forEach(([category, emissions]) => {
        doc.text(`${category}:`, 25, y);
        doc.text(`${emissions.toFixed(2)} tCO2e`, 120, y);
        y += 5;
      });
      y += 10;
    }

    // Calculation Methods
    if (report.calculation_methods_used) {
      doc.addPage();
      y = 20;
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Calculation Methods', 20, y);
      y += 8;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(`Actual Values: ${report.calculation_methods_used.actual_values?.toFixed(1) || 0}%`, 25, y);
      y += 5;
      doc.text(`Default Values: ${report.calculation_methods_used.default_values?.toFixed(1) || 0}%`, 25, y);
      y += 5;
      doc.text(`Combined: ${report.calculation_methods_used.combined?.toFixed(1) || 0}%`, 25, y);
      y += 12;
    }

    // Verification Status
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Verification & Quality Assurance', 20, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Monitoring Plans Submitted: ${report.monitoring_plans_submitted || 0}`, 25, y);
    y += 5;
    doc.text(`Operator Reports Verified: ${report.operator_reports_verified || 0}`, 25, y);
    y += 5;
    
    if (report.verification_opinions) {
      doc.text(`Satisfactory Opinions: ${report.verification_opinions.satisfactory || 0}`, 25, y);
      y += 5;
      doc.text(`Satisfactory with Comments: ${report.verification_opinions.satisfactory_with_comments || 0}`, 25, y);
      y += 5;
      doc.text(`Unsatisfactory: ${report.verification_opinions.unsatisfactory || 0}`, 25, y);
      y += 5;
    }
    y += 12;

    // Compliance Statement
    doc.setFillColor(240, 240, 240);
    doc.rect(15, y - 5, 180, 25, 'F');
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Compliance Statement', 20, y);
    doc.setFont(undefined, 'normal');
    y += 5;
    doc.text('This report complies with Regulation (EU) 2023/956 as amended by C(2025) 8151, 8552, 8560, 8150.', 20, y);
    y += 4;
    doc.text('Free allocation adjustments calculated per Art. 31 with production route-specific benchmarks.', 20, y);
    y += 4;
    doc.text('All documentation provided in English as required by Art. 5(6) of implementing acts.', 20, y);

    setGenerationProgress(70);

    // Convert to blob
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], `CBAM_Report_${report.reporting_period}_${report.eori_number}.pdf`, { type: 'application/pdf' });
    
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
    
    await base44.entities.CBAMReport.update(reportId, {
      report_pdf_url: file_url
    });

    setGenerationProgress(80);
    return file_url;
  };

  // Generate XML per EU Registry schema
  const generateXML = async () => {
    const year = report.reporting_year;
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CBAMReport xmlns="urn:eu:cbam:2026" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Header>
    <ReportingPeriod>${report.reporting_period}</ReportingPeriod>
    <ReportingYear>${report.reporting_year}</ReportingYear>
    <ReportingQuarter>${report.reporting_quarter}</ReportingQuarter>
    <SubmissionDate>${new Date().toISOString()}</SubmissionDate>
    <Language>en</Language>
    <RegulatoryBasis>C(2025) 8151, 8552, 8560, 8150</RegulatoryBasis>
  </Header>
  
  <Declarant>
    <EORINumber>${report.eori_number}</EORINumber>
    <Name>${report.declarant_name}</Name>
    <MemberState>${report.member_state}</MemberState>
    <CBAMAccountNumber>${report.cbam_account_number || ''}</CBAMAccountNumber>
  </Declarant>
  
  <EmissionsSummary>
    <TotalImports>${report.total_imports_count}</TotalImports>
    <TotalQuantity unit="tonnes">${report.total_goods_quantity_tonnes?.toFixed(3)}</TotalQuantity>
    <DirectEmissions unit="tCO2e">${report.total_direct_emissions?.toFixed(3)}</DirectEmissions>
    <IndirectEmissions unit="tCO2e">${report.total_indirect_emissions?.toFixed(3)}</IndirectEmissions>
    <TotalEmbeddedEmissions unit="tCO2e">${report.total_embedded_emissions?.toFixed(3)}</TotalEmbeddedEmissions>
  </EmissionsSummary>
  
  <FreeAllocationAdjustment>
    <TotalAdjustment unit="tCO2e">${report.free_allocation_adjustment_total?.toFixed(3)}</TotalAdjustment>
    <CBAMFactor>${report.cbam_factor_applied}</CBAMFactor>
    <PhaseInYear>${year}</PhaseInYear>
    <BenchmarkType>ProductionRouteSpecific</BenchmarkType>
  </FreeAllocationAdjustment>
  
  <CertificateObligation>
    <Required>${report.certificates_required}</Required>
    <Surrendered>${report.certificates_surrendered || 0}</Surrendered>
    <PriceAverage unit="EUR">${report.certificate_price_avg?.toFixed(2)}</PriceAverage>
    <TotalCost unit="EUR">${report.total_cbam_cost_eur?.toFixed(2)}</TotalCost>
    <PricingBasis>${year === 2026 ? 'Quarterly' : 'Weekly'}</PricingBasis>
  </CertificateObligation>
  
  <CalculationMethods>
    <ActualValues percentage="${report.calculation_methods_used?.actual_values?.toFixed(1) || 0}" />
    <DefaultValues percentage="${report.calculation_methods_used?.default_values?.toFixed(1) || 0}" />
    <Combined percentage="${report.calculation_methods_used?.combined?.toFixed(1) || 0}" />
  </CalculationMethods>
  
  <VerificationStatus>
    <MonitoringPlansSubmitted>${report.monitoring_plans_submitted || 0}</MonitoringPlansSubmitted>
    <OperatorReportsVerified>${report.operator_reports_verified || 0}</OperatorReportsVerified>
    <VerificationOpinions>
      <Satisfactory>${report.verification_opinions?.satisfactory || 0}</Satisfactory>
      <SatisfactoryWithComments>${report.verification_opinions?.satisfactory_with_comments || 0}</SatisfactoryWithComments>
      <Unsatisfactory>${report.verification_opinions?.unsatisfactory || 0}</Unsatisfactory>
    </VerificationOpinions>
  </VerificationStatus>
  
  <GoodsCategories>
${Object.entries(report.breakdown_by_category || {}).map(([category, emissions]) => `    <Category>
      <Name>${category}</Name>
      <Emissions unit="tCO2e">${emissions.toFixed(3)}</Emissions>
    </Category>`).join('\n')}
  </GoodsCategories>
  
  <ComplianceDeclaration>
    <Text>This report complies with Regulation (EU) 2023/956 as amended by Commission Implementing Regulations C(2025) 8151, 8552, 8560, and 8150.</Text>
    <Date>${new Date().toISOString().split('T')[0]}</Date>
  </ComplianceDeclaration>
</CBAMReport>`;

    const xmlBlob = new Blob([xml], { type: 'application/xml' });
    const xmlFile = new File([xmlBlob], `CBAM_Report_${report.reporting_period}_${report.eori_number}.xml`, { type: 'application/xml' });
    
    const { file_url } = await base44.integrations.Core.UploadFile({ file: xmlFile });
    
    await base44.entities.CBAMReport.update(reportId, {
      xml_file_url: file_url
    });

    setGenerationProgress(100);
    return { xml_url: file_url, xml_content: xml };
  };

  // Master generation function
  const generateReportsMutation = useMutation({
    mutationFn: async () => {
      setGenerationProgress(0);
      
      // Step 1: Validation
      const validation = await performValidation();
      if (!validation.compliant) {
        throw new Error('Report validation failed. Please resolve critical issues before generating reports.');
      }

      // Step 2: Generate PDF
      const pdfUrl = await generatePDF();

      // Step 3: Generate XML
      const { xml_url, xml_content } = await generateXML();

      // Update report status
      await base44.entities.CBAMReport.update(reportId, {
        status: 'validated',
        submitted_by: (await base44.auth.me()).email,
        language: 'English'
      });

      return { pdfUrl, xml_url, xml_content, validation };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cbam-reports'] });
      toast.success('PDF and XML reports generated successfully');
    },
    onError: (error) => {
      toast.error('Report generation failed: ' + error.message);
      setGenerationProgress(0);
    }
  });

  if (!report) {
    return <div className="text-center py-8 text-slate-500">Loading report data...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-br from-[#86b027]/5 to-white border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#86b027]/10">
                <FileText className="w-6 h-6 text-[#86b027]" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">
                  Automated Report Engine
                </CardTitle>
                <p className="text-sm text-slate-600 mt-1">
                  PDF & XML generation per C(2025) 8151, 8552, 8560, 8150
                </p>
              </div>
            </div>
            <Badge className="bg-[#02a1e8]/10 text-[#02a1e8] border-0">
              {report.reporting_period}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {/* Compliance Notice */}
          <Alert className="border-[#86b027]/30 bg-[#86b027]/5">
            <Shield className="h-4 w-4 text-[#86b027]" />
            <AlertDescription className="text-sm text-slate-700">
              <strong>2026 Compliance Mode Active:</strong> Reports include free allocation adjustment (2.5% CBAM factor), 
              production route-specific benchmarks, 5% materiality verification threshold, and English-only documentation.
            </AlertDescription>
          </Alert>

          {/* Validation Results */}
          {validationResults && (
            <div className="space-y-3">
              {validationResults.compliant ? (
                <Alert className="border-emerald-200 bg-emerald-50">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-sm text-emerald-800">
                    <strong>Validation Passed:</strong> All entries meet regulatory requirements. 
                    {validationResults.warnings.length > 0 && ` ${validationResults.warnings.length} non-critical warnings detected.`}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-sm text-red-800">
                    <strong>Validation Failed:</strong> {validationResults.criticalIssues.length} critical issues detected.
                    Please resolve before generating reports.
                  </AlertDescription>
                </Alert>
              )}

              {validationResults.warnings.length > 0 && (
                <div className="text-xs text-slate-600 space-y-1">
                  {validationResults.warnings.slice(0, 3).map((w, i) => (
                    <div key={i}>• {w.message}</div>
                  ))}
                  {validationResults.warnings.length > 3 && (
                    <div className="text-slate-500 italic">+ {validationResults.warnings.length - 3} more warnings</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Generation Progress */}
          {generationProgress > 0 && generationProgress < 100 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Generating Reports...</span>
                <span className="text-slate-900 font-bold">{generationProgress}%</span>
              </div>
              <Progress value={generationProgress} className="h-2" />
              <p className="text-xs text-slate-500">
                {generationProgress < 40 && 'Validating entries...'}
                {generationProgress >= 40 && generationProgress < 80 && 'Generating PDF report...'}
                {generationProgress >= 80 && 'Generating XML for registry...'}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => generateReportsMutation.mutate()}
              disabled={generateReportsMutation.isPending || (validationResults && !validationResults.compliant)}
              className="flex-1 bg-[#86b027] hover:bg-[#769c22]"
            >
              {generateReportsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate PDF & XML
                </>
              )}
            </Button>

            {report.report_pdf_url && (
              <Button
                variant="outline"
                onClick={() => window.open(report.report_pdf_url, '_blank')}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            )}

            {report.xml_file_url && (
              <Button
                variant="outline"
                onClick={() => window.open(report.xml_file_url, '_blank')}
                className="flex-1"
              >
                <FileCode className="w-4 h-4 mr-2" />
                Download XML
              </Button>
            )}
          </div>

          {/* Summary Stats */}
          {generationProgress === 100 && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#86b027]">
                  {report.total_embedded_emissions?.toFixed(1)}
                </div>
                <div className="text-xs text-slate-600 uppercase font-semibold">Total tCO2e</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#02a1e8]">
                  {report.certificates_required}
                </div>
                <div className="text-xs text-slate-600 uppercase font-semibold">Certificates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {((report.cbam_factor_applied || 0) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-slate-600 uppercase font-semibold">CBAM Factor</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}