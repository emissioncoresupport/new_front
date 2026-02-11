/**
 * CONTRACT 2: Frontend Work Item Store
 * In-memory tenant-scoped store for follow-up de-duplication
 * Production version will use backend, but this ensures idempotent follow-up creation
 */

import crypto from 'crypto';

class WorkItemStore {
  constructor() {
    // In-memory store: { tenantId: { dedupeKey: workItem } }
    this.store = {};
  }

  /**
   * Generate idempotent dedupe key for follow-up
   * Ensures same follow-up params create same key
   */
  generateDedupeKey(parentWorkItemId, followUpType, linkedEvidenceId, linkedEntityType, linkedEntityId, reasonCode) {
    const key = `${parentWorkItemId}|${followUpType}|${linkedEvidenceId || 'none'}|${linkedEntityType || 'none'}|${linkedEntityId || 'none'}|${reasonCode || 'none'}`;
    // Simulate sha256 with simple hash (production: use crypto)
    return btoa(key); // Base64 encode for URL safety
  }

  /**
   * Check if follow-up already exists
   */
  getFollowUpByDedupeKey(tenantId, dedupeKey) {
    return this.store[tenantId]?.[dedupeKey] || null;
  }

  /**
   * Create follow-up (idempotent)
   */
  createFollowUp(tenantId, dedupeKey, followUpData) {
    if (!this.store[tenantId]) {
      this.store[tenantId] = {};
    }

    // Check if already exists
    if (this.store[tenantId][dedupeKey]) {
      return {
        success: false,
        code: 'DUPLICATE_FOLLOW_UP',
        existing_work_item_id: this.store[tenantId][dedupeKey].work_item_id,
        existing_id: this.store[tenantId][dedupeKey].id
      };
    }

    // Create new follow-up
    const followUp = {
      id: `wi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      work_item_id: `WI-${Date.now().toString().slice(-6)}`, // Stable format, not WI-TMP
      type: followUpData.type,
      status: 'OPEN',
      priority: followUpData.priority,
      parent_work_item_id: followUpData.parentWorkItemId,
      linked_evidence_id: followUpData.linkedEvidenceId,
      linked_entity_type: followUpData.linkedEntityType,
      linked_entity_ref: followUpData.linkedEntityId,
      created_at: new Date().toISOString(),
      decision_count: 0,
      dedupeKey
    };

    this.store[tenantId][dedupeKey] = followUp;

    return {
      success: true,
      work_item_id: followUp.work_item_id,
      id: followUp.id
    };
  }

  /**
   * Clear all for testing
   */
  reset() {
    this.store = {};
  }
}

// Singleton instance
export const workItemStore = new WorkItemStore();

/**
 * Helper to call from React components
 */
export function createFollowUpIdempotent(tenantId, parentWorkItemId, followUpType, priority, linkedEvidenceId, linkedEntityType, linkedEntityId, reasonCode) {
  const dedupeKey = workItemStore.generateDedupeKey(
    parentWorkItemId,
    followUpType,
    linkedEvidenceId,
    linkedEntityType,
    linkedEntityId,
    reasonCode
  );

  const existing = workItemStore.getFollowUpByDedupeKey(tenantId, dedupeKey);
  if (existing) {
    return {
      success: false,
      code: 'DUPLICATE_FOLLOW_UP',
      existing_work_item_id: existing.work_item_id,
      existing_id: existing.id
    };
  }

  return workItemStore.createFollowUp(tenantId, dedupeKey, {
    type: followUpType,
    priority,
    parentWorkItemId,
    linkedEvidenceId,
    linkedEntityType,
    linkedEntityId
  });
}