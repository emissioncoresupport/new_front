/**
 * CBAM–CSRD RECONCILIATION SERVICE
 * Version: 2.0 - Cross-Module Financial & Emissions Alignment
 * Compliance: Reg 2023/956 + ESRS E1 (CSRD Directive 2022/2464)
 * 
 * SHARED SERVICE: Reconciliation between CBAM and CSRD
 * Domain: Read-only comparison and discrepancy detection
 * Boundaries: NO data mutation, NO recalculation, analysis only
 */

import { base44 } from '@/api/base44Client';
import AuditTrailService from './AuditTrailService';

class CBAMCSRDReconciliationService {
  VERSION = '2.0';
  
  /**
   * A. EMISSIONS ALIGNMENT
   * Map CBAM emissions to CSRD ESRS E1 Scope 3 Category 1
   */
  async reconcileEmissions(params = {}) {
    try {
      const user = await base44.auth.me();
      const { reporting_year, cbam_report_id, csrd_disclosure_id } = params;
      
      // Fetch CBAM data
      let cbamEmissions = 0;
      let cbamEntries = [];
      
      if (cbam_report_id) {
        const reports = await base44.entities.CBAMReport.list();
        const report = reports.find(r => r.id === cbam_report_id);
        
        if (report) {
          cbamEmissions = report.total_embedded_emissions || 0;
          cbamEntries = await base44.entities.CBAMEmissionEntry.filter({
            id: { $in: report.linked_entries || [] }
          });
        }
      } else if (reporting_year) {
        const entries = await base44.entities.CBAMEmissionEntry.filter({
          reporting_period_year: reporting_year
        });
        cbamEntries = entries;
        cbamEmissions = entries.reduce((sum, e) => sum + (e.total_embedded_emissions || 0), 0);
      }
      
      // Fetch CSRD data (Scope 3 Category 1 - Purchased Goods)
      let csrdScope3Cat1 = 0;
      let csrdDataPoint = null;
      
      if (csrd_disclosure_id) {
        const dataPoints = await base44.entities.CSRDDataPoint.filter({
          id: csrd_disclosure_id
        });
        csrdDataPoint = dataPoints[0];
        
        if (csrdDataPoint && csrdDataPoint.scope === 'scope_3_cat_1') {
          csrdScope3Cat1 = csrdDataPoint.value || 0;
        }
      } else if (reporting_year) {
        // Find relevant CSRD disclosure
        const dataPoints = await base44.entities.CSRDDataPoint.filter({
          reporting_year,
          scope: 'scope_3_cat_1'
        });
        
        if (dataPoints.length > 0) {
          csrdDataPoint = dataPoints[0];
          csrdScope3Cat1 = dataPoints.reduce((sum, dp) => sum + (dp.value || 0), 0);
        }
      }
      
      // Calculate delta
      const emissionsDelta = cbamEmissions - csrdScope3Cat1;
      const deltaPercent = csrdScope3Cat1 > 0 
        ? (emissionsDelta / csrdScope3Cat1 * 100) 
        : (cbamEmissions > 0 ? 100 : 0);
      
      // Determine alignment status
      let alignmentStatus = 'ALIGNED';
      const flags = [];
      
      if (Math.abs(deltaPercent) > 10) {
        alignmentStatus = 'MISALIGNED';
        flags.push({
          type: 'MATERIAL_VARIANCE',
          severity: 'HIGH',
          message: `CBAM emissions ${deltaPercent > 0 ? 'exceed' : 'below'} CSRD disclosure by ${Math.abs(deltaPercent).toFixed(1)}%`,
          regulation: 'ESRS E1-6 (GHG emissions)'
        });
      } else if (Math.abs(deltaPercent) > 5) {
        alignmentStatus = 'PARTIAL';
        flags.push({
          type: 'MODERATE_VARIANCE',
          severity: 'MEDIUM',
          message: `Variance of ${Math.abs(deltaPercent).toFixed(1)}% requires explanation`,
          regulation: 'ESRS E1-6'
        });
      }
      
      // Check boundary consistency
      if (cbamEmissions > csrdScope3Cat1 && csrdScope3Cat1 > 0) {
        flags.push({
          type: 'POTENTIAL_UNDER_DISCLOSURE',
          severity: 'HIGH',
          message: 'CBAM data suggests CSRD Scope 3 may be understated',
          regulation: 'ESRS E1-6'
        });
      }
      
      const reconciliation = {
        reconciliation_status: alignmentStatus,
        emissions_cbam_tco2e: parseFloat(cbamEmissions.toFixed(2)),
        emissions_csrd_scope3_cat1_tco2e: parseFloat(csrdScope3Cat1.toFixed(2)),
        emissions_delta_tco2e: parseFloat(emissionsDelta.toFixed(2)),
        delta_percent: parseFloat(deltaPercent.toFixed(2)),
        flags,
        cbam_entries_count: cbamEntries.length,
        csrd_data_source: csrdDataPoint?.data_source || 'not_specified',
        boundary_notes: cbamEmissions > 0 
          ? 'CBAM includes only imported goods in Annex I scope'
          : 'No CBAM data for period',
        regulatory_references: {
          cbam: 'Reg 2023/956',
          csrd: 'ESRS E1-6 (Scope 3 Category 1)',
          reconciliation_standard: 'GHG Protocol Scope 3'
        }
      };
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'RECONCILIATION',
        entity_type: 'EmissionsReconciliation',
        entity_id: cbam_report_id || reporting_year?.toString() || 'ad_hoc',
        action: 'emissions_reconciled',
        user_email: user.email,
        details: {
          cbam_emissions: cbamEmissions,
          csrd_emissions: csrdScope3Cat1,
          delta: emissionsDelta,
          status: alignmentStatus
        }
      });
      
