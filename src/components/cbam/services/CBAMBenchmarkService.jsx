/**
 * CBAM Benchmark Service
 * Official EU benchmarks per C(2025) 8151 Annex I
 * Handles benchmark lookup, caching, and production route detection
 */

import { OFFICIAL_BENCHMARKS_2026, CBAM_FACTOR_SCHEDULE, ANNEX_II_GOODS } from '../constants/officialBenchmarks2026';

export class CBAMBenchmarkService {
  
  /**
   * Get benchmark for CN code and production route
   * @param {string} cn_code - 8-digit CN code
   * @param {string} production_route - Production route identifier
   * @param {number} reportingYear - Year (defaults to 2026)
   * @returns {Object} { value, unit, category, route, source }
   */
  static getBenchmark(cn_code, production_route = null, reportingYear = 2026) {
    const category = this.getCategoryFromCN(cn_code);
    
    if (!category) {
      return {
        value: null,
        error: 'CN code not found in CBAM goods',
        cn_code,
        regulation: 'C(2025) 8151 Annex I'
      };
    }
    
    const categoryBenchmarks = this.getBenchmarksForCategory(category);
    
    if (!categoryBenchmarks) {
      return {
        value: null,
        error: 'No benchmarks for category',
        category,
        regulation: 'C(2025) 8151 Annex I'
      };
    }
    
    // Auto-detect route if not provided
    const route = production_route || this.getDefaultRoute(category);
    
    const benchmarkValue = categoryBenchmarks[route] || Object.values(categoryBenchmarks)[0];
    
    return {
      value: benchmarkValue,
      unit: this.getFunctionalUnit(category),
      category,
      route,
      is_annex_ii: ANNEX_II_GOODS.includes(category),
      source: 'C(2025) 8151 Annex I Table',
      regulation: 'C(2025) 8151 Art. 4'
    };
  }
  
  /**
   * Get category from CN code
   */
  static getCategoryFromCN(cn_code) {
    // Iron & Steel
    if (cn_code.startsWith('7201')) return 'pig_iron';
    if (cn_code.startsWith('7203')) return 'direct_reduced_iron';
    if (cn_code.startsWith('7206') || cn_code.startsWith('7207')) return 'crude_steel';
    if (cn_code.startsWith('7208') || cn_code.startsWith('7209') || cn_code.startsWith('7210')) return 'hot_rolled_coil';
    if (cn_code.startsWith('7211') || cn_code.startsWith('7212')) return 'cold_rolled_coil';
    if (cn_code.startsWith('2601')) return 'sinter';
    if (cn_code.startsWith('260111') || cn_code.startsWith('260112')) return 'iron_ore_pellets';
    
    // Aluminium
    if (cn_code.startsWith('76011')) return 'primary_aluminium';
    if (cn_code.startsWith('76012')) return 'secondary_aluminium';
    if (cn_code.startsWith('7604') || cn_code.startsWith('7605')) return 'aluminium_extrusions';
    if (cn_code.startsWith('7606') || cn_code.startsWith('7607')) return 'aluminium_sheets';
    
    // Cement
    if (cn_code.startsWith('25231')) return 'clinker';
    if (cn_code.startsWith('25232')) return 'portland_cement';
    
    // Fertilizers
    if (cn_code.startsWith('28092')) return 'ammonia';
    if (cn_code.startsWith('2808')) return 'nitric_acid';
    if (cn_code.startsWith('31021')) return 'urea';
    if (cn_code.startsWith('31022')) return 'ammonium_nitrate';
    if (cn_code.startsWith('3105')) return 'npk_fertilizers';
    
    // Hydrogen
    if (cn_code.startsWith('2804')) return 'hydrogen';
    
    // Electricity
    if (cn_code.startsWith('2716')) return 'electricity';
    
    return null;
  }
  
  /**
   * Get all benchmarks for a category
   */
  static getBenchmarksForCategory(category) {
    // Search in all major categories
    for (const [mainCat, subCats] of Object.entries(OFFICIAL_BENCHMARKS_2026)) {
      if (subCats[category]) {
        return subCats[category];
      }
    }
    return null;
  }
  
