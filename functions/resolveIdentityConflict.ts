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
    const [suggestion] = await base44.entities.DedupeSuggestion.filter({ id: suggestion_id });
    if (!suggestion) {
      return Response.json({ error: 'Suggestion not found' }, { status: 404 });
    }

    let result = {};

    if (action === 'merge') {
      // Merge source into target
      const mergedData = {
        ...suggestion.target_data,
        ...suggestion.source_data,
        // Keep target ID
      };

      if (suggestion.entity_type === 'supplier') {
        await base44.entities.Supplier.update(suggestion.target_entity_id, mergedData);
      } else if (suggestion.entity_type === 'material') {
        await base44.entities.MaterialSKU.update(suggestion.target_entity_id, mergedData);
      }

      // Create evidence pack for merge decision
      const evidencePack = await base44.entities.EvidencePack.create({
        tenant_id: user.company_id,
        entity_type: suggestion.entity_type,
        entity_id: suggestion.target_entity_id,
        pack_type: 'identity_merge',
        created_by: user.email,
        status: 'approved',
        decision_metadata: {
          action: 'merged',
          source_record_id: suggestion.source_record_id,
          target_entity_id: suggestion.target_entity_id,
          confidence_score: suggestion.confidence_score,
          matching_attributes: suggestion.matching_attributes
        }
      });

      // Link source documents to evidence pack
      const [sourceRecord] = await base44.entities.SourceRecord.filter({ id: suggestion.source_record_id });
      if (sourceRecord?.document_ids) {
        for (const docId of sourceRecord.document_ids) {
          await base44.entities.EvidenceItem.create({
            tenant_id: user.company_id,
            evidence_pack_id: evidencePack.id,
            item_type: 'source_document',
            reference_id: docId,
            description: 'Source document used for identity resolution'
          });
        }
      }

      // Log merge decision
      await base44.entities.MergeDecision.create({
        tenant_id: user.company_id,
        entity_type: suggestion.entity_type,
        source_record_id: suggestion.source_record_id,
        target_entity_id: suggestion.target_entity_id,
        action: 'merged',
        merged_data: mergedData,
        decided_by: user.email,
        decision_date: new Date().toISOString(),
        evidence_pack_id: evidencePack.id
      });

      // Create change log
      await base44.entities.ChangeLog.create({
        tenant_id: user.company_id,
        entity_type: suggestion.entity_type,
        entity_id: suggestion.target_entity_id,
        change_type: 'merge',
        changed_by: user.email,
        previous_data: suggestion.target_data,
        new_data: mergedData,
        reason: `Merged duplicate from source record ${suggestion.source_record_id}`,
        evidence_pack_id: evidencePack.id
      });

      // Mark source record as merged
      await base44.entities.SourceRecord.update(suggestion.source_record_id, {
        status: 'merged',
        canonical_entity_id: suggestion.target_entity_id
      });

      result = { merged_into: suggestion.target_entity_id };

    } else if (action === 'create_new') {
      // Create new canonical entity
      let newEntity = null;
      
      if (suggestion.entity_type === 'supplier') {
        newEntity = await base44.entities.Supplier.create({
          company_id: user.company_id,
          ...suggestion.source_data
        });
      } else if (suggestion.entity_type === 'material') {
        newEntity = await base44.entities.MaterialSKU.create({
          tenant_id: user.company_id,
          ...suggestion.source_data
        });
      }

      // Create evidence pack for new entity creation
      const evidencePack = await base44.entities.EvidencePack.create({
        tenant_id: user.company_id,
        entity_type: suggestion.entity_type,
        entity_id: newEntity.id,
        pack_type: 'entity_creation',
        created_by: user.email,
        status: 'approved',
        decision_metadata: {
          action: 'create_new',
          rejected_merge_with: suggestion.target_entity_id,
          source_record_id: suggestion.source_record_id
        }
      });

      // Create change log for new entity
      await base44.entities.ChangeLog.create({
        tenant_id: user.company_id,
        entity_type: suggestion.entity_type,
        entity_id: newEntity.id,
        change_type: 'create',
        changed_by: user.email,
        new_data: suggestion.source_data,
        reason: `New canonical entity created, rejected merge with ${suggestion.target_entity_id}`,
        evidence_pack_id: evidencePack.id
      });

      // Update source record
      await base44.entities.SourceRecord.update(suggestion.source_record_id, {
        status: 'canonical',
        canonical_entity_id: newEntity.id
      });

      result = { created_entity_id: newEntity.id, evidence_pack_id: evidencePack.id };
    }

    // Update suggestion status
    await base44.entities.DedupeSuggestion.update(suggestion_id, {
      status: action === 'reject' ? 'rejected' : 'approved',
      resolved_by: user.email,
      resolved_date: new Date().toISOString()
    });

    return Response.json({
      success: true,
      action,
      ...result
    });

  } catch (error) {
    console.error('Resolve identity conflict error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});