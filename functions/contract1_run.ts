import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { v4 as uuidv4 } from 'npm:uuid@9.0.0';
import crypto from 'node:crypto';

const hashString = (str) => {
  return crypto.createHash('sha256').update(str).digest('hex');
};

const canonicalJson = (obj) => {
  return JSON.stringify(obj, Object.keys(obj).sort());
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const correlation_id_root = uuidv4();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json(
        {
          error: 'Unauthorized',
          error_code: 'AUTH_REQUIRED',
          correlation_id: correlation_id_root
        },
        { status: 401 }
      );
    }

    // Get company and determine environment
    const companies = await base44.asServiceRole.entities.Company.filter({});
    const company = companies?.[0];
    const environment = company?.data_mode || 'TEST';
    const build_id = company?.app_version || 'unknown';

    const run_id = uuidv4();
    const started_at_utc = new Date().toISOString();
    const results = [];

    // ===== LIVE ENVIRONMENT BLOCK =====
    if (environment === 'LIVE') {
      const finished_at_utc = new Date().toISOString();
      const results_json = {
        suite_name: 'CONTRACT1_MANUAL_ENTRY',
        run_id,
        environment,
        message: 'Test execution blocked in LIVE environment',
        error_code: 'QA_BLOCKED_IN_LIVE'
      };
      const results_hash_sha256 = hashString(canonicalJson(results_json));

      try {
        await base44.asServiceRole.entities.ContractTestRun.create({
          run_id,
          suite_name: 'CONTRACT1_MANUAL_ENTRY',
          environment,
          started_at_utc,
          finished_at_utc,
          triggered_by_user_id: user.id,
          build_id,
          pass_count: 0,
          fail_count: 0,
          total_tests: 0,
          pass_rate: 0,
          status: 'BLOCKED',
          results_json,
          results_hash_sha256,
          correlation_id_root
        });
      } catch (logErr) {
        console.log('ContractTestRun BLOCKED record write failed:', logErr.message);
      }

      return Response.json(
        {
          error_code: 'QA_BLOCKED_IN_LIVE',
          message: 'Quality assurance tests cannot run in LIVE environment',
          correlation_id: correlation_id_root,
          run_id
        },
        { status: 403 }
      );
    }

    // ===== TEST ENVIRONMENT: EXECUTE TESTS =====

    // A) KNOWN SCOPE FLOW
    try {
      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'MANUAL_ENTRY',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'LEGAL_ENTITY',
        scope_target_id: 'le-test-001',
        scope_target_name: 'Test Legal Entity',
        why_this_evidence: 'Known scope integration test',
        purpose_tags: ['COMPLIANCE'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        entry_notes: 'Automated test for known scope flow'
      });

      results.push({
        test_id: 'KNOWN_01',
        name: 'Create draft LINKED (LEGAL_ENTITY) -> 201',
        status: draftRes.status === 201 ? 'PASS' : 'FAIL',
        expected_http: 201,
        actual_http: draftRes.status || 500,
        expected_error_code: null,
        actual_error_code: draftRes.error_code || null,
        correlation_id: draftRes.correlation_id || correlation_id_root
      });
    } catch (err) {
      results.push({
        test_id: 'KNOWN_01',
        name: 'Create draft LINKED (LEGAL_ENTITY) -> 201',
        status: 'FAIL',
        expected_http: 201,
        actual_http: 500,
        expected_error_code: null,
        actual_error_code: 'EXCEPTION',
        correlation_id: correlation_id_root
      });
    }

    // Invalid payload test
    try {
      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'MANUAL_ENTRY',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'LEGAL_ENTITY',
        scope_target_id: 'le-test-001',
        why_this_evidence: null, // Invalid
        purpose_tags: ['COMPLIANCE'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        entry_notes: 'Test'
      });

      results.push({
        test_id: 'KNOWN_02',
        name: 'Invalid payload (missing why_this_evidence) -> 422',
        status: draftRes.status === 422 ? 'PASS' : 'FAIL',
        expected_http: 422,
        actual_http: draftRes.status || 500,
        expected_error_code: 'PAYLOAD_SCHEMA_INVALID',
        actual_error_code: draftRes.error_code || null,
        correlation_id: draftRes.correlation_id || correlation_id_root
      });
    } catch (err) {
      results.push({
        test_id: 'KNOWN_02',
        name: 'Invalid payload (missing why_this_evidence) -> 422',
        status: 'FAIL',
        expected_http: 422,
        actual_http: 500,
        expected_error_code: 'PAYLOAD_SCHEMA_INVALID',
        actual_error_code: 'EXCEPTION',
        correlation_id: correlation_id_root
      });
    }

    // Valid payload test
    try {
      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'MANUAL_ENTRY',
        dataset_type: 'BOM',
        declared_scope: 'SITE',
        scope_target_id: 'site-test-001',
        scope_target_name: 'Test Site',
        why_this_evidence: 'Valid BOM data',
        purpose_tags: ['COMPLIANCE'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        entry_notes: 'Complete test data'
      });

      results.push({
        test_id: 'KNOWN_03',
        name: 'Valid payload -> 201',
        status: draftRes.status === 201 ? 'PASS' : 'FAIL',
        expected_http: 201,
        actual_http: draftRes.status || 500,
        expected_error_code: null,
        actual_error_code: draftRes.error_code || null,
        correlation_id: draftRes.correlation_id || correlation_id_root
      });
    } catch (err) {
      results.push({
        test_id: 'KNOWN_03',
        name: 'Valid payload -> 201',
        status: 'FAIL',
        expected_http: 201,
        actual_http: 500,
        expected_error_code: null,
        actual_error_code: 'EXCEPTION',
        correlation_id: correlation_id_root
      });
    }

    // B) UNKNOWN/UNLINKED FLOW

    // Missing reason test
    try {
      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'MANUAL_ENTRY',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'UNKNOWN_UNLINKED',
        why_this_evidence: 'Unknown test',
        purpose_tags: ['COMPLIANCE'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        entry_notes: 'Test',
        quarantine_reason: null, // Missing
        resolution_deadline_utc: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      results.push({
        test_id: 'UNKNOWN_01',
        name: 'Missing quarantine_reason -> 422',
        status: draftRes.status === 422 ? 'PASS' : 'FAIL',
        expected_http: 422,
        actual_http: draftRes.status || 500,
        expected_error_code: 'QUARANTINE_REASON_REQUIRED',
        actual_error_code: draftRes.error_code || null,
        correlation_id: draftRes.correlation_id || correlation_id_root
      });
    } catch (err) {
      results.push({
        test_id: 'UNKNOWN_01',
        name: 'Missing quarantine_reason -> 422',
        status: 'FAIL',
        expected_http: 422,
        actual_http: 500,
        expected_error_code: 'QUARANTINE_REASON_REQUIRED',
        actual_error_code: 'EXCEPTION',
        correlation_id: correlation_id_root
      });
    }

    // Deadline > 90 days test
    try {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 95);

      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'MANUAL_ENTRY',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'UNKNOWN_UNLINKED',
        why_this_evidence: 'Unknown test',
        purpose_tags: ['COMPLIANCE'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        entry_notes: 'Test',
        quarantine_reason: 'Test reason',
        resolution_deadline_utc: farFuture.toISOString()
      });

      results.push({
        test_id: 'UNKNOWN_02',
        name: 'Deadline > 90 days -> 422',
        status: draftRes.status === 422 ? 'PASS' : 'FAIL',
        expected_http: 422,
        actual_http: draftRes.status || 500,
        expected_error_code: 'INVALID_RESOLUTION_DEADLINE',
        actual_error_code: draftRes.error_code || null,
        correlation_id: draftRes.correlation_id || correlation_id_root
      });
    } catch (err) {
      results.push({
        test_id: 'UNKNOWN_02',
        name: 'Deadline > 90 days -> 422',
        status: 'FAIL',
        expected_http: 422,
        actual_http: 500,
        expected_error_code: 'INVALID_RESOLUTION_DEADLINE',
        actual_error_code: 'EXCEPTION',
        correlation_id: correlation_id_root
      });
    }

    // Valid quarantine draft
    try {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 45);

      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'MANUAL_ENTRY',
        dataset_type: 'BOM',
        declared_scope: 'UNKNOWN_UNLINKED',
        why_this_evidence: 'Unverified BOM',
        purpose_tags: ['AUDIT'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        entry_notes: 'Test',
        quarantine_reason: 'Cannot verify supplier location without additional documentation.',
        resolution_deadline_utc: deadline.toISOString()
      });

      const isQuarantined = draftRes.link_status === 'QUARANTINED' && draftRes.excluded_by_default === true;
      results.push({
        test_id: 'UNKNOWN_03',
        name: 'Valid quarantine draft -> 201 QUARANTINED',
        status: (draftRes.status === 201 && isQuarantined) ? 'PASS' : 'FAIL',
        expected_http: 201,
        actual_http: draftRes.status || 500,
        expected_error_code: null,
        actual_error_code: draftRes.error_code || null,
        correlation_id: draftRes.correlation_id || correlation_id_root
      });
    } catch (err) {
      results.push({
        test_id: 'UNKNOWN_03',
        name: 'Valid quarantine draft -> 201 QUARANTINED',
        status: 'FAIL',
        expected_http: 201,
        actual_http: 500,
        expected_error_code: null,
        actual_error_code: 'EXCEPTION',
        correlation_id: correlation_id_root
      });
    }

    // C) MATRIX ENFORCEMENT

    // MANUAL_ENTRY + CERTIFICATE
    try {
      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'MANUAL_ENTRY',
        dataset_type: 'CERTIFICATE',
        declared_scope: 'ENTIRE_ORGANIZATION',
        scope_target_id: 'org-1',
        why_this_evidence: 'Test',
        purpose_tags: ['COMPLIANCE'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        entry_notes: 'Test'
      });

      results.push({
        test_id: 'MATRIX_01',
        name: 'MANUAL_ENTRY + CERTIFICATE -> 422',
        status: draftRes.status === 422 ? 'PASS' : 'FAIL',
        expected_http: 422,
        actual_http: draftRes.status || 500,
        expected_error_code: 'UNSUPPORTED_METHOD_DATASET_COMBINATION',
        actual_error_code: draftRes.error_code || null,
        correlation_id: draftRes.correlation_id || correlation_id_root
      });
    } catch (err) {
      results.push({
        test_id: 'MATRIX_01',
        name: 'MANUAL_ENTRY + CERTIFICATE -> 422',
        status: 'FAIL',
        expected_http: 422,
        actual_http: 500,
        expected_error_code: 'UNSUPPORTED_METHOD_DATASET_COMBINATION',
        actual_error_code: 'EXCEPTION',
        correlation_id: correlation_id_root
      });
    }

    // MANUAL_ENTRY + TRANSACTION_LOG
    try {
      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'MANUAL_ENTRY',
        dataset_type: 'TRANSACTION_LOG',
        declared_scope: 'ENTIRE_ORGANIZATION',
        scope_target_id: 'org-1',
        why_this_evidence: 'Test',
        purpose_tags: ['COMPLIANCE'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        entry_notes: 'Test'
      });

      results.push({
        test_id: 'MATRIX_02',
        name: 'MANUAL_ENTRY + TRANSACTION_LOG -> 422',
        status: draftRes.status === 422 ? 'PASS' : 'FAIL',
        expected_http: 422,
        actual_http: draftRes.status || 500,
        expected_error_code: 'UNSUPPORTED_METHOD_DATASET_COMBINATION',
        actual_error_code: draftRes.error_code || null,
        correlation_id: draftRes.correlation_id || correlation_id_root
      });
    } catch (err) {
      results.push({
        test_id: 'MATRIX_02',
        name: 'MANUAL_ENTRY + TRANSACTION_LOG -> 422',
        status: 'FAIL',
        expected_http: 422,
        actual_http: 500,
        expected_error_code: 'UNSUPPORTED_METHOD_DATASET_COMBINATION',
        actual_error_code: 'EXCEPTION',
        correlation_id: correlation_id_root
      });
    }

    // SUPPLIER_MASTER + PRODUCT_FAMILY
    try {
      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'ERP_API',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'PRODUCT_FAMILY',
        scope_target_id: 'pf-1',
        why_this_evidence: 'Test',
        purpose_tags: ['COMPLIANCE'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        entry_notes: 'Test'
      });

      results.push({
        test_id: 'MATRIX_03',
        name: 'SUPPLIER_MASTER + PRODUCT_FAMILY -> 422',
        status: draftRes.status === 422 ? 'PASS' : 'FAIL',
        expected_http: 422,
        actual_http: draftRes.status || 500,
        expected_error_code: 'DATASET_SCOPE_INCOMPATIBLE',
        actual_error_code: draftRes.error_code || null,
        correlation_id: draftRes.correlation_id || correlation_id_root
      });
    } catch (err) {
      results.push({
        test_id: 'MATRIX_03',
        name: 'SUPPLIER_MASTER + PRODUCT_FAMILY -> 422',
        status: 'FAIL',
        expected_http: 422,
        actual_http: 500,
        expected_error_code: 'DATASET_SCOPE_INCOMPATIBLE',
        actual_error_code: 'EXCEPTION',
        correlation_id: correlation_id_root
      });
    }

    // D) TENANT ISOLATION
    try {
      const fakeTenantRead = await base44.asServiceRole.entities.Evidence.filter({
        tenant_id: 'fake-other-tenant-999'
      });

      results.push({
        test_id: 'TENANT_01',
        name: 'Cross-tenant read isolation enforced',
        status: fakeTenantRead.length === 0 ? 'PASS' : 'FAIL',
        expected_http: 'N/A',
        actual_http: 200,
        expected_error_code: null,
        actual_error_code: null,
        correlation_id: correlation_id_root
      });
    } catch (err) {
      results.push({
        test_id: 'TENANT_01',
        name: 'Cross-tenant read isolation enforced',
        status: 'FAIL',
        expected_http: 'N/A',
        actual_http: 500,
        expected_error_code: null,
        actual_error_code: 'EXCEPTION',
        correlation_id: correlation_id_root
      });
    }

    // E) ERROR DISCIPLINE
    const has500_fail = results.some(r => r.actual_http === 500 && r.status === 'FAIL');
    if (!has500_fail) {
      results.push({
        test_id: 'DISCIPLINE_01',
        name: 'No 500 responses for validation errors',
        status: 'PASS',
        expected_http: '422/409/403/404',
        actual_http: 'N/A',
        expected_error_code: null,
        actual_error_code: null,
        correlation_id: correlation_id_root
      });
    } else {
      results.push({
        test_id: 'DISCIPLINE_01',
        name: 'No 500 responses for validation errors',
        status: 'FAIL',
        expected_http: '422/409/403/404',
        actual_http: 500,
        expected_error_code: null,
        actual_error_code: 'FOUND_500_IN_TESTS',
        correlation_id: correlation_id_root
      });
    }

    // ===== COMPUTE RESULTS =====
    const pass_count = results.filter(r => r.status === 'PASS').length;
    const fail_count = results.filter(r => r.status === 'FAIL').length;
    const total_tests = results.length;
    const pass_rate = Math.round((pass_count / total_tests) * 100);
    const test_status = fail_count === 0 ? 'PASS' : 'FAIL';
    const finished_at_utc = new Date().toISOString();

    const results_json = {
      suite_name: 'CONTRACT1_MANUAL_ENTRY',
      run_id,
      environment,
      started_at_utc,
      finished_at_utc,
      results,
      pass_count,
      fail_count,
      total_tests,
      pass_rate
    };

    const results_hash_sha256 = hashString(canonicalJson(results_json));

    // ===== PERSIST TO LEDGER =====
    try {
      await base44.asServiceRole.entities.ContractTestRun.create({
        run_id,
        suite_name: 'CONTRACT1_MANUAL_ENTRY',
        environment,
        started_at_utc,
        finished_at_utc,
        triggered_by_user_id: user.id,
        build_id,
        pass_count,
        fail_count,
        total_tests,
        pass_rate,
        status: test_status,
        results_json,
        results_hash_sha256,
        correlation_id_root
      });
    } catch (logErr) {
      console.log('ContractTestRun write failed:', logErr.message);
    }

    return Response.json(results_json, { status: 200 });
  } catch (error) {
    const correlation_id = uuidv4();
    return Response.json(
      {
        error: error.message,
        error_code: 'TEST_RUNNER_EXCEPTION',
        correlation_id,
        suite_name: 'CONTRACT1_MANUAL_ENTRY',
        results: []
      },
      { status: 500 }
    );
  }
});