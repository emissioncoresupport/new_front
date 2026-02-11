/**
 * CBAM Calculation Service - Emission Calculation Lifecycle ONLY
 * Domain: Pure calculation logic
 * Responsibilities: Calculate emissions, apply benchmarks, free allocation
 * Boundaries: Does NOT create entries, validate, or report
 */

import { base44 } from '@/api/base44Client';
import eventBus, { CBAM_EVENTS } from '../CBAMEventBus';
import { AuditTrailService } from './CBAMAuditTrailService';

export class CBAMCalculationService {
  /**
   * Pure calculation - no database writes
   * Returns calculation result only
   */
  static async calculate(entryData) {
    try {
      // Call consolidated calculation engine
      const { data } = await base44.functions.invoke('cbamCalculationEngine', {
        entry_data: entryData,
        include_precursors: true
      });
      
      if (!data.success) {
        throw new Error(data.error || 'Calculation failed');
      }
      
      return {
        success: true,
        calculated: data.calculated_entry,
        breakdown: data.breakdown
      };
    } catch (error) {
      console.error('[CalculationService] Failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Calculate and update entry
   * This is the orchestration point that bridges Entry + Calculation
   */
  static async calculateAndUpdate(entryId) {
    try {
      const user = await base44.auth.me();
      
      // Fetch entry
      const entries = await base44.entities.CBAMEmissionEntry.filter({ id: entryId });
      const entry = entries[0];
      
      if (!entry) throw new Error('Entry not found');
      
      // Calculate
      const result = await this.calculate(entry);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Update entry with calculation results
      const calculated = result.calculated;
      const updates = {
        direct_emissions_specific: calculated.direct_emissions_specific,
        indirect_emissions_specific: calculated.indirect_emissions_specific,
        total_embedded_emissions: calculated.total_embedded_emissions,
        precursor_emissions_embedded: calculated.precursor_emissions_embedded,
        precursors_used: calculated.precursors_used,
        production_route: calculated.production_route,
        cbam_factor_applied: calculated.cbam_factor_applied,
        free_allocation_adjustment: calculated.free_allocation_adjustment,
        certificates_required: calculated.certificates_required,
        mark_up_percentage_applied: calculated.mark_up_percentage_applied,
        default_value_used: calculated.default_value_used
      };
      
      const updated = await base44.entities.CBAMEmissionEntry.update(entryId, updates);
      
      // MANDATORY audit
      await AuditTrailService.log({
        entity_type: 'CBAMEmissionEntry',
        entity_id: entryId,
        action: 'calculate',
        user_email: user.email,
        details: `Calculation: ${calculated.total_embedded_emissions.toFixed(2)} tCO2e, Certs: ${calculated.certificates_required.toFixed(2)}`,
        regulatory_reference: 'Art. 4-15 C(2025) 8151'
      });
      
      // Emit event - triggers validation lifecycle
      eventBus.emit(CBAM_EVENTS.CALCULATION_COMPLETED, { 
        entryId,
        entry: updated,
        breakdown: result.breakdown
      });
      
      return { success: true, entry: updated, breakdown: result.breakdown };
    } catch (error) {
      console.error('[CalculationService] Calculate and update failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Batch calculate multiple entries
   */
  static async batchCalculate(entryIds) {
    try {
      const results = await Promise.all(
        entryIds.map(id => this.calculateAndUpdate(id))
      );
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      return {
        success: true,
        total: entryIds.length,
        successful,
        failed,
        results
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default CBAMCalculationService;