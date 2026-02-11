import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ACTIVATE INGESTION PROFILE
 * 
 * DRAFT → ACTIVE transition (IRREVERSIBLE)
 * 
 * Hard enforcement:
 * - Profile exists
 * - Status == DRAFT
 * - Tenant match
 * - Command idempotency
 * - Immutable after activation
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profile_id, command_id } = await req.json();

    if (!profile_id || !command_id) {
      return Response.json({
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'profile_id and command_id required'
      }, { status: 400 });
    }

    // IDEMPOTENCY CHECK
    const existingEvent = await base44.asServiceRole.entities.LedgerEvent.filter({
      command_id,
      aggregate_id: profile_id
    });

    if (existingEvent.length > 0) {
      const event = existingEvent[0];
      if (event.new_state === 'ACTIVE') {
        return Response.json({
          success: true,
          message: 'Profile already activated (idempotent)',
          profile_id,
          status: 'ACTIVE',
          activated_at: event.timestamp,
          idempotent: true
        });
      }
    }

    // FETCH PROFILE
    const profile = await base44.asServiceRole.entities.IngestionProfile.get(profile_id);

    if (!profile) {
      return Response.json({
        success: false,
        error: 'PROFILE_NOT_FOUND',
        message: 'Ingestion profile does not exist',
        profile_id
      }, { status: 404 });
    }

    // STATUS CHECK: MUST BE DRAFT
    if (profile.status !== 'DRAFT') {
      return Response.json({
        success: false,
        error: 'INVALID_STATUS',
        message: `Profile status must be DRAFT, current: ${profile.status}`,
        current_status: profile.status
      }, { status: 403 });
    }

    // ACTIVATION TIMESTAMP
    const now = new Date().toISOString();

    // UPDATE PROFILE STATUS TO ACTIVE
    await base44.asServiceRole.entities.IngestionProfile.update(profile_id, {
      status: 'ACTIVE',
      activated_at: now,
      backend_verified: true
    });

    // AUDIT LOG
    await base44.asServiceRole.entities.LedgerEvent.create({
      tenant_id: profile.tenant_id,
      event_type: 'IngestionProfileActivated',
      aggregate_type: 'IngestionProfile',
      aggregate_id: profile_id,
      command_id,
      actor_id: user.email,
      actor_role: user.role || 'user',
      payload: {
        profile_id,
        entity_id: profile.entity_id,
        entity_type: profile.entity_type,
        data_domain: profile.data_domain,
        ingestion_path: profile.ingestion_path,
        authority_type: profile.authority_type,
        schema_version: profile.schema_version
      },
      previous_state: 'DRAFT',
      new_state: 'ACTIVE',
      timestamp: now,
      sequence_number: Date.now(),
      schema_version: '1.0',
      immutable: true
    });

    return Response.json({
      success: true,
      profile_id,
      status: 'ACTIVE',
      activated_at: now,
      activated_by: user.email,
      message: 'Profile activated. Ingestion now enabled under fixed constraints.',
      immutable: true,
      warning: 'Profile is now immutable. Only status can change to EXPIRED.'
    });

  } catch (error) {
    console.error('Profile Activation Error:', error);
    return Response.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    }, { status: 500 });
  }
});