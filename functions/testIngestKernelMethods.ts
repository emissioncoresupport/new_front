import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { v4 as uuidv4 } from 'npm:uuid@9.0.0';

/**
 * Test suite for ingestion kernel and method-specific preconditions.
 * Executes real API flows and asserts error codes.
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const correlation_id_root = uuidv4();
  const results = [];

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TEST 1: FILE_UPLOAD seal without file -> 422 FILE_REQUIRED
    try {
      const draftRes = await base44.functions.invoke('ingestKernelDrafts', {
        method: 'FILE_UPLOAD',
        source_system: 'SAP',
        dataset_type: 'BOM',
        declared_scope: 'SITE',
        scope_target_id: 'site-001',
        why_this_evidence: 'Test BOM data',
        purpose_tags: ['COMPLIANCE'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false
      });

      if (draftRes.status === 201) {
        const draft = draftRes.data;
        const sealRes = await base44.functions.invoke('ingestKernelSeal', {
          draft: { ...draft, files: [] }
        });

        results.push({
          test_id: 'FILE_UPLOAD_01',
          name: 'FILE_UPLOAD seal without file -> 422 FILE_REQUIRED',
          status: sealRes.status === 422 && sealRes.data?.error_code === 'FILE_REQUIRED' ? 'PASS' : 'FAIL',
          expected_http: 422,
          actual_http: sealRes.status,
          expected_error_code: 'FILE_REQUIRED',
          actual_error_code: sealRes.data?.error_code
        });
      }
    } catch (err) {
      results.push({
        test_id: 'FILE_UPLOAD_01',
        name: 'FILE_UPLOAD seal without file -> 422 FILE_REQUIRED',
        status: 'FAIL',
        expected_http: 422,
        actual_http: 500,
        expected_error_code: 'FILE_REQUIRED',
        actual_error_code: 'EXCEPTION'
      });
    }

    // TEST 2: API_PUSH missing external_reference_id -> 422
    try {
      const draftRes = await base44.functions.invoke('ingestKernelDrafts', {
        method: 'API_PUSH',
        source_system: 'SUPPLIER_PORTAL',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'ENTIRE_ORGANIZATION',
        why_this_evidence: 'Test supplier data',
        purpose_tags: ['COMPLIANCE'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false
      });

      if (draftRes.status === 201) {
        const draft = draftRes.data;
        const payloadRes = await base44.functions.invoke('ingestKernelPayload', {
          draft_id: draft.draft_id,
          payload_data: { name: 'Test Supplier' }
        });

        if (payloadRes.status === 200) {
          const draftWithPayload = { ...draft, ...payloadRes.data };
          const sealRes = await base44.functions.invoke('ingestKernelSeal', {
            draft: draftWithPayload
          });

          results.push({
            test_id: 'API_PUSH_01',
            name: 'API_PUSH missing external_reference_id -> 422',
            status: sealRes.status === 422 && sealRes.data?.error_code === 'EXTERNAL_REFERENCE_ID_REQUIRED' ? 'PASS' : 'FAIL',
            expected_http: 422,
            actual_http: sealRes.status,
            expected_error_code: 'EXTERNAL_REFERENCE_ID_REQUIRED',
            actual_error_code: sealRes.data?.error_code
          });
        }
      }
    } catch (err) {
      results.push({
        test_id: 'API_PUSH_01',
        name: 'API_PUSH missing external_reference_id -> 422',
        status: 'FAIL',
        expected_http: 422,
        actual_http: 500,
        expected_error_code: 'EXTERNAL_REFERENCE_ID_REQUIRED',
        actual_error_code: 'EXCEPTION'
      });
    }

    // TEST 3: ERP_EXPORT missing snapshot_timestamp_utc -> 422
    try {
      const draftRes = await base44.functions.invoke('ingestKernelDrafts', {
        method: 'ERP_EXPORT',
        source_system: 'SAP',
        dataset_type: 'TRANSACTION_LOG',
        declared_scope: 'LEGAL_ENTITY',
        scope_target_id: 'le-001',
        why_this_evidence: 'Test transactions',
        purpose_tags: ['AUDIT'],
        retention_policy: '3_YEARS',
        contains_personal_data: false
      });

      if (draftRes.status === 201) {
        const draft = draftRes.data;
        const sealRes = await base44.functions.invoke('ingestKernelSeal', {
          draft: { ...draft, files: [{ file_id: uuidv4() }] }
        });

        results.push({
          test_id: 'ERP_EXPORT_01',
          name: 'ERP_EXPORT missing snapshot_timestamp_utc -> 422',
          status: sealRes.status === 422 && sealRes.data?.error_code === 'SNAPSHOT_TIMESTAMP_REQUIRED' ? 'PASS' : 'FAIL',
          expected_http: 422,
          actual_http: sealRes.status,
          expected_error_code: 'SNAPSHOT_TIMESTAMP_REQUIRED',
          actual_error_code: sealRes.data?.error_code
        });
      }
    } catch (err) {
      results.push({
        test_id: 'ERP_EXPORT_01',
        name: 'ERP_EXPORT missing snapshot_timestamp_utc -> 422',
        status: 'FAIL',
        expected_http: 422,
        actual_http: 500,
        expected_error_code: 'SNAPSHOT_TIMESTAMP_REQUIRED',
        actual_error_code: 'EXCEPTION'
      });
    }

    // TEST 4: Binding field immutability
    try {
      const draftRes = await base44.functions.invoke('ingestKernelDrafts', {
        method: 'MANUAL_ENTRY',
        source_system: 'INTERNAL_MANUAL',
        dataset_type: 'BOM',
        declared_scope: 'SITE',
        scope_target_id: 'site-001',
        why_this_evidence: 'Test',
        purpose_tags: ['COMPLIANCE'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false
      });

      if (draftRes.status === 201) {
        const draft = draftRes.data;
        const tamperedRes = await base44.functions.invoke('ingestKernelPayload', {
          draft_id: draft.draft_id,
          payload_data: { method: 'FILE_UPLOAD' }
        });

        results.push({
          test_id: 'KERNEL_01',
          name: 'Binding fields immutable in payload step -> 422',
          status: tamperedRes.status === 422 && tamperedRes.data?.error_code === 'BINDING_FIELDS_IMMUTABLE' ? 'PASS' : 'FAIL',
          expected_http: 422,
          actual_http: tamperedRes.status,
          expected_error_code: 'BINDING_FIELDS_IMMUTABLE',
          actual_error_code: tamperedRes.data?.error_code
        });
      }
    } catch (err) {
      results.push({
        test_id: 'KERNEL_01',
        name: 'Binding fields immutable in payload step -> 422',
        status: 'FAIL',
        expected_http: 422,
        actual_http: 500,
        expected_error_code: 'BINDING_FIELDS_IMMUTABLE',
        actual_error_code: 'EXCEPTION'
      });
    }

    const pass_count = results.filter(r => r.status === 'PASS').length;
    const fail_count = results.filter(r => r.status === 'FAIL').length;
    const total_tests = results.length;

    return Response.json({
      suite_name: 'INGESTION_KERNEL_METHODS',
      run_id: correlation_id_root,
      started_at_utc: new Date().toISOString(),
      environment: 'TEST',
      results,
      pass_count,
      fail_count,
      total_tests,
      pass_rate: Math.round((pass_count / total_tests) * 100)
    }, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error.message, error_code: 'TEST_RUNNER_EXCEPTION' },
      { status: 500 }
    );
  }
});