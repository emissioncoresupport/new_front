/**
 * CBAM Validation Service
 * Comprehensive validation per C(2025) 8151
 * Enforces all mandatory fields and regulatory requirements
 */

import { CBAM_FACTOR_SCHEDULE, ANNEX_II_GOODS } from '../constants/officialBenchmarks2026';

export class CBAMValidationService {
  
  /**
   * Validate single entry for all regulatory requirements
   */
  static validateEntry(entry) {
    const errors = [];
    const warnings = [];
    
    // 1. CN Code - 8 digits MANDATORY
    if (!entry.cn_code) {
      errors.push({ field: 'cn_code', message: 'CN code REQUIRED', regulation: 'C(2025) 8151 Annex I' });
    } else if (entry.cn_code.length !== 8) {
      errors.push({ field: 'cn_code', message: 'CN code must be exactly 8 digits', regulation: 'Art. 4' });
    }
    
    // 2. Reporting year - CANNOT BE BEFORE 2026
    if (!entry.reporting_period_year) {
      errors.push({ field: 'reporting_period_year', message: 'Reporting year REQUIRED', regulation: 'Art. 7' });
    } else if (entry.reporting_period_year < 2026) {
      errors.push({ 
        field: 'reporting_period_year', 
        message: 'Reporting period CANNOT BE BEFORE 2026 (definitive regime starts 2026)', 
        regulation: 'C(2025) 8151 Art. 7' 
      });
    }
    
    // 3. Functional unit MANDATORY
    const validUnits = ['tonnes', 'kWh', 'kg_nitrogen', 'tonnes_clinker'];
    if (!entry.functional_unit) {
      errors.push({ field: 'functional_unit', message: 'Functional unit REQUIRED', regulation: 'Art. 4' });
    } else if (!validUnits.includes(entry.functional_unit)) {
      errors.push({ 
        field: 'functional_unit', 
        message: `Invalid unit. Allowed: ${validUnits.join(', ')}`, 
        regulation: 'Art. 4' 
      });
    }
    
    // 4. EORI format validation
    if (entry.eori_number) {
      const eoriPattern = /^[A-Z]{2}[A-Z0-9]{12,15}$/;
      if (!eoriPattern.test(entry.eori_number)) {
        errors.push({ 
          field: 'eori_number', 
          message: 'Invalid EORI format: [2-letter country][12-15 alphanumeric]', 
          regulation: 'Art. 16(1)' 
        });
      }
    }
    
    // 5. Country of origin
    if (!entry.country_of_origin) {
      errors.push({ field: 'country_of_origin', message: 'Country of origin REQUIRED', regulation: 'Art. 6(2)(b)' });
    }
    
    // 6. Quantity validation
    if (!entry.quantity || entry.quantity <= 0) {
      errors.push({ field: 'quantity', message: 'Quantity must be > 0', regulation: 'Art. 1(2)' });
    }
    
    // 7. Direct emissions MANDATORY
    if (!entry.direct_emissions_specific || entry.direct_emissions_specific <= 0) {
      errors.push({ 
        field: 'direct_emissions_specific', 
        message: 'Direct emissions REQUIRED (> 0)', 
        regulation: 'Chapter 2 & 3' 
      });
    }
    
    // 8. Production route for default values
    if (entry.calculation_method === 'Default_values' && !entry.production_route) {
      errors.push({ 
        field: 'production_route', 
        message: 'Production route REQUIRED when using Default Values', 
        regulation: 'C(2025) 8151 Chapter 3' 
      });
    }
    
    // 9. Installation linkage for actual data
    if ((entry.calculation_method === 'EU_method' || entry.calculation_method === 'actual_values')) {
      if (!entry.installation_id) {
        errors.push({ 
          field: 'installation_id', 
          message: 'Installation ID REQUIRED for actual emissions data', 
          regulation: 'Art. 3(1)(c)' 
        });
      }
      
      if (!entry.monitoring_plan_id) {
        errors.push({ 
          field: 'monitoring_plan_id', 
          message: 'Approved Monitoring Plan REQUIRED (must be in English)', 
          regulation: 'Art. 8-10 C(2025) 8151' 
        });
      }
    }
    
    // 10. Carbon price certificate
    if ((entry.carbon_price_due_paid || 0) > 0 && !entry.carbon_price_certificate_url) {
      errors.push({ 
        field: 'carbon_price_certificate_url', 
        message: 'Certificate/proof REQUIRED for carbon price deductions', 
        regulation: 'Art. 9' 
      });
    }
    
    // 11. Language requirement
    if (entry.language && entry.language !== 'English' && entry.language !== 'en') {
      errors.push({ 
        field: 'language', 
        message: 'All documents must be in English', 
        regulation: 'Art. 5(6), 10(4)' 
      });
    }
    
    // 12. Customs declaration
    if (!entry.customs_declaration_mrn) {
      warnings.push({ 
        field: 'customs_declaration_mrn', 
        message: 'Movement Reference Number recommended', 
        regulation: 'Art. 16' 
      });
    }
    
    // 13. Free allocation calculation check
    if (entry.free_allocation_adjustment) {
      const expectedFactor = CBAM_FACTOR_SCHEDULE[entry.reporting_period_year] || 0.025;
      const expectedFreePercent = (1 - expectedFactor) * 100;
      
      if (entry.free_allocation_percent && Math.abs(entry.free_allocation_percent - expectedFreePercent) > 0.1) {
        warnings.push({
          field: 'free_allocation_percent',
          message: `Free allocation should be ${expectedFreePercent.toFixed(1)}% in ${entry.reporting_period_year}`,
          regulation: 'Art. 31'
        });
      }
    }
    
    // 14. Indirect emissions for non-Annex II with default values
    if (entry.calculation_method === 'Default_values' && entry.indirect_emissions_specific > 0) {
      const isAnnexII = ANNEX_II_GOODS.some(good => 
        entry.aggregated_goods_category?.toLowerCase().includes(good.toLowerCase())
      );
      
      if (!isAnnexII) {
        warnings.push({
          field: 'indirect_emissions_specific',
          message: 'Indirect emissions for non-Annex II goods must use actual data (excluded from defaults)',
          regulation: 'Art. 12'
        });
      }
    }
    
    const isValid = errors.length === 0;
    const complianceScore = Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5));
    
    return {
      valid: isValid,
      errors,
      warnings,
      compliance_score: complianceScore,
      ready_for_submission: isValid && complianceScore >= 80
    };
  }
  
  /**
   * Validate batch of entries
   */
  static validateBatch(entries) {
    const results = entries.map(entry => ({
      entry_id: entry.id || entry.import_id,
      ...this.validateEntry(entry)
    }));
    
    const totalValid = results.filter(r => r.valid).length;
    const avgScore = results.reduce((sum, r) => sum + r.compliance_score, 0) / results.length;
    
    return {
      total_entries: entries.length,
      valid_entries: totalValid,
      invalid_entries: entries.length - totalValid,
      average_compliance_score: avgScore,
      results,
      batch_ready: totalValid === entries.length && avgScore >= 90
    };
  }
  
  /**
   * Check materiality threshold (5% per CN code)
   * Per C(2025) 8150 Art. 5
   */
  static checkMateriality(entry, allEntries) {
    const sameCNEntries = allEntries.filter(e => e.cn_code === entry.cn_code);
    
    if (sameCNEntries.length === 0) return { passes: true, deviation: 0 };
    
    const avgDirect = sameCNEntries.reduce((sum, e) => sum + (e.direct_emissions_specific || 0), 0) / sameCNEntries.length;
    const benchmark = entry.cbam_benchmark || avgDirect;
    const deviation = Math.abs(avgDirect - benchmark);
    const deviationPercent = benchmark > 0 ? (deviation / benchmark) * 100 : 0;
    
    return {
      passes: deviationPercent <= 5,
      deviation_percent: deviationPercent,
      threshold: 5,
      cn_code: entry.cn_code,
      regulation: 'C(2025) 8150 Art. 5'
    };
  }
}

export default CBAMValidationService;