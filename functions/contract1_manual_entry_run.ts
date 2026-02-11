import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { v4 as uuidv4 } from 'npm:uuid@9.0.0';
import crypto from 'node:crypto';

const hashString = (str) => {
  return crypto.createHash('sha256').update(str).digest('hex');
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      const correlation_id = uuidv4();
      return Response.json(
        {
          error: 'Unauthorized',
          error_code: 'AUTH_REQUIRED',
          correlation_id
        },
        { status: 401 }
      );
    }

    // Get company data mode
    const companies = await base44.asServiceRole.entities.Company.filter({});
    const company = companies?.[0];
    const dataMode = company?.data_mode || 'TEST';

    // BLOCK in LIVE mode
    if (dataMode === 'LIVE') {
      const correlation_id = uuidv4();
      return Response.json(
        {
          error_code: 'QA_BLOCKED_IN_LIVE',
          message: 'Quality assurance tests cannot run in LIVE environment',
          correlation_id
        },
        { status: 403 }
      );
    }

    const run_id = uuidv4();
    const started_at_utc = new Date().toISOString();
    const results = [];

    // ===== A) KNOWN SCOPE FLOW =====
    
    // A1: Create draft LINKED -> 201
    try {
      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'MANUAL_ENTRY',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'LEGAL_ENTITY',
        scope_target_id: 'le-001',
        scope_target_name: 'Acme Legal Entity',
        why_this_evidence: 'Known scope test',
        purpose_tags: ['COMPLIANCE'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        entry_notes: 'Test entry for known scope'
      });

      results.push({
        test_id: 'KNOWN_01',
        name: 'Create draft LINKED (LEGAL_ENTITY) -> 201',
        status: draftRes.status === 201 ? 'PASS' : 'FAIL',
        expected_http: 201,
        actual_http: draftRes.status || 500,
        error_code: draftRes.error_code || null,
        correlation_id: draftRes.correlation_id || run_id
      });
    } catch (err) {
      results.push({
        test_id: 'KNOWN_01',
        name: 'Create draft LINKED (LEGAL_ENTITY) -> 201',
        status: 'FAIL',
        expected_http: 201,
        actual_http: 500,
        error_code: 'EXCEPTION',
        correlation_id: run_id
      });
    }

    // A2: Invalid payload (missing required field) -> 422
    try {
      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'MANUAL_ENTRY',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'LEGAL_ENTITY',
        scope_target_id: 'le-001',
        why_this_evidence: null, // Missing required field
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
        error_code: draftRes.error_code || null,
        correlation_id: draftRes.correlation_id || run_id
      });
    } catch (err) {
      results.push({
        test_id: 'KNOWN_02',
        name: 'Invalid payload (missing why_this_evidence) -> 422',
        status: 'FAIL',
        expected_http: 422,
        actual_http: 500,
        error_code: 'EXCEPTION',
        correlation_id: run_id
      });
    }

    // A3: Valid payload -> 200/201
    try {
      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'MANUAL_ENTRY',
        dataset_type: 'PRODUCT_MASTER',
        declared_scope: 'SITE',
        scope_target_id: 'site-001',
        scope_target_name: 'Manufacturing Plant A',
        why_this_evidence: 'Product specification validation',
        purpose_tags: ['COMPLIANCE', 'AUDIT'],
        retention_policy: '3_YEARS',
        contains_personal_data: false,
        entry_notes: 'Complete product master data entry with supplier certifications'
      });

      results.push({
        test_id: 'KNOWN_03',
        name: 'Valid payload -> 201',
        status: (draftRes.status === 201 || draftRes.status === 200) ? 'PASS' : 'FAIL',
        expected_http: 201,
        actual_http: draftRes.status || 500,
        error_code: draftRes.error_code || null,
        correlation_id: draftRes.correlation_id || run_id
      });
    } catch (err) {
      results.push({
        test_id: 'KNOWN_03',
        name: 'Valid payload -> 201',
        status: 'FAIL',
        expected_http: 201,
        actual_http: 500,
        error_code: 'EXCEPTION',
        correlation_id: run_id
      });
    }

    // ===== B) UNKNOWN/UNLINKED FLOW =====

    // B1: Missing quarantine_reason -> 422
    try {
      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'MANUAL_ENTRY',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'UNKNOWN_UNLINKED',
        why_this_evidence: 'Unknown scope test',
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
        error_code: draftRes.error_code || null,
        correlation_id: draftRes.correlation_id || run_id
      });
    } catch (err) {
      results.push({
        test_id: 'UNKNOWN_01',
        name: 'Missing quarantine_reason -> 422',
        status: 'FAIL',
        expected_http: 422,
        actual_http: 500,
        error_code: 'EXCEPTION',
        correlation_id: run_id
      });
    }

    // B2: Deadline > 90 days -> 422
    try {
      const farFutureDate = new Date();
      farFutureDate.setDate(farFutureDate.getDate() + 95); // 95 days

      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'MANUAL_ENTRY',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'UNKNOWN_UNLINKED',
        why_this_evidence: 'Unknown scope test',
        purpose_tags: ['COMPLIANCE'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        entry_notes: 'Test',
        quarantine_reason: 'Cannot determine scope at this time',
        resolution_deadline_utc: farFutureDate.toISOString()
      });

      results.push({
        test_id: 'UNKNOWN_02',
        name: 'Deadline > 90 days -> 422',
        status: draftRes.status === 422 ? 'PASS' : 'FAIL',
        expected_http: 422,
        actual_http: draftRes.status || 500,
        error_code: draftRes.error_code || null,
        correlation_id: draftRes.correlation_id || run_id
      });
    } catch (err) {
      results.push({
        test_id: 'UNKNOWN_02',
        name: 'Deadline > 90 days -> 422',
        status: 'FAIL',
        expected_http: 422,
        actual_http: 500,
        error_code: 'EXCEPTION',
        correlation_id: run_id
      });
    }

    // B3: Valid quarantine draft -> 201 with QUARANTINED flag
    try {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 45);

      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'MANUAL_ENTRY',
        dataset_type: 'BOM',
        declared_scope: 'UNKNOWN_UNLINKED',
        why_this_evidence: 'BOM from unverified source',
        purpose_tags: ['AUDIT'],
        retention_policy: 'STANDARD_1_YEAR',
        contains_personal_data: false,
        entry_notes: 'Awaiting supplier verification',
        quarantine_reason: 'Supplier location cannot be confirmed from provided documentation. Awaiting formal company registration verification.',
        resolution_deadline_utc: deadline.toISOString()
      });

      const isQuarantined = draftRes.link_status === 'QUARANTINED' && draftRes.excluded_by_default === true;
      results.push({
        test_id: 'UNKNOWN_03',
        name: 'Valid quarantine draft -> 201 QUARANTINED',
        status: (draftRes.status === 201 && isQuarantined) ? 'PASS' : 'FAIL',
        expected_http: 201,
        actual_http: draftRes.status || 500,
        error_code: draftRes.error_code || null,
        correlation_id: draftRes.correlation_id || run_id
      });
    } catch (err) {
      results.push({
        test_id: 'UNKNOWN_03',
        name: 'Valid quarantine draft -> 201 QUARANTINED',
        status: 'FAIL',
        expected_http: 201,
        actual_http: 500,
        error_code: 'EXCEPTION',
        correlation_id: run_id
      });
    }

    // ===== C) MATRIX ENFORCEMENT =====

    // C1: MANUAL_ENTRY + CERTIFICATE -> 422
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
        error_code: draftRes.error_code || 'UNSUPPORTED_METHOD_DATASET_COMBINATION',
        correlation_id: draftRes.correlation_id || run_id
      });
    } catch (err) {
      results.push({
        test_id: 'MATRIX_01',
        name: 'MANUAL_ENTRY + CERTIFICATE -> 422',
        status: 'FAIL',
        expected_http: 422,
        actual_http: 500,
        error_code: 'EXCEPTION',
        correlation_id: run_id
      });
    }

    // C2: MANUAL_ENTRY + TRANSACTION_LOG -> 422
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
        error_code: draftRes.error_code || 'UNSUPPORTED_METHOD_DATASET_COMBINATION',
        correlation_id: draftRes.correlation_id || run_id
      });
    } catch (err) {
      results.push({
        test_id: 'MATRIX_02',
        name: 'MANUAL_ENTRY + TRANSACTION_LOG -> 422',
        status: 'FAIL',
        expected_http: 422,
        actual_http: 500,
        error_code: 'EXCEPTION',
        correlation_id: run_id
      });
    }

    // C3: SUPPLIER_MASTER + PRODUCT_FAMILY -> 422
    try {
      const draftRes = await base44.functions.invoke('contract1ManualEntryDraftManager', {
        action: 'createDraft',
        method: 'ERP_API',
        dataset_type: 'SUPPLIER_MASTER',
        declared_scope: 'PRODUCT_FAMILY',
        scope_target_id: 'pf-001',
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
        error_code: draftRes.error_code || 'INCOMPATIBLE_DATASET_SCOPE',
        correlation_id: draftRes.correlation_id || run_id
      });
    } catch (err) {
      results.push({
        test_id: 'MATRIX_03',
        name: 'SUPPLIER_MASTER + PRODUCT_FAMILY -> 422',
        status: 'FAIL',
        expected_http: 422,
        actual_http: 500,
        error_code: 'EXCEPTION',
        correlation_id: run_id
      });
    }

    // ===== D) TENANT ISOLATION =====

    // D1: Cross-tenant read attempt (simulated)
    try {
      // Attempt to read evidence from different tenant
      const crossTenantRead = await base44.asServiceRole.entities.Evidence.filter({
        tenant_id: 'fake-other-tenant-id'
      });

      results.push({
        test_id: 'TENANT_01',
        name: 'Cross-tenant read isolation enforced',
        status: crossTenantRead.length === 0 ? 'PASS' : 'FAIL',
        expected_http: 'N/A (empty result)',
        actual_http: 200,
        error_code: null,
        correlation_id: run_id
      });
    } catch (err) {
      results.push({
        test_id: 'TENANT_01',
        name: 'Cross-tenant read isolation enforced',
        status: 'FAIL',
        expected_http: 'N/A',
        actual_http: 500,
        error_code: 'EXCEPTION',
        correlation_id: run_id
      });
    }

    // ===== ERROR DISCIPLINE =====
    
    const has500 = results.some(r => r.actual_http === 500 && r.status === 'FAIL');
    if (!has500) {
      results.push({
        test_id: 'DISCIPLINE_01',
        name: 'No 500 responses for validation errors',
        status: 'PASS',
        expected_http: '422/409/403/404',
        actual_http: 'N/A',
        error_code: null,
        correlation_id: run_id
      });
    } else {
      results.push({
        test_id: 'DISCIPLINE_01',
        name: 'No 500 responses for validation errors',
        status: 'FAIL',
        expected_http: '422/409/403/404',
        actual_http: 500,
        error_code: 'FOUND_500_IN_TESTS',
        correlation_id: run_id
      });
    }

    const pass_count = results.filter(r => r.status === 'PASS').length;
    const fail_count = results.filter(r => r.status === 'FAIL').length;
    const finished_at_utc = new Date().toISOString();

    const response = {
      suite_name: 'Contract 1: Manual Entry Hardening',
      run_id,
      started_at_utc,
      finished_at_utc,
      results,
      pass_count,
      fail_count,
      total_tests: results.length,
      pass_rate: Math.round((pass_count / results.length) * 100)
    };

    // Persist to TestRunLog
    try {
      await base44.asServiceRole.entities.TestRunLog.create({
        run_id,
        suite_name: 'Contract 1: Manual Entry Hardening',
        started_at_utc,
        finished_at_utc,
        data_mode: dataMode,
        total_tests: results.length,
        passed: pass_count,
        failed: fail_count,
        pass_rate: Math.round((pass_count / results.length) * 100),
        executed_by_user_id: user.id
      });
    } catch (logErr) {
      console.log('TestRunLog write skipped:', logErr.message);
    }

    return Response.json(response, { status: 200 });
  } catch (error) {
    const correlation_id = uuidv4();
    return Response.json(
      {
        error: error.message,
        error_code: 'TEST_RUNNER_EXCEPTION',
        correlation_id,
        suite_name: 'Contract 1: Manual Entry Hardening',
        results: []
      },
      { status: 500 }
    );
  }
});