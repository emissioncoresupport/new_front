/**
 * DPP Data Quality Service
 * Comprehensive data validation, quality scoring, and improvement suggestions
 */

import { getCategoryTemplate } from './DPPCategoryTemplates';
import { validateMaterialComposition } from './DPPValidationService';

/**
 * Calculate overall data quality score for DPP
 */
export const calculateDataQualityScore = (dppData, categoryTemplate) => {
  const scores = {
    completeness: calculateCompletenessScore(dppData, categoryTemplate),
    accuracy: calculateAccuracyScore(dppData),
    recency: calculateRecencyScore(dppData),
    consistency: calculateConsistencyScore(dppData)
  };

  // Weighted average: Completeness 40%, Accuracy 30%, Consistency 20%, Recency 10%
  const overallScore = (
    scores.completeness.score * 0.40 +
    scores.accuracy.score * 0.30 +
    scores.consistency.score * 0.20 +
    scores.recency.score * 0.10
  );

  return {
    overall_score: Math.round(overallScore),
    scores,
    grade: getDataQualityGrade(overallScore),
    recommendations: generateRecommendations(scores, dppData, categoryTemplate)
  };
};

/**
 * Completeness Score - Are all required fields filled?
 */
const calculateCompletenessScore = (dppData, categoryTemplate) => {
  const issues = [];
  let filledFields = 0;
  let totalFields = 0;

  // Check general info
  const generalFields = ['product_name', 'manufacturer', 'gtin'];
  generalFields.forEach(field => {
    totalFields++;
    if (dppData.general_info?.[field]) {
      filledFields++;
    } else {
      issues.push({
        severity: 'critical',
        field: `general_info.${field}`,
        message: `Missing ${field}`,
        suggestion: `Provide ${field} for product identification`
      });
    }
  });

  // Check category
  totalFields++;
  if (dppData.category) {
    filledFields++;
  } else {
    issues.push({
      severity: 'critical',
      field: 'category',
      message: 'Product category not selected',
      suggestion: 'Select a product category to apply correct templates'
    });
  }

  // Check material composition
  totalFields += 2;
  if (dppData.material_composition?.length > 0) {
    filledFields++;
    const totalPercentage = dppData.material_composition.reduce((sum, m) => sum + (m.percentage || 0), 0);
    if (Math.abs(totalPercentage - 100) <= 0.1) {
      filledFields++;
    } else {
      issues.push({
        severity: 'critical',
        field: 'material_composition',
        message: `Materials sum to ${totalPercentage.toFixed(1)}% (should be 100%)`,
        suggestion: 'Adjust material percentages to equal 100%'
      });
    }
  } else {
    issues.push({
      severity: 'critical',
      field: 'material_composition',
      message: 'No materials defined',
      suggestion: 'Add material composition data'
    });
  }

  // Check required materials from category template
  if (categoryTemplate?.required_materials) {
    const providedMaterials = dppData.material_composition?.map(m => m.material_name?.toLowerCase() || m.material?.toLowerCase()) || [];
    categoryTemplate.required_materials.forEach(reqMat => {
      totalFields++;
      const found = providedMaterials.some(pm => pm.includes(reqMat.toLowerCase().split(' ')[0]));
      if (found) {
        filledFields++;
      } else {
        issues.push({
          severity: 'warning',
          field: 'material_composition',
          message: `Missing typical ${categoryTemplate} material: ${reqMat}`,
          suggestion: `Consider adding ${reqMat} if applicable`
        });
      }
    });
  }

  // Check sustainability info
  const sustainabilityFields = ['carbon_footprint_kg', 'water_usage_liters', 'energy_consumption_kwh'];
  sustainabilityFields.forEach(field => {
    totalFields++;
    if (dppData.sustainability_info?.[field] && dppData.sustainability_info[field] > 0) {
      filledFields++;
    } else {
      issues.push({
        severity: 'warning',
        field: `sustainability_info.${field}`,
        message: `Missing ${field}`,
        suggestion: `Provide ${field} for environmental impact assessment`
      });
    }
  });

  // Check circularity metrics
  const circularityFields = ['recyclability_score', 'recycled_content_percentage', 'repairability_index', 'expected_lifetime_years'];
  circularityFields.forEach(field => {
    totalFields++;
    if (dppData.circularity_metrics?.[field] !== undefined && dppData.circularity_metrics[field] !== null) {
      filledFields++;
    } else {
      issues.push({
        severity: 'warning',
        field: `circularity_metrics.${field}`,
        message: `Missing ${field}`,
        suggestion: `Provide ${field} for circularity assessment`
      });
    }
  });

  // Check compliance declarations
  totalFields++;
  if (dppData.compliance_declarations?.length > 0) {
    filledFields++;
  } else {
    issues.push({
      severity: 'critical',
      field: 'compliance_declarations',
      message: 'No compliance declarations',
      suggestion: 'Add compliance status for relevant regulations (REACH, RoHS, etc.)'
    });
  }

  // Check EOL instructions
  totalFields++;
  if (dppData.eol_instructions && dppData.eol_instructions.length > 50) {
    filledFields++;
  } else {
    issues.push({
      severity: 'warning',
      field: 'eol_instructions',
      message: 'End-of-life instructions missing or incomplete',
      suggestion: 'Provide detailed recycling and disposal instructions'
    });
  }

  const score = (filledFields / totalFields) * 100;

  return {
    score: Math.round(score),
    filled_fields: filledFields,
    total_fields: totalFields,
    issues
  };
};

