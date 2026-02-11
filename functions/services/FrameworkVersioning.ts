/**
 * FRAMEWORK VERSIONING - Track regulatory updates and re-evaluate relevance
 */

const REGULATORY_VERSIONS = {
  'CBAM-2026-Q1': {
    countries: ['IT', 'DE', 'FR', 'ES', 'NL', 'BE', 'AT', 'SE', 'DK', 'PL'],
    sectors: ['cement', 'steel', 'aluminum', 'fertilizer', 'electricity', 'organic_chemicals'],
    effective_date: '2026-01-01'
  },
  'CSRD-2026-Q1': {
    countries: ['IT', 'DE', 'FR', 'ES', 'NL', 'BE', 'AT', 'SE', 'DK', 'PL'],
    threshold_employees: 250,
    effective_date: '2025-01-01'
  },
  'EUDR-2026-Q1': {
    sectors: ['agriculture', 'forestry', 'palm_oil', 'soy', 'beef', 'cocoa', 'coffee'],
    countries: null, // global
    effective_date: '2024-12-30'
  },
  'PFAS-2026-Q1': {
    sectors: ['chemicals', 'textiles', 'packaging', 'polymers', 'firefighting_foam'],
    restriction_limit_ppm: 0.02,
    effective_date: '2026-07-04'
  }
};

export function detectFrameworkRelevance(supplierData, regulatoryVersion = 'CBAM-2026-Q1') {
  const frameworks = [];
  const versions = {};

  // CBAM
  const cbamCfg = REGULATORY_VERSIONS['CBAM-2026-Q1'];
  if (cbamCfg.countries.includes(supplierData.country) || 
      cbamCfg.sectors.some(s => supplierData.nace_code?.includes(s))) {
    frameworks.push('CBAM');
    versions['CBAM'] = 'CBAM-2026-Q1';
  }

  // CSRD
  const csrdCfg = REGULATORY_VERSIONS['CSRD-2026-Q1'];
  if (csrdCfg.countries.includes(supplierData.country)) {
    frameworks.push('CSRD');
    versions['CSRD'] = 'CSRD-2026-Q1';
  }

  // EUDR
  const eudrCfg = REGULATORY_VERSIONS['EUDR-2026-Q1'];
  if (eudrCfg.sectors.some(s => supplierData.nace_code?.includes(s))) {
    frameworks.push('EUDR');
    versions['EUDR'] = 'EUDR-2026-Q1';
  }

  // PFAS
  const pfasCfg = REGULATORY_VERSIONS['PFAS-2026-Q1'];
  if (pfasCfg.sectors.some(s => supplierData.nace_code?.includes(s))) {
    frameworks.push('PFAS');
    versions['PFAS'] = 'PFAS-2026-Q1';
  }

  return { frameworks, versions, detected_at: new Date().toISOString() };
}

export function getRegulatoryVersion(framework) {
  return REGULATORY_VERSIONS[`${framework}-2026-Q1`];
}