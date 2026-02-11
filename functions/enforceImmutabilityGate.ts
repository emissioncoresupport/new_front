import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * IMMUTABILITY GATE — Block mutations on SEALED evidence
 * 
 * Return 409 Conflict if attempting to UPDATE/DELETE SEALED records
 * Cross-tenant returns 404 (prevent enumeration)
 */

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { evidence_id, operation } = body;

    if (!evidence_id || !['UPDATE', 'DELETE'].includes(operation)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Fetch evidence (may not exist or belong to different tenant)
    let evidence;
    try {
      evidence = await base44.asServiceRole.entities.Evidence.get(evidence_id);
    } catch {
      evidence = null;
    }

    // Cross-tenant check: return 404 to prevent enumeration
    if (!evidence || evidence.tenant_id !== user.tenant_id) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // SEALED check: return 409
    if (evidence.ledger_state === 'SEALED') {
      // Log mutation attempt
      await base44.asServiceRole.entities.AuditEvent.create({
        audit_event_id: crypto.randomUUID(),
        tenant_id: user.tenant_id,
        evidence_id: evidence_id,
        actor_user_id: user.id,
        actor_email: user.email,
        actor_role: user.role,
        action: 'MUTATION_ATTEMPTED',
        request_id: requestId,
        context_json: {
          attempted_operation: operation,
          reason: 'Record is SEALED and immutable',
          ledger_state: 'SEALED'
        },
        created_at_utc: new Date().toISOString(),
        http_status: 409
      });

      return Response.json({
        error: 'Conflict: SEALED evidence is immutable',
        evidence_id,
        ledger_state: 'SEALED',
        message: 'Supersede by creating new evidence with supersedes_evidence_id reference',
        request_id: requestId
      }, { status: 409 });
    }

    // Allow mutation for non-SEALED records
    return Response.json({ passthrough: true }, { status: 200 });

  } catch (error) {
    console.error('[IMMUTABILITY_GATE]', error);
    return Response.json({
      error: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});