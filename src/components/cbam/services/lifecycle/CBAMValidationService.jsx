/**
 * CBAM Validation Service - Validation Lifecycle ONLY
 * Domain: Regulatory validation rules
 * Responsibilities: Single source of truth for all CBAM validation
 * Boundaries: Does NOT calculate or mutate state
 */

import { AuditTrailService } from './CBAMAuditTrailService';
import { base44 } from '@/api/base44Client';
import eventBus, { CBAM_EVENTS } from '../CBAMEventBus';

export class CBAMValidationService {
  /**
   * Validate entry against C(2025) 8151 rules
   * Pure validation - no mutations
   */
  static validate(entry) {
    const errors = [];
    const warnings = [];
    
    // MANDATORY FIELDS per Art. 6(2)
    if (!entry.cn_code || entry.cn_code.length !== 8) {
      errors.push({
        field: 'cn_code',
        message: 'CN code must be exactly 8 digits',
        regulation: 'Art. 4 C(2025) 8151'
      });
    }
    
    if (!entry.country_of_origin) {
      errors.push({
        field: 'country_of_origin',
        message: 'Country of origin REQUIRED',
        regulation: 'Art. 6(2)(b) C(2025) 8151'
      });
    }
    
    if (!entry.quantity || entry.quantity <= 0) {
      errors.push({
        field: 'quantity',
        message: 'Quantity must be > 0',
        regulation: 'Art. 1(2) C(2025) 8151'
      });
    }
    
    if (!entry.reporting_period_year || entry.reporting_period_year < 2026) {
      errors.push({
        field: 'reporting_period_year',
        message: 'Reporting year cannot be before 2026',
        regulation: 'Art. 7 C(2025) 8151'
      });
    }
    
    // CALCULATION METHOD VALIDATION
    if (entry.calculation_method === 'actual_values') {
      if (!entry.installation_id) {
        errors.push({
          field: 'installation_id',
          message: 'Installation ID required for actual emissions',
          regulation: 'Art. 3(1)(c) C(2025) 8151'
        });
      }
      
      if (!entry.monitoring_plan_id) {
        warnings.push({
          field: 'monitoring_plan_id',
          message: 'Monitoring plan recommended (must be in English)',
          regulation: 'Art. 8-10 C(2025) 8151'
        });
      }
    }
    
    // CARBON PRICE DEDUCTION VALIDATION
    if (entry.carbon_price_due_paid > 0 && !entry.carbon_price_certificate_url) {
      errors.push({
        field: 'carbon_price_certificate_url',
        message: 'Certificate REQUIRED for carbon price deductions',
        regulation: 'Art. 9 C(2025) 8151'
      });
    }
    
    // PRECURSOR VALIDATION per Art. 13-15
    if (entry.precursors_used && entry.precursors_used.length > 0) {
      entry.precursors_used.forEach((precursor, idx) => {
        if (!precursor.precursor_cn_code) {
          errors.push({
            field: `precursors_used[${idx}].precursor_cn_code`,
            message: 'Precursor CN code required',
            regulation: 'Art. 13 C(2025) 8151'
          });
        }
        
        // Art. 14(2): Default year = complex good year
        if (!precursor.reporting_period_year) {
          warnings.push({
            field: `precursors_used[${idx}].reporting_period_year`,
            message: 'Precursor year defaults to complex good year unless proven otherwise',
            regulation: 'Art. 14(2) C(2025) 8151'
          });
        }
      });
    }
    
    // MATERIALITY THRESHOLD per Art. 5 C(2025) 8150
    if (entry.calculation_method === 'actual_values' && !entry.materiality_assessment_5_percent) {
      warnings.push({
        field: 'materiality_assessment_5_percent',
        message: '5% materiality threshold applies to verification',
        regulation: 'Art. 5 C(2025) 8150'
      });
    }
    
    // LANGUAGE REQUIREMENT
    if (entry.language && entry.language !== 'English') {
      errors.push({
        field: 'language',
        message: 'All CBAM declarations must be in English',
        regulation: 'Art. 16 C(2025) 8151'
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      compliance_score: errors.length === 0 ? 100 : Math.max(0, 100 - (errors.length * 10) - (warnings.length * 5))
    };
  }
  
  /**
   * Validate and update entry status
   */
  static async validateAndUpdate(entryId) {
    try {
      const user = await base44.auth.me();
      const entries = await base44.entities.CBAMEmissionEntry.filter({ id: entryId });
      const entry = entries[0];
      
      if (!entry) throw new Error('Entry not found');
      
      const validation = this.validate(entry);
      
      // Update validation status
      const updates = {
        validation_status: validation.valid ? 'validated' : 'flagged',
        validation_errors: validation.errors,
        validation_warnings: validation.warnings
      };
      
      const updated = await base44.entities.CBAMEmissionEntry.update(entryId, updates);
      
      // MANDATORY audit
      await AuditTrailService.log({
        entity_type: 'CBAMEmissionEntry',
        entity_id: entryId,
        action: 'validate',
        user_email: user.email,
        details: `Validation: ${validation.valid ? 'PASSED' : 'FAILED'} (${validation.errors.length} errors, ${validation.warnings.length} warnings)`,
        regulatory_reference: 'C(2025) 8151'
      });
      
      // Emit event
      eventBus.emit(CBAM_EVENTS.ENTRY_VALIDATED, { 
        entryId,
        entry: updated,
        validation
      });
      
      return { success: true, entry: updated, validation };
    } catch (error) {
      console.error('[ValidationService] Failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default CBAMValidationService;