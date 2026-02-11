/**
 * CBAM Verification Service - Verification Lifecycle ONLY
 * Domain: Third-party verification state machine
 * Responsibilities: Manage verification status transitions
 * Boundaries: Does NOT calculate or validate business rules
 */

import { base44 } from '@/api/base44Client';
import eventBus, { CBAM_EVENTS } from '../CBAMEventBus';
import { AuditTrailService } from './CBAMAuditTrailService';

export class CBAMVerificationService {
  /**
   * Valid verification status transitions per Art. 18-20 C(2025) 8150
   */
  static VALID_TRANSITIONS = {
    'not_verified': ['verification_requested'],
    'verification_requested': ['accredited_verifier_satisfactory', 'accredited_verifier_unsatisfactory'],
    'accredited_verifier_satisfactory': ['requires_correction'],
    'accredited_verifier_unsatisfactory': ['requires_correction'],
    'requires_correction': ['verification_requested']
  };
  
  /**
   * Request verification
   * Only for actual_values calculation method
   */
  static async requestVerification(entryId, verifierId) {
    try {
      const user = await base44.auth.me();
      const entries = await base44.entities.CBAMEmissionEntry.filter({ id: entryId });
      const entry = entries[0];
      
      if (!entry) throw new Error('Entry not found');
      
      // Validate calculation method
      if (entry.calculation_method !== 'actual_values') {
        throw new Error('Verification only required for actual emissions (Art. 18 C(2025) 8150)');
      }
      
      // Validate transition
      if (!this.canTransition(entry.verification_status, 'verification_requested')) {
        throw new Error(`Invalid transition from ${entry.verification_status}`);
      }
      
      // Update status
      const updated = await base44.entities.CBAMEmissionEntry.update(entryId, {
        verification_status: 'verification_requested',
        verifier_id: verifierId
      });
      
      // MANDATORY audit
      await AuditTrailService.log({
        entity_type: 'CBAMEmissionEntry',
        entity_id: entryId,
        action: 'request_verification',
        user_email: user.email,
        old_value: { verification_status: entry.verification_status },
        new_value: { verification_status: 'verification_requested', verifier_id: verifierId },
        details: `Verification requested from verifier ${verifierId}`,
        regulatory_reference: 'Art. 18 C(2025) 8150'
      });
      
      // Emit event
      eventBus.emit(CBAM_EVENTS.VERIFICATION_REQUESTED, { 
        entryId,
        verifierId,
        entry: updated
      });
      
      return { success: true, entry: updated };
    } catch (error) {
      console.error('[VerificationService] Request failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Complete verification
   * Called by verifier or admin
   */
  static async completeVerification(entryId, status, verificationReportId) {
    try {
      const user = await base44.auth.me();
      const entries = await base44.entities.CBAMEmissionEntry.filter({ id: entryId });
      const entry = entries[0];
      
      if (!entry) throw new Error('Entry not found');
      
      // Validate status
      const validStatuses = ['accredited_verifier_satisfactory', 'accredited_verifier_unsatisfactory'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid verification status: ${status}`);
      }
      
      // Validate transition
      if (!this.canTransition(entry.verification_status, status)) {
        throw new Error(`Invalid transition from ${entry.verification_status} to ${status}`);
      }
      
      // Update status
      const updated = await base44.entities.CBAMEmissionEntry.update(entryId, {
        verification_status: status,
        verification_report_id: verificationReportId
      });
      
      // MANDATORY audit
      await AuditTrailService.log({
        entity_type: 'CBAMEmissionEntry',
        entity_id: entryId,
        action: 'complete_verification',
        user_email: user.email,
        old_value: { verification_status: entry.verification_status },
        new_value: { verification_status: status, verification_report_id: verificationReportId },
        details: `Verification ${status === 'accredited_verifier_satisfactory' ? 'PASSED' : 'FAILED'}`,
        regulatory_reference: 'Art. 20 C(2025) 8150'
      });
      
      // Emit event
      eventBus.emit(CBAM_EVENTS.VERIFICATION_COMPLETED, { 
        entryId,
        status,
        entry: updated
      });
      
      return { success: true, entry: updated };
    } catch (error) {
      console.error('[VerificationService] Complete failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Check if transition is valid
   */
  static canTransition(fromStatus, toStatus) {
    const allowed = this.VALID_TRANSITIONS[fromStatus] || [];
    return allowed.includes(toStatus);
  }
}

export default CBAMVerificationService;