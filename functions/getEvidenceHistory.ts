/**
 * BACKEND EVIDENCE MUTATION ENGINE - EVENT HISTORY
 * 
 * Returns full event history for Evidence.
 * Append-only, immutable, audit-grade.
 * Supports deterministic replay.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ 
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Parse request
    const { evidence_id } = await req.json();
    
    if (!evidence_id) {
      return Response.json({ 
        error: 'evidence_id required'
      }, { status: 400 });
    }

    // Load Evidence to verify tenant access
    const evidenceList = await base44.entities.Evidence.filter({
      id: evidence_id
    });

    if (evidenceList.length === 0) {
      return Response.json({ 
        error: 'Evidence not found'
      }, { status: 404 });
    }

    const evidence = evidenceList[0];

    // Load event history (with tenant isolation via Evidence check above)
    const events = await base44.asServiceRole.entities.LedgerEvent.filter({
      aggregate_type: 'Evidence',
      aggregate_id: evidence_id,
      tenant_id: evidence.tenant_id
    }, 'sequence_number'); // Ordered by sequence

    // Return immutable event stream
    return Response.json({
      evidence_id,
      tenant_id: evidence.tenant_id,
      event_count: events.length,
      events: events.map(e => ({
        event_id: e.id,
        event_type: e.event_type,
        command_id: e.command_id,
        actor_id: e.actor_id,
        actor_role: e.actor_role,
        previous_state: e.previous_state,
        new_state: e.new_state,
        timestamp: e.timestamp,
        sequence_number: e.sequence_number,
        payload: e.payload,
        schema_version: e.schema_version
      }))
    });

  } catch (error) {
    console.error('Error loading evidence history:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});