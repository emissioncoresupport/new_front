/**
 * Complex Goods Mappings - Precursor Requirements
 * Per Art. 13-15 C(2025) 8151
 * 
 * Complex goods REQUIRE precursor data. If not provided, defaults applied.
 * Simple goods (Annex II) do NOT require precursors.
 */

export const COMPLEX_GOODS = {
  // Hot-rolled coil, cold-rolled coil, specialty steels
  // These are made from pig iron, DRI, or scrap
  '72081000': {
    name: 'Hot-rolled coil',
    category: 'iron_steel',
    isComplex: true,
    defaultPrecursors: [
      { cn: '72011000', name: 'Pig iron', weight: 0.5 },
      { cn: '72031000', name: 'DRI', weight: 0.4 },
      { cn: '72041000', name: 'Steel scrap', weight: 0.1 }
    ]
  },
  '72082500': {
    name: 'Hot-rolled strip',
    category: 'iron_steel',
    isComplex: true,
    defaultPrecursors: [
      { cn: '72011000', name: 'Pig iron', weight: 0.6 },
      { cn: '72031000', name: 'DRI', weight: 0.3 },
      { cn: '72041000', name: 'Steel scrap', weight: 0.1 }
    ]
  },
  '72111300': {
    name: 'Cold-rolled coil',
    category: 'iron_steel',
    isComplex: true,
    defaultPrecursors: [
      { cn: '72081000', name: 'Hot-rolled coil', weight: 0.95 },
      { cn: '72011000', name: 'Pig iron', weight: 0.05 }
    ]
  },
  '72111400': {
    name: 'Cold-rolled strip',
    category: 'iron_steel',
    isComplex: true,
    defaultPrecursors: [
      { cn: '72082500', name: 'Hot-rolled strip', weight: 0.95 },
      { cn: '72011000', name: 'Pig iron', weight: 0.05 }
    ]
  },

  // Aluminium extrusions (made from primary/secondary ingots)
  '76041000': {
    name: 'Aluminium bars & rods',
    category: 'aluminium',
    isComplex: true,
    defaultPrecursors: [
      { cn: '76011000', name: 'Primary aluminium', weight: 0.7 },
      { cn: '76012000', name: 'Secondary aluminium', weight: 0.3 }
    ]
  },
  '76042100': {
    name: 'Aluminium bars & rods (secondary)',
    category: 'aluminium',
    isComplex: true,
    defaultPrecursors: [
      { cn: '76012000', name: 'Secondary aluminium', weight: 1.0 }
    ]
  },
  '76061100': {
    name: 'Aluminium sheets (primary)',
    category: 'aluminium',
    isComplex: true,
    defaultPrecursors: [
      { cn: '76011000', name: 'Primary aluminium', weight: 1.0 }
    ]
  },
  '76061200': {
    name: 'Aluminium sheets (secondary)',
    category: 'aluminium',
    isComplex: true,
    defaultPrecursors: [
      { cn: '76012000', name: 'Secondary aluminium', weight: 1.0 }
    ]
  },
};

/**
 * Simple goods (Annex II) - NO precursor requirement
 * These are directly produced, not from other goods
 */
export const SIMPLE_GOODS = [
  '72011000', // Pig iron
  '72012000', // Spiegeleisen
  '72031000', // Direct reduced iron
  '72061000', // Iron/steel ingots
  '25231000', // Clinker
  '28092000', // Ammonia
  '280810',   // Nitric acid
  '31021000', // Urea
  '76011000', // Primary aluminium unwrought
  '76012000', // Secondary aluminium unwrought
  '28041000', // Hydrogen
];

/**
 * Check if a CN code represents a complex good requiring precursors
 */
export function isComplexGood(cnCode) {
  return COMPLEX_GOODS[cnCode]?.isComplex === true;
}

/**
 * Check if a CN code is a simple good (no precursor required)
 */
export function isSimpleGood(cnCode) {
  return SIMPLE_GOODS.includes(cnCode);
}

/**
 * Get default precursor structure for complex good
 * Auto-filled if user doesn't provide precursors
 */
export function getDefaultPrecursorsForGood(cnCode, quantity) {
  const good = COMPLEX_GOODS[cnCode];
  if (!good) return [];

  return good.defaultPrecursors.map(p => ({
    precursor_cn_code: p.cn,
    precursor_name: p.name,
    quantity_consumed: (quantity * p.weight).toFixed(3),
    reporting_period_year: 2026,
    value_type: 'default',
    validation_status: 'auto_default'
  }));
}

/**
 * Get precursor requirement text for UI
 */
export function getPrecursorRequirementText(cnCode) {
  const good = COMPLEX_GOODS[cnCode];
  if (!good) return null;

  const precursorList = good.defaultPrecursors
    .map(p => `${p.name} (~${(p.weight * 100).toFixed(0)}%)`)
    .join(', ');

  return `Complex good: Requires ${precursorList}. Auto-defaults applied if not specified.`;
}