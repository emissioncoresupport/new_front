/**
 * CBAM VALIDATION SERVICE ENFORCER
 * Single source of truth for validation_status transitions
 * ONLY service that can set validation_status
 * All changes logged to AuditTrailService
 */

export class CBAMValidationServiceEnforcer {
  constructor(base44) {
    this.base44 = base44;
    this.allowedStatuses = [
      'pending',
      'validated',
      'flagged',
      'requires_correction',
      'rejected'
    ];
  }

  /**
   * CRITICAL: Validate entry and set status
   * @param entryId - Entry ID
   * @param validationResult - { passed: bool, errors: [], warnings: [], rules: [] }
   * @returns Updated entry with validation_status set
   */
  async validateAndSetStatus(entryId, validationResult) {
    const entry = await this.base44.entities.CBAMEmissionEntry.filter({ id: entryId });
    if (!entry.length) throw new Error('Entry not found');
    
    const current = entry[0];
    
    // Determine new status based on validation result
    let newStatus;
    if (!validationResult.passed) {
      newStatus = validationResult.critical ? 'rejected' : 'flagged';
    } else {
      newStatus = 'validated';
    }

    // ENFORCE: Cannot set validation_status to invalid value
    if (!this.allowedStatuses.includes(newStatus)) {
      throw new Error(`VALIDATION GATE VIOLATION: Invalid status "${newStatus}". Allowed: ${this.allowedStatuses.join(', ')}`);
    }

    // Update entry
    const updated = await this.base44.asServiceRole.entities.CBAMEmissionEntry.update(entryId, {
      validation_status: newStatus,
      validation_errors: validationResult.errors || [],
      validation_warnings: validationResult.warnings || [],
      materiality_assessment_5_percent: validationResult.materiality_check === true
    });

    // Log to audit trail
    await this.logValidationAudit(entryId, current.validation_status, newStatus, validationResult);

    return updated;
  }

  /**
   * Guard function - prevents any direct assignment of validation_status
   */
  async guardValidationStatusAssignment(entryId, attemptedValue) {
    if (!this.allowedStatuses.includes(attemptedValue)) {
      const error = `VALIDATION GATE VIOLATION: Attempted to assign validation_status="${attemptedValue}" directly. Only CBAMValidationServiceEnforcer can set this field.`;
      
      // Log security incident
      await this.base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'CBAMEmissionEntry',
        entity_id: entryId,
        action: 'SECURITY_VIOLATION',
        field: 'validation_status',
        old_value: 'unknown',
        new_value: attemptedValue,
        attempted_by: 'system',
        message: error,
        severity: 'CRITICAL',
        regulatory_reference: 'Go-Live Requirement: Validation Gate Enforcement',
        timestamp: new Date().toISOString()
      });

      throw new Error(error);
    }
  }

  /**
   * Audit log entry validation with full context
   */
  async logValidationAudit(entryId, oldStatus, newStatus, validationResult) {
    const auditEntry = {
      entity_type: 'CBAMEmissionEntry',
      entity_id: entryId,
      action: 'VALIDATION_STATUS_CHANGE',
      field: 'validation_status',
      old_value: oldStatus || 'pending',
      new_value: newStatus,
      validation_rules_applied: validationResult.rules || [],
      validation_errors: validationResult.errors || [],
      validation_warnings: validationResult.warnings || [],
      materiality_threshold_checked: validationResult.materiality_check === true,
      regulatory_reference: 'C(2025) 8150 Art. 3',
      timestamp: new Date().toISOString()
    };

    await this.base44.asServiceRole.entities.AuditLog.create(auditEntry);
  }

  /**
   * Ensure entry starts with validation_status = 'pending'
   */
  async initializeEntryValidationStatus(entryId) {
    const entry = await this.base44.entities.CBAMEmissionEntry.filter({ id: entryId });
    if (!entry.length) throw new Error('Entry not found');

    if (entry[0].validation_status && entry[0].validation_status !== 'pending') {
      throw new Error(`VALIDATION GATE VIOLATION: Entry ${entryId} already has validation_status="${entry[0].validation_status}". Cannot reinitialize.`);
    }

    // Set to pending
    return await this.base44.asServiceRole.entities.CBAMEmissionEntry.update(entryId, {
      validation_status: 'pending'
    });
  }
}