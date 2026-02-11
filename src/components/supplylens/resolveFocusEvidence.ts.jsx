/**
 * CONTRACT 2: Evidence Focus Resolution
 * Deterministic resolution of deep-linked evidence with fallback to fuzzy search
 */

/**
 * Attempt to locate evidence by ID or display_id
 * Returns the evidence record or null if not found
 */
export async function getEvidenceByIdOrDisplayId(tenantId, evidenceId, evidenceList) {
  if (!evidenceId || !evidenceList || !Array.isArray(evidenceList)) {
    return null;
  }

  // First try: exact match on record_id (primary key)
  const byRecordId = evidenceList.find(e => e.record_id === evidenceId || e.id === evidenceId);
  if (byRecordId) return byRecordId;

  // Second try: match on display_id (UUID-like)
  const byDisplayId = evidenceList.find(e => e.display_id === evidenceId);
  if (byDisplayId) return byDisplayId;

  // Third try: humanId match (e.g., EV-2024-004)
  const byHumanId = evidenceList.find(e => e.human_id === evidenceId);
  if (byHumanId) return byHumanId;

  return null;
}

/**
 * Find evidence in list and auto-expand it
 * Returns { found: boolean, evidence: record | null, rowIndex: number | null }
 */
export function resolveFocusEvidence(evidenceId, evidenceList) {
  if (!evidenceId || !evidenceList) {
    return { found: false, evidence: null, rowIndex: null };
  }

  const evidence = getEvidenceByIdOrDisplayId(null, evidenceId, evidenceList);
  if (!evidence) {
    return { found: false, evidence: null, rowIndex: null };
  }

  const rowIndex = evidenceList.findIndex(
    e => e.record_id === evidence.record_id || e.id === evidence.id
  );

  return {
    found: true,
    evidence,
    rowIndex: rowIndex >= 0 ? rowIndex : null
  };
}

/**
 * Scroll element into view with highlight animation
 */
export function scrollToElement(elementId, duration = 2000) {
  if (!elementId) return;

  setTimeout(() => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('animate-pulse-highlight');

      setTimeout(() => {
        element.classList.remove('animate-pulse-highlight');
      }, duration);
    }
  }, 100);
}