import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

// Risk weights for overall score calculation
const RISK_WEIGHTS = {
  location: 0.20,
  sector: 0.15,
  human_rights: 0.15,
  environmental: 0.15,
  chemical: 0.10,
  mineral: 0.10,
  performance: 0.15
};

// Location risk by country (sample - would be from external database)
const COUNTRY_RISK_SCORES = {
  'Germany': 10, 'Sweden': 8, 'Netherlands': 10, 'France': 12, 'Italy': 18,
  'Spain': 15, 'USA': 15, 'UK': 12, 'Japan': 10, 'South Korea': 15,
  'Poland': 22, 'Czech Republic': 20, 'Austria': 10, 'Belgium': 12,
  'China': 55, 'Vietnam': 50, 'Thailand': 45, 'Indonesia': 60,
  'India': 55, 'Taiwan': 25, 'Democratic Republic of Congo': 95,
  'Brazil': 45, 'Malaysia': 40, 'Philippines': 50, 'Bangladesh': 70,
  'Myanmar': 85, 'Pakistan': 65, 'Nigeria': 70, 'Ethiopia': 65
};

// Sector risk by NACE code prefix
const SECTOR_RISK_SCORES = {
  'A01': 50, // Agriculture - deforestation risk
  'B05': 70, 'B06': 65, 'B07': 80, 'B08': 60, // Mining
  'C10': 35, 'C11': 30, 'C12': 25, // Food, beverages
  'C13': 55, 'C14': 60, 'C15': 50, // Textiles, apparel, leather
  'C17': 40, // Paper
  'C19': 70, 'C20': 65, // Petroleum, chemicals
  'C21': 45, // Pharmaceuticals
  'C22': 50, // Rubber, plastics
  'C23': 55, // Non-metallic minerals
  'C24': 60, // Basic metals
  'C25': 45, // Fabricated metals
  'C26': 55, // Electronics
  'C27': 50, // Electrical equipment
  'C28': 40, // Machinery
  'C29': 45, 'C30': 50 // Motor vehicles, transport
};

// Certification impact on risk (negative = reduces risk)
const CERTIFICATION_IMPACT = {
  'ISO 9001': -5,
  'ISO 14001': -10,
  'ISO 45001': -8,
  'ISO 50001': -7,
  'SA8000': -12,
  'FSC': -10,
  'PEFC': -8,
  'REACH': -8,
  'RoHS': -5,
  'IATF 16949': -6,
  'B Corp': -10,
  'EcoVadis Gold': -15,
  'EcoVadis Silver': -10,
  'EcoVadis Bronze': -5,
  'SMETA': -8,
  'Sedex': -6
};

// Facility type risk modifiers
const FACILITY_TYPE_RISK = {
  'factory': 0,
  'warehouse': -15,
  'port': -10,
  'office': -25,
  'distribution_center': -12,
  'other': 0
};

// Questionnaire response impact on risk dimensions
const QUESTIONNAIRE_RISK_IMPACT = {
  general: {
    has_sustainability_policy: { yes: -5, no: 10 },
    has_code_of_conduct: { yes: -5, no: 8 },
    annual_audit: { yes: -8, no: 5 },
    certified_management_system: { yes: -10, no: 5 }
  },
  pfas: {
    uses_pfas: { yes: 25, no: -10 },
    pfas_phase_out_plan: { yes: -15, no: 10 },
    pfas_alternatives_available: { yes: -10, no: 5 }
  },
  eudr: {
    traceable_to_origin: { yes: -15, no: 20 },
    deforestation_free: { yes: -20, no: 30 },
    geolocation_available: { yes: -10, no: 15 }
  },
  cbam: {
    emissions_data_available: { yes: -10, no: 15 },
    third_party_verified: { yes: -15, no: 5 },
    reduction_targets: { yes: -10, no: 5 }
  },
  ppwr: {
    recyclable_packaging: { yes: -10, no: 15 },
    recycled_content: { yes: -8, no: 5 },
    packaging_reduction_plan: { yes: -10, no: 5 }
  },
  human_rights: {
    no_child_labor: { yes: -10, no: 50 },
    no_forced_labor: { yes: -10, no: 50 },
    freedom_of_association: { yes: -8, no: 20 },
    living_wage: { yes: -10, no: 15 },
    safe_working_conditions: { yes: -8, no: 20 }
  },
  environmental: {
    environmental_management: { yes: -10, no: 10 },
    emissions_monitoring: { yes: -8, no: 8 },
    waste_management: { yes: -5, no: 5 },
    water_management: { yes: -5, no: 5 },
    renewable_energy: { yes: -10, no: 3 }
  }
};

