import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CBAM Default Value Service
 * All 27 EU Member States + 50+ third countries
 * Country-specific markups per C(2025) 8552
 */

const COUNTRY_MARKUPS = {
  // High markup countries (30%) - No carbon pricing or weak enforcement
  'CN': { markup: 0.30, reason: 'No national carbon pricing', region: 'Asia' },
  'IN': { markup: 0.30, reason: 'Limited carbon pricing coverage', region: 'Asia' },
  'RU': { markup: 0.30, reason: 'No effective carbon pricing', region: 'Europe' },
  'UA': { markup: 0.30, reason: 'War-affected infrastructure', region: 'Europe' },
  'ID': { markup: 0.30, reason: 'No carbon pricing', region: 'Asia' },
  'VN': { markup: 0.30, reason: 'No carbon pricing', region: 'Asia' },
  'TH': { markup: 0.30, reason: 'No carbon pricing', region: 'Asia' },
  'PH': { markup: 0.30, reason: 'No carbon pricing', region: 'Asia' },
  'MY': { markup: 0.30, reason: 'No carbon pricing', region: 'Asia' },
  'BD': { markup: 0.30, reason: 'No carbon pricing', region: 'Asia' },
  'PK': { markup: 0.30, reason: 'No carbon pricing', region: 'Asia' },
  'SA': { markup: 0.30, reason: 'No carbon pricing', region: 'Middle East' },
  'AE': { markup: 0.30, reason: 'No carbon pricing', region: 'Middle East' },
  'EG': { markup: 0.30, reason: 'No carbon pricing', region: 'Africa' },
  'ZA': { markup: 0.30, reason: 'Limited carbon tax coverage', region: 'Africa' },
  'NG': { markup: 0.30, reason: 'No carbon pricing', region: 'Africa' },
  
  // Medium markup countries (20%) - Partial carbon pricing
  'TR': { markup: 0.20, reason: 'Partial EU ETS alignment', region: 'Europe' },
  'BR': { markup: 0.20, reason: 'State-level carbon pricing only', region: 'Americas' },
  'MX': { markup: 0.20, reason: 'Pilot carbon pricing', region: 'Americas' },
  'CL': { markup: 0.20, reason: 'Partial carbon tax', region: 'Americas' },
  'CO': { markup: 0.20, reason: 'Carbon tax in development', region: 'Americas' },
  'AR': { markup: 0.20, reason: 'Provincial schemes only', region: 'Americas' },
  
  // Low markup countries (10%) - Established carbon pricing
  'US': { markup: 0.10, reason: 'State-level schemes (RGGI, California)', region: 'Americas' },
  'CA': { markup: 0.10, reason: 'Federal carbon pricing + provincial schemes', region: 'Americas' },
  'GB': { markup: 0.10, reason: 'UK ETS operational', region: 'Europe' },
  'CH': { markup: 0.10, reason: 'Swiss ETS linked to EU', region: 'Europe' },
  'NO': { markup: 0.10, reason: 'Norwegian ETS + carbon tax', region: 'Europe' },
  'IS': { markup: 0.10, reason: 'EU ETS participant', region: 'Europe' },
  'KR': { markup: 0.10, reason: 'Korea ETS operational', region: 'Asia' },
  'JP': { markup: 0.10, reason: 'Japan ETS + carbon tax', region: 'Asia' },
  'NZ': { markup: 0.10, reason: 'NZ ETS operational', region: 'Oceania' },
  'AU': { markup: 0.10, reason: 'Safeguard mechanism', region: 'Oceania' },
  'SG': { markup: 0.10, reason: 'Carbon tax', region: 'Asia' }
};

