import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * METHOD CONTRACT REGISTRY — Single Source of Truth
 * 
 * Defines per-method:
 * - Required metadata fields
 * - Source system enforcement
 * - Payload handling rules
 * - GDPR requirements
 */

const METHOD_CONTRACTS = {
  MANUAL_ENTRY: {
    required_fields: ['entry_notes', 'attestor_user_id', 'dataset_type', 'declared_scope', 'primary_intent', 'purpose_tags', 'retention_policy'],
    forced_source_system: 'INTERNAL_MANUAL',
    allowed_declared_scopes: ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY', 'UNKNOWN'],
    payload_mode: 'structured_form_only',
    disallows: ['file_upload', 'raw_json_paste'],
    requires_gdpr_if_personal_data: true,
    description: 'Manual data entry by authenticated user with attestation'
  },
  FILE_UPLOAD: {
    required_fields: ['dataset_type', 'declared_scope', 'primary_intent', 'purpose_tags', 'retention_policy'],
    allowed_source_systems: ['OTHER', 'SAP', 'MICROSOFT_DYNAMICS', 'ODOO', 'ORACLE', 'NETSUITE'],
    requires_friendly_name_if_other: true,
    allowed_declared_scopes: ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY', 'UNKNOWN'],
    payload_mode: 'file_upload_or_paste',
    requires_gdpr_if_personal_data: true,
    description: 'File upload with optional paste, captures file metadata'
  },
  API_PUSH: {
    required_fields: ['external_reference_id', 'dataset_type', 'declared_scope', 'primary_intent', 'purpose_tags', 'retention_policy'],
    allowed_source_systems: ['OTHER', 'SAP', 'MICROSOFT_DYNAMICS', 'ODOO', 'ORACLE', 'NETSUITE'],
    requires_friendly_name_if_other: true,
    allowed_declared_scopes: ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY', 'UNKNOWN'],
    payload_mode: 'client_provided_json',
    disallows: ['file_upload'],
    idempotency_key: 'external_reference_id',
    requires_gdpr_if_personal_data: true,
    description: 'API push with external reference for idempotency'
  },
  ERP_EXPORT: {
    required_fields: ['snapshot_datetime_utc', 'export_job_id', 'dataset_type', 'declared_scope', 'primary_intent', 'purpose_tags', 'retention_policy'],
    allowed_source_systems: ['SAP', 'MICROSOFT_DYNAMICS', 'ODOO', 'ORACLE', 'NETSUITE', 'OTHER'],
    requires_friendly_name: true,
    allowed_declared_scopes: ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY'],
    payload_mode: 'file_upload_mandatory',
    disallows: ['raw_json_paste'],
    requires_gdpr_if_personal_data: true,
    description: 'Batch ERP export file with snapshot timestamp'
  },
  ERP_API: {
    required_fields: ['snapshot_datetime_utc', 'connector_reference', 'dataset_type', 'declared_scope', 'primary_intent', 'purpose_tags', 'retention_policy'],
    allowed_source_systems: ['SAP', 'MICROSOFT_DYNAMICS', 'ODOO', 'ORACLE', 'NETSUITE'],
    requires_friendly_name: true,
    allowed_declared_scopes: ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY'],
    payload_mode: 'server_side_fetch_only',
    disallows: ['file_upload', 'raw_json_paste', 'client_payload'],
    credentials_handling: 'never_in_payload_or_logs',
    requires_gdpr_if_personal_data: true,
    description: 'Server-side API fetch using connector, credentials protected'
  },
  SUPPLIER_PORTAL: {
    required_fields: ['supplier_portal_request_id', 'dataset_type', 'declared_scope', 'primary_intent', 'purpose_tags', 'retention_policy'],
    forced_source_system: 'SUPPLIER_PORTAL',
    allowed_declared_scopes: ['SITE', 'PRODUCT_FAMILY', 'LEGAL_ENTITY'],
    payload_mode: 'portal_submission_only',
    disallows: ['file_upload', 'raw_json_paste', 'manual_entry'],
    requires_gdpr_if_personal_data: true,
    description: 'Supplier portal submission bound to supplier identity'
  }
};

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ ok: false, error: 'GET only' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    
    // Optional auth (public registry for UI, but could restrict to authenticated users)
    try {
      await base44.auth.me();
    } catch (e) {
      // Allow unauthenticated access to registry schema
    }

    const url = new URL(req.url);
    const method = url.searchParams.get('method');

    if (method) {
      if (!METHOD_CONTRACTS[method]) {
        return Response.json({
          ok: false,
          error_code: 'UNKNOWN_METHOD',
          message: `Method ${method} not found in registry`
        }, { status: 404 });
      }

      return Response.json({
        ok: true,
        method,
        contract: METHOD_CONTRACTS[method]
      }, { status: 200 });
    }

    // Return all contracts
    return Response.json({
      ok: true,
      contracts: METHOD_CONTRACTS,
      methods: Object.keys(METHOD_CONTRACTS)
    }, { status: 200 });

  } catch (error) {
    console.error('[METHOD_CONTRACT_REGISTRY]', error);
    return Response.json({
      ok: false,
      error_code: 'INTERNAL_ERROR',
      message: error.message
    }, { status: 500 });
  }
});