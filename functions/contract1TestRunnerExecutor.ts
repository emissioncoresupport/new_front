import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { v4 as uuidv4 } from 'npm:uuid@9.0.0';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get company data mode
    const companies = await base44.asServiceRole.entities.Company.filter({});
    const company = companies?.[0];
    const dataMode = company?.data_mode || 'TEST';

    // BLOCK in LIVE mode
    if (dataMode === 'LIVE') {
      return Response.json(
        {
          error_code: 'QA_BLOCKED_IN_LIVE',
          message: 'Quality assurance tests cannot run in LIVE environment',
          correlation_id: uuidv4()
        },
        { status: 403 }
      );
    }

    const run_id = uuidv4();
    const started_at_utc = new Date().toISOString();
    const results = [];

    // ===== KNOWN SCOPE TESTS (LINKED) =====
    // Test 1: Create draft with MANUAL_ENTRY + BOM + PRODUCT_FAMILY
    try {
      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'MANUAL_ENTRY',
        dataset_type: 'BOM',
        declared_scope: 'PRODUCT_FAMILY',
        scope_target_id: 'target-123',
        why_this_evidence: 'Test known scope',
        purpose_tags: ['COMPLIANCE'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        entry_notes: 'Test entry'
      });

      if (draftRes.status === 201) {
        results.push({
          test_id: 'KNOWN_01',
          name: 'Create draft: MANUAL_ENTRY + BOM + PRODUCT_FAMILY',
          status: 'PASS',
          expected_http: 201,
          actual_http: draftRes.status,
          error_code: null,
          correlation_id: draftRes.correlation_id
        });
      } else {
        results.push({
          test_id: 'KNOWN_01',
          name: 'Create draft: MANUAL_ENTRY + BOM + PRODUCT_FAMILY',
          status: 'FAIL',
          expected_http: 201,
          actual_http: draftRes.status,
          error_code: draftRes.error_code || 'UNKNOWN',
          correlation_id: draftRes.correlation_id
        });
      }
    } catch (err) {
      results.push({
        test_id: 'KNOWN_01',
        name: 'Create draft: MANUAL_ENTRY + BOM + PRODUCT_FAMILY',
        status: 'FAIL',
        expected_http: 201,
        actual_http: 500,
        error_code: 'EXCEPTION',
        correlation_id: run_id,
        details: err.message
      });
    }

    // ===== UNKNOWN SCOPE TESTS (QUARANTINED) =====
    // Test 2: Create draft UNKNOWN_UNLINKED missing reason -> 422
    try {
      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'MANUAL_ENTRY',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'UNKNOWN_UNLINKED',
        why_this_evidence: 'Test unknown scope',
        purpose_tags: ['AUDIT'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        entry_notes: 'Test',
        quarantine_reason: null,
        resolution_deadline_utc: null
      });

      if (draftRes.status === 422 && draftRes.error_code === 'QUARANTINE_REASON_REQUIRED') {
        results.push({
          test_id: 'UNKNOWN_01',
          name: 'Create draft UNKNOWN missing reason -> 422',
          status: 'PASS',
          expected_http: 422,
          actual_http: draftRes.status,
          error_code: draftRes.error_code,
          correlation_id: draftRes.correlation_id
        });
      } else {
        results.push({
          test_id: 'UNKNOWN_01',
          name: 'Create draft UNKNOWN missing reason -> 422',
          status: 'FAIL',
          expected_http: 422,
          actual_http: draftRes.status,
          error_code: draftRes.error_code || 'UNEXPECTED',
          correlation_id: draftRes.correlation_id
        });
      }
    } catch (err) {
      results.push({
        test_id: 'UNKNOWN_01',
        name: 'Create draft UNKNOWN missing reason -> 422',
        status: 'FAIL',
        expected_http: 422,
        actual_http: 500,
        error_code: 'EXCEPTION',
        correlation_id: run_id,
        details: err.message
      });
    }

    // Test 3: Create draft UNKNOWN_UNLINKED valid
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'MANUAL_ENTRY',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'UNKNOWN_UNLINKED',
        why_this_evidence: 'Test unknown scope valid',
        purpose_tags: ['AUDIT'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        entry_notes: 'Test',
        quarantine_reason: 'Cannot determine supplier jurisdiction at this time. Will verify via supplier portal or trade documentation when available.',
        resolution_deadline_utc: futureDate.toISOString()
      });

      if (draftRes.status === 201 && draftRes.link_status === 'QUARANTINED') {
        results.push({
          test_id: 'UNKNOWN_02',
          name: 'Create draft UNKNOWN valid -> 201 QUARANTINED',
          status: 'PASS',
          expected_http: 201,
          actual_http: draftRes.status,
          error_code: null,
          correlation_id: draftRes.correlation_id
        });
      } else {
        results.push({
          test_id: 'UNKNOWN_02',
          name: 'Create draft UNKNOWN valid -> 201 QUARANTINED',
          status: 'FAIL',
          expected_http: 201,
          actual_http: draftRes.status,
          error_code: draftRes.error_code || 'UNKNOWN',
          correlation_id: draftRes.correlation_id
        });
      }
    } catch (err) {
      results.push({
        test_id: 'UNKNOWN_02',
        name: 'Create draft UNKNOWN valid -> 201 QUARANTINED',
        status: 'FAIL',
        expected_http: 201,
        actual_http: 500,
        error_code: 'EXCEPTION',
        correlation_id: run_id,
        details: err.message
      });
    }

    // ===== MATRIX TESTS =====
    // Test 4: MANUAL_ENTRY + CERTIFICATE -> 422
    try {
      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'MANUAL_ENTRY',
        dataset_type: 'CERTIFICATE',
        declared_scope: 'ENTIRE_ORGANIZATION',
        scope_target_id: 'org-1',
        why_this_evidence: 'Test invalid combo',
        purpose_tags: ['COMPLIANCE'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        entry_notes: 'Test'
      });

      if (draftRes.status === 422 && draftRes.error_code === 'UNSUPPORTED_METHOD_DATASET_COMBINATION') {
        results.push({
          test_id: 'MATRIX_01',
          name: 'MANUAL_ENTRY + CERTIFICATE -> 422',
          status: 'PASS',
          expected_http: 422,
          actual_http: draftRes.status,
          error_code: draftRes.error_code,
          correlation_id: draftRes.correlation_id
        });
      } else {
        results.push({
          test_id: 'MATRIX_01',
          name: 'MANUAL_ENTRY + CERTIFICATE -> 422',
          status: 'FAIL',
          expected_http: 422,
          actual_http: draftRes.status,
          error_code: draftRes.error_code || 'UNEXPECTED',
          correlation_id: draftRes.correlation_id
        });
      }
    } catch (err) {
      results.push({
        test_id: 'MATRIX_01',
        name: 'MANUAL_ENTRY + CERTIFICATE -> 422',
        status: 'FAIL',
        expected_http: 422,
        actual_http: 500,
        error_code: 'EXCEPTION',
        correlation_id: run_id,
        details: err.message
      });
    }

    // Test 5: MANUAL_ENTRY + TRANSACTION_LOG -> 422
    try {
      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'MANUAL_ENTRY',
        dataset_type: 'TRANSACTION_LOG',
        declared_scope: 'ENTIRE_ORGANIZATION',
        scope_target_id: 'org-1',
        why_this_evidence: 'Test invalid combo',
        purpose_tags: ['COMPLIANCE'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        entry_notes: 'Test'
      });

      if (draftRes.status === 422 && draftRes.error_code === 'UNSUPPORTED_METHOD_DATASET_COMBINATION') {
        results.push({
          test_id: 'MATRIX_02',
          name: 'MANUAL_ENTRY + TRANSACTION_LOG -> 422',
          status: 'PASS',
          expected_http: 422,
          actual_http: draftRes.status,
          error_code: draftRes.error_code,
          correlation_id: draftRes.correlation_id
        });
      } else {
        results.push({
          test_id: 'MATRIX_02',
          name: 'MANUAL_ENTRY + TRANSACTION_LOG -> 422',
          status: 'FAIL',
          expected_http: 422,
          actual_http: draftRes.status,
          error_code: draftRes.error_code || 'UNEXPECTED',
          correlation_id: draftRes.correlation_id
        });
      }
    } catch (err) {
      results.push({
        test_id: 'MATRIX_02',
        name: 'MANUAL_ENTRY + TRANSACTION_LOG -> 422',
        status: 'FAIL',
        expected_http: 422,
        actual_http: 500,
        error_code: 'EXCEPTION',
        correlation_id: run_id,
        details: err.message
      });
    }

    // ===== ERROR DISCIPLINE TEST =====
    // Verify no 500s in above tests
    const has500 = results.some(r => r.actual_http === 500 && !r.status.includes('expected'));
    if (!has500) {
      results.push({
        test_id: 'DISCIPLINE_01',
        name: 'No 500 responses for validation errors',
        status: 'PASS',
        expected_http: '422/403/409',
        actual_http: 'N/A',
        error_code: null,
        correlation_id: run_id
      });
    } else {
      results.push({
        test_id: 'DISCIPLINE_01',
        name: 'No 500 responses for validation errors',
        status: 'FAIL',
        expected_http: '422/403/409',
        actual_http: 500,
        error_code: 'FOUND_500',
        correlation_id: run_id
      });
    }

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const pass_rate = Math.round((passed / results.length) * 100);

    const finished_at_utc = new Date().toISOString();

    const response = {
      run_id,
      suite_name: 'Contract 1: Manual Entry Hardening',
      started_at_utc,
      finished_at_utc,
      total_tests: results.length,
      passed,
      failed,
      pass_rate,
      results,
      summary: {
        known_scope: 1,
        unknown_scope: 2,
        matrix_enforcement: 2,
        error_discipline: 1
      }
    };

    // Store proof log
    try {
      await base44.asServiceRole.entities.TestRunLog.create({
        run_id,
        suite_name: 'Contract 1: Manual Entry Hardening',
        started_at_utc,
        finished_at_utc,
        data_mode: dataMode,
        total_tests: results.length,
        passed,
        failed,
        pass_rate,
        executed_by_user_id: user.id
      });
    } catch (logErr) {
      console.log('Note: TestRunLog storage not available, continuing with results');
    }

    return Response.json(response, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        error_code: 'TEST_RUNNER_EXCEPTION',
        message: error.message,
        correlation_id: uuidv4()
      },
      { status: 500 }
    );
  }
});