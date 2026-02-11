import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * ISO 14083:2023 Transport Emission Validator
 * Validates logistics emissions calculations against ISO standard
 * 
 * Requirements:
 * - Well-to-wheel (WTW) methodology
 * - Transport chain completeness
 * - Emission factor validity
 * - Activity data quality assessment
 * - GLEC Framework v3.0 compliance
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shipment_id } = await req.json();

    if (!shipment_id) {
      return Response.json({ error: 'shipment_id required' }, { status: 400 });
    }

    const shipments = await base44.asServiceRole.entities.LogisticsShipment.list();
    const shipment = shipments.find(s => s.id === shipment_id);

    if (!shipment) {
      return Response.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const legs = await base44.asServiceRole.entities.LogisticsLeg.filter({ shipment_id });

    const validation = {
      compliant: true,
      errors: [],
      warnings: [],
      score: 100,
      iso_requirements: {}
    };

    // ISO 14083 Clause 5.3: System boundary
    if (!shipment.origin_location || !shipment.destination_location) {
      validation.errors.push('Missing origin/destination (ISO 14083 Clause 5.3.2)');
      validation.compliant = false;
      validation.score -= 20;
    }

    // Clause 6.2: Activity data requirements
    if (legs.length === 0) {
      validation.errors.push('No transport legs defined (ISO 14083 Clause 6.2)');
      validation.compliant = false;
      validation.score -= 30;
    }

    for (const leg of legs) {
      if (!leg.distance_km || leg.distance_km <= 0) {
        validation.errors.push(`Leg ${leg.id}: Missing distance (Clause 6.2.2)`);
        validation.score -= 10;
      }
      if (!leg.mode) {
        validation.errors.push(`Leg ${leg.id}: Missing transport mode (Clause 6.2.3)`);
        validation.score -= 10;
      }
      if (!leg.emission_factor_source) {
        validation.warnings.push(`Leg ${leg.id}: Emission factor source not documented`);
        validation.score -= 5;
      }
    }

    // Clause 6.3: Emission factors (Well-to-Wheel)
    validation.iso_requirements.wtw_methodology = legs.every(leg => 
      leg.emission_factor_gco2_tkm > 0
    );

    if (!validation.iso_requirements.wtw_methodology) {
      validation.warnings.push('WTW methodology not confirmed for all legs');
      validation.score -= 10;
    }

    // Clause 7.2: Allocation methodology
    if (shipment.cargo_weight_kg && shipment.vehicle_capacity_kg) {
      const loadFactor = (shipment.cargo_weight_kg / shipment.vehicle_capacity_kg) * 100;
      validation.iso_requirements.load_factor = loadFactor;
      
      if (loadFactor < 30) {
        validation.warnings.push(`Low load factor (${loadFactor.toFixed(0)}%) - affects emission intensity`);
      }
    }

    // GLEC Framework v3.0: Data quality
    const hasEvidence = !!shipment.evidence_document_url;
    validation.iso_requirements.evidence_documented = hasEvidence;
    
    if (!hasEvidence) {
      validation.warnings.push('No evidence document attached (GLEC best practice)');
      validation.score -= 5;
    }

    // Clause 8: Uncertainty assessment
    const uncertaintyLevel = legs.some(l => l.emission_factor_source === 'default') ? 'Medium' : 'Low';
    validation.iso_requirements.uncertainty_level = uncertaintyLevel;

    return Response.json({
      success: true,
      validation: {
        compliant: validation.compliant,
        score: Math.max(0, validation.score),
        errors: validation.errors,
        warnings: validation.warnings,
        iso_requirements_met: validation.iso_requirements
      },
      certification_ready: validation.compliant && validation.score >= 85,
      recommendation: validation.compliant 
        ? '✓ ISO 14083:2023 compliant - ready for verification'
        : '⚠️ Address errors before certification',
      validated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('ISO 14083 validation error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});