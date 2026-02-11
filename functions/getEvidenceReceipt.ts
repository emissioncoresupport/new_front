import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { record_id } = await req.json();

    if (!record_id) {
      return new Response(JSON.stringify({ error: 'Missing record_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch the sealed evidence record
    const record = await base44.entities.EvidenceRecord.get(record_id);

    if (!record) {
      return new Response(JSON.stringify({ error: 'Record not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extract receipt data from snapshot
    const snapshot = record.snapshot_json || {};

    return new Response(JSON.stringify({
      record_id: record.id,
      sealed_at_utc: record.sealed_at_utc,
      sealed_by_user_id: record.sealed_by_user_id,
      tenant_id: record.tenant_id,
      evidence_type: snapshot.evidence_type,
      payload_sha256: record.payload_sha256,
      metadata_sha256: record.metadata_sha256,
      combined_sha256: record.combined_sha256,
      binding_mode: snapshot.binding_mode,
      binding_status: record.reconciliation_status || 'UNBOUND',
      review_status: snapshot.review_status || 'NOT_REVIEWED'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[getEvidenceReceipt] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});