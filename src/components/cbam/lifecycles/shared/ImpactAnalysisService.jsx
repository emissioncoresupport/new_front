/**
 * CBAM IMPACT ANALYSIS SERVICE
 * Version: 2.0 - Regulatory Change Impact Assessment
 * 
 * SHARED SERVICE: Analyze financial and operational impact of regulatory changes
 * Domain: Read-only impact analysis
 * Boundaries: NO data mutation, analysis only
 */

import { base44 } from '@/api/base44Client';
import AuditTrailService from './AuditTrailService';

class ImpactAnalysisService {
  VERSION = '2.0';
  
  /**
   * Analyze impact of regulatory version change
   * COMPREHENSIVE analysis - scope, financial, risk
   */
  async analyzeVersionChange(currentVersionId, newVersionId) {
    try {
      const user = await base44.auth.me();
      
      // Fetch versions
      const versions = await base44.asServiceRole.entities.CBAMRegulatoryVersion.list();
      const currentVersion = versions.find(v => v.id === currentVersionId || v.version_id === currentVersionId);
      const newVersion = versions.find(v => v.id === newVersionId || v.version_id === newVersionId);
      
      if (!currentVersion || !newVersion) {
        return { success: false, error: 'Version not found' };
      }
      
      // Fetch all entries
      const entries = await base44.entities.CBAMEmissionEntry.list();
      
      // A. SCOPE OF IMPACT
      const scopeAnalysis = await this._analyzeScopeImpact(entries, currentVersion, newVersion);
      
      // B. FINANCIAL DELTA
      const financialAnalysis = await this._analyzeFinancialImpact(entries, currentVersion, newVersion);
      
      // C. RISK CLASSIFICATION
      const riskClassification = this._classifyRisk(financialAnalysis);
      
      // D. EXPLANATION
      const explanation = this._generateExplanation(currentVersion, newVersion, scopeAnalysis, financialAnalysis);
      
      const analysis = {
        current_version: currentVersion.version_id,
        new_version: newVersion.version_id,
        scope: scopeAnalysis,
        financial_delta: financialAnalysis,
        risk_classification: riskClassification,
        explanation,
        requires_user_approval: true,
        analyzed_at: new Date().toISOString()
      };
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'REGULATORY',
        entity_type: 'ImpactAnalysis',
        entity_id: newVersionId,
        action: 'impact_analyzed',
        user_email: user.email,
        details: {
          current_version: currentVersion.version_id,
          new_version: newVersion.version_id,
          affected_entries: scopeAnalysis.affected_entries_count,
          financial_delta_eur: financialAnalysis.total_delta_eur,
          risk_level: riskClassification.level
        }
      });
      
      return { success: true, analysis };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * A. SCOPE OF IMPACT
   */
  async _analyzeScopeImpact(entries, currentVersion, newVersion) {
    // Identify which entries are affected
    const affectedEntries = entries.filter(entry => {
      // Entry uses current version or no version specified
      return !entry.regulatory_version_id || entry.regulatory_version_id === currentVersion.id;
    });
    
    // Group by reporting period
    const periodGroups = {};
    affectedEntries.forEach(entry => {
      const period = `${entry.reporting_period_year}-Q${Math.ceil(new Date(entry.import_date).getMonth() / 3) || 1}`;
      periodGroups[period] = (periodGroups[period] || 0) + 1;
    });
    
    // Check if any submitted reports are affected
    const reports = await base44.entities.CBAMReport.list();
    const affectedReports = reports.filter(r => 
      r.linked_entries?.some(eId => affectedEntries.find(e => e.id === eId))
    );
    
    return {
      affected_entries_count: affectedEntries.length,
      affected_entries_ids: affectedEntries.map(e => e.id),
      affected_reporting_periods: Object.keys(periodGroups),
      affected_reports_count: affectedReports.length,
      affected_reports: affectedReports.map(r => ({
        id: r.id,
        period: r.reporting_period,
        status: r.status,
        entries_count: r.linked_entries?.length || 0
      })),
      submitted_reports_affected: affectedReports.filter(r => r.status === 'submitted').length
    };
  }
  
