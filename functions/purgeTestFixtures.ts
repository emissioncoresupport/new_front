import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PURGE TEST FIXTURES
 * In SANDBOX/TEST: hard-delete all origin=TEST_FIXTURE
 * In LIVE: quarantine instead (never hard-delete)
 */

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error_code: 'METHOD_NOT_ALLOWED' }, { status: 405 });
  }

  const requestId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ ok: false, error_code: 'FORBIDDEN', message: 'Admin only' }, { status: 403 });
    }

    const tenantId = req.headers.get('x-tenant-id') || user.tenant_id || 'DEFAULT';

    // Get tenant data_mode
    const tenantRecords = await base44.asServiceRole.entities.Company.filter({ tenant_id: tenantId });
    const dataMode = tenantRecords?.[0]?.data_mode || 'LIVE';

    // Find all TEST_FIXTURE records for this tenant
    const fixtures = await base44.asServiceRole.entities.Evidence.filter({
      tenant_id: tenantId,
      origin: 'TEST_FIXTURE'
    });

    let result = { deleted: 0, quarantined: 0, errors: [] };

    if (dataMode === 'LIVE') {
      // LIVE: quarantine instead of delete
      for (const fixture of fixtures) {
        try {
          await base44.asServiceRole.entities.Evidence.update(fixture.id, {
            ledger_state: 'QUARANTINED',
            quarantine_reason: 'TEST_FIXTURE created in LIVE (cleanup action)',
            quarantine_created_at_utc: now
          });

          await base44.asServiceRole.entities.AuditEvent.create({
            audit_event_id: crypto.randomUUID(),
            tenant_id: tenantId,
            evidence_id: fixture.evidence_id,
            actor_user_id: user.id,
            action: 'QUARANTINED',
            details: 'TEST_FIXTURE quarantined in LIVE mode',
            created_at_utc: now
          });

          result.quarantined++;
        } catch (error) {
          result.errors.push(`Failed to quarantine ${fixture.evidence_id}: ${error.message}`);
        }
      }
    } else {
      // SANDBOX/TEST: hard-delete
      for (const fixture of fixtures) {
        try {
          await base44.asServiceRole.entities.Evidence.delete(fixture.id);

          await base44.asServiceRole.entities.AuditEvent.create({
            audit_event_id: crypto.randomUUID(),
            tenant_id: tenantId,
            evidence_id: fixture.evidence_id,
            actor_user_id: user.id,
            action: 'DELETED',
            details: `TEST_FIXTURE deleted in ${dataMode} mode`,
            created_at_utc: now
          });

          result.deleted++;
        } catch (error) {
          result.errors.push(`Failed to delete ${fixture.evidence_id}: ${error.message}`);
        }
      }
    }

    return Response.json({
      ok: true,
      request_id: requestId,
      data_mode: dataMode,
      result,
      summary: dataMode === 'LIVE'
        ? `${result.quarantined} TEST_FIXTURE records quarantined (LIVE mode: no hard delete)`
        : `${result.deleted} TEST_FIXTURE records deleted (${dataMode} mode)`
    }, { status: 200 });

  } catch (error) {
    console.error('[PURGE_FIXTURES]', error);
    return Response.json({ ok: false, error_code: 'INTERNAL_ERROR', message: error.message }, { status: 500 });
  }
});