      return { success: true, reconciliation };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * B. FINANCIAL RECONCILIATION
   * Compare CBAM cost exposure vs CSRD transition risk disclosures
   */
  async reconcileFinancials(params = {}) {
    try {
      const user = await base44.auth.me();
      const { reporting_year } = params;
      
      // CBAM financial exposure
      const cbamReports = await base44.entities.CBAMReport.filter({
        reporting_year
      });
      
      const cbamCertificatesRequired = cbamReports.reduce(
        (sum, r) => sum + (r.certificates_required || 0), 
        0
      );
      
      // Get ETS price
      const { data: etsData } = await base44.functions.invoke('euETSPriceFetcherV2', {});
      const etsPrice = etsData?.price || 85.0;
      
      const cbamCostExposureEur = cbamCertificatesRequired * etsPrice;
      
      // CSRD transition risk disclosures
      const csrdDataPoints = await base44.entities.CSRDDataPoint.filter({
        reporting_year,
        metric_type: 'carbon_pricing_financial_impact'
      });
      
      const csrdTransitionRiskEur = csrdDataPoints.reduce(
        (sum, dp) => sum + (dp.value || 0), 
        0
      );
      
      // Get CSRD carbon price assumption
      const csrdCarbonPriceAssumptions = await base44.entities.CSRDDataPoint.filter({
        reporting_year,
        metric_type: 'carbon_price_assumption'
      });
      
      const csrdCarbonPrice = csrdCarbonPriceAssumptions[0]?.value || 0;
      
      // Calculate deltas
      const financialDelta = cbamCostExposureEur - csrdTransitionRiskEur;
      const carbonPriceDelta = etsPrice - csrdCarbonPrice;
      
      // Determine alignment
      const financialDeltaPercent = csrdTransitionRiskEur > 0
        ? (financialDelta / csrdTransitionRiskEur * 100)
        : (cbamCostExposureEur > 0 ? 100 : 0);
      
      let alignmentStatus = 'ALIGNED';
      const flags = [];
      
      if (Math.abs(financialDeltaPercent) > 20) {
        alignmentStatus = 'MISALIGNED';
        flags.push({
          type: 'MATERIAL_FINANCIAL_VARIANCE',
          severity: 'HIGH',
          message: `CBAM cost exposure ${financialDeltaPercent > 0 ? 'exceeds' : 'below'} CSRD transition risk by ${Math.abs(financialDeltaPercent).toFixed(1)}%`,
          regulation: 'ESRS E1-9 (Anticipated financial effects)'
        });
      }
      
      if (Math.abs(carbonPriceDelta) > 15) {
        flags.push({
          type: 'CARBON_PRICE_INCONSISTENCY',
          severity: 'MEDIUM',
          message: `Carbon price assumptions differ: CBAM uses €${etsPrice}, CSRD assumes €${csrdCarbonPrice}`,
          regulation: 'ESRS E1-9'
        });
      }
      
      if (cbamCostExposureEur > csrdTransitionRiskEur * 1.2) {
        flags.push({
          type: 'UNDERSTATED_TRANSITION_RISK',
          severity: 'HIGH',
          message: 'CSRD transition risk disclosure may understate CBAM financial impact',
          regulation: 'ESRS E1-9, ESRS 2 IRO-1'
        });
      }
      
      const reconciliation = {
        reconciliation_status: alignmentStatus,
        cbam_cost_exposure_eur: parseFloat(cbamCostExposureEur.toFixed(2)),
        cbam_certificates_required: parseFloat(cbamCertificatesRequired.toFixed(2)),
        cbam_ets_price_eur: etsPrice,
        csrd_transition_risk_eur: parseFloat(csrdTransitionRiskEur.toFixed(2)),
        csrd_carbon_price_assumption_eur: csrdCarbonPrice,
        financial_delta_eur: parseFloat(financialDelta.toFixed(2)),
        financial_delta_percent: parseFloat(financialDeltaPercent.toFixed(2)),
        carbon_price_delta_eur: parseFloat(carbonPriceDelta.toFixed(2)),
        flags,
        regulatory_references: {
          cbam: 'Reg 2023/956 Art. 22-24 (Certificates)',
          csrd: 'ESRS E1-9 (Anticipated financial effects from climate risks)'
        }
      };
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'RECONCILIATION',
        entity_type: 'FinancialReconciliation',
        entity_id: reporting_year?.toString() || 'ad_hoc',
        action: 'financials_reconciled',
        user_email: user.email,
        details: {
          cbam_cost: cbamCostExposureEur,
          csrd_risk: csrdTransitionRiskEur,
          delta: financialDelta,
          status: alignmentStatus
        }
      });
      
