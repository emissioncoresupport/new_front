import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { suggestion_id, action } = await req.json();

    // Fetch suggestion
    const [suggestion] = await base44.entities.DataMappingSuggestion.filter({ id: suggestion_id });
    if (!suggestion) {
      return Response.json({ error: 'Mapping suggestion not found' }, { status: 404 });
    }

    let result = {};

    if (action === 'approve') {
      let mapping = null;
      
      // Create canonical mapping based on type with validity dates
      if (suggestion.mapping_type === 'supplier_part') {
        mapping = await base44.entities.SupplierPartMapping.create({
          tenant_id: user.company_id,
          supplier_id: suggestion.source_entity_id,
          part_id: suggestion.target_entity_id,
          relationship_type: 'manufacturer',
          is_primary_supplier: true,
          mapping_confidence: suggestion.confidence_score,
          source_system: 'ai_proposal',
          active: true,
          valid_from: new Date().toISOString(),
          approved_by: user.email,
          approved_at: new Date().toISOString()
        });

      } else if (suggestion.mapping_type === 'part_sku') {
        mapping = await base44.entities.SupplierSKUMapping.create({
          tenant_id: user.company_id,
          supplier_id: suggestion.source_entity_id,
          sku_id: suggestion.target_entity_id,
          relationship_type: 'manufacturer',
          mapping_confidence: suggestion.confidence_score,
          source_system: 'ai_proposal',
          active: true,
          valid_from: new Date().toISOString(),
          approved_by: user.email,
          approved_at: new Date().toISOString()
        });
      }

      // Create evidence pack for mapping approval
      const evidencePack = await base44.entities.EvidencePack.create({
        tenant_id: user.company_id,
        entity_type: 'mapping',
        entity_id: mapping.id,
        pack_type: 'mapping_approval',
        created_by: user.email,
        status: 'approved',
        decision_metadata: {
          mapping_type: suggestion.mapping_type,
          source_entity_id: suggestion.source_entity_id,
          target_entity_id: suggestion.target_entity_id,
          confidence_score: suggestion.confidence_score,
          evidence: suggestion.evidence
        }
      });

      // Create change log
      await base44.entities.ChangeLog.create({
        tenant_id: user.company_id,
        entity_type: 'mapping',
        entity_id: mapping.id,
        change_type: 'create',
        changed_by: user.email,
        new_data: {
          mapping_type: suggestion.mapping_type,
          source: suggestion.source_entity_name,
          target: suggestion.target_entity_name,
          confidence: suggestion.confidence_score
        },
        reason: `Mapping approved from AI proposal`,
        evidence_pack_id: evidencePack.id
      });

      // Publish event for downstream consumption
      await base44.entities.EventOutbox.create({
        tenant_id: user.company_id,
        event_type: 'mapping_approved',
        entity_type: 'mapping',
        entity_id: mapping.id,
        payload: {
          mapping_type: suggestion.mapping_type,
          source_entity_id: suggestion.source_entity_id,
          target_entity_id: suggestion.target_entity_id,
          valid_from: mapping.valid_from,
          evidence_pack_id: evidencePack.id
        },
        status: 'pending'
      });

      result = { mapping_id: mapping.id, evidence_pack_id: evidencePack.id };

      // Log approval
      await base44.entities.AuditLog.create({
        tenant_id: user.company_id,
        entity_type: 'mapping_approval',
        entity_id: suggestion_id,
        action: 'approved',
        user_email: user.email,
        changes: {
          mapping_type: suggestion.mapping_type,
          source: suggestion.source_entity_name,
          target: suggestion.target_entity_name,
          evidence_pack_id: evidencePack.id
        }
      });
    }

    // Update suggestion status
    await base44.entities.DataMappingSuggestion.update(suggestion_id, {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_by: user.email,
      reviewed_date: new Date().toISOString()
    });

    return Response.json({
      success: true,
      action,
      ...result
    });

  } catch (error) {
    console.error('Approve mapping suggestion error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});