import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * QUARANTINE PHANTOM EVIDENCE
 * Identifies and quarantines:
 * - origin = TEST_FIXTURE in LIVE (never should exist)
 * - missing retention_ends_at_utc (invalid retention)
 * - missing required metadata
 * - invalid sealed_at dates
 * 
 * In LIVE: quarantine (never delete)
 * In TEST/SANDBOX: can delete if --force flag
 */

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'POST only' }, { status: 405 });
  }

  const requestId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ ok: false, error: 'Admin only' }, { status: 403 });
    }

    const tenantId = req.headers.get('x-tenant-id') || user.tenant_id || 'DEFAULT';
    const { force_delete } = await req.json();

    // Get tenant data_mode
    const tenantRecords = await base44.asServiceRole.entities.Company.filter({ tenant_id: tenantId });
    const dataMode = tenantRecords?.[0]?.data_mode || 'LIVE';

    // Find all evidence
    const allEvidence = await base44.asServiceRole.entities.Evidence.filter({ tenant_id: tenantId });

    const phantomRecords = [];
    const reasons = {};

    for (const ev of allEvidence) {
      // Check if phantom (TEST_FIXTURE, missing retention, invalid state, etc.)
      const issues = [];

      if (ev.origin === 'TEST_FIXTURE') {
        issues.push('TEST_FIXTURE_ORIGIN');
      }

      if (!ev.retention_ends_at_utc || ev.retention_ends_at_utc === 'Invalid Date') {
        issues.push('INVALID_RETENTION_DATE');
      }

      if (!ev.payload_hash_sha256 || !ev.metadata_hash_sha256) {
        issues.push('MISSING_HASH');
      }

      if (!ev.created_by_user_id) {
        issues.push('MISSING_CREATOR');
      }

      if (issues.length > 0) {
        phantomRecords.push({
          evidence_id: ev.evidence_id,
          dataset_type: ev.dataset_type,
          origin: ev.origin,
          ledger_state: ev.ledger_state,
          issues
        });

        for (const issue of issues) {
          reasons[issue] = (reasons[issue] || 0) + 1;
        }
      }
    }

    // Process phantom records
    let quarantined = 0;
    let deleted = 0;
    const errors = [];

    for (const phantom of phantomRecords) {
      try {
        const record = (await base44.asServiceRole.entities.Evidence.filter({
          evidence_id: phantom.evidence_id,
          tenant_id: tenantId
        }))[0];

        if (!record) continue;

        if (dataMode === 'LIVE') {
          // Quarantine in LIVE (never delete)
          await base44.asServiceRole.entities.Evidence.update(record.id, {
            ledger_state: 'QUARANTINED',
            quarantine_reason: `Phantom: ${phantom.issues.join(', ')}`,
            quarantine_created_at_utc: now,
            quarantined_by: user.id
          });

          await base44.asServiceRole.entities.AuditEvent.create({
            audit_event_id: crypto.randomUUID(),
            tenant_id: tenantId,
            evidence_id: phantom.evidence_id,
            actor_user_id: user.id,
            action: 'QUARANTINED',
            details: `Auto-quarantine phantom: ${phantom.issues.join(', ')}`,
            created_at_utc: now
          });

          quarantined++;
        } else {
          // TEST/SANDBOX: can delete if forced
          if (force_delete) {
            await base44.asServiceRole.entities.Evidence.delete(record.id);

            await base44.asServiceRole.entities.AuditEvent.create({
              audit_event_id: crypto.randomUUID(),
              tenant_id: tenantId,
              evidence_id: phantom.evidence_id,
              actor_user_id: user.id,
              action: 'DELETED',
              details: `Phantom deleted: ${phantom.issues.join(', ')}`,
              created_at_utc: now
            });

            deleted++;
          } else {
            // Default: quarantine even in TEST
            await base44.asServiceRole.entities.Evidence.update(record.id, {
              ledger_state: 'QUARANTINED',
              quarantine_reason: `Phantom: ${phantom.issues.join(', ')}`,
              quarantine_created_at_utc: now,
              quarantined_by: user.id
            });

            quarantined++;
          }
        }
      } catch (error) {
        errors.push(`Failed to process ${phantom.evidence_id}: ${error.message}`);
      }
    }

    return Response.json({
      ok: true,
      request_id: requestId,
      mode: dataMode,
      total_phantom_found: phantomRecords.length,
      quarantined,
      deleted,
      reasons,
      errors,
      summary:
        dataMode === 'LIVE'
          ? `${quarantined} phantom records quarantined (LIVE: no hard delete)`
          : `${deleted || quarantined} phantom records processed (${deleted} deleted, ${quarantined} quarantined)`
    }, { status: 200 });

  } catch (error) {
    console.error('[QUARANTINE_PHANTOM]', error);
    return Response.json({
      ok: false,
      error: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});