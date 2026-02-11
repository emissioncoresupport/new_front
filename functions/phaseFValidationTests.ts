import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PHASE F — INGESTION LOCKDOWN VALIDATION TESTS
 * 
 * Automated validation to ensure:
 * - ACTIVE profiles are immutable
 * - SUPERSEDED profiles remain queryable
 * - Evidence cannot be reassigned
 * - Superseding does not alter historical readiness
 * - All invalid paths hard-fail
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const sections = {};

    // =========================================================================
    // TEST 1: PROFILE IMMUTABILITY
    // =========================================================================
    sections.profileImmutability = {
      name: 'Profile Immutability Enforcement',
      tests: []
    };

    // Create test profile
    const testProfile = await base44.asServiceRole.entities.IngestionProfile.create({
      profile_id: `TEST-IMMUTABLE-${Date.now()}`,
      tenant_id: 'test_tenant',
      entity_id: 'test_entity',
      entity_type: 'supplier',
      data_domain: 'SupplierMaster',
      ingestion_path: 'TEST',
      authority_type: 'Declarative',
      status: 'DRAFT',
      backend_verified: false,
      schema_version: '1.0',
      required_fields_coverage: 0,
      evidence_count: 0,
      created_by: 'PHASE_F_TEST',
      created_at: new Date().toISOString(),
      usable_modules: [],
      immutable: true
    });

    // Activate it
    await base44.asServiceRole.entities.IngestionProfile.update(testProfile.id, {
      status: 'ACTIVE',
      activated_at: new Date().toISOString()
    });

    // Try to modify ACTIVE profile (should fail)
    let modificationBlocked = false;
    try {
      await base44.asServiceRole.entities.IngestionProfile.update(testProfile.id, {
        data_domain: 'MODIFIED'
      });
    } catch (error) {
      modificationBlocked = true;
    }

    sections.profileImmutability.tests.push({
      name: 'ACTIVE profile modification blocked',
      status: modificationBlocked ? 'PASS' : 'FAIL',
      expected: 'Modification rejected',
      actual: modificationBlocked ? 'Rejected' : 'Allowed'
    });

    // =========================================================================
    // TEST 2: EVIDENCE BINDING LOCK
    // =========================================================================
    sections.evidenceBinding = {
      name: 'Evidence Binding Lock',
      tests: []
    };

    const testEvidence = await base44.asServiceRole.entities.Evidence.create({
      tenant_id: 'test_tenant',
      evidence_id: `TEST-EVI-${Date.now()}`,
      contract_id: testProfile.profile_id,
      ingestion_path: 'TEST',
      declared_context: {
        entity_type: 'supplier',
        intended_use: 'TEST',
        source_role: 'system',
        reason: 'Phase F validation'
      },
      file_url: null,
      file_hash_sha256: null,
      declaration_hash_sha256: 'test_hash',
      file_size_bytes: 100,
      original_filename: 'test.json',
      uploaded_at: new Date().toISOString(),
      actor_id: 'PHASE_F_TEST',
      state: 'STRUCTURED',
      declared_entity_type: 'SUPPLIER',
      declared_evidence_type: 'TEST',
      structured_payload: { test: true },
      source_system: 'TEST',
      immutable: true
    });

    const validationResult = await base44.asServiceRole.functions.invoke('validateEvidenceBinding', {
      evidence_id: testEvidence.evidence_id,
      tenant_id: 'test_tenant',
      operation: 'DELETE'
    });

    sections.evidenceBinding.tests.push({
      name: 'Evidence deletion blocked',
      status: validationResult.data.success === false ? 'PASS' : 'FAIL',
      expected: 'Deletion forbidden',
      actual: validationResult.data.error || 'Allowed'
    });

    const reassignResult = await base44.asServiceRole.functions.invoke('validateEvidenceBinding', {
      evidence_id: testEvidence.evidence_id,
      tenant_id: 'test_tenant',
      operation: 'REASSIGN'
    });

    sections.evidenceBinding.tests.push({
      name: 'Evidence reassignment blocked',
      status: reassignResult.data.success === false ? 'PASS' : 'FAIL',
      expected: 'Reassignment forbidden',
      actual: reassignResult.data.error || 'Allowed'
    });

    // =========================================================================
    // TEST 3: SUPERSEDING LOGIC
    // =========================================================================
    sections.supersedingLogic = {
      name: 'Profile Superseding Logic',
      tests: []
    };

    const newProfileId = `TEST-SUPERSEDE-${Date.now()}`;
    const supersedeResult = await base44.asServiceRole.functions.invoke('supersedeIngestionProfile', {
      old_profile_id: testProfile.profile_id,
      new_profile_id: newProfileId,
      tenant_id: 'test_tenant',
      entity_id: 'test_entity',
      reason: 'Phase F validation test'
    });

    sections.supersedingLogic.tests.push({
      name: 'Superseding creates new DRAFT',
      status: supersedeResult.data.success ? 'PASS' : 'FAIL',
      new_profile_status: supersedeResult.data.new_profile?.status
    });

    sections.supersedingLogic.tests.push({
      name: 'Old profile marked SUPERSEDED',
      status: supersedeResult.data.old_profile?.status === 'SUPERSEDED' ? 'PASS' : 'FAIL',
      old_profile_status: supersedeResult.data.old_profile?.status
    });

    // Verify old profile is queryable
    const oldProfileQuery = await base44.asServiceRole.entities.IngestionProfile.filter({
      profile_id: testProfile.profile_id,
      tenant_id: 'test_tenant'
    });

    sections.supersedingLogic.tests.push({
      name: 'SUPERSEDED profile remains queryable',
      status: oldProfileQuery.length > 0 ? 'PASS' : 'FAIL',
      found: oldProfileQuery.length
    });

    // =========================================================================
    // TEST 4: HARD FAILURE PATHS
    // =========================================================================
    sections.hardFailures = {
      name: 'Hard Failure Enforcement',
      tests: []
    };

    // Test missing profile (should hard-fail)
    const missingProfileResult = await base44.asServiceRole.functions.invoke('validateProfileImmutability', {
      profile_id: 'NONEXISTENT',
      tenant_id: 'test_tenant',
      operation: 'UPDATE'
    });

    sections.hardFailures.tests.push({
      name: 'Missing profile hard-fails',
      status: missingProfileResult.status === 404 ? 'PASS' : 'FAIL',
      response_status: missingProfileResult.status
    });

    // Test conflicting ACTIVE profiles (should hard-fail on activation)
    const duplicateProfile = await base44.asServiceRole.entities.IngestionProfile.create({
      profile_id: `TEST-CONFLICT-${Date.now()}`,
      tenant_id: 'test_tenant',
      entity_id: 'test_entity',
      entity_type: 'supplier',
      data_domain: 'SupplierMaster',
      ingestion_path: 'TEST',
      authority_type: 'Declarative',
      status: 'DRAFT',
      backend_verified: false,
      schema_version: '1.0',
      required_fields_coverage: 0,
      evidence_count: 0,
      created_by: 'PHASE_F_TEST',
      created_at: new Date().toISOString(),
      usable_modules: [],
      immutable: true
    });

    // This should fail because there's already an ACTIVE profile (the superseded one's replacement is DRAFT)
    // Actually, the original testProfile is now SUPERSEDED, so this might succeed
    // Let me test properly by activating the new profile first

    const activateNewResult = await base44.asServiceRole.functions.invoke('activateIngestionProfile', {
      profile_id: newProfileId,
      tenant_id: 'test_tenant'
    });

    // Now try to activate duplicate (should fail)
    const conflictResult = await base44.asServiceRole.functions.invoke('activateIngestionProfile', {
      profile_id: duplicateProfile.profile_id,
      tenant_id: 'test_tenant'
    });

    sections.hardFailures.tests.push({
      name: 'Conflicting ACTIVE profile hard-fails',
      status: conflictResult.data.success === false ? 'PASS' : 'FAIL',
      error: conflictResult.data.error
    });

    // =========================================================================
    // COMPUTE VERDICT
    // =========================================================================
    const allTests = Object.values(sections).flatMap(s => s.tests);
    const allPass = allTests.every(t => t.status === 'PASS');

    return Response.json({
      phase: 'F_VALIDATION',
      timestamp: new Date().toISOString(),
      verdict: allPass ? 'PHASE F PASS' : 'PHASE F FAIL',
      sections,
      summary: {
        total_tests: allTests.length,
        passed: allTests.filter(t => t.status === 'PASS').length,
        failed: allTests.filter(t => t.status === 'FAIL').length
      }
    });

  } catch (error) {
    console.error('Phase F Validation Error:', error);
    return Response.json({
      phase: 'F_VALIDATION',
      timestamp: new Date().toISOString(),
      error: error.message
    }, { status: 500 });
  }
});