  /**
   * Get default production route for category
   */
  static getDefaultRoute(category) {
    const defaults = {
      pig_iron: 'blast_furnace',
      direct_reduced_iron: 'gas_based',
      crude_steel: 'basic_oxygen_furnace',
      hot_rolled_coil: 'bf_bof_route',
      cold_rolled_coil: 'bf_bof_route',
      primary_aluminium: 'electrolysis',
      secondary_aluminium: 'scrap_remelting',
      aluminium_extrusions: 'primary_route',
      aluminium_sheets: 'primary_route',
      clinker: 'dry_process',
      portland_cement: 'cem_i',
      ammonia: 'steam_reforming',
      nitric_acid: 'dual_pressure',
      urea: 'standard',
      ammonium_nitrate: 'standard',
      npk_fertilizers: 'compound',
      hydrogen: 'grey_smr',
      electricity: 'gas_ccgt'
    };
    
    return defaults[category] || null;
  }
  
  /**
   * Get functional unit for category
   */
  static getFunctionalUnit(category) {
    if (category === 'electricity') return 'MWh';
    if (category && category.includes('fertilizer')) return 'kg_nitrogen';
    if (category === 'clinker') return 'tonnes_clinker';
    return 'tonnes';
  }
  
  /**
   * Auto-detect production route from entry data
   */
  static detectProductionRoute(category, entryData) {
    const description = (entryData.goods_nomenclature || entryData.product_name || '').toLowerCase();
    const country = entryData.country_of_origin || '';
    
    // High-carbon intensity countries
    const highCarbon = ['China', 'India', 'Russia', 'Ukraine', 'Turkey'];
    const isHighCarbon = highCarbon.includes(country);
    
    // Steel routes
    if (category === 'crude_steel') {
      if (description.includes('scrap') || description.includes('eaf')) return 'electric_arc_furnace';
      if (description.includes('bof') || description.includes('blast')) return 'basic_oxygen_furnace';
      return isHighCarbon ? 'basic_oxygen_furnace' : 'electric_arc_furnace';
    }
    
    if (category === 'hot_rolled_coil' || category === 'cold_rolled_coil') {
      if (description.includes('scrap')) return 'scrap_eaf_route';
      if (description.includes('dri')) return 'dri_eaf_route';
      return isHighCarbon ? 'bf_bof_route' : 'dri_eaf_route';
    }
    
    // Aluminium routes
    if (category.includes('aluminium')) {
      if (description.includes('scrap') || description.includes('secondary')) return 'secondary_route';
      if (category === 'secondary_aluminium') return 'scrap_remelting';
      return category === 'primary_aluminium' ? 'electrolysis' : 'primary_route';
    }
    
    // Cement routes
    if (category === 'clinker') {
      return description.includes('wet') ? 'wet_process' : 'dry_process';
    }
    
    if (category === 'portland_cement') {
      if (description.includes('cem iii')) return 'cem_iii_b';
      if (description.includes('cem ii')) return 'cem_ii_b';
      return 'cem_i';
    }
    
    // Hydrogen routes
    if (category === 'hydrogen') {
      if (description.includes('green') || description.includes('electrolysis')) return 'green_electrolysis';
      if (description.includes('blue') || description.includes('ccs')) return 'blue_smr_ccs';
      if (description.includes('coal')) return 'coal_gasification';
      return 'grey_smr';
    }
    
    // Fertilizer routes
    if (category === 'ammonia') {
      if (description.includes('coal')) return 'coal_gasification';
      if (description.includes('electrolysis')) return 'electrolysis';
      return 'steam_reforming';
    }
    
    // Default route
    return this.getDefaultRoute(category);
  }
  
  /**
   * Validate if CN code is CBAM-covered
   */
  static isCBAMGood(cn_code) {
    return this.getCategoryFromCN(cn_code) !== null;
  }
  
  /**
   * Check if good is Annex II (indirect emissions in benchmark)
   */
  static isAnnexIIGood(category) {
    return ANNEX_II_GOODS.includes(category);
  }
  
  /**
   * Get CBAM factor for year
   */
  static getCBAMFactor(year) {
    return CBAM_FACTOR_SCHEDULE[year] || 0.025;
  }
}

export default CBAMBenchmarkService;