/**
 * DPP Calculation Engine for PCF and Environmental Footprint
 */

import { base44 } from '@/api/base44Client';

export const calculateProductCarbonFootprint = async (product, materials, suppliers) => {
  const prompt = `Calculate the Product Carbon Footprint (PCF) for this product following ISO 14067 and GHG Protocol standards.

Product: ${product.name}
Category: ${product.category}
Weight: ${product.weight_kg} kg

Material Composition:
${materials.map(m => `- ${m.material}: ${m.percentage}% (${m.recyclable ? 'recyclable' : 'non-recyclable'})`).join('\n')}

Suppliers/Manufacturing:
${suppliers.map(s => `- ${s.name} in ${s.country}`).join('\n')}

Calculate PCF across lifecycle stages:
1. Raw Material Extraction & Processing (A1-A3)
2. Transportation (A4)
3. Manufacturing & Assembly (A5)
4. Use Phase (if applicable) (B1-B5)
5. End-of-Life (C1-C4)

Return detailed breakdown with:
- total_pcf_kg_co2e: total carbon footprint
- stages: breakdown by lifecycle stage with values
- methodology: ISO 14067 / GHG Protocol
- data_quality: "Measured", "Calculated", "Estimated"
- assumptions: key assumptions made
- uncertainty_percentage: uncertainty range

Base calculations on material types, weight, typical industry data, and transportation distances.`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        total_pcf_kg_co2e: { type: "number" },
        stages: {
          type: "object",
          properties: {
            raw_materials: { type: "number" },
            transportation: { type: "number" },
            manufacturing: { type: "number" },
            use_phase: { type: "number" },
            end_of_life: { type: "number" }
          }
        },
        methodology: { type: "string" },
        data_quality: { type: "string" },
        assumptions: { type: "array", items: { type: "string" } },
        uncertainty_percentage: { type: "number" }
      }
    }
  });

  return result;
};

export const calculateEnvironmentalFootprint = async (product, materials, pcfData) => {
  const prompt = `Calculate the Environmental Footprint for this product following the Product Environmental Footprint (PEF) method:

Product: ${product.name}
Weight: ${product.weight_kg} kg
PCF: ${pcfData.total_pcf_kg_co2e} kg CO2e

Materials:
${materials.map(m => `- ${m.material}: ${m.percentage}%`).join('\n')}

Calculate impacts across PEF categories:
1. Climate Change (kg CO2 eq)
2. Ozone Depletion (kg CFC-11 eq)
3. Human Toxicity (CTUh)
4. Particulate Matter (disease incidence)
5. Ionising Radiation (kBq U235 eq)
6. Photochemical Ozone Formation (kg NMVOC eq)
7. Acidification (mol H+ eq)
8. Eutrophication (terrestrial, freshwater, marine)
9. Ecotoxicity (freshwater CTUe)
10. Land Use (Pt)
11. Water Use (m³ world eq)
12. Resource Depletion (kg Sb eq)

Return normalized and weighted impact scores based on material composition.`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        pef_score: { type: "number" },
        impact_categories: {
          type: "object",
          properties: {
            climate_change: { type: "number" },
            ozone_depletion: { type: "number" },
            human_toxicity: { type: "number" },
            particulate_matter: { type: "number" },
            acidification: { type: "number" },
            eutrophication_freshwater: { type: "number" },
            eutrophication_marine: { type: "number" },
            water_use: { type: "number" },
            resource_depletion: { type: "number" }
          }
        },
        top_impacts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              value: { type: "number" },
              contribution_percentage: { type: "number" }
            }
          }
        },
        data_quality: { type: "string" }
      }
    }
  });

  return result;
};

export const calculateCircularityIndex = (materials, repairability, lifetime, recyclability) => {
  // Circularity Index formula based on EU PEF guidance and Material Circularity Indicator (MCI)
  let materialScore = 0;
  let totalWeight = 0;

  materials.forEach(mat => {
    const weight = mat.percentage || 0;
    totalWeight += weight;
    
    // Recycled content bonus
    const recycledBonus = mat.recycled_content_percentage || 0;
    
    // Recyclability factor
    const recyclabilityFactor = mat.recyclable ? 1 : 0.3;
    
    materialScore += (weight * (recycledBonus / 100) * recyclabilityFactor);
  });

  const materialCircularity = totalWeight > 0 ? (materialScore / totalWeight) : 0;
  
  // Lifetime factor (longer = better) - normalized to industry average
  const lifetimeFactor = Math.min(lifetime / 10, 1); // Normalize to 0-1
  
  // Repairability factor
  const repairabilityFactor = repairability / 10; // Already 0-10 scale
  
  // Recyclability factor
  const recyclabilityFactor = recyclability / 10;
  
  // Weighted circularity index using MCI methodology
  // Material circularity (40%) + Lifetime extension (20%) + Repairability (20%) + End-of-life (20%)
  const circularityIndex = (
    materialCircularity * 0.40 +
    lifetimeFactor * 0.20 +
    repairabilityFactor * 0.20 +
    recyclabilityFactor * 0.20
  ) * 100;

  return {
    circularity_index: Math.round(circularityIndex * 10) / 10,
    material_circularity: Math.round(materialCircularity * 100),
    lifetime_score: Math.round(lifetimeFactor * 100),
    repairability_score: Math.round(repairabilityFactor * 100),
    recyclability_score: Math.round(recyclabilityFactor * 100),
    methodology: 'Material Circularity Indicator (MCI) + EU PEF Guidance',
    data_quality: materials.length > 0 ? 'Calculated' : 'Estimated',
    weighting: {
      material_composition: '40%',
      lifetime_extension: '20%',
      repairability: '20%',
      end_of_life_recyclability: '20%'
    }
  };
};