import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * GET /supplylens/evidence
 * 
 * List evidence with filters for Evidence Vault
 * Supports filtering by state, dataset_type, source_system, declared_intent, sealed_at range
 * Enforces tenant isolation
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      }, { status: 401 });
    }

    const url = new URL(req.url);
    const tenantId = user.tenant_id || user.id;

    // Parse filter parameters
    const state = url.searchParams.get('state');
    const datasetType = url.searchParams.get('dataset_type');
    const sourceSystem = url.searchParams.get('source_system');
    const declaredIntent = url.searchParams.get('declared_intent');
    const sealedAfter = url.searchParams.get('sealed_after');
    const sealedBefore = url.searchParams.get('sealed_before');
    const search = url.searchParams.get('search');

    // Build filter object - start with tenant isolation
    const filter = {
      tenant_id: tenantId
    };

    // Add optional filters
    if (state) filter.state = state;
    if (datasetType) filter.dataset_type = datasetType;
    if (sourceSystem) filter.source_system = sourceSystem;
    if (declaredIntent) filter.declared_intent = declaredIntent;

    // Fetch evidence records
    let evidenceList = await base44.asServiceRole.entities.Evidence.filter(filter);

    // Client-side filtering for date ranges and search
    if (sealedAfter) {
      const afterDate = new Date(sealedAfter);
      evidenceList = evidenceList.filter(e => 
        e.sealed_at_utc && new Date(e.sealed_at_utc) >= afterDate
      );
    }

    if (sealedBefore) {
      const beforeDate = new Date(sealedBefore);
      evidenceList = evidenceList.filter(e => 
        e.sealed_at_utc && new Date(e.sealed_at_utc) <= beforeDate
      );
    }

    // Search across multiple fields
    if (search) {
      const searchLower = search.toLowerCase();
      evidenceList = evidenceList.filter(e =>
        (e.evidence_id && e.evidence_id.toLowerCase().includes(searchLower)) ||
        (e.dataset_type && e.dataset_type.toLowerCase().includes(searchLower)) ||
        (e.source_system && e.source_system.toLowerCase().includes(searchLower)) ||
        (e.declared_intent && e.declared_intent.toLowerCase().includes(searchLower)) ||
        (e.intent_details && e.intent_details.toLowerCase().includes(searchLower))
      );
    }

    // Sort by sealed_at_utc descending (most recent first)
    evidenceList.sort((a, b) => {
      if (!a.sealed_at_utc) return 1;
      if (!b.sealed_at_utc) return -1;
      return new Date(b.sealed_at_utc) - new Date(a.sealed_at_utc);
    });

    return Response.json({
      success: true,
      evidence: evidenceList,
      count: evidenceList.length,
      filters_applied: {
        tenant_id: tenantId,
        state,
        dataset_type: datasetType,
        source_system: sourceSystem,
        declared_intent: declaredIntent,
        sealed_after: sealedAfter,
        sealed_before: sealedBefore,
        search
      }
    });

  } catch (error) {
    console.error('[Evidence Vault List] Error:', error);
    return Response.json({
      error: 'Failed to list evidence',
      message: error.message
    }, { status: 500 });
  }
});