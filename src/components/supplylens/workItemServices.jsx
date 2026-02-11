
/**
 * Work Item Backend Services (Frontend Mocks)
 * CONTRACT 2: Conflict Resolution, Follow-up Management, Idempotency
 * 
 * NOTE: These are frontend service wrappers.
 * Actual backend logic is in functions/ directory.
 */

// Frontend mocks - backend functions handle real operations
const mockServices = {};

// This module is for organization only.
// WorkItemDrawer handles all logic internally with local state.
// Backend functions (resolveConflictWorkItem, createFollowUpWorkItem) are called directly via base44.functions.invoke from the component.

/**
 * Resolve a conflict work item
 * Creates append-only DecisionEvent in audit trail
 * Updates work item status to RESOLVED
 * Increments decision_count
 */
export async function resolveConflictWorkItem({
  tenant_id,
  work_item_id,
  strategy,
  override_value,
  comment
}) {
  try {
    // Call backend function that handles conflict resolution
    const response = await base44.functions.invoke('resolveConflictWorkItem', {
      tenant_id,
      work_item_id,
      strategy,
      override_value,
      comment
    });

    if (response?.data?.error) {
      throw new Error(response.data.error);
    }

    return {
      decision_id: response?.data?.decision_id,
      chosen_value: response?.data?.chosen_value,
      success: true
    };
  } catch (error) {
    console.error('Error resolving conflict:', error);
    throw error;
  }
}

/**
 * Create a follow-up work item with idempotency
 * Frontend idempotency key prevents duplicate creation
 * Backend must also verify idempotency_key to prevent races
 */
export async function createFollowupWorkItem({
  tenant_id,
  parent_work_item_id,
  type,
  priority,
  evidence_record_id,
  evidence_display_id,
  entity_ref,
  idempotency_key
}) {
  try {
    const response = await base44.functions.invoke('createFollowUpWorkItem', {
      tenant_id,
      parent_work_item_id,
      type,
      priority,
      evidence_record_id,
      evidence_display_id,
      entity_ref,
      idempotency_key
    });

    if (response?.data?.error) {
      throw new Error(response.data.error);
    }

    return {
      work_item_id: response?.data?.work_item_id,
      created_new: response?.data?.created_new ?? true,
      success: true
    };
  } catch (error) {
    console.error('Error creating follow-up:', error);
    throw error;
  }
}

/**
 * Update work item status
 * Guards against invalid state transitions
 */
export async function updateWorkItemStatus(work_item_id, new_status) {
  try {
    const response = await base44.functions.invoke('updateWorkItemStatus', {
      work_item_id,
      new_status
    });

    if (response?.data?.error) {
      throw new Error(response.data.error);
    }

    return {
      work_item_id: response?.data?.work_item_id,
      status: response?.data?.status,
      success: true
    };
  } catch (error) {
    console.error('Error updating work item status:', error);
    throw error;
  }
}

/**
 * Get evidence by ID or display_id
 * Used for Evidence Vault deep-linking
 * Returns null if not found (guards against undefined)
 */
export async function getEvidenceByIdOrDisplayId(tenant_id, evidence_id) {
  try {
    if (!evidence_id) return null;

    const response = await base44.functions.invoke('getEvidenceByIdOrDisplayId', {
      tenant_id,
      evidence_id
    });

    if (response?.data?.error) {
      console.warn('Evidence not found:', evidence_id);
      return null;
    }

    return response?.data?.evidence || null;
  } catch (error) {
    console.error('Error fetching evidence:', error);
    return null;
  }
}
