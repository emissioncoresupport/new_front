import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Automated Risk Tier Classifier
 * Classifies suppliers into risk tiers based on comprehensive scoring
 * Determines due diligence depth requirements per CSDDD
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { supplier_id } = await req.json();

    const supplier = await base44.entities.Supplier.filter({ id: supplier_id });
    if (!supplier || supplier.length === 0) {
      return Response.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const s = supplier[0];
    let score = 0;
    const factors = [];

    // 1. Financial Risk (20 points)
    if (s.credit_rating) {
      const creditScore = {
        'AAA': 20, 'AA': 18, 'A': 15, 'BBB': 12, 'BB': 8, 'B': 5, 'CCC': 3, 'CC': 1, 'C': 0, 'D': 0
      };
      score += creditScore[s.credit_rating] || 10;
      factors.push(`Credit Rating: ${s.credit_rating}`);
    } else {
      score += 5; // Unknown credit
      factors.push('Credit Rating: Unknown (moderate risk)');
    }

    // 2. Geographic Risk (15 points)
    const highRiskCountries = ['CN', 'RU', 'BY', 'MM', 'KP', 'IR', 'SY', 'VE'];
    const mediumRiskCountries = ['IN', 'BR', 'ID', 'VN', 'TH', 'MX', 'TR'];
    
    if (highRiskCountries.includes(s.country)) {
      score += 0;
      factors.push(`High-risk country: ${s.country}`);
    } else if (mediumRiskCountries.includes(s.country)) {
      score += 8;
      factors.push(`Medium-risk country: ${s.country}`);
    } else {
      score += 15;
      factors.push(`Low-risk country: ${s.country}`);
    }

    // 3. Compliance & Certifications (20 points)
    let certScore = 0;
    if (s.certifications && s.certifications.length > 0) {
      certScore = Math.min(20, s.certifications.length * 3);
      factors.push(`${s.certifications.length} certifications`);
    } else {
      factors.push('No certifications on file');
    }
    score += certScore;

    // 4. CSDDD Human Rights DD (15 points)
    if (s.csddd_human_rights_dd) {
      const hr = s.csddd_human_rights_dd;
      let hrScore = 0;
      if (hr.has_hr_policy) hrScore += 2;
      if (hr.child_labor_prevention) hrScore += 2;
      if (hr.forced_labor_prevention) hrScore += 2;
      if (hr.living_wage_commitment) hrScore += 2;
      if (hr.modern_slavery_statement) hrScore += 2;
      if (hr.grievance_mechanism) hrScore += 2;
      if (hr.last_social_audit_date) hrScore += 3;
      score += hrScore;
      factors.push(`Human Rights DD Score: ${hrScore}/15`);
    } else {
      factors.push('No Human Rights DD data');
    }

    // 5. Environmental DD (10 points)
    if (s.csddd_environmental_dd) {
      const env = s.csddd_environmental_dd;
      let envScore = 0;
      if (env.has_ems) envScore += 3;
      if (env.water_management) envScore += 1;
      if (env.waste_management) envScore += 1;
      if (env.chemical_management) envScore += 2;
      if (env.biodiversity_protection) envScore += 1;
      if (env.deforestation_prevention) envScore += 2;
      score += envScore;
      factors.push(`Environmental DD Score: ${envScore}/10`);
    } else {
      factors.push('No Environmental DD data');
    }

    // 6. Carbon Performance (10 points)
    if (s.carbon_performance) {
      let carbonScore = 0;
      if (s.carbon_performance.has_sbti_target) carbonScore += 5;
      if (s.carbon_performance.net_zero_commitment) carbonScore += 3;
      if (s.carbon_performance.renewable_energy_percentage > 50) carbonScore += 2;
      score += carbonScore;
      factors.push(`Carbon Performance: ${carbonScore}/10`);
    } else {
      factors.push('No carbon performance data');
    }

    // 7. Ethics & Anti-Corruption (10 points)
    if (s.ethics_compliance) {
      let ethicsScore = 0;
      if (s.ethics_compliance.has_code_of_conduct) ethicsScore += 2;
      if (s.ethics_compliance.anti_corruption_policy) ethicsScore += 3;
      if (s.ethics_compliance.sanctions_screened && !s.ethics_compliance.sanctions_match) ethicsScore += 5;
      score += ethicsScore;
      factors.push(`Ethics Compliance: ${ethicsScore}/10`);
    } else {
      factors.push('No ethics compliance data');
    }

    // Determine Risk Tier
    let riskTier, riskLevel, ddDepth, reassessmentMonths;
    
    if (score >= 80) {
      riskTier = 'approved';
      riskLevel = 'low';
      ddDepth = 'basic';
      reassessmentMonths = 24;
    } else if (score >= 60) {
      riskTier = 'preferred';
      riskLevel = 'medium';
      ddDepth = 'standard';
      reassessmentMonths = 12;
    } else if (score >= 40) {
      riskTier = 'strategic';
      riskLevel = 'high';
      ddDepth = 'enhanced';
      reassessmentMonths = 6;
    } else {
      riskTier = 'critical';
      riskLevel = 'critical';
      ddDepth = 'comprehensive';
      reassessmentMonths = 3;
    }

    // Update supplier with classification
    await base44.entities.Supplier.update(supplier_id, {
      risk_tier: riskTier,
      risk_level: riskLevel,
      risk_score: Math.round(score),
      'continuous_monitoring.reassessment_frequency_months': reassessmentMonths,
      'continuous_monitoring.next_reassessment_date': new Date(
        Date.now() + reassessmentMonths * 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      last_assessment_date: new Date().toISOString()
    });

    // Create audit log
    await base44.entities.AuditLog.create({
      tenant_id: user.company_id,
      object_type: 'Supplier',
      object_id: supplier_id,
      action: 'risk_tier_classified',
      severity: riskLevel === 'critical' ? 'high' : riskLevel === 'high' ? 'medium' : 'low',
      details: {
        risk_tier: riskTier,
        risk_score: Math.round(score),
        factors,
        dd_depth: ddDepth
      },
      performed_by: user.email
    });

    return Response.json({
      success: true,
      risk_tier: riskTier,
      risk_level: riskLevel,
      risk_score: Math.round(score),
      dd_depth: ddDepth,
      reassessment_months: reassessmentMonths,
      factors,
      next_steps: getNextSteps(riskTier, s)
    });

  } catch (error) {
    console.error('Risk classification error:', error);
    return Response.json({ 
      error: 'Risk classification failed', 
      details: error.message 
    }, { status: 500 });
  }
});

function getNextSteps(riskTier, supplier) {
  const steps = [];
  
  if (riskTier === 'critical') {
    steps.push('⚠️ MANDATORY: Conduct comprehensive on-site audit within 30 days');
    steps.push('⚠️ MANDATORY: Complete CSDDD human rights due diligence');
    steps.push('⚠️ Obtain executive approval before activation');
    if (!supplier.ethics_compliance?.sanctions_screened) {
      steps.push('⚠️ CRITICAL: Complete sanctions screening immediately');
    }
  }
  
  if (riskTier === 'strategic') {
    steps.push('📋 Conduct enhanced due diligence review');
    steps.push('📋 Request social audit report (SMETA/SA8000)');
    steps.push('📋 Verify conflict minerals declaration');
  }
  
  if (!supplier.carbon_performance?.scope1_emissions_tco2e) {
    steps.push('🌱 Request carbon footprint disclosure (Scope 1, 2, 3)');
  }
  
  if (!supplier.reach_compliance?.svhc_declaration_current) {
    steps.push('🧪 Request REACH SVHC declaration');
  }
  
  if (!supplier.certifications || supplier.certifications.length === 0) {
    steps.push('📜 Upload quality & compliance certificates');
  }
  
  return steps;
}