/**
 * Free Allocation Adjustment (FAA) Calculator
 * Based on EU CBAM Draft Regulation 2025
 * Implements Equations (1)-(6) from Annex
 */

export const calculateFAA = (entry) => {
  if (!entry.net_mass_tonnes || !entry.cbam_benchmark) return 0;
  
  const mass = entry.net_mass_tonnes;
  const cbamFactor = entry.cbam_factor || 1.0;
  const cscf = entry.cscf_factor || 1.0;
  const benchmark = entry.cbam_benchmark;
  
  // Calculate SEFA based on method
  let sefa;
  
  if (entry.calculation_method === 'actual_data') {
    // Equation (2): SFAProc = CBAM_y × CSCF_y × BM_g*
    // For simple goods: Equation (3): SEFA = SFAProc
    sefa = cbamFactor * cscf * benchmark;
    
    // TODO: Complex goods would use Equation (4) with precursors
    // For now, treating all as simple goods
  } else {
    // Default values: Equation (6): SEFA = CBAM_y × CSCF_y × BM_g
    sefa = cbamFactor * cscf * benchmark;
  }
  
  // Equation (1): FAA = SEFA × Mass
  const faa = sefa * mass;
  
  return {
    sefa: sefa,
    faa: faa,
    certificates_after_adjustment: Math.max(0, (entry.total_embedded_emissions || 0) - faa)
  };
};

/**
 * Get CBAM Benchmark from Annex based on CN code and production route
 * Simplified - in production this should reference full lookup table
 */
export const getCBAMBenchmark = (cnCode, productionRoute, calculationMethod, productionYear) => {
  // Mock benchmarks based on draft Annex
  // Column A = BMg* (actual data), Column B = BMg (default)
  
  const benchmarks = {
    // Cement
    '25231000': { 
      actual: { Grey: 0.693, White: 0.957 }, 
      default: { Grey: 0.693, White: 0.957 }
    },
    // Hydrogen
    '28041000': { actual: 6.840, default: 6.840 },
    // Ammonia
    '28141000': { actual: 1.570, default: 1.570 },
    // Iron & Steel - Pig Iron
    '72011011': { actual: 1.288, default: 1.511 },
    // Semi-finished carbon steel
    '72071111': { 
      actual: 0.057, 
      default: { 
        'BF/BOF': 1.520, 
        'DRI/EAF': 1.023, 
        'Scrap/EAF': 0.279 
      }
    },
    // Hot-rolled steel coils
    '72081000': {
      actual: 0.067,
      default: { 
        'BF/BOF': 1.530, 
        'DRI/EAF': 1.033, 
        'Scrap/EAF': 0.288 
      }
    },
    // Aluminium - unwrought
    '76011010': { 
      actual: { Primary: 1.464, Secondary: 0.139 },
      default: { Primary: 1.464, Secondary: 0.139 }
    }
  };
  
  const lookup = benchmarks[cnCode];
  if (!lookup) return null;
  
  const column = calculationMethod === 'actual_data' ? 'actual' : 'default';
  let value = lookup[column];
  
  // Handle production routes
  if (typeof value === 'object' && productionRoute) {
    value = value[productionRoute];
  }
  
  return typeof value === 'number' ? value : null;
};

/**
 * Determine production route based on process data (per draft Section 5.2.3)
 */
export const determineProductionRoute = (processData) => {
  if (!processData) return 'Default';
  
  const { scrap_percentage, dri_percentage, bf_bof_percentage } = processData;
  
  // Iron & Steel rules from Section 5.2.3
  if (scrap_percentage > 50) return 'Scrap/EAF';
  if (dri_percentage > 50) return 'DRI/EAF';
  if (bf_bof_percentage > 50) return 'BF/BOF';
  
  // Select based on highest component
  const max = Math.max(scrap_percentage || 0, dri_percentage || 0, bf_bof_percentage || 0);
  if (max === scrap_percentage) return 'Scrap/EAF';
  if (max === dri_percentage) return 'DRI/EAF';
  if (max === bf_bof_percentage) return 'BF/BOF';
  
  return 'Default';
};

/**
 * Aluminium production route determination (Section 5.2.4)
 */
export const determineAluminiumRoute = (processData) => {
  if (!processData) return 'Primary';
  
  const { scrap_percentage } = processData;
  return (scrap_percentage > 50) ? 'Secondary' : 'Primary';
};