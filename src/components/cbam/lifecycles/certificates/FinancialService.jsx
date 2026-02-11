/**
 * CBAM FINANCIAL INTELLIGENCE SERVICE
 * Version: 2.0 - CFO-Grade Financial Analytics
 * 
 * LIFECYCLE 6B: FINANCIAL INTELLIGENCE
 * Domain: Financial exposure modeling and cost intelligence
 * Boundaries: NO entry mutation, read-only financial analysis
 */

import { base44 } from '@/api/base44Client';
import AuditTrailService from '../shared/AuditTrailService';

class FinancialService {
  LIFECYCLE = 'FINANCIAL';
  VERSION = '2.0';
  
  /**
   * Get current EU ETS price reference
   */
  async getCurrentETSPrice() {
    try {
      const { data } = await base44.functions.invoke('euETSPriceFetcherV2', {});
      
      if (!data.success) {
        // Fallback to historical price
        return { price: 85.00, source: 'fallback', date: new Date().toISOString() };
      }
      
      return { 
        price: data.price, 
        source: 'live',
        date: data.timestamp,
        exchange: data.exchange
      };
      
    } catch (error) {
      // Fallback
      return { price: 85.00, source: 'fallback', date: new Date().toISOString() };
    }
  }
  
  /**
   * A. COST OF NON-COMPLIANCE
   * Financial impact of using default vs actual emissions
   */
  async analyzeCostOfNonCompliance(reportId = null) {
    try {
      const user = await base44.auth.me();
      
      let entries = [];
      
      if (reportId) {
        const reports = await base44.entities.CBAMReport.list();
        const report = reports.find(r => r.id === reportId);
        if (!report) {
          return { success: false, error: 'Report not found' };
        }
        const allEntries = await base44.entities.CBAMEmissionEntry.list();
        entries = allEntries.filter(e => report.linked_entries.includes(e.id));
      } else {
        entries = await base44.entities.CBAMEmissionEntry.list();
      }
      
      // Separate by method
      const defaultEntries = entries.filter(e => e.calculation_method === 'default_values');
      const actualEntries = entries.filter(e => e.calculation_method === 'actual_values' || e.calculation_method === 'EU_method');
      
      // Calculate excess from markup
      const excessEmissions = defaultEntries.reduce((sum, e) => {
        const defaultValue = e.default_value_with_markup || 0;
        const baseValue = e.default_value_used ? defaultValue / (1 + (e.mark_up_percentage_applied || 0) / 100) : defaultValue;
        const markup = defaultValue - baseValue;
        return sum + (markup * (e.quantity || 0));
      }, 0);
      
      const etsPrice = await this.getCurrentETSPrice();
      const excessCost = excessEmissions * etsPrice.price;
      
      const analysis = {
        default_entries_count: defaultEntries.length,
        actual_entries_count: actualEntries.length,
        excess_emissions_tco2e: parseFloat(excessEmissions.toFixed(2)),
        excess_cost_eur: parseFloat(excessCost.toFixed(2)),
        ets_price_reference: etsPrice.price,
        ets_price_source: etsPrice.source,
        potential_savings_eur: parseFloat(excessCost.toFixed(2)),
        recommendation: excessCost > 0 
          ? `Switching to actual emissions could save €${excessCost.toLocaleString()}`
          : 'Already optimized'
      };
      
      // Audit
      await AuditTrailService.log({
        lifecycle: this.LIFECYCLE,
        entity_type: 'FinancialAnalysis',
        entity_id: reportId || 'all',
        action: 'cost_of_non_compliance_analyzed',
        user_email: user.email,
        details: {
          excess_cost: excessCost,
          ets_price: etsPrice.price,
          entries_analyzed: entries.length
        }
      });
      
      return { success: true, analysis };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * B. ETS PRICE SENSITIVITY
   * Cost exposure at different price scenarios
   */
  async analyzeETSPriceSensitivity(reportId = null) {
    try {
      const user = await base44.auth.me();
      
      let certificatesRequired = 0;
      
      if (reportId) {
        const reports = await base44.entities.CBAMReport.list();
        const report = reports.find(r => r.id === reportId);
        if (!report) {
          return { success: false, error: 'Report not found' };
        }
        certificatesRequired = report.certificates_required || 0;
      } else {
        const entries = await base44.entities.CBAMEmissionEntry.list();
        certificatesRequired = entries.reduce((sum, e) => sum + (e.certificates_required || 0), 0);
        certificatesRequired = Math.ceil(certificatesRequired);
      }
      
      const etsPrice = await this.getCurrentETSPrice();
      const basePrice = etsPrice.price;
      
      const scenarios = [
        { label: 'Current ETS Price', multiplier: 1.0 },
        { label: 'ETS +10%', multiplier: 1.1 },
        { label: 'ETS +25%', multiplier: 1.25 },
        { label: 'ETS +50%', multiplier: 1.5 }
      ];
      
      const analysis = scenarios.map(scenario => ({
        scenario: scenario.label,
        ets_price_eur: parseFloat((basePrice * scenario.multiplier).toFixed(2)),
        total_cost_eur: parseFloat((certificatesRequired * basePrice * scenario.multiplier).toFixed(2)),
        delta_from_current_eur: parseFloat((certificatesRequired * basePrice * (scenario.multiplier - 1)).toFixed(2))
      }));
      
      // Audit
      await AuditTrailService.log({
        lifecycle: this.LIFECYCLE,
        entity_type: 'FinancialAnalysis',
        entity_id: reportId || 'all',
        action: 'ets_sensitivity_analyzed',
        user_email: user.email,
        details: {
          certificates_required: certificatesRequired,
          base_ets_price: basePrice,
          scenarios: analysis
        }
      });
      
      return { 
        success: true, 
        analysis,
        certificates_required: certificatesRequired,
        base_ets_price: basePrice
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * C. WORKING CAPITAL TIMING
   * Cash flow impact by quarter
   */
  async analyzeWorkingCapitalTiming(year) {
    try {
      const user = await base44.auth.me();
      
      const reports = await base44.entities.CBAMReport.list();
      const yearReports = reports.filter(r => r.reporting_year === year);
      
      const etsPrice = await this.getCurrentETSPrice();
      
      const quarters = [];
      for (let q = 1; q <= 4; q++) {
        const report = yearReports.find(r => r.reporting_quarter === q);
        
        if (report) {
          quarters.push({
            quarter: `Q${q}`,
            certificates_required: report.certificates_required || 0,
            cost_eur: (report.certificates_required || 0) * etsPrice.price,
            submission_deadline: report.submission_deadline,
            status: report.status
          });
        } else {
          quarters.push({
            quarter: `Q${q}`,
            certificates_required: 0,
            cost_eur: 0,
            submission_deadline: null,
            status: 'not_generated'
          });
        }
      }
      
      const totalCost = quarters.reduce((sum, q) => sum + q.cost_eur, 0);
      
      // Audit
      await AuditTrailService.log({
        lifecycle: this.LIFECYCLE,
        entity_type: 'FinancialAnalysis',
        entity_id: year.toString(),
        action: 'working_capital_analyzed',
        user_email: user.email,
        details: {
          year,
          total_cost: totalCost,
          quarters: quarters.length
        }
      });
      
      return {
        success: true,
        year,
        quarters,
        total_annual_cost_eur: parseFloat(totalCost.toFixed(2)),
        ets_price_reference: etsPrice.price
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * D. DATA QUALITY COST SIGNAL
   * Financial value of supplier collaboration
   */
  async analyzeDataQualityCostSignal() {
    try {
      const user = await base44.auth.me();
      
      const entries = await base44.entities.CBAMEmissionEntry.list();
      
      // Group by supplier
      const supplierAnalysis = {};
      
      entries.forEach(entry => {
        const supplierId = entry.supplier_id || 'unknown';
        
        if (!supplierAnalysis[supplierId]) {
          supplierAnalysis[supplierId] = {
            supplier_id: supplierId,
            total_entries: 0,
            using_defaults: 0,
            using_actual: 0,
            excess_cost_from_defaults: 0
          };
        }
        
        const sa = supplierAnalysis[supplierId];
        sa.total_entries++;
        
        if (entry.calculation_method === 'default_values') {
          sa.using_defaults++;
          
          // Calculate excess from markup
          if (entry.default_value_with_markup && entry.mark_up_percentage_applied) {
            const baseValue = entry.default_value_with_markup / (1 + entry.mark_up_percentage_applied / 100);
            const excess = (entry.default_value_with_markup - baseValue) * (entry.quantity || 0);
            sa.excess_cost_from_defaults += excess;
          }
        } else {
          sa.using_actual++;
        }
      });
      
      const etsPrice = await this.getCurrentETSPrice();
      
      // Convert to array and calculate costs
      const supplierScores = Object.values(supplierAnalysis).map(sa => ({
        ...sa,
        data_quality_score: sa.total_entries > 0 ? (sa.using_actual / sa.total_entries * 100).toFixed(1) : 0,
        potential_savings_eur: parseFloat((sa.excess_cost_from_defaults * etsPrice.price).toFixed(2))
      })).sort((a, b) => b.potential_savings_eur - a.potential_savings_eur);
      
      return {
        success: true,
        suppliers: supplierScores,
        ets_price_reference: etsPrice.price,
        total_potential_savings: parseFloat(
          supplierScores.reduce((sum, s) => sum + s.potential_savings_eur, 0).toFixed(2)
        )
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * E. RISK FLAGS
   * Financial risk indicators
   */
  async analyzeRiskFlags(reportId = null) {
    try {
      let entries = [];
      
      if (reportId) {
        const reports = await base44.entities.CBAMReport.list();
        const report = reports.find(r => r.id === reportId);
        if (!report) {
          return { success: false, error: 'Report not found' };
        }
        const allEntries = await base44.entities.CBAMEmissionEntry.list();
        entries = allEntries.filter(e => report.linked_entries.includes(e.id));
      } else {
        entries = await base44.entities.CBAMEmissionEntry.list();
      }
      
      const flags = {
        high_default_reliance: {
          count: entries.filter(e => e.calculation_method === 'default_values').length,
          severity: 'MEDIUM',
          message: 'Entries using default values with markup penalty'
        },
        pending_verification: {
          count: entries.filter(e => 
            (e.calculation_method === 'actual_values' || e.calculation_method === 'EU_method') &&
            e.verification_status !== 'verifier_satisfactory'
          ).length,
          severity: 'HIGH',
          message: 'Actual method entries awaiting verification'
        },
        materiality_threshold: {
          count: entries.filter(e => e.materiality_assessment_5_percent === false).length,
          severity: 'MEDIUM',
          message: 'Entries exceeding 5% materiality threshold'
        },
        validation_warnings: {
          count: entries.filter(e => e.validation_status === 'warning').length,
          severity: 'LOW',
          message: 'Entries with validation warnings'
        }
      };
      
      const totalRiskScore = 
        flags.high_default_reliance.count * 2 +
        flags.pending_verification.count * 5 +
        flags.materiality_threshold.count * 3 +
        flags.validation_warnings.count * 1;
      
      return {
        success: true,
        flags,
        total_entries: entries.length,
        risk_score: totalRiskScore,
        risk_level: totalRiskScore > 50 ? 'HIGH' : totalRiskScore > 20 ? 'MEDIUM' : 'LOW'
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * COMPREHENSIVE FINANCIAL DASHBOARD
   * All financial intelligence in one call
   */
  async getFinancialDashboard(reportId = null) {
    try {
      const [
        nonCompliance,
        sensitivity,
        riskFlags
      ] = await Promise.all([
        this.analyzeCostOfNonCompliance(reportId),
        this.analyzeETSPriceSensitivity(reportId),
        this.analyzeRiskFlags(reportId)
      ]);
      
      return {
        success: true,
        dashboard: {
          cost_of_non_compliance: nonCompliance.success ? nonCompliance.analysis : null,
          ets_sensitivity: sensitivity.success ? sensitivity.analysis : null,
          risk_flags: riskFlags.success ? riskFlags : null,
          generated_at: new Date().toISOString()
        }
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new FinancialService();