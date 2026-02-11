/**
 * LIFECYCLE 2: EMISSION CALCULATION
 * Domain: Pure computation only
 * Boundaries: NO DB writes, NO validation, NO verification
 */

import { base44 } from '@/api/base44Client';
import eventBus, { CBAM_EVENTS } from '../../services/CBAMEventBus';
import AuditTrailService from '../shared/AuditTrailService';

class CalculationService {
  LIFECYCLE = 'CALCULATION';
  
  /**
   * Calculate and update entry emissions
   * Pure calculation delegated to backend, then update
   */
  async calculateAndUpdate(entryId) {
    try {
      const user = await base44.auth.me();
      
      // Fetch entry
      const entries = await base44.entities.CBAMEmissionEntry.list();
      const entry = entries.find(e => e.id === entryId);
      
      if (!entry) {
        return { success: false, error: 'Entry not found' };
      }
      
      // Call pure calculation engine (backend)
      const { data } = await base44.functions.invoke('cbamCalculationEngine', {
        entry_data: entry,
        include_precursors: true
      });
      
      if (!data.success) {
        return { success: false, error: data.error };
      }
      
      const calc = data.calculated_entry;
      
      // Update ONLY calculation fields
      const updatedEntry = await base44.entities.CBAMEmissionEntry.update(entryId, {
        direct_emissions_specific: calc.direct_emissions_specific,
        indirect_emissions_specific: calc.indirect_emissions_specific,
        precursor_emissions_embedded: calc.precursor_emissions_embedded,
        precursors_used: calc.precursors_used,
        total_embedded_emissions: calc.total_embedded_emissions,
        default_value_with_markup: calc.default_value_with_markup,
        mark_up_percentage_applied: calc.mark_up_percentage_applied,
        cbam_factor_applied: calc.cbam_factor_applied,
        free_allocation_adjustment: calc.free_allocation_adjustment,
        chargeable_emissions: calc.chargeable_emissions,
        certificates_required: calc.certificates_required,
        production_route: calc.production_route,
        default_value_used: calc.default_value_used,
        calculation_method: calc.calculation_method,
        calculation_status: 'completed'
      });
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: this.LIFECYCLE,
        entity_type: 'CBAMEmissionEntry',
        entity_id: entryId,
        action: 'calculated',
        user_email: user.email,
        details: {
          total_embedded_emissions: calc.total_embedded_emissions,
          certificates_required: calc.certificates_required,
          engine_version: calc.engine_version
        }
      });
      
      // Emit event - trigger validation lifecycle
      eventBus.emit(CBAM_EVENTS.CALCULATION_COMPLETED, { entryId, entry: updatedEntry });
      
      return { success: true, entry: updatedEntry, calculation: data };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new CalculationService();