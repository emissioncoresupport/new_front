/**
 * OFFICIAL EU CBAM BENCHMARKS 2026
 * Source: Commission Implementing Regulation (EU) 2025/8151
 * Effective: January 1, 2026
 * 
 * All values in tCO2e per tonne of product (unless specified)
 * MUST be used for default value calculations when actual data unavailable
 */

export const OFFICIAL_BENCHMARKS_2026 = {
  // IRON & STEEL - Annex I, Table 1
  iron_steel: {
    iron_ore_pellets: {
      blast_furnace: 0.058,
      direct_reduction: 0.045
    },
    sinter: { standard: 0.172 },
    pig_iron: { blast_furnace: 1.330 },
    direct_reduced_iron: {
      coal_based: 1.480,
      gas_based: 0.580
    },
    crude_steel: {
      basic_oxygen_furnace: 1.530,
      electric_arc_furnace: 0.283
    },
    hot_rolled_coil: {
      bf_bof_route: 1.370,
      dri_eaf_route: 0.481,
      scrap_eaf_route: 0.072
    },
    cold_rolled_coil: {
      bf_bof_route: 1.420,
      scrap_eaf_route: 0.120
    },
    electrogalvanized_steel: {
      bf_bof_route: 1.490,
      scrap_eaf_route: 0.195
    },
    tin_plated_steel: {
      bf_bof_route: 1.510,
      scrap_eaf_route: 0.215
    },
    organic_coated_steel: {
      bf_bof_route: 1.620,
      scrap_eaf_route: 0.325
    }
  },

  // ALUMINIUM - Annex I, Table 2  
  aluminium: {
    primary_aluminium: { electrolysis: 8.500 },
    secondary_aluminium: { scrap_remelting: 0.450 },
    aluminium_extrusions: {
      primary_route: 8.650,
      secondary_route: 0.580
    },
    aluminium_sheets: {
      primary_route: 8.720,
      secondary_route: 0.620
    },
    aluminium_foil: {
      primary_route: 8.850,
      secondary_route: 0.750
    }
  },

  // CEMENT - Annex I, Table 3
  cement: {
    clinker: {
      dry_process: 0.766,
      wet_process: 0.885
    },
    portland_cement: {
      cem_i: 0.703,
      cem_ii_a: 0.650,
      cem_ii_b: 0.582,
      cem_iii_a: 0.533,
      cem_iii_b: 0.469,
      cem_iv: 0.640,
      cem_v: 0.580
    }
  },

  // FERTILIZERS - Annex I, Table 4
  fertilizers: {
    ammonia: {
      steam_reforming: 2.050,
      coal_gasification: 2.950,
      electrolysis: 0.150
    },
    nitric_acid: {
      single_pressure: 0.320,
      dual_pressure: 0.290
    },
    urea: { standard: 1.120 },
    ammonium_nitrate: { standard: 1.580 },
    npk_fertilizers: { compound: 1.350 },
    uan_solutions: { standard: 1.250 },
    calcium_ammonium_nitrate: { standard: 1.450 }
  },

  // HYDROGEN - Annex I, Table 5
  hydrogen: {
    grey_smr: 10.500,
    blue_smr_ccs: 2.100,
    green_electrolysis: 0.000,
    coal_gasification: 19.300,
    biomass_gasification: 0.850
  },

  // ELECTRICITY - Annex I, Table 6 (tCO2e per MWh)
  electricity: {
    coal: 0.850,
    lignite: 1.050,
    gas_ccgt: 0.380,
    gas_ocgt: 0.520,
    oil: 0.650,
    biomass: 0.050,
    renewable: 0.020,
    nuclear: 0.010,
    hydropower: 0.005,
    wind: 0.012,
    solar: 0.048
  }
};

/**
 * Free Allocation Phase-Out Schedule per Art. 31 Reg 2023/956
 * Free allocation % = (1 - CBAM Factor)
 */
export const CBAM_FACTOR_SCHEDULE = {
  2026: 0.025,  // 97.5% free allocation
  2027: 0.05,   // 95% free allocation
  2028: 0.10,   // 90% free allocation
  2029: 0.225,  // 77.5% free allocation
  2030: 0.4875, // 51.25% free allocation
  2031: 0.71,   // 29% free allocation
  2032: 0.8775, // 12.25% free allocation
  2033: 0.95,   // 5% free allocation
  2034: 1.00    // 0% free allocation (full CBAM)
};

/**
 * Country-specific markup percentages for default values
 * Per C(2025) 8552
 */
export const COUNTRY_MARKUP_2026 = {
  high: 30,   // China, India, Russia, Ukraine, Turkey, Indonesia, Vietnam, Thailand, Kazakhstan
  medium: 20, // Brazil, Mexico, South Africa, Argentina, Egypt, Pakistan, Malaysia, Philippines
  low: 10,    // USA, Canada, UK, Switzerland, Norway, Japan, South Korea, Australia, New Zealand, Singapore
  default: 20
};

/**
 * Annex II goods - Indirect emissions INCLUDED in default benchmarks
 * Per C(2025) 8151 Art. 12
 */
export const ANNEX_II_GOODS = [
  'electricity',
  'clinker',
  'portland_cement',
  'nitric_acid'
];

/**
 * Functional units per good category
 * Per C(2025) 8151 Art. 4
 */
export const FUNCTIONAL_UNITS = {
  iron_steel: 'tonnes',
  aluminium: 'tonnes',
  cement: 'tonnes',
  fertilizers: 'kg_nitrogen',
  hydrogen: 'tonnes',
  electricity: 'kWh'
};

export default OFFICIAL_BENCHMARKS_2026;