/**
 * Draft Lifecycle Manager for Evidence Ingestion Wizard
 * Single source of truth for draft_id persistence and recovery
 */

const STORAGE_KEY_PREFIX = 'supplylens_draft_';

export class WizardDraftManager {
  constructor(tenantId, userId) {
    this.tenantId = tenantId;
    this.userId = userId;
    this.storageKey = `${STORAGE_KEY_PREFIX}${tenantId}_${userId}`;
    this.draftId = null;
    this.correlationId = null;
  }

  /**
   * Initialize draft from multiple sources (priority order):
   * 1. Passed initialDraftId
   * 2. URL query param
   * 3. Local storage
   */
  initialize(initialDraftId) {
    // Priority 1: Explicit initial draft
    if (initialDraftId) {
      this.draftId = initialDraftId;
      this.persist();
      return initialDraftId;
    }

    // Priority 2: URL query param
    const urlParams = new URLSearchParams(window.location.search);
    const urlDraftId = urlParams.get('draft');
    if (urlDraftId) {
      this.draftId = urlDraftId;
      this.persist();
      return urlDraftId;
    }

    // Priority 3: Local storage
    const stored = this.loadFromStorage();
    if (stored?.draftId) {
      this.draftId = stored.draftId;
      this.correlationId = stored.correlationId;
      return stored.draftId;
    }

    return null;
  }

  /**
   * Set draft ID after creation - only called once at Step 1 completion
   */
  setDraftId(draftId, correlationId = null) {
    if (!draftId) {
      throw new Error('Cannot set null or undefined draft_id');
    }
    
    // Only allow setting once, or updating with server confirmation
    if (!this.draftId || draftId !== this.draftId) {
      console.log(`[WizardDraftManager] Setting draft_id: ${draftId}`);
      this.draftId = draftId;
      this.correlationId = correlationId || this.generateCorrelationId();
      this.persist();
    }
    
    return this.draftId;
  }

  /**
   * Get current draft ID - throws if missing
   */
  requireDraftId() {
    if (!this.draftId) {
      throw new Error('DRAFT_MISSING: Draft ID is required but not set. Return to Step 1.');
    }
    return this.draftId;
  }

  /**
   * Check if draft exists without throwing
   */
  hasDraftId() {
    return !!this.draftId;
  }

  /**
   * Get correlation ID for audit trails
   */
  getCorrelationId() {
    if (!this.correlationId) {
      this.correlationId = this.generateCorrelationId();
    }
    return this.correlationId;
  }

  /**
   * Persist to all locations
   */
  persist() {
    if (!this.draftId) return;

    // 1. Local storage
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        draftId: this.draftId,
        correlationId: this.correlationId,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('[WizardDraftManager] Failed to persist to localStorage:', e);
    }

    // 2. URL query param (without page reload)
    try {
      const url = new URL(window.location);
      url.searchParams.set('draft', this.draftId);
      window.history.replaceState({}, '', url);
    } catch (e) {
      console.warn('[WizardDraftManager] Failed to update URL:', e);
    }
  }

  /**
   * Clear draft state (on completion or cancel)
   */
  clear() {
    this.draftId = null;
    this.correlationId = null;

    // Clear storage
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      console.warn('[WizardDraftManager] Failed to clear localStorage:', e);
    }

    // Clear URL param
    try {
      const url = new URL(window.location);
      url.searchParams.delete('draft');
      window.history.replaceState({}, '', url);
    } catch (e) {
      console.warn('[WizardDraftManager] Failed to clear URL:', e);
    }
  }

  /**
   * Load from storage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        // Validate age (expire after 24 hours)
        const age = Date.now() - new Date(data.timestamp).getTime();
        if (age < 24 * 60 * 60 * 1000) {
          return data;
        } else {
          localStorage.removeItem(this.storageKey);
        }
      }
    } catch (e) {
      console.warn('[WizardDraftManager] Failed to load from storage:', e);
    }
    return null;
  }

  /**
   * Generate correlation ID for tracing
   */
  generateCorrelationId() {
    return `wiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Exponential backoff retry wrapper
   */
  async retryWithBackoff(fn, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry validation errors (4xx except 408/429)
        const status = error.response?.status;
        if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        if (i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000;
          console.log(`[WizardDraftManager] Retry ${i + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }
}

/**
 * Defensive callback guard to prevent "r is not a function" crashes
 */
export function safeCallback(callback, context = 'callback') {
  return function(...args) {
    if (typeof callback === 'function') {
      try {
        return callback(...args);
      } catch (error) {
        console.error(`[WizardDraftManager] Error in ${context}:`, error);
        throw error;
      }
    } else {
      const error = new Error(`Invalid ${context}: expected function, got ${typeof callback}`);
      console.error('[WizardDraftManager]', error);
      throw error;
    }
  };
}