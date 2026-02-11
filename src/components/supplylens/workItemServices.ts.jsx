/**
 * CONTRACT 2 - Work Item Services
 * Mock service layer for conflict resolution and follow-up creation
 * These will be called from WorkItemDrawer to update backend
 */

/**
 * Resolve conflict work item
 * Mock interface - will be replaced with real backend call
 */
export async function resolveConflictWorkItem(payload) {
  // payload shape:
  // {
  //   tenant_id: string,
  //   work_item_id: string,
  //   strategy: "PREFER_SOURCE_A"|"PREFER_SOURCE_B"|"PREFER_TRUSTED_SYSTEM"|"MANUAL_OVERRIDE",
  //   override_value?: string,
  //   comment?: string,
  //   decision_event?: { decision_id, ... }
  // }

  try {
    // TODO: Replace with real backend call
    const response = await fetch('/api/work-items/resolve-conflict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to resolve conflict: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      decision_id: data.decision_id || payload.decision_event?.decision_id,
      chosen_value: data.chosen_value || payload.override_value
    };
  } catch (error) {
    console.error('[resolveConflictWorkItem] Error:', error);
    throw error;
  }
}

/**
 * Create follow-up work item
 * Mock interface - will be replaced with real backend call
 */
export async function createFollowupWorkItem(payload) {
  // payload shape:
  // {
  //   tenant_id: string,
  //   parent_work_item_id: string,
  //   type: "REVIEW"|"EXTRACTION"|"MAPPING"|"CONFLICT",
  //   priority: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL",
  //   evidence_record_id?: string,
  //   evidence_display_id?: string,
  //   entity_ref?: { entity_type: "SUPPLIER"|"SKU"|"BOM", entity_id: string },
  //   idempotency_key: string
  // }

  try {
    // TODO: Replace with real backend call
    const response = await fetch('/api/work-items/create-followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to create follow-up: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      work_item_id: data.work_item_id,
      created_new: data.created_new !== false
    };
  } catch (error) {
    console.error('[createFollowupWorkItem] Error:', error);
    throw error;
  }
}

/**
 * Update work item status
 */
export async function updateWorkItemStatus(tenantId, workItemId, status) {
  try {
    const response = await fetch(`/api/work-items/${workItemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenantId,
        status,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update work item: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[updateWorkItemStatus] Error:', error);
    throw error;
  }
}