      return { success: true, reconciliation };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * C. SUPPLIER RISK CONCENTRATION
   * Aggregate CBAM exposure by supplier with CSRD narrative mapping
   */
  async analyzeSupplierRiskConcentration(params = {}) {
    try {
      const user = await base44.auth.me();
      const { reporting_year } = params;
      
      // Fetch CBAM entries
      let entries = [];
      
      if (reporting_year) {
        entries = await base44.entities.CBAMEmissionEntry.filter({
          reporting_period_year: reporting_year
        });
      } else {
        entries = await base44.entities.CBAMEmissionEntry.list();
      }
      
      // Aggregate by supplier
      const supplierExposure = {};
      
      entries.forEach(entry => {
        const supplierId = entry.supplier_id || 'unknown';
        
        if (!supplierExposure[supplierId]) {
          supplierExposure[supplierId] = {
            supplier_id: supplierId,
            total_emissions_tco2e: 0,
            total_certificates: 0,
            entries_count: 0,
            using_defaults_count: 0,
            unverified_actual_count: 0,
            countries: new Set()
          };
        }
        
        const exposure = supplierExposure[supplierId];
        exposure.total_emissions_tco2e += entry.total_embedded_emissions || 0;
        exposure.total_certificates += entry.certificates_required || 0;
        exposure.entries_count++;
        
        if (entry.calculation_method === 'default_values') {
          exposure.using_defaults_count++;
        }
        
        if ((entry.calculation_method === 'actual_values' || entry.calculation_method === 'EU_method') &&
            entry.verification_status !== 'verifier_satisfactory') {
          exposure.unverified_actual_count++;
        }
        
        if (entry.country_of_origin) {
          exposure.countries.add(entry.country_of_origin);
        }
      });
      
      // Get ETS price
      const { data: etsData } = await base44.functions.invoke('euETSPriceFetcherV2', {});
      const etsPrice = etsData?.price || 85.0;
      
      // Convert to array and enrich with supplier data
      const suppliers = await base44.entities.Supplier.list();
      
      const concentrationAnalysis = Object.values(supplierExposure).map(exposure => {
        const supplier = suppliers.find(s => s.id === exposure.supplier_id);
        
        const costExposure = exposure.total_certificates * etsPrice;
        
        // Calculate risk flags
        const riskFlags = [];
        
        if (exposure.using_defaults_count / exposure.entries_count > 0.5) {
          riskFlags.push({
            type: 'HIGH_DEFAULT_RELIANCE',
            severity: 'HIGH',
            message: `${((exposure.using_defaults_count / exposure.entries_count) * 100).toFixed(0)}% of entries use default values`,
            potential_savings_eur: costExposure * 0.15 // Estimated 15% markup penalty
          });
        }
        
        if (exposure.unverified_actual_count > 0) {
          riskFlags.push({
            type: 'UNVERIFIED_DATA',
            severity: 'HIGH',
            message: `${exposure.unverified_actual_count} entries with unverified actual emissions`,
            compliance_risk: 'Report submission blocked'
          });
        }
        
        return {
          supplier_id: exposure.supplier_id,
          supplier_name: supplier?.legal_name || 'Unknown',
          supplier_country: supplier?.country || 'Unknown',
          total_emissions_tco2e: parseFloat(exposure.total_emissions_tco2e.toFixed(2)),
          total_certificates_required: parseFloat(exposure.total_certificates.toFixed(2)),
          cost_exposure_eur: parseFloat(costExposure.toFixed(2)),
          entries_count: exposure.entries_count,
          data_quality_score: ((exposure.entries_count - exposure.using_defaults_count) / exposure.entries_count * 100).toFixed(0),
          risk_flags: riskFlags,
          countries: Array.from(exposure.countries)
        };
      }).sort((a, b) => b.cost_exposure_eur - a.cost_exposure_eur);
      
      // Top 10 suppliers by cost
      const top10 = concentrationAnalysis.slice(0, 10);
      const top10TotalCost = top10.reduce((sum, s) => sum + s.cost_exposure_eur, 0);
      const totalCost = concentrationAnalysis.reduce((sum, s) => sum + s.cost_exposure_eur, 0);
      
      const concentration = {
        total_suppliers: concentrationAnalysis.length,
        top_10_suppliers: top10,
        top_10_cost_concentration_pct: totalCost > 0 ? (top10TotalCost / totalCost * 100).toFixed(1) : 0,
        high_risk_suppliers_count: concentrationAnalysis.filter(s => 
          s.risk_flags.some(f => f.severity === 'HIGH')
        ).length,
        ets_price_reference: etsPrice
      };
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'RECONCILIATION',
        entity_type: 'SupplierRiskConcentration',
        entity_id: reporting_year?.toString() || 'all',
        action: 'supplier_concentration_analyzed',
        user_email: user.email,
        details: {
          total_suppliers: concentration.total_suppliers,
          top_10_concentration: concentration.top_10_cost_concentration_pct,
          high_risk_count: concentration.high_risk_suppliers_count
        }
      });
      
