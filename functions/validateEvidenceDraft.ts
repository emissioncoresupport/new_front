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

    const validationErrors = [];
    if (!draft.purpose_explanation || draft.purpose_explanation.length < 20) {
      validationErrors.push('Purpose explanation must be at least 20 characters');
    }
    if (!draft.evidence_type) validationErrors.push('Evidence type required');
    if (!draft.declared_scope) validationErrors.push('Declared scope required');
    
    const isPassed = validationErrors.length === 0;
    const newStatus = isPassed ? 'READY_FOR_SEAL' : 'DRAFT';
    
    await base44.entities.EvidenceDraft.update(draft_id, {
      status: newStatus,
      review_status: isPassed ? 'APPROVED' : 'REJECTED'
    });

    await base44.entities.AuditEvent.create({
      audit_event_id: crypto.randomUUID(),
      tenant_id: user.tenant_id || 'tenant_demo_dsv',
      evidence_id: draft_id,
      actor_user_id: user.id,
      actor_email: user.email,
      actor_role: user.role || 'user',
      action: isPassed ? 'SEALED' : 'VALIDATION_FAILED',
      new_state: newStatus,
      context_json: { validationErrors },
      created_at_utc: new Date().toISOString(),
      details: isPassed ? 'Validation passed' : `Validation failed: ${validationErrors.join(', ')}`
    });

    if (!isPassed) {
      const workItems = await base44.entities.WorkItem.filter({ evidence_id: draft_id });
      if (workItems.length === 0) {
        await base44.entities.WorkItem.create({
          work_item_id: `WI-VAL-${Date.now()}`,
          type: 'REVIEW',
          status: 'OPEN',
          priority: 'HIGH',
          evidence_id: draft_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: ['validation_failed']
        });
      }
    }

    return Response.json({ success: true, status: newStatus, errors: validationErrors });
  } catch (error) {
    console.error('Validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});