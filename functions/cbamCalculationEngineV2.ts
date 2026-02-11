import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { CBAMBenchmarkService } from '../components/cbam/services/CBAMBenchmarkService.js';
import { CBAMPrecursorService } from '../components/cbam/services/CBAMPrecursorService.js';
import { CBAMFreeAllocationService } from '../components/cbam/services/CBAMFreeAllocationService.js';
import { CBAMDefaultValueService } from '../components/cbam/services/CBAMDefaultValueService.js';

/**
 * CBAM Calculation Engine V2 - Modular Architecture
 * Full C(2025) 8151 compliance with service-based design
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const entry_data = payload.entry_data || payload;
    
    console.log('[CBAM V2] Starting calculation:', entry_data.import_id || entry_data.cn_code);
    
    // === STEP 1: VALIDATE INPUTS ===
    const validation = validateInputs(entry_data);
    if (!validation.valid) {
      return Response.json({ 
        success: false, 
        error: validation.errors[0].message,
        errors: validation.errors 
      }, { status: 400 });
    }
    
    const cn_code = entry_data.cn_code;
    const quantity = parseFloat(entry_data.quantity);
    const reportingYear = entry_data.reporting_period_year || 2026;
    const calculationMethod = entry_data.calculation_method || 'default_values';
    
    // === STEP 2: BENCHMARK LOOKUP ===
    const benchmark = CBAMBenchmarkService.getBenchmark(
      cn_code, 
      entry_data.production_route,
      reportingYear
    );
    
    if (!benchmark.value) {
      console.warn('[CBAM V2] No benchmark found for', cn_code);
    }
    
    const productionRoute = benchmark.route || entry_data.production_route;
    const category = benchmark.category;
    
    // === STEP 3: EMISSIONS CALCULATION ===
    let directEmissions = 0;
    let indirectEmissions = 0;
    let calculationSource = '';
    
    if (calculationMethod === 'actual_values' || calculationMethod === 'EU_method') {
      // Use actual emissions data from operator
      const directSpecific = parseFloat(entry_data.direct_emissions_specific) || 0;
      const indirectSpecific = parseFloat(entry_data.indirect_emissions_specific) || 0;
      
      directEmissions = directSpecific * quantity;
      indirectEmissions = indirectSpecific * quantity;
      calculationSource = 'actual_data';
      
      console.log('[CBAM V2] Using actual emissions:', { directSpecific, indirectSpecific });
      
    } else {
      // Use default values with markup
      if (benchmark.value) {
        directEmissions = benchmark.value * quantity;
        calculationSource = 'benchmark';
        console.log('[CBAM V2] Using benchmark:', benchmark.value, 'tCO2e/unit');
      } else {
        // Fallback to default value table
        const defaultValue = CBAMDefaultValueService.getDefaultValueWithMarkup(
          cn_code, 
          reportingYear, 
          category
        );
        
        if (defaultValue.value) {
          directEmissions = defaultValue.value * quantity;
          calculationSource = 'default_with_markup';
          console.log('[CBAM V2] Using default value with markup:', defaultValue);
        } else {
          return Response.json({ 
            success: false, 
            error: 'No benchmark or default value available for CN code' 
          }, { status: 400 });
        }
      }
      
      // Indirect emissions for Annex II goods
      indirectEmissions = benchmark.is_annex_ii ? 0 : 0; // Included in benchmark
    }
    
    // === STEP 4: PRECURSOR EMISSIONS ===
    const precursorResult = await CBAMPrecursorService.calculatePrecursorEmissions(
      entry_data,
      base44.asServiceRole
    );
    
    const precursorEmissions = precursorResult.total;
    const precursorsUsed = precursorResult.precursors;
    
    console.log('[CBAM V2] Precursor emissions:', precursorEmissions, 'tCO2e');
    
    // === STEP 5: TOTAL EMBEDDED EMISSIONS ===
    const totalEmbedded = directEmissions + indirectEmissions + precursorEmissions;
    
    // === STEP 6: DEFAULT VALUE MARKUP (if applicable) ===
    let markupPercent = 0;
    let totalWithMarkup = totalEmbedded;
    
    if (calculationSource === 'benchmark' || calculationSource === 'default_with_markup') {
      const markupSchedule = { 2026: 10, 2027: 20, 2028: 30, 2029: 30, 2030: 30 };
      markupPercent = markupSchedule[reportingYear] || 10;
      totalWithMarkup = totalEmbedded * (1 + markupPercent / 100);
      console.log('[CBAM V2] Markup applied:', markupPercent, '%');
    }
    
    // === STEP 7: FREE ALLOCATION ===
    const freeAllocation = CBAMFreeAllocationService.calculateAdjustment(
      benchmark.value || (directEmissions / quantity),
      quantity,
      reportingYear
    );
    
    console.log('[CBAM V2] Free allocation:', freeAllocation.adjustment.toFixed(2), 'tCO2e');
    
    // === STEP 8: FOREIGN CARBON PRICE DEDUCTION ===
    const foreignCarbonPrice = entry_data.carbon_price_due_paid || 0;
    
    // === STEP 9: CHARGEABLE EMISSIONS & CERTIFICATES ===
    const chargeable = CBAMFreeAllocationService.calculateChargeableEmissions(
      totalWithMarkup,
      freeAllocation.adjustment,
      foreignCarbonPrice
    );
    
    console.log('[CBAM V2] Certificates required:', chargeable.certificates_required);
    
    // === STEP 10: BUILD RESULT ===
    const result = {
      // Original data
      ...entry_data,
      // Normalized fields
      cn_code,
      quantity,
      reporting_period_year: reportingYear,
      calculation_method: calculationMethod,
      production_route: productionRoute,
      // Calculated values
      direct_emissions_specific: directEmissions / quantity,
      indirect_emissions_specific: indirectEmissions / quantity,
      direct_emissions_total: directEmissions,
      indirect_emissions_total: indirectEmissions,
      precursor_emissions_embedded: precursorEmissions,
      precursors_used: precursorsUsed,
      total_embedded_emissions: totalEmbedded,
      default_value_with_markup: totalWithMarkup,
      mark_up_percentage_applied: markupPercent,
      // CBAM-specific
      cbam_benchmark: benchmark.value,
      cbam_factor_applied: freeAllocation.cbam_factor,
      free_allocation_adjustment: freeAllocation.adjustment,
      free_allocation_percent: freeAllocation.free_allocation_percent,
      foreign_carbon_price_deduction: foreignCarbonPrice,
      chargeable_emissions: chargeable.chargeable,
      certificates_required: chargeable.certificates_required,
      // Metadata
      functional_unit: benchmark.unit || entry_data.functional_unit || 'tonnes',
      is_annex_ii_good: benchmark.is_annex_ii || false,
      default_value_used: calculationSource !== 'actual_data',
      calculation_source: calculationSource,
      calculation_timestamp: new Date().toISOString(),
      language: 'English'
    };
    
    return Response.json({
      success: true,
      calculated_entry: result,
      breakdown: {
        direct: parseFloat(directEmissions.toFixed(3)),
        indirect: parseFloat(indirectEmissions.toFixed(3)),
        precursors: parseFloat(precursorEmissions.toFixed(3)),
        total_embedded: parseFloat(totalEmbedded.toFixed(3)),
        after_markup: parseFloat(totalWithMarkup.toFixed(3)),
        free_allocation: parseFloat(freeAllocation.adjustment.toFixed(3)),
        certificates: chargeable.certificates_required,
        cbam_factor: freeAllocation.cbam_factor,
        markup_percent: markupPercent
      },
      regulation: 'C(2025) 8151 Art. 1-15'
    });
    
  } catch (error) {
    console.error('[CBAM V2] Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});

/**
 * Validate mandatory inputs
 */
function validateInputs(entry) {
  const errors = [];
  
  if (!entry.cn_code || entry.cn_code.length !== 8) {
    errors.push({ field: 'cn_code', message: 'CN code must be 8 digits (Art. 4)' });
  }
  
  if (!entry.country_of_origin) {
    errors.push({ field: 'country_of_origin', message: 'Country of origin REQUIRED (Art. 6)' });
  }
  
  if (!entry.quantity || parseFloat(entry.quantity) <= 0) {
    errors.push({ field: 'quantity', message: 'Quantity must be > 0 (Art. 1)' });
  }
  
  const year = entry.reporting_period_year || 2026;
  if (year < 2026) {
    errors.push({ field: 'reporting_period_year', message: 'Year cannot be before 2026 (Art. 7)' });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}