/**
 * Accuracy Score - Are the values realistic and correct?
 */
const calculateAccuracyScore = (dppData) => {
  const issues = [];
  let accurateFields = 0;
  let totalChecks = 0;

  // Check material percentages
  if (dppData.material_composition?.length > 0) {
    totalChecks++;
    const totalPercentage = dppData.material_composition.reduce((sum, m) => sum + (m.percentage || 0), 0);
    if (Math.abs(totalPercentage - 100) <= 0.1) {
      accurateFields++;
    } else {
      issues.push({
        severity: 'critical',
        field: 'material_composition',
        message: `Material percentages are inaccurate (${totalPercentage.toFixed(1)}%)`,
        suggestion: 'Ensure all material percentages sum to exactly 100%'
      });
    }

    // Check for negative percentages
    dppData.material_composition.forEach((mat, idx) => {
      totalChecks++;
      if (mat.percentage >= 0 && mat.percentage <= 100) {
        accurateFields++;
      } else {
        issues.push({
          severity: 'critical',
          field: `material_composition[${idx}].percentage`,
          message: `Invalid percentage: ${mat.percentage}%`,
          suggestion: 'Percentage must be between 0 and 100'
        });
      }
    });
  }

  // Check carbon footprint reasonableness
  if (dppData.sustainability_info?.carbon_footprint_kg !== undefined) {
    totalChecks++;
    if (dppData.sustainability_info.carbon_footprint_kg >= 0 && dppData.sustainability_info.carbon_footprint_kg < 100000) {
      accurateFields++;
    } else {
      issues.push({
        severity: 'warning',
        field: 'sustainability_info.carbon_footprint_kg',
        message: 'Carbon footprint value seems unrealistic',
        suggestion: 'Verify carbon footprint calculation'
      });
    }
  }

  // Check recyclability score range
  if (dppData.circularity_metrics?.recyclability_score !== undefined) {
    totalChecks++;
    if (dppData.circularity_metrics.recyclability_score >= 0 && dppData.circularity_metrics.recyclability_score <= 10) {
      accurateFields++;
    } else {
      issues.push({
        severity: 'critical',
        field: 'circularity_metrics.recyclability_score',
        message: 'Recyclability score must be between 0 and 10',
        suggestion: 'Correct recyclability score to valid range'
      });
    }
  }

  // Check repairability index range
  if (dppData.circularity_metrics?.repairability_index !== undefined) {
    totalChecks++;
    if (dppData.circularity_metrics.repairability_index >= 0 && dppData.circularity_metrics.repairability_index <= 10) {
      accurateFields++;
    } else {
      issues.push({
        severity: 'critical',
        field: 'circularity_metrics.repairability_index',
        message: 'Repairability index must be between 0 and 10',
        suggestion: 'Correct repairability index to valid range'
      });
    }
  }

  // Check recycled content percentage
  if (dppData.circularity_metrics?.recycled_content_percentage !== undefined) {
    totalChecks++;
    if (dppData.circularity_metrics.recycled_content_percentage >= 0 && dppData.circularity_metrics.recycled_content_percentage <= 100) {
      accurateFields++;
    } else {
      issues.push({
        severity: 'critical',
        field: 'circularity_metrics.recycled_content_percentage',
        message: 'Recycled content must be between 0 and 100%',
        suggestion: 'Correct recycled content percentage'
      });
    }
  }

  // Check lifetime
  if (dppData.circularity_metrics?.expected_lifetime_years !== undefined) {
    totalChecks++;
    if (dppData.circularity_metrics.expected_lifetime_years > 0 && dppData.circularity_metrics.expected_lifetime_years <= 100) {
      accurateFields++;
    } else {
      issues.push({
        severity: 'warning',
        field: 'circularity_metrics.expected_lifetime_years',
        message: 'Expected lifetime seems unrealistic',
        suggestion: 'Verify expected product lifetime'
      });
    }
  }

  const score = totalChecks > 0 ? (accurateFields / totalChecks) * 100 : 100;

  return {
    score: Math.round(score),
    accurate_fields: accurateFields,
    total_checks: totalChecks,
    issues
  };
};