// Risk level thresholds
const RISK_THRESHOLDS = {
  low: { max: 30 },
  medium: { max: 55 },
  high: { max: 75 },
  critical: { max: 100 }
};

// Alert thresholds for automatic alerts
const ALERT_THRESHOLDS = {
  score_increase: 15, // Alert if score increases by this amount
  critical_threshold: 75, // Alert when crossing into critical
  high_threshold: 55, // Alert when crossing into high
  dimension_critical: 80 // Alert when any dimension exceeds this
};

// Data Sources Metadata
export const RISK_DATA_SOURCES = {
  location: "World Bank Worldwide Governance Indicators (WGI) & Transparency International CPI",
  sector: "NACE/SIC Industry Risk Classification & ILO Labor Standards",
  human_rights: "Supplier Self-Assessment & AI Media Monitoring",
  environmental: "Carbon Disclosure Project (CDP) & Environmental Performance Index (EPI)",
  chemical: "REACH/RoHS Compliance Database & Self-Declaration",
  mineral: "Conflict-Free Smelter Program (CFSP) & OECD Due Diligence Guidance",
  performance: "Internal Audit Reports & Supplier Performance Scorecards"
};

export function getRiskDataSource(dimension) {
  const key = dimension.replace('_risk', '');
  return RISK_DATA_SOURCES[key] || "Internal Assessment Model";
}

export function getRiskLevel(score) {
  if (score <= RISK_THRESHOLDS.low.max) return 'low';
  if (score <= RISK_THRESHOLDS.medium.max) return 'medium';
  if (score <= RISK_THRESHOLDS.high.max) return 'high';
  return 'critical';
}

export function calculateLocationRisk(country) {
  return COUNTRY_RISK_SCORES[country] || 50;
}

export function calculateSectorRisk(naceCode) {
  if (!naceCode) return 50;
  const prefix = naceCode.substring(0, 3);
  return SECTOR_RISK_SCORES[prefix] || 40;
}

export function calculateSiteRisk(site) {
  let baseRisk = calculateLocationRisk(site.country);
  
  // Apply facility type modifier
  baseRisk += FACILITY_TYPE_RISK[site.facility_type] || 0;
  
  // Apply certification reductions
  if (site.certifications && Array.isArray(site.certifications)) {
    site.certifications.forEach(cert => {
      baseRisk += CERTIFICATION_IMPACT[cert] || 0;
    });
  }
  
  // Clamp between 0-100
  return Math.max(0, Math.min(100, baseRisk));
}

export function calculateQuestionnaireImpact(tasks) {
  const impacts = {
    human_rights: 0,
    environmental: 0,
    chemical: 0,
    performance: 0
  };

  const completedQuestionnaires = tasks.filter(
    t => t.task_type === 'questionnaire' && t.status === 'completed' && t.response_data
  );

  completedQuestionnaires.forEach(task => {
    const qType = task.questionnaire_type;
    const responses = task.response_data || {};
    const impactRules = QUESTIONNAIRE_RISK_IMPACT[qType];
    
    if (!impactRules) return;

    Object.entries(responses).forEach(([question, answer]) => {
      if (impactRules[question]) {
        const impact = impactRules[question][answer] || 0;
        
        // Map questionnaire types to risk dimensions
        if (qType === 'human_rights') {
          impacts.human_rights += impact;
        } else if (qType === 'environmental' || qType === 'eudr') {
          impacts.environmental += impact;
        } else if (qType === 'pfas') {
          impacts.chemical += impact;
        } else {
          impacts.performance += impact;
        }
      }
    });
  });

  return impacts;
}

export function calculateOverallRisk(dimensions) {
  let weightedSum = 0;
  
  Object.entries(RISK_WEIGHTS).forEach(([dimension, weight]) => {
    const dimKey = dimension + '_risk';
    const value = dimensions[dimKey] || dimensions[dimension] || 50;
    weightedSum += value * weight;
  });
  
  return Math.round(Math.max(0, Math.min(100, weightedSum)));
}

