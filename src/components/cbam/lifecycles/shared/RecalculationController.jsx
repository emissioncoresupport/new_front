/**
 * CBAM RECALCULATION CONTROLLER
 * Version: 2.0 - Controlled Recalculation with User Approval
 * 
 * SHARED SERVICE: Manage recalculation workflows
 * Domain: Controlled data updates with full audit
 * Boundaries: REQUIRES user approval, preserves history
 */

import { base44 } from '@/api/base44Client';
import AuditTrailService from './AuditTrailService';
import eventBus, { CBAM_EVENTS } from '../../services/CBAMEventBus';

class RecalculationController {
  VERSION = '2.0';
  
  /**
   * Request recalculation approval
   * CREATES approval request, does NOT execute
   */
  async requestRecalculation(params) {
    try {
      const user = await base44.auth.me();
      const { entry_ids, new_version_id, impact_analysis_id, reason } = params;
      
      // Validate inputs
      if (!entry_ids || entry_ids.length === 0) {
        return { success: false, error: 'No entries specified for recalculation' };
      }
      
      if (!new_version_id) {
        return { success: false, error: 'New regulatory version required' };
      }
      
      // Create recalculation request
      const request = await base44.entities.CBAMRecalculationRequest.create({
        requested_by: user.email,
        requested_date: new Date().toISOString(),
        entry_ids,
        new_version_id,
        impact_analysis_id,
        reason,
        status: 'pending_approval',
        approval_required: true
      });
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'REGULATORY',
        entity_type: 'CBAMRecalculationRequest',
        entity_id: request.id,
        action: 'recalculation_requested',
        user_email: user.email,
        details: {
          entries_count: entry_ids.length,
          new_version: new_version_id,
          reason
        }
      });
      
      return {
        success: true,
        request,
        message: 'Recalculation request created. Awaiting approval.'
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Approve recalculation request
   * ADMIN ONLY
   */
  async approveRecalculation(requestId, approverEmail) {
    try {
      const user = await base44.auth.me();
      
      // ENFORCE: Admin only
      if (user.role !== 'admin') {
        return {
          success: false,
          error: 'Only admins can approve recalculation requests'
        };
      }
      
      // Fetch request
      const requests = await base44.entities.CBAMRecalculationRequest.list();
      const request = requests.find(r => r.id === requestId);
      
      if (!request) {
        return { success: false, error: 'Request not found' };
      }
      
      if (request.status !== 'pending_approval') {
        return { success: false, error: `Request is ${request.status}, cannot approve` };
      }
      
      // Update request status
      await base44.entities.CBAMRecalculationRequest.update(requestId, {
        status: 'approved',
        approved_by: approverEmail || user.email,
        approved_date: new Date().toISOString()
      });
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'REGULATORY',
        entity_type: 'CBAMRecalculationRequest',
        entity_id: requestId,
        action: 'recalculation_approved',
        user_email: user.email,
        details: {
          approved_by: approverEmail || user.email,
          entries_count: request.entry_ids.length
        }
      });
      
      return {
        success: true,
        request_id: requestId,
        message: 'Recalculation approved. Ready to execute.'
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Execute approved recalculation
   * PRESERVES old data, creates new calculation records
   */
  async executeRecalculation(requestId) {
    try {
      const user = await base44.auth.me();
      
      // Fetch request
      const requests = await base44.entities.CBAMRecalculationRequest.list();
      const request = requests.find(r => r.id === requestId);
      
      if (!request) {
        return { success: false, error: 'Request not found' };
      }
      
      if (request.status !== 'approved') {
        return { 
          success: false, 
          error: `Request must be approved before execution (current: ${request.status})` 
        };
      }
      
      const results = {
        total: request.entry_ids.length,
        success: 0,
        failed: 0,
        details: []
      };
      
      // Process each entry
      for (const entryId of request.entry_ids) {
        try {
          // Fetch entry
          const entries = await base44.entities.CBAMEmissionEntry.list();
          const entry = entries.find(e => e.id === entryId);
          
          if (!entry) {
            results.failed++;
            results.details.push({ entryId, success: false, error: 'Entry not found' });
            continue;
          }
          
          // Create backup of old calculation
          const backup = {
            entry_id: entry.id,
            calculation_snapshot: {
              total_embedded_emissions: entry.total_embedded_emissions,
              chargeable_emissions: entry.chargeable_emissions,
              certificates_required: entry.certificates_required,
              cbam_factor_applied: entry.cbam_factor_applied,
              mark_up_percentage_applied: entry.mark_up_percentage_applied,
              default_value_with_markup: entry.default_value_with_markup
            },
            regulatory_version_id: entry.regulatory_version_id,
            calculation_date: entry.calculation_date || entry.updated_date,
            superseded_by_request: requestId,
            superseded_date: new Date().toISOString()
          };
          
          await base44.entities.CBAMCalculationHistory.create(backup);
          
          // Trigger recalculation with new version
          const { data: calcData } = await base44.functions.invoke('cbamCalculationEngine', {
            entry_data: entry,
            regulatory_version_id: request.new_version_id,
            include_precursors: true
          });
          
          if (!calcData.success) {
            results.failed++;
            results.details.push({ entryId, success: false, error: calcData.error });
            continue;
          }
          
          const calc = calcData.calculated_entry;
          
          // Update entry with NEW calculation
          await base44.entities.CBAMEmissionEntry.update(entryId, {
            total_embedded_emissions: calc.total_embedded_emissions,
            chargeable_emissions: calc.chargeable_emissions,
            certificates_required: calc.certificates_required,
            cbam_factor_applied: calc.cbam_factor_applied,
            mark_up_percentage_applied: calc.mark_up_percentage_applied,
            default_value_with_markup: calc.default_value_with_markup,
            regulatory_version_id: request.new_version_id,
            recalculated_date: new Date().toISOString(),
            recalculation_request_id: requestId
          });
          
          results.success++;
          results.details.push({ entryId, success: true });
          
        } catch (error) {
          results.failed++;
          results.details.push({ entryId, success: false, error: error.message });
        }
      }
      
      // Update request status
      await base44.entities.CBAMRecalculationRequest.update(requestId, {
        status: 'executed',
        executed_date: new Date().toISOString(),
        execution_results: results
      });
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'REGULATORY',
        entity_type: 'CBAMRecalculationRequest',
        entity_id: requestId,
        action: 'recalculation_executed',
        user_email: user.email,
        details: {
          total: results.total,
          success: results.success,
          failed: results.failed,
          new_version: request.new_version_id
        }
      });
      
      // Emit event
      eventBus.emit(CBAM_EVENTS.RECALCULATION_COMPLETED, { 
        requestId, 
        results 
      });
      
      return {
        success: true,
        results,
        message: `Recalculation complete: ${results.success}/${results.total} entries updated`
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Reject recalculation request
   */
  async rejectRecalculation(requestId, reason) {
    try {
      const user = await base44.auth.me();
      
      // ENFORCE: Admin only
      if (user.role !== 'admin') {
        return {
          success: false,
          error: 'Only admins can reject recalculation requests'
        };
      }
      
      await base44.entities.CBAMRecalculationRequest.update(requestId, {
        status: 'rejected',
        rejected_by: user.email,
        rejected_date: new Date().toISOString(),
        rejection_reason: reason
      });
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'REGULATORY',
        entity_type: 'CBAMRecalculationRequest',
        entity_id: requestId,
        action: 'recalculation_rejected',
        user_email: user.email,
        details: { reason }
      });
      
      return { success: true, message: 'Recalculation request rejected' };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new RecalculationController();