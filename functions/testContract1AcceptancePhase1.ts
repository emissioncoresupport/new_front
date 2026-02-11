import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const results = {
      phase: 'Phase 1: Core Evidence Vault',
      tests: [],
      passed: 0,
      failed: 0,
      total: 0
    };

    const addTest = (name, passed, details) => {
      results.tests.push({ name, passed, details });
      if (passed) results.passed++;
      else results.failed++;
      results.total++;
    };

    // Test 1: Create MANUAL_ENTRY draft and seal
    try {
      const manualDraft = await base44.functions.invoke('createEvidenceDraft', {
        ingestion_method: 'MANUAL_ENTRY',
        submission_channel: 'INTERNAL_USER',
        evidence_type: 'SUPPLIER_MASTER',
        why_this_evidence: 'Test manual entry for Phase 1 acceptance',
        attestation_notes: 'Acceptance test for manual entry workflow',
        payload_data_json: { test_field: 'test_value', supplier_name: 'Test Supplier' }
      });

      const draftCreated = manualDraft.data?.draft_id;
      const sealResult = draftCreated ? await base44.functions.invoke('sealEvidenceDraft', {
        draft_id: manualDraft.data.draft_id
      }) : null;

      const record = sealResult?.data?.record;
      const hasStableHash = record?.payload_sha256?.length === 64;
      const noAttachmentsRequired = true; // Manual entry doesn't require attachments

      addTest('Manual Entry: Create -> Seal', 
        draftCreated && record && hasStableHash && noAttachmentsRequired,
        { draft_id: manualDraft.data?.draft_id, record_id: record?.id, hash: record?.payload_sha256 });
    } catch (error) {
      addTest('Manual Entry: Create -> Seal', false, { error: error.message });
    }

    // Test 2: Verify FILE_UPLOAD requires attachment
    try {
      const fileDraft = await base44.functions.invoke('createEvidenceDraft', {
        ingestion_method: 'FILE_UPLOAD',
        submission_channel: 'INTERNAL_USER',
        evidence_type: 'CERTIFICATE',
        why_this_evidence: 'Test file upload requirement validation'
      });

      const sealWithoutFile = await base44.functions.invoke('sealEvidenceDraft', {
        draft_id: fileDraft.data.draft_id
      });

      // Should fail with 422
      const correctlyRejected = sealWithoutFile.status === 422;
      
      addTest('File Upload: Require Attachment', correctlyRejected, {
        expected: '422 error when no attachments',
        actual: sealWithoutFile.status
      });
    } catch (error) {
      addTest('File Upload: Require Attachment', false, { error: error.message });
    }

    // Test 3: Verify draft_id persistence (check if draft can be retrieved)
    try {
      const testDraft = await base44.functions.invoke('createEvidenceDraft', {
        ingestion_method: 'MANUAL_ENTRY',
        submission_channel: 'INTERNAL_USER',
        evidence_type: 'OTHER',
        why_this_evidence: 'Test draft persistence and retrieval'
      });

      const draftId = testDraft.data?.draft_id;
      const retrieved = draftId ? await base44.asServiceRole.entities.EvidenceDraft.filter({ id: draftId }) : [];
      
      addTest('Draft Persistence', retrieved.length > 0 && retrieved[0].id === draftId, {
        draft_id: draftId,
        retrieved: retrieved.length > 0
      });
    } catch (error) {
      addTest('Draft Persistence', false, { error: error.message });
    }

    // Test 4: Verify no duplicate payload.txt artifacts
    try {
      const manualDraft2 = await base44.functions.invoke('createEvidenceDraft', {
        ingestion_method: 'MANUAL_ENTRY',
        submission_channel: 'INTERNAL_USER',
        evidence_type: 'BOM',
        why_this_evidence: 'Test no payload.txt artifacts for manual entry',
        payload_data_json: { bom_data: 'test' }
      });

      const attachments = await base44.asServiceRole.entities.EvidenceAttachment.filter({
        evidence_draft_id: manualDraft2.data.draft_id
      });

      const noPayloadTxt = !attachments.some(a => a.file_name === 'payload.txt');
      
      addTest('No payload.txt Artifacts', noPayloadTxt, {
        draft_id: manualDraft2.data.draft_id,
        attachment_count: attachments.length,
        has_payload_txt: !noPayloadTxt
      });
    } catch (error) {
      addTest('No payload.txt Artifacts', false, { error: error.message });
    }

    // Test 5: Immutability check
    try {
      const testDraft3 = await base44.functions.invoke('createEvidenceDraft', {
        ingestion_method: 'MANUAL_ENTRY',
        submission_channel: 'INTERNAL_USER',
        evidence_type: 'TEST_REPORT',
        why_this_evidence: 'Test immutability after seal',
        payload_data_json: { test: 'immutability' }
      });

      const sealed = await base44.functions.invoke('sealEvidenceDraft', {
        draft_id: testDraft3.data.draft_id
      });

      const recordId = sealed.data?.record_id;
      const originalHash = sealed.data?.record?.payload_sha256;

      // Try to update (should fail or be blocked)
      let updateFailed = false;
      try {
        await base44.asServiceRole.entities.EvidenceRecord.update(recordId, {
          payload_sha256: 'tampered_hash'
        });
      } catch {
        updateFailed = true; // Good - update should fail or be meaningless
      }

      const recordAfter = await base44.asServiceRole.entities.EvidenceRecord.filter({ id: recordId });
      const hashUnchanged = recordAfter[0]?.payload_sha256 === originalHash;

      addTest('Record Immutability', hashUnchanged, {
        record_id: recordId,
        original_hash: originalHash,
        hash_unchanged: hashUnchanged
      });
    } catch (error) {
      addTest('Record Immutability', false, { error: error.message });
    }

    return Response.json({
      ...results,
      summary: `Phase 1 Tests: ${results.passed}/${results.total} passed`,
      success: results.failed === 0
    });

  } catch (error) {
    console.error('Acceptance test error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});