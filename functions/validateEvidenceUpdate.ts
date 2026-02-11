import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { validateTenantContext, buildTenantFilteredQuery, assertTenantMatch } from './services/tenantContextMiddleware.js';

/**
 * Backend gatekeeper for Evidence updates.
 * ONLY allows updates to safe fields:
 * - declared_scope
 * - fields_declared (structured_payload)
 * - rejection_reason
 * 
 * ALL other fields are immutable and rejected.
 * file_url, file_hash_sha256, file_hash_sha512, uploaded_at, hashed_at, tenant_id CANNOT be modified.
 */

const ALLOWED_UPDATE_FIELDS = [
  'declared_scope',
  'fields_declared',
  'rejection_reason',
  'classification_notes',
  'extracted_fields'
];

const IMMUTABLE_FIELDS = [
  'file_url',
  'file_hash_sha256',
  'file_hash_sha512',
  'uploaded_at',
  'hashed_at',
  'tenant_id',
  'created_by',
  'ingestion_channel_id',
  'source_type'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { evidence_id, updates, tenant_id } = await req.json();

    if (!evidence_id || !updates || typeof updates !== 'object' || !tenant_id) {
      return Response.json(
        { error: 'Missing evidence_id, updates, or tenant_id' },
        { status: 400 }
      );
    }

    // Validate explicit tenant context
    const validTenantId = await validateTenantContext(base44, tenant_id, user);

    // Fetch current Evidence with explicit tenant filter
    const query = buildTenantFilteredQuery(validTenantId, { id: evidence_id });
    const evidence = await base44.asServiceRole.entities.Evidence.filter(query)
      .then(results => results[0]);

    if (!evidence) {
      return Response.json({ error: 'Evidence not found' }, { status: 404 });
    }

    // Assert tenant match
    assertTenantMatch(evidence, validTenantId);

    // Check for attempts to modify immutable fields
    for (const field of Object.keys(updates)) {
      if (IMMUTABLE_FIELDS.includes(field)) {
        return Response.json(
          {
            error: 'Immutability violation',
            field,
            reason: `${field} is immutable after Evidence creation. Create new Evidence to supersede.`,
            allowed_fields: ALLOWED_UPDATE_FIELDS
          },
          { status: 403 }
        );
      }
    }

    // Only allow whitelisted fields
    const sanitized_updates = {};
    for (const field of Object.keys(updates)) {
      if (ALLOWED_UPDATE_FIELDS.includes(field)) {
        sanitized_updates[field] = updates[field];
      } else {
        return Response.json(
          {
            error: 'Forbidden field update',
            field,
            reason: `${field} cannot be updated`,
            allowed_fields: ALLOWED_UPDATE_FIELDS
          },
          { status: 403 }
        );
      }
    }

    // Apply safe updates
    const now = new Date().toISOString();
    await base44.entities.Evidence.update(evidence_id, sanitized_updates);

    // Log audit event
    await base44.entities.AuditLogEntry.create({
      tenant_id: user.id,
      event_type: 'EVIDENCE_UPDATED',
      resource_type: 'Evidence',
      resource_id: evidence_id,
      actor_email: user.email,
      actor_role: user.role,
      action_timestamp: now,
      changes: sanitized_updates,
      details: `Evidence updated with fields: ${Object.keys(sanitized_updates).join(', ')}`,
      status: 'SUCCESS'
    });

    return Response.json({
      success: true,
      evidence_id,
      updated_fields: Object.keys(sanitized_updates),
      timestamp: now
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});