export async function recalculateSupplierRisk(supplierId, suppliers, sites, tasks) {
  const supplier = suppliers.find(s => s.id === supplierId);
  if (!supplier) return null;

  const supplierSites = sites.filter(s => s.supplier_id === supplierId);
  const supplierTasks = tasks.filter(t => t.supplier_id === supplierId);

  // Base risk dimensions
  let dimensions = {
    location_risk: calculateLocationRisk(supplier.country),
    sector_risk: calculateSectorRisk(supplier.nace_code),
    human_rights_risk: supplier.human_rights_risk || 50,
    environmental_risk: supplier.environmental_risk || 50,
    chemical_risk: supplier.chemical_risk || 50,
    mineral_risk: supplier.mineral_risk || 50,
    performance_risk: supplier.performance_risk || 50
  };

  // Adjust based on site average risk
  if (supplierSites.length > 0) {
    const avgSiteRisk = supplierSites.reduce((sum, site) => {
      return sum + calculateSiteRisk(site);
    }, 0) / supplierSites.length;
    
    // Blend location risk with site-based assessment
    dimensions.location_risk = Math.round((dimensions.location_risk + avgSiteRisk) / 2);
  }

  // Apply questionnaire impacts
  const qImpacts = calculateQuestionnaireImpact(supplierTasks);
  dimensions.human_rights_risk = Math.max(0, Math.min(100, dimensions.human_rights_risk + qImpacts.human_rights));
  dimensions.environmental_risk = Math.max(0, Math.min(100, dimensions.environmental_risk + qImpacts.environmental));
  dimensions.chemical_risk = Math.max(0, Math.min(100, dimensions.chemical_risk + qImpacts.chemical));
  dimensions.performance_risk = Math.max(0, Math.min(100, dimensions.performance_risk + qImpacts.performance));

  // Calculate overall score
  const newScore = calculateOverallRisk(dimensions);
  const newLevel = getRiskLevel(newScore);

  return {
    ...dimensions,
    risk_score: newScore,
    risk_level: newLevel,
    previous_score: supplier.risk_score,
    previous_level: supplier.risk_level
  };
}

export async function updateSupplierRiskAndGenerateAlerts(supplierId, suppliers, sites, tasks) {
  const riskData = await recalculateSupplierRisk(supplierId, suppliers, sites, tasks);
  if (!riskData) return null;

  const supplier = suppliers.find(s => s.id === supplierId);
  const alerts = [];

  // Check for significant score increase
  if (riskData.previous_score && riskData.risk_score - riskData.previous_score >= ALERT_THRESHOLDS.score_increase) {
    alerts.push({
      supplier_id: supplierId,
      alert_type: 'performance',
      severity: 'warning',
      title: 'Significant Risk Score Increase',
      description: `Risk score increased from ${riskData.previous_score} to ${riskData.risk_score} (${riskData.risk_score - riskData.previous_score} points).`,
      source: 'Risk Engine',
      status: 'open'
    });
  }

  // Check for crossing into critical
  if (riskData.risk_level === 'critical' && riskData.previous_level !== 'critical') {
    alerts.push({
      supplier_id: supplierId,
      alert_type: 'compliance',
      severity: 'critical',
      title: 'Supplier Entered Critical Risk Level',
      description: `${supplier.legal_name} has crossed into CRITICAL risk level. Immediate review required.`,
      source: 'Risk Engine',
      status: 'open'
    });
  }

  // Check for crossing into high
  if (riskData.risk_level === 'high' && riskData.previous_level === 'medium') {
    alerts.push({
      supplier_id: supplierId,
      alert_type: 'compliance',
      severity: 'warning',
      title: 'Supplier Entered High Risk Level',
      description: `${supplier.legal_name} has crossed into HIGH risk level. Enhanced due diligence recommended.`,
      source: 'Risk Engine',
      status: 'open'
    });
  }

  // Check individual dimensions
  const dimensionLabels = {
    human_rights_risk: 'Human Rights',
    environmental_risk: 'Environmental',
    chemical_risk: 'Chemical/PFAS',
    mineral_risk: 'Minerals',
    location_risk: 'Location',
    sector_risk: 'Sector'
  };

  Object.entries(dimensionLabels).forEach(([key, label]) => {
    if (riskData[key] >= ALERT_THRESHOLDS.dimension_critical) {
      alerts.push({
        supplier_id: supplierId,
        alert_type: key.replace('_risk', '').replace('_', '_'),
        severity: riskData[key] >= 90 ? 'critical' : 'warning',
        title: `High ${label} Risk Detected`,
        description: `${label} risk score is ${riskData[key]}/100. Review and mitigation recommended.`,
        source: 'Risk Engine',
        status: 'open'
      });
    }
  });

  // Update supplier with new risk data
  await base44.entities.Supplier.update(supplierId, {
    location_risk: riskData.location_risk,
    sector_risk: riskData.sector_risk,
    human_rights_risk: riskData.human_rights_risk,
    environmental_risk: riskData.environmental_risk,
    chemical_risk: riskData.chemical_risk,
    mineral_risk: riskData.mineral_risk,
    performance_risk: riskData.performance_risk,
    risk_score: riskData.risk_score,
    risk_level: riskData.risk_level
  });

  // Create alerts
  for (const alert of alerts) {
    await base44.entities.RiskAlert.create(alert);
  }

  return { riskData, alerts };
}