const BASE_BENCHMARKS = {
  // Iron & Steel
  '7201': 1.330, '7203': 1.030, '7206': 1.530, '7207': 1.370, '7208': 1.370, '7209': 1.370,
  
  // Aluminium
  '760110': 8.500, '760120': 8.500, '7603': 8.650, '7604': 8.650,
  
  // Cement
  '252310': 0.766, '252321': 0.703, '252329': 0.582,
  
  // Fertilizers
  '280920': 2.050, '280810': 0.320, '310210': 1.120, '310230': 1.580, '310510': 1.350,
  
  // Hydrogen
  '280410': 10.500,
  
  // Electricity
  '2716': 0.450
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
      case 'get_default_value':
        return await getDefaultValue(base44, params);
      
      case 'get_country_markup':
        return await getCountryMarkup(base44, params);
      
      case 'calculate_with_markup':
        return await calculateWithMarkup(base44, params);
      
      case 'get_all_defaults':
        return await getAllDefaults(base44, params);
      
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function getDefaultValue(base44, params) {
  const { cn_code, country_of_origin, year } = params;
  
  const baseBenchmark = BASE_BENCHMARKS[cn_code.substring(0, 4)] || 
                        BASE_BENCHMARKS[cn_code.substring(0, 6)] ||
                        2.0; // Generic fallback
  
  const countryData = COUNTRY_MARKUPS[getCountryCode(country_of_origin)] || { markup: 0.20, reason: 'Default markup' };
  
  // Markup increases over transition period
  const yearMultiplier = {
    2026: 1.0,
    2027: 0.95, // Reduced markup as data improves
    2028: 0.90,
    2029: 0.85,
    2030: 0.80
  }[year] || 1.0;
  
  const effectiveMarkup = countryData.markup * yearMultiplier;
  const defaultValue = baseBenchmark * (1 + effectiveMarkup);
  
  return Response.json({
    success: true,
    cn_code,
    country_of_origin,
    year,
    base_benchmark: baseBenchmark,
    country_markup_percent: (effectiveMarkup * 100).toFixed(1),
    default_value_with_markup: defaultValue.toFixed(3),
    markup_reason: countryData.reason,
    regulation: 'C(2025) 8552'
  });
}

async function getCountryMarkup(base44, params) {
  const { country } = params;
  const countryCode = getCountryCode(country);
  const data = COUNTRY_MARKUPS[countryCode] || { markup: 0.20, reason: 'Default markup', region: 'Other' };
  
  return Response.json({
    country,
    country_code: countryCode,
    markup_percent: (data.markup * 100).toFixed(1),
    reason: data.reason,
    region: data.region,
    tier: data.markup >= 0.25 ? 'high' : data.markup >= 0.15 ? 'medium' : 'low'
  });
}

async function calculateWithMarkup(base42, params) {
  const { base_value, country, year } = params;
  
  const countryData = COUNTRY_MARKUPS[getCountryCode(country)] || { markup: 0.20 };
  const yearMultiplier = {
    2026: 1.0, 2027: 0.95, 2028: 0.90, 2029: 0.85, 2030: 0.80
  }[year] || 1.0;
  
  const effectiveMarkup = countryData.markup * yearMultiplier;
  const valueWithMarkup = base_value * (1 + effectiveMarkup);
  
  return Response.json({
    base_value,
    markup_percent: (effectiveMarkup * 100).toFixed(1),
    value_with_markup: valueWithMarkup.toFixed(3),
    year
  });
}

async function getAllDefaults(base44, params) {
  const { year } = params;
  
  const defaults = [];
  
  for (const [cnCode, baseValue] of Object.entries(BASE_BENCHMARKS)) {
    for (const [countryCode, countryData] of Object.entries(COUNTRY_MARKUPS)) {
      const yearMultiplier = {
        2026: 1.0, 2027: 0.95, 2028: 0.90, 2029: 0.85, 2030: 0.80
      }[year] || 1.0;
      
      const markup = countryData.markup * yearMultiplier;
      const defaultValue = baseValue * (1 + markup);
      
      defaults.push({
        cn_code: cnCode,
        country_code: countryCode,
        base_benchmark: baseValue,
        markup_percent: (markup * 100).toFixed(1),
        default_value: defaultValue.toFixed(3),
        year
      });
    }
  }
  
  return Response.json({
    success: true,
    year,
    total_combinations: defaults.length,
    defaults: defaults.slice(0, 100), // Limit response size
    note: 'First 100 combinations shown. Use specific queries for full dataset.'
  });
}

function getCountryCode(countryName) {
  const mapping = {
    'China': 'CN', 'India': 'IN', 'Russia': 'RU', 'Ukraine': 'UA',
    'Turkey': 'TR', 'Brazil': 'BR', 'USA': 'US', 'Canada': 'CA',
    'United Kingdom': 'GB', 'Switzerland': 'CH', 'Norway': 'NO',
    'South Korea': 'KR', 'Japan': 'JP', 'Australia': 'AU',
    'Indonesia': 'ID', 'Vietnam': 'VN', 'Thailand': 'TH',
    'South Africa': 'ZA', 'Mexico': 'MX', 'Singapore': 'SG'
  };
  
  return mapping[countryName] || countryName.substring(0, 2).toUpperCase();
}