import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import crypto from 'crypto';

const generateRequestId = () => {
  return `req_${crypto.randomBytes(8).toString('hex')}_${Date.now()}`;
};

const hashValue = (value) => {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
};

const hashIP = (ip) => {
  if (!ip) return 'unknown';
  return crypto.createHash('sha256').update(ip).digest('hex');
};

const hashUserAgent = (ua) => {
  if (!ua) return 'unknown';
  return crypto.createHash('sha256').update(ua).digest('hex');
};

// Metadata validation (strict, zero-mercy)
const validateDeclaration = (declaration) => {
  const errors = {};

  // Section A: Ingestion Declaration
  if (!declaration.ingestion_method || !['FILE_UPLOAD', 'ERP_EXPORT', 'ERP_API', 'SUPPLIER_PORTAL', 'API_PUSH', 'MANUAL'].includes(declaration.ingestion_method)) {
    errors.ingestion_method = 'Invalid or missing ingestion method';
  }
  if (!declaration.dataset_type) {
    errors.dataset_type = 'Missing dataset type';
  }
  if (!declaration.source_system) {
    errors.source_system = 'Missing source system';
  }
  if (declaration.source_system === 'OTHER' && !declaration.source_system_detail) {
    errors.source_system_detail = 'Required when source_system=OTHER';
  }
  if (['ERP_EXPORT', 'ERP_API'].includes(declaration.ingestion_method) && !declaration.snapshot_date_utc) {
    errors.snapshot_date_utc = 'Required for ERP methods';
  }

  // Section B: Intent
  if (!declaration.declared_intent) {
    errors.declared_intent = 'Missing declared intent';
  }
  if (!declaration.declared_scope) {
    errors.declared_scope = 'Missing declared scope';
  }

  // Section C: Consumers
  if (!Array.isArray(declaration.intended_consumers) || declaration.intended_consumers.length === 0) {
    errors.intended_consumers = 'Must select at least one intended consumer';
  }

  // Section D: GDPR & Retention
  if (declaration.personal_data_present === true && !declaration.gdpr_legal_basis) {
    errors.gdpr_legal_basis = 'Required when personal data present';
  }
  if (!declaration.retention_policy) {
    errors.retention_policy = 'Missing retention policy';
  }
  if (declaration.retention_policy === 'CUSTOM') {
    const days = declaration.retention_custom_days;
    if (!days || days < 1 || days > 3650) {
      errors.retention_custom_days = 'Must be 1–3650 days';
    }
  }
  if (!declaration.data_minimization_confirmed) {
    errors.data_minimization_confirmed = 'Must confirm data minimization';
  }

  return errors;
};

