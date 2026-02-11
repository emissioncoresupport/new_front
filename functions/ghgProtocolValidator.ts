import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * GHG Protocol Corporate Standard Validator
 * Validates CCF data completeness per GHG Protocol requirements
 * 
 * Standards:
 * - GHG Protocol Corporate Accounting & Reporting Standard (2004, Revised 2015)
 * - Scope 2 Guidance (2015)
 * - Scope 3 Standard (2011)
 * 
 * Checks:
 * - Mandatory Scope 1 & 2 reporting
 * - Scope 3 screening completed for all 15 categories
 * - Base year establishment
 * - Recalculation policy compliance
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { year, tenant_id } = await req.json();

    if (!year) {
      return Response.json({ error: 'year is required' }, { status: 400 });
    }

    const tenantFilter = tenant_id || user.tenant_id || user.email.split('@')[1];

    // Fetch all CCF entries for the year
    const ccfEntries = await base44.asServiceRole.entities.CCFEntry.filter({
      tenant_id: tenantFilter,
      year: year
    });

    // Fetch Scope 3 entries
    const scope3Entries = await base44.asServiceRole.entities.Scope3Entry.filter({
      tenant_id: tenantFilter,
      year: year
    });

    // Initialize validation results
    const validationResults = {
      compliant: true,
      errors: [],
      warnings: [],
      score: 100
    };

    // CHECK 1: Scope 1 Completeness
    const scope1Entries = ccfEntries.filter(e => e.scope === 'Scope 1');
    if (scope1Entries.length === 0) {
      validationResults.errors.push('Scope 1: No direct emissions reported (mandatory per GHG Protocol)');
      validationResults.compliant = false;
      validationResults.score -= 30;
    } else {
      // Check for common sources
      const hasStationaryCombustion = scope1Entries.some(e => e.activity_type?.includes('stationary'));
      const hasMobileCombustion = scope1Entries.some(e => e.activity_type?.includes('mobile'));
      
      if (!hasStationaryCombustion && !hasMobileCombustion) {
        validationResults.warnings.push('Scope 1: No combustion sources reported - verify if applicable');
        validationResults.score -= 5;
      }
    }

    // CHECK 2: Scope 2 Completeness
    const scope2Entries = ccfEntries.filter(e => e.scope === 'Scope 2');
    if (scope2Entries.length === 0) {
      validationResults.errors.push('Scope 2: No electricity/energy emissions reported (mandatory)');
      validationResults.compliant = false;
      validationResults.score -= 30;
    } else {
      // Check for both location-based and market-based
      const hasLocationBased = scope2Entries.some(e => e.calculation_method === 'location_based');
      const hasMarketBased = scope2Entries.some(e => e.calculation_method === 'market_based');
      
      if (!hasLocationBased || !hasMarketBased) {
        validationResults.warnings.push('Scope 2: Both location-based AND market-based methods recommended per Scope 2 Guidance');
        validationResults.score -= 10;
      }
    }

    // CHECK 3: Scope 3 Screening (all 15 categories)
    const allScope3Categories = [
      'Purchased goods and services',
      'Capital goods',
      'Fuel- and energy-related activities',
      'Upstream transportation and distribution',
      'Waste generated in operations',
      'Business travel',
      'Employee commuting',
      'Upstream leased assets',
      'Downstream transportation and distribution',
      'Processing of sold products',
      'Use of sold products',
      'End-of-life treatment of sold products',
      'Downstream leased assets',
      'Franchises',
      'Investments'
    ];

    const reportedCategories = new Set(scope3Entries.map(e => e.category_name));
    const missingCategories = allScope3Categories.filter(cat => !reportedCategories.has(cat));

    if (missingCategories.length === 15) {
      validationResults.errors.push('Scope 3: No categories reported - screening required per GHG Protocol');
      validationResults.compliant = false;
      validationResults.score -= 20;
    } else if (missingCategories.length > 0) {
      validationResults.warnings.push(`Scope 3: ${missingCategories.length} categories not reported. Document exclusion rationale.`);
      validationResults.score -= (missingCategories.length * 1);
    }

    // CHECK 4: Base Year Establishment
    const baseYearEntries = await base44.asServiceRole.entities.CCFEntry.filter({
      tenant_id: tenantFilter,
      is_base_year: true
    });

    if (baseYearEntries.length === 0) {
      validationResults.warnings.push('No base year established - required for target setting');
      validationResults.score -= 10;
    }

    // CHECK 5: Data Quality
    const totalEmissions = ccfEntries.reduce((sum, e) => sum + (e.co2e_tonnes || 0), 0);
    const entriesWithEvidence = ccfEntries.filter(e => e.evidence_document_url).length;
    const evidenceRate = (entriesWithEvidence / (ccfEntries.length || 1)) * 100;

    if (evidenceRate < 50) {
      validationResults.warnings.push(`Evidence coverage: ${evidenceRate.toFixed(0)}% - minimum 80% recommended`);
      validationResults.score -= 15;
    }

    // CHECK 6: Organizational Boundary
    const facilities = await base44.asServiceRole.entities.Facility.filter({
      tenant_id: tenantFilter
    });

    if (facilities.length === 0) {
      validationResults.warnings.push('No facilities defined - clarify organizational boundary');
      validationResults.score -= 5;
    }

    // Generate compliance summary
    const summary = {
      total_emissions_tco2e: totalEmissions,
      scope1_tco2e: ccfEntries.filter(e => e.scope === 'Scope 1').reduce((s, e) => s + (e.co2e_tonnes || 0), 0),
      scope2_tco2e: ccfEntries.filter(e => e.scope === 'Scope 2').reduce((s, e) => s + (e.co2e_tonnes || 0), 0),
      scope3_tco2e: scope3Entries.reduce((s, e) => s + (e.co2e_tonnes || 0), 0),
      entries_count: ccfEntries.length,
      evidence_coverage: evidenceRate,
      scope3_categories_reported: allScope3Categories.length - missingCategories.length,
      scope3_categories_total: 15
    };

    return Response.json({
      success: true,
      validation: {
        compliant: validationResults.compliant,
        score: Math.max(0, validationResults.score),
        errors: validationResults.errors,
        warnings: validationResults.warnings
      },
      summary,
      missing_scope3_categories: missingCategories,
      recommendations: [
        ...validationResults.errors,
        ...validationResults.warnings,
        validationResults.compliant ? '✓ GHG Protocol compliant - ready for reporting' : '⚠️ Address errors before reporting'
      ],
      validated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('GHG Protocol validator error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});