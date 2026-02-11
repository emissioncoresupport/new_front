import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, XCircle, AlertTriangle, TrendingUp, 
  Shield, FileText, Users, Clock
} from "lucide-react";

/**
 * CBAM Compliance Readiness Scorecard
 * Automated assessment of regulatory compliance status
 */

export default function CBAMComplianceScoring({ entries, reports, suppliers, certificates }) {
  
  // Calculate compliance metrics
  const metrics = {
    // Data Completeness (30%)
    data_completeness: calculateDataCompleteness(entries),
    
    // Verification Status (25%)
    verification_rate: calculateVerificationRate(entries),
    
    // Supplier Collaboration (20%)
    supplier_readiness: calculateSupplierReadiness(suppliers, entries),
    
    // Certificate Management (15%)
    certificate_adequacy: calculateCertificateAdequacy(entries, certificates),
    
    // Reporting Timeliness (10%)
    reporting_compliance: calculateReportingCompliance(reports)
  };
  
  // Overall score (weighted average)
  const overallScore = Math.round(
    metrics.data_completeness * 0.30 +
    metrics.verification_rate * 0.25 +
    metrics.supplier_readiness * 0.20 +
    metrics.certificate_adequacy * 0.15 +
    metrics.reporting_compliance * 0.10
  );
  
  const grade = 
    overallScore >= 90 ? { letter: 'A', color: 'text-green-600', bg: 'bg-green-50', status: 'Excellent' } :
    overallScore >= 75 ? { letter: 'B', color: 'text-blue-600', bg: 'bg-blue-50', status: 'Good' } :
    overallScore >= 60 ? { letter: 'C', color: 'text-amber-600', bg: 'bg-amber-50', status: 'Adequate' } :
    { letter: 'D', color: 'text-red-600', bg: 'bg-red-50', status: 'Needs Improvement' };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-[#86b027]" />
        <h3 className="text-base font-medium text-slate-900">Compliance Readiness</h3>
      </div>
      <div className="space-y-5">
        {/* Overall Grade - Compact */}
        <div className={`${grade.bg} rounded-lg p-5 text-center border border-slate-200`}>
          <div className={`text-5xl font-bold ${grade.color} mb-1`}>{grade.letter}</div>
          <div className="text-xs font-medium text-slate-600 mb-2">{grade.status}</div>
          <div className="text-xl font-light text-slate-700">{overallScore}/100</div>
          <Progress value={overallScore} className="h-1.5 mt-3" indicatorClassName="bg-[#86b027]" />
        </div>
        
        {/* Compact Metrics - No descriptions */}
        <div className="space-y-2">
          <CompactMetricRow
            icon={FileText}
            label="Data"
            score={metrics.data_completeness}
          />
          <CompactMetricRow
            icon={CheckCircle2}
            label="Verification"
            score={metrics.verification_rate}
          />
          <CompactMetricRow
            icon={Users}
            label="Suppliers"
            score={metrics.supplier_readiness}
          />
          <CompactMetricRow
            icon={Shield}
            label="Certificates"
            score={metrics.certificate_adequacy}
          />
        </div>
        
        {/* Action Items */}
        {overallScore < 90 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
            <h4 className="font-semibold text-amber-900 text-sm">Action Items to Improve Score:</h4>
            {metrics.data_completeness < 90 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 text-amber-600 mt-0.5" />
                <p className="text-xs text-amber-800">Complete missing data fields in {entries.filter(e => !e.cn_code || !e.quantity).length} entries</p>
              </div>
            )}
            {metrics.verification_rate < 75 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 text-amber-600 mt-0.5" />
                <p className="text-xs text-amber-800">Request verified emissions from {suppliers.filter(s => s.cbam_relevant).length} CBAM-relevant suppliers</p>
              </div>
            )}
            {metrics.certificate_adequacy < 80 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 text-amber-600 mt-0.5" />
                <p className="text-xs text-amber-800">Purchase additional CBAM certificates to cover shortfall</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CompactMetricRow({ icon: Icon, label, score }) {
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600';
  const bgColor = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-medium text-slate-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <Progress value={score} className="h-1 w-16" indicatorClassName={bgColor} />
        <span className={`text-xs font-bold ${color} w-8 text-right`}>{score}</span>
      </div>
    </div>
  );
}

function calculateDataCompleteness(entries) {
  if (!entries.length) return 0;
  
  const requiredFields = [
    'cn_code', 'country_of_origin', 'quantity', 
    'direct_emissions_specific', 'calculation_method'
  ];
  
  const completeness = entries.map(entry => {
    const filled = requiredFields.filter(field => entry[field]).length;
    return (filled / requiredFields.length) * 100;
  });
  
  return Math.round(completeness.reduce((a, b) => a + b, 0) / entries.length);
}

function calculateVerificationRate(entries) {
  if (!entries.length) return 0;
  
  const verified = entries.filter(e => 
    e.validation_status === 'ai_validated' || 
    e.validation_status === 'manual_verified' ||
    e.calculation_method === 'EU_method'
  ).length;
  
  return Math.round((verified / entries.length) * 100);
}

function calculateSupplierReadiness(suppliers, entries) {
  const cbamSuppliers = suppliers.filter(s => s.cbam_relevant);
  if (!cbamSuppliers.length) return 100;
  
  const suppliersWithData = new Set(
    entries
      .filter(e => e.calculation_method === 'EU_method' && e.supplier_id)
      .map(e => e.supplier_id)
  );
  
  return Math.round((suppliersWithData.size / cbamSuppliers.length) * 100);
}

function calculateCertificateAdequacy(entries, certificates) {
  const totalEmissions = entries.reduce((sum, e) => sum + (e.total_embedded_emissions || 0), 0);
  const required = Math.ceil(totalEmissions);
  
  const balance = certificates
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + (c.quantity || 0), 0);
  
  if (required === 0) return 100;
  
  const coverage = (balance / required) * 100;
  return Math.min(100, Math.round(coverage));
}

function calculateReportingCompliance(reports) {
  if (!reports.length) return 100;
  
  const onTime = reports.filter(r => {
    if (!r.submission_deadline || !r.submission_date) return false;
    return new Date(r.submission_date) <= new Date(r.submission_deadline);
  }).length;
  
  return Math.round((onTime / reports.length) * 100);
}