export async function updateAllSiteRisks(sites) {
  const updates = [];
  
  for (const site of sites) {
    const newRisk = calculateSiteRisk(site);
    if (newRisk !== site.site_risk_score) {
      await base44.entities.SupplierSite.update(site.id, {
        site_risk_score: newRisk
      });
      updates.push({ site, oldRisk: site.site_risk_score, newRisk });
    }
  }
  
  return updates;
}

export async function runFullRiskAssessment(suppliers, sites, tasks) {
  const results = {
    suppliersUpdated: 0,
    sitesUpdated: 0,
    alertsCreated: 0
  };

  // Update all site risks
  const siteUpdates = await updateAllSiteRisks(sites);
  results.sitesUpdated = siteUpdates.length;

  // Recalculate all supplier risks
  for (const supplier of suppliers) {
    const result = await updateSupplierRiskAndGenerateAlerts(
      supplier.id, suppliers, sites, tasks
    );
    if (result) {
      results.suppliersUpdated++;
      results.alertsCreated += result.alerts.length;
    }
  }

  return results;
}

// Single supplier assessment (for onboarding flow)
export async function runSingleSupplierRiskAssessment(supplier, allSuppliers, allSites, allTasks) {
  const riskData = await recalculateSupplierRisk(supplier.id, allSuppliers, allSites, allTasks);
  if (!riskData) return supplier;

  const alerts = [];
  
  // Check individual dimensions and create alerts
  const dimensionLabels = {
    human_rights_risk: 'Human Rights',
    environmental_risk: 'Environmental',
    chemical_risk: 'Chemical/PFAS',
    mineral_risk: 'Minerals',
    location_risk: 'Location',
    sector_risk: 'Sector'
  };

  Object.entries(dimensionLabels).forEach(([key, label]) => {
    if (riskData[key] >= ALERT_THRESHOLDS.dimension_critical) {
      alerts.push({
        supplier_id: supplier.id,
        alert_type: key.replace('_risk', ''),
        severity: riskData[key] >= 90 ? 'critical' : 'warning',
        title: `High ${label} Risk Detected`,
        description: `${label} risk score is ${riskData[key]}/100. Review and mitigation recommended.`,
        source: 'Risk Engine',
        status: 'open'
      });
    }
  });

  // Update supplier
  await base44.entities.Supplier.update(supplier.id, {
    location_risk: riskData.location_risk,
    sector_risk: riskData.sector_risk,
    human_rights_risk: riskData.human_rights_risk,
    environmental_risk: riskData.environmental_risk,
    chemical_risk: riskData.chemical_risk,
    mineral_risk: riskData.mineral_risk,
    performance_risk: riskData.performance_risk,
    risk_score: riskData.risk_score,
    risk_level: riskData.risk_level,
    last_assessment_date: new Date().toISOString()
  });

  // Create alerts
  for (const alert of alerts) {
    await base44.entities.RiskAlert.create(alert);
  }

  return { ...supplier, ...riskData, alerts };
}

