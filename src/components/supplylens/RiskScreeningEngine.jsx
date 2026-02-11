import { base44 } from '@/api/base44Client';

// UN Human Rights Violators & High-Risk Countries
export const UN_HIGH_RISK_COUNTRIES = {
  'North Korea': { risk: 100, reasons: ['UN Sanctions', 'Human Rights Violations', 'Nuclear Proliferation'] },
  'Syria': { risk: 98, reasons: ['UN Sanctions', 'Armed Conflict', 'Chemical Weapons'] },
  'Myanmar': { risk: 95, reasons: ['Military Coup', 'Rohingya Genocide', 'Forced Labor'] },
  'Russia': { risk: 90, reasons: ['Ukraine Invasion', 'EU/US Sanctions', 'War Crimes Allegations'] },
  'Belarus': { risk: 88, reasons: ['Support for Russia', 'Political Repression', 'EU Sanctions'] },
  'Iran': { risk: 87, reasons: ['Nuclear Program', 'UN Sanctions', 'Human Rights Violations'] },
  'Venezuela': { risk: 82, reasons: ['Political Crisis', 'Economic Collapse', 'US Sanctions'] },
  'Afghanistan': { risk: 90, reasons: ['Taliban Rule', 'Human Rights Violations', 'Humanitarian Crisis'] },
  'Yemen': { risk: 88, reasons: ['Civil War', 'Humanitarian Crisis', 'Child Labor'] },
  'South Sudan': { risk: 85, reasons: ['Armed Conflict', 'Human Rights Violations', 'Child Soldiers'] },
  'Somalia': { risk: 84, reasons: ['State Collapse', 'Terrorism', 'Piracy'] },
  'Eritrea': { risk: 86, reasons: ['Forced Labor', 'No Press Freedom', 'UN Sanctions'] },
  'Democratic Republic of Congo': { risk: 80, reasons: ['Armed Conflict', 'Conflict Minerals', 'Child Labor'] },
  'Central African Republic': { risk: 82, reasons: ['Armed Conflict', 'Human Rights Violations'] },
  'Libya': { risk: 79, reasons: ['Civil War', 'Human Trafficking', 'Instability'] },
  'Sudan': { risk: 78, reasons: ['Political Instability', 'Darfur Conflict', 'Sanctions History'] },
  'Mali': { risk: 76, reasons: ['Armed Conflict', 'Terrorism', 'Child Labor'] },
  'Burkina Faso': { risk: 75, reasons: ['Terrorism', 'Political Instability'] },
  'Zimbabwe': { risk: 74, reasons: ['Economic Crisis', 'Political Repression'] },
  'Cuba': { risk: 72, reasons: ['US Embargo', 'Political Repression'] }
};

// Sanctioned Entities & Embargo Lists
export const SANCTIONED_KEYWORDS = [
  'Rosneft', 'Gazprom', 'Lukoil', 'Sberbank', 'VTB Bank', 'Sovcomflot',
  'Almaz-Antey', 'Kalashnikov', 'Russian Railways', 'Aeroflot',
  'IRISL', 'Bank Melli', 'Bank Saderat', 'Mahan Air', // Iran
  'Huawei', 'ZTE', 'Hikvision', 'Dahua', 'SMIC', // China tech sanctions
  'PDVSA', 'Petrocaribe', // Venezuela
  'Belarusian Steel Works', 'Belshina', 'Grodno Azot' // Belarus
];

// Prohibited & High-Risk Substances
export const PROHIBITED_SUBSTANCES = {
  // EU REACH Restricted
  'Asbestos': { status: 'banned', regulation: 'REACH Annex XVII', risk: 100 },
  'Lead (in consumer products)': { status: 'restricted', regulation: 'REACH/RoHS', risk: 85 },
  'Cadmium': { status: 'restricted', regulation: 'REACH Annex XVII', risk: 90 },
  'Mercury': { status: 'restricted', regulation: 'Minamata Convention', risk: 95 },
  'Hexavalent Chromium': { status: 'restricted', regulation: 'RoHS', risk: 88 },
  'Phthalates (DEHP, DBP, BBP, DIBP)': { status: 'restricted', regulation: 'REACH/RoHS', risk: 75 },
  
  // PFAS Family
  'PFOA': { status: 'banned', regulation: 'EU 2020/784', risk: 95 },
  'PFOS': { status: 'banned', regulation: 'Stockholm Convention', risk: 95 },
  'GenX': { status: 'concern', regulation: 'PFAS Restriction Proposal', risk: 80 },
  'PFBS': { status: 'concern', regulation: 'PFAS Restriction Proposal', risk: 75 },
  'PFHxS': { status: 'restricted', regulation: 'Stockholm Convention', risk: 85 },
  
  // Other High-Concern
  'Bisphenol A (BPA)': { status: 'restricted', regulation: 'REACH SVHC', risk: 70 },
  'Formaldehyde': { status: 'restricted', regulation: 'REACH CLP', risk: 75 },
  'Benzene': { status: 'restricted', regulation: 'REACH CLP', risk: 82 },
  'Polycyclic Aromatic Hydrocarbons (PAHs)': { status: 'restricted', regulation: 'REACH Annex XVII', risk: 78 },
  'Chlorinated Paraffins': { status: 'restricted', regulation: 'Stockholm Convention', risk: 76 }
};

