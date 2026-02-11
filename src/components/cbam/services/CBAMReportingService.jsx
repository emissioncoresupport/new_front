import { base44 } from '@/api/base44Client';

/**
 * CBAM Reporting Service
 * Automates report generation and submission workflow
 */

export class CBAMReportingService {
  /**
   * Generate automated quarterly report with ETS pricing and free allocations
   */
  static async generateQuarterlyReport(params) {
    try {
      console.log('[Reporting Service] Generating report for', params.year, 'Q' + params.quarter);
      
      // Step 1: Generate report with auto-calculations
      const reportResult = await base44.functions.invoke('cbamReportGenerator', {
        reporting_year: params.year,
        reporting_quarter: params.quarter,
        eori_number: params.eoriNumber,
        auto_link_entries: true
      });

      if (!reportResult.data?.success) {
        throw new Error(reportResult.data?.error || 'Report generation failed');
      }

      const report = reportResult.data.report;
      
      console.log('[Reporting Service] Report created:', report.id);

      // Step 2: Generate enhanced XML
      const xmlResult = await base44.functions.invoke('cbamEnhancedXMLGenerator', {
        report_id: report.id,
        include_ets_prices: true
      });

      if (!xmlResult.data?.success) {
        throw new Error('XML generation failed');
      }
      
      console.log('[Reporting Service] XML generated successfully');

      return { 
        success: true,
        report: report,
        statistics: reportResult.data.statistics,
        xml_generated: true,
        xml_url: xmlResult.data.xml_file_url
      };
    } catch (error) {
      console.error('[Reporting Service] Error:', error);
      throw error;
    }
  }

  /**
   * Submit report to national registry with enhanced error handling
   */
  static async submitToRegistry(reportId, xmlContent = null) {
    try {
      console.log('[Reporting Service] Submitting report:', reportId);
      
      const submitResult = await base44.functions.invoke('cbamRegistrySubmission', {
        report_id: reportId,
        xml_content: xmlContent
      });

      const data = submitResult.data;

      if (!data.success) {
        // Create notification for failure
        await base44.entities.Notification.create({
          type: 'submission_failure',
          title: 'CBAM Submission Failed',
          message: `Report ${reportId} submission failed: ${data.error}`,
          severity: 'high',
          entity_type: 'CBAMReport',
          entity_id: reportId,
          read: false
        });
        
        throw new Error(data.error || 'Submission failed');
      }

      // Success notification
      await base44.entities.Notification.create({
        type: 'submission_success',
        title: 'CBAM Report Submitted',
        message: `Confirmation: ${data.confirmation_number || 'Manual submission required'}`,
        severity: 'info',
        entity_type: 'CBAMReport',
        entity_id: reportId,
        read: false
      });
      
      console.log('[Reporting Service] Submission successful');

      return data;
    } catch (error) {
      console.error('[Reporting Service] Submission error:', error);
      throw error;
    }
  }

  /**
   * Get next reporting deadline
   */
  static getNextDeadline() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Calculate current quarter
    const currentQuarter = Math.ceil(currentMonth / 3);
    
    // Deadline is 31 days after quarter end (Art. 6(2) Reg 2023/956)
    const quarterEndMonth = currentQuarter * 3;
    const quarterEnd = new Date(currentYear, quarterEndMonth, 0);
    const deadline = new Date(quarterEnd);
    deadline.setDate(deadline.getDate() + 31);

    return {
      quarter: currentQuarter,
      year: currentYear,
      deadline: deadline,
      days_remaining: Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
    };
  }

  /**
   * Check if report is overdue
   */
  static isOverdue(report) {
    if (!report.submission_deadline) return false;
    if (report.status === 'submitted' || report.status === 'accepted') return false;
    
    return new Date(report.submission_deadline) < new Date();
  }

  /**
   * Validate report before submission
   */
  static async validateReport(reportId) {
    const reports = await base44.entities.CBAMReport.list();
    const report = reports.find(r => r.id === reportId);

    if (!report) {
      throw new Error('Report not found');
    }

    const errors = [];

    // Required fields validation
    if (!report.eori_number) errors.push('EORI number is required');
    if (!report.member_state) errors.push('Member state is required');
    if (!report.total_embedded_emissions) errors.push('No emissions data');
    if (!report.linked_entries || report.linked_entries.length === 0) {
      errors.push('No import entries linked to this report');
    }

    // Check if entries are verified
    if (report.linked_entries) {
      const entries = await base44.entities.CBAMEmissionEntry.list();
      const linkedEntries = entries.filter(e => report.linked_entries.includes(e.id));
      
      const unverified = linkedEntries.filter(e => 
        e.verification_status !== 'accredited_verifier_satisfactory' &&
        e.verification_status !== 'manual_verified'
      );

      if (unverified.length > 0) {
        errors.push(`${unverified.length} entries require verification`);
      }
    }

    return {
      is_valid: errors.length === 0,
      errors: errors,
      can_submit: errors.length === 0
    };
  }
}

export default CBAMReportingService;