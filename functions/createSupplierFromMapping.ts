import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

const crypto = {
  createHash: createHash
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { evidence_id, mapping_decision_id, entity_type } = body;

    if (!evidence_id || !mapping_decision_id || !entity_type) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch evidence
    const evidenceList = await base44.entities.Evidence.list();
    const evidence = (evidenceList || []).find(e => e.id === evidence_id);

    if (!evidence || evidence.state !== 'STRUCTURED') {
      return Response.json(
        { error: 'Evidence not found or not STRUCTURED' },
        { status: 400 }
      );
    }

    // Fetch mapping decision
    const mappingList = await base44.entities.MappingDecision.list();
    const mapping = (mappingList || []).find(m => m.id === mapping_decision_id);

    if (!mapping || mapping.status !== 'APPROVED') {
      return Response.json(
        { error: 'Mapping decision not found or not APPROVED' },
        { status: 400 }
      );
    }

    let createdEntity = null;

    if (entity_type === 'SUPPLIER') {
      const supplierData = {
        tenant_id: user.company_id || 'default',
        legal_name: evidence.structured_data?.supplier_name,
        country: evidence.structured_data?.country,
        vat_number: evidence.structured_data?.vat_number,
        eori_number: evidence.structured_data?.eori,
        primary_contact_email: evidence.structured_data?.contact_email,
        status: 'pending_review',
        validation_status: 'verified'
      };

      createdEntity = await base44.entities.Supplier.create(supplierData);
    }

    // Update mapping with entity_id
    await base44.entities.MappingDecision.update(mapping_decision_id, {
      entity_id: createdEntity.id,
      approved_by: user.email,
      approved_at: new Date().toISOString()
    });

    // Create audit log
    await base44.entities.AuditLogEntry.create({
      tenant_id: user.company_id || 'default',
      resource_type: 'Supplier',
      resource_id: createdEntity.id,
      action: 'SUPPLIER_CREATED_FROM_EVIDENCE',
      actor_email: user.email,
      action_timestamp: new Date().toISOString(),
      changes: { created_from_evidence_id: evidence_id },
      evidence_hash: evidence.file_hash_sha256,
      mapping_decision_id: mapping_decision_id,
      status: 'SUCCESS',
      hash_sha256: crypto.createHash('sha256').update(JSON.stringify({
        action: 'SUPPLIER_CREATED_FROM_EVIDENCE',
        entity_id: createdEntity.id,
        evidence_id,
        timestamp: new Date().toISOString()
      })).digest('hex')
    });

    return Response.json({
      success: true,
      supplier_id: createdEntity.id,
      supplier_name: createdEntity.legal_name,
      country: createdEntity.country
    });
  } catch (error) {
    console.error('createSupplierFromMapping error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});