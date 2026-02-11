/**
 * CN CODE CHANGE SERVICE
 * Change detection, control, and approval workflow
 * 
 * PURPOSE: Prevent silent recalculation on CN code changes
 * SCOPE: Detect → Freeze → Analyze → Approve → Recalculate
 * 
 * CRITICAL: No automatic recalculation allowed
 */

import { base44 } from '@/api/base44Client';
import AuditTrailService from '../shared/AuditTrailService';
import eventBus, { CBAM_EVENTS } from '../../services/CBAMEventBus';

class CNCodeChangeService {
  VERSION = '2.0';
  LIFECYCLE = 'ENTRY';

  /**
   * Detect CN code change on existing entry
   * Called by entry update interceptor
   */
  async onCNCodeChange(entryId, oldCNCode, newCNCode) {
    try {
      const user = await base44.auth.me();

      // Validate change
      if (!oldCNCode || !newCNCode) {
        return { success: false, error: 'Both old and new CN codes required' };
      }

      if (oldCNCode === newCNCode) {
        return { success: true, message: 'No change' };
      }

      // Fetch entry
      const entries = await base44.entities.CBAMEmissionEntry.list();
      const entry = entries.find(e => e.id === entryId);

      if (!entry) {
        return { success: false, error: 'Entry not found' };
      }

      // CRITICAL: Freeze calculation pipeline
      await base44.entities.CBAMEmissionEntry.update(entryId, {
        cn_code_change_status: 'PENDING_APPROVAL',
        cn_code_change_old: oldCNCode,
        cn_code_change_new: newCNCode,
        calculation_frozen: true,
        reporting_blocked: true
      });

      // Create change request
      const changeRequest = await base44.entities.CBAMCNCodeChangeRequest.create({
        entry_id: entryId,
        old_cn_code: oldCNCode,
        new_cn_code: newCNCode,
        requested_by: user.email,
        requested_date: new Date().toISOString(),
        status: 'pending_impact_analysis',
        tenant_id: entry.tenant_id
      });

      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'ENTRY',
        entity_type: 'CBAMEmissionEntry',
        entity_id: entryId,
        action: 'cn_code_change_detected',
        user_email: user.email,
        details: {
          old_cn_code: oldCNCode,
          new_cn_code: newCNCode,
          entry_status: 'FROZEN_PENDING_APPROVAL',
          change_request_id: changeRequest.id
        }
      });

      // Emit event for UI notification
      eventBus.emit(CBAM_EVENTS.CN_CODE_CHANGE_DETECTED, {
        entryId,
        changeRequestId: changeRequest.id,
        oldCNCode,
        newCNCode
      });

