import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { draft_id } = await req.json();
    if (!draft_id) return Response.json({ error: 'draft_id required' }, { status: 400 });

    const draft = await base44.entities.EvidenceDraft.get(draft_id);
    if (!draft) return Response.json({ error: 'Draft not found' }, { status: 404 });
    if (draft.status !== 'READY_FOR_SEAL') {
      return Response.json({ error: 'Draft must be validated first' }, { status: 400 });
    }

    const payloadStr = JSON.stringify(draft.payload_data_json || {});
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(payloadStr);
    const payloadHash = await crypto.subtle.digest('SHA-256', payloadBytes);
    const payloadSha256 = Array.from(new Uint8Array(payloadHash))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    const metadataStr = JSON.stringify({
      ingestion_method: draft.ingestion_method,
      evidence_type: draft.evidence_type,
      declared_scope: draft.declared_scope,
      source_system: draft.source_system
    });
    const metadataBytes = encoder.encode(metadataStr);
    const metadataHash = await crypto.subtle.digest('SHA-256', metadataBytes);
    const metadataSha256 = Array.from(new Uint8Array(metadataHash))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    const evidence = await base44.entities.EvidenceRecord.create({
      tenant_id: user.tenant_id || 'tenant_demo_dsv',
      evidence_draft_id: draft_id,
      sealed_at_utc: new Date().toISOString(),
      sealed_by_user_id: user.id,
      payload_sha256: payloadSha256,
      metadata_sha256: metadataSha256,
      combined_sha256: payloadSha256,
      snapshot_json: draft.payload_data_json || {},
      review_status: 'NOT_REVIEWED',
      trust_level: draft.trust_level || 'MEDIUM',
      binding_mode: draft.binding_mode,
      binding_target_type: draft.binding_target_type,
      bound_entity_id: draft.bound_entity_id,
      reconciliation_status: draft.bound_entity_id ? 'BOUND' : 'UNBOUND'
    });

    await base44.entities.EvidenceDraft.update(draft_id, { status: 'SEALED' });

    await base44.entities.AuditEvent.create({
      audit_event_id: crypto.randomUUID(),
      tenant_id: user.tenant_id || 'tenant_demo_dsv',
      evidence_id: evidence.id,
      actor_user_id: user.id,
      actor_email: user.email,
      actor_role: user.role || 'user',
      action: 'SEALED',
      previous_state: 'READY_FOR_SEAL',
      new_state: 'SEALED',
      context_json: { draft_id, payload_sha256: payloadSha256 },
      created_at_utc: new Date().toISOString(),
      details: `Evidence sealed from draft ${draft_id}`
    });

    if (!draft.bound_entity_id) {
      await base44.entities.WorkItem.create({
        work_item_id: `WI-MAP-${Date.now()}`,
        type: 'MAPPING',
        status: 'OPEN',
        priority: 'MEDIUM',
        evidence_id: evidence.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: ['mapping_required']
      });
    }

    return Response.json({ success: true, evidence_id: evidence.id });
  } catch (error) {
    console.error('Seal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});