/**
 * Consistency Score - Do related fields make sense together?
 */
const calculateConsistencyScore = (dppData) => {
  const issues = [];
  let consistentChecks = 0;
  let totalChecks = 0;

  // Check recyclability vs material composition
  if (dppData.material_composition?.length > 0 && dppData.circularity_metrics?.recyclability_score !== undefined) {
    totalChecks++;
    const recyclableMaterials = dppData.material_composition.filter(m => m.recyclable).length;
    const expectedScore = (recyclableMaterials / dppData.material_composition.length) * 10;
    
    if (Math.abs(dppData.circularity_metrics.recyclability_score - expectedScore) < 3) {
      consistentChecks++;
    } else {
      issues.push({
        severity: 'warning',
        field: 'circularity_metrics.recyclability_score',
        message: 'Recyclability score inconsistent with materials',
        suggestion: `Based on materials, expected score around ${expectedScore.toFixed(1)}/10`
      });
    }
  }

  // Check hazardous materials have CAS numbers
  if (dppData.material_composition?.length > 0) {
    const hazardousMaterials = dppData.material_composition.filter(m => m.hazardous);
    hazardousMaterials.forEach((mat, idx) => {
      totalChecks++;
      if (mat.cas_number) {
        consistentChecks++;
      } else {
        issues.push({
          severity: 'warning',
          field: `material_composition[${idx}].cas_number`,
          message: 'Hazardous material missing CAS number',
          suggestion: 'Provide CAS number for regulatory compliance'
        });
      }
    });
  }

  // Check if carbon footprint aligns with material composition
  if (dppData.sustainability_info?.carbon_footprint_kg && dppData.material_composition?.length > 0) {
    totalChecks++;
    const hasHighImpactMaterials = dppData.material_composition.some(m => 
      m.material_name?.toLowerCase().includes('plastic') || 
      m.material_name?.toLowerCase().includes('aluminum') ||
      m.material?.toLowerCase().includes('plastic') ||
      m.material?.toLowerCase().includes('aluminum')
    );
    
    // Basic heuristic check
    if ((hasHighImpactMaterials && dppData.sustainability_info.carbon_footprint_kg > 1) || 
        (!hasHighImpactMaterials && dppData.sustainability_info.carbon_footprint_kg >= 0)) {
      consistentChecks++;
    } else {
      issues.push({
        severity: 'info',
        field: 'sustainability_info.carbon_footprint_kg',
        message: 'Carbon footprint may not align with materials',
        suggestion: 'Verify PCF calculation methodology'
      });
    }
  }

  const score = totalChecks > 0 ? (consistentChecks / totalChecks) * 100 : 100;

  return {
    score: Math.round(score),
    consistent_checks: consistentChecks,
    total_checks: totalChecks,
    issues
  };
};

/**
 * Recency Score - How recent is the data?
 */
const calculateRecencyScore = (dppData) => {
  const issues = [];
  
  // Check if last_updated exists
  const lastUpdated = dppData.last_updated ? new Date(dppData.last_updated) : null;
  const now = new Date();
  
  if (!lastUpdated) {
    return {
      score: 100, // New data
      issues: []
    };
  }

  const daysSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60 * 24);
  
  let score = 100;
  
  if (daysSinceUpdate > 365) {
    score = 50;
    issues.push({
      severity: 'warning',
      field: 'last_updated',
      message: `Data is ${Math.round(daysSinceUpdate)} days old`,
      suggestion: 'Consider updating DPP data annually'
    });
  } else if (daysSinceUpdate > 180) {
    score = 75;
    issues.push({
      severity: 'info',
      field: 'last_updated',
      message: `Data is ${Math.round(daysSinceUpdate)} days old`,
      suggestion: 'DPP data should be reviewed periodically'
    });
  }

  return {
    score: Math.round(score),
    days_since_update: Math.round(daysSinceUpdate),
    issues
  };
};

/**
 * Generate improvement recommendations based on scores
 */
