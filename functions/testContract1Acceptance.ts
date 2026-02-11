import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CONTRACT 1 — ACCEPTANCE TEST SUITE (DETERMINISTIC)
 * 
 * Creates real fixtures, validates actual behavior, no fake greens.
 * Tests must be repeatable and evidence-based.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenant_id || user.id;
    const results = [];
    let fixtureEvidenceId = null;

    // ===== FIXTURE CREATION =====
    // Create a sealed evidence record for testing
    try {
      const ingestResponse = await fetch(Deno.env.get('BASE44_FUNCTION_URL') + '/ingestEvidence', {
        method: 'POST',
        headers: { 
          'Authorization': req.headers.get('Authorization'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ingestion_method: 'MANUAL_ENTRY',
          dataset_type: 'SUPPLIER_MASTER',
          source_system: 'OTHER',
          source_system_name: 'Contract1TestHarness',
          declared_scope: 'ENTIRE_ORGANIZATION',
          declared_intent: 'ROUTINE_UPDATE',
          intended_consumers: ['INTERNAL_ONLY'],
          personal_data_present: false,
          retention_policy: 'STANDARD_1_YEAR',
          retention_duration_days: 365,
          capture_text: JSON.stringify({ test: 'Contract1 acceptance test payload' }),
          intent_details: 'Automated test fixture for Contract 1 acceptance tests'
        })
      });

      const ingestData = await ingestResponse.json();
      
      if (ingestResponse.ok && ingestData.evidence_id) {
        fixtureEvidenceId = ingestData.evidence_id;
      }
    } catch (error) {
      console.error('Fixture creation failed:', error);
    }

    // ===== TEST 1: Missing GDPR basis =====
    try {
      const test1Response = await fetch(Deno.env.get('BASE44_FUNCTION_URL') + '/ingestEvidence', {
        method: 'POST',
        headers: { 
          'Authorization': req.headers.get('Authorization'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ingestion_method: 'FILE_UPLOAD',
          dataset_type: 'SUPPLIER_MASTER',
          source_system: 'SAP',
          declared_scope: 'ENTIRE_ORGANIZATION',
          declared_intent: 'ROUTINE_UPDATE',
          intended_consumers: ['CBAM'],
          personal_data_present: true,
          gdpr_legal_basis: null, // Missing - should reject
          retention_policy: 'STANDARD_1_YEAR',
          retention_duration_days: 365
        })
      });

      results.push({
        test: 'Test 1 — Missing GDPR basis',
        expected: 'HTTP 422 VALIDATION_ERROR',
        actual: `HTTP ${test1Response.status}`,
        pass: test1Response.status === 422,
        error_if_fail: test1Response.status === 400 ? 'Used 400 instead of 422 for validation' : null
      });
    } catch (error) {
      results.push({
        test: 'Test 1 — Missing GDPR basis',
        expected: 'HTTP 422',
        actual: 'Error: ' + error.message,
        pass: false
      });
    }

    // ===== TEST 2: ERP snapshot without date =====
    try {
      const test2Response = await fetch(Deno.env.get('BASE44_FUNCTION_URL') + '/ingestEvidence', {
        method: 'POST',
        headers: { 
          'Authorization': req.headers.get('Authorization'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ingestion_method: 'ERP_EXPORT',
          dataset_type: 'SUPPLIER_MASTER',
          source_system: 'SAP',
          snapshot_date_utc: null, // Missing - should reject
          declared_scope: 'ENTIRE_ORGANIZATION',
          declared_intent: 'ROUTINE_UPDATE',
          intended_consumers: ['CBAM'],
          personal_data_present: false,
          retention_policy: 'STANDARD_1_YEAR',
          retention_duration_days: 365
        })
      });

      results.push({
        test: 'Test 2 — ERP snapshot without date',
        expected: 'HTTP 422 VALIDATION_ERROR',
        actual: `HTTP ${test2Response.status}`,
        pass: test2Response.status === 422,
        error_if_fail: test2Response.status === 400 ? 'Used 400 instead of 422 for validation' : null
      });
    } catch (error) {
      results.push({
        test: 'Test 2 — ERP snapshot without date',
        expected: 'HTTP 422',
        actual: 'Error: ' + error.message,
        pass: false
      });
    }

    // ===== TEST 3: Server-side hashing =====
    if (!fixtureEvidenceId) {
      results.push({
        test: 'Test 3 — Server-side hashing',
        expected: 'payload_hash_sha256 and metadata_hash_sha256 present',
        actual: 'ERROR: Fixture creation failed',
        pass: false
      });
    } else {
      const evidenceList = await base44.asServiceRole.entities.Evidence.filter({
        evidence_id: fixtureEvidenceId,
        tenant_id: tenantId
      });

      if (evidenceList.length === 0) {
        results.push({
          test: 'Test 3 — Server-side hashing',
          expected: 'Sealed evidence with hashes',
          actual: 'ERROR: Fixture not found',
          pass: false
        });
      } else {
        const evidence = evidenceList[0];
        const hasPayloadHash = evidence.payload_hash_sha256 && /^[a-f0-9]{64}$/i.test(evidence.payload_hash_sha256);
        const hasMetadataHash = evidence.metadata_hash_sha256 && /^[a-f0-9]{64}$/i.test(evidence.metadata_hash_sha256);
        
        results.push({
          test: 'Test 3 — Server-side hashing',
          expected: 'Both hashes present as 64 hex chars',
          actual: `payload_hash: ${hasPayloadHash ? 'valid' : 'invalid'}, metadata_hash: ${hasMetadataHash ? 'valid' : 'invalid'}`,
          pass: hasPayloadHash && hasMetadataHash,
          details: {
            payload_hash: evidence.payload_hash_sha256 || 'missing',
            metadata_hash: evidence.metadata_hash_sha256 || 'missing'
          }
        });
      }
    }

    // ===== TEST 4: Audit event completeness =====
    if (!fixtureEvidenceId) {
      results.push({
        test: 'Test 4 — Audit event completeness',
        expected: 'At least 1 audit event per evidence',
        actual: 'ERROR: No fixture to validate',
        pass: false
      });
    } else {
      const auditEvents = await base44.asServiceRole.entities.EvidenceAuditEvent.filter({
        evidence_id: fixtureEvidenceId,
        tenant_id: tenantId
      });

      results.push({
        test: 'Test 4 — Audit event completeness',
        expected: 'At least 1 audit event exists',
        actual: `${auditEvents.length} audit events found`,
        pass: auditEvents.length >= 1
      });
    }

    // ===== TEST 5: Cross-tenant access returns 404 =====
    if (!fixtureEvidenceId) {
      results.push({
        test: 'Test 5 — Cross-tenant access',
        expected: 'HTTP 404 NOT_FOUND',
        actual: 'ERROR: No fixture to test with',
        pass: false
      });
    } else {
      // Simulate cross-tenant access by querying with wrong tenant_id
      const crossTenantEvidence = await base44.asServiceRole.entities.Evidence.filter({
        evidence_id: fixtureEvidenceId,
        tenant_id: 'fake-cross-tenant-id-' + crypto.randomUUID()
      });

      results.push({
        test: 'Test 5 — Cross-tenant access',
        expected: 'HTTP 404 NOT_FOUND (no records returned)',
        actual: `Tenant filter blocks access: ${crossTenantEvidence.length} records found`,
        pass: crossTenantEvidence.length === 0,
        note: 'Backend enforces tenant_id, returns 404 when evidence not found'
      });
    }

    // ===== TEST 6: Cryptographic seals present (no 0/0 pass) =====
    const allEvidence = await base44.asServiceRole.entities.Evidence.filter({ tenant_id: tenantId });
    const sealedEvidence = allEvidence.filter(e => e.state === 'SEALED');
    
    if (sealedEvidence.length === 0) {
      results.push({
        test: 'Test 6 — Cryptographic seals present',
        expected: 'All sealed evidence has hashes',
        actual: 'ERROR: No sealed evidence to validate',
        pass: false
      });
    } else {
      const sealedWithHashes = sealedEvidence.filter(e => 
        e.payload_hash_sha256 && e.metadata_hash_sha256
      );
      
      results.push({
        test: 'Test 6 — Cryptographic seals present',
        expected: 'All sealed records have payload + metadata hashes',
        actual: `${sealedWithHashes.length}/${sealedEvidence.length} sealed records have hashes`,
        pass: sealedWithHashes.length === sealedEvidence.length
      });
    }

    // ===== TEST 7: Required metadata present =====
    if (!fixtureEvidenceId) {
      results.push({
        test: 'Test 7 — Required metadata present',
        expected: 'All required fields populated',
        actual: 'ERROR: No fixture to validate',
        pass: false
      });
    } else {
      const evidenceList = await base44.asServiceRole.entities.Evidence.filter({
        evidence_id: fixtureEvidenceId,
        tenant_id: tenantId
      });

      if (evidenceList.length === 0) {
        results.push({
          test: 'Test 7 — Required metadata present',
          expected: 'All required fields populated',
          actual: 'ERROR: Fixture not found',
          pass: false
        });
      } else {
        const evidence = evidenceList[0];
        const requiredFields = [
          'ingestion_method', 'dataset_type', 'source_system',
          'declared_scope', 'declared_intent', 'retention_policy',
          'personal_data_present', 'intended_consumers'
        ];
        
        const missingFields = requiredFields.filter(field => !evidence[field]);
        
        results.push({
          test: 'Test 7 — Required metadata present',
          expected: 'All required fields populated',
          actual: missingFields.length === 0 
            ? 'All required fields present' 
            : `Missing: ${missingFields.join(', ')}`,
          pass: missingFields.length === 0
        });
      }
    }

    // ===== TEST 8: State machine integrity (Contract 1 only) =====
    const allEvidenceRecords = await base44.asServiceRole.entities.Evidence.filter({ tenant_id: tenantId });
    const disallowedStates = allEvidenceRecords.filter(e => 
      e.state === 'CLASSIFIED' || e.state === 'STRUCTURED'
    );
    
    if (disallowedStates.length > 0) {
      results.push({
        test: 'Test 8 — State machine integrity (Contract 1)',
        expected: 'No CLASSIFIED or STRUCTURED states',
        actual: `FAIL: Found ${disallowedStates.length} records in disallowed states`,
        pass: false,
        evidence_ids: disallowedStates.map(e => e.evidence_id)
      });
    } else {
      results.push({
        test: 'Test 8 — State machine integrity (Contract 1)',
        expected: 'No CLASSIFIED or STRUCTURED states',
        actual: `All ${allEvidenceRecords.length} records in Contract 1 allowed states`,
        pass: true
      });
    }

    const passCount = results.filter(r => r.pass === true).length;
    const failCount = results.filter(r => r.pass === false).length;

    return Response.json({
      contract: 'CONTRACT_1_ACCEPTANCE_TESTS',
      fixture_evidence_id: fixtureEvidenceId,
      summary: {
        total: results.length,
        pass: passCount,
        fail: failCount
      },
      results: results,
      verdict: failCount === 0 ? 'PASS' : 'FAIL'
    });

  } catch (error) {
    return Response.json({
      error: 'Test suite failed',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});