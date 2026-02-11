/**
 * DETERMINISTIC VALIDATOR - Stateless, reusable validation engine
 * Input: supplier data + framework flags
 * Output: { completeness_score, mandatory_gaps, framework_gaps, status_recommendation }
 */

// Global mandatory fields (ALWAYS required)
const GLOBAL_MANDATORY = [
  'legal_name',
  'country',
  'supplier_type',
  'evidence_source',
  'uploaded_at',
  'file_hash_sha256'
];

// Framework-specific mandatory (block module activation, not creation)
const FRAMEWORK_MANDATORY = {
  CBAM: ['cn_code', 'production_country', 'installation_id'],
  CSRD: ['activity_classification', 'emissions_scope_indicator'],
  EUDR: ['production_country', 'geographic_coordinates'],
  PFAS: ['material_category', 'chemical_family_indicator'],
  PPWR: ['packaging_material_type', 'weight_kg'],
  REACH: ['svhc_declaration_status']
};

// Thresholds (LOCKED)
const THRESHOLDS = {
  APPROVED: 0.85,
  PROVISIONAL_MIN: 0.50,
  PROVISIONAL_MAX: 0.84,
  BLOCKED: 0.49
};

export function validateSupplierForMapping(supplierData, relevantFrameworks = []) {
  const validation = {
    completeness_score: 0,
    mandatory_gaps: [],
    framework_gaps: {},
    status_recommendation: 'BLOCKED',
    rationale: [],
    can_proceed: false
  };

  // 1. GLOBAL MANDATORY CHECK (hard stop)
  const globalGaps = GLOBAL_MANDATORY.filter(field => !supplierData[field]);
  
  if (globalGaps.length > 0) {
    validation.mandatory_gaps = globalGaps;
    validation.status_recommendation = 'BLOCKED';
    validation.rationale.push(`Missing global mandatory fields: ${globalGaps.join(', ')}`);
    return validation;
  }

  // 2. COMPLETENESS SCORING
  const allSupplierFields = Object.keys(supplierData).filter(
    k => supplierData[k] !== null && supplierData[k] !== undefined && supplierData[k] !== ''
  );
  
  const expectedFields = getExpectedFieldsForSupplier(supplierData);
  validation.completeness_score = allSupplierFields.length / expectedFields.length;

  // 3. FRAMEWORK-SPECIFIC GAPS (non-blocking)
  relevantFrameworks.forEach(fw => {
    const gaps = (FRAMEWORK_MANDATORY[fw] || []).filter(field => !supplierData[field]);
    if (gaps.length > 0) {
      validation.framework_gaps[fw] = gaps;
      validation.rationale.push(`${fw}: missing ${gaps.join(', ')}`);
    }
  });

  // 4. STATUS RECOMMENDATION (deterministic)
  if (validation.completeness_score >= THRESHOLDS.APPROVED) {
    validation.status_recommendation = 'APPROVED';
    validation.rationale.push(`Completeness ${(validation.completeness_score * 100).toFixed(0)}% >= 85%`);
  } else if (
    validation.completeness_score >= THRESHOLDS.PROVISIONAL_MIN &&
    validation.completeness_score <= THRESHOLDS.PROVISIONAL_MAX
  ) {
    validation.status_recommendation = 'PROVISIONAL';
    validation.rationale.push(`Completeness ${(validation.completeness_score * 100).toFixed(0)}% in PROVISIONAL range (50-84%)`);
  } else {
    validation.status_recommendation = 'BLOCKED';
    validation.rationale.push(`Completeness ${(validation.completeness_score * 100).toFixed(0)}% < 50% (insufficient data)`);
  }

  validation.can_proceed = validation.status_recommendation !== 'BLOCKED' || globalGaps.length === 0;

  return validation;
}

function getExpectedFieldsForSupplier(supplier) {
  // Minimal expected set (customizable per deployment)
  return [
    'legal_name', 'country', 'supplier_type', 'vat_number', 'email',
    'primary_contact_phone', 'address', 'city', 'postal_code',
    'eori_number', 'nace_code', 'website', 'annual_revenue_eur',
    'certifications', 'risk_level'
  ];
}

export function detectFrameworkRelevance(supplierData) {
  const frameworks = [];

  // CBAM: any supplier in EU or producing for EU
  if (supplierData.ships_to_eu || ['IT', 'DE', 'FR', 'ES', 'NL', 'BE'].includes(supplierData.country)) {
    frameworks.push('CBAM');
  }

  // CSRD: EU company or EU subsidiary
  if (['IT', 'DE', 'FR', 'ES', 'NL', 'BE', 'AT', 'SE'].includes(supplierData.country)) {
    frameworks.push('CSRD');
  }

  // EUDR: any agricultural/deforestation-risk sector
  if (['agriculture', 'forestry', 'palm_oil', 'soy', 'beef'].includes(supplierData.nace_code)) {
    frameworks.push('EUDR');
  }

  // PFAS: chemical, textile, packaging sectors
  if (['chemicals', 'textiles', 'packaging', 'polymers'].includes(supplierData.nace_code)) {
    frameworks.push('PFAS');
  }

  // PPWR: packaging manufacturers/suppliers
  if (['packaging', 'materials', 'manufacturing'].includes(supplierData.supplier_type)) {
    frameworks.push('PPWR');
  }

  // REACH: chemical suppliers or product with chemicals
  if (supplierData.nace_code?.includes('chemical')) {
    frameworks.push('REACH');
  }

  return frameworks;
}