// Conflict Minerals
export const CONFLICT_MINERALS = ['Tin', 'Tantalum', 'Tungsten', 'Gold', 'Cobalt', 'Mica'];

// Russian Origin Banned Products (Post-Ukraine Sanctions)
export const RUSSIAN_BANNED_PRODUCTS = [
  'Steel', 'Iron', 'Aluminium', 'Coal', 'Oil', 'Gas', 'Gold', 'Diamonds',
  'Seafood', 'Vodka', 'Caviar', 'Fertilizers', 'Cement'
];

// Deforestation High-Risk Commodities (EUDR)
export const EUDR_COMMODITIES = [
  'Cattle', 'Cocoa', 'Coffee', 'Oil palm', 'Rubber', 'Soy', 'Wood',
  'Beef', 'Leather', 'Chocolate', 'Furniture', 'Paper', 'Palm Oil'
];

// High-Risk Sectors for Human Rights Violations
export const HIGH_RISK_SECTORS = {
  'B05': { name: 'Coal Mining', risks: ['Forced Labor', 'Child Labor', 'Unsafe Conditions'] },
  'B06': { name: 'Oil & Gas Extraction', risks: ['Environmental Damage', 'Indigenous Rights'] },
  'B07': { name: 'Metal Ore Mining', risks: ['Conflict Minerals', 'Child Labor', 'Environmental'] },
  'C13': { name: 'Textiles', risks: ['Sweatshops', 'Forced Labor', 'Uyghur Forced Labor'] },
  'C14': { name: 'Apparel', risks: ['Sweatshops', 'Child Labor', 'Low Wages'] },
  'C15': { name: 'Leather', risks: ['Animal Welfare', 'Chemical Pollution', 'Forced Labor'] },
  'A01': { name: 'Agriculture', risks: ['Deforestation', 'Pesticides', 'Child Labor'] },
  'C10': { name: 'Food Processing', risks: ['Supply Chain Traceability', 'Forced Labor'] }
};

// SCREENING FUNCTIONS

