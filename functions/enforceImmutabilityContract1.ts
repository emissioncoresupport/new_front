import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * IMMUTABILITY GATE — Block mutations on SEALED evidence
 * Interceptor for PUT/PATCH/DELETE on Evidence records
 * 
 * SEALED evidence can ONLY be superseded, never modified in-place
 */

Deno.serve(async (req) => {
  const { method, url } = req;
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only intercept mutations on Evidence records
    if (!url.includes('/Evidence/') || !['PUT', 'PATCH', 'DELETE'].includes(method)) {
      return Response.json({ passthrough: true }, { status: 200 });
    }

    // Extract evidence_id from URL
    const urlParts = url.split('/');
    const evidenceId = urlParts[urlParts.length - 1];

    if (!evidenceId) {
      return Response.json({ error: 'Invalid evidence ID' }, { status: 400 });
    }

    // Fetch evidence record
    const evidence = await base44.asServiceRole.entities.Evidence.get(evidenceId);

    if (!evidence) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // GATE: If ledger_state=SEALED, block mutation
    if (evidence.ledger_state === 'SEALED') {
      // Log audit event
      await base44.asServiceRole.entities.EvidenceAuditEvent.create({
        audit_event_id: crypto.randomUUID(),
        tenant_id: user.tenant_id,
        evidence_id: evidenceId,
        action: 'MUTATION_ATTEMPTED',
        actor_user_id: user.id,
        actor_email: user.email,
        actor_role: user.role,
        timestamp_utc: new Date().toISOString(),
        request_id: requestId,
        http_status: 409,
        contract_state: 'SEALED',
        context_json: {
          attempted_method: method,
          reason: 'Evidence is SEALED and immutable'
        }
      });

      return Response.json({
        error: 'Conflict: SEALED evidence is immutable',
        message: 'Supersede by creating new evidence record with supersedes_evidence_id reference',
        evidence_id: evidenceId,
        request_id: requestId
      }, { status: 409 });
    }

    // SEALED not violated; allow mutation
    return Response.json({ passthrough: true }, { status: 200 });

  } catch (error) {
    console.error('[IMMUTABILITY_GATE]', error);
    return Response.json({
      error: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});