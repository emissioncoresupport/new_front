import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sourceRecordId, action, mergeWithId, overrideData } = await req.json();

    const sourceRecord = await base44.asServiceRole.entities.SourceRecord.filter({ id: sourceRecordId });
    if (!sourceRecord || sourceRecord.length === 0) {
      return Response.json({ error: 'Source record not found' }, { status: 404 });
    }

    const record = sourceRecord[0];

    // APPROVE: Create canonical entity
    if (action === 'approve') {
      const entityData = overrideData || record.source_data;

      let canonicalId;
      if (record.entity_type === 'supplier') {
        const supplier = await base44.asServiceRole.entities.Supplier.create({
          company_id: user.company_id,
          ...entityData,
          source: record.source_system,
          onboarding_status: 'completed',
          tier: entityData.tier || 'tier_1',
          status: 'active'
        });
        canonicalId = supplier.id;
      } else if (record.entity_type === 'material') {
        const material = await base44.asServiceRole.entities.MaterialSKU.create({
          tenant_id: user.company_id,
          ...entityData,
          source: record.source_system,
          data_completeness: calculateCompleteness(entityData)
        });
        canonicalId = material.id;
      }

      await base44.asServiceRole.entities.SourceRecord.update(sourceRecordId, {
        canonical_entity_id: canonicalId,
        status: 'canonical',
        processed_at: new Date().toISOString(),
        processed_by: user.email
      });

      return Response.json({ 
        success: true, 
        canonicalId,
        message: 'Source record approved and canonical entity created'
      });
    }

    // REJECT: Mark as rejected
    if (action === 'reject') {
      await base44.asServiceRole.entities.SourceRecord.update(sourceRecordId, {
        status: 'rejected',
        processed_at: new Date().toISOString(),
        processed_by: user.email
      });

      return Response.json({ 
        success: true,
        message: 'Source record rejected'
      });
    }

    // MERGE: Link to existing canonical entity
    if (action === 'merge' && mergeWithId) {
      await base44.asServiceRole.entities.SourceRecord.update(sourceRecordId, {
        canonical_entity_id: mergeWithId,
        status: 'merged',
        processed_at: new Date().toISOString(),
        processed_by: user.email
      });

      return Response.json({ 
        success: true,
        message: 'Source record merged with existing entity'
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Process source record error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateCompleteness(data) {
  const requiredFields = ['material_name', 'internal_sku', 'supplier_name', 'category'];
  const optionalFields = ['cas_number', 'description', 'unit_of_measure', 'lead_time_days'];
  
  const totalFields = requiredFields.length + optionalFields.length;
  const filledFields = [...requiredFields, ...optionalFields].filter(f => data[f]).length;
  
  return Math.round((filledFields / totalFields) * 100);
}