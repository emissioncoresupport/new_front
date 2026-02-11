import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Evidence Creation with Context Validation
// MANDATORY entry point for all ingestion paths
// Enforces context declaration before Evidence creation

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      ingestion_path,
      declared_context,
      file_url,
      file_hash_sha256,
      declaration_hash_sha256,
      file_size_bytes,
      original_filename,
      declared_entity_type,
      declared_evidence_type,
      batch_id,
      source_system,
      structured_payload
    } = await req.json();

    // CRITICAL: Validate context declaration
    if (!declared_context || 
        !declared_context.entity_type || 
        !declared_context.intended_use || 
        !declared_context.source_role) {
      
      // Log blocked attempt
      await base44.asServiceRole.entities.AuditLogEntry.create({
        tenant_id: user.company_id || 'default',
        resource_type: 'Evidence',
        resource_id: 'BLOCKED_NO_CONTEXT',
        action: 'EVIDENCE_CREATION_BLOCKED',
        actor_email: user.email,
        actor_role: user.role,
        action_timestamp: new Date().toISOString(),
        details: 'Evidence creation blocked: missing context declaration',
        status: 'FAILURE',
        error_message: 'Context declaration is mandatory'
      });
      
      return Response.json({ 
        error: 'Context declaration is mandatory. Provide: entity_type, intended_use, source_role, reason' 
      }, { status: 400 });
    }

    // Validate ingestion_path
    const valid_paths = ['upload_documents', 'supplier_portal', 'bulk_import', 'erp_snapshot', 'api'];
    if (!ingestion_path || !valid_paths.includes(ingestion_path)) {
      return Response.json({ 
        error: `Invalid ingestion_path. Must be one of: ${valid_paths.join(', ')}` 
      }, { status: 400 });
    }

    // Require either file_hash OR declaration_hash
    if (!file_hash_sha256 && !declaration_hash_sha256) {
      return Response.json({ 
        error: 'Either file_hash_sha256 or declaration_hash_sha256 is required for immutability' 
      }, { status: 400 });
    }

    // Generate evidence_id
    const evidence_id = `EV-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const tenant_id = user.company_id || 'default';

    // Create immutable Evidence record
    const evidence = await base44.asServiceRole.entities.Evidence.create({
      tenant_id,
      evidence_id,
      ingestion_path,
      declared_context,
      file_url: file_url || null,
      file_hash_sha256: file_hash_sha256 || null,
      declaration_hash_sha256: declaration_hash_sha256 || null,
      file_size_bytes: file_size_bytes || null,
      original_filename: original_filename || null,
      uploaded_at: new Date().toISOString(),
      actor_id: user.email,
      state: 'RAW',
      state_history: [{
        from_state: null,
        to_state: 'RAW',
        transitioned_at: new Date().toISOString(),
        transitioned_by: user.email,
        reason: 'Initial upload'
      }],
      declared_entity_type: declared_entity_type || 'UNDECLARED',
      declared_evidence_type: declared_evidence_type || 'OTHER',
      batch_id: batch_id || null,
      source_system: source_system || null,
      structured_payload: structured_payload || null,
      immutable: true
    });

    // Log creation in audit trail
    await base44.asServiceRole.entities.AuditLogEntry.create({
      tenant_id,
      resource_type: 'Evidence',
      resource_id: evidence_id,
      action: 'EVIDENCE_CREATED',
      actor_email: user.email,
      actor_role: user.role,
      action_timestamp: new Date().toISOString(),
      changes: {
        before: null,
        after: {
          state: 'RAW',
          ingestion_path,
          context: declared_context
        }
      },
      details: `Evidence created via ${ingestion_path}. Context: ${declared_context.reason}`,
      status: 'SUCCESS'
    });

    return Response.json({
      success: true,
      evidence_id,
      evidence,
      state: 'RAW',
      next_action: 'classify_or_extract'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});