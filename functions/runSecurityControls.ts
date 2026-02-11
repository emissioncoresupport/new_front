import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CONTRACT 1 — Security Controls Verification
 * 
 * Runs automated tests to VERIFY security controls are active, not just claimed.
 * Results are computed, not marketing statements.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const tenantId = user.tenant_id;
    const testResults = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    // TEST 1: Audit Logging
    // ACTIVE only if sealed_count >= 1 AND audit_event_count >= sealed_count
    const allEvidence = await base44.asServiceRole.entities.Evidence.filter({ tenant_id: tenantId });
    const sealedEvidence = allEvidence.filter(e => e.state === 'SEALED');
    const auditEvents = await base44.asServiceRole.entities.EvidenceAuditEvent.filter({ tenant_id: tenantId });
    
    const auditLoggingActive = sealedEvidence.length >= 1 && auditEvents.length >= sealedEvidence.length;
    testResults.tests.push({
      control: 'Audit Logging',
      status: auditLoggingActive ? 'VERIFIED' : 'UNVERIFIED',
      condition: `sealed_count (${sealedEvidence.length}) >= 1 AND audit_events (${auditEvents.length}) >= sealed_count`,
      passed: auditLoggingActive
    });

    // TEST 2: Immutability
    // ACTIVE only if attempt to update/delete SEALED record returns 409/405
    let immutabilityActive = false;
    let immutabilityError = null;

    if (sealedEvidence.length > 0) {
      const testRecord = sealedEvidence[0];
      try {
        // Attempt to update SEALED record
        await base44.asServiceRole.entities.Evidence.update(testRecord.id, {
          state: 'CLASSIFIED' // Try to change state
        });
        // If we got here, update succeeded - immutability NOT enforced
        immutabilityError = 'Update succeeded (expected 409/405 error)';
      } catch (error) {
        // Check if error is 409 (Conflict) or 405 (Method Not Allowed)
        if (error.status === 409 || error.status === 405 || error.message.includes('409') || error.message.includes('405') || error.message.includes('locked') || error.message.includes('sealed')) {
          immutabilityActive = true;
        } else {
          immutabilityError = `Unexpected error: ${error.status} ${error.message}`;
        }
      }
    } else {
      immutabilityError = 'No SEALED records to test';
    }

    testResults.tests.push({
      control: 'Immutability (SEALED records)',
      status: immutabilityActive ? 'VERIFIED' : 'UNVERIFIED',
      condition: 'Attempt to update SEALED record returns 409/405 error',
      passed: immutabilityActive,
      details: immutabilityError || 'Update correctly rejected with 409'
    });

    // TEST 3: Tenant Isolation
    // ACTIVE only if cross-tenant read returns NOT_FOUND
    // For this test, we'll try to read a record with a different tenant_id
    let tenantIsolationActive = false;
    let tenantIsolationError = null;

    // Get all evidence and pick one with a different tenant (if available)
    const allEvidenceGlobal = await base44.asServiceRole.entities.Evidence.list();
    const differentTenantEvidence = allEvidenceGlobal.find(e => e.tenant_id !== tenantId);

    if (differentTenantEvidence) {
      // Try to read it as the current user (should fail)
      try {
        const result = await base44.entities.Evidence.filter({ 
          evidence_id: differentTenantEvidence.evidence_id 
        });
        
        if (result.length === 0) {
          tenantIsolationActive = true;
        } else {
          tenantIsolationError = 'Cross-tenant read returned results (isolation failed)';
        }
      } catch (error) {
        if (error.status === 404 || error.message.includes('404') || error.message.includes('NOT_FOUND')) {
          tenantIsolationActive = true;
        } else {
          tenantIsolationError = `Unexpected error: ${error.message}`;
        }
      }
    } else {
      tenantIsolationError = 'Single-tenant environment (test inconclusive)';
    }

    testResults.tests.push({
      control: 'Tenant Isolation',
      status: tenantIsolationActive ? 'VERIFIED' : 'UNVERIFIED',
      condition: 'Cross-tenant read attempt returns NOT_FOUND/404',
      passed: tenantIsolationActive,
      details: tenantIsolationError || 'Cross-tenant isolation verified'
    });

    // Overall security posture
    const allPassed = testResults.tests.every(t => t.passed);
    testResults.overall_status = allPassed ? 'SECURITY_VERIFIED' : 'SECURITY_GAPS_DETECTED';
    testResults.passed_count = testResults.tests.filter(t => t.passed).length;
    testResults.total_count = testResults.tests.length;

    return Response.json(testResults);

  } catch (error) {
    return Response.json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});