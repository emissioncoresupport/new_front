/**
 * PPWR Calculation Service
 * Mass balance verification, plastic tax, EPR fees, waste targets
 * Compliant with Regulation (EU) 2024/1852 - December 2025
 */

import { base44 } from '@/api/base44Client';

export class PPWRCalculationService {
  
  /**
   * Mass Balance Verification (Critical for recycled content claims)
   * Per Commission methodology (to be adopted 31 Dec 2026)
   */
  static verifyMassBalance(packaging, supplierDeclarations) {
    const totalMass = packaging.total_weight_kg;
    const declaredPCR = packaging.recycled_content_percentage || 0;
    const calculatedRecycledMass = (totalMass * declaredPCR) / 100;
    
    // Sum up supplier declarations
    const verifiedRecycledMass = supplierDeclarations
      .filter(d => d.verification_status === 'verified')
      .reduce((sum, d) => sum + (d.recycled_mass_kg || 0), 0);
    
    const discrepancy = Math.abs(calculatedRecycledMass - verifiedRecycledMass);
    const discrepancyPercent = totalMass > 0 ? (discrepancy / totalMass) * 100 : 0;
    
    // Allow 5% tolerance per industry standards
    const isValid = discrepancyPercent <= 5;
    
    return {
      valid: isValid,
      declared_recycled_kg: calculatedRecycledMass,
      verified_recycled_kg: verifiedRecycledMass,
      discrepancy_kg: discrepancy,
      discrepancy_percent: discrepancyPercent,
      confidence: isValid ? 'high' : (discrepancyPercent <= 10 ? 'medium' : 'low'),
      message: isValid 
        ? 'Mass balance verified - recycled content claim substantiated'
        : `Mass balance mismatch: ${discrepancyPercent.toFixed(1)}% discrepancy detected`,
      requires_audit: discrepancyPercent > 10
    };
  }
  
  /**
   * EU Plastic Tax Calculator
   * €0.80 per kg of non-recycled plastic packaging waste
   */
  static calculatePlasticTax(packaging) {
    if (!packaging.material_category?.includes('Plastic')) {
      return { applicable: false, tax_eur: 0 };
    }
    
    const totalPlasticKg = packaging.total_weight_kg;
    const recycledPercent = packaging.recycled_content_percentage || 0;
    const nonRecycledKg = totalPlasticKg * (1 - recycledPercent / 100);
    
    const taxRatePerKg = 0.80; // EUR per kg
    const taxAmount = nonRecycledKg * taxRatePerKg;
    
    return {
      applicable: true,
      total_plastic_kg: totalPlasticKg,
      recycled_kg: totalPlasticKg - nonRecycledKg,
      non_recycled_kg: nonRecycledKg,
      tax_rate_per_kg: taxRatePerKg,
      tax_eur: taxAmount,
      potential_savings: taxAmount * 0.5, // 50% reduction if PCR increased
      recommendation: recycledPercent < 30 
        ? `Increase PCR to 30% to save €${(taxAmount * 0.3).toFixed(2)}/year`
        : 'Optimize further to reduce tax burden'
    };
  }
  
  /**
   * EPR Fee Calculation (modulated by recyclability & eco-design)
   * Fees vary by Member State - this uses generic model
   */
  static calculateEPRFee(packaging) {
    const baseFeeRates = {
      'Plastic': 0.50,
      'Paper/Cardboard': 0.15,
      'Glass': 0.10,
      'Metal': 0.20,
      'Wood': 0.12,
      'Composite': 0.80
    };
    
    const baseFee = (baseFeeRates[packaging.material_category] || 0.40) * packaging.total_weight_kg;
    
    // Modulation factors
    let modulation = 1.0;
    
    // Bonus for recyclability (Art. 48 - eco-modulation)
    const recyclabilityScore = packaging.recyclability_score || 0;
    if (recyclabilityScore >= 90) modulation *= 0.80; // 20% reduction
    else if (recyclabilityScore >= 70) modulation *= 0.90; // 10% reduction
    else if (recyclabilityScore < 50) modulation *= 1.30; // 30% penalty
    
    // Bonus for recycled content
    const pcrPercent = packaging.recycled_content_percentage || 0;
    if (pcrPercent >= 50) modulation *= 0.85;
    else if (pcrPercent >= 30) modulation *= 0.95;
    
    // Penalty for PFAS/hazardous substances
    if (packaging.contains_pfas) modulation *= 1.50;
    if (packaging.contains_bisphenols) modulation *= 1.20;
    
    // Bonus for reusability
    if (packaging.is_reusable && packaging.reuse_cycles > 10) {
      modulation *= 0.70; // 30% reduction for highly reusable
    }
    
    const finalFee = baseFee * modulation;
    
    return {
      base_fee_eur: baseFee,
      modulation_factor: modulation,
      final_fee_eur: finalFee,
      savings_vs_base: baseFee - finalFee,
      breakdown: {
        recyclability_impact: recyclabilityScore >= 70 ? 'positive' : 'negative',
        pcr_impact: pcrPercent >= 30 ? 'positive' : 'neutral',
        hazards_impact: (packaging.contains_pfas || packaging.contains_bisphenols) ? 'negative' : 'neutral',
        reuse_impact: packaging.is_reusable ? 'positive' : 'neutral'
      },
      optimization_potential: this.getEPROptimizationTips(packaging, modulation)
    };
  }
  
