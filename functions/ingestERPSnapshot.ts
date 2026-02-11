import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ERP SNAPSHOT ADAPTER
 * 
 * Thin wrapper over universal ingestEvidence core.
 * Parses ERP payload, delegates to core.
 * 
 * Isomorphic to all other ingestion paths.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      tenant_id,
      contract_id,
      entity_context_id,
      erp_vendor,
      snapshot_timestamp,
      snapshot_payload,
      command_id
    } = await req.json();

    // VALIDATION BLOCK 1: Required fields
    if (!tenant_id || !contract_id || !entity_context_id || !erp_vendor || !snapshot_timestamp || !snapshot_payload || !command_id) {
      return Response.json({
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'Missing required fields',
        required: ['tenant_id', 'contract_id', 'entity_context_id', 'erp_vendor', 'snapshot_timestamp', 'snapshot_payload', 'command_id']
      }, { status: 400 });
    }

    // VALIDATION BLOCK 2: Idempotency check
    const existingEvent = await base44.asServiceRole.entities.LedgerEvent.filter({
      command_id,
      tenant_id
    });

    if (existingEvent.length > 0) {
      return Response.json({
        success: false,
        error: 'DUPLICATE_COMMAND',
        message: 'This command_id has already been processed',
        command_id
      }, { status: 409 });
    }

    // VALIDATION BLOCK 3: Profile validation (ACTIVE required)
    const profile = await base44.asServiceRole.entities.IngestionProfile.get(contract_id);

    if (!profile) {
      return Response.json({
        success: false,
        error: 'PROFILE_NOT_FOUND',
        message: 'Ingestion profile does not exist',
        profile_id: contract_id
      }, { status: 404 });
    }

    if (profile.tenant_id !== tenant_id) {
      return Response.json({
        success: false,
        error: 'TENANT_MISMATCH',
        message: 'Profile tenant_id does not match request tenant_id'
      }, { status: 403 });
    }

    if (profile.status !== 'ACTIVE') {
      return Response.json({
        success: false,
        error: 'PROFILE_NOT_ACTIVE',
        message: `Profile status is ${profile.status}, must be ACTIVE to ingest. Activate profile first.`,
        current_status: profile.status,
        action: 'activateIngestionProfile'
      }, { status: 403 });
    }

    if (profile.ingestion_path !== 'ERP') {
      return Response.json({
        success: false,
        error: 'INVALID_INGESTION_PATH',
        message: 'Profile ingestion_path must be ERP',
        current_path: profile.ingestion_path
      }, { status: 403 });
    }

    if (profile.authority_type !== 'Declarative') {
      return Response.json({
        success: false,
        error: 'INVALID_AUTHORITY_TYPE',
        message: 'ERP Snapshot must be Declarative authority type',
        current_type: profile.authority_type
      }, { status: 403 });
    }

    // VALIDATION BLOCK 4: Entity context validation
    const entityType = profile.entity_type;
    let entity;

    if (entityType === 'supplier') {
      entity = await base44.asServiceRole.entities.Supplier.get(entity_context_id);
    } else if (entityType === 'facility') {
      entity = await base44.asServiceRole.entities.SupplierSite.get(entity_context_id);
    } else if (entityType === 'product') {
      entity = await base44.asServiceRole.entities.Product.get(entity_context_id);
    } else if (entityType === 'shipment') {
      entity = await base44.asServiceRole.entities.LogisticsShipment.get(entity_context_id);
    }

    if (!entity) {
      return Response.json({
        success: false,
        error: 'ENTITY_NOT_FOUND',
        message: `Entity ${entity_context_id} does not exist`,
        entity_type: entityType
      }, { status: 404 });
    }

    if (entity.status === 'QUARANTINED') {
      return Response.json({
        success: false,
        error: 'ENTITY_QUARANTINED',
        message: 'Cannot ingest ERP data for quarantined entity',
        entity_id: entity_context_id
      }, { status: 403 });
    }

    // COMPUTE SNAPSHOT HASH
    const payloadString = JSON.stringify(snapshot_payload);
    const encoder = new TextEncoder();
    const data = encoder.encode(payloadString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const snapshot_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // CREATE EVIDENCE RECORD (NO ENTITY CREATION)
    const evidence = await base44.asServiceRole.entities.Evidence.create({
      tenant_id,
      evidence_id: `ERP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      contract_id,
      ingestion_path: 'erp_snapshot',
      declared_context: {
        entity_type: entityType,
        intended_use: contract.data_domain || 'general',
        source_role: 'system',
        reason: `ERP Snapshot from ${erp_vendor}`
      },
      file_url: null,
      file_hash_sha256: null,
      declaration_hash_sha256: snapshot_hash,
      file_size_bytes: payloadString.length,
      original_filename: `${erp_vendor}_snapshot_${snapshot_timestamp}.json`,
      uploaded_at: new Date().toISOString(),
      actor_id: user.email,
      state: 'RAW',
      declared_entity_type: entityType.toUpperCase(),
      declared_evidence_type: 'ERP_SNAPSHOT',
      structured_payload: snapshot_payload,
      source_system: erp_vendor,
      immutable: true
    });

    // CREATE AUDIT LOG
    await base44.asServiceRole.entities.LedgerEvent.create({
      tenant_id,
      event_type: 'EvidenceCreated',
      aggregate_type: 'Evidence',
      aggregate_id: evidence.evidence_id,
      command_id,
      actor_id: user.email,
      actor_role: user.role || 'user',
      payload: {
        ingestion_path: 'erp_snapshot',
        erp_vendor,
        snapshot_timestamp,
        snapshot_hash,
        contract_id,
        entity_context_id,
        authority_type: 'DECLARATIVE',
        is_authoritative: false
      },
      previous_state: null,
      new_state: 'RAW',
      timestamp: new Date().toISOString(),
      sequence_number: Date.now(),
      schema_version: '1.0',
      immutable: true
    });

    // RETURN SUCCESS (NO ENTITY MUTATION)
    return Response.json({
      success: true,
      evidence_created: true,
      entity_created: false,
      compliance_activated: false,
      authority_type: 'DECLARATIVE',
      is_authoritative: false,
      evidence_id: evidence.evidence_id,
      contract_id,
      snapshot_hash,
      snapshot_timestamp,
      erp_vendor,
      next_action: 'Classify ERP evidence',
      warnings: [
        'ERP data is declarative and non-authoritative',
        'No entity was created or modified',
        'No compliance module was activated',
        'Evidence must be classified before use'
      ]
    });

  } catch (error) {
    console.error('ERP Snapshot Adapter Error:', error);
    return Response.json({
      success: false,
      error: 'ADAPTER_ERROR',
      message: error.message
    }, { status: 500 });
  }
});