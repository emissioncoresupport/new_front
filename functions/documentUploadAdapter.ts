import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * DOCUMENT UPLOAD ADAPTER
 * 
 * Thin wrapper over universal ingestEvidence core.
 * Handles file uploads, extracts metadata, delegates to core.
 * 
 * NO independent logic. File remains as payload.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const profile_id = formData.get('profile_id');
    const entity_context_id = formData.get('entity_context_id');
    const file = formData.get('file');

    if (!profile_id || !entity_context_id || !file) {
      return Response.json({
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'Missing profile_id, entity_context_id, or file'
      }, { status: 400 });
    }

    const profile = await base44.asServiceRole.entities.IngestionProfile.get(profile_id);

    if (!profile) {
      return Response.json({
        success: false,
        error: 'PROFILE_NOT_FOUND'
      }, { status: 404 });
    }

    // Upload file via integration
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // Extract minimal metadata (NO enrichment)
    const payload = {
      file_url,
      original_filename: file.name,
      file_size_bytes: file.size,
      content_type: file.type,
      uploaded_timestamp: new Date().toISOString()
    };

    // CALL UNIVERSAL CORE
    const response = await base44.functions.invoke('ingestEvidence', {
      tenant_id: profile.tenant_id,
      profile_id,
      entity_context_id,
      ingestion_path: 'DOCUMENT_UPLOAD',
      authority_type: profile.authority_type,
      payload,
      actor_id: user.email,
      command_id: `DOC-${profile_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });

    return Response.json({
      success: response.data.success,
      document_upload: true,
      evidence_id: response.data.evidence_id,
      file_url,
      original_filename: file.name
    });

  } catch (error) {
    console.error('Document Upload Error:', error);
    return Response.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    }, { status: 500 });
  }
});