/**
 * CONTRACT 2 - Evidence Lookup Service
 * Handles ID mapping: evidence.record_id (PK), evidence.display_id (UUID), humanId (EV-2024-###)
 */

/**
 * Fetch evidence by ID or display ID
 * Priority: record_id > display_id > human_id (with fuzzy match)
 * Returns evidence record or null if not found
 */
export async function getEvidenceByIdOrDisplayId(tenantId, evidenceId) {
  if (!evidenceId || !tenantId) return null;

  try {
    // Try direct record_id lookup first
    let response = await fetch(`/api/evidence?tenant_id=${tenantId}&record_id=${evidenceId}`);
    if (response.ok) {
      const data = await response.json();
      if (data && !Array.isArray(data)) return data;
      if (Array.isArray(data) && data.length > 0) return data[0];
    }

    // Try display_id (UUID) lookup
    response = await fetch(`/api/evidence?tenant_id=${tenantId}&display_id=${evidenceId}`);
    if (response.ok) {
      const data = await response.json();
      if (data && !Array.isArray(data)) return data;
      if (Array.isArray(data) && data.length > 0) return data[0];
    }

    // Try human_id (EV-2024-###) exact match
    if (evidenceId.match(/^EV-\d{4}-\d{3}$/)) {
      response = await fetch(`/api/evidence?tenant_id=${tenantId}&human_id=${evidenceId}`);
      if (response.ok) {
        const data = await response.json();
        if (data && !Array.isArray(data)) return data;
        if (Array.isArray(data) && data.length > 0) return data[0];
      }
    }

    return null;
  } catch (error) {
    console.error('[getEvidenceByIdOrDisplayId] Error:', error);
    return null;
  }
}

/**
 * Fuzzy search for evidence by partial ID
 * Returns array of matching records
 */
export async function searchEvidenceByFuzzyId(tenantId, searchTerm) {
  if (!searchTerm || !tenantId) return [];

  try {
    const response = await fetch(
      `/api/evidence?tenant_id=${tenantId}&search=${encodeURIComponent(searchTerm)}&fuzzy=1`
    );
    if (response.ok) {
      const data = await response.json();
      return Array.isArray(data) ? data : [data].filter(Boolean);
    }
    return [];
  } catch (error) {
    console.error('[searchEvidenceByFuzzyId] Error:', error);
    return [];
  }
}