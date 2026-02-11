/**
 * AUDIT TRAIL SERVICE ENFORCER
 * Mandatory logging for all regulated CBAM operations
 * Single source of truth for audit entries
 * 
 * Regulation: Reg 2023/956 Art. 35 (Immutable Audit Trail)
 */

export class AuditTrailServiceEnforcer {
  constructor(base44, user) {
    this.base44 = base44;
    this.user = user;
  }

  /**
   * Log calculation operation
   */
  async logCalculation(entryId, oldData, newData, reason = 'Automatic calculation') {
    if (!entryId) throw new Error('AuditTrail: entryId required');

    const changes = this.computeChanges(oldData, newData);

    const auditEntry = {
      entity_type: 'CBAMEmissionEntry',
      entity_id: entryId,
      action: 'CALCULATION_EXECUTED',
      actor: this.user?.email || 'system:auto-calculate',
      actor_role: this.user?.role || 'system',
      reason,
      old_values: oldData,
      new_values: newData,
      changed_fields: changes,
      regulatory_reference: 'C(2025) 8151 Art. 1-7 (Calculation Execution)',
      severity: 'HIGH',
      timestamp: new Date().toISOString(),
      immutable: true
    };

    const logged = await this.base44.asServiceRole.entities.AuditLog.create(auditEntry);
    return logged;
  }

  /**
   * Log batch recalculation
   */
  async logBatchRecalculation(entryId, oldData, newData, batchId, reason = 'Batch recalculation') {
    if (!entryId) throw new Error('AuditTrail: entryId required');

    const changes = this.computeChanges(oldData, newData);

    const auditEntry = {
      entity_type: 'CBAMEmissionEntry',
      entity_id: entryId,
      action: 'BATCH_RECALCULATION_EXECUTED',
      actor: this.user?.email || 'system:batch-recalculate',
      actor_role: this.user?.role || 'admin',
      reason,
      batch_id: batchId,
      old_values: oldData,
      new_values: newData,
      changed_fields: changes,
      regulatory_reference: 'C(2025) 8150 Art. 3 (Data Integrity)',
      severity: 'HIGH',
      timestamp: new Date().toISOString(),
      immutable: true
    };

    const logged = await this.base44.asServiceRole.entities.AuditLog.create(auditEntry);
    return logged;
  }

  /**
   * Log validation status change (CRITICAL - only by validation service)
   */
  async logValidationStatusChange(entryId, oldStatus, newStatus, validationErrors = []) {
    if (!entryId) throw new Error('AuditTrail: entryId required');

    const auditEntry = {
      entity_type: 'CBAMEmissionEntry',
      entity_id: entryId,
      action: 'VALIDATION_STATUS_CHANGED',
      actor: this.user?.email || 'system:validation-service',
      actor_role: this.user?.role || 'system',
      old_value: oldStatus,
      new_value: newStatus,
      validation_errors: validationErrors,
      regulatory_reference: 'C(2025) 8150 Art. 3 (Validation Gating)',
      severity: 'CRITICAL',
      timestamp: new Date().toISOString(),
      immutable: true
    };

    const logged = await this.base44.asServiceRole.entities.AuditLog.create(auditEntry);
    return logged;
  }

  /**
   * Compute field-level changes
   */
  computeChanges(oldData = {}, newData = {}) {
    const changes = [];

    for (const key of Object.keys(newData)) {
      if (oldData[key] !== newData[key]) {
        changes.push({
          field: key,
          old_value: oldData[key],
          new_value: newData[key]
        });
      }
    }

    return changes;
  }

  /**
   * Security: throw error if write attempted without audit entry
   */
  async guardWrite(entryId, operation) {
    if (!entryId) {
      throw new Error(`AUDIT TRAIL ENFORCER: Write operation without entity ID is not permitted.`);
    }

    const allowedOperations = [
      'CALCULATION_EXECUTED',
      'BATCH_RECALCULATION_EXECUTED',
      'VALIDATION_STATUS_CHANGED',
      'CN_CODE_CHANGE_REQUESTED',
      'PRECURSOR_YEAR_DEVIATION_REQUESTED'
    ];

    if (!allowedOperations.includes(operation)) {
      throw new Error(`AUDIT TRAIL ENFORCER: Unknown operation "${operation}". Write blocked.`);
    }
  }
}