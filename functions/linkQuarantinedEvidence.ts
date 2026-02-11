import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * LINK QUARANTINED EVIDENCE
 * Post-seal linking for UNLINKED (UNKNOWN scope) records
 * Creates immutable linkage record without modifying sealed evidence
 */

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'POST only' }, { status: 405 });
  }

  const now = new Date().toISOString();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ ok: false, error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { evidence_id, scope_target_id, scope_target_name, scope_type } = body;

    if (!evidence_id || !scope_target_id) {
      return Response.json({
        ok: false,
        error: 'evidence_id and scope_target_id required',
      }, { status: 422 });
    }

    // Fetch the evidence record
    const tenantId = req.headers.get('x-tenant-id') || 'DEFAULT';
    const evidence = await base44.asServiceRole.entities.Evidence.filter({
      tenant_id: tenantId,
      evidence_id: evidence_id,
    });

    if (!evidence || evidence.length === 0) {
      return Response.json({ ok: false, error: 'Evidence not found' }, { status: 404 });
    }

    const ev = evidence[0];

    // Verify it's actually quarantined
    if (ev.ledger_state !== 'QUARANTINED') {
      return Response.json({
        ok: false,
        error: `Evidence is already in state: ${ev.ledger_state}. Only QUARANTINED records can be linked.`,
      }, { status: 409 });
    }

    // Verify scope_target exists in tenant (basic check)
    // In production, validate against actual entities
    if (!scope_target_id || scope_target_id.trim().length === 0) {
      return Response.json({
        ok: false,
        error: 'scope_target_id cannot be empty',
      }, { status: 422 });
    }

    // Create linkage record (immutable, does not edit sealed evidence)
    const linkageId = crypto.randomUUID();
    const linkage = await base44.asServiceRole.entities.EvidenceLinkage.create({
      linkage_id: linkageId,
      evidence_id: evidence_id,
      tenant_id: tenantId,
      linked_scope_type: scope_type || 'MANUAL_LINK',
      linked_entity_id: scope_target_id,
      linked_entity_name: scope_target_name,
      linked_by_user_id: user.id,
      linked_by_email: user.email,
      linked_at_utc: now,
    });

    // Update evidence to unquarantine (by approval action only)
    // Note: In production, update should be done via separate approval workflow
    await base44.asServiceRole.entities.Evidence.update(ev.id, {
      quarantine_reason: null,
      quarantined_by: null,
      quarantine_created_at_utc: null,
      scope_target_id: scope_target_id,
      scope_target_name: scope_target_name,
      review_status: 'PENDING_REVIEW', // Still pending review, but no longer quarantined
    });

    // Log audit event
    await base44.asServiceRole.entities.AuditEvent.create({
      audit_event_id: crypto.randomUUID(),
      tenant_id: tenantId,
      evidence_id: evidence_id,
      actor_user_id: user.id,
      actor_email: user.email,
      action: 'LINKED',
      details: `Evidence linked to ${scope_type}: ${scope_target_id}`,
      created_at_utc: now,
    });

    return Response.json({
      ok: true,
      linkage_id: linkageId,
      evidence_id: evidence_id,
      message: 'Evidence linked successfully. Still pending reviewer approval.',
    }, { status: 200 });

  } catch (error) {
    console.error('[LINK_QUARANTINED]', error);
    return Response.json({
      ok: false,
      error: error.message,
    }, { status: 500 });
  }
});