      return { success: true, concentration };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * D. TIME HORIZON CONSISTENCY
   * Validate CBAM obligations vs CSRD time horizons
   */
  async reconcileTimeHorizons(reporting_year) {
    try {
      const user = await base44.auth.me();
      
      // CBAM obligations (quarterly, short-term)
      const cbamReports = await base44.entities.CBAMReport.filter({
        reporting_year
      });
      
      const cbamQuarterlyCosts = [];
      for (let q = 1; q <= 4; q++) {
        const report = cbamReports.find(r => r.reporting_quarter === q);
        cbamQuarterlyCosts.push({
          quarter: `Q${q}`,
          certificates: report?.certificates_required || 0,
          deadline: report?.submission_deadline || null,
          status: report?.status || 'not_generated'
        });
      }
      
      // CSRD transition plan horizons
      const csrdGoals = await base44.entities.SustainabilityGoal.filter({
        goal_type: 'carbon_pricing_transition'
      });
      
      const horizons = {
        short_term: csrdGoals.filter(g => g.time_horizon === 'short').map(g => ({
          description: g.description,
          target_year: g.target_year,
          financial_assumption: g.financial_impact_eur
        })),
        medium_term: csrdGoals.filter(g => g.time_horizon === 'medium').map(g => ({
          description: g.description,
          target_year: g.target_year,
          financial_assumption: g.financial_impact_eur
        })),
        long_term: csrdGoals.filter(g => g.time_horizon === 'long').map(g => ({
          description: g.description,
          target_year: g.target_year,
          financial_assumption: g.financial_impact_eur
        }))
      };
      
      // Flag mismatches
      const flags = [];
      
      const cbamImminent = cbamQuarterlyCosts.filter(q => q.status === 'draft' || q.status === 'pending').length > 0;
      const csrdShortTermPresent = horizons.short_term.length > 0;
      
      if (cbamImminent && !csrdShortTermPresent) {
        flags.push({
          type: 'MISSING_SHORT_TERM_DISCLOSURE',
          severity: 'HIGH',
          message: 'CBAM obligations are imminent but CSRD lacks short-term transition risk disclosure',
          regulation: 'ESRS E1-9 (Time horizons)'
        });
      }
      
      const reconciliation = {
        cbam_quarterly_obligations: cbamQuarterlyCosts,
        csrd_horizons: horizons,
        flags,
        consistency_check: flags.length === 0 ? 'CONSISTENT' : 'INCONSISTENT'
      };
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'RECONCILIATION',
        entity_type: 'TimeHorizonReconciliation',
        entity_id: reporting_year.toString(),
        action: 'time_horizons_reconciled',
        user_email: user.email,
        details: {
          cbam_quarters: cbamQuarterlyCosts.length,
          csrd_goals: horizons.short_term.length + horizons.medium_term.length + horizons.long_term.length,
          consistency: reconciliation.consistency_check
        }
      });
      
