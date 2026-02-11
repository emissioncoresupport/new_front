import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PHASE E: Structured error responses with correlation IDs
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
      ingestion_method,
      submission_channel = 'INTERNAL_USER',
      evidence_type,
      source_system,
      binding_context_id,
      why_this_evidence,
      purpose_tags = [],
      retention_policy = 'STANDARD_7_YEARS',
      contains_personal_data = false,
      external_reference_id,
      attestation_notes,
      trust_level,
      collaboration_submission_id,
      payload_data_json,
      payload_digest_sha256,
      received_at_utc,
      correlation_id: incomingCorrelationId
    } = payload;

    // Validation
    const field_errors = {};
    
    if (!ingestion_method) {
      field_errors.ingestion_method = 'Required';
    }
    if (!evidence_type) {
      field_errors.evidence_type = 'Required';
    }
    
    // Validate that why_this_evidence is provided and meets minimum length
    if (!why_this_evidence || why_this_evidence.length < 20) {
      field_errors.why_this_evidence = 'Required (minimum 20 characters)';
    }
    
    // Validate scope target if provided
    if (binding_context_id) {
      try {
        const contexts = await base44.asServiceRole.entities.BindingContext.filter({ id: binding_context_id });
        if (!contexts || contexts.length === 0) {
          field_errors.binding_context_id = 'Invalid scope target - entity not found';
        }
      } catch (e) {
        field_errors.binding_context_id = 'Unable to validate scope target';
      }
    }
    
    // MANUAL_ENTRY requires attestation_notes
    if (ingestion_method === 'MANUAL_ENTRY' && 
        (!attestation_notes || attestation_notes.length < 20)) {
      field_errors.attestation_notes = 'Required for manual entry (minimum 20 characters)';
    }

    // API_PUSH_DIGEST_ONLY requires digest and timestamp
    if (ingestion_method === 'API_PUSH_DIGEST_ONLY') {
      if (!payload_digest_sha256 || payload_digest_sha256.length !== 64) {
        field_errors.payload_digest_sha256 = 'Valid 64-character hex digest required';
      }
      if (!received_at_utc) {
        field_errors.received_at_utc = 'Required for API push digest';
      }
      if (!external_reference_id) {
        field_errors.external_reference_id = 'Required for API push (idempotency key)';
      }
    }

    // ERP_EXPORT_FILE and ERP_API_PULL require external_reference_id
    if ((ingestion_method === 'ERP_EXPORT_FILE' || ingestion_method === 'ERP_API_PULL') && !external_reference_id) {
      field_errors.external_reference_id = `Required for ${ingestion_method}`;
    }

    if (Object.keys(field_errors).length > 0) {
      return createErrorResponse(
        'VALIDATION_FAILED',
        'Please fix validation errors',
        field_errors,
        incomingCorrelationId || correlationId,
        422
      );
    }

    // Determine tenant_id from user email
    const tenant_id = user.email.split('@')[1] || 'default';

    // Set trust level based on ingestion method defaults
    let computed_trust_level = trust_level;
    if (!computed_trust_level) {
      if (ingestion_method === 'MANUAL_ENTRY') {
        computed_trust_level = 'LOW';
      } else if (ingestion_method === 'ERP_API_PULL' || ingestion_method === 'ERP_EXPORT_FILE') {
        computed_trust_level = 'HIGH';
      } else {
        computed_trust_level = 'MEDIUM';
      }
    }

    // Set review status
    const review_status = (computed_trust_level === 'LOW') 
      ? 'PENDING_REVIEW' 
      : 'NOT_REVIEWED';

    // Create draft
    const draft = await base44.asServiceRole.entities.EvidenceDraft.create({
      tenant_id,
      status: 'DRAFT',
      ingestion_method,
      submission_channel,
      evidence_type,
      source_system: source_system || null,
      binding_context_id: binding_context_id || null,
      why_this_evidence: why_this_evidence || null,
      purpose_tags: purpose_tags || [],
      retention_policy,
      contains_personal_data,
      external_reference_id: external_reference_id || null,
      attestation_notes: attestation_notes || null,
      trust_level: computed_trust_level,
      review_status,
      collaboration_submission_id: collaboration_submission_id || null,
      payload_data_json: payload_data_json || null,
      payload_digest_sha256: payload_digest_sha256 || null,
      received_at_utc: received_at_utc || null
    });

    return Response.json({ 
      success: true,
      draft_id: draft.id,
      correlation_id: incomingCorrelationId || correlationId,
      status: draft.status,
      trust_level: draft.trust_level,
      review_status: draft.review_status
    });

  } catch (error) {
    console.error(`[createEvidenceDraft] ${correlationId}:`, error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      error.message || 'Internal server error',
      {},
      correlationId,
      500
    );
  }
});