/**
 * DPP Validation Service - ESPR & Cirpass Compliance
 */

import { base44 } from '@/api/base44Client';

export const validateDPPData = async (dppData, product) => {
  const prompt = `You are an ESPR (EU Ecodesign for Sustainable Products Regulation) and Cirpass compliance expert. 
Validate this Digital Product Passport data for completeness, accuracy, and compliance.

Product: ${product?.name || 'Unknown'}
Category: ${product?.category || 'General'}

DPP Data:
${JSON.stringify(dppData, null, 2)}

Perform comprehensive validation:

1. COMPLETENESS CHECK (ESPR Requirements):
   - General product information (name, manufacturer, GTIN)
   - Material composition with percentages (must sum to 100%)
   - Circularity metrics (recyclability, recycled content, repairability, lifetime)
   - Sustainability data (carbon footprint, environmental impact)
   - Supply chain transparency
   - End-of-life instructions

2. ACCURACY & CONSISTENCY CHECK:
   - Material percentages sum to 100%
   - Carbon footprint reasonable for product category
   - Recyclability score matches material composition
   - Repairability index realistic
   - Expected lifetime reasonable for product type

3. CIRPASS ALIGNMENT:
   - Data model compliance
   - Required attributes present
   - Data quality standards met

4. ANOMALY DETECTION:
   - Unrealistic values (e.g., 500% recycled content, negative carbon footprint)
   - Conflicting information (e.g., 100% non-recyclable but high recyclability score)
   - Missing critical data
   - Outliers compared to product category norms

Return JSON with:
- overall_score: number (0-100)
- is_compliant: boolean
- completeness_score: number (0-100)
- accuracy_score: number (0-100)
- issues: array of {severity: "critical"|"warning"|"info", field: string, message: string, suggestion: string}
- passed_checks: array of strings
- failed_checks: array of strings`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        overall_score: { type: "number" },
        is_compliant: { type: "boolean" },
        completeness_score: { type: "number" },
        accuracy_score: { type: "number" },
        issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              severity: { type: "string" },
              field: { type: "string" },
              message: { type: "string" },
              suggestion: { type: "string" }
            }
          }
        },
        passed_checks: { type: "array", items: { type: "string" } },
        failed_checks: { type: "array", items: { type: "string" } }
      }
    }
  });

  return response;
};

export const validateMaterialComposition = (materials) => {
  const issues = [];
  
  if (!materials || materials.length === 0) {
    issues.push({
      severity: 'critical',
      field: 'material_composition',
      message: 'No materials defined',
      suggestion: 'Add at least one material to the composition'
    });
    return issues;
  }

  const totalPercentage = materials.reduce((sum, m) => sum + (m.percentage || 0), 0);
  
  if (Math.abs(totalPercentage - 100) > 0.1) {
    issues.push({
      severity: 'critical',
      field: 'material_composition',
      message: `Material percentages sum to ${totalPercentage.toFixed(1)}% (must be 100%)`,
      suggestion: 'Adjust material percentages to sum to exactly 100%'
    });
  }

  materials.forEach((mat, idx) => {
    if (!mat.material || mat.material.trim() === '') {
      issues.push({
        severity: 'critical',
        field: `material_composition[${idx}]`,
        message: 'Material name is empty',
        suggestion: 'Provide a specific material name'
      });
    }
    
    if (mat.percentage > 100 || mat.percentage < 0) {
      issues.push({
        severity: 'critical',
        field: `material_composition[${idx}]`,
        message: `Invalid percentage: ${mat.percentage}%`,
        suggestion: 'Percentage must be between 0 and 100'
      });
    }
    
    if (mat.hazardous && !mat.cas_number) {
      issues.push({
        severity: 'warning',
        field: `material_composition[${idx}]`,
        message: 'Hazardous material missing CAS number',
        suggestion: 'Provide CAS number for regulatory compliance'
      });
    }
  });

  return issues;
};

export const detectAnomalies = async (dppData, productCategory) => {
  const prompt = `Detect anomalies and outliers in this product data compared to typical ${productCategory} products:

${JSON.stringify(dppData, null, 2)}

Identify:
- Unrealistic values (e.g., carbon footprint too high/low for category)
- Conflicting information (e.g., recyclability score doesn't match materials)
- Suspicious patterns
- Data quality issues

Return JSON array of anomalies with:
- type: "unrealistic_value" | "inconsistency" | "outlier" | "data_quality"
- field: string
- detected_value: string
- expected_range: string
- severity: "high" | "medium" | "low"
- explanation: string`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        anomalies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              field: { type: "string" },
              detected_value: { type: "string" },
              expected_range: { type: "string" },
              severity: { type: "string" },
              explanation: { type: "string" }
            }
          }
        }
      }
    }
  });

  return response.anomalies || [];
};