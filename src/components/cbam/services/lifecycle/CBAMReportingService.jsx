/**
 * CBAM Reporting Service - Reporting Lifecycle ONLY
 * Domain: Report generation and aggregation
 * Responsibilities: Aggregate entries into quarterly reports
 * Boundaries: Does NOT calculate emissions or validate entries
 */

import { base44 } from '@/api/base44Client';
import eventBus, { CBAM_EVENTS } from '../CBAMEventBus';
import { AuditTrailService } from './CBAMAuditTrailService';

export class CBAMReportingService {
  /**
   * Generate quarterly report
   * Pure aggregation - no calculation
   */
  static async generateReport(params) {
    try {
      const user = await base44.auth.me();
      const { reporting_year, reporting_quarter, eori_number, member_state, declarant_name } = params;
      
      // Fetch entries for period
      const allEntries = await base44.entities.CBAMEmissionEntry.filter({
        tenant_id: user.company_id,
        reporting_period_year: reporting_year
      });
      
      // Filter by quarter
      const entries = allEntries.filter(e => {
        if (!e.import_date) return false;
        const date = new Date(e.import_date);
        const month = date.getMonth();
        const q = Math.ceil((month + 1) / 3);
        return q === reporting_quarter;
      });
      
      if (entries.length === 0) {
        throw new Error(`No entries found for Q${reporting_quarter}-${reporting_year}`);
      }
      
      // Aggregate totals - pure math, no calculation
      const aggregates = this.aggregateEntries(entries);
      
      // Calculate certificate requirement
      const { data: etsPrice } = await base44.functions.invoke('euETSPriceFetcherV2', {});
      const certificatePrice = etsPrice?.price || 80;
      const totalCost = aggregates.certificates_required * certificatePrice;
      
      // Create report
      const report = await base44.entities.CBAMReport.create({
        tenant_id: user.company_id,
        reporting_period: `Q${reporting_quarter}-${reporting_year}`,
        reporting_year,
        reporting_quarter,
        eori_number,
        member_state,
        declarant_name,
        
        // Aggregates
        total_imports_count: aggregates.count,
        total_goods_quantity_tonnes: aggregates.quantity,
        total_direct_emissions: aggregates.direct,
        total_indirect_emissions: aggregates.indirect,
        total_embedded_emissions: aggregates.total,
        certificates_required: aggregates.certificates_required,
        certificate_price_avg: certificatePrice,
        total_cbam_cost_eur: totalCost,
        
        // Metadata
        status: 'draft',
        submission_deadline: this.calculateDeadline(reporting_year, reporting_quarter),
        linked_entries: entries.map(e => e.id)
      });
      
      // MANDATORY audit
      await AuditTrailService.log({
        entity_type: 'CBAMReport',
        entity_id: report.id,
        action: 'generate',
        user_email: user.email,
        details: `Report generated: ${entries.length} entries, ${aggregates.total.toFixed(2)} tCO2e, ${aggregates.certificates_required.toFixed(2)} certificates`,
        regulatory_reference: 'Art. 6 Reg 2023/956'
      });
      
      // Emit event
      eventBus.emit(CBAM_EVENTS.REPORT_GENERATED, { 
        reportId: report.id,
        report
      });
      
      return { success: true, report };
    } catch (error) {
      console.error('[ReportingService] Generation failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Pure aggregation logic
   */
  static aggregateEntries(entries) {
    return entries.reduce((acc, e) => {
      const qty = e.quantity || 0;
      const direct = (e.direct_emissions_specific || 0) * qty;
      const indirect = (e.indirect_emissions_specific || 0) * qty;
      const total = e.total_embedded_emissions || 0;
      const certs = e.certificates_required || 0;
      
      return {
        count: acc.count + 1,
        quantity: acc.quantity + qty,
        direct: acc.direct + direct,
        indirect: acc.indirect + indirect,
        total: acc.total + total,
        certificates_required: acc.certificates_required + certs
      };
    }, { count: 0, quantity: 0, direct: 0, indirect: 0, total: 0, certificates_required: 0 });
  }
  
  /**
   * Calculate submission deadline per Art. 6(2) Reg 2023/956
   */
  static calculateDeadline(year, quarter) {
    // Q1 deadline: May 31
    // Q2 deadline: August 31
    // Q3 deadline: November 30
    // Q4 deadline: February 28/29 of next year
    const deadlineMonths = { 1: '05-31', 2: '08-31', 3: '11-30', 4: '02-28' };
    const deadlineYear = quarter === 4 ? year + 1 : year;
    return `${deadlineYear}-${deadlineMonths[quarter]}`;
  }
  
  /**
   * Submit report to registry
   */
  static async submitReport(reportId) {
    try {
      const user = await base44.auth.me();
      
      // Call backend submission function
      const { data } = await base44.functions.invoke('cbamRegistrySubmissionV2', {
        report_id: reportId,
        test_mode: false
      });
      
      if (!data.success) {
        throw new Error(data.error || 'Submission failed');
      }
      
      // Update report status
      const updated = await base44.entities.CBAMReport.update(reportId, {
        status: 'submitted',
        submission_date: new Date().toISOString(),
        registry_confirmation_number: data.confirmation_number
      });
      
      // MANDATORY audit
      await AuditTrailService.log({
        entity_type: 'CBAMReport',
        entity_id: reportId,
        action: 'submit',
        user_email: user.email,
        details: `Report submitted to registry. Confirmation: ${data.confirmation_number}`,
        regulatory_reference: 'Art. 6 Reg 2023/956'
      });
      
      // Emit event
      eventBus.emit(CBAM_EVENTS.REPORT_SUBMITTED, { 
        reportId,
        confirmation: data.confirmation_number,
        report: updated
      });
      
      return { success: true, report: updated, confirmation: data.confirmation_number };
    } catch (error) {
      console.error('[ReportingService] Submission failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default CBAMReportingService;