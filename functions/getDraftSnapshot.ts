import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * GET /api/evidence/drafts/{draft_id}/snapshot
 * Returns comprehensive draft state for preview/validation
 * Enforces tenant isolation, never returns empty 200
 */
Deno.serve(async (req) => {
  const correlationId = crypto.randomUUID();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ 
        error: 'Unauthorized',
        correlation_id: correlationId 
      }, { status: 401 });
    }

    // Extract draft_id from URL
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const draftId = pathSegments[pathSegments.length - 2]; // .../drafts/{id}/snapshot

    if (!draftId) {
      return Response.json({
        error: 'Missing draft_id in path',
        correlation_id: correlationId
      }, { status: 400 });
    }

    // Fetch draft with tenant enforcement
    const drafts = await base44.entities.EvidenceDraft.filter({ 
      id: draftId,
      tenant_id: user.email.split('@')[1] || 'default' 
    });

    if (!drafts || drafts.length === 0) {
      return Response.json({
        error: 'Draft not found or access denied',
        correlation_id: correlationId
      }, { status: 404 });
    }

    const draft = drafts[0];

    // Validation summary
    const missingFields = [];
    let isValidStep1 = true;
    let isValidStep2 = true;

    // Step 1 validation
    if (!draft.evidence_type) {
      missingFields.push('Evidence type is required');
      isValidStep1 = false;
    }
    if (!draft.declared_scope) {
      missingFields.push('Declared scope is required');
      isValidStep1 = false;
    }
    if (!draft.purpose_explanation || draft.purpose_explanation.length < 20) {
      missingFields.push('Purpose explanation must be at least 20 characters');
      isValidStep1 = false;
    }

    // Step 2 validation (manual entry payload)
    if (draft.ingestion_method === 'MANUAL_ENTRY') {
      if (!draft.payload_data_json || Object.keys(draft.payload_data_json).length === 0) {
        missingFields.push('Manual entry data is required');
        isValidStep2 = false;
      } else {
        // Evidence type specific validation
        if (draft.evidence_type === 'SUPPLIER_MASTER') {
          if (!draft.payload_data_json.legal_name) missingFields.push('Supplier legal name');
          if (!draft.payload_data_json.country_code) missingFields.push('Supplier country');
          if (!draft.payload_data_json.primary_contact_email) missingFields.push('Supplier contact email');
        } else if (draft.evidence_type === 'PRODUCT_MASTER') {
          if (!draft.payload_data_json.product_name) missingFields.push('Product name');
          if (!draft.payload_data_json.sku_code) missingFields.push('Product SKU');
        } else if (draft.evidence_type === 'BOM') {
          if (!draft.payload_data_json.parent_sku) missingFields.push('BOM parent SKU');
          if (!draft.payload_data_json.components || draft.payload_data_json.components.length === 0) {
            missingFields.push('BOM must have at least one component');
          }
        }
      }

      // Attestation required for manual entry
      if (!draft.attestation_notes || draft.attestation_notes.length < 20) {
        missingFields.push('Attestation notes (minimum 20 characters)');
        isValidStep2 = false;
      }
    }

    // Canonical payload (server-serialized for preview)
    const canonicalPayload = draft.payload_data_json 
      ? JSON.stringify(draft.payload_data_json, null, 2)
      : null;

    // Determine reconciliation status
    const reconciliationStatus = draft.binding_mode === 'DEFER' ? 'UNBOUND' : 
                                  draft.bound_entity_id ? 'BOUND' : 'UNBOUND';

    // Build response
    const snapshot = {
      draft_id: draft.id,
      tenant_id: draft.tenant_id,
      ingestion_method: draft.ingestion_method,
      evidence_type: draft.evidence_type,
      declared_scope: draft.declared_scope,
      binding_mode: draft.binding_mode,
      target_entity: draft.bound_entity_id || null,
      purpose_text: draft.purpose_explanation,
      provenance_source: draft.provenance_source || 'INTERNAL',
      external_ref_id: draft.external_reference_id || null,
      payload: draft.payload_data_json || {},
      trust_level: draft.trust_level || 'LOW',
      review_status: draft.review_status || 'NOT_REVIEWED',
      reconciliation_status: reconciliationStatus,
      draft_status: draft.status || 'DRAFT',
      validation_summary: {
        is_valid_step1: isValidStep1,
        is_valid_step2: isValidStep2,
        missing_fields: missingFields
      },
      canonical_payload_json: canonicalPayload,
      correlation_id: correlationId,
      updated_at: draft.updated_at_utc || draft.updated_date
    };

    return Response.json(snapshot, { status: 200 });

  } catch (error) {
    console.error('[getDraftSnapshot] Error:', error);
    return Response.json({
      error: error.message || 'Internal server error',
      correlation_id: correlationId
    }, { status: 500 });
  }
});