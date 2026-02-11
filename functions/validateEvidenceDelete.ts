import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { validateTenantContext, buildTenantFilteredQuery, assertTenantMatch } from './services/tenantContextMiddleware.js';

/**
 * Backend gatekeeper for Evidence delete operations.
 * 
 * ALWAYS REJECTS deletion.
 * Evidence is immutable and append-only.
 * Corrections require creation of NEW Evidence with supersession linkage.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { evidence_id, tenant_id } = await req.json();

    if (!evidence_id || !tenant_id) {
      return Response.json({ error: 'Missing evidence_id or tenant_id' }, { status: 400 });
    }

    // Validate explicit tenant context
    const validTenantId = await validateTenantContext(base44, tenant_id, user);

    // Fetch Evidence with explicit tenant filter
    const query = buildTenantFilteredQuery(validTenantId, { id: evidence_id });
    const evidence = await base44.asServiceRole.entities.Evidence.filter(query)
      .then(results => results[0]);

    if (!evidence) {
      return Response.json({ error: 'Evidence not found' }, { status: 404 });
    }

    // Assert tenant match
    assertTenantMatch(evidence, validTenantId);

    // Log attempted deletion
    const now = new Date().toISOString();
    await base44.entities.AuditLogEntry.create({
      tenant_id: user.id,
      event_type: 'EVIDENCE_DELETE_ATTEMPTED',
      resource_type: 'Evidence',
      resource_id: evidence_id,
      actor_email: user.email,
      actor_role: user.role,
      action_timestamp: now,
      details: `Delete attempt on Evidence: ${evidence.original_filename}`,
      status: 'FAILURE',
      error_message: 'Evidence deletion forbidden: immutable record'
    });

    // Always reject
    return Response.json(
      {
        error: 'Evidence deletion forbidden',
        reason: 'Evidence is immutable and append-only for regulatory compliance',
        alternative: 'Create new Evidence and link via parent_evidence_id/supersedes_evidence_ids'
      },
      { status: 403 }
    );
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});