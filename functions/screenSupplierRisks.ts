import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { supplier_name, country, manufacturing_countries, supplier_type, vat_number } = await req.json();

    const risk_checks = {
      sanctions_exposure: { passed: true, details: 'No immediate sanction matches', risk: 'low' },
      deforestation_risk: { passed: true, details: 'Manufacturing country assessment pending', risk: 'medium' },
      conflict_minerals: { passed: true, details: 'Non-conflict-prone sectors', risk: 'low' },
      labor_risk: { passed: true, details: 'Country risk: standard due diligence', risk: 'medium' }
    };

    const critical_countries = ['KP', 'IR', 'SY', 'CU', 'VE'];
    if (country && critical_countries.includes(country)) {
      risk_checks.sanctions_exposure = { passed: false, details: `Country ${country} has sanctions restrictions`, risk: 'critical' };
    }

    const high_deforestation = ['ID', 'MY', 'BR', 'CD', 'GA', 'MM'];
    if (manufacturing_countries && manufacturing_countries.some(c => high_deforestation.includes(c))) {
      risk_checks.deforestation_risk = { passed: false, details: 'High-risk deforestation country detected', risk: 'high' };
    }

    const conflict_sectors = ['mining', 'mineral', '3tg', 'cobalt', 'tungsten', 'tantalum'];
    if (supplier_type && conflict_sectors.some(s => supplier_type.toLowerCase().includes(s))) {
      risk_checks.conflict_minerals = { passed: false, details: 'Conflict minerals sector - enhanced due diligence required', risk: 'high' };
    }

    const high_labor_risk = ['BD', 'KH', 'MM', 'TJ', 'UZ'];
    if (country && high_labor_risk.includes(country)) {
      risk_checks.labor_risk = { passed: false, details: 'High labor risk country - CSDDD questionnaire required', risk: 'high' };
    }

    const all_passed = Object.values(risk_checks).every(c => c.passed);

    return Response.json({
      success: true,
      risk_checks,
      overall_risk_level: all_passed ? 'low' : 'high',
      recommendation: all_passed ? 'Proceed to mapping gate' : 'Additional verification required before gate',
      required_questionnaires: !all_passed ? ['Sanctions Declaration', 'CSDDD Human Rights', 'Conflict Minerals'] : [],
      audit_trail: {
        checked_at: new Date().toISOString(),
        checked_by_user: user.email,
        supplier_name,
        country
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});