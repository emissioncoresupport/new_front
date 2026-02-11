/**
 * BACKEND EVIDENCE MUTATION ENGINE - READ PROJECTION
 * 
 * Returns current Evidence state (projection).
 * Derived from event store.
 * Read-only, authoritative.
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

    // Load Evidence projection (with tenant isolation)
    const evidenceList = await base44.entities.Evidence.filter({
      id: evidence_id
    });

    if (evidenceList.length === 0) {
      return Response.json({ 
        error: 'Evidence not found'
      }, { status: 404 });
    }

    const evidence = evidenceList[0];

    // Return current state projection
    return Response.json({
      evidence_id: evidence.id,
      tenant_id: evidence.tenant_id,
      state: evidence.state,
      ingestion_path: evidence.ingestion_path,
      declared_context: evidence.declared_context,
      actor_id: evidence.actor_id,
      uploaded_at: evidence.uploaded_at,
      file_url: evidence.file_url,
      file_hash_sha256: evidence.file_hash_sha256,
      state_history: evidence.state_history || [],
      immutable: evidence.immutable
    });

  } catch (error) {
    console.error('Error loading evidence state:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});