import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * LEGACY EVIDENCE ENDPOINT BLOCKER
 * 
 * CONTRACT 1 enforcement: SINGLE ENTRYPOINT ONLY
 * 
 * Block any legacy endpoints that bypass ingestEvidence():
 * - uploadEvidence (old)
 * - submitEvidence (old)
 * - createEvidenceRaw (old)
 * - manualEvidenceEntry (old)
 * - erpExportIngestion (old)
 * 
 * Return 410 GONE with legal explanation.
 */

const LEGACY_ENDPOINTS = [
  'uploadEvidence',
  'submitEvidence',
  'createEvidenceRaw',
  'manualEvidenceEntry',
  'erpExportIngestion',
  'fileUploadEvidence',
  'apiPushEvidence',
  'supplierPortalSubmit'
];

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const pathname = url.pathname.toLowerCase();
  
  // Check if this is a legacy endpoint call
  const isLegacy = LEGACY_ENDPOINTS.some(endpoint => pathname.includes(endpoint));
  
  if (!isLegacy) {
    return Response.json({ allowed: true });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    console.error(`[CONTRACT_1_LEGACY_BLOCKED] Attempted call to legacy endpoint: ${pathname}, Actor: ${user?.email || 'unknown'}`);

    // Return 410 GONE
    return Response.json({
      success: false,
      error: 'Legacy endpoint no longer supported',
      error_code: 'GONE_410',
      http_status: 410,
      contract: 'CONTRACT_1_VIOLATION',
      rule: 'All evidence ingestion must use the single entrypoint: ingestEvidence()',
      legacy_endpoint: pathname,
      correct_endpoint: 'ingestEvidence',
      message: 'This endpoint has been retired. Use ingestEvidence() instead.',
      legal_note: 'Contract 1 requires a single, auditable ingestion path. Legacy endpoints violated this principle.'
    }, { status: 410 });

  } catch (error) {
    // If auth fails, still reject
    console.error('[CONTRACT_1] Legacy endpoint check error:', error);
    return Response.json({
      error: 'Legacy endpoint not supported',
      error_code: 'GONE_410'
    }, { status: 410 });
  }
});