/**
 * CONTRACT 2 HARDENING - Deep-Linking Utilities
 * Canonical URL parameter contract for Evidence Vault deep-linking
 * Ensures "Open Evidence" always lands on exact record with auto-expand
 */

/**
 * Build Evidence Vault deep-link URL
 * RULE: Always prefer displayId (uuid) over displayHumanId (EV-2024-###)
 * 
 * @param evidenceDisplayId - evidence.displayId (uuid, canonical)
 * @param options.tenantId - optional, for cross-tenant safety
 * @param options.expand - auto-expand the record on load (default: true)
 * @param options.focus - focus type (default: 'record')
 * @returns URL path with query params
 */
export function buildEvidenceVaultLink(
  evidenceDisplayId: string,
  options?: {
    tenantId?: string;
    expand?: boolean;
    focus?: 'record' | 'audit' | 'provenance';
  }
): string {
  if (!evidenceDisplayId || evidenceDisplayId.trim() === '') {
    console.warn('[deepLinkingUtils] buildEvidenceVaultLink: empty evidenceDisplayId');
    return '/evidencevault';
  }

  const params = new URLSearchParams();
  params.set('evidenceId', evidenceDisplayId);
  
  if (options?.tenantId) {
    params.set('tenantId', options.tenantId);
  }
  
  if (options?.expand !== false) {
    params.set('expand', 'true');
  }
  
  if (options?.focus && options.focus !== 'record') {
    params.set('focus', options.focus);
  }

  return `/evidencevault?${params.toString()}`;
}

/**
 * Parse Evidence Vault deep-link URL params
 * Returns null-safe object for query hook setup
 */
export function parseEvidenceVaultParams(searchParams: URLSearchParams) {
  return {
    evidenceId: searchParams.get('evidenceId') || undefined,
    tenantId: searchParams.get('tenantId') || undefined,
    expand: searchParams.get('expand') === 'true',
    focus: (searchParams.get('focus') as 'record' | 'audit' | 'provenance' | undefined) || 'record'
  };
}

/**
 * Validate evidence ID format (uuid-like or human id)
 * Returns true if it looks like a valid evidence reference
 */
export function isValidEvidenceId(id: string | undefined): boolean {
  if (!id) return false;
  // Accept uuid-like (with hyphens) or EV-YYYY-### format
  const uuidPattern = /^[a-f0-9\-]{36}$/i;
  const humanPattern = /^EV-\d{4}-\d{3,4}$/;
  return uuidPattern.test(id) || humanPattern.test(id);
}

/**
 * Extract human-readable ID suffix for display (e.g., "004" from "EV-2024-004")
 */
export function extractHumanIdSuffix(humanId: string | undefined): string | null {
  if (!humanId) return null;
  const match = humanId.match(/EV-\d+-(\d+)$/);
  return match ? match[1] : null;
}

/**
 * Build recovery link when evidence not found
 * Allows user to show closest matches
 */
export function buildFuzzySearchLink(
  searchTerm: string,
  options?: { tenantId?: string }
): string {
  const params = new URLSearchParams();
  params.set('search', searchTerm);
  params.set('fuzzy', 'true');
  if (options?.tenantId) {
    params.set('tenantId', options.tenantId);
  }
  return `/evidencevault?${params.toString()}`;
}

/**
 * Build "report link mismatch" Work Item creation URL
 * Pre-populates WI type=CONFLICT, reason=EVIDENCE_LINK_BROKEN
 */
export function buildReportLinkMismatchLink(options: {
  evidenceDisplayId: string;
  evidenceHumanId?: string;
  tenantId?: string;
}): string {
  const params = new URLSearchParams();
  params.set('type', 'CONFLICT');
  params.set('reason', 'EVIDENCE_LINK_BROKEN');
  params.set('evidenceId', options.evidenceDisplayId);
  if (options.evidenceHumanId) {
    params.set('evidenceHumanId', options.evidenceHumanId);
  }
  if (options.tenantId) {
    params.set('tenantId', options.tenantId);
  }
  return `/supplylens?${params.toString()}`;
}