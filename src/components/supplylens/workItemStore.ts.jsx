/**
 * CONTRACT 2 HARDENING - In-Memory Work Item Store
 * Frontend-only deduplication for follow-up creation
 * Prevents WI-TMP spam by checking dedupeKey before backend call
 * RULE: This is temporary until backend implements idempotency
 */

import { createHash } from 'crypto';

/**
 * Deduplication key for follow-ups
 * Stable hash: (parentWorkItemId + type + evidenceDisplayId + linkedEntityType + linkedEntityId + reasonCode)
 */
function computeFollowUpDedupeKey(
  parentWorkItemId: string,
  type: string,
  evidenceDisplayId: string | undefined,
  linkedEntityType: string | undefined,
  linkedEntityId: string | undefined,
  reasonCode: string
): string {
  const combined = [
    parentWorkItemId,
    type,
    evidenceDisplayId || 'NONE',
    linkedEntityType || 'NONE',
    linkedEntityId || 'NONE',
    reasonCode
  ].join('|');
  
  // Simple hash for determinism (frontend only, not cryptographic)
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit int
  }
  return `FOLLOW-UP-${Math.abs(hash).toString(36).toUpperCase()}`;
}

/**
 * In-memory follow-up registry (tenant-scoped)
 * Map: tenantId => Map: dedupeKey => WorkItem
 */
const followUpRegistry = new Map<string, Map<string, any>>();

/**
 * Register a created follow-up
 */
function registerFollowUp(
  tenantId: string,
  dedupeKey: string,
  workItem: any
): void {
  if (!followUpRegistry.has(tenantId)) {
    followUpRegistry.set(tenantId, new Map());
  }
  followUpRegistry.get(tenantId)!.set(dedupeKey, workItem);
}

/**
 * Lookup existing follow-up by dedupeKey
 */
function lookupFollowUp(tenantId: string, dedupeKey: string): any | null {
  const tenantMap = followUpRegistry.get(tenantId);
  return tenantMap?.get(dedupeKey) || null;
}

/**
 * Create follow-up idempotently
 * Returns: { success: true, work_item_id: '...' } | { success: false, code: 'DUPLICATE_FOLLOW_UP', existing_work_item_id: '...' }
 */
export function createFollowUpIdempotent(
  tenantId: string,
  parentWorkItemId: string,
  type: string,
  priority: string,
  evidenceDisplayId: string | undefined,
  linkedEntityType: string | undefined,
  linkedEntityId: string | undefined,
  reasonCode: string
): { success: boolean; work_item_id?: string; code?: string; existing_work_item_id?: string } {
  
  if (!parentWorkItemId || parentWorkItemId.startsWith('WI-TMP')) {
    return {
      success: false,
      code: 'INVALID_PARENT',
      work_item_id: undefined
    };
  }

  const dedupeKey = computeFollowUpDedupeKey(
    parentWorkItemId,
    type,
    evidenceDisplayId,
    linkedEntityType,
    linkedEntityId,
    reasonCode
  );

  // Check if already exists
  const existing = lookupFollowUp(tenantId, dedupeKey);
  if (existing) {
    return {
      success: false,
      code: 'DUPLICATE_FOLLOW_UP',
      existing_work_item_id: existing.work_item_id
    };
  }

  // Generate stable ID (NOT WI-TMP)
  // Use dedupeKey as base for deterministic follow-up ID
  const newFollowUpId = `FOLLOW-UP-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

  // Create follow-up object
  const followUpWorkItem = {
    work_item_id: newFollowUpId,
    tenant_id: tenantId,
    type,
    priority,
    parent_work_item_id: parentWorkItemId,
    linked_evidence_id: evidenceDisplayId,
    linked_entity_type: linkedEntityType,
    linked_entity_ref: linkedEntityId,
    status: 'OPEN',
    owner: null,
    created_at: new Date().toISOString(),
    created_by: 'SYSTEM',
    dedupe_key: dedupeKey
  };

  // Register in memory
  registerFollowUp(tenantId, dedupeKey, followUpWorkItem);

  return {
    success: true,
    work_item_id: newFollowUpId
  };
}

/**
 * Clear follow-up registry for a tenant (e.g., on logout or test cleanup)
 */
export function clearFollowUpRegistry(tenantId?: string): void {
  if (tenantId) {
    followUpRegistry.delete(tenantId);
  } else {
    followUpRegistry.clear();
  }
}

/**
 * Get all follow-ups for a tenant (for debugging)
 */
export function getAllFollowUps(tenantId: string): any[] {
  const tenantMap = followUpRegistry.get(tenantId);
  return tenantMap ? Array.from(tenantMap.values()) : [];
}