import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Create exactly ONE follow-up work item
 * Prevents duplicate creation via idempotency check
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { parentWorkItemId, followUpType, priority, tags } = payload;

    if (!parentWorkItemId || !followUpType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get parent work item
    const workItems = await base44.entities.WorkItem.list();
    const parentWorkItem = workItems.find(w => w.id === parentWorkItemId || w.work_item_id === parentWorkItemId);
    
    if (!parentWorkItem) {
      return Response.json({ error: 'Parent work item not found' }, { status: 404 });
    }

    // Check for existing follow-up to prevent duplicates
    const existingFollowUp = workItems.find(w => 
      w.parent_work_item_id === parentWorkItem.work_item_id &&
      w.type === followUpType &&
      w.status !== 'DONE'
    );
    
    if (existingFollowUp) {
      return Response.json({
        success: false,
        code: 'DUPLICATE_FOLLOW_UP',
        existing_work_item_id: existingFollowUp.work_item_id,
        message: 'Follow-up already exists'
      }, { status: 200 });
    }

    // Check for existing open follow-up with same type (idempotency guard)
    const existingFollowUp = workItems.find(w => 
      w.parent_work_item_id === parentWorkItem.work_item_id &&
      w.type === followUpType &&
      w.status === 'OPEN'
    );

    if (existingFollowUp) {
      return Response.json({
        success: false,
        error: 'Follow-up already exists',
        existing_work_item_id: existingFollowUp.work_item_id,
        code: 'DUPLICATE_FOLLOW_UP'
      }, { status: 409 });
    }

    // Create follow-up work item with deterministic ID
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 6).toUpperCase();
    const workItemId = `WI-${timestamp}-${randomSuffix}`;

    const newWorkItem = await base44.entities.WorkItem.create({
      work_item_id: workItemId,
      parent_work_item_id: parentWorkItem.work_item_id,
      type: followUpType,
      status: 'OPEN',
      priority: priority || 'MEDIUM',
      owner: user.email || 'Unassigned',
      linked_evidence_id: parentWorkItem.linked_evidence_id,
      linked_entity_ref: parentWorkItem.linked_entity_ref,
      linked_entity_type: parentWorkItem.linked_entity_type,
      dataset_type: parentWorkItem.dataset_type,
      ingestion_method: parentWorkItem.ingestion_method,
      reason_code: null,
      comment: null,
      created_at: new Date().toISOString(),
      created_by: user.email
    });

    // Create audit trail for follow-up creation
    await base44.entities.AuditTrail.create({
      event_id: `AUD-${timestamp}-${randomSuffix}`,
      event_type: 'FOLLOW_UP_CREATED',
      actor: user.email,
      actor_id: user.id,
      resource_type: 'WorkItem',
      resource_id: newWorkItem.id,
      action: 'CREATE_FOLLOW_UP',
      details: {
        parent_work_item_id: parentWorkItem.work_item_id,
        new_work_item_id: workItemId,
        follow_up_type: followUpType
      },
      created_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      work_item_id: workItemId,
      id: newWorkItem.id,
      parent_work_item_id: parentWorkItem.work_item_id,
      type: followUpType,
      status: 'OPEN'
    });
  } catch (error) {
    console.error('Follow-up creation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});