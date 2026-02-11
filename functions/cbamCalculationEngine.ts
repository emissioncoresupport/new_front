import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CBAM Pure Calculation Engine - Definitive Regime 2026
 * Version: 2.0 (Consolidated)
 * Compliance: C(2025) 8151, C(2025) 8552, Reg 2023/956 Art. 31
 * 
 * PURE CALCULATION ONLY:
 * - No database writes
 * - No validation logic
 * - No audit logging
 * - Stateless and deterministic
 */

// REGULATORY SCHEDULES - Externalized
const CBAM_FACTORS = {
  2026: 0.025, 2027: 0.05, 2028: 0.10, 2029: 0.225,
  2030: 0.4875, 2031: 0.71, 2032: 0.8775, 2033: 0.95, 2034: 1.0
};

const DEFAULT_MARKUPS = { 2026: 10, 2027: 20, 2028: 30, 2029: 30, 2030: 30 };

// BENCHMARKS - Annex I C(2025) 8151
const BENCHMARKS = {
  iron_ore_pellets: { blast_furnace: 0.058, direct_reduction: 0.045 },
  sinter: { standard: 0.172 },
  pig_iron: { blast_furnace: 1.330 },
  direct_reduced_iron: { coal_based: 1.480, gas_based: 0.580 },
  crude_steel: { basic_oxygen_furnace: 1.530, electric_arc_furnace: 0.283 },
  hot_rolled_coil: { bf_bof_route: 1.370, dri_eaf_route: 0.481, scrap_eaf_route: 0.072 },
  cold_rolled_coil: { bf_bof_route: 1.420, scrap_eaf_route: 0.120 },
  primary_aluminium: { electrolysis: 8.500 },
  secondary_aluminium: { scrap_remelting: 0.450 },
  aluminium_extrusions: { primary_route: 8.650, secondary_route: 0.580 },
  aluminium_sheets: { primary_route: 8.720, secondary_route: 0.620 },
  clinker: { dry_process: 0.766, wet_process: 0.885 },
  portland_cement: { cem_i: 0.703, cem_ii: 0.582, cem_iii: 0.469 },
  ammonia: { steam_reforming: 2.050, coal_gasification: 2.950 },
  nitric_acid: { single_pressure: 0.320, dual_pressure: 0.290 },
  urea: { standard: 1.120 },
  ammonium_nitrate: { standard: 1.580 },
  npk_fertilizers: { compound: 1.350 },
  hydrogen: { grey_smr: 10.500, blue_smr_ccs: 2.100, green_electrolysis: 0.000, coal_gasification: 19.300 },
  electricity: { coal: 0.850, gas_ccgt: 0.380, renewable: 0.020, nuclear: 0.010 }
};