export async function screenSupplierAgainstAllRisks(supplier, skus = [], sites = []) {
  const violations = [];
  let totalRiskScore = 0;
  let violationCount = 0;

  // 1. UN High-Risk Country Check
  if (UN_HIGH_RISK_COUNTRIES[supplier.country]) {
    const countryData = UN_HIGH_RISK_COUNTRIES[supplier.country];
    violations.push({
      type: 'country_risk',
      severity: 'critical',
      title: `High-Risk Country: ${supplier.country}`,
      description: `Reasons: ${countryData.reasons.join(', ')}`,
      risk_score: countryData.risk,
      recommendation: 'Enhanced Due Diligence Required'
    });
    totalRiskScore += countryData.risk;
    violationCount++;
  }

  // 2. Sanctioned Entity Name Check
  const companyName = (supplier.legal_name + ' ' + (supplier.trade_name || '')).toLowerCase();
  for (const keyword of SANCTIONED_KEYWORDS) {
    if (companyName.includes(keyword.toLowerCase())) {
      violations.push({
        type: 'sanctions',
        severity: 'critical',
        title: `Potential Sanctioned Entity Match`,
        description: `Company name contains sanctioned keyword: "${keyword}"`,
        risk_score: 100,
        recommendation: 'IMMEDIATE REVIEW - Do not engage until cleared'
      });
      totalRiskScore += 100;
      violationCount++;
      break;
    }
  }

  // 3. Russian Steel/Materials Check
  if (supplier.country === 'Russia') {
    const supplierProducts = skus.filter(sku => 
      sku.description?.toLowerCase().includes(supplier.legal_name?.toLowerCase().substring(0, 5))
    );
    
    for (const sku of supplierProducts) {
      const skuDesc = (sku.description || '').toLowerCase();
      for (const banned of RUSSIAN_BANNED_PRODUCTS) {
        if (skuDesc.includes(banned.toLowerCase())) {
          violations.push({
            type: 'russian_sanctions',
            severity: 'critical',
            title: `Russian Origin Banned Product Detected`,
            description: `Product "${sku.description}" contains banned material: ${banned}`,
            risk_score: 95,
            recommendation: 'Sourcing from Russia is prohibited under EU/US sanctions'
          });
          totalRiskScore += 95;
          violationCount++;
        }
      }
    }
  }

  // 4. Prohibited Substances Check
  for (const sku of skus) {
    const skuDesc = (sku.description || '').toLowerCase();
    for (const [substance, data] of Object.entries(PROHIBITED_SUBSTANCES)) {
      if (skuDesc.includes(substance.toLowerCase()) || sku.pfas_content) {
        violations.push({
          type: 'prohibited_substance',
          severity: data.status === 'banned' ? 'critical' : 'warning',
          title: `Substance of Concern: ${substance}`,
          description: `Status: ${data.status}, Regulation: ${data.regulation}`,
          risk_score: data.risk,
          recommendation: data.status === 'banned' ? 'Phase out immediately' : 'Prepare substitution plan'
        });
        totalRiskScore += data.risk;
        violationCount++;
      }
    }
  }

  // 5. Conflict Minerals Check
  if (supplier.nace_code?.startsWith('B07') || supplier.nace_code?.startsWith('B08')) {
    violations.push({
      type: 'conflict_minerals',
      severity: 'warning',
      title: 'Conflict Minerals Risk',
      description: `Supplier operates in mining sector (${supplier.nace_code}). Verify 3TG compliance.`,
      risk_score: 70,
      recommendation: 'Request CMRT (Conflict Minerals Reporting Template)'
    });
    totalRiskScore += 70;
    violationCount++;
  }

  // 6. EUDR Deforestation Check
  for (const sku of skus) {
    const skuDesc = (sku.description || '').toLowerCase();
    for (const commodity of EUDR_COMMODITIES) {
      if (skuDesc.includes(commodity.toLowerCase())) {
        violations.push({
          type: 'eudr',
          severity: 'high',
          title: `EUDR Commodity Detected: ${commodity}`,
          description: `Product contains deforestation-risk commodity`,
          risk_score: 75,
          recommendation: 'Geolocation data and deforestation-free proof required'
        });
        totalRiskScore += 75;
        violationCount++;
        break;
      }
    }
  }

  // 7. Sector-Specific Human Rights Risks
  if (supplier.nace_code && HIGH_RISK_SECTORS[supplier.nace_code.substring(0, 3)]) {
    const sectorData = HIGH_RISK_SECTORS[supplier.nace_code.substring(0, 3)];
    violations.push({
      type: 'human_rights',
      severity: 'warning',
      title: `High-Risk Sector: ${sectorData.name}`,
      description: `Common risks: ${sectorData.risks.join(', ')}`,
      risk_score: 65,
      recommendation: 'Enhanced human rights due diligence required'
    });
    totalRiskScore += 65;
    violationCount++;
  }

  // 8. Sites in High-Risk Locations
  for (const site of sites.filter(s => s.supplier_id === supplier.id)) {
    if (UN_HIGH_RISK_COUNTRIES[site.country]) {
      const countryData = UN_HIGH_RISK_COUNTRIES[site.country];
      violations.push({
        type: 'site_risk',
        severity: 'critical',
        title: `Production Site in ${site.country}`,
        description: `Site: ${site.site_name}. ${countryData.reasons.join(', ')}`,
        risk_score: countryData.risk,
        recommendation: 'Consider alternative sourcing location'
      });
      totalRiskScore += countryData.risk;
      violationCount++;
    }
  }

  const avgRiskScore = violationCount > 0 ? Math.min(100, totalRiskScore / violationCount) : 0;

  return {
    violations,
    total_violations: violationCount,
    average_risk_score: Math.round(avgRiskScore),
    clearance_status: violationCount === 0 ? 'CLEARED' : 
                      violations.some(v => v.severity === 'critical') ? 'BLOCKED' : 'REVIEW_REQUIRED'
  };
}

export async function generateRiskReport(supplier, screeningResults) {
  // Save violations as RiskAlerts
  for (const violation of screeningResults.violations) {
    await base44.entities.RiskAlert.create({
      supplier_id: supplier.id,
      alert_type: violation.type,
      severity: violation.severity,
      title: violation.title,
      description: violation.description + ' | ' + violation.recommendation,
      source: 'Risk Screening Engine',
      status: 'open'
    });
  }

  return screeningResults;
}

export function getModuleCompatibility(supplier, skus = []) {
  const modules = {
    PFAS: false,
    EUDR: false,
    CBAM: false,
    PPWR: false,
    CSDDD: false,
    CSRD: false,
    ConflictMinerals: false
  };

  // PFAS
  if (supplier.pfas_relevant || skus.some(s => s.pfas_content)) {
    modules.PFAS = true;
  }

  // EUDR
  if (supplier.eudr_relevant || skus.some(s => {
    const desc = (s.description || '').toLowerCase();
    return EUDR_COMMODITIES.some(c => desc.includes(c.toLowerCase()));
  })) {
    modules.EUDR = true;
  }

  // CBAM
  if (supplier.cbam_relevant || supplier.nace_code?.startsWith('C24')) {
    modules.CBAM = true;
  }

  // PPWR
  if (supplier.nace_code?.startsWith('C17') || supplier.nace_code?.startsWith('C22')) {
    modules.PPWR = true;
  }

  // CSDDD (all high-risk suppliers)
  if (supplier.risk_level === 'high' || supplier.risk_level === 'critical') {
    modules.CSDDD = true;
  }

  // CSRD (all suppliers contribute to Scope 3)
  modules.CSRD = true;

  // Conflict Minerals
  if (supplier.nace_code?.startsWith('B0')) {
    modules.ConflictMinerals = true;
  }

  return modules;
}