/**
 * CBAM Data Quality Service
 * Scores data quality and completeness per C(2025) 8151
 */

export class CBAMDataQualityService {
  
  /**
   * Calculate comprehensive data quality score
   * @param {Object} entry - Emission entry
   * @returns {Object} { score, rating, breakdown, recommendations }
   */
  static calculateDataQualityScore(entry) {
    const scores = {
      completeness: this.scoreCompleteness(entry),
      accuracy: this.scoreAccuracy(entry),
      consistency: this.scoreConsistency(entry),
      documentation: this.scoreDocumentation(entry),
      timeliness: this.scoreTimeliness(entry)
    };
    
    // Weighted average
    const weights = {
      completeness: 0.30,
      accuracy: 0.25,
      consistency: 0.20,
      documentation: 0.15,
      timeliness: 0.10
    };
    
    const totalScore = Object.entries(scores).reduce((sum, [key, value]) => 
      sum + (value * weights[key]), 0
    );
    
    const rating = this.getRating(totalScore);
    
    const recommendations = this.generateRecommendations(scores, entry);
    
    return {
      score: Math.round(totalScore),
      rating,
      breakdown: scores,
      weights,
      recommendations,
      regulation: 'C(2025) 8151 Chapter 2-3'
    };
  }
  
  /**
   * Score completeness (0-100)
   */
  static scoreCompleteness(entry) {
    const requiredFields = [
      'cn_code',
      'country_of_origin',
      'quantity',
      'direct_emissions_specific',
      'reporting_period_year',
      'functional_unit',
      'calculation_method',
      'eori_number'
    ];
    
    const recommendedFields = [
      'installation_id',
      'installation_name',
      'production_route',
      'goods_nomenclature',
      'customs_declaration_mrn'
    ];
    
    let score = 0;
    let requiredPresent = 0;
    let recommendedPresent = 0;
    
    // Required fields (70% of score)
    for (const field of requiredFields) {
      if (entry[field]) {
        requiredPresent++;
      }
    }
    score += (requiredPresent / requiredFields.length) * 70;
    
    // Recommended fields (30% of score)
    for (const field of recommendedFields) {
      if (entry[field]) {
        recommendedPresent++;
      }
    }
    score += (recommendedPresent / recommendedFields.length) * 30;
    
    return Math.round(score);
  }
  
  /**
   * Score accuracy (0-100)
   */
  static scoreAccuracy(entry) {
    let score = 100;
    const penalties = [];
    
    // Check calculation method consistency
    if (entry.calculation_method === 'actual_values' && !entry.installation_id) {
      score -= 20;
      penalties.push('Actual values without installation ID');
    }
    
    // Check emissions logic
    if (entry.direct_emissions_specific < 0) {
      score -= 30;
      penalties.push('Negative emissions');
    }
    
    if (entry.total_embedded_emissions && entry.direct_emissions_specific) {
      const calculated = entry.quantity * entry.direct_emissions_specific;
      const deviation = Math.abs(calculated - entry.total_embedded_emissions) / calculated;
      if (deviation > 0.05) {
        score -= 15;
        penalties.push('Embedded emissions mismatch');
      }
    }
    
    // Check quantity logic
    if (entry.quantity <= 0) {
      score -= 40;
      penalties.push('Invalid quantity');
    }
    
    // Check year validity
    if (entry.reporting_period_year < 2026) {
      score -= 50;
      penalties.push('Invalid reporting year (<2026)');
    }
    
    // Check CN code format
    if (entry.cn_code && entry.cn_code.length !== 8) {
      score -= 10;
      penalties.push('CN code must be 8 digits');
    }
    
    return Math.max(0, Math.round(score));
  }
  
  /**
   * Score consistency (0-100)
   */
  static scoreConsistency(entry) {
    let score = 100;
    
    // Check production route matches category
    if (entry.production_route && entry.aggregated_goods_category) {
      // Logic would check if route is valid for category
      // Simplified for now
    }
    
    // Check functional unit matches category
    const validUnits = ['tonnes', 'MWh', 'kg_nitrogen', 'tonnes_clinker'];
    if (entry.functional_unit && !validUnits.includes(entry.functional_unit)) {
      score -= 20;
    }
    
    // Check default vs actual consistency
    if (entry.default_value_used && entry.calculation_method === 'actual_values') {
      score -= 30;
    }
    
    // Check markup application
    if (entry.mark_up_percentage_applied > 0 && entry.calculation_method === 'actual_values') {
      score -= 20;
    }
    
    return Math.max(0, Math.round(score));
  }
  
  /**
   * Score documentation (0-100)
   */
  static scoreDocumentation(entry) {
    let score = 0;
    
    // Monitoring plan
    if (entry.monitoring_plan_id) score += 30;
    
    // Operator report
    if (entry.operator_report_id) score += 25;
    
    // Verification
    if (entry.verification_status === 'accredited_verifier_satisfactory') score += 25;
    
    // Carbon price certificate
    if (entry.carbon_price_due_paid > 0 && entry.carbon_price_certificate_url) score += 20;
    
    return Math.round(score);
  }
  
  /**
   * Score timeliness (0-100)
   */
  static scoreTimeliness(entry) {
    let score = 100;
    
    if (!entry.import_date) {
      score -= 30;
    } else {
      const importDate = new Date(entry.import_date);
      const now = new Date();
      const daysSince = (now - importDate) / (1000 * 60 * 60 * 24);
      
      // Penalize if data is very old (>365 days)
      if (daysSince > 365) {
        score -= 20;
      } else if (daysSince > 180) {
        score -= 10;
      }
    }
    
    // Check if validation is current
    if (entry.validation_status === 'pending' && entry.created_date) {
      const created = new Date(entry.created_date);
      const now = new Date();
      const daysSince = (now - created) / (1000 * 60 * 60 * 24);
      
      if (daysSince > 30) {
        score -= 20;
      }
    }
    
    return Math.max(0, Math.round(score));
  }
  
  /**
   * Get rating from score
   */
  static getRating(score) {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'acceptable';
    if (score >= 40) return 'poor';
    return 'critical';
  }
  
  /**
   * Generate recommendations
   */
  static generateRecommendations(scores, entry) {
    const recommendations = [];
    
    if (scores.completeness < 80) {
      recommendations.push({
        priority: 'high',
        message: 'Complete all mandatory fields',
        fields: ['installation_id', 'production_route', 'goods_nomenclature']
      });
    }
    
    if (scores.accuracy < 70) {
      recommendations.push({
        priority: 'critical',
        message: 'Review and correct calculation errors',
        action: 'recalculate'
      });
    }
    
    if (scores.documentation < 50) {
      recommendations.push({
        priority: 'high',
        message: 'Upload supporting documentation',
        fields: ['monitoring_plan_id', 'verification_report_id']
      });
    }
    
    if (entry.calculation_method === 'Default_values' && !entry.monitoring_plan_id) {
      recommendations.push({
        priority: 'medium',
        message: 'Consider using actual emissions data for lower costs',
        benefit: '10-30% markup avoidance'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Batch quality assessment
   */
  static assessBatchQuality(entries) {
    const results = entries.map(entry => ({
      entry_id: entry.id,
      cn_code: entry.cn_code,
      ...this.calculateDataQualityScore(entry)
    }));
    
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const lowQuality = results.filter(r => r.score < 60).length;
    
    return {
      results,
      summary: {
        average_score: Math.round(avgScore),
        average_rating: this.getRating(avgScore),
        total_entries: entries.length,
        low_quality_count: lowQuality,
        low_quality_percentage: (lowQuality / entries.length) * 100
      }
    };
  }
}

export default CBAMDataQualityService;