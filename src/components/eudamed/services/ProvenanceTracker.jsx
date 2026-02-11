import { base44 } from '@/api/base44Client';

/**
 * Field-Level Provenance Tracking Service
 * Records origin and extraction method for every field in EUDAMED entities
 */

/**
 * Record provenance for a field when it's created or updated
 */
export async function recordFieldProvenance({
  entityId,
  entityType,
  fieldPath,
  fieldValue,
  sourceType,
  sourceRefId = null,
  extractionMethod,
  confidenceScore = null,
  tenantId
}) {
  // Validation
  if (extractionMethod === 'ai_assisted' && confidenceScore === null) {
    throw new Error('Confidence score required for AI-assisted extraction');
  }
  
  // AI-extracted values default to "proposed" status
  const reviewStatus = extractionMethod === 'ai_assisted' ? 'proposed' : 'approved';
  
  await base44.entities.FieldProvenance.create({
    tenant_id: tenantId,
    entity_id: entityId,
    entity_type: entityType,
    field_path: fieldPath,
    field_value: String(fieldValue),
    source_type: sourceType,
    source_ref_id: sourceRefId,
    extraction_method: extractionMethod,
    confidence_score: confidenceScore,
    review_status: reviewStatus,
    recorded_at: new Date().toISOString()
  });
}

/**
 * Bulk record provenance for multiple fields (e.g., after document extraction)
 */
export async function recordBulkProvenance(entityId, entityType, fieldsMap, sourceConfig, tenantId) {
  const promises = [];
  
  for (const [fieldPath, fieldValue] of Object.entries(fieldsMap)) {
    if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
      promises.push(
        recordFieldProvenance({
          entityId,
          entityType,
          fieldPath,
          fieldValue,
          tenantId,
          ...sourceConfig
        })
      );
    }
  }
  
  await Promise.all(promises);
}

/**
 * Get provenance history for a specific field
 */
export async function getFieldHistory(entityId, entityType, fieldPath) {
  const allProvenance = await base44.entities.FieldProvenance.list();
  
  return allProvenance
    .filter(p => 
      p.entity_id === entityId && 
      p.entity_type === entityType && 
      p.field_path === fieldPath
    )
    .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
}

/**
 * Get all proposed (AI-extracted, unreviewed) fields for an entity
 */
export async function getProposedFields(entityId, entityType) {
  const allProvenance = await base44.entities.FieldProvenance.list();
  
  return allProvenance.filter(p => 
    p.entity_id === entityId && 
    p.entity_type === entityType && 
    p.review_status === 'proposed'
  );
}

/**
 * Approve or reject AI-extracted field
 */
export async function reviewAIField(provenanceId, decision, reviewerEmail, notes = null) {
  if (!['approved', 'rejected'].includes(decision)) {
    throw new Error('Decision must be approved or rejected');
  }
  
  await base44.entities.FieldProvenance.update(provenanceId, {
    review_status: decision,
    reviewer_id: reviewerEmail,
    reviewed_at: new Date().toISOString(),
    notes: notes
  });
}

/**
 * Get provenance summary for an entire entity
 */
export async function getEntityProvenanceSummary(entityId, entityType) {
  const allProvenance = await base44.entities.FieldProvenance.list();
  const entityProvenance = allProvenance.filter(p => 
    p.entity_id === entityId && p.entity_type === entityType
  );
  
  const summary = {
    totalFields: entityProvenance.length,
    bySource: {},
    byExtractionMethod: {},
    aiProposed: 0,
    aiApproved: 0,
    aiRejected: 0
  };
  
  entityProvenance.forEach(p => {
    // Count by source
    summary.bySource[p.source_type] = (summary.bySource[p.source_type] || 0) + 1;
    
    // Count by extraction method
    summary.byExtractionMethod[p.extraction_method] = 
      (summary.byExtractionMethod[p.extraction_method] || 0) + 1;
    
    // AI review status
    if (p.extraction_method === 'ai_assisted') {
      if (p.review_status === 'proposed') summary.aiProposed++;
      if (p.review_status === 'approved') summary.aiApproved++;
      if (p.review_status === 'rejected') summary.aiRejected++;
    }
  });
  
  return summary;
}

export default {
  recordFieldProvenance,
  recordBulkProvenance,
  getFieldHistory,
  getProposedFields,
  reviewAIField,
  getEntityProvenanceSummary
};