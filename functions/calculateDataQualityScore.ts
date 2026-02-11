import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Calculates comprehensive data quality scores for suppliers, sites, parts, and SKUs
 * Scores based on: completeness, freshness, validation status, evidence availability
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_type, entity_id } = await req.json();

    let entity, score, dimensions;

    if (entity_type === 'supplier') {
      [entity] = await base44.entities.Supplier.filter({ id: entity_id });
      
      // Critical fields for suppliers
      const criticalFields = [
        'legal_name', 'country', 'vat_number', 'eori_number',
        'primary_contact_email', 'website', 'supplier_type'
      ];
      
      const completeness = criticalFields.filter(f => entity[f] && String(entity[f]).trim()).length / criticalFields.length * 100;
      
      // Check validation status
      const hasValidation = entity.vat_number && entity.eori_number ? 20 : 0;
      
      // Check evidence packs
      const evidencePacks = await base44.entities.EvidencePack.filter({
        entity_type: 'supplier',
        entity_id: entity_id
      });
      const evidenceScore = Math.min(evidencePacks.length * 10, 20);
      
      // Freshness (updated in last 90 days = full score)
      const daysSinceUpdate = (Date.now() - new Date(entity.updated_date).getTime()) / (1000 * 60 * 60 * 24);
      const freshnessScore = Math.max(0, 20 - (daysSinceUpdate / 90 * 20));
      
      score = Math.round(completeness * 0.4 + hasValidation + evidenceScore + freshnessScore);
      
      dimensions = {
        completeness: Math.round(completeness),
        validation: hasValidation,
        evidence: evidenceScore,
        freshness: Math.round(freshnessScore)
      };

    } else if (entity_type === 'site') {
      [entity] = await base44.entities.SupplierSite.filter({ id: entity_id });
      
      const criticalFields = ['site_name', 'country', 'city', 'address', 'facility_type'];
      const completeness = criticalFields.filter(f => entity[f]).length / criticalFields.length * 100;
      
      const hasCoordinates = entity.lat && entity.lon ? 30 : 0;
      const hasCertifications = entity.certifications?.length > 0 ? 20 : 0;
      
      score = Math.round(completeness * 0.5 + hasCoordinates + hasCertifications);
      
      dimensions = {
        completeness: Math.round(completeness),
        geolocation: hasCoordinates,
        certifications: hasCertifications
      };
    }

    // Store data quality score
    await base44.entities.DataQualityScore.create({
      tenant_id: user.company_id,
      entity_type,
      entity_id,
      overall_score: score,
      dimensions,
      calculated_at: new Date().toISOString(),
      calculated_by: 'system'
    });

    return Response.json({
      success: true,
      entity_type,
      entity_id,
      score,
      dimensions
    });

  } catch (error) {
    console.error('Calculate data quality score error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});