  /**
   * B. FINANCIAL DELTA
   */
  async _analyzeFinancialImpact(entries, currentVersion, newVersion) {
    // Simulate recalculation with new version parameters
    let totalDeltaEmissions = 0;
    let totalDeltaCertificates = 0;
    
    const affectedEntries = entries.filter(entry => 
      !entry.regulatory_version_id || entry.regulatory_version_id === currentVersion.id
    );
    
    affectedEntries.forEach(entry => {
      // Example: If markup changed
      const oldMarkup = currentVersion.default_markups?.[entry.reporting_period_year] || 0;
      const newMarkup = newVersion.default_markups?.[entry.reporting_period_year] || 0;
      
      if (entry.calculation_method === 'default_values' && oldMarkup !== newMarkup) {
        const baseEmissions = entry.default_value_used || 0;
        const oldTotal = baseEmissions * (1 + oldMarkup / 100);
        const newTotal = baseEmissions * (1 + newMarkup / 100);
        const delta = newTotal - oldTotal;
        
        totalDeltaEmissions += delta * (entry.quantity || 0);
      }
      
      // Example: If CBAM factor changed
      const oldFactor = currentVersion.cbam_factors?.[entry.reporting_period_year] || 1.0;
      const newFactor = newVersion.cbam_factors?.[entry.reporting_period_year] || 1.0;
      
      if (oldFactor !== newFactor) {
        const emissions = entry.chargeable_emissions || 0;
        const oldCerts = emissions * oldFactor;
        const newCerts = emissions * newFactor;
        totalDeltaCertificates += (newCerts - oldCerts);
      }
    });
    
    // Get ETS price
    const { data: etsData } = await base44.functions.invoke('euETSPriceFetcherV2', {});
    const etsPrice = etsData?.price || 85.0;
    
    const deltaCostEur = totalDeltaCertificates * etsPrice;
    
    return {
      delta_emissions_tco2e: parseFloat(totalDeltaEmissions.toFixed(2)),
      delta_certificates_required: parseFloat(totalDeltaCertificates.toFixed(2)),
      delta_cost_eur: parseFloat(deltaCostEur.toFixed(2)),
      ets_price_reference: etsPrice,
      entries_with_financial_impact: affectedEntries.filter(e => 
        e.calculation_method === 'default_values'
      ).length
    };
  }
  
  /**
   * C. RISK CLASSIFICATION
   */
  _classifyRisk(financialAnalysis) {
    const absCost = Math.abs(financialAnalysis.delta_cost_eur);
    
    let level = 'LOW';
    let threshold = 0;
    
    if (absCost > 100000) {
      level = 'HIGH';
      threshold = 100000;
    } else if (absCost > 10000) {
      level = 'MEDIUM';
      threshold = 10000;
    }
    
    return {
      level,
      threshold_eur: threshold,
      financial_impact_eur: financialAnalysis.delta_cost_eur,
      requires_cfo_approval: level === 'HIGH',
      recommendation: level === 'HIGH' 
        ? 'Immediate review and approval required'
        : level === 'MEDIUM'
        ? 'Review recommended before activation'
        : 'Low risk, can proceed with standard approval'
    };
  }
  
  /**
   * D. EXPLANATION
   */
  _generateExplanation(currentVersion, newVersion, scopeAnalysis, financialAnalysis) {
    const changes = [];
    
    // Check markup changes
    const years = [2026, 2027, 2028, 2029, 2030];
    years.forEach(year => {
      const oldMarkup = currentVersion.default_markups?.[year];
      const newMarkup = newVersion.default_markups?.[year];
      
      if (oldMarkup !== newMarkup) {
        changes.push({
          parameter: 'Default Value Markup',
          year,
          old_value: `${oldMarkup}%`,
          new_value: `${newMarkup}%`,
          impact: `Entries using default values will ${newMarkup > oldMarkup ? 'increase' : 'decrease'} emissions`
        });
      }
    });
    
    // Check CBAM factor changes
    years.forEach(year => {
      const oldFactor = currentVersion.cbam_factors?.[year];
      const newFactor = newVersion.cbam_factors?.[year];
      
      if (oldFactor !== newFactor) {
        changes.push({
          parameter: 'CBAM Phase-In Factor',
          year,
          old_value: `${(oldFactor * 100).toFixed(1)}%`,
          new_value: `${(newFactor * 100).toFixed(1)}%`,
          impact: `Certificate requirements will ${newFactor > oldFactor ? 'increase' : 'decrease'}`
        });
      }
    });
    
    return {
      summary: `Regulatory version ${newVersion.version_id} introduces ${changes.length} parameter changes affecting ${scopeAnalysis.affected_entries_count} entries`,
      changes,
      what_changes: changes.map(c => `${c.parameter} for ${c.year}: ${c.old_value} → ${c.new_value}`),
      what_stays_same: [
        'Historical submitted reports remain unchanged',
        'Calculation methodology remains unchanged',
        'Verification requirements remain unchanged'
      ],
      user_action_required: 'Review impact and approve recalculation to apply new regulatory parameters',
      financial_summary: financialAnalysis.delta_cost_eur >= 0
        ? `Estimated cost increase: €${Math.abs(financialAnalysis.delta_cost_eur).toLocaleString()}`
        : `Estimated cost savings: €${Math.abs(financialAnalysis.delta_cost_eur).toLocaleString()}`
    };
  }
}

export default new ImpactAnalysisService();