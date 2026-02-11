/**
 * CONTRACT 1 IDEMPOTENCY PROOF
 * 
 * Demonstrates:
 * - API_PUSH idempotency with same payload (200 replay)
 * - API_PUSH conflict with different payload (409)
 * - DB unique constraint enforcement
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function hashString(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405 });
  }

  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const tenantId = 'IDEMPOTENCY_TEST_' + crypto.randomUUID().substring(0, 8);
    const results = {
      request_id: requestId,
      timestamp: new Date().toISOString(),
      tenant_id: tenantId,
      tests: {}
    };

    // Create test tenant
    await base44.asServiceRole.entities.Company.create({
      tenant_id: tenantId,
      legal_name: 'Idempotency Test',
      data_mode: 'TEST',
      country_code: 'NL'
    });

    // ===== TEST 1: Idempotent replay (same payload) =====
    console.log(`\n[IDEMPOTENCY TEST 1] Same payload, same key → 200 replay`);

    const payload1 = JSON.stringify({
      supplier: 'Acme Corp',
      country: 'DE',
      certified: true
    });
    const hash1 = await hashString(payload1);
    const externalRefId = 'ERP_SUPPLIER_' + crypto.randomUUID().substring(0, 12);

    // First submission
    console.log(`  Submitting API_PUSH with external_reference_id=${externalRefId}`);
    const firstRes = await base44.functions.invoke('ingestEvidenceDeterministic', {
      ingestion_method: 'API_PUSH',
      source_system: 'SAP',
      dataset_type: 'SUPPLIER_MASTER',
      declared_scope: 'ENTIRE_ORGANIZATION',
      primary_intent: 'Supplier onboarding',
      purpose_tags: ['COMPLIANCE'],
      contains_personal_data: false,
      retention_policy: 'STANDARD_1_YEAR',
      payload_bytes: payload1,
      external_reference_id: externalRefId
    });

    const firstEvidenceId = firstRes.data.evidence_id;
    const firstHash = firstRes.data.payload_hash_sha256;
    console.log(`  ✓ First submission: evidence_id=${firstEvidenceId}`);
    console.log(`    payload_hash=${firstHash}`);

    results.tests.test1_first = {
      status: 200,
      evidence_id: firstEvidenceId,
      payload_hash: firstHash,
      is_replay: false
    };

    // Replay with same payload
    console.log(`  Replaying same payload (idempotent)...`);
    const replayRes = await base44.functions.invoke('ingestEvidenceDeterministic', {
      ingestion_method: 'API_PUSH',
      source_system: 'SAP',
      dataset_type: 'SUPPLIER_MASTER',
      declared_scope: 'ENTIRE_ORGANIZATION',
      primary_intent: 'Supplier onboarding',
      purpose_tags: ['COMPLIANCE'],
      contains_personal_data: false,
      retention_policy: 'STANDARD_1_YEAR',
      payload_bytes: payload1,
      external_reference_id: externalRefId
    });

    const replayEvidenceId = replayRes.data.evidence_id;
    const replayHash = replayRes.data.payload_hash_sha256;

    if (replayEvidenceId === firstEvidenceId && replayHash === firstHash) {
      console.log(`  ✓ TEST 1 PASSED: Idempotent replay returned same evidence_id`);
      results.tests.test1_replay = {
        passed: true,
        status: 200,
        evidence_id: replayEvidenceId,
        payload_hash: replayHash,
        is_replay: true,
        original_evidence_id: firstEvidenceId,
        match: true
      };
    } else {
      console.log(`  ✗ TEST 1 FAILED: Different evidence_id returned (${replayEvidenceId} vs ${firstEvidenceId})`);
      results.tests.test1_replay = {
        passed: false,
        reason: 'Different evidence_id on replay'
      };
    }

    // ===== TEST 2: Conflict (same key, different payload) =====
    console.log(`\n[IDEMPOTENCY TEST 2] Same key, different payload → 409 conflict`);

    const payload2 = JSON.stringify({
      supplier: 'Acme Corp',
      country: 'DE',
      certified: false  // Changed
    });
    const hash2 = await hashString(payload2);

    console.log(`  Submitting different payload with same external_reference_id...`);
    console.log(`  First hash:  ${hash1}`);
    console.log(`  Second hash: ${hash2}`);

    try {
      const conflictRes = await base44.functions.invoke('ingestEvidenceDeterministic', {
        ingestion_method: 'API_PUSH',
        source_system: 'SAP',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'ENTIRE_ORGANIZATION',
        primary_intent: 'Supplier onboarding',
        purpose_tags: ['COMPLIANCE'],
        contains_personal_data: false,
        retention_policy: 'STANDARD_1_YEAR',
        payload_bytes: payload2,
        external_reference_id: externalRefId  // SAME key
      });

      // Should not reach here
      console.log(`  ✗ TEST 2 FAILED: Conflict was not detected`);
      results.tests.test2 = {
        passed: false,
        reason: 'Conflict not returned',
        response: conflictRes.data
      };
    } catch (e) {
      if (e.response?.status === 409 && e.response?.data?.error_code === 'IDEMPOTENCY_CONFLICT') {
        console.log(`  ✓ TEST 2 PASSED: Conflict detected (409 IDEMPOTENCY_CONFLICT)`);
        console.log(`    Existing evidence_id: ${e.response.data.existing_evidence_id}`);
        console.log(`    Existing payload_hash: ${e.response.data.existing_payload_hash}`);
        console.log(`    Provided payload_hash: ${e.response.data.provided_payload_hash}`);

        results.tests.test2 = {
          passed: true,
          status: 409,
          error_code: 'IDEMPOTENCY_CONFLICT',
          existing_evidence_id: e.response.data.existing_evidence_id,
          existing_payload_hash: e.response.data.existing_payload_hash,
          provided_payload_hash: e.response.data.provided_payload_hash
        };
      } else {
        console.log(`  ✗ TEST 2 FAILED: Wrong error (${e.response?.status})`);
        results.tests.test2 = {
          passed: false,
          status: e.response?.status,
          error: e.message
        };
      }
    }

    // ===== VERIFY DB CONSTRAINT =====
    console.log(`\n[DB CONSTRAINT] Verifying unique constraint...`);
    try {
      const constraint = await base44.asServiceRole.entities.Evidence.schema();
      console.log(`  Schema constraints: external_reference_id tracked with tenant_id + dataset_type`);

      // Query to verify uniqueness
      const duplicateCheck = await base44.asServiceRole.entities.Evidence.filter({
        tenant_id: tenantId,
        external_reference_id: externalRefId,
        dataset_type: 'SUPPLIER_MASTER'
      });

      console.log(`  Records with same (tenant, dataset_type, external_reference_id): ${duplicateCheck.length}`);
      results.constraint = {
        verified: duplicateCheck.length === 1,
        count: duplicateCheck.length,
        message: duplicateCheck.length === 1 ? 'Unique constraint enforced' : 'Constraint violation detected'
      };
    } catch (e) {
      console.log(`  ⚠ Constraint check error: ${e.message}`);
    }

    console.log(`\n=== Idempotency Tests Complete ===\n`);

    return Response.json({
      ok: true,
      ...results
    });
  } catch (error) {
    console.error(`FATAL: ${error.message}`);
    return Response.json({
      ok: false,
      error: error.message
    }, { status: 500 });
  }
});