  static getEPROptimizationTips(packaging, currentModulation) {
    const tips = [];
    
    if ((packaging.recyclability_score || 0) < 70) {
      tips.push('Improve recyclability score to 70+ for fee reduction');
    }
    if ((packaging.recycled_content_percentage || 0) < 30) {
      tips.push('Increase PCR to 30%+ for modulation bonus');
    }
    if (!packaging.is_reusable && packaging.packaging_format === 'Transport') {
      tips.push('Design for reusability (10+ cycles) to reduce fees by 30%');
    }
    if (packaging.contains_pfas) {
      tips.push('URGENT: Remove PFAS to avoid 50% fee penalty');
    }
    
    return tips;
  }
  
  /**
   * Waste Collection Target Calculation (Art. 45-46)
   * Member States must achieve specific collection rates
   */
  static calculateWasteCollectionTarget(packaging, memberState = 'EU') {
    const targets = {
      'Plastic': { 2026: 70, 2030: 77, 2040: 90 },
      'Paper/Cardboard': { 2026: 85, 2030: 85, 2040: 90 },
      'Glass': { 2026: 75, 2030: 80, 2040: 90 },
      'Metal': { 2026: 80, 2030: 85, 2040: 90 },
      'Wood': { 2026: 30, 2030: 35, 2040: 50 }
    };
    
    const materialTargets = targets[packaging.material_category];
    if (!materialTargets) return { applicable: false };
    
    const currentYear = new Date().getFullYear();
    let targetYear = 2026;
    if (currentYear >= 2040) targetYear = 2040;
    else if (currentYear >= 2030) targetYear = 2030;
    
    return {
      applicable: true,
      material: packaging.material_category,
      target_year: targetYear,
      target_percent: materialTargets[targetYear],
      obligation: 'Member State responsibility',
      producer_action: 'Design for easy separation and collection',
      drs_eligible: packaging.drs_eligible,
      recommendation: packaging.drs_eligible 
        ? 'DRS eligible - high collection rate expected'
        : 'Consider DRS eligibility to improve collection rates'
    };
  }
  
  /**
   * Reduction Target vs 2018 Baseline (Art. 5)
   * Per capita packaging waste reduction targets
   */
  static calculateReductionTarget(packaging, baseline2018Mass = null) {
    const targets = {
      2030: 5,  // 5% reduction vs 2018
      2035: 10, // 10% reduction
      2040: 15  // 15% reduction
    };
    
    if (!baseline2018Mass) {
      return {
        requires_baseline: true,
        message: 'Set 2018 baseline mass for reduction tracking'
      };
    }
    
    const currentYear = new Date().getFullYear();
    const targetYear = currentYear >= 2040 ? 2040 : (currentYear >= 2035 ? 2035 : 2030);
    const targetReduction = targets[targetYear];
    
    const targetMass = baseline2018Mass * (1 - targetReduction / 100);
    const actualReduction = ((baseline2018Mass - packaging.total_weight_kg) / baseline2018Mass) * 100;
    
    const onTrack = packaging.total_weight_kg <= targetMass;
    
    return {
      baseline_2018_kg: baseline2018Mass,
      current_kg: packaging.total_weight_kg,
      target_year: targetYear,
      target_reduction_percent: targetReduction,
      target_mass_kg: targetMass,
      actual_reduction_percent: actualReduction,
      on_track: onTrack,
      gap_kg: onTrack ? 0 : packaging.total_weight_kg - targetMass,
      message: onTrack 
        ? `On track: ${actualReduction.toFixed(1)}% reduction achieved`
        : `Off track: need ${((packaging.total_weight_kg - targetMass) / baseline2018Mass * 100).toFixed(1)}% more reduction`
    };
  }
  
  /**
   * Circular Economy Score (composite metric)
   */
  static calculateCircularityScore(packaging) {
    let score = 0;
    const weights = {
      recycled_content: 0.25,
      recyclability: 0.25,
      reusability: 0.20,
      design_optimization: 0.15,
      hazard_free: 0.15
    };
    
    // Recycled content (0-100)
    score += ((packaging.recycled_content_percentage || 0) / 100) * weights.recycled_content * 100;
    
    // Recyclability (0-100)
    score += ((packaging.recyclability_score || 0) / 100) * weights.recyclability * 100;
    
    // Reusability (0-100)
    const reuseScore = packaging.is_reusable ? Math.min((packaging.reuse_cycles || 0) * 2, 100) : 0;
    score += (reuseScore / 100) * weights.reusability * 100;
    
    // Design optimization (empty space, material efficiency)
    const designScore = 100 - Math.min((packaging.empty_space_ratio || 0), 100);
    score += (designScore / 100) * weights.design_optimization * 100;
    
    // Hazard-free (binary)
    const hazardFree = !packaging.contains_pfas && !packaging.contains_bisphenols;
    score += (hazardFree ? 1 : 0) * weights.hazard_free * 100;
    
    return {
      total_score: Math.round(score),
      grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D',
      breakdown: {
        recycled_content: Math.round(((packaging.recycled_content_percentage || 0) / 100) * 100),
        recyclability: packaging.recyclability_score || 0,
        reusability: Math.round(reuseScore),
        design: Math.round(designScore),
        hazard_free: hazardFree ? 100 : 0
      },
      industry_benchmark: 55, // Average score
      performance: score > 55 ? 'above_average' : 'below_average'
    };
  }
}

export default PPWRCalculationService;