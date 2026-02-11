import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Tracks provenance for every field value in canonical entities
 * Records source, extraction method, confidence, and approver for audit purposes
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_type, entity_id, field_name, field_value, source_metadata } = await req.json();

    // Create field provenance record
    const provenance = await base44.entities.FieldProvenance.create({
      tenant_id: user.company_id,
      entity_type,
      entity_id,
      field_name,
      field_value: String(field_value),
      source_type: source_metadata.source_type, // 'manual', 'ai_extracted', 'erp_sync', 'api'
      source_record_id: source_metadata.source_record_id,
      source_document_id: source_metadata.source_document_id,
      extraction_method: source_metadata.extraction_method, // 'ai', 'rule_based', 'manual'
      confidence_score: source_metadata.confidence_score || 100,
      approved_by: user.email,
      approved_at: new Date().toISOString(),
      evidence_pack_id: source_metadata.evidence_pack_id
    });

    return Response.json({
      success: true,
      provenance_id: provenance.id,
      message: 'Field provenance tracked'
    });

  } catch (error) {
    console.error('Track field provenance error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});