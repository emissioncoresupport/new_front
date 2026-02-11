import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CLEANUP TEST AND SEED DATA — Remove from production tenants only
 * Admin-only function to purge created_via=TEST_RUNNER or SEED from non-test tenants
 */

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const tenantId = user.tenant_id || user.id;
    const isDemoOrTestTenant = tenantId.includes('demo') || tenantId.includes('test');

    // Refuse to run on non-production tenants (safeguard)
    if (isDemoOrTestTenant) {
      return Response.json({
        error: 'Cleanup skipped: This is a non-production tenant',
        request_id: requestId
      }, { status: 400 });
    }

    // Get all evidence with TEST_RUNNER or SEED provenance
    const allEvidence = await base44.asServiceRole.entities.Evidence.filter({
      tenant_id: tenantId
    });

    const testOrSeedEvidence = allEvidence.filter(e => 
      ['TEST_RUNNER', 'SEED'].includes(e.created_via)
    );

    let deletedCount = 0;
    let failedCount = 0;

    for (const evidence of testOrSeedEvidence) {
      try {
        // Soft delete by marking status (do NOT physically delete)
        await base44.asServiceRole.entities.Evidence.update(evidence.id, {
          evidence_status: 'REJECTED',
          rejection_reason: 'CLEANUP_REMOVED_TEST_DATA',
          rejection_details: {
            removed_at_utc: new Date().toISOString(),
            original_created_via: evidence.created_via
          }
        });

        // Log cleanup audit event
        await base44.asServiceRole.entities.AuditEvent.create({
          audit_event_id: crypto.randomUUID(),
          tenant_id: tenantId,
          evidence_id: evidence.evidence_id,
          actor_user_id: user.id,
          actor_email: user.email,
          action: 'REJECTED',
          reason_code: 'CLEANUP_TEST_DATA',
          before_status: evidence.evidence_status,
          after_status: 'REJECTED',
          request_id: requestId,
          context_json: {
            created_via: evidence.created_via,
            cleanup_reason: 'Test/seed data removed from production',
            cleanup_timestamp: new Date().toISOString()
          },
          created_at_utc: new Date().toISOString()
        });

        deletedCount++;
      } catch (err) {
        console.error(`Failed to clean ${evidence.evidence_id}:`, err);
        failedCount++;
      }
    }

    return Response.json({
      success: true,
      test_or_seed_found: testOrSeedEvidence.length,
      cleaned_count: deletedCount,
      failed_count: failedCount,
      message: `Cleaned up ${deletedCount} test/seed records from production tenant`,
      request_id: requestId
    }, { status: 200 });

  } catch (error) {
    console.error('[CLEANUP_TEST_SEED_DATA]', error);
    return Response.json({
      success: false,
      error: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});