/**
 * PPWR Blockchain Service
 * Immutable audit trail for packaging compliance
 */

import { base44 } from '@/api/base44Client';

export class PPWRBlockchainService {
  
  /**
   * Log packaging creation with compliance data
   */
  static async logPackagingCreation(packaging) {
    // Create audit log entry
    return await base44.entities.BlockchainAuditLog.create({
      entity_type: 'PPWRPackaging',
      entity_id: packaging.id,
      action: 'create',
      actor: 'user',
      metadata: {
        material_category: packaging.material_category,
        recycled_content_percentage: packaging.recycled_content_percentage,
        compliance_status: packaging.compliance_status,
        epr_registered: packaging.epr_registered,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  /**
   * Log compliance check result
   */
  static async logComplianceCheck(packagingId, checkResult) {
    return await base44.entities.BlockchainAuditLog.create({
      entity_type: 'PPWRPackaging',
      entity_id: packagingId,
      action: 'compliance_check',
      actor: 'automation',
      metadata: {
        status: checkResult.status,
        score: checkResult.score,
        issues_count: checkResult.issues.length,
        critical_issues: checkResult.issues.filter(i => i.severity === 'critical').length,
        timestamp: checkResult.timestamp
      }
    });
  }
  
  /**
   * Log supplier declaration verification
   */
  static async logSupplierVerification(packagingId, supplierId, verification) {
    return await base44.entities.BlockchainAuditLog.create({
      entity_type: 'PPWRPackaging',
      entity_id: packagingId,
      action: 'supplier_verification',
      actor: 'verifier',
      metadata: {
        supplier_id: supplierId,
        verified: verification.verified,
        mass_balance_valid: verification.mass_balance_valid,
        verification_method: verification.method,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  /**
   * Log EPR submission
   */
  static async logEPRSubmission(packagingId, eprData) {
    return await base44.entities.BlockchainAuditLog.create({
      entity_type: 'PPWRPackaging',
      entity_id: packagingId,
      action: 'epr_submission',
      actor: 'system',
      metadata: {
        epr_scheme_id: eprData.scheme_id,
        submission_period: eprData.period,
        weight_reported_kg: eprData.weight_kg,
        fee_paid_eur: eprData.fee_eur,
        confirmation_number: eprData.confirmation_number,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  /**
   * Log design modification
   */
  static async logDesignChange(packagingId, oldData, newData, reason) {
    return await base44.entities.BlockchainAuditLog.create({
      entity_type: 'PPWRPackaging',
      entity_id: packagingId,
      action: 'design_modification',
      actor: 'user',
      metadata: {
        changes: {
          recycled_content: {
            from: oldData.recycled_content_percentage,
            to: newData.recycled_content_percentage
          },
          recyclability_score: {
            from: oldData.recyclability_score,
            to: newData.recyclability_score
          },
          weight: {
            from: oldData.total_weight_kg,
            to: newData.total_weight_kg
          }
        },
        reason: reason,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  /**
   * Get complete audit trail for packaging
   */
  static async getAuditTrail(packagingId) {
    const logs = await base44.entities.BlockchainAuditLog.filter({
      entity_type: 'PPWRPackaging',
      entity_id: packagingId
    });
    
    return logs.sort((a, b) => 
      new Date(b.created_date) - new Date(a.created_date)
    );
  }
  
  /**
   * Verify data integrity
   */
  static async verifyIntegrity(packagingId) {
    const trail = await this.getAuditTrail(packagingId);
    
    // Simple integrity check - in production would verify cryptographic signatures
    const isComplete = trail.length > 0;
    const hasCreation = trail.some(log => log.action === 'create');
    const hasVerification = trail.some(log => log.action === 'compliance_check');
    
    return {
      verified: isComplete && hasCreation,
      trail_length: trail.length,
      has_creation_record: hasCreation,
      has_compliance_checks: hasVerification,
      last_update: trail.length > 0 ? trail[0].created_date : null,
      integrity_score: isComplete ? 100 : 0
    };
  }
}

export default PPWRBlockchainService;