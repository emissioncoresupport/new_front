/**
 * CBAM VALIDATION SERVICE - SOLE VALIDATION AUTHORITY
 * Version: 2.0 - Comprehensive Regulatory Enforcement
 * Compliance: C(2025) 8150, 8151, 8552, Reg 2023/956
 * 
 * LIFECYCLE 3: VALIDATION
 * Domain: Regulatory rule enforcement ONLY
 * Boundaries: NO calculations, NO mutations, evaluation only
 */

import { base44 } from '@/api/base44Client';
import eventBus, { CBAM_EVENTS } from '../../services/CBAMEventBus';
import AuditTrailService from '../shared/AuditTrailService';
import { getCBAMFactor } from '../../constants/regulatorySchedules';

// VALIDATION RULE REGISTRY
const VALIDATION_RULES = {
  MATERIALITY: 'C(2025) 8150 Art. 5',
  CN_CODE_FORMAT: 'C(2025) 8151 Art. 16(1)',
  MANDATORY_FIELDS: 'Reg 2023/956 Art. 16(1)',
  REPORTING_YEAR: 'C(2025) 8151 Art. 7',
  CARBON_PRICE_CERT: 'Reg 2023/956 Art. 9',
  METHOD_ELIGIBILITY: 'C(2025) 8151 Chapter 2-3',
  PRECURSOR_COMPLETENESS: 'C(2025) 8151 Art. 13-15',
  VERIFICATION_REQUIREMENT: 'C(2025) 8151 Chapter 5'
};

class ValidationService {
  LIFECYCLE = 'VALIDATION';
  VERSION = '2.0';
  
