/**
 * SupplyLens Upstream Process Context Manager
 * 
 * Enforces the canonical sequence:
 * Overview → Contextual Evidence Creation → Evidence Vault → Structured Evidence → Mapping
 * 
 * NO alternative entry paths allowed.
 */

export const UpstreamContext = {
  // Action origin determines context
  ORIGIN_OVERVIEW: 'overview_action',
  ORIGIN_SUPPLIER_RESPONSE: 'supplier_response',
  ORIGIN_SCHEDULED_REQUEST: 'scheduled_request',
  
  // Mandatory context fields
  REQUIRED_CONTEXT: [
    'origin',           // Where this action came from
    'blockingActionId', // Which blocking item triggered this
    'entityType',       // Supplier, Site, SKU, Material, BOM
    'regulatoryScope',  // Which regulations this feeds
    'purpose',          // Why this evidence is needed
    'expectedFields'    // What minimum information is expected
  ],

  // Ingestion sources (canonical, explicit)
  INGESTION_SOURCES: {
    MANUAL_UPLOAD: 'manual_document_upload',
    BULK_UPLOAD: 'bulk_file_upload',
    ERP_SNAPSHOT: 'erp_declaration_snapshot',
    SUPPLIER_SUBMISSION: 'supplier_submission',
    API_INGESTION: 'api_system_ingestion'
  },

  // Context builders by origin
  buildOverviewActionContext: (actionItem) => ({
    origin: 'overview_action',
    blockingActionId: actionItem.type,
    entityType: actionItem.intended_entity_type || 'UNDECLARED',
    regulatoryScope: actionItem.regulatory_readiness || [],
    purpose: actionItem.title,
    expectedFields: actionItem.required_fields_missing || [],
    actionItemData: actionItem
  }),

  buildSupplierResponseContext: (requestId, requestData) => ({
    origin: 'supplier_response',
    requestId,
    supplierId: requestData.supplier_id,
    entityType: 'SUPPLIER',
    regulatoryScope: requestData.regulatory_relevance || [],
    purpose: `Response to: ${requestData.request_type}`,
    expectedFields: requestData.missing_fields || [],
    requestData
  }),

  // Validate context before Evidence creation
  validateContext: (context) => {
    const missing = UpstreamContext.REQUIRED_CONTEXT.filter(field => !context[field]);
    if (missing.length > 0) {
      throw new Error(`Invalid evidence context. Missing: ${missing.join(', ')}`);
    }
    return true;
  }
};

export default UpstreamContext;