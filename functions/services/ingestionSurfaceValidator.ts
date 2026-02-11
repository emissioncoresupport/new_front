/**
 * Ingestion Surface Registry & Validator
 * 
 * CANONICAL registry of valid ingestion surfaces.
 * Backend is authoritative. UI cannot fake surfaces.
 */

const INGESTION_SURFACES = {
  manual_upload: {
    status: 'FULLY_IMPLEMENTED',
    description: 'Manual file upload via Evidence Vault',
    implemented: true
  },
  bulk_upload: {
    status: 'NOT_IMPLEMENTED',
    description: 'Bulk CSV/ZIP file upload',
    implemented: false
  },
  erp_declaration: {
    status: 'NOT_IMPLEMENTED',
    description: 'ERP system data declaration',
    implemented: false
  },
  supplier_submission: {
    status: 'NOT_IMPLEMENTED',
    description: 'Supplier portal data submission',
    implemented: false
  },
  api_ingestion: {
    status: 'NOT_IMPLEMENTED',
    description: 'System-to-system API ingestion',
    implemented: false
  }
};

/**
 * Validate ingestion surface and check implementation status.
 * 
 * @param {string} surface - Ingestion surface identifier
 * @returns {Object} { valid: boolean, status: string, implemented: boolean, reason?: string }
 */
export function validateIngestionSurface(surface) {
  if (!surface) {
    return {
      valid: false,
      status: 'UNKNOWN',
      implemented: false,
      reason: 'Ingestion surface not specified'
    };
  }

  const surfaceConfig = INGESTION_SURFACES[surface];

  if (!surfaceConfig) {
    return {
      valid: false,
      status: 'UNKNOWN',
      implemented: false,
      reason: `Unknown ingestion surface: ${surface}`
    };
  }

  if (!surfaceConfig.implemented) {
    return {
      valid: true,
      status: 'INGESTION_SURFACE_NOT_IMPLEMENTED',
      implemented: false,
      reason: `Surface '${surface}' exists in contract but backend handler not yet implemented`,
      surface_description: surfaceConfig.description
    };
  }

  return {
    valid: true,
    status: 'ALLOWED',
    implemented: true,
    reason: `Surface '${surface}' is fully implemented`
  };
}

/**
 * Get list of unimplemented surfaces for developer console.
 */
export function getUnimplementedSurfaces() {
  return Object.entries(INGESTION_SURFACES)
    .filter(([_, config]) => !config.implemented)
    .map(([name, config]) => ({
      surface: name,
      description: config.description,
      status: config.status
    }));
}

/**
 * Get implementation status report.
 */
export function getImplementationStatus() {
  const implemented = Object.entries(INGESTION_SURFACES)
    .filter(([_, config]) => config.implemented)
    .map(([name]) => name);
  
  const notImplemented = Object.entries(INGESTION_SURFACES)
    .filter(([_, config]) => !config.implemented)
    .map(([name]) => name);

  return {
    total_surfaces: Object.keys(INGESTION_SURFACES).length,
    implemented_count: implemented.length,
    not_implemented_count: notImplemented.length,
    implemented,
    not_implemented: notImplemented
  };
}