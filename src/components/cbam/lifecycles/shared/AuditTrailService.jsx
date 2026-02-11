/**
 * SHARED SERVICE: Audit Trail
 * Domain: Mandatory compliance logging across all lifecycles
 * Non-optional, always enforced
 */

import { base44 } from '@/api/base44Client';

class AuditTrailService {
  /**
   * Log regulatory action - MANDATORY, non-optional
   */
  async log(params) {
    const { lifecycle, entity_type, entity_id, action, user_email, details } = params;
    
    try {
      await base44.entities.AuditLog.create({
        entity_type,
        entity_id,
        action: `${lifecycle}:${action}`,
        user_email,
        timestamp: new Date().toISOString(),
        details: {
          lifecycle,
          ...details,
          regulatory_basis: 'C(2025) 8151 Art. 7 - Data Quality & Traceability'
        }
      });
      
      return { success: true };
      
    } catch (error) {
      console.error('[Audit Trail] CRITICAL - Failed to log:', error);
      // Audit failure is CRITICAL - log to console but don't block operation
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Query audit trail for entity
   */
  async getTrail(entityType, entityId) {
    try {
      const logs = await base44.entities.AuditLog.filter({
        entity_type: entityType,
        entity_id: entityId
      });
      
      return { success: true, trail: logs };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new AuditTrailService();