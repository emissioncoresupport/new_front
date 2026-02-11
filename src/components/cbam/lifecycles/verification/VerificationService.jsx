/**
 * CBAM VERIFICATION SERVICE - SOLE VERIFICATION AUTHORITY
 * Version: 2.0 - Accredited Verifier State Machine
 * Compliance: Reg 2023/956 Art. 18-20, C(2025) 8151 Chapter 5
 * 
 * LIFECYCLE 4: VERIFICATION
 * Domain: Accredited verifier state management ONLY
 * Boundaries: NO calculations, NO validation, state transitions only
 */

import { base44 } from '@/api/base44Client';
import eventBus, { CBAM_EVENTS } from '../../services/CBAMEventBus';
import AuditTrailService from '../shared/AuditTrailService';

// VERIFICATION STATE MACHINE (ENFORCED)
const VERIFICATION_STATES = {
  NOT_VERIFIED: 'not_verified',
  VERIFIER_ASSIGNED: 'verifier_assigned',
  VERIFIER_SATISFACTORY: 'verifier_satisfactory',
  VERIFIER_UNSATISFACTORY: 'verifier_unsatisfactory',
  CORRECTION_REQUIRED: 'correction_required'
};

// ALLOWED STATE TRANSITIONS (STRICT)
const ALLOWED_TRANSITIONS = {
  [VERIFICATION_STATES.NOT_VERIFIED]: [VERIFICATION_STATES.VERIFIER_ASSIGNED],
  [VERIFICATION_STATES.VERIFIER_ASSIGNED]: [
    VERIFICATION_STATES.VERIFIER_SATISFACTORY,
    VERIFICATION_STATES.VERIFIER_UNSATISFACTORY
  ],
  [VERIFICATION_STATES.VERIFIER_UNSATISFACTORY]: [VERIFICATION_STATES.CORRECTION_REQUIRED],
  [VERIFICATION_STATES.CORRECTION_REQUIRED]: [VERIFICATION_STATES.VERIFIER_ASSIGNED],
  [VERIFICATION_STATES.VERIFIER_SATISFACTORY]: [] // Terminal state
};

class VerificationService {
  LIFECYCLE = 'VERIFICATION';
  VERSION = '2.0';
  