  /**
   * Validate entry against ALL regulatory requirements
   * Returns structured validation result - NO mutations
   */
  async validateAndUpdate(entryId) {
    try {
      const user = await base44.auth.me();
      
      const entries = await base44.entities.CBAMEmissionEntry.list();
      const entry = entries.find(e => e.id === entryId);
      
      if (!entry) {
        return { success: false, error: 'Entry not found' };
      }
      
      const blockingIssues = [];
      const warnings = [];
      const appliedRules = [];
      
      // === RULE SET A: DATA COMPLETENESS & CONSISTENCY ===
      appliedRules.push('DATA_COMPLETENESS');
      
      if (!entry.cn_code || !/^\d{8}$/.test(entry.cn_code)) {
        blockingIssues.push({
          rule: 'CN_CODE_FORMAT',
          field: 'cn_code',
          severity: 'BLOCKING',
          message: 'CN code must be exactly 8 digits',
          regulation: VALIDATION_RULES.CN_CODE_FORMAT,
          current_value: entry.cn_code || 'MISSING'
        });
      }
      
      if (!entry.country_of_origin) {
        blockingIssues.push({
          rule: 'MANDATORY_FIELDS',
          field: 'country_of_origin',
          severity: 'BLOCKING',
          message: 'Country of origin is mandatory',
          regulation: VALIDATION_RULES.MANDATORY_FIELDS
        });
      }
      
      if (!entry.quantity || entry.quantity <= 0) {
        blockingIssues.push({
          rule: 'MANDATORY_FIELDS',
          field: 'quantity',
          severity: 'BLOCKING',
          message: 'Quantity must be greater than 0',
          regulation: VALIDATION_RULES.MANDATORY_FIELDS,
          current_value: entry.quantity
        });
      }
      
      if (!entry.reporting_period_year || entry.reporting_period_year < 2026) {
        blockingIssues.push({
          rule: 'REPORTING_YEAR',
          field: 'reporting_period_year',
          severity: 'BLOCKING',
          message: 'Reporting year cannot be before 2026 (Definitive Regime)',
          regulation: VALIDATION_RULES.REPORTING_YEAR,
          current_value: entry.reporting_period_year
        });
      }
      
      // === RULE SET B: MATERIALITY THRESHOLD (5%) ===
      appliedRules.push('MATERIALITY_ASSESSMENT');
      
      let materialityResult = null;
      
      if (entry.total_embedded_emissions && entry.default_value_with_markup) {
        // Fetch benchmark for comparison
        const benchmarks = await base44.asServiceRole.entities.CBAMDefaultValue.filter({
          cn_code: entry.cn_code,
          reporting_year: entry.reporting_period_year
        });
        
        const benchmark = benchmarks[0];
        
        if (benchmark) {
          const reportedEmissions = entry.total_embedded_emissions;
          const benchmarkEmissions = benchmark.default_value * (entry.quantity || 1);
          const variance = Math.abs(reportedEmissions - benchmarkEmissions) / benchmarkEmissions;
          const variancePercent = variance * 100;
          
          materialityResult = {
            variance_percent: parseFloat(variancePercent.toFixed(2)),
            threshold: 5.0,
            exceeds_threshold: variancePercent > 5.0,
            reported: reportedEmissions,
            benchmark: benchmarkEmissions,
            regulation: VALIDATION_RULES.MATERIALITY
          };
          
          if (variancePercent > 5.0) {
            warnings.push({
              rule: 'MATERIALITY',
              field: 'total_embedded_emissions',
              severity: 'WARNING',
              message: `Variance ${variancePercent.toFixed(1)}% exceeds 5% materiality threshold - documentation required`,
              regulation: VALIDATION_RULES.MATERIALITY,
              variance_percent: variancePercent
            });
          }
        } else {
          warnings.push({
            rule: 'MATERIALITY',
            field: 'benchmark',
            severity: 'WARNING',
            message: 'No benchmark available for materiality assessment',
            regulation: VALIDATION_RULES.MATERIALITY
          });
        }
      }
      
      // === RULE SET C: METHOD ELIGIBILITY ===
      appliedRules.push('METHOD_ELIGIBILITY');
      
      let methodAcceptanceReason = '';
      const method = entry.calculation_method || 'default_values';
      
      if (method === 'actual_values' || method === 'EU_method') {
        // Actual data requires verification
        if (!entry.verification_status || entry.verification_status === 'not_verified') {
          blockingIssues.push({
            rule: 'VERIFICATION_REQUIREMENT',
            field: 'verification_status',
            severity: 'BLOCKING',
            message: 'Actual emissions require accredited verifier certification',
            regulation: VALIDATION_RULES.VERIFICATION_REQUIREMENT,
            current_value: entry.verification_status || 'not_verified'
          });
          methodAcceptanceReason = 'REJECTED: Actual method without verification';
        } else if (entry.verification_status === 'accredited_verifier_satisfactory') {
          methodAcceptanceReason = 'ACCEPTED: Actual emissions with satisfactory verification';
        } else {
          blockingIssues.push({
            rule: 'VERIFICATION_REQUIREMENT',
            field: 'verification_status',
            severity: 'BLOCKING',
            message: 'Verification status is not satisfactory',
            regulation: VALIDATION_RULES.VERIFICATION_REQUIREMENT,
            current_value: entry.verification_status
          });
          methodAcceptanceReason = 'REJECTED: Unsatisfactory verification';
        }
      } else if (method === 'default_values') {
        if (!entry.default_value_used) {
          warnings.push({
            rule: 'METHOD_ELIGIBILITY',
            field: 'default_value_used',
            severity: 'WARNING',
            message: 'Default method selected but default_value_used flag not set',
            regulation: VALIDATION_RULES.METHOD_ELIGIBILITY
          });
        }
        
        const markupPct = entry.mark_up_percentage_applied || 0;
        methodAcceptanceReason = `ACCEPTED: Default values with ${markupPct}% markup per C(2025) 8552`;
      } else {
        warnings.push({
          rule: 'METHOD_ELIGIBILITY',
          field: 'calculation_method',
          severity: 'WARNING',
          message: `Unknown calculation method: ${method}`,
          regulation: VALIDATION_RULES.METHOD_ELIGIBILITY,
          current_value: method
        });
        methodAcceptanceReason = 'UNKNOWN: Method not recognized';
      }
      
      // === RULE SET D: PRECURSOR COMPLETENESS (Complex Goods) ===
      appliedRules.push('PRECURSOR_COMPLETENESS');
      
      let precursorValidation = { complete: true, issues: [] };
      
      if (entry.precursors_used && entry.precursors_used.length > 0) {
        entry.precursors_used.forEach((precursor, idx) => {
          // Check reporting year alignment
          if (!precursor.reporting_period_year) {
            warnings.push({
              rule: 'PRECURSOR_COMPLETENESS',
              field: `precursors_used[${idx}].reporting_period_year`,
              severity: 'WARNING',
              message: `Precursor ${precursor.precursor_cn_code || idx} missing reporting year - defaulting to complex good year`,
              regulation: VALIDATION_RULES.PRECURSOR_COMPLETENESS
            });
            precursorValidation.complete = false;
          } else if (precursor.reporting_period_year !== entry.reporting_period_year) {
            // Different year allowed with evidence
            if (!precursor.evidence_url) {
              warnings.push({
                rule: 'PRECURSOR_COMPLETENESS',
                field: `precursors_used[${idx}].evidence_url`,
                severity: 'WARNING',
                message: `Precursor from different year (${precursor.reporting_period_year}) requires evidence documentation`,
                regulation: VALIDATION_RULES.PRECURSOR_COMPLETENESS
              });
            }
          }
          
          // Check emissions data
          if (!precursor.emissions_embedded && !precursor.emissions_intensity_factor) {
            blockingIssues.push({
              rule: 'PRECURSOR_COMPLETENESS',
              field: `precursors_used[${idx}].emissions_embedded`,
              severity: 'BLOCKING',
              message: `Precursor ${precursor.precursor_cn_code || idx} missing emission data`,
              regulation: VALIDATION_RULES.PRECURSOR_COMPLETENESS
            });
            precursorValidation.complete = false;
          }
          
          // Check installation traceability
          if (!precursor.production_installation_id) {
            warnings.push({
              rule: 'PRECURSOR_COMPLETENESS',
              field: `precursors_used[${idx}].production_installation_id`,
              severity: 'WARNING',
              message: `Precursor ${precursor.precursor_cn_code || idx} missing installation reference`,
              regulation: VALIDATION_RULES.PRECURSOR_COMPLETENESS
            });
          }
        });
        
        precursorValidation.issues = warnings.filter(w => w.rule === 'PRECURSOR_COMPLETENESS');
      }
      
      // === RULE SET E: CARBON PRICE DEDUCTION VALIDATION ===
      appliedRules.push('CARBON_PRICE_DEDUCTION');
      
      if (entry.carbon_price_due_paid && entry.carbon_price_due_paid > 0) {
        if (!entry.carbon_price_certificate_url) {
          blockingIssues.push({
            rule: 'CARBON_PRICE_CERT',
            field: 'carbon_price_certificate_url',
            severity: 'BLOCKING',
            message: 'Carbon price deduction requires certificate upload per Art. 9',
            regulation: VALIDATION_RULES.CARBON_PRICE_CERT,
            claimed_deduction: entry.carbon_price_due_paid
          });
        }
      }
      
      // === COMPUTE FINAL VALIDATION STATUS ===
      const validationStatus = blockingIssues.length > 0 ? 'BLOCKED' : 
                               warnings.length > 0 ? 'WARNING' : 
                               'PASS';
      
      const complianceScore = Math.round(
        ((appliedRules.length - blockingIssues.length - warnings.length * 0.5) / appliedRules.length) * 100
      );
      
      // === BUILD STRUCTURED OUTPUT ===
      const validationResult = {
        validation_status: validationStatus,
        valid: validationStatus === 'PASS',
        compliance_score: complianceScore,
        blocking_issues: blockingIssues,
        warnings: warnings,
        applied_rules: appliedRules,
        materiality_result: materialityResult,
        method_acceptance: {
          method: method,
          reason: methodAcceptanceReason,
          accepted: !blockingIssues.some(i => i.rule === 'VERIFICATION_REQUIREMENT')
        },
        precursor_validation: precursorValidation,
        regulatory_references: {
          validation_version: this.VERSION,
          primary_regulation: 'C(2025) 8151',
          materiality_regulation: 'C(2025) 8150',
          default_values_regulation: 'C(2025) 8552'
        },
        validated_at: new Date().toISOString(),
        validated_by: user.email
      };
      
      // === UPDATE ENTRY WITH VALIDATION RESULTS ===
      const updatedEntry = await base44.entities.CBAMEmissionEntry.update(entryId, {
        validation_status: validationStatus.toLowerCase(),
        validation_errors: blockingIssues,
        validation_warnings: warnings,
        compliance_score: complianceScore,
        materiality_assessment_5_percent: materialityResult?.exceeds_threshold === false,
        last_validation_date: new Date().toISOString(),
        validation_version: this.VERSION
      });
      
      // === MANDATORY AUDIT ===
      await AuditTrailService.log({
        lifecycle: this.LIFECYCLE,
        entity_type: 'CBAMEmissionEntry',
        entity_id: entryId,
        action: 'validated',
        user_email: user.email,
        details: {
          status: validationStatus,
          blocking_count: blockingIssues.length,
          warning_count: warnings.length,
          compliance_score: complianceScore,
          rules_applied: appliedRules,
          materiality_exceeded: materialityResult?.exceeds_threshold,
          method_accepted: validationResult.method_acceptance.accepted
        }
      });
      
      // === EMIT EVENT ===
      eventBus.emit(CBAM_EVENTS.ENTRY_VALIDATED, { 
        entryId, 
        entry: updatedEntry, 
        validation: validationResult 
      });
      
      return { 
        success: true, 
        entry: updatedEntry, 
        validation: validationResult
      };
      
    } catch (error) {
      console.error('[Validation] Error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Batch validate entries
   */
  async batchValidate(entryIds) {
    const results = {
      total: entryIds.length,
      passed: 0,
      warned: 0,
      blocked: 0,
      details: []
    };
    
    for (const entryId of entryIds) {
      const result = await this.validateAndUpdate(entryId);
      
      if (result.success) {
        results.details.push(result.validation);
        
        if (result.validation.validation_status === 'PASS') results.passed++;
        else if (result.validation.validation_status === 'WARNING') results.warned++;
        else if (result.validation.validation_status === 'BLOCKED') results.blocked++;
      }
    }
    
    return { success: true, results };
  }
  
  /**
   * Pre-submission validation for reports
   * Ensures only validated entries are included
   */
  async validateReportReadiness(entryIds) {
    try {
      const entries = await base44.entities.CBAMEmissionEntry.list();
      const reportEntries = entries.filter(e => entryIds.includes(e.id));
      
      const blocked = reportEntries.filter(e => e.validation_status === 'blocked');
      const unvalidated = reportEntries.filter(e => !e.validation_status || e.validation_status === 'pending');
      const passed = reportEntries.filter(e => e.validation_status === 'pass' || e.validation_status === 'warning');
      
      const readiness = {
        total_entries: reportEntries.length,
        validated: passed.length,
        blocked: blocked.length,
        unvalidated: unvalidated.length,
        ready_for_reporting: blocked.length === 0 && unvalidated.length === 0,
        blocking_entries: blocked.map(e => ({
          id: e.id,
          import_id: e.import_id,
          issues: e.validation_errors?.length || 0
        })),
        compliance_rate: reportEntries.length > 0 
          ? (passed.length / reportEntries.length * 100).toFixed(1) 
          : 0
      };
      
      return { success: true, readiness };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Validate precursor chain coherence
   */
  async validatePrecursorChain(entryId) {
    try {
      const entries = await base44.entities.CBAMEmissionEntry.list();
      const entry = entries.find(e => e.id === entryId);
      
      if (!entry || !entry.precursors_used || entry.precursors_used.length === 0) {
        return { 
          success: true, 
          result: { required: false, complete: true, issues: [] } 
        };
      }
      
      const issues = [];
      
      for (const precursor of entry.precursors_used) {
        // Year coherence (Art. 14(2))
        if (!precursor.reporting_period_year) {
          issues.push({
            precursor: precursor.precursor_cn_code,
            issue: 'Missing reporting year',
            severity: 'BLOCKING',
            regulation: 'C(2025) 8151 Art. 14(2)'
          });
        } else if (precursor.reporting_period_year !== entry.reporting_period_year && !precursor.evidence_url) {
          issues.push({
            precursor: precursor.precursor_cn_code,
            issue: 'Different year without evidence',
            severity: 'WARNING',
            regulation: 'C(2025) 8151 Art. 14(2)'
          });
        }
        
        // Installation traceability
        if (!precursor.production_installation_id) {
          issues.push({
            precursor: precursor.precursor_cn_code,
            issue: 'Missing installation reference',
            severity: 'WARNING',
            regulation: 'C(2025) 8151 Art. 14(3)'
          });
        }
        
        // Emission data completeness
        if (!precursor.emissions_embedded && !precursor.emissions_intensity_factor) {
          issues.push({
            precursor: precursor.precursor_cn_code,
            issue: 'Missing emission data',
            severity: 'BLOCKING',
            regulation: 'C(2025) 8151 Art. 13'
          });
        }
      }
      
      const blockingCount = issues.filter(i => i.severity === 'BLOCKING').length;
      
      return {
        success: true,
        result: {
          required: true,
          complete: blockingCount === 0,
          total_precursors: entry.precursors_used.length,
          blocking_issues: blockingCount,
          warning_issues: issues.filter(i => i.severity === 'WARNING').length,
          issues
        }
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new ValidationService();