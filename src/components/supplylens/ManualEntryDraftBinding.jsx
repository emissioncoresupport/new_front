/**
 * DRAFT INGESTION BINDING OBJECT
 * Created in Step 1, immutable during Step 2, sealed in Step 3
 * Carries the full context through the workflow
 */

export function createDraftBinding(declaration) {
  return {
    // Immutable contract
    ingestion_method: 'MANUAL_ENTRY',
    source_system: 'INTERNAL_MANUAL',
    
    // Binding context
    dataset_type: declaration.dataset_type,
    declared_scope: declaration.declared_scope,
    scope_target_id: declaration.scope_target_id || null,
    scope_target_name: declaration.scope_target_name || null,
    
    // Quarantine context (if UNKNOWN)
    unlinked_reason: declaration.unlinked_reason || null,
    resolution_due_date: declaration.resolution_due_date || null,
    
    // Provenance
    why_this_evidence: declaration.why_this_evidence,
    purpose_tags: declaration.purpose_tags,
    contains_personal_data: declaration.contains_personal_data,
    gdpr_legal_basis: declaration.gdpr_legal_basis || null,
    retention_policy: declaration.retention_policy,
    retention_custom_days: declaration.retention_custom_days || null,
    
    // Attestation (client-side preparation; server captures actual user)
    entry_notes: declaration.entry_notes,
    
    // Metadata
    created_at: new Date().toISOString(),
    binding_version: '1.0'
  };
}

/**
 * Validate that a binding is complete before sealing
 */
export function validateDraftBinding(binding) {
  const errors = [];
  
  if (!binding.dataset_type) errors.push('dataset_type required');
  if (!binding.declared_scope) errors.push('declared_scope required');
  if (!binding.why_this_evidence || binding.why_this_evidence.length < 20) {
    errors.push('why_this_evidence: min 20 chars required');
  }
  if (!binding.purpose_tags || binding.purpose_tags.length === 0) {
    errors.push('purpose_tags: min 1 required');
  }
  if (!binding.retention_policy) errors.push('retention_policy required');
  if (binding.contains_personal_data === undefined) errors.push('contains_personal_data required');
  if (!binding.entry_notes || binding.entry_notes.length < 20) {
    errors.push('entry_notes: min 20 chars required');
  }
  
  // Scope validation
  if (binding.declared_scope === 'UNKNOWN') {
    if (!binding.unlinked_reason || binding.unlinked_reason.length < 30) {
      errors.push('unlinked_reason: min 30 chars required for UNKNOWN scope');
    }
    if (!binding.resolution_due_date) {
      errors.push('resolution_due_date required for UNKNOWN scope');
    }
  } else {
    if (!binding.scope_target_id) {
      errors.push(`scope_target_id required for ${binding.declared_scope} scope`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}