export async function performProactiveMonitoring(supplier) {
  const prompt = `
    Perform a comprehensive risk analysis for the supplier "${supplier.legal_name}" (also known as "${supplier.trade_name || ''}") located in ${supplier.country}.
    
    You must analyze 3 key areas using internet sources:
    1. NEWS & ADVERSE MEDIA: Search for recent (last 12 months) labor violations, environmental accidents, supply chain disruptions, or sanctions.
    2. FINANCIAL HEALTH: Search for recent financial reports, bankruptcy filings, credit rating downgrades, or news about liquidity issues.
    3. GEOPOLITICAL & INDUSTRY BENCHMARKS: Evaluate the risk of operating in ${supplier.country} (political instability, conflict, trade wars) and how this supplier compares to industry benchmarks for ${supplier.nace_code || 'general manufacturing'}.
    
    Return a JSON object:
    {
      "events": [
        {
          "title": "string (headline)",
          "date": "string (approximate date)",
          "severity": "low | medium | high | critical",
          "description": "string (summary of the event)",
          "source": "string (source name/url if available)"
        }
      ],
      "analysis_summary": "string (a dynamic, predictive paragraph summarizing the overall risk outlook)",
      "flags": {
        "geopolitical_risk": boolean (true if high risk of instability/conflict),
        "financial_risk": boolean (true if signs of financial distress)
      },
      "risk_score_adjustment": number (suggested adjustment to risk score, e.g., +10 or -5 based on findings)
    }
  `;

  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                date: { type: "string" },
                severity: { type: "string" },
                description: { type: "string" },
                source: { type: "string" }
              }
            }
          },
          analysis_summary: { type: "string" },
          flags: {
            type: "object",
            properties: {
              geopolitical_risk: { type: "boolean" },
              financial_risk: { type: "boolean" }
            }
          },
          risk_score_adjustment: { type: "number" }
        }
      }
    });

    const newAlerts = [];
    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;

    // Update Supplier Entity with new AI insights
    await base44.entities.Supplier.update(supplier.id, {
      ai_risk_analysis: parsedResult.analysis_summary,
      geopolitical_risk_flag: parsedResult.flags?.geopolitical_risk || false,
      financial_risk_flag: parsedResult.flags?.financial_risk || false,
      last_ai_analysis_date: new Date().toISOString(),
      // Optionally adjust risk score directly here or just let the flags speak
      risk_score: Math.min(100, Math.max(0, (supplier.risk_score || 50) + (parsedResult.risk_score_adjustment || 0)))
    });

    // Create specific alerts for flags
    if (parsedResult.flags?.geopolitical_risk) {
       const alert = await base44.entities.RiskAlert.create({
            supplier_id: supplier.id,
            alert_type: 'geopolitical',
            severity: 'high',
            title: `Geopolitical Risk Detected`,
            description: `AI analysis identified elevated geopolitical risks in ${supplier.country} affecting this supplier.`,
            source: 'Risk Engine AI',
            status: 'open'
          });
          newAlerts.push(alert);
    }

    if (parsedResult.flags?.financial_risk) {
       const alert = await base44.entities.RiskAlert.create({
            supplier_id: supplier.id,
            alert_type: 'financial',
            severity: 'high',
            title: `Financial Instability Detected`,
            description: `AI analysis identified potential financial distress indicators.`,
            source: 'Risk Engine AI',
            status: 'open'
          });
          newAlerts.push(alert);
    }

    // Create alerts for events
    if (parsedResult.events && parsedResult.events.length > 0) {
      for (const event of parsedResult.events) {
        if (['medium', 'high', 'critical'].includes(event.severity)) {
          const alert = await base44.entities.RiskAlert.create({
            supplier_id: supplier.id,
            alert_type: 'compliance',
            severity: event.severity,
            title: `News Monitor: ${event.title}`,
            description: `${event.description} (Date: ${event.date}, Source: ${event.source})`,
            source: 'Proactive Monitoring AI',
            status: 'open'
          });
          newAlerts.push(alert);
        }
      }
    }
    
    return { events: parsedResult.events, newAlerts, summary: parsedResult.analysis_summary };
  } catch (error) {
    console.error("Proactive monitoring failed", error);
    throw error;
  }
}