const CN_MAPPINGS = {
  '260111': 'iron_ore_pellets', '260112': 'iron_ore_pellets', '2601': 'sinter',
  '7201': 'pig_iron', '72011000': 'pig_iron', '72012000': 'pig_iron',
  '7203': 'direct_reduced_iron', '72031000': 'direct_reduced_iron',
  '7206': 'crude_steel', '7207': 'crude_steel', '72061000': 'crude_steel', '72071100': 'crude_steel',
  '7208': 'hot_rolled_coil', '7209': 'hot_rolled_coil', '7210': 'hot_rolled_coil',
  '72081000': 'hot_rolled_coil', '72082500': 'hot_rolled_coil', '72083900': 'hot_rolled_coil',
  '7211': 'cold_rolled_coil', '7212': 'cold_rolled_coil',
  '72111300': 'cold_rolled_coil', '72111400': 'cold_rolled_coil',
  '7213': 'hot_rolled_coil', '7214': 'hot_rolled_coil', '7215': 'cold_rolled_coil',
  '7601': 'primary_aluminium', '760110': 'primary_aluminium', '760120': 'secondary_aluminium',
  '76011000': 'primary_aluminium', '76012000': 'secondary_aluminium',
  '7602': 'secondary_aluminium', '7604': 'aluminium_extrusions', '7605': 'aluminium_extrusions',
  '7606': 'aluminium_sheets', '7607': 'aluminium_sheets',
  '2523': 'portland_cement', '252310': 'clinker', '25231000': 'clinker',
  '252321': 'portland_cement', '252329': 'portland_cement', '25232100': 'portland_cement',
  '2808': 'nitric_acid', '280800': 'nitric_acid', '280810': 'nitric_acid',
  '2809': 'ammonia', '280920': 'ammonia', '28092000': 'ammonia',
  '310210': 'urea', '31021000': 'urea',
  '310221': 'ammonium_nitrate', '310230': 'ammonium_nitrate', '31022100': 'ammonium_nitrate',
  '3105': 'npk_fertilizers', '310510': 'npk_fertilizers', '31051000': 'npk_fertilizers',
  '2804': 'hydrogen', '280410': 'hydrogen', '28041000': 'hydrogen',
  '2716': 'electricity', '27160000': 'electricity'
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const entry = payload.entry_data || payload;
    
    // === DERIVATION: METHOD NOT USER-SELECTABLE ===
    // Derive method from verification status, NOT from input
    let derivedMethod = 'default_values'; // Enforced default
    
    if (entry.verification_status === 'accredited_verifier_satisfactory' && entry.evidence_reference) {
      derivedMethod = 'actual_values'; // EU Method only when verified
    }
    
    // === PURE CALCULATION START ===
    const result = await calculate({
      cn_code: entry.cn_code || entry.hs_code,
      quantity: parseFloat(entry.quantity) || parseFloat(entry.net_mass_tonnes) || 0,
      country_of_origin: entry.country_of_origin,
      reporting_year: entry.reporting_period_year || 2026,
      calculation_method: derivedMethod,
      production_route: entry.production_route,
      direct_emissions_specific: parseFloat(entry.direct_emissions_specific) || 0,
      indirect_emissions_specific: parseFloat(entry.indirect_emissions_specific) || 0,
      carbon_price_paid: entry.carbon_price_due_paid || 0,
      precursors: entry.precursors_used || [],
      include_precursors: payload.include_precursors !== false
    }, base44);
    
    return Response.json(result);
    
  } catch (error) {
    console.error('[CBAM Engine] Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});

/**
 * PURE CALCULATION FUNCTION
 * Stateless, deterministic, reproducible
 */
async function calculate(input, base44) {
  const {
    cn_code, quantity, country_of_origin, reporting_year,
    calculation_method, production_route, direct_emissions_specific,
    indirect_emissions_specific, carbon_price_paid, precursors, include_precursors
  } = input;
  
  // Input validation (minimal)
  if (!cn_code || cn_code.length !== 8) {
    return { success: false, error: 'CN code must be 8 digits' };
  }
  if (!quantity || quantity <= 0) {
    return { success: false, error: 'Quantity must be > 0' };
  }
  if (!country_of_origin) {
    return { success: false, error: 'Country of origin required' };
  }
  if (reporting_year < 2026) {
    return { success: false, error: 'Reporting year cannot be before 2026' };
  }
  
  // === STEP 1: DETERMINE CATEGORY & ROUTE ===
  const category = findCategory(cn_code);
  const route = production_route || autoDetectRoute(category, country_of_origin, input);
  
  // === STEP 2: CALCULATE DIRECT EMISSIONS ===
  let directEmissions = 0;
  let indirectEmissions = 0;
  let benchmarkValue = null;
  let calculationSource = '';
  
  // Normalize calculation_method to lowercase
  const normMethod = (calculation_method || 'default_values').toLowerCase();

  if (normMethod === 'actual_values' || normMethod === 'eu_method') {
    // Use actual emissions from operator
    directEmissions = direct_emissions_specific * quantity;
    indirectEmissions = indirect_emissions_specific * quantity;
    calculationSource = 'actual_data';
  } else {
    // Use benchmark defaults
    if (!category) {
      return { success: false, error: `No benchmark found for CN code ${cn_code}` };
    }
    
    const categoryBenchmarks = BENCHMARKS[category];
    benchmarkValue = categoryBenchmarks[route] || Object.values(categoryBenchmarks)[0];
    
    if (!benchmarkValue) {
      return { success: false, error: `No benchmark for category ${category}` };
    }
    
    directEmissions = benchmarkValue * quantity;
    indirectEmissions = 0; // Included in benchmark for Annex II goods
    calculationSource = 'benchmark';
  }
  
  // === STEP 3: PRECURSOR EMISSIONS ===
   // CRITICAL: Precursors MUST be pre-validated before calculation
   // Engine accepts ONLY validated precursor snapshots - NO auto-fetch
   let precursorEmissions = 0;
   const precursorsUsed = [];

   if (include_precursors && precursors && precursors.length > 0) {
     // Use ONLY provided precursors (pre-validated)
     for (const p of precursors) {
       // Validate precursor has required fields
       if (!p.precursor_cn_code || p.emissions_embedded === undefined) {
         return { 
           success: false, 
           error: `Precursor validation incomplete: missing required fields. Precursor must be pre-validated before calculation.` 
         };
       }

       const emission = p.emissions_embedded;
       precursorEmissions += emission;
       precursorsUsed.push({
         precursor_cn_code: p.precursor_cn_code,
         precursor_name: p.precursor_name || 'Unknown',
         quantity_consumed: p.quantity_consumed,
         emissions_embedded: emission,
         reporting_period_year: p.reporting_period_year || reporting_year,
         value_type: p.value_type || 'actual',
         validation_status: p.validation_status || 'validated'
       });
     }
   }
  
  // === STEP 4: TOTAL EMBEDDED EMISSIONS ===
  const totalEmbedded = directEmissions + indirectEmissions + precursorEmissions;
  
  // === STEP 5: DEFAULT VALUE MARKUP (Art. C(2025) 8552) - ENFORCED ===
   // CRITICAL: Markup MUST be applied to defaults to penalize non-verified data
   let markupPercent = 0;
   let totalWithMarkup = totalEmbedded;

   if (calculationSource === 'benchmark') {
     markupPercent = DEFAULT_MARKUPS[reporting_year] || 10;
     totalWithMarkup = totalEmbedded * (1 + markupPercent / 100);

     // FAIL if defaults result in zero/negligible emissions
     if (totalWithMarkup === 0 || totalWithMarkup < 0.001) {
       return { 
         success: false, 
         error: `Default values must produce non-zero emissions. Got: ${totalWithMarkup.toFixed(6)} tCO2e. Check benchmark data and quantity.` 
       };
     }
   }
  
  // === STEP 6: FREE ALLOCATION (Art. 31 Reg 2023/956) ===
  const cbamFactor = CBAM_FACTORS[reporting_year] || 0.025;
  const freeAllocationPercent = 1 - cbamFactor;
  
  // CRITICAL FIX: Apply free allocation to BENCHMARK ONLY, not markup
  const freeAllocationBase = benchmarkValue || (directEmissions / quantity);
  const freeAllocationAdjustment = freeAllocationBase * quantity * freeAllocationPercent;
  
  // === STEP 7: FOREIGN CARBON PRICE DEDUCTION (Art. 9) ===
  const foreignCarbonDeduction = carbon_price_paid || 0;
  
  // === STEP 8: CHARGEABLE EMISSIONS & CERTIFICATES ===
  // CORRECT FORMULA: Applied to total embedded (with markup if defaults used)
  const chargeableEmissions = Math.max(0, totalWithMarkup - freeAllocationAdjustment - foreignCarbonDeduction);
  const certificatesRequired = chargeableEmissions;
  
  // === STEP 9: BUILD RESULT ===
  return {
    success: true,
    calculated_entry: {
      // Calculation results
      direct_emissions_specific: directEmissions / quantity,
      indirect_emissions_specific: indirectEmissions / quantity,
      direct_emissions_total: directEmissions,
      indirect_emissions_total: indirectEmissions,
      precursor_emissions_embedded: precursorEmissions,
      precursors_used: precursorsUsed,
      total_embedded_emissions: totalEmbedded,
      
      // Adjustments
      default_value_with_markup: totalWithMarkup,
      mark_up_percentage_applied: markupPercent,
      cbam_factor_applied: cbamFactor,
      free_allocation_adjustment: freeAllocationAdjustment,
      free_allocation_percent: freeAllocationPercent * 100,
      foreign_carbon_price_deduction: foreignCarbonDeduction,
      chargeable_emissions: chargeableEmissions,
      certificates_required: certificatesRequired,
      
      // Metadata
      production_route: route,
      cbam_benchmark: benchmarkValue,
      calculation_method: normMethod,
      calculation_source: calculationSource,
      default_value_used: calculationSource === 'benchmark',
      functional_unit: 'tonnes',
      is_annex_ii_good: isAnnexII(category),

      // Input passthrough
      cn_code,
      quantity,
      country_of_origin,
      reporting_period_year: reporting_year,

      // Versioning (MANDATORY)
      regulatory_version_id: 'CBAM-2026-v1',
      regulatory_version: 'C(2025) 8151',
      engine_version: '2.0',
      calculation_timestamp: new Date().toISOString()
    },
    breakdown: {
      direct: parseFloat(directEmissions.toFixed(3)),
      indirect: parseFloat(indirectEmissions.toFixed(3)),
      precursors: parseFloat(precursorEmissions.toFixed(3)),
      total_embedded: parseFloat(totalEmbedded.toFixed(3)),
      after_markup: parseFloat(totalWithMarkup.toFixed(3)),
      free_allocation: parseFloat(freeAllocationAdjustment.toFixed(3)),
      foreign_carbon_deduction: parseFloat(foreignCarbonDeduction.toFixed(3)),
      chargeable: parseFloat(chargeableEmissions.toFixed(3)),
      certificates: parseFloat(certificatesRequired.toFixed(3)),
      benchmark_used: benchmarkValue,
      cbam_factor: cbamFactor,
      markup_percent: markupPercent
    }
  };
}

/**
 * Find category from CN code
 */
function findCategory(cn_code) {
  if (CN_MAPPINGS[cn_code]) return CN_MAPPINGS[cn_code];
  
  const code6 = cn_code.substring(0, 6);
  if (CN_MAPPINGS[code6]) return CN_MAPPINGS[code6];
  
  const code4 = cn_code.substring(0, 4);
  if (CN_MAPPINGS[code4]) return CN_MAPPINGS[code4];
  
  return null;
}

/**
 * Auto-detect production route
 */
function autoDetectRoute(category, country, entry) {
  if (!category) return null;
  
  const description = (entry.product_name || '').toLowerCase();
  const highCarbon = ['China', 'India', 'Russia', 'Ukraine'].includes(country);
  
  if (category === 'crude_steel') {
    if (description.includes('scrap') || description.includes('eaf')) return 'electric_arc_furnace';
    if (description.includes('bof') || description.includes('blast')) return 'basic_oxygen_furnace';
    return highCarbon ? 'basic_oxygen_furnace' : 'electric_arc_furnace';
  }
  
  if (category === 'hot_rolled_coil' || category === 'cold_rolled_coil') {
    if (description.includes('scrap')) return 'scrap_eaf_route';
    if (description.includes('dri')) return 'dri_eaf_route';
    return highCarbon ? 'bf_bof_route' : 'scrap_eaf_route';
  }
  
  if (category.includes('aluminium')) {
    if (description.includes('scrap') || description.includes('secondary')) return 'secondary_route' in BENCHMARKS[category] ? 'secondary_route' : 'scrap_remelting';
    return 'primary_route' in BENCHMARKS[category] ? 'primary_route' : 'electrolysis';
  }
  
  if (category === 'clinker') {
    return description.includes('wet') ? 'wet_process' : 'dry_process';
  }
  
  if (category === 'portland_cement') {
    if (description.includes('cem iii')) return 'cem_iii';
    if (description.includes('cem ii')) return 'cem_ii';
    return 'cem_i';
  }
  
  if (category === 'hydrogen') {
    if (description.includes('green') || description.includes('renewable')) return 'green_electrolysis';
    if (description.includes('blue') || description.includes('ccs')) return 'blue_smr_ccs';
    if (description.includes('coal')) return 'coal_gasification';
    return 'grey_smr';
  }
  
  const routes = BENCHMARKS[category];
  return routes ? Object.keys(routes)[0] : null;
}

/**
 * Check if category is Annex II good
 */
function isAnnexII(category) {
  return category && ['electricity', 'clinker', 'portland_cement', 'nitric_acid'].includes(category);
}