      return { success: true, reconciliation };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * COMPREHENSIVE RECONCILIATION DASHBOARD
   * All reconciliation analyses in one call
   */
  async getReconciliationDashboard(reporting_year) {
    try {
      const user = await base44.auth.me();
      
      const [
        emissions,
        financials,
        suppliers,
        timeHorizons
      ] = await Promise.all([
        this.reconcileEmissions({ reporting_year }),
        this.reconcileFinancials({ reporting_year }),
        this.analyzeSupplierRiskConcentration({ reporting_year }),
        this.reconcileTimeHorizons(reporting_year)
      ]);
      
      // Overall alignment
      const allStatuses = [
        emissions.reconciliation?.reconciliation_status,
        financials.reconciliation?.reconciliation_status,
        timeHorizons.reconciliation?.consistency_check
      ];
      
      const overallStatus = allStatuses.includes('MISALIGNED') || allStatuses.includes('INCONSISTENT')
        ? 'MISALIGNED'
        : allStatuses.includes('PARTIAL')
        ? 'PARTIAL'
        : 'ALIGNED';
      
      // Aggregate all flags
      const allFlags = [
        ...(emissions.reconciliation?.flags || []),
        ...(financials.reconciliation?.flags || []),
        ...(timeHorizons.reconciliation?.flags || [])
      ];
      
      const highSeverityCount = allFlags.filter(f => f.severity === 'HIGH').length;
      
      const dashboard = {
        reporting_year,
        overall_status: overallStatus,
        high_severity_flags: highSeverityCount,
        total_flags: allFlags.length,
        
        emissions_alignment: emissions.reconciliation,
        financial_alignment: financials.reconciliation,
        supplier_concentration: suppliers.concentration,
        time_horizon_alignment: timeHorizons.reconciliation,
        
        all_flags: allFlags,
        
        action_required: highSeverityCount > 0
          ? `${highSeverityCount} high-severity discrepancies require review`
          : 'No critical discrepancies detected',
        
        generated_at: new Date().toISOString(),
        regulatory_framework: 'CBAM Reg 2023/956 + CSRD Directive 2022/2464 (ESRS E1)'
      };
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'RECONCILIATION',
        entity_type: 'ReconciliationDashboard',
        entity_id: reporting_year.toString(),
        action: 'dashboard_generated',
        user_email: user.email,
        details: {
          overall_status: overallStatus,
          high_severity_flags: highSeverityCount,
          year: reporting_year
        }
      });
      
