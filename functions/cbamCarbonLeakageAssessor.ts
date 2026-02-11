import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Carbon Leakage Risk Assessment Engine
 * Per Art. 10b EU ETS Directive 2003/87/EC
 * Automated NACE code-based sector classification
 */

const CARBON_LEAKAGE_SECTORS = {
  // Iron & Steel - NACE 24.1-24.5
  '24.10': { name: 'Iron and steel', risk_score: 95, trade_intensity: 0.28, emission_intensity: 0.32 },
  '24.20': { name: 'Steel tubes', risk_score: 88, trade_intensity: 0.25, emission_intensity: 0.28 },
  '24.31': { name: 'Cold drawing of bars', risk_score: 85, trade_intensity: 0.22, emission_intensity: 0.24 },
  '24.33': { name: 'Cold forming', risk_score: 82, trade_intensity: 0.20, emission_intensity: 0.22 },
  '24.51': { name: 'Iron casting', risk_score: 80, trade_intensity: 0.18, emission_intensity: 0.26 },
  
  // Aluminum - NACE 24.42
  '24.42': { name: 'Aluminium production', risk_score: 98, trade_intensity: 0.35, emission_intensity: 0.45 },
  
  // Cement - NACE 23.51
  '23.51': { name: 'Cement production', risk_score: 92, trade_intensity: 0.15, emission_intensity: 0.48 },
  
  // Fertilizers - NACE 20.15
  '20.15': { name: 'Fertilizer manufacturing', risk_score: 90, trade_intensity: 0.30, emission_intensity: 0.38 },
  
  // Chemicals - NACE 20.1x
  '20.11': { name: 'Industrial gases', risk_score: 75, trade_intensity: 0.18, emission_intensity: 0.25 },
  '20.13': { name: 'Inorganic chemicals', risk_score: 78, trade_intensity: 0.22, emission_intensity: 0.28 },
  '20.14': { name: 'Organic chemicals', risk_score: 72, trade_intensity: 0.20, emission_intensity: 0.22 },
  
  // Refineries - NACE 19.20
  '19.20': { name: 'Refined petroleum', risk_score: 85, trade_intensity: 0.28, emission_intensity: 0.35 },
  
  // Paper - NACE 17.1x
  '17.11': { name: 'Pulp manufacturing', risk_score: 68, trade_intensity: 0.15, emission_intensity: 0.18 },
  '17.12': { name: 'Paper manufacturing', risk_score: 65, trade_intensity: 0.18, emission_intensity: 0.20 },
  
  // Glass - NACE 23.1x
  '23.13': { name: 'Hollow glass', risk_score: 70, trade_intensity: 0.12, emission_intensity: 0.22 },
  '23.14': { name: 'Glass fibres', risk_score: 72, trade_intensity: 0.15, emission_intensity: 0.24 }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, params } = await req.json();

    switch (action) {
      case 'assess_supplier':
        return await assessSupplier(base44, params);
      
      case 'assess_product':
        return await assessProduct(base44, params);
      
      case 'get_sector_benchmark':
        return await getSectorBenchmark(base44, params);
      
      case 'calculate_relocation_risk':
        return await calculateRelocationRisk(base44, params);
      
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function assessSupplier(base44, params) {
  const { supplier_id } = params;
  
  const suppliers = await base44.asServiceRole.entities.Supplier.filter({ id: supplier_id });
  if (!suppliers.length) {
    return Response.json({ error: 'Supplier not found' }, { status: 404 });
  }
  
  const supplier = suppliers[0];
  const naceCode = supplier.nace_code;
  
  if (!naceCode) {
    return Response.json({ 
      error: 'NACE code not set',
      action_required: 'Add NACE code to supplier profile'
    }, { status: 400 });
  }
  
  const sectorData = CARBON_LEAKAGE_SECTORS[naceCode];
  
  if (!sectorData) {
    return Response.json({
      supplier_id,
      nace_code: naceCode,
      risk_score: 50,
      risk_tier: 'low',
      message: 'Not a carbon-intensive sector'
    });
  }
  
  // Enhanced risk calculation
  const countryRiskMultiplier = getCountryRiskMultiplier(supplier.country);
  const adjustedRiskScore = Math.min(100, sectorData.risk_score * countryRiskMultiplier);
  
  const riskTier = 
    adjustedRiskScore >= 90 ? 'critical' :
    adjustedRiskScore >= 75 ? 'high' :
    adjustedRiskScore >= 50 ? 'medium' : 'low';
  
  return Response.json({
    supplier_id,
    nace_code: naceCode,
    sector_name: sectorData.name,
    risk_score: Math.round(adjustedRiskScore),
    risk_tier: riskTier,
    trade_intensity: sectorData.trade_intensity,
    emission_intensity: sectorData.emission_intensity,
    country_multiplier: countryRiskMultiplier,
    cbam_relevant: adjustedRiskScore >= 60,
    recommendations: generateRecommendations(riskTier, sectorData)
  });
}

async function assessProduct(base44, params) {
  const { cn_code, country_of_origin } = params;
  
  // Map CN code to NACE sector
  const naceCode = mapCNCodeToNACE(cn_code);
  const sectorData = CARBON_LEAKAGE_SECTORS[naceCode];
  
  if (!sectorData) {
    return Response.json({
      cn_code,
      risk_score: 30,
      cbam_relevant: false
    });
  }
  
  const countryMultiplier = getCountryRiskMultiplier(country_of_origin);
  const riskScore = Math.min(100, sectorData.risk_score * countryMultiplier);
  
  return Response.json({
    cn_code,
    nace_code: naceCode,
    sector_name: sectorData.name,
    risk_score: Math.round(riskScore),
    cbam_relevant: true,
    requires_monitoring: riskScore >= 70
  });
}

async function getSectorBenchmark(base44, params) {
  const { nace_code } = params;
  
  const sector = CARBON_LEAKAGE_SECTORS[nace_code];
  if (!sector) {
    return Response.json({ error: 'Sector not found' }, { status: 404 });
  }
  
  return Response.json({
    nace_code,
    ...sector,
    cbam_covered: sector.risk_score >= 60
  });
}

async function calculateRelocationRisk(base44, params) {
  const { supplier_id, annual_volume_tonnes, cbam_cost_eur } = params;
  
  const suppliers = await base44.asServiceRole.entities.Supplier.filter({ id: supplier_id });
  if (!suppliers.length) {
    return Response.json({ error: 'Supplier not found' }, { status: 404 });
  }
  
  const supplier = suppliers[0];
  const annualRevenue = supplier.annual_revenue_eur || 1000000;
  
  // Relocation risk = CBAM cost as % of revenue
  const cbamCostPercentage = (cbam_cost_eur / annualRevenue) * 100;
  
  const relocationRisk = 
    cbamCostPercentage >= 10 ? 'critical' :
    cbamCostPercentage >= 5 ? 'high' :
    cbamCostPercentage >= 2 ? 'medium' : 'low';
  
  return Response.json({
    supplier_id,
    cbam_cost_eur,
    cbam_cost_percentage: cbamCostPercentage.toFixed(2),
    relocation_risk: relocationRisk,
    alternative_actions: [
      cbamCostPercentage >= 5 ? 'Consider green steel suppliers' : null,
      cbamCostPercentage >= 5 ? 'Negotiate emission reduction commitments' : null,
      'Request SBTi-validated decarbonization roadmap'
    ].filter(Boolean)
  });
}

function mapCNCodeToNACE(cn_code) {
  const code = cn_code.substring(0, 4);
  
  const mapping = {
    '7201': '24.10', '7202': '24.10', '7203': '24.10', '7204': '24.10',
    '7205': '24.10', '7206': '24.10', '7207': '24.10', '7208': '24.20',
    '7601': '24.42', '7602': '24.42', '7603': '24.42', '7604': '24.42',
    '2523': '23.51',
    '3102': '20.15', '3103': '20.15', '3104': '20.15', '3105': '20.15',
    '2804': '20.11',
    '2710': '19.20', '2711': '19.20'
  };
  
  return mapping[code] || '24.10'; // Default to iron & steel
}

function getCountryRiskMultiplier(country) {
  // Countries with high carbon intensity or no carbon pricing
  const highRisk = ['China', 'India', 'Russia', 'Ukraine', 'Turkey'];
  const mediumRisk = ['Brazil', 'South Africa', 'Indonesia', 'Vietnam', 'Thailand'];
  const lowRisk = ['USA', 'Canada', 'Australia', 'South Korea', 'Japan'];
  
  if (highRisk.includes(country)) return 1.2;
  if (mediumRisk.includes(country)) return 1.1;
  if (lowRisk.includes(country)) return 0.95;
  
  return 1.0;
}

function generateRecommendations(riskTier, sectorData) {
  const recommendations = [];
  
  if (riskTier === 'critical' || riskTier === 'high') {
    recommendations.push('Priority: Request actual emissions data from operators');
    recommendations.push('Monitor EU ETS price fluctuations weekly');
    recommendations.push('Evaluate alternative suppliers with lower carbon intensity');
  }
  
  if (sectorData.trade_intensity > 0.25) {
    recommendations.push('High trade exposure - consider long-term contracts');
  }
  
  if (sectorData.emission_intensity > 0.30) {
    recommendations.push('Support supplier decarbonization projects');
  }
  
  return recommendations;
}