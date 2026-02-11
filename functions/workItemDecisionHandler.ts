import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { action, workItemId, reasonCode, comment, workItemData, conflictData } = payload;

    if (!workItemId || !action || !reasonCode) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the work item
    const workItems = await base44.entities.WorkItem.list();
    const workItem = workItems.find(w => w.id === workItemId || w.work_item_id === workItemId);
    
    if (!workItem) {
      return Response.json({ error: 'Work item not found' }, { status: 404 });
    }

    // Determine new status based on action
    let newStatus = 'OPEN';
    if (action === 'APPROVE' || action === 'ACCEPT' || action === 'RESOLVE') {
      newStatus = 'DONE';
    } else if (action === 'REJECT' || action === 'BLOCK') {
      newStatus = 'BLOCKED';
    } else if (action === 'RESOLVE_CONFLICT') {
      // Conflict resolution always sets status to DONE
      newStatus = 'DONE';
    }

    // Create Decision Log entry
    const decisionId = `DEC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const decisionLogData = {
      decision_id: decisionId,
      work_item_id: workItem.work_item_id,
      decision_type: action === 'RESOLVE_CONFLICT' ? 'CONFLICT_RESOLVED' : action,
      reason_code: reasonCode,
      comment: comment || null,
      actor: user.email,
      actor_id: user.id,
      linked_evidence_id: workItem.linked_evidence_id,
      linked_entity_type: workItem.linked_entity_type,
      linked_entity_id: workItem.linked_entity_ref,
      work_item_type: workItem.type,
      created_at: new Date().toISOString()
    };
    
    // Add conflict-specific fields
    if (action === 'RESOLVE_CONFLICT' && conflictData) {
      decisionLogData.conflict_field = conflictData.field;
      decisionLogData.conflict_strategy = conflictData.strategy || reasonCode;
      decisionLogData.conflict_chosen_value = conflictData.chosen_value;
      decisionLogData.conflict_chosen_source = conflictData.chosen_source;
      decisionLogData.conflict_metadata = JSON.stringify({
        value_a: conflictData.value_a,
        value_b: conflictData.value_b,
        source_a: conflictData.source_a,
        source_b: conflictData.source_b
      });
    }
    
    const decisionLog = await base44.entities.DecisionLog.create(decisionLogData);

    // Create Audit Trail event
    await base44.entities.AuditTrail.create({
      event_id: `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      event_type: 'WORK_ITEM_DECISION',
      actor: user.email,
      actor_id: user.id,
      resource_type: 'WorkItem',
      resource_id: workItem.id,
      action: action,
      details: {
        work_item_id: workItem.work_item_id,
        decision_id: decisionId,
        reason_code: reasonCode,
        new_status: newStatus
      },
      created_at: new Date().toISOString()
    });

    // Update work item status and increment decision count
    const currentDecisionCount = workItem.decision_count || 0;
    await base44.entities.WorkItem.update(workItem.id, {
      status: newStatus,
      decision_count: currentDecisionCount + 1,
      updated_at: new Date().toISOString(),
      updated_by: user.email
    });

    return Response.json({
      success: true,
      decision_id: decisionId,
      new_status: newStatus,
      work_item_id: workItem.work_item_id
    });
  } catch (error) {
    console.error('Decision handler error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});