      return { success: true, dashboard };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Generate AI explanation for discrepancies
   * AI MAY explain, MAY NOT modify
   */
  async generateDiscrepancyExplanation(reconciliationDashboard) {
    try {
      const user = await base44.auth.me();
      
      const highFlags = reconciliationDashboard.all_flags.filter(f => f.severity === 'HIGH');
      
      if (highFlags.length === 0) {
        return {
          success: true,
          explanation: {
            summary: 'No material discrepancies detected. CBAM and CSRD data are aligned.',
            recommendations: []
          }
        };
      }
      
      // Build context for AI
      const context = {
        flags: highFlags,
        emissions_delta: reconciliationDashboard.emissions_alignment?.emissions_delta_tco2e,
        financial_delta: reconciliationDashboard.financial_alignment?.financial_delta_eur,
        top_suppliers: reconciliationDashboard.supplier_concentration?.top_10_suppliers?.slice(0, 5)
      };
      
      // Call AI for explanation
      const { data: aiResponse } = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a CBAM and CSRD compliance expert.

Analyze the following reconciliation discrepancies between CBAM (Carbon Border Adjustment Mechanism) obligations and CSRD (Corporate Sustainability Reporting Directive) disclosures:

High-Severity Flags:
${JSON.stringify(highFlags, null, 2)}

Emissions Delta: ${context.emissions_delta} tCO2e
Financial Delta: €${context.financial_delta}

Top Suppliers by Cost Exposure:
${JSON.stringify(context.top_suppliers, null, 2)}

Provide:
1. A concise explanation of WHY these discrepancies exist (boundary differences, timing, data sources)
2. Specific recommendations to align CBAM and CSRD (supplier engagement, data quality, disclosure updates)
3. Regulatory context (which ESRS data points should be updated)

Keep it CFO-friendly and auditor-ready.`,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: {
              type: 'string',
              description: 'Concise explanation of discrepancies'
            },
            root_causes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  cause: { type: 'string' },
                  impact: { type: 'string' }
                }
              }
            },
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action: { type: 'string' },
                  priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
                  esrs_data_point: { type: 'string' }
                }
              }
            }
          }
        }
      });
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'RECONCILIATION',
        entity_type: 'AIExplanation',
        entity_id: 'discrepancy_analysis',
        action: 'ai_explanation_generated',
        user_email: user.email,
        details: {
          flags_analyzed: highFlags.length,
          ai_model_used: 'InvokeLLM'
        }
      });
      
      return {
        success: true,
        explanation: aiResponse,
        disclaimer: 'AI-generated explanation. Review and validate before acting.'
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new CBAMCSRDReconciliationService();