  /**
   * Validate verifier credentials and role
   * MANDATORY before any verification action
   */
  async _validateVerifier(verifierId) {
    try {
      const verifiers = await base44.asServiceRole.entities.CBAMVerifier.list();
      const verifier = verifiers.find(v => v.id === verifierId);
      
      if (!verifier) {
        return { 
          valid: false, 
          error: 'Verifier not found in accredited registry' 
        };
      }
      
      if (verifier.status !== 'active') {
        return { 
          valid: false, 
          error: `Verifier status is ${verifier.status}, must be active` 
        };
      }
      
      if (!verifier.accreditation_number) {
        return { 
          valid: false, 
          error: 'Verifier missing accreditation number' 
        };
      }
      
      // Check accreditation expiry
      if (verifier.accreditation_expires) {
        const expiryDate = new Date(verifier.accreditation_expires);
        if (expiryDate < new Date()) {
          return { 
            valid: false, 
            error: 'Verifier accreditation has expired' 
          };
        }
      }
      
      return { 
        valid: true, 
        verifier,
        accreditation: verifier.accreditation_number
      };
      
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
  
  /**
   * Check if state transition is allowed
   * ENFORCED state machine
   */
  _canTransition(fromState, toState) {
    const from = fromState || VERIFICATION_STATES.NOT_VERIFIED;
    const allowedNext = ALLOWED_TRANSITIONS[from] || [];
    
    return {
      allowed: allowedNext.includes(toState),
      from,
      to: toState,
      reason: allowedNext.includes(toState) 
        ? 'Transition allowed' 
        : `Transition ${from} → ${toState} not permitted by state machine`
    };
  }
  
  /**
   * Assign accredited verifier to entry
   * STATE: not_verified → verifier_assigned
   */
  async assignVerifier(entryId, verifierId, assignedBy) {
    try {
      const user = await base44.auth.me();
      
      // Fetch entry
      const entries = await base44.entities.CBAMEmissionEntry.list();
      const entry = entries.find(e => e.id === entryId);
      
      if (!entry) {
        return { success: false, error: 'Entry not found' };
      }
      
      // Check current state
      const currentState = entry.verification_status || VERIFICATION_STATES.NOT_VERIFIED;
      const transition = this._canTransition(currentState, VERIFICATION_STATES.VERIFIER_ASSIGNED);
      
      if (!transition.allowed) {
        return { 
          success: false, 
          error: transition.reason,
          current_state: currentState
        };
      }
      
      // Validate verifier credentials
      const verifierCheck = await this._validateVerifier(verifierId);
      
      if (!verifierCheck.valid) {
        return { 
          success: false, 
          error: verifierCheck.error 
        };
      }
      
      // Update entry state
      const updatedEntry = await base44.entities.CBAMEmissionEntry.update(entryId, {
        verification_status: VERIFICATION_STATES.VERIFIER_ASSIGNED,
        verifier_id: verifierId,
        verification_assigned_date: new Date().toISOString(),
        verification_assigned_by: assignedBy || user.email
      });
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: this.LIFECYCLE,
        entity_type: 'CBAMEmissionEntry',
        entity_id: entryId,
        action: 'verifier_assigned',
        user_email: user.email,
        details: {
          previous_state: currentState,
          new_state: VERIFICATION_STATES.VERIFIER_ASSIGNED,
          verifier_id: verifierId,
          verifier_accreditation: verifierCheck.accreditation,
          regulation: 'Reg 2023/956 Art. 18'
        }
      });
      
      // Emit event
      eventBus.emit(CBAM_EVENTS.VERIFICATION_REQUESTED, { 
        entryId, 
        entry: updatedEntry,
        verifier: verifierCheck.verifier
      });
      
      return { 
        success: true, 
        entry: updatedEntry,
        verifier: verifierCheck.verifier
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Submit satisfactory verification opinion
   * STATE: verifier_assigned → verifier_satisfactory
   * REQUIRES: Verifier role, Evidence references
   */
  async submitSatisfactoryOpinion(entryId, verifierId, evidenceIds, reportId, notes) {
    try {
      const user = await base44.auth.me();
      
      // Fetch entry
      const entries = await base44.entities.CBAMEmissionEntry.list();
      const entry = entries.find(e => e.id === entryId);
      
      if (!entry) {
        return { success: false, error: 'Entry not found' };
      }
      
      // Check current state
      const currentState = entry.verification_status || VERIFICATION_STATES.NOT_VERIFIED;
      const transition = this._canTransition(currentState, VERIFICATION_STATES.VERIFIER_SATISFACTORY);
      
      if (!transition.allowed) {
        return { 
          success: false, 
          error: transition.reason,
          current_state: currentState
        };
      }
      
      // ENFORCE: Must be assigned verifier
      if (entry.verifier_id !== verifierId) {
        return { 
          success: false, 
          error: 'Only assigned verifier can submit opinion' 
        };
      }
      
      // Validate verifier credentials
      const verifierCheck = await this._validateVerifier(verifierId);
      
      if (!verifierCheck.valid) {
        return { 
          success: false, 
          error: verifierCheck.error 
        };
      }
      
      // ENFORCE: Evidence references MANDATORY
      if (!evidenceIds || evidenceIds.length === 0) {
        return { 
          success: false, 
          error: 'Satisfactory opinion requires evidence references per Art. 19' 
        };
      }
      
      // ENFORCE: Verification report MANDATORY
      if (!reportId) {
        return { 
          success: false, 
          error: 'Verification report ID is mandatory per Art. 20' 
        };
      }
      
      // Verify evidence exists
      const evidence = await base44.asServiceRole.entities.EvidenceDocument.filter({
        id: { $in: evidenceIds }
      });
      
      if (evidence.length !== evidenceIds.length) {
        return { 
          success: false, 
          error: 'One or more evidence documents not found' 
        };
      }
      
      // Update entry state
      const updatedEntry = await base44.entities.CBAMEmissionEntry.update(entryId, {
        verification_status: VERIFICATION_STATES.VERIFIER_SATISFACTORY,
        verification_report_id: reportId,
        verification_evidence_ids: evidenceIds,
        verification_notes: notes,
        verification_completed_date: new Date().toISOString(),
        verification_completed_by: user.email
      });
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: this.LIFECYCLE,
        entity_type: 'CBAMEmissionEntry',
        entity_id: entryId,
        action: 'verification_satisfactory',
        user_email: user.email,
        details: {
          previous_state: currentState,
          new_state: VERIFICATION_STATES.VERIFIER_SATISFACTORY,
          verifier_id: verifierId,
          verifier_accreditation: verifierCheck.accreditation,
          report_id: reportId,
          evidence_count: evidenceIds.length,
          regulation: 'Reg 2023/956 Art. 19-20'
        }
      });
      
      // Emit event
      eventBus.emit(CBAM_EVENTS.VERIFICATION_COMPLETED, { 
        entryId, 
        entry: updatedEntry,
        decision: 'satisfactory',
        verifier: verifierCheck.verifier
      });
      
      return { 
        success: true, 
        entry: updatedEntry,
        opinion: 'satisfactory'
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Submit unsatisfactory verification opinion
   * STATE: verifier_assigned → verifier_unsatisfactory
   */
  async submitUnsatisfactoryOpinion(entryId, verifierId, evidenceIds, reportId, findings, notes) {
    try {
      const user = await base44.auth.me();
      
      // Fetch entry
      const entries = await base44.entities.CBAMEmissionEntry.list();
      const entry = entries.find(e => e.id === entryId);
      
      if (!entry) {
        return { success: false, error: 'Entry not found' };
      }
      
      // Check current state
      const currentState = entry.verification_status || VERIFICATION_STATES.NOT_VERIFIED;
      const transition = this._canTransition(currentState, VERIFICATION_STATES.VERIFIER_UNSATISFACTORY);
      
      if (!transition.allowed) {
        return { 
          success: false, 
          error: transition.reason,
          current_state: currentState
        };
      }
      
      // ENFORCE: Must be assigned verifier
      if (entry.verifier_id !== verifierId) {
        return { 
          success: false, 
          error: 'Only assigned verifier can submit opinion' 
        };
      }
      
      // Validate verifier credentials
      const verifierCheck = await this._validateVerifier(verifierId);
      
      if (!verifierCheck.valid) {
        return { 
          success: false, 
          error: verifierCheck.error 
        };
      }
      
      // ENFORCE: Findings MANDATORY for unsatisfactory
      if (!findings || findings.length === 0) {
        return { 
          success: false, 
          error: 'Unsatisfactory opinion requires findings documentation' 
        };
      }
      
      // Update entry state
      const updatedEntry = await base44.entities.CBAMEmissionEntry.update(entryId, {
        verification_status: VERIFICATION_STATES.VERIFIER_UNSATISFACTORY,
        verification_report_id: reportId,
        verification_evidence_ids: evidenceIds || [],
        verification_findings: findings,
        verification_notes: notes,
        verification_completed_date: new Date().toISOString(),
        verification_completed_by: user.email
      });
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: this.LIFECYCLE,
        entity_type: 'CBAMEmissionEntry',
        entity_id: entryId,
        action: 'verification_unsatisfactory',
        user_email: user.email,
        details: {
          previous_state: currentState,
          new_state: VERIFICATION_STATES.VERIFIER_UNSATISFACTORY,
          verifier_id: verifierId,
          verifier_accreditation: verifierCheck.accreditation,
          findings_count: findings.length,
          regulation: 'Reg 2023/956 Art. 19-20'
        }
      });
      
      // Emit event
      eventBus.emit(CBAM_EVENTS.VERIFICATION_COMPLETED, { 
        entryId, 
        entry: updatedEntry,
        decision: 'unsatisfactory',
        findings
      });
      
      return { 
        success: true, 
        entry: updatedEntry,
        opinion: 'unsatisfactory',
        findings
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Request correction after unsatisfactory opinion
   * STATE: verifier_unsatisfactory → correction_required
   */
  async requestCorrection(entryId, verifierId, correctionActions) {
    try {
      const user = await base44.auth.me();
      
      // Fetch entry
      const entries = await base44.entities.CBAMEmissionEntry.list();
      const entry = entries.find(e => e.id === entryId);
      
      if (!entry) {
        return { success: false, error: 'Entry not found' };
      }
      
      // Check current state
      const currentState = entry.verification_status || VERIFICATION_STATES.NOT_VERIFIED;
      const transition = this._canTransition(currentState, VERIFICATION_STATES.CORRECTION_REQUIRED);
      
      if (!transition.allowed) {
        return { 
          success: false, 
          error: transition.reason,
          current_state: currentState
        };
      }
      
      // ENFORCE: Must be assigned verifier
      if (entry.verifier_id !== verifierId) {
        return { 
          success: false, 
          error: 'Only assigned verifier can request corrections' 
        };
      }
      
      // Update entry state
      const updatedEntry = await base44.entities.CBAMEmissionEntry.update(entryId, {
        verification_status: VERIFICATION_STATES.CORRECTION_REQUIRED,
        correction_actions: correctionActions,
        correction_requested_date: new Date().toISOString()
      });
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: this.LIFECYCLE,
        entity_type: 'CBAMEmissionEntry',
        entity_id: entryId,
        action: 'correction_requested',
        user_email: user.email,
        details: {
          previous_state: currentState,
          new_state: VERIFICATION_STATES.CORRECTION_REQUIRED,
          verifier_id: verifierId,
          actions: correctionActions
        }
      });
      
      return { 
        success: true, 
        entry: updatedEntry
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Re-assign verifier after corrections
   * STATE: correction_required → verifier_assigned
   */
  async reassignAfterCorrection(entryId, verifierId) {
    try {
      const user = await base44.auth.me();
      
      // Fetch entry
      const entries = await base44.entities.CBAMEmissionEntry.list();
      const entry = entries.find(e => e.id === entryId);
      
      if (!entry) {
        return { success: false, error: 'Entry not found' };
      }
      
      // Check current state
      const currentState = entry.verification_status || VERIFICATION_STATES.NOT_VERIFIED;
      const transition = this._canTransition(currentState, VERIFICATION_STATES.VERIFIER_ASSIGNED);
      
      if (!transition.allowed) {
        return { 
          success: false, 
          error: transition.reason,
          current_state: currentState
        };
      }
      
      // ENFORCE: Entry must have been modified since correction request
      if (!entry.updated_date || !entry.correction_requested_date) {
        return { 
          success: false, 
          error: 'Entry must be updated before re-verification' 
        };
      }
      
      const updatedDate = new Date(entry.updated_date);
      const correctionDate = new Date(entry.correction_requested_date);
      
      if (updatedDate <= correctionDate) {
        return { 
          success: false, 
          error: 'Entry has not been modified since correction request' 
        };
      }
      
      // Validate verifier
      const verifierCheck = await this._validateVerifier(verifierId);
      
      if (!verifierCheck.valid) {
        return { 
          success: false, 
          error: verifierCheck.error 
        };
      }
      
      // Update entry state
      const updatedEntry = await base44.entities.CBAMEmissionEntry.update(entryId, {
        verification_status: VERIFICATION_STATES.VERIFIER_ASSIGNED,
        verifier_id: verifierId,
        verification_assigned_date: new Date().toISOString(),
        verification_cycle: (entry.verification_cycle || 0) + 1
      });
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: this.LIFECYCLE,
        entity_type: 'CBAMEmissionEntry',
        entity_id: entryId,
        action: 'reverification_assigned',
        user_email: user.email,
        details: {
          previous_state: currentState,
          new_state: VERIFICATION_STATES.VERIFIER_ASSIGNED,
          verifier_id: verifierId,
          verification_cycle: updatedEntry.verification_cycle
        }
      });
      
      return { 
        success: true, 
        entry: updatedEntry
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get verification history for entry
   * AUDIT TRAIL QUERY
   */
  async getVerificationHistory(entryId) {
    try {
      const trail = await AuditTrailService.getTrail('CBAMEmissionEntry', entryId);
      
      if (!trail.success) {
        return { success: false, error: trail.error };
      }
      
      // Filter verification-related actions
      const verificationActions = trail.trail.filter(log => 
        log.action.startsWith('VERIFICATION:')
      ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return {
        success: true,
        history: verificationActions,
        total_cycles: verificationActions.filter(a => a.action.includes('verifier_assigned')).length
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Validate entry readiness for verification
   * PRE-CHECK before assigning verifier
   */
  async validateVerificationReadiness(entryId) {
    try {
      const entries = await base44.entities.CBAMEmissionEntry.list();
      const entry = entries.find(e => e.id === entryId);
      
      if (!entry) {
        return { success: false, error: 'Entry not found' };
      }
      
      const issues = [];
      
      // Must have calculation completed
      if (!entry.calculation_status || entry.calculation_status !== 'completed') {
        issues.push('Calculation not completed');
      }
      
      // Must use actual method for verification to be required
      const method = entry.calculation_method;
      if (method !== 'actual_values' && method !== 'EU_method') {
        return {
          success: true,
          ready: false,
          reason: 'Verification only required for actual emissions methods',
          required: false
        };
      }
      
      // Must have emissions data
      if (!entry.total_embedded_emissions) {
        issues.push('Missing emissions data');
      }
      
      // Should have monitoring plan reference
      if (!entry.monitoring_plan_id) {
        issues.push('Monitoring plan reference missing (recommended)');
      }
      
      return {
        success: true,
        ready: issues.length === 0,
        issues,
        required: true,
        entry_id: entryId
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new VerificationService();