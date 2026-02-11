import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Advanced Precursor Calculator
 * Deep nested precursor emissions per Annex III
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cn_code, quantity, bom_structure } = await req.json();
    
    console.log('[Precursor Calc] Starting for CN:', cn_code, 'Qty:', quantity);
    
    // Fetch precursor mappings
    const precursors = await base44.asServiceRole.entities.CBAMPrecursor.filter({
      final_product_cn: cn_code
    });
    
    if (!precursors.length && !bom_structure) {
      console.log('[Precursor Calc] No precursors found');
      return Response.json({ 
        success: true,
        cn_code,
        quantity,
        total_embedded_emissions: 0,
        breakdown: [],
        message: 'No precursors configured for this product'
      });
    }
    
    const calculation = await calculateNestedPrecursors(
      base44,
      cn_code,
      quantity,
      bom_structure || precursors,
      0
    );
    
    console.log('[Precursor Calc] Complete:', calculation.total.toFixed(3), 'tCO2e');
    
    return Response.json({
      success: true,
      cn_code,
      quantity,
      total_embedded_emissions: calculation.total,
      breakdown: calculation.breakdown,
      nesting_levels: calculation.max_depth,
      precursors_count: calculation.count
    });
    
  } catch (error) {
    console.error('[Precursor Calc] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function calculateNestedPrecursors(base44, cn_code, quantity, precursors, depth) {
  if (depth > 5) {
    console.warn('[Precursor Calc] Max depth reached');
    return { total: 0, breakdown: [], max_depth: depth, count: 0 };
  }
  
  let totalEmissions = 0;
  const breakdown = [];
  let maxDepth = depth;
  let count = 0;
  
  for (const precursor of precursors) {
    const precursorCN = precursor.precursor_cn || precursor.precursor_cn_code || precursor.cn_code;
    const precursorQty = precursor.quantity_per_unit 
      ? precursor.quantity_per_unit * quantity 
      : (precursor.typical_percentage / 100) * quantity;
    
    // Get emission factor
    const emissionFactor = precursor.emissions_intensity_factor || 
      await getDefaultBenchmark(base44, precursorCN, precursor.country_of_origin);
    
    const precursorEmissions = precursorQty * emissionFactor;
    totalEmissions += precursorEmissions;
    count++;
    
    console.log(`[Precursor Calc] Level ${depth}: ${precursor.precursor_name} = ${precursorEmissions.toFixed(3)} tCO2e`);
    
    // Recursive: check for sub-precursors
    const subPrecursors = await base44.asServiceRole.entities.CBAMPrecursor.filter({
      final_product_cn: precursorCN
    });
    
    let subCalculation = { total: 0, breakdown: [], max_depth: depth, count: 0 };
    
    if (subPrecursors.length > 0) {
      subCalculation = await calculateNestedPrecursors(base44, precursorCN, precursorQty, subPrecursors, depth + 1);
      totalEmissions += subCalculation.total;
      maxDepth = Math.max(maxDepth, subCalculation.max_depth);
      count += subCalculation.count;
    }
    
    breakdown.push({
      level: depth,
      precursor_cn_code: precursorCN,
      precursor_name: precursor.precursor_name || 'Unknown',
      quantity: precursorQty,
      emission_factor: emissionFactor,
      direct_emissions: precursorEmissions,
      nested_emissions: subCalculation.total,
      total_emissions: precursorEmissions + subCalculation.total,
      sub_precursors: subCalculation.breakdown
    });
  }
  
  return { total: totalEmissions, breakdown, max_depth: maxDepth, count };
}

async function getDefaultBenchmark(base44, cn_code, country) {
  // Try database first
  const defaults = await base44.asServiceRole.entities.CBAMDefaultValue.filter({
    cn_code: cn_code.substring(0, 4),
    country_of_origin: country
  });
  
  if (defaults.length > 0) {
    return defaults[0].default_value_with_markup;
  }
  
  // Fallback to hardcoded benchmarks
  const categoryDefaults = {
    '7201': 1.330, '7203': 1.030, '7206': 1.530, '7208': 1.370,
    '7601': 8.500, '7604': 8.650,
    '2523': 0.766, '2532': 0.703,
    '2809': 2.050, '3102': 1.120,
    '2804': 10.500,
    '2716': 0.450
  };
  
  return categoryDefaults[cn_code.substring(0, 4)] || 2.0;
}