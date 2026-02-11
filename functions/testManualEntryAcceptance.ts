import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * MANUAL_ENTRY Acceptance Test Suite (M_MANUAL_01 through M_MANUAL_08)
 * Validates regulator-grade MANUAL_ENTRY implementation
 */

async function hashString(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = req.headers.get('x-tenant-id') || user.tenant_id || 'DEFAULT';
  const results = [];

  // M_MANUAL_01: source_system forced to INTERNAL_MANUAL
  {
    const test = 'M_MANUAL_01';
    let passed = false;
    let error = null;
    try {
      const res = await base44.functions.invoke('ingestEvidenceDeterministic', {
        origin: 'TEST_FIXTURE',
        ingestion_method: 'MANUAL_ENTRY',
        source_system: 'SAP', // Client tries SAP
        dataset_type: 'TEST',
        declared_scope: 'ENTIRE_ORGANIZATION',
        primary_intent: 'M_MANUAL_01 test - verify source_system override',
        purpose_tags: ['AUDIT'],
        contains_personal_data: false,
        retention_policy: 'STANDARD_1_YEAR',
        payload_bytes: JSON.stringify({ field1: 'value1', field2: 'value2' }),
        entry_notes: 'Testing source_system enforcement for MANUAL_ENTRY method with proper validation',
        request_id: `m01_${Date.now()}`
      });
      // Server should override to INTERNAL_MANUAL
      const evidence = await base44.entities.Evidence.filter({ evidence_id: res.data.evidence_id });
      passed = evidence[0]?.source_system === 'INTERNAL_MANUAL';
      if (!passed) error = `Got source_system: ${evidence[0]?.source_system}`;
    } catch (e) {
      error = e.response?.data?.message || e.message;
    }
    results.push({ test, passed, description: 'source_system forced to INTERNAL_MANUAL server-side', error });
  }

  // M_MANUAL_02: missing request_id returns 422
  {
    const test = 'M_MANUAL_02';
    let passed = false;
    let error = null;
    try {
      await base44.functions.invoke('ingestEvidenceDeterministic', {
        origin: 'TEST_FIXTURE',
        ingestion_method: 'MANUAL_ENTRY',
        source_system: 'INTERNAL_MANUAL',
        dataset_type: 'TEST',
        declared_scope: 'ENTIRE_ORGANIZATION',
        primary_intent: 'Test',
        purpose_tags: ['AUDIT'],
        contains_personal_data: false,
        retention_policy: 'STANDARD_1_YEAR',
        payload_bytes: JSON.stringify({ test: 'data' }),
        entry_notes: 'Testing request_id requirement'
        // request_id missing
      });
    } catch (e) {
      passed = e.response?.status === 422 && e.response?.data?.error_code === 'MISSING_REQUIRED_METADATA';
      if (!passed) error = `Got ${e.response?.status} ${e.response?.data?.error_code}`;
    }
    results.push({ test, passed, description: 'missing request_id returns 422', error });
  }

  // M_MANUAL_03: LEGAL_ENTITY scope requires scope_target_id
  {
    const test = 'M_MANUAL_03';
    let passed = false;
    let error = null;
    try {
      await base44.functions.invoke('ingestEvidenceDeterministic', {
        origin: 'TEST_FIXTURE',
        ingestion_method: 'MANUAL_ENTRY',
        source_system: 'INTERNAL_MANUAL',
        dataset_type: 'TEST',
        declared_scope: 'LEGAL_ENTITY',
        // scope_target_id missing
        primary_intent: 'Test',
        purpose_tags: ['AUDIT'],
        contains_personal_data: false,
        retention_policy: 'STANDARD_1_YEAR',
        payload_bytes: JSON.stringify({ test: 'data' }),
        entry_notes: 'Testing scope target requirement',
        request_id: `m03_${Date.now()}`
      });
    } catch (e) {
      passed = e.response?.status === 422 && e.response?.data?.error_code === 'MISSING_SCOPE_TARGET_ID';
      if (!passed) error = `Got ${e.response?.status} ${e.response?.data?.error_code}`;
    }
    results.push({ test, passed, description: 'LEGAL_ENTITY scope requires scope_target_id', error });
  }

  // M_MANUAL_04: free text "ZUK Motion" rejected with 422
  {
    const test = 'M_MANUAL_04';
    let passed = false;
    let error = null;
    try {
      await base44.functions.invoke('ingestEvidenceDeterministic', {
        origin: 'TEST_FIXTURE',
        ingestion_method: 'MANUAL_ENTRY',
        source_system: 'INTERNAL_MANUAL',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'ENTIRE_ORGANIZATION',
        primary_intent: 'Test free text rejection',
        purpose_tags: ['AUDIT'],
        contains_personal_data: false,
        retention_policy: 'STANDARD_1_YEAR',
        payload_bytes: 'ZUK Motion', // Free text
        entry_notes: 'Testing that free text like "ZUK Motion" is rejected',
        request_id: `m04_${Date.now()}`
      });
    } catch (e) {
      passed = e.response?.status === 422 && e.response?.data?.error_code === 'INVALID_PAYLOAD';
      if (!passed) error = `Got ${e.response?.status} ${e.response?.data?.error_code}`;
    }
    results.push({ test, passed, description: 'free text "ZUK Motion" rejected with 422 INVALID_PAYLOAD', error });
  }

  // M_MANUAL_05: payload must be JSON object (not string)
  {
    const test = 'M_MANUAL_05';
    let passed = false;
    let error = null;
    try {
      await base44.functions.invoke('ingestEvidenceDeterministic', {
        origin: 'TEST_FIXTURE',
        ingestion_method: 'MANUAL_ENTRY',
        source_system: 'INTERNAL_MANUAL',
        dataset_type: 'TEST',
        declared_scope: 'ENTIRE_ORGANIZATION',
        primary_intent: 'Test',
        purpose_tags: ['AUDIT'],
        contains_personal_data: false,
        retention_policy: 'STANDARD_1_YEAR',
        payload_bytes: '"just a string"', // JSON string primitive
        entry_notes: 'Testing JSON object requirement',
        request_id: `m05_${Date.now()}`
      });
    } catch (e) {
      passed = e.response?.status === 422 && e.response?.data?.error_code === 'INVALID_PAYLOAD';
      if (!passed) error = `Got ${e.response?.status} ${e.response?.data?.error_code}`;
    }
    results.push({ test, passed, description: 'payload must be JSON object (not string/array/primitive)', error });
  }

  // M_MANUAL_06: placeholder values rejected
  {
    const test = 'M_MANUAL_06';
    let passed = false;
    let error = null;
    try {
      await base44.functions.invoke('ingestEvidenceDeterministic', {
        origin: 'TEST_FIXTURE',
        ingestion_method: 'MANUAL_ENTRY',
        source_system: 'INTERNAL_MANUAL',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'ENTIRE_ORGANIZATION',
        primary_intent: 'Test',
        purpose_tags: ['AUDIT'],
        contains_personal_data: false,
        retention_policy: 'STANDARD_1_YEAR',
        payload_bytes: JSON.stringify({ supplier_name: 'test', country_code: 'DE' }), // 'test' is placeholder
        entry_notes: 'Testing placeholder rejection',
        request_id: `m06_${Date.now()}`
      });
    } catch (e) {
      passed = e.response?.status === 422 && e.response?.data?.message?.includes('Placeholder value');
      if (!passed) error = `Got ${e.response?.status} ${e.response?.data?.error_code}: ${e.response?.data?.message}`;
    }
    results.push({ test, passed, description: 'placeholder values like "test" rejected', error });
  }

  // M_MANUAL_07: attestation captured server-side from auth
  {
    const test = 'M_MANUAL_07';
    let passed = false;
    let error = null;
    try {
      const res = await base44.functions.invoke('ingestEvidenceDeterministic', {
        origin: 'TEST_FIXTURE',
        ingestion_method: 'MANUAL_ENTRY',
        source_system: 'INTERNAL_MANUAL',
        dataset_type: 'TEST',
        declared_scope: 'ENTIRE_ORGANIZATION',
        primary_intent: 'Test attestation capture',
        purpose_tags: ['AUDIT'],
        contains_personal_data: false,
        retention_policy: 'STANDARD_1_YEAR',
        payload_bytes: JSON.stringify({ field: 'value123' }),
        entry_notes: 'Testing server-side attestation capture from authenticated user session',
        request_id: `m07_${Date.now()}`
      });
      
      const evidence = await base44.entities.Evidence.filter({ evidence_id: res.data.evidence_id });
      passed = evidence[0]?.attestor_user_id === user.id &&
               evidence[0]?.attested_by_email === user.email &&
               evidence[0]?.attestation_method === 'MANUAL_ENTRY' &&
               !!evidence[0]?.attested_at_utc;
      if (!passed) error = `Missing attestation fields in evidence record`;
    } catch (e) {
      error = e.response?.data?.message || e.message;
    }
    results.push({ test, passed, description: 'attestation (user_id, email, method, timestamp) captured server-side from auth', error });
  }

  // M_MANUAL_08: sealed record returns 409 on update
  {
    const test = 'M_MANUAL_08';
    let passed = false;
    let error = null;
    let evidenceId = null;
    try {
      // Create and seal
      const res = await base44.functions.invoke('ingestEvidenceDeterministic', {
        origin: 'TEST_FIXTURE',
        ingestion_method: 'MANUAL_ENTRY',
        source_system: 'INTERNAL_MANUAL',
        dataset_type: 'TEST',
        declared_scope: 'ENTIRE_ORGANIZATION',
        primary_intent: 'Test immutability',
        purpose_tags: ['AUDIT'],
        contains_personal_data: false,
        retention_policy: 'STANDARD_1_YEAR',
        payload_bytes: JSON.stringify({ immutability: 'test' }),
        entry_notes: 'Testing sealed evidence immutability',
        request_id: `m08_ingest_${Date.now()}`
      });
      evidenceId = res.data.evidence_id;

      await base44.functions.invoke('sealEvidenceV3_ManualEntryAttestation', {
        evidence_id: evidenceId,
        request_id: `m08_seal_${Date.now()}`
      });

      // Try to update (should fail 409)
      try {
        await base44.functions.invoke('updateEvidenceWithGuard', {
          evidence_id: evidenceId,
          tenant_id: tenantId,
          updates: { primary_intent: 'MUTATION_ATTEMPT' }
        });
        error = 'Update succeeded (expected 409)';
      } catch (updateErr) {
        passed = updateErr.response?.status === 409 && updateErr.response?.data?.error_code === 'SEALED_IMMUTABLE';
        if (!passed) error = `Got ${updateErr.response?.status} ${updateErr.response?.data?.error_code}`;
      }
    } catch (e) {
      error = e.response?.data?.message || e.message;
    }
    results.push({ test, passed, description: 'sealed MANUAL_ENTRY returns 409 SEALED_IMMUTABLE on update', evidence_id: evidenceId, error });
  }

  // M_MANUAL_09: CERTIFICATE + MANUAL_ENTRY returns 422 UNSUPPORTED_METHOD_DATASET_COMBINATION
  {
    const test = 'M_MANUAL_09';
    let passed = false;
    let error = null;
    try {
      await base44.functions.invoke('ingestEvidenceDeterministic', {
        origin: 'TEST_FIXTURE',
        ingestion_method: 'MANUAL_ENTRY',
        source_system: 'INTERNAL_MANUAL',
        dataset_type: 'CERTIFICATE',
        declared_scope: 'ENTIRE_ORGANIZATION',
        primary_intent: 'Test unsupported dataset',
        purpose_tags: ['AUDIT'],
        contains_personal_data: false,
        retention_policy: 'STANDARD_1_YEAR',
        payload_bytes: JSON.stringify({ cert_type: 'ISO13485' }),
        entry_notes: 'Testing that CERTIFICATE dataset blocks MANUAL_ENTRY method',
        request_id: `m09_${Date.now()}`
      });
      error = 'Request succeeded (expected 422)';
    } catch (e) {
      passed = e.response?.status === 422 && e.response?.data?.error_code === 'UNSUPPORTED_METHOD_DATASET_COMBINATION';
      if (!passed) error = `Got ${e.response?.status} ${e.response?.data?.error_code}`;
    }
    results.push({ test, passed, description: 'CERTIFICATE + MANUAL_ENTRY returns 422 UNSUPPORTED_METHOD_DATASET_COMBINATION', error });
  }

  // M_MANUAL_10: TRANSACTION_LOG + MANUAL_ENTRY returns 422 UNSUPPORTED_METHOD_DATASET_COMBINATION
  {
    const test = 'M_MANUAL_10';
    let passed = false;
    let error = null;
    try {
      await base44.functions.invoke('ingestEvidenceDeterministic', {
        origin: 'TEST_FIXTURE',
        ingestion_method: 'MANUAL_ENTRY',
        source_system: 'INTERNAL_MANUAL',
        dataset_type: 'TRANSACTION_LOG',
        declared_scope: 'ENTIRE_ORGANIZATION',
        primary_intent: 'Test unsupported dataset',
        purpose_tags: ['AUDIT'],
        contains_personal_data: false,
        retention_policy: 'STANDARD_1_YEAR',
        payload_bytes: JSON.stringify({ transaction_id: 'TXN123' }),
        entry_notes: 'Testing that TRANSACTION_LOG dataset blocks MANUAL_ENTRY method',
        request_id: `m10_${Date.now()}`
      });
      error = 'Request succeeded (expected 422)';
    } catch (e) {
      passed = e.response?.status === 422 && e.response?.data?.error_code === 'UNSUPPORTED_METHOD_DATASET_COMBINATION';
      if (!passed) error = `Got ${e.response?.status} ${e.response?.data?.error_code}`;
    }
    results.push({ test, passed, description: 'TRANSACTION_LOG + MANUAL_ENTRY returns 422 UNSUPPORTED_METHOD_DATASET_COMBINATION', error });
  }

  const summary = `${results.filter(r => r.passed).length}/${results.length} passed`;
  const passRate = `${((results.filter(r => r.passed).length / results.length) * 100).toFixed(0)}%`;

  return Response.json({
    ok: true,
    summary,
    pass_rate: passRate,
    results,
    timestamp: new Date().toISOString()
  }, { status: 200 });
});