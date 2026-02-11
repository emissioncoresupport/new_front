/**
 * CONTRACT 2: Deep-Linking Utilities
 * Deterministic routing for Control Tower → Evidence Vault with auto-expand
 * Handles canonical IDs: displayId (UUID), recordId (PK), humanId (EV-2024-###)
 */

import { createPageUrl } from '@/utils';

/**
 * Build Evidence Vault deep-link URL
 * RULE: Always use displayId (UUID), never humanId unless backend guarantees mapping
 */
export function buildEvidenceVaultLink(evidenceDisplayId, tenantId = null, autoExpand = true) {
  let url = createPageUrl('EvidenceVault');
  const params = new URLSearchParams();
  
  if (evidenceDisplayId) {
    params.append('evidenceId', evidenceDisplayId);
  }
  if (tenantId) {
    params.append('tenantId', tenantId);
  }
  if (autoExpand) {
    params.append('focus', 'record');
    params.append('expand', 'true');
  }
  
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * Parse Evidence Vault query params
 * Returns { evidenceId, tenantId, focus, expand }
 */
export function parseEvidenceVaultParams() {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  return {
    evidenceId: params.get('evidenceId'),
    recordId: params.get('recordId'),
    humanId: params.get('humanId'),
    tenantId: params.get('tenantId'),
    focus: params.get('focus'),
    expand: params.get('expand') === 'true',
    // Legacy support
    focusId: params.get('focus') || params.get('focusId'),
    focusType: params.get('focusType') || 'evidenceId'
  };
}

/**
 * Get evidence ID from various sources
 * Priority: displayId > recordId > humanId
 */
export function getTargetEvidenceId(params) {
  return params.evidenceId || params.recordId || params.humanId;
}

/**
 * Build fuzzy search term (last 6 chars or full humanId)
 * Used when exact match not found
 */
export function buildFuzzySearchTerm(evidenceId) {
  if (!evidenceId) return '';
  
  // If looks like humanId (EV-XXXX-XXX), return as-is for search
  if (evidenceId.match(/^EV-\d{4}-\d{3}$/)) {
    return evidenceId;
  }
  
  // For UUIDs, use last 6 chars
  return evidenceId.slice(-6);
}

/**
 * Check if evidence ID is valid format
 */
export function isValidEvidenceId(id) {
  if (!id) return false;
  
  // UUID-like (displayId)
  if (id.match(/^[a-f0-9-]{36}$|^[a-zA-Z0-9_-]{32,}$/)) return true;
  
  // HumanId (EV-XXXX-XXX)
  if (id.match(/^EV-\d{4}-\d{3}$/)) return true;
  
  // RecordId (alphanumeric, not empty)
  if (id.match(/^[a-zA-Z0-9_-]{8,}$/)) return true;
  
  return false;
}

/**
 * Safe scroll element into view with highlight
 */
export function scrollAndHighlightElement(element, duration = 2000) {
  if (!element) return;
  
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // Add pulse animation
  element.classList.add('animate-pulse-highlight');
  
  // Remove animation after duration
  setTimeout(() => {
    element.classList.remove('animate-pulse-highlight');
  }, duration);
}

/**
 * Build work item action link with evidence context
 */
export function buildWorkItemEvidenceLink(workItem) {
  if (!workItem?.linked_evidence_id && !workItem?.evidence_id) {
    return null;
  }
  
  return buildEvidenceVaultLink(
    workItem.linked_evidence_id || workItem.evidence_id,
    null,
    true
  );
}