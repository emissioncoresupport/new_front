/**
 * CBAM REPORTING SERVICE - SOLE REPORTING AUTHORITY
 * Version: 2.0 - Regulatory Submission Ready
 * Compliance: Reg 2023/956 Art. 6-7, C(2025) 8151
 * 
 * LIFECYCLE 5: REPORTING
 * Domain: Period aggregation for regulatory submission
 * Boundaries: NO recalculation, NO validation, read-only aggregation
 */

import { base44 } from '@/api/base44Client';
import eventBus, { CBAM_EVENTS } from '../../services/CBAMEventBus';
import AuditTrailService from '../shared/AuditTrailService';
import { getSubmissionDeadline } from '../../constants/regulatorySchedules';

class ReportingService {
  LIFECYCLE = 'REPORTING';
  VERSION = '2.0';
  
  /**
   * Generate quarterly CBAM report - STRICT INPUT FILTERING
   */
  async generateReport(params) {
    try {
      const user = await base44.auth.me();
      const { reporting_year, reporting_quarter, eori_number, member_state, declarant_name } = params;
      
      // Fetch ALL entries
      const allEntries = await base44.entities.CBAMEmissionEntry.list();
      
      // Define quarter boundaries
      const quarterStart = new Date(`${reporting_year}-${(reporting_quarter - 1) * 3 + 1}-01`);
      const quarterEnd = new Date(reporting_year, reporting_quarter * 3, 0); // Last day of quarter
      
      // STRICT FILTERING - Entry Compliance Rules
      const entryCompliance = allEntries.map(entry => {
        const issues = [];
        let eligible = true;
        
        // Check 1: Date range
        if (!entry.import_date) {
          issues.push('Missing import_date');
          eligible = false;
        } else {
          const importDate = new Date(entry.import_date);
          if (importDate < quarterStart || importDate > quarterEnd) {
            issues.push('Outside reporting period');
            eligible = false;
          }
        }
        
        // Check 2: Validation status
        if (entry.validation_status === 'blocked') {
          issues.push('BLOCKED by validation');
          eligible = false;
        }
        
        // Check 3: Verification requirement for actual methods
        const method = entry.calculation_method;
        if (method === 'actual_values' || method === 'EU_method') {
          if (entry.verification_status !== 'verifier_satisfactory') {
            issues.push('Actual method requires satisfactory verification');
            eligible = false;
          }
        }
        
        // Check 4: Mandatory fields
        if (!entry.cn_code || !entry.country_of_origin || !entry.quantity) {
          issues.push('Missing mandatory fields');
          eligible = false;
        }
        
        // Check 5: Emissions data
        if (!entry.total_embedded_emissions) {
          issues.push('Missing emissions data');
          eligible = false;
        }
        
        return { entry, eligible, issues };
      });
      
      // Eligible entries only
      const eligible = entryCompliance.filter(e => e.eligible).map(e => e.entry);
      const excluded = entryCompliance.filter(e => !e.eligible);
      
      // Aggregate totals - READ-ONLY
      const totals = eligible.reduce((acc, e) => ({
        imports: acc.imports + 1,
        quantity: acc.quantity + (e.quantity || 0),
        direct: acc.direct + ((e.direct_emissions_specific || 0) * (e.quantity || 0)),
        indirect: acc.indirect + ((e.indirect_emissions_specific || 0) * (e.quantity || 0)),
        total: acc.total + (e.total_embedded_emissions || 0),
        chargeable: acc.chargeable + (e.chargeable_emissions || 0),
        certificates: acc.certificates + (e.certificates_required || 0)
      }), { 
        imports: 0, 
        quantity: 0, 
        direct: 0, 
        indirect: 0, 
        total: 0,
        chargeable: 0,
        certificates: 0 
      });
      
      // Breakdown by category
      const categoryBreakdown = {};
      eligible.forEach(e => {
        const cat = e.aggregated_goods_category || 'Other';
        if (!categoryBreakdown[cat]) {
          categoryBreakdown[cat] = {
            quantity: 0,
            emissions: 0,
            imports: 0
          };
        }
        categoryBreakdown[cat].imports += 1;
        categoryBreakdown[cat].quantity += e.quantity || 0;
        categoryBreakdown[cat].emissions += e.total_embedded_emissions || 0;
      });
      
      // Breakdown by country
      const countryBreakdown = {};
      eligible.forEach(e => {
        const country = e.country_of_origin;
        if (!countryBreakdown[country]) {
          countryBreakdown[country] = {
            quantity: 0,
            emissions: 0,
            imports: 0
          };
        }
        countryBreakdown[country].imports += 1;
        countryBreakdown[country].quantity += e.quantity || 0;
        countryBreakdown[country].emissions += e.total_embedded_emissions || 0;
      });
      
      // Method distribution
      const methodDistribution = {
        actual_values: 0,
        default_values: 0,
        combined: 0
      };
      eligible.forEach(e => {
        const method = e.calculation_method || 'default_values';
        if (method === 'actual_values' || method === 'EU_method') {
          methodDistribution.actual_values++;
        } else if (method === 'combined_actual_default') {
          methodDistribution.combined++;
        } else {
          methodDistribution.default_values++;
        }
      });
      
      // Get company_id
      const users = await base44.entities.User.list();
      const fullUser = users.find(u => u.email === user.email);
      
      // Create report
      const report = await base44.entities.CBAMReport.create({
        company_id: fullUser?.company_id,
        reporting_period: `Q${reporting_quarter}-${reporting_year}`,
        reporting_year,
        reporting_quarter,
        submission_deadline: getSubmissionDeadline(reporting_year, reporting_quarter),
        eori_number,
        member_state,
        declarant_name,
        
        // Totals
        total_imports_count: totals.imports,
        total_goods_quantity_tonnes: totals.quantity,
        total_direct_emissions: totals.direct,
        total_indirect_emissions: totals.indirect,
        total_embedded_emissions: totals.total,
        total_chargeable_emissions: totals.chargeable,
        certificates_required: Math.ceil(totals.certificates),
        
        // Breakdowns
        breakdown_by_category: categoryBreakdown,
        breakdown_by_country: countryBreakdown,
        
        // Method analysis
        calculation_methods_used: {
          actual_values_pct: eligible.length > 0 ? (methodDistribution.actual_values / eligible.length * 100).toFixed(1) : 0,
          default_values_pct: eligible.length > 0 ? (methodDistribution.default_values / eligible.length * 100).toFixed(1) : 0,
          combined_pct: eligible.length > 0 ? (methodDistribution.combined / eligible.length * 100).toFixed(1) : 0
        },
        
        // Data quality metrics
        data_quality_metrics: {
          eligible_entries: eligible.length,
          excluded_entries: excluded.length,
          verification_coverage_pct: methodDistribution.actual_values > 0 
            ? (methodDistribution.actual_values / eligible.length * 100).toFixed(1)
            : 0,
          avg_compliance_score: eligible.reduce((sum, e) => sum + (e.compliance_score || 0), 0) / eligible.length
        },
        
        // Entry references
        linked_entries: eligible.map(e => e.id),
        excluded_entries: excluded.map(e => ({
          id: e.entry.id,
          import_id: e.entry.import_id,
          reasons: e.issues
        })),
        
        status: 'draft',
        language: 'English',
        
        // Regulatory version tracking
        regulatory_references: {
          regulation: 'Reg 2023/956',
          implementing_acts: ['C(2025) 8150', 'C(2025) 8151', 'C(2025) 8552'],
          report_format_version: this.VERSION,
          generated_date: new Date().toISOString()
        }
      });
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: this.LIFECYCLE,
        entity_type: 'CBAMReport',
        entity_id: report.id,
        action: 'generated',
        user_email: user.email,
        details: {
          period: report.reporting_period,
          eligible_entries: eligible.length,
          excluded_entries: excluded.length,
          total_emissions: totals.total,
          certificates_required: Math.ceil(totals.certificates),
          eori: eori_number,
          regulation: 'C(2025) 8151 Art. 7'
        }
      });
      