      return {
        success: true,
        changeRequest,
        status: 'PENDING_APPROVAL',
        message: 'CN code change detected. Calculation pipeline frozen. Awaiting impact analysis approval.'
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Analyze impact of CN code change
   * MUST be completed before recalculation approval
   */
  async analyzeImpact(changeRequestId) {
    try {
      const user = await base44.auth.me();

      // Fetch change request
      const requests = await base44.entities.CBAMCNCodeChangeRequest.filter({
        id: changeRequestId
      });

      const changeRequest = requests[0];

      if (!changeRequest) {
        return { success: false, error: 'Change request not found' };
      }

      // Fetch entry
      const entries = await base44.entities.CBAMEmissionEntry.list();
      const entry = entries.find(e => e.id === changeRequest.entry_id);

      if (!entry) {
        return { success: false, error: 'Entry not found' };
      }

      // Get benchmarks for both CN codes
      const oldBenchmark = await this._getBenchmark(changeRequest.old_cn_code);
      const newBenchmark = await this._getBenchmark(changeRequest.new_cn_code);

      // Get defaults for both CN codes
      const oldDefaults = await this._getDefaults(changeRequest.old_cn_code);
      const newDefaults = await this._getDefaults(changeRequest.new_cn_code);

      // Calculate old result (from current calculation)
      const oldEmissions = entry.total_embedded_emissions || 0;
      const oldCertificates = entry.certificates_required || 0;

      // Simulate new calculation
      const { data: newCalc } = await base44.functions.invoke('cbamCalculationEngine', {
        entry_data: {
          ...entry,
          cn_code: changeRequest.new_cn_code
        }
      });

      const newEmissions = newCalc?.calculated_entry?.total_embedded_emissions || 0;
      const newCertificates = newCalc?.calculated_entry?.certificates_required || 0;

      // Get ETS price
      const { data: etsData } = await base44.functions.invoke('euETSPriceFetcherV2', {});
      const etsPrice = etsData?.price || 85.0;

      const emissionsDelta = newEmissions - oldEmissions;
      const certificatesDelta = newCertificates - oldCertificates;
      const costDelta = certificatesDelta * etsPrice;

      // Analyze benchmark/default implications
      const benchmarkChange = oldBenchmark?.value !== newBenchmark?.value;
      const defaultChange = oldDefaults?.value !== newDefaults?.value;

      // Create analysis
      const analysis = {
        change_request_id: changeRequestId,
        old_cn_code: changeRequest.old_cn_code,
        old_cn_name: oldBenchmark?.name || 'Unknown',
        new_cn_code: changeRequest.new_cn_code,
        new_cn_name: newBenchmark?.name || 'Unknown',
        
        emissions_impact: {
          old_total_embedded: parseFloat(oldEmissions.toFixed(2)),
          new_total_embedded: parseFloat(newEmissions.toFixed(2)),
          delta_tco2e: parseFloat(emissionsDelta.toFixed(2)),
          delta_percent: oldEmissions > 0 ? parseFloat((emissionsDelta / oldEmissions * 100).toFixed(1)) : 0
        },
        
        certificates_impact: {
          old_required: parseFloat(oldCertificates.toFixed(2)),
          new_required: parseFloat(newCertificates.toFixed(2)),
          delta_certificates: parseFloat(certificatesDelta.toFixed(2)),
          delta_percent: oldCertificates > 0 ? parseFloat((certificatesDelta / oldCertificates * 100).toFixed(1)) : 0
        },
        
        financial_impact: {
          old_cost_eur: parseFloat((oldCertificates * etsPrice).toFixed(2)),
          new_cost_eur: parseFloat((newCertificates * etsPrice).toFixed(2)),
          delta_cost_eur: parseFloat(costDelta.toFixed(2)),
          delta_percent: oldCertificates * etsPrice > 0 
            ? parseFloat((costDelta / (oldCertificates * etsPrice) * 100).toFixed(1))
            : 0,
          ets_price_reference: etsPrice
        },
        
        benchmark_impact: {
          benchmark_changed: benchmarkChange,
          old_benchmark_value: oldBenchmark?.value || null,
          new_benchmark_value: newBenchmark?.value || null
        },
        
        defaults_impact: {
          defaults_changed: defaultChange,
          old_default_value: oldDefaults?.value || null,
          new_default_value: newDefaults?.value || null
        },
        
        analyzed_at: new Date().toISOString(),
        analyzed_by: user.email
      };

      // Store analysis
      await base44.entities.CBAMCNCodeChangeRequest.update(changeRequestId, {
        status: 'impact_analyzed',
        impact_analysis: analysis
      });

      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'ENTRY',
        entity_type: 'CBAMCNCodeChangeRequest',
        entity_id: changeRequestId,
        action: 'cn_code_change_analyzed',
        user_email: user.email,
        details: {
          emissions_delta: emissionsDelta,
          certificates_delta: certificatesDelta,
          cost_delta_eur: costDelta,
          benchmark_changed: benchmarkChange
        }
      });

      // Emit event for UI update
      eventBus.emit(CBAM_EVENTS.CN_CODE_CHANGE_ANALYZED, {
        changeRequestId,
        analysis
      });

      return {
        success: true,
        analysis,
        message: 'Impact analysis complete. Ready for approval.'
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * User approves CN code change and recalculation
   * EXPLICIT approval required
   */
  async approveAndRecalculate(changeRequestId, approvalReason) {
    try {
      const user = await base44.auth.me();

      // Fetch change request
      const requests = await base44.entities.CBAMCNCodeChangeRequest.filter({
        id: changeRequestId
      });

      const changeRequest = requests[0];

      if (!changeRequest) {
        return { success: false, error: 'Change request not found' };
      }

      if (changeRequest.status !== 'impact_analyzed') {
        return { 
          success: false, 
          error: `Change request must be impact analyzed first (current: ${changeRequest.status})` 
        };
      }

      // Fetch entry
      const entries = await base44.entities.CBAMEmissionEntry.list();
      const entry = entries.find(e => e.id === changeRequest.entry_id);

      if (!entry) {
        return { success: false, error: 'Entry not found' };
      }

      // STEP 1: Preserve old calculation
      const backup = await base44.entities.CBAMCalculationHistory.create({
        entry_id: entry.id,
        calculation_snapshot: {
          cn_code: entry.cn_code,
          total_embedded_emissions: entry.total_embedded_emissions,
          chargeable_emissions: entry.chargeable_emissions,
          certificates_required: entry.certificates_required,
          cbam_factor_applied: entry.cbam_factor_applied,
          mark_up_percentage_applied: entry.mark_up_percentage_applied,
          calculation_method: entry.calculation_method
        },
        regulatory_version_id: entry.regulatory_version_id,
        calculation_date: entry.calculation_date || entry.updated_date,
        superseded_by_request: changeRequestId,
        superseded_reason: 'CN_CODE_CHANGE',
        superseded_date: new Date().toISOString()
      });

      // STEP 2: Execute recalculation with new CN code
      const { data: calcData } = await base44.functions.invoke('cbamCalculationEngine', {
        entry_data: {
          ...entry,
          cn_code: changeRequest.new_cn_code
        }
      });

      if (!calcData.success) {
        return { success: false, error: 'Recalculation failed: ' + calcData.error };
      }

      const calc = calcData.calculated_entry;

      // STEP 3: Update entry with new calculation
      const updatedEntry = await base44.entities.CBAMEmissionEntry.update(changeRequest.entry_id, {
        cn_code: changeRequest.new_cn_code,
        cn_code_change_status: 'APPROVED_AND_APPLIED',
        calculation_frozen: false,
        reporting_blocked: false,
        total_embedded_emissions: calc.total_embedded_emissions,
        chargeable_emissions: calc.chargeable_emissions,
        certificates_required: calc.certificates_required,
        cbam_factor_applied: calc.cbam_factor_applied,
        mark_up_percentage_applied: calc.mark_up_percentage_applied,
        recalculated_date: new Date().toISOString(),
        recalculation_request_id: changeRequestId,
        recalculation_approval: {
          approved_by: user.email,
          approved_date: new Date().toISOString(),
          approval_reason: approvalReason
        }
      });

      // STEP 4: Update change request
      await base44.entities.CBAMCNCodeChangeRequest.update(changeRequestId, {
        status: 'approved_and_executed',
        approved_by: user.email,
        approved_date: new Date().toISOString(),
        approval_reason: approvalReason,
        backup_id: backup.id
      });

      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'ENTRY',
        entity_type: 'CBAMCNCodeChangeRequest',
        entity_id: changeRequestId,
        action: 'cn_code_change_approved_and_executed',
        user_email: user.email,
        details: {
          old_cn_code: changeRequest.old_cn_code,
          new_cn_code: changeRequest.new_cn_code,
          entry_id: changeRequest.entry_id,
          approval_reason: approvalReason,
          backup_id: backup.id
        }
      });

      // Emit event for UI update
      eventBus.emit(CBAM_EVENTS.CN_CODE_CHANGE_APPROVED, {
        changeRequestId,
        entryId: changeRequest.entry_id,
        oldCNCode: changeRequest.old_cn_code,
        newCNCode: changeRequest.new_cn_code
      });

      return {
        success: true,
        updatedEntry,
        backup,
        message: 'CN code change approved and recalculation executed.'
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject CN code change
   */
  async rejectChange(changeRequestId, rejectionReason) {
    try {
      const user = await base44.auth.me();

      const requests = await base44.entities.CBAMCNCodeChangeRequest.filter({
        id: changeRequestId
      });

      const changeRequest = requests[0];

      if (!changeRequest) {
        return { success: false, error: 'Change request not found' };
      }

      // Fetch entry and restore CN code
      const entries = await base44.entities.CBAMEmissionEntry.list();
      const entry = entries.find(e => e.id === changeRequest.entry_id);

      if (entry) {
        await base44.entities.CBAMEmissionEntry.update(changeRequest.entry_id, {
          cn_code: changeRequest.old_cn_code,
          cn_code_change_status: 'REJECTED',
          calculation_frozen: false,
          reporting_blocked: false
        });
      }

      // Update change request
      await base44.entities.CBAMCNCodeChangeRequest.update(changeRequestId, {
        status: 'rejected',
        rejected_by: user.email,
        rejected_date: new Date().toISOString(),
        rejection_reason: rejectionReason
      });

      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'ENTRY',
        entity_type: 'CBAMCNCodeChangeRequest',
        entity_id: changeRequestId,
        action: 'cn_code_change_rejected',
        user_email: user.email,
        details: {
          reason: rejectionReason
        }
      });

      return { success: true, message: 'CN code change rejected. Original CN code restored.' };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper: Get benchmark for CN code
   */
  async _getBenchmark(cnCode) {
    try {
      const benchmarks = await base44.entities.CBAMDefaultValue.filter({
        cn_code: cnCode,
        year: 2026
      });

      return benchmarks[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Helper: Get defaults for CN code
   */
  async _getDefaults(cnCode) {
    try {
      const defaults = await base44.entities.CBAMDefaultValue.filter({
        cn_code: cnCode,
        year: 2026
      });

      return defaults[0] || null;
    } catch {
      return null;
    }
  }
}

export default new CNCodeChangeService();