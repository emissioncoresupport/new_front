import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * BULK IMPORT ADAPTER
 * 
 * Thin wrapper over universal ingestEvidence core.
 * Parses CSV/JSON bulk data, calls ingestEvidence for each record.
 * 
 * NO independent logic. Delegates to core.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profile_id, entity_context_id, bulk_payload, format } = await req.json();

    if (!profile_id || !entity_context_id || !bulk_payload) {
      return Response.json({
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'Missing required fields'
      }, { status: 400 });
    }

    const profile = await base44.asServiceRole.entities.IngestionProfile.get(profile_id);

    if (!profile) {
      return Response.json({
        success: false,
        error: 'PROFILE_NOT_FOUND'
      }, { status: 404 });
    }

    // Parse bulk data (CSV or JSON array)
    let records = [];
    if (format === 'csv' && typeof bulk_payload === 'string') {
      const lines = bulk_payload.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      records = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',');
          return headers.reduce((obj, header, i) => {
            obj[header] = values[i]?.trim();
            return obj;
          }, {});
        });
    } else if (Array.isArray(bulk_payload)) {
      records = bulk_payload;
    } else {
      records = [bulk_payload];
    }

    // CALL UNIVERSAL CORE FOR EACH RECORD
    const results = [];
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const commandId = `BULK-${profile_id}-${i}-${Date.now()}`;

      const response = await base44.functions.invoke('ingestEvidence', {
        tenant_id: profile.tenant_id,
        profile_id,
        entity_context_id,
        ingestion_path: 'BULK_IMPORT',
        authority_type: profile.authority_type,
        payload: record,
        actor_id: user.email,
        command_id: commandId
      });

      results.push({
        row: i + 1,
        command_id: commandId,
        success: response.data.success,
        evidence_id: response.data.evidence_id,
        error: response.data.error
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return Response.json({
      success: true,
      bulk_import: true,
      total_records: records.length,
      successful: successCount,
      failed: failureCount,
      results,
      message: `Ingested ${successCount}/${records.length} records`
    });

  } catch (error) {
    console.error('Bulk Import Error:', error);
    return Response.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    }, { status: 500 });
  }
});