      // Emit event
      eventBus.emit(CBAM_EVENTS.REPORT_GENERATED, { 
        reportId: report.id, 
        report,
        statistics: totals,
        exclusions: excluded.length
      });
      
      return { 
        success: true, 
        report, 
        statistics: totals,
        eligible_count: eligible.length,
        excluded_count: excluded.length,
        exclusions: excluded
      };
      
    } catch (error) {
      console.error('[Reporting] Error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Validate report readiness before generation
   */
  async validateReportReadiness(reportingYear, reportingQuarter) {
    try {
      const allEntries = await base44.entities.CBAMEmissionEntry.list();
      
      const quarterStart = new Date(`${reportingYear}-${(reportingQuarter - 1) * 3 + 1}-01`);
      const quarterEnd = new Date(reportingYear, reportingQuarter * 3, 0);
      
      const periodEntries = allEntries.filter(e => {
        if (!e.import_date) return false;
        const date = new Date(e.import_date);
        return date >= quarterStart && date <= quarterEnd;
      });
      
      const analysis = {
        total_period_entries: periodEntries.length,
        validated: periodEntries.filter(e => e.validation_status === 'pass' || e.validation_status === 'warning').length,
        blocked: periodEntries.filter(e => e.validation_status === 'blocked').length,
        unvalidated: periodEntries.filter(e => !e.validation_status || e.validation_status === 'pending').length,
        
        actual_unverified: periodEntries.filter(e => 
          (e.calculation_method === 'actual_values' || e.calculation_method === 'EU_method') &&
          e.verification_status !== 'verifier_satisfactory'
        ).length,
        
        ready_for_reporting: true,
        blocking_issues: []
      };
      
      if (analysis.blocked > 0) {
        analysis.ready_for_reporting = false;
        analysis.blocking_issues.push({
          type: 'VALIDATION',
          count: analysis.blocked,
          message: `${analysis.blocked} entries blocked by validation`
        });
      }
      
      if (analysis.actual_unverified > 0) {
        analysis.ready_for_reporting = false;
        analysis.blocking_issues.push({
          type: 'VERIFICATION',
          count: analysis.actual_unverified,
          message: `${analysis.actual_unverified} actual method entries require verification`
        });
      }
      
      return { success: true, analysis };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Submit report to national registry
   */
  async submitReport(reportId, testMode = false) {
    try {
      const user = await base44.auth.me();
      
      // Fetch report
      const reports = await base44.entities.CBAMReport.list();
      const report = reports.find(r => r.id === reportId);
      
      if (!report) {
        return { success: false, error: 'Report not found' };
      }
      
      // Pre-submission validation
      if (report.status === 'submitted') {
        return { success: false, error: 'Report already submitted' };
      }
      
      if (!report.linked_entries || report.linked_entries.length === 0) {
        return { success: false, error: 'Report contains no eligible entries' };
      }
      
      // Call backend submission service
      const { data } = await base44.functions.invoke('cbamRegistrySubmissionV2', {
        report_id: reportId,
        test_mode: testMode
      });
      
      if (!data.success) {
        return { success: false, error: data.error };
      }
      
      // Update report status
      await base44.entities.CBAMReport.update(reportId, {
        status: 'submitted',
        submission_date: new Date().toISOString(),
        submitted_by: user.email,
        registry_confirmation_number: data.confirmation_number,
        submitted_via_cbam_registry: true
      });
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: this.LIFECYCLE,
        entity_type: 'CBAMReport',
        entity_id: reportId,
        action: 'submitted',
        user_email: user.email,
        details: {
          confirmation_number: data.confirmation_number,
          member_state: report.member_state,
          period: report.reporting_period,
          entries_count: report.linked_entries.length,
          test_mode: testMode,
          regulation: 'Reg 2023/956 Art. 6(2)'
        }
      });
      
      // Emit event
      eventBus.emit(CBAM_EVENTS.REPORT_SUBMITTED, { 
        reportId, 
        confirmation: data.confirmation_number,
        member_state: report.member_state
      });
      
      return { 
        success: true, 
        submission: data,
        confirmation_number: data.confirmation_number
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Export report to XML for registry submission
   */
  async exportReportXML(reportId) {
    try {
      const { data } = await base44.functions.invoke('cbamEnhancedXMLGenerator', {
        report_id: reportId
      });
      
      if (!data.success) {
        return { success: false, error: data.error };
      }
      
      return {
        success: true,
        xml: data.xml,
        filename: data.filename,
        validation_status: data.validation_status
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new ReportingService();