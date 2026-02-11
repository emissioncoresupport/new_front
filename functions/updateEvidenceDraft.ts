import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { draft_id, ...updates } = payload;

    if (!draft_id) {
      return Response.json({ 
        error: 'draft_id required',
        field_errors: { draft_id: 'Required' }
      }, { status: 422 });
    }

    // Fetch existing draft
    const drafts = await base44.asServiceRole.entities.EvidenceDraft.filter({ id: draft_id });
    
    if (!drafts.length) {
      return Response.json({ error: 'Draft not found' }, { status: 404 });
    }

    const draft = drafts[0];

    // Check if sealed - cannot update sealed drafts
    if (draft.status === 'SEALED') {
      return Response.json({ 
        error: 'Cannot update sealed draft',
        field_errors: { status: 'Draft is sealed and immutable' }
      }, { status: 422 });
    }

    // Validate tenant isolation
    const tenant_id = user.email.split('@')[1] || 'default';
    if (draft.tenant_id !== tenant_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validation for specific fields
    const field_errors = {};
    
    // Validate scope target if provided
    if (updates.binding_context_id) {
      try {
        const contexts = await base44.asServiceRole.entities.BindingContext.filter({ id: updates.binding_context_id });
        if (!contexts.length) {
          field_errors.binding_context_id = 'Invalid scope target - entity not found';
        }
      } catch (e) {
        field_errors.binding_context_id = 'Unable to validate scope target';
      }
    }
    
    if (updates.why_this_evidence && updates.why_this_evidence.length < 20) {
      field_errors.why_this_evidence = 'Minimum 20 characters required';
    }
    
    if (updates.attestation_notes && updates.attestation_notes.length < 20) {
      field_errors.attestation_notes = 'Minimum 20 characters required';
    }

    if (Object.keys(field_errors).length > 0) {
      return Response.json({ 
        error: 'Validation failed',
        field_errors 
      }, { status: 422 });
    }

    // Update draft
    const updated = await base44.asServiceRole.entities.EvidenceDraft.update(draft_id, updates);

    return Response.json({ 
      success: true,
      draft_id: updated.id,
      status: updated.status
    });

  } catch (error) {
    console.error('Draft update error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});