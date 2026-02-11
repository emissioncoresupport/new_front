import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * TASK D: Unified draft upsert endpoint
 * Creates new draft OR updates existing draft
 * ALWAYS returns draft_id - never returns undefined or 422 on missing draft
 */

function createErrorResponse(errorCode, humanMessage, fieldErrors = {}, correlationId, status = 400) {
  return Response.json({
    error: humanMessage,
    error_code: errorCode,
    field_errors: fieldErrors,
    correlation_id: correlationId
  }, { status });
}

function generateCorrelationId() {
  return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

Deno.serve(async (req) => {
  const correlationId = generateCorrelationId();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return createErrorResponse('UNAUTHORIZED', 'User not authenticated', {}, correlationId, 401);
    }

    const payload = await req.json();
    const {
      draft_id,
      ingestion_method,
      provenance_source = 'INTERNAL',
      evidence_type,
      declared_scope,
      source_system,
      bound_entity_id,
      purpose_explanation,
      purpose_tags = [],
      retention_policy = 'STANDARD_7_YEARS',
      contains_personal_data = false,
      external_reference_id,
      attestation_notes,
      trust_level,
      payload_data_json,
      payload_digest_sha256,
      received_at_utc,
      binding_mode,
      binding_target_type,
      reconciliation_hint,
      correlation_id: incomingCorrelationId
    } = payload;

    const tenant_id = user.email.split('@')[1] || 'default';
    const isUpdate = !!draft_id;

    // Validation
    const field_errors = {};
    const finalPurpose = purpose_explanation;
    
    if (!isUpdate) {
      // CREATE validation
      if (!ingestion_method) field_errors.ingestion_method = 'Required';
      if (!evidence_type) field_errors.evidence_type = 'Required';
      if (!declared_scope) field_errors.declared_scope = 'Required';
      if (!finalPurpose || finalPurpose.length < 20) {
        field_errors.purpose_explanation = 'Required (minimum 20 characters)';
      }

      // External reference ID validation (method-specific)
      const requiresExternalRef = ['API_PUSH_DIGEST', 'ERP_EXPORT_FILE', 'ERP_API_PULL'];
      if (requiresExternalRef.includes(ingestion_method)) {
        if (!external_reference_id || external_reference_id.trim().length < 3) {
          field_errors.external_reference_id = 'Required for this method (3-120 chars)';
        }
      }
    }

    // Binding mode validation
    const normalizedBindingMode = binding_mode?.toUpperCase();
    
    if (normalizedBindingMode === 'BIND_EXISTING' || normalizedBindingMode === 'CREATE_NEW') {
      if (!bound_entity_id) {
        field_errors.bound_entity_id = normalizedBindingMode === 'BIND_EXISTING' 
          ? 'Please select an entity' 
          : 'Please create entity first';
      }
    }
    // DEFER: no required fields



    if (Object.keys(field_errors).length > 0) {
      return createErrorResponse(
        'VALIDATION_FAILED',
        'Please fix validation errors',
        field_errors,
        incomingCorrelationId || correlationId,
        422
      );
    }

    let result;

    if (isUpdate) {
      // UPDATE existing draft
      const drafts = await base44.asServiceRole.entities.EvidenceDraft.filter({ 
        id: draft_id,
        tenant_id 
      });
      
      if (!drafts.length) {
        return createErrorResponse(
          'DRAFT_NOT_FOUND',
          'Draft not found or access denied',
          {},
          incomingCorrelationId || correlationId,
          404
        );
      }

      const draft = drafts[0];

      if (draft.status === 'SEALED') {
        return createErrorResponse(
          'DRAFT_SEALED',
          'Cannot update sealed draft',
          { status: 'Draft is sealed and immutable' },
          incomingCorrelationId || correlationId,
          422
        );
      }

      // Build update payload
      const updates = { updated_at_utc: new Date().toISOString() };
      if (evidence_type) updates.evidence_type = evidence_type;
      if (declared_scope) updates.declared_scope = declared_scope;
      if (purpose_explanation) updates.purpose_explanation = purpose_explanation;
      if (purpose_tags) updates.purpose_tags = purpose_tags;
      if (retention_policy) updates.retention_policy = retention_policy;
      if (typeof contains_personal_data === 'boolean') updates.contains_personal_data = contains_personal_data;
      if (attestation_notes) updates.attestation_notes = attestation_notes;
      if (payload_data_json) updates.payload_data_json = payload_data_json;
      if (payload_digest_sha256) updates.payload_digest_sha256 = payload_digest_sha256;
      if (provenance_source) updates.provenance_source = provenance_source;
      if (external_reference_id !== undefined) updates.external_reference_id = external_reference_id;
      
      // Binding fields
      const normalizedMode = binding_mode?.toUpperCase();
      if (normalizedMode) {
        updates.binding_mode = normalizedMode;
        
        if (normalizedMode === 'DEFER') {
          updates.reconciliation_status = 'UNBOUND';
          updates.trust_level = 'LOW';
          updates.review_status = 'NOT_REVIEWED';
          updates.binding_target_type = binding_target_type || null;
          updates.reconciliation_hint = reconciliation_hint || null;
        } else if (normalizedMode === 'BIND_EXISTING' || normalizedMode === 'CREATE_NEW') {
          updates.reconciliation_status = 'BOUND';
          updates.binding_target_type = binding_target_type || null;
          updates.bound_entity_id = bound_entity_id || null;
        }
      }

      result = await base44.asServiceRole.entities.EvidenceDraft.update(draft_id, updates);

    } else {
      // CREATE new draft
      // Set trust_level = LOW and review_status = NOT_REVIEWED for defer mode
      const isDeferMode = binding_mode === 'defer' || binding_mode === 'DEFER';
      
      let computed_trust_level = trust_level;
      if (!computed_trust_level) {
        if (ingestion_method === 'MANUAL_ENTRY' || isDeferMode) {
          computed_trust_level = 'LOW';
        } else if (ingestion_method === 'ERP_API_PULL' || ingestion_method === 'ERP_EXPORT_FILE') {
          computed_trust_level = 'HIGH';
        } else {
          computed_trust_level = 'MEDIUM';
        }
      }

      const review_status = isDeferMode ? 'NOT_REVIEWED' : 
        (computed_trust_level === 'LOW' ? 'PENDING_REVIEW' : 'NOT_REVIEWED');
      
      const reconciliation_status = isDeferMode ? 'UNBOUND' : null;

      const normalizedMode = binding_mode?.toUpperCase();
      
      // Compute trust/review defaults based on mode and method
      let finalTrustLevel = trust_level || computed_trust_level;
      let finalReviewStatus = review_status;
      let finalReconciliationStatus = reconciliation_status;
      
      if (normalizedMode === 'DEFER') {
        finalTrustLevel = 'LOW';
        finalReviewStatus = 'NOT_REVIEWED';
        finalReconciliationStatus = 'UNBOUND';
      } else if (normalizedMode === 'BIND_EXISTING' || normalizedMode === 'CREATE_NEW') {
        finalReconciliationStatus = 'BOUND';
      }
      
      result = await base44.asServiceRole.entities.EvidenceDraft.create({
        tenant_id,
        status: 'DRAFT',
        ingestion_method,
        provenance_source,
        evidence_type,
        declared_scope,
        source_system: source_system || null,
        bound_entity_id: bound_entity_id || null,
        binding_target_type: binding_target_type || null,
        purpose_explanation: finalPurpose,
        purpose_tags,
        retention_policy,
        contains_personal_data,
        external_reference_id: external_reference_id || null,
        attestation_notes: attestation_notes || null,
        trust_level: finalTrustLevel,
        review_status: finalReviewStatus,
        reconciliation_status: finalReconciliationStatus,
        payload_data_json: payload_data_json || null,
        payload_digest_sha256: payload_digest_sha256 || null,
        received_at_utc: received_at_utc || null,
        binding_mode: normalizedMode || null,
        reconciliation_hint: reconciliation_hint || null,
        created_by_user_id: user.id,
        created_at_utc: new Date().toISOString(),
        updated_at_utc: new Date().toISOString()
      });
    }

    return Response.json({ 
      success: true,
      draft_id: result.id,
      correlation_id: incomingCorrelationId || correlationId,
      status: result.status,
      trust_level: result.trust_level,
      review_status: result.review_status
    });

  } catch (error) {
    console.error(`[upsertEvidenceDraft] ${correlationId}:`, error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      error.message || 'Internal server error',
      {},
      correlationId,
      500
    );
  }
});