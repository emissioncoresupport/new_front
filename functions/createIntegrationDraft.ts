import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      correlation_id,
      source_system,
      ingestion_method = 'ERP_API',
      dataset_type,
      endpoint,
      sample_data = {}
    } = body;

    if (!correlation_id || !source_system || !dataset_type) {
      return Response.json({
        error: 'Missing required fields: correlation_id, source_system, dataset_type'
      }, { status: 400 });
    }

    // Check for idempotency: if same correlation_id exists, return existing draft
    const existingDrafts = await base44.entities.EvidenceDraft.filter({
      correlation_id: correlation_id
    });

    if (existingDrafts && existingDrafts.length > 0) {
      return Response.json({
        status: 'duplicate_prevented',
        draft_id: existingDrafts[0].id,
        message: `Draft with correlation_id "${correlation_id}" already exists`,
        draft: existingDrafts[0]
      });
    }

    // Create new draft
    const draftPayload = {
      correlation_id: correlation_id,
      source_system: source_system,
      ingestion_method: ingestion_method,
      dataset_type: dataset_type,
      endpoint: endpoint || '',
      created_at_utc: new Date().toISOString(),
      status: 'draft',
      canonical_payload: sample_data,
      binding_context: {
        tenant_id: user.id,
        source_system: source_system,
        ingestion_method: ingestion_method
      }
    };

    const newDraft = await base44.entities.EvidenceDraft.create(draftPayload);

    return Response.json({
      status: 'created',
      draft_id: newDraft.id,
      correlation_id: correlation_id,
      message: `Draft created successfully from ${source_system}/${endpoint}`,
      draft: newDraft
    });
  } catch (error) {
    console.error('createIntegrationDraft error:', error);
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});