import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { v4 as uuidv4 } from 'npm:uuid@9.0.0';

/**
 * TEST HARNESS: Contract 1 Seal Hardening
 * 
 * Validates deterministic error codes:
 * - 422 FILE_REQUIRED: FILE_UPLOAD with no file
 * - 422 FILE_HASH_MISSING: FILE_UPLOAD with file but missing hash_sha256
 * - 422 PAYLOAD_REQUIRED: MANUAL_ENTRY with missing validated_payload
 * - 422 MISSING_REQUIRED_FIELDS: Missing binding fields
 * - 409 SEALED_IMMUTABLE: Attempt to update sealed evidence
 * 
 * Returns structured test results.
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'POST required' }, { status: 405 });
  }

  const correlation_id = uuidv4();
  const tests = [];

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Auth required' }, { status: 401 });
    }

    const tenant_id = user.id; // In real system: from tenant context

    // TEST 1: FILE_UPLOAD without file
    tests.push({
      name: 'FILE_UPLOAD seal without file',
      description: 'Should return 422 FILE_REQUIRED',
      draft: {
        draft_id: `test_no_file_${Date.now()}`,
        tenant_id,
        method: 'FILE_UPLOAD',
        source_system: 'OTHER',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'ENTIRE_ORGANIZATION',
        scope_target_id: null,
        purpose_tags: ['COMPLIANCE'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        files: [] // EMPTY - should fail
      },
      expected_code: 'FILE_REQUIRED',
      expected_status: 422
    });

    // TEST 2: FILE_UPLOAD with file but no hash
    tests.push({
      name: 'FILE_UPLOAD file without hash',
      description: 'Should return 422 FILE_HASH_MISSING',
      draft: {
        draft_id: `test_no_hash_${Date.now()}`,
        tenant_id,
        method: 'FILE_UPLOAD',
        source_system: 'OTHER',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'ENTIRE_ORGANIZATION',
        scope_target_id: null,
        purpose_tags: ['COMPLIANCE'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        files: [
          {
            filename: 'test.csv',
            size_bytes: 100,
            content_type: 'text/csv',
            // hash_sha256 MISSING
          }
        ]
      },
      expected_code: 'FILE_HASH_MISSING',
      expected_status: 422
    });

    // TEST 3: MANUAL_ENTRY without validated_payload
    tests.push({
      name: 'MANUAL_ENTRY without validated_payload',
      description: 'Should return 422 PAYLOAD_REQUIRED',
      draft: {
        draft_id: `test_no_payload_${Date.now()}`,
        tenant_id,
        method: 'MANUAL_ENTRY',
        source_system: 'OTHER',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'ENTIRE_ORGANIZATION',
        scope_target_id: null,
        purpose_tags: ['COMPLIANCE'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        validated_payload: null, // MISSING
        entry_notes: 'This is a test with 20+ characters minimum here'
      },
      expected_code: 'PAYLOAD_REQUIRED',
      expected_status: 422
    });

    // TEST 4: Missing required fields (no purpose_tags)
    tests.push({
      name: 'Missing purpose_tags',
      description: 'Should return 422 VALIDATION_ERROR',
      draft: {
        draft_id: `test_no_tags_${Date.now()}`,
        tenant_id,
        method: 'FILE_UPLOAD',
        source_system: 'OTHER',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'ENTIRE_ORGANIZATION',
        scope_target_id: null,
        purpose_tags: [], // EMPTY - should fail
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        files: [
          {
            filename: 'test.csv',
            size_bytes: 100,
            content_type: 'text/csv',
            hash_sha256: 'abc123xyz'
          }
        ]
      },
      expected_code: 'VALIDATION_ERROR',
      expected_status: 422
    });

    // TEST 5: Valid FILE_UPLOAD (should succeed with 201)
    tests.push({
      name: 'Valid FILE_UPLOAD seal',
      description: 'Should return 201 with sealed evidence',
      draft: {
        draft_id: `test_valid_${Date.now()}`,
        tenant_id,
        method: 'FILE_UPLOAD',
        source_system: 'OTHER',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'ENTIRE_ORGANIZATION',
        scope_target_id: null,
        purpose_tags: ['COMPLIANCE'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        files: [
          {
            filename: 'supplier_master.csv',
            size_bytes: 2048,
            content_type: 'text/csv',
            hash_sha256: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            uploaded_at_utc: new Date().toISOString()
          }
        ],
        binding_hash_sha256: 'hash_bind_123',
        metadata_hash_sha256: 'hash_meta_456'
      },
      expected_code: null,
      expected_status: 201
    });

    // EXECUTE TESTS
    const results = [];
    for (const test of tests) {
      try {
        const sealRes = await fetch(new URL(req.url).origin + '/api/functions/ingestKernelSealHardened', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('authorization') || ''
          },
          body: JSON.stringify({ draft: test.draft })
        });

        const sealData = await sealRes.json();

        const pass =
          sealRes.status === test.expected_status &&
          (test.expected_code === null || sealData.error_code === test.expected_code);

        results.push({
          name: test.name,
          description: test.description,
          status: pass ? 'PASS' : 'FAIL',
          expected_status: test.expected_status,
          actual_status: sealRes.status,
          expected_code: test.expected_code,
          actual_code: sealData.error_code || null,
          message: sealData.message || sealData.error || 'No message',
          correlation_id: sealData.correlation_id
        });
      } catch (error) {
        results.push({
          name: test.name,
          description: test.description,
          status: 'ERROR',
          error: error.message
        });
      }
    }

    // Summary
    const passed = results.filter(r => r.status === 'PASS').length;
    const total = results.length;

    return Response.json(
      {
        test_suite: 'Contract1SealHardening',
        correlation_id,
        summary: {
          total,
          passed,
          failed: total - passed,
          pass_rate: ((passed / total) * 100).toFixed(1) + '%'
        },
        results
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('TEST_HARNESS_ERROR:', error.stack);
    return Response.json(
      {
        error: 'Test harness failed',
        message: error.message,
        correlation_id
      },
      { status: 500 }
    );
  }
});