const generateRecommendations = (scores, dppData, categoryTemplate) => {
  const recommendations = [];

  // Collect all issues from all scores
  const allIssues = [
    ...scores.completeness.issues,
    ...scores.accuracy.issues,
    ...scores.consistency.issues,
    ...scores.recency.issues
  ];

  // Prioritize critical issues
  const criticalIssues = allIssues.filter(i => i.severity === 'critical');
  const warningIssues = allIssues.filter(i => i.severity === 'warning');
  const infoIssues = allIssues.filter(i => i.severity === 'info');

  // Add category-specific recommendations
  if (categoryTemplate) {
    if (categoryTemplate.critical_substances && (!dppData.material_composition || dppData.material_composition.length === 0)) {
      recommendations.push({
        priority: 'high',
        category: 'Regulatory Compliance',
        message: `For ${categoryTemplate} products, you must declare critical substances`,
        action: `Check for: ${categoryTemplate.critical_substances.join(', ')}`
      });
    }

    if (categoryTemplate.mandatory_fields) {
      categoryTemplate.mandatory_fields.forEach(field => {
        if (!dppData.general_info?.[field] && !dppData.sustainability_info?.[field]) {
          recommendations.push({
            priority: 'high',
            category: 'Mandatory Field',
            message: `Missing mandatory field for ${categoryTemplate}: ${field}`,
            action: `Provide ${field} data`
          });
        }
      });
    }
  }

  // High priority: Fix critical accuracy issues first
  if (scores.accuracy.score < 80) {
    recommendations.push({
      priority: 'high',
      category: 'Data Accuracy',
      message: 'Critical accuracy issues detected',
      action: 'Review and correct values that are out of valid ranges'
    });
  }

  // Medium priority: Complete missing fields
  if (scores.completeness.score < 70) {
    recommendations.push({
      priority: 'medium',
      category: 'Data Completeness',
      message: 'Several required fields are missing',
      action: 'Fill in missing product information and sustainability data'
    });
  }

  // Low priority: Improve consistency
  if (scores.consistency.score < 80) {
    recommendations.push({
      priority: 'low',
      category: 'Data Consistency',
      message: 'Some data inconsistencies detected',
      action: 'Verify that related fields align correctly'
    });
  }

  return {
    critical_issues: criticalIssues,
    warning_issues: warningIssues,
    info_issues: infoIssues,
    action_items: recommendations
  };
};

/**
 * Get data quality grade
 */
const getDataQualityGrade = (score) => {
  if (score >= 90) return { grade: 'A', label: 'Excellent', color: 'emerald' };
  if (score >= 80) return { grade: 'B', label: 'Good', color: 'green' };
  if (score >= 70) return { grade: 'C', label: 'Fair', color: 'yellow' };
  if (score >= 60) return { grade: 'D', label: 'Poor', color: 'orange' };
  return { grade: 'F', label: 'Insufficient', color: 'red' };
};

/**
 * Real-time field validation
 */
export const validateField = (fieldPath, value, dppData, categoryTemplate) => {
  const issues = [];

  // Material percentage validation
  if (fieldPath.includes('material_composition') && fieldPath.includes('percentage')) {
    if (value < 0 || value > 100) {
      issues.push({
        severity: 'critical',
        message: 'Percentage must be between 0 and 100',
        suggestion: 'Enter a valid percentage'
      });
    }

    // Check total percentage
    const materials = dppData.material_composition || [];
    const total = materials.reduce((sum, m) => sum + (m.percentage || 0), 0);
    if (Math.abs(total - 100) > 0.1 && materials.length > 0) {
      issues.push({
        severity: 'warning',
        message: `Total materials: ${total.toFixed(1)}% (should be 100%)`,
        suggestion: 'Adjust percentages to sum to 100%'
      });
    }
  }

  // Carbon footprint validation
  if (fieldPath === 'sustainability_info.carbon_footprint_kg') {
    if (value < 0) {
      issues.push({
        severity: 'critical',
        message: 'Carbon footprint cannot be negative',
        suggestion: 'Enter a positive value'
      });
    } else if (value > 50000) {
      issues.push({
        severity: 'warning',
        message: 'Unusually high carbon footprint',
        suggestion: 'Verify calculation is correct'
      });
    }
  }

  // Recyclability score validation
  if (fieldPath === 'circularity_metrics.recyclability_score') {
    if (value < 0 || value > 10) {
      issues.push({
        severity: 'critical',
        message: 'Recyclability score must be between 0 and 10',
        suggestion: 'Use the 0-10 scale'
      });
    }
  }

  // GTIN validation
  if (fieldPath === 'general_info.gtin') {
    if (value && value.length !== 13 && value.length !== 14) {
      issues.push({
        severity: 'warning',
        message: 'GTIN should be 13 or 14 digits',
        suggestion: 'Standard GTIN format: 13 or 14 numeric digits'
      });
    }
  }

  return issues;
};

/**
 * Export data quality report
 */
export const generateDataQualityReport = (qualityResult, dppData) => {
  return {
    report_date: new Date().toISOString(),
    product: dppData.general_info?.product_name || 'Unknown',
    overall_score: qualityResult.overall_score,
    grade: qualityResult.grade,
    breakdown: qualityResult.scores,
    critical_issues: qualityResult.recommendations.critical_issues.length,
    warning_issues: qualityResult.recommendations.warning_issues.length,
    recommendations: qualityResult.recommendations.action_items,
    next_review_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  };
};