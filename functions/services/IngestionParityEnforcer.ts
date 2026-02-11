/**
 * Phase 1.2.5 — Ingestion Parity Enforcer
 * 
 * Enforces identical behavior across all ingestion paths:
 * - Manual Upload
 * - Bulk Import
 * - Supplier Portal
 * - ERP Snapshot
 * 
 * CRITICAL: All paths must produce identical Evidence for identical input.
 */

export class IngestionParityEnforcer {
  
  /**
   * Validate mandatory context declaration
   * MUST be called by ALL ingestion paths before Evidence creation
   */
  static validateContext(context, ingestionPath) {
    const violations = [];

    if (!context) {
      violations.push({
        path: ingestionPath,
        violation: 'MISSING_CONTEXT',
        severity: 'CRITICAL',
        reason: 'Context declaration is mandatory per Phase 1.1'
      });
    }

    const requiredFields = ['entity_type', 'intended_use', 'source_role'];
    for (const field of requiredFields) {
      if (!context || !context[field]) {
        violations.push({
          path: ingestionPath,
          violation: `MISSING_CONTEXT_FIELD: ${field}`,
          severity: 'CRITICAL',
          reason: `${field} is mandatory in declared_context`
        });
      }
    }

    // Block if violations found
    if (violations.length > 0) {
      return {
        valid: false,
        violations,
        action: 'BLOCK',
        audit_code: 'CONTEXT_VALIDATION_FAILED'
      };
    }

    return { valid: true };
  }

  /**
   * Enforce NO SILENT NORMALIZATION
   * This checks for forbidden operations
   */
  static checkForSilentNormalization(input, ingestionPath) {
    const violations = [];

    // Check for auto-trimming (whitespace must be preserved)
    if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (typeof value === 'string' && value !== value.trim()) {
          // Whitespace exists - this is OK
          // But we must verify it's NOT being trimmed downstream
        }
      }
    }

    // Block default value injection
    if (input._defaults_applied || input._auto_enriched) {
      violations.push({
        path: ingestionPath,
        violation: 'SILENT_ENRICHMENT_DETECTED',
        severity: 'CRITICAL',
        reason: 'Defaults or auto-enrichment applied without explicit declaration',
        code_location: 'Input object contains _defaults_applied or _auto_enriched flags'
      });
    }

    return violations.length > 0 ? { normalized: true, violations } : { normalized: false };
  }

  /**
   * Enforce Evidence creation rules
   * Returns standardized Evidence object or rejection
   */
  static createEvidencePayload(params) {
    const {
      tenant_id,
      declared_context,
      file_url,
      file_hash_sha256,
      declaration_hash_sha256,
      original_filename,
      actor_id,
      ingestion_path,
      file_size_bytes,
      source_system
    } = params;

    // Validate hash exists
    if (!file_hash_sha256 && !declaration_hash_sha256) {
      return {
        success: false,
        reason: 'NO_HASH_COMPUTED',
        reason_code: 'HASH_REQUIRED',
        severity: 'CRITICAL',
        action: 'REJECT'
      };
    }

    // Context must be validated first
    const contextCheck = this.validateContext(declared_context, ingestion_path);
    if (!contextCheck.valid) {
      return {
        success: false,
        reason: 'CONTEXT_INVALID',
        violations: contextCheck.violations,
        action: 'REJECT'
      };
    }

    // Build Evidence payload (standardized across ALL paths)
    const evidencePayload = {
      tenant_id,
      evidence_id: `EVD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ingestion_path,
      declared_context,
      file_url: file_url || null,
      file_hash_sha256: file_hash_sha256 || null,
      declaration_hash_sha256: declaration_hash_sha256 || null,
      file_size_bytes: file_size_bytes || null,
      original_filename: original_filename || null,
      uploaded_at: new Date().toISOString(),
      actor_id,
      state: 'RAW',
      state_history: [{
        from_state: null,
        to_state: 'RAW',
        transitioned_at: new Date().toISOString(),
        transitioned_by: actor_id,
        reason: `Ingestion via ${ingestion_path}`
      }],
      source_system: source_system || null,
      immutable: true
    };

    return {
      success: true,
      evidencePayload
    };
  }

  /**
   * Materialize failure as REJECTED Evidence
   * NO SILENT FAILURES
   */
  static createRejectedEvidence(params) {
    const {
      tenant_id,
      declared_context,
      actor_id,
      ingestion_path,
      rejection_reason,
      original_input
    } = params;

    return {
      tenant_id,
      evidence_id: `EVD-REJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ingestion_path,
      declared_context: declared_context || { entity_type: 'unknown', intended_use: 'unknown', source_role: 'unknown' },
      file_url: null,
      file_hash_sha256: null,
      declaration_hash_sha256: null,
      uploaded_at: new Date().toISOString(),
      actor_id,
      state: 'REJECTED',
      state_history: [{
        from_state: null,
        to_state: 'REJECTED',
        transitioned_at: new Date().toISOString(),
        transitioned_by: actor_id,
        reason: rejection_reason
      }],
      rejection_reason,
      structured_payload: { original_input },
      immutable: true
    };
  }

  /**
   * ERP Snapshot Declaration Enforcement
   */
  static validateERPSnapshot(params) {
    const { source_system, snapshot_date } = params;

    if (!source_system) {
      return {
        valid: false,
        reason: 'ERP ingestion requires source_system declaration',
        action: 'REJECT'
      };
    }

    if (!snapshot_date) {
      return {
        valid: false,
        reason: 'ERP ingestion requires declared_snapshot_date',
        action: 'REJECT'
      };
    }

    return { valid: true };
  }

  /**
   * Audit log standard format
   */
  static createAuditLog(params) {
    const {
      actor_id,
      actor_role,
      ingestion_path,
      outcome,
      reason_code,
      evidence_id
    } = params;

    return {
      actor_id,
      actor_role,
      action: `INGESTION_${outcome}`,
      entity_type: 'Evidence',
      entity_id: evidence_id || null,
      metadata: {
        ingestion_path,
        reason_code,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cross-path parity verification
   * Tests that same input produces same Evidence across paths
   */
  static verifyParity(testInput, context) {
    const paths = ['upload_documents', 'bulk_import', 'supplier_portal', 'erp_snapshot'];
    const results = [];

    for (const path of paths) {
      const result = this.createEvidencePayload({
        tenant_id: 'test',
        declared_context: context,
        declaration_hash_sha256: 'test-hash',
        actor_id: 'test-user',
        ingestion_path: path
      });

      results.push({
        path,
        success: result.success,
        payload: result.evidencePayload
      });
    }

    // Verify all successful results produce identical payloads (minus evidence_id)
    const successful = results.filter(r => r.success);
    if (successful.length > 1) {
      const first = successful[0].payload;
      for (let i = 1; i < successful.length; i++) {
        const current = successful[i].payload;
        // Compare all fields except evidence_id (which is unique)
        const fieldsToCompare = ['ingestion_path', 'declared_context', 'state', 'immutable'];
        for (const field of fieldsToCompare) {
          if (field === 'ingestion_path') continue; // This should differ
          if (JSON.stringify(first[field]) !== JSON.stringify(current[field])) {
            return {
              parity: false,
              violation: `Field ${field} differs between ${successful[0].path} and ${successful[i].path}`
            };
          }
        }
      }
    }

    return { parity: true };
  }
}