import { base44 } from '@/api/base44Client';

/**
 * CONTRACT 2 Evidence Resolver – Deep-linking from Work Item to exact evidence record.
 * Lookup order: display_id → record_id
 * Always returns array (0, 1, or many matches).
 * Logs resolver telemetry for debugging.
 */
export async function resolveFocusEvidence({
  focusEvidenceId
}) {
  // Validate input
  if (!focusEvidenceId) {
    return [];
  }

  const currentTenant = 'default-tenant'; // TODO: get from auth context
  const searchId = focusEvidenceId.trim();

  try {
    console.debug('[EV_FOCUS] Resolver started', {
      tenantId: currentTenant,
      evidenceParam: searchId
    });

    // Strategy 1: Try display_id match (highest priority)
    try {
      const displayIdMatches = await base44.asServiceRole.entities.Evidence.filter({
        display_id: searchId
      });
      if (displayIdMatches && displayIdMatches.length > 0) {
        console.debug('[EV_FOCUS] Match found', {
          tenantId: currentTenant,
          evidenceParam: searchId,
          matchType: 'display_id',
          foundRecordId: displayIdMatches[0].id
        });
        return displayIdMatches;
      }
    } catch (err) {
      console.debug('[EV_FOCUS] display_id lookup failed:', err.message);
    }

    // Strategy 2: Try record_id (UUID) match
    try {
      const recordIdMatches = await base44.asServiceRole.entities.Evidence.filter({
        id: searchId
      });
      if (recordIdMatches && recordIdMatches.length > 0) {
        console.debug('[EV_FOCUS] Match found', {
          tenantId: currentTenant,
          evidenceParam: searchId,
          matchType: 'record_id',
          foundRecordId: recordIdMatches[0].id
        });
        return recordIdMatches;
      }
    } catch (err) {
      console.debug('[EV_FOCUS] record_id lookup failed:', err.message);
    }

    // No match found
    console.debug('[EV_FOCUS] No match found', {
      tenantId: currentTenant,
      evidenceParam: searchId,
      matchType: 'none'
    });
    return [];

  } catch (error) {
    console.error('[EV_FOCUS] Fatal error:', error);
    return [];
  }
}

/**
 * Fuzzy search for evidence when exact resolve fails.
 * Searches evidence_id and display_id for contains match.
 */
export async function fuzzySearchEvidence(searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    return [];
  }

  try {
    // Fetch all evidence and do client-side fuzzy filter
    // (Since base44 filter doesn't support LIKE/contains, we fetch and filter)
    const allEvidence = await base44.entities.Evidence.list();
    
    const term = searchTerm.toLowerCase();
    const matches = allEvidence.filter(ev => 
      (ev.evidence_id && ev.evidence_id.toLowerCase().includes(term)) ||
      (ev.display_id && ev.display_id.toLowerCase().includes(term)) ||
      (ev.external_reference_id && ev.external_reference_id.toLowerCase().includes(term))
    );

    return matches;
  } catch (error) {
    console.error('[fuzzySearchEvidence] Error:', error);
    return [];
  }
}