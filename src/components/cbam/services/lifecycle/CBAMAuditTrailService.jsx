/**
 * CBAM Audit Trail Service
 * Domain: Mandatory audit logging for all regulated operations
 * Responsibilities: Create immutable audit logs
 * Boundaries: Read-only audit records, no business logic
 */

import { base44 } from '@/api/base44Client';

export class AuditTrailService {
  /**
   * MANDATORY audit logging
   * Called automatically by all lifecycle services
   */
  static async log(params) {
    try {
      const {
        entity_type,
        entity_id,
        action,
        user_email,
        old_value = null,
        new_value = null,
        details,
        regulatory_reference
      } = params;
      
      // Validate required fields
      if (!entity_type || !entity_id || !action || !user_email) {
        throw new Error('Audit log missing required fields');
      }
      
      // Create audit entry
      const audit = await base44.entities.AuditLog.create({
        entity_type,
        entity_id,
        action,
        user_email,
        old_value: old_value ? JSON.stringify(old_value) : null,
        new_value: new_value ? JSON.stringify(new_value) : null,
        details,
        regulatory_reference,
        timestamp: new Date().toISOString(),
        session_id: this.getSessionId()
      });
      
      return { success: true, audit };
    } catch (error) {
      // Audit failures are critical - log but don't block operation
      console.error('[AuditTrail] CRITICAL: Audit log failed:', error);
      
      // Could send to monitoring system here
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get or create session ID
   */
  static getSessionId() {
    if (!window.cbamSessionId) {
      window.cbamSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return window.cbamSessionId;
  }
  
  /**
   * Retrieve audit trail for entity
   */
  static async getAuditTrail(entityType, entityId) {
    try {
      const logs = await base44.entities.AuditLog.filter({
        entity_type: entityType,
        entity_id: entityId
      });
      
      return { success: true, logs };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default AuditTrailService;