// Compute retention end date
const computeRetentionEndDate = (snapshotDateUtc, retentionPolicy, customDays) => {
  const retentionDays = {
    '6_MONTHS': 180,
    '12_MONTHS': 365,
    '3_YEARS': 1095,
    '6_YEARS': 2190,
    '10_YEARS': 3650
  };

  const baseDate = new Date(snapshotDateUtc);
  let days = 0;

  if (retentionPolicy === 'CUSTOM') {
    days = customDays || 0;
  } else {
    days = retentionDays[retentionPolicy] || 0;
  }

  const endDate = new Date(baseDate);
  endDate.setDate(endDate.getDate() + days);
  return endDate.toISOString();
};

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || '';

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json(
        { error: 'Unauthorized', request_id: requestId },
        { status: 401 }
      );
    }

    // IDEMPOTENCY CHECK
    const idempotencyKey = req.headers.get('Idempotency-Key');
    if (!idempotencyKey) {
      return Response.json(
        {
          error: 'Idempotency-Key header required',
          request_id: requestId
        },
        { status: 400 }
      );
    }

    // Parse multipart form
    const formData = await req.formData();
    const file = formData.get('file');
    const declarationJson = formData.get('declaration');

    if (!declarationJson) {
      return Response.json(
        {
          error: 'Missing declaration in request',
          request_id: requestId
        },
        { status: 400 }
      );
    }

    let declaration;
    try {
      declaration = JSON.parse(declarationJson);
    } catch (e) {
      return Response.json(
        {
          error: 'Invalid JSON in declaration',
          request_id: requestId
        },
        { status: 400 }
      );
    }

    // STRICT VALIDATION
    const validationErrors = validateDeclaration(declaration);
    if (Object.keys(validationErrors).length > 0) {
      // Create audit event for failed validation
      await base44.entities.EvidenceAuditEvent.create({
        tenant_id: user.tenant_id,
        evidence_id: 'pending',
        action: 'INGEST_VALIDATION_FAILED',
        actor_user_id: user.id,
        actor_role: user.role,
        actor_email: user.email,
        timestamp_utc: new Date().toISOString(),
        request_id: requestId,
        http_status: 400,
        ip_hash: hashIP(clientIp),
        user_agent_hash: hashUserAgent(userAgent),
        context_json: { validation_errors: validationErrors }
      });

      return Response.json(
        {
          error: 'Validation failed',
          request_id: requestId,
          validation_errors: validationErrors
        },
        { status: 400 }
      );
    }

    // Create evidence record
    const evidenceId = crypto.randomUUID();
    const snapshotDate = declaration.snapshot_date_utc || new Date().toISOString();
    const retentionEndDate = computeRetentionEndDate(
      snapshotDate,
      declaration.retention_policy,
      declaration.retention_custom_days
    );

    // Store payload
    let payloadUri = null;
    let payloadHash = null;
    if (file) {
      const buffer = await file.arrayBuffer();
      const payloadHashObj = crypto.createHash('sha256');
      payloadHashObj.update(new Uint8Array(buffer));
      payloadHash = payloadHashObj.digest('hex');

      const uploadRes = await base44.integrations.Core.UploadPrivateFile({
        file: file
      });
      payloadUri = uploadRes.file_uri;
    }

    // Compute metadata hash
    const metadataHash = hashValue(declaration);

    // Create evidence with contract_state=INGESTED
    const evidenceRecord = await base44.entities.Evidence.create({
      tenant_id: user.tenant_id,
      evidence_id: evidenceId,
      contract_state: 'INGESTED',
      declaration: declaration,
      payload_storage_uri: payloadUri,
      payload_hash_sha256: payloadHash,
      metadata_hash_sha256: metadataHash,
      snapshot_date_utc: snapshotDate,
      retention_end_date_utc: retentionEndDate,
      ingestion_timestamp_utc: new Date().toISOString(),
      created_by_user_id: user.id,
      created_by_email: user.email,
      idempotency_key: idempotencyKey
    });

    // INGEST_ATTEMPT audit event
    await base44.entities.EvidenceAuditEvent.create({
      tenant_id: user.tenant_id,
      evidence_id: evidenceId,
      action: 'INGEST_ATTEMPT',
      actor_user_id: user.id,
      actor_role: user.role,
      actor_email: user.email,
      timestamp_utc: new Date().toISOString(),
      request_id: requestId,
      http_status: 201,
      ip_hash: hashIP(clientIp),
      user_agent_hash: hashUserAgent(userAgent),
      contract_state: 'INGESTED',
      context_json: {
        ingestion_method: declaration.ingestion_method,
        dataset_type: declaration.dataset_type
      }
    });

    // Transition to SEALED
    const sealedRecord = await base44.entities.Evidence.update(evidenceId, {
      contract_state: 'SEALED',
      sealed_timestamp_utc: new Date().toISOString()
    });

    // SEALED audit event
    await base44.entities.EvidenceAuditEvent.create({
      tenant_id: user.tenant_id,
      evidence_id: evidenceId,
      action: 'SEALED',
      actor_user_id: user.id,
      actor_role: user.role,
      actor_email: user.email,
      timestamp_utc: new Date().toISOString(),
      request_id: requestId,
      http_status: 200,
      ip_hash: hashIP(clientIp),
      user_agent_hash: hashUserAgent(userAgent),
      contract_state: 'SEALED',
      context_json: {
        payload_hash: payloadHash,
        metadata_hash: metadataHash
      }
    });

    // Generate receipt
    const receipt = {
      evidence_id: evidenceId,
      contract_state: 'SEALED',
      request_id: requestId,
      ingestion_timestamp_utc: evidenceRecord.ingestion_timestamp_utc,
      sealed_timestamp_utc: sealedRecord.sealed_timestamp_utc,
      payload_hash_sha256: payloadHash,
      metadata_hash_sha256: metadataHash,
      retention_end_date_utc: retentionEndDate,
      declaration_summary: {
        ingestion_method: declaration.ingestion_method,
        dataset_type: declaration.dataset_type,
        intended_consumers: declaration.intended_consumers,
        retention_policy: declaration.retention_policy
      }
    };

    return Response.json(
      {
        success: true,
        receipt: receipt
      },
      { status: 201 }
    );
  } catch (error) {
    const errorCode = `ERR_${Date.now()}`;
    console.error(`[${errorCode}] ${error.message}`, error);

    return Response.json(
      {
        error: 'System error during ingestion',
        error_code: errorCode,
        request_id: requestId
      },
      { status: 500 }
    );
  }
});