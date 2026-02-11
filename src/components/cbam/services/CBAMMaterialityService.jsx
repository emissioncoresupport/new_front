/**
 * CBAM Materiality Service
 * 5% materiality threshold per C(2025) 8150 Art. 5
 * Determines if emission deviations require further investigation
 */

export class CBAMMaterialityService {
  
  /**
   * Assess materiality for an emission entry
   * Per C(2025) 8150 Art. 5 - 5% threshold
   * 
   * @param {Object} entry - Emission entry
   * @param {Array} allEntries - All entries for comparison (same CN code)
   * @returns {Object} { is_material, deviation_percent, threshold, assessment }
   */
  static assessMateriality(entry, allEntries = []) {
    const MATERIALITY_THRESHOLD = 5; // 5% per Art. 5
    
    const directEmissions = entry.direct_emissions_specific || 0;
    const cn_code = entry.cn_code;
    
    // Calculate average for same CN code
    const sameProductEntries = allEntries.filter(e => e.cn_code === cn_code && e.id !== entry.id);
    
    if (sameProductEntries.length === 0) {
      return {
        is_material: false,
        deviation_percent: 0,
        threshold: MATERIALITY_THRESHOLD,
        assessment: 'no_comparison_available',
        message: 'No other entries for comparison',
        regulation: 'C(2025) 8150 Art. 5'
      };
    }
    
    const avgEmissions = sameProductEntries.reduce((sum, e) => 
      sum + (e.direct_emissions_specific || 0), 0
    ) / sameProductEntries.length;
    
    if (avgEmissions === 0) {
      return {
        is_material: false,
        deviation_percent: 0,
        threshold: MATERIALITY_THRESHOLD,
        assessment: 'no_baseline',
        message: 'Average emissions is zero',
        regulation: 'C(2025) 8150 Art. 5'
      };
    }
    
    // Calculate deviation
    const deviation = Math.abs(directEmissions - avgEmissions);
    const deviationPercent = (deviation / avgEmissions) * 100;
    
    const isMaterial = deviationPercent > MATERIALITY_THRESHOLD;
    
    return {
      is_material: isMaterial,
      deviation_percent: deviationPercent,
      deviation_absolute: deviation,
      threshold: MATERIALITY_THRESHOLD,
      entry_value: directEmissions,
      average_value: avgEmissions,
      comparison_count: sameProductEntries.length,
      assessment: isMaterial ? 'material' : 'not_material',
      message: isMaterial 
        ? `Deviation ${deviationPercent.toFixed(1)}% exceeds ${MATERIALITY_THRESHOLD}% threshold`
        : `Deviation ${deviationPercent.toFixed(1)}% within ${MATERIALITY_THRESHOLD}% threshold`,
      regulation: 'C(2025) 8150 Art. 5',
      action_required: isMaterial ? 'further_investigation' : 'none'
    };
  }
  
  /**
   * Assess materiality for multiple entries (batch)
   */
  static assessMaterialityBatch(entries) {
    const results = [];
    
    for (const entry of entries) {
      const assessment = this.assessMateriality(entry, entries);
      results.push({
        entry_id: entry.id,
        cn_code: entry.cn_code,
        ...assessment
      });
    }
    
    // Summary
    const materialCount = results.filter(r => r.is_material).length;
    const totalCount = results.length;
    
    return {
      results,
      summary: {
        total_assessed: totalCount,
        material_issues: materialCount,
        material_percentage: totalCount > 0 ? (materialCount / totalCount) * 100 : 0,
        requires_attention: materialCount > 0
      }
    };
  }
  
  /**
   * Generate materiality report
   */
  static generateMaterialityReport(entries) {
    const batch = this.assessMaterialityBatch(entries);
    
    // Group by CN code
    const byCNCode = {};
    for (const result of batch.results) {
      const cn = result.cn_code;
      if (!byCNCode[cn]) {
        byCNCode[cn] = [];
      }
      byCNCode[cn].push(result);
    }
    
    // Identify high-risk CN codes
    const highRiskCodes = Object.entries(byCNCode)
      .filter(([cn, results]) => {
        const materialCount = results.filter(r => r.is_material).length;
        return materialCount > results.length * 0.3; // >30% material issues
      })
      .map(([cn, results]) => ({
        cn_code: cn,
        total_entries: results.length,
        material_issues: results.filter(r => r.is_material).length,
        avg_deviation: results.reduce((sum, r) => sum + r.deviation_percent, 0) / results.length
      }));
    
    return {
      ...batch,
      by_cn_code: byCNCode,
      high_risk_codes: highRiskCodes,
      regulation: 'C(2025) 8150 Art. 5'
    };
  }
  
  /**
   * Validate materiality assessment documentation
   */
  static validateMaterialityDocumentation(entry) {
    const errors = [];
    const warnings = [];
    
    if (entry.materiality_assessment_5_percent === true) {
      // Material issue identified - documentation required
      
      if (!entry.verification_status || entry.verification_status === 'not_verified') {
        errors.push({
          field: 'verification_status',
          message: 'Verification REQUIRED for material deviations',
          regulation: 'Art. 5(3)',
          severity: 'high'
        });
      }
      
      if (!entry.operator_report_id) {
        warnings.push({
          field: 'operator_report_id',
          message: 'Link to operator report recommended',
          regulation: 'Art. 5(4)'
        });
      }
      
      if (!entry.verification_report_id) {
        warnings.push({
          field: 'verification_report_id',
          message: 'Verification report recommended for transparency',
          regulation: 'Art. 5(5)'
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Check if verifier should flag deviation
   */
  static shouldVerifierFlag(materialityAssessment) {
    return materialityAssessment.is_material && 
           materialityAssessment.deviation_percent > 10; // >10% requires mandatory action
  }
}

export default CBAMMaterialityService;