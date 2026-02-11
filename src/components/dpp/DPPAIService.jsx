/**
 * DPP AI Service for automated material analysis and compliance
 */

import { base44 } from '@/api/base44Client';

export const suggestMaterialComposition = async (product, suppliers, components) => {
  const supplierInfo = suppliers.map(s => `${s.legal_name} (${s.country})`).join(', ');
  const componentInfo = components.map(c => `${c.name}: ${c.material_type || 'unknown'}`).join(', ');

  const prompt = `Analyze this product and suggest detailed material composition:

Product: ${product.name}
Category: ${product.category || 'General'}
Description: ${product.description || 'N/A'}
Weight: ${product.weight_kg || 'unknown'} kg
Suppliers: ${supplierInfo || 'None'}
Known Components: ${componentInfo || 'None'}

Based on this product category and available data, suggest a realistic material composition breakdown.

Return JSON with materials array containing:
- material: string (specific material name with type, e.g., "Aluminum Alloy 6061", "PET Plastic", "Stainless Steel 304")
- percentage: number (by weight, must sum to 100)
- recyclable: boolean
- hazardous: boolean
- cas_number: string (if hazardous or notable)
- recycling_code: string (for plastics, e.g., "PETE 1", "HDPE 2")
- sustainability_notes: string

Ensure materials are realistic for the product category and sum to 100%.`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        materials: {
          type: "array",
          items: {
            type: "object",
            properties: {
              material: { type: "string" },
              percentage: { type: "number" },
              recyclable: { type: "boolean" },
              hazardous: { type: "boolean" },
              cas_number: { type: "string" },
              recycling_code: { type: "string" },
              sustainability_notes: { type: "string" }
            }
          }
        },
        confidence: { type: "string" }
      }
    }
  });

  return response.materials || [];
};

export const calculateRecyclabilityScore = (materials) => {
  if (!materials || materials.length === 0) return 0;

  let score = 0;
  let totalWeight = 0;

  materials.forEach(mat => {
    const weight = mat.percentage || 0;
    totalWeight += weight;

    // Base recyclability
    let matScore = mat.recyclable ? 8 : 2;

    // Adjust for hazardous materials
    if (mat.hazardous) matScore -= 3;

    // Bonus for easily recyclable plastics
    if (mat.recycling_code?.includes('PETE 1') || mat.recycling_code?.includes('HDPE 2')) {
      matScore += 1;
    }

    // Bonus for metals
    if (mat.material?.toLowerCase().includes('aluminum') || 
        mat.material?.toLowerCase().includes('steel') ||
        mat.material?.toLowerCase().includes('copper')) {
      matScore += 1;
    }

    score += (matScore * weight);
  });

  const finalScore = totalWeight > 0 ? (score / totalWeight) : 0;
  return Math.min(10, Math.max(0, Math.round(finalScore * 10) / 10));
};

export const suggestComplianceDeclarations = async (materials, productCategory) => {
  const materialList = materials.map(m => 
    `${m.material} (${m.percentage}%, ${m.hazardous ? 'hazardous' : 'non-hazardous'})`
  ).join(', ');

  const prompt = `Based on these materials in a ${productCategory} product, identify applicable EU regulations and compliance requirements:

Materials: ${materialList}

Analyze and return JSON array of compliance declarations with:
- regulation: string (e.g., "REACH", "RoHS", "WEEE", "EU Battery Directive", "Packaging Directive")
- status: string ("Compliant", "Requires Testing", "Not Applicable")
- description: string
- certificate_required: boolean
- testing_required: boolean
- relevant_substances: array of strings (if any)

Focus on ESPR, REACH (SVHC), RoHS, WEEE, and packaging regulations.`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        declarations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              regulation: { type: "string" },
              status: { type: "string" },
              description: { type: "string" },
              certificate_required: { type: "boolean" },
              testing_required: { type: "boolean" },
              relevant_substances: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    }
  });

  return response.declarations || [];
};

export const fetchPCFData = async (productId) => {
  try {
    const product = await base44.entities.Product.list();
    const targetProduct = product.find(p => p.id === productId);
    
    if (targetProduct?.pcf_co2e) {
      return {
        carbon_footprint_kg: targetProduct.pcf_co2e,
        has_data: true,
        source: 'PCF Module'
      };
    }

    // Check for components PCF
    const components = await base44.entities.ProductComponent.list();
    const productComponents = components.filter(c => c.product_id === productId);
    
    let totalPCF = 0;
    productComponents.forEach(comp => {
      if (comp.carbon_footprint_kg) {
        totalPCF += comp.carbon_footprint_kg * (comp.quantity || 1);
      }
    });

    if (totalPCF > 0) {
      return {
        carbon_footprint_kg: totalPCF,
        has_data: true,
        source: 'Component Aggregation'
      };
    }

    return { carbon_footprint_kg: 0, has_data: false };
  } catch (error) {
    return { carbon_footprint_kg: 0, has_data: false };
  }
};