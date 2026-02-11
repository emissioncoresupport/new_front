/**
 * CBAM Module Orchestrator
 * Minimal service to coordinate cross-component workflows
 * Provides hooks for entry creation, verification, and reporting
 */

import { base44 } from '@/api/base44Client';
import CBAMCalculationService from './CBAMCalculationService';
import { toast } from 'sonner';

export class CBAMOrchestrator {
  /**
   * Create emission entry with full calculation pipeline
   */
  static async createEntry(entryData, options = {}) {
    try {
      console.log('[Orchestrator] Creating entry:', entryData.import_id || entryData.cn_code);
      
      // Normalize input data
      const normalizedData = {
        ...entryData,
        cn_code: entryData.cn_code || entryData.hs_code || '',
        quantity: parseFloat(entryData.quantity) || parseFloat(entryData.net_mass_tonnes) || 0,
        country_of_origin: entryData.country_of_origin || '',
        calculation_method: entryData.calculation_method || 'Default_values',
        reporting_period_year: entryData.reporting_period_year || 2026
      };
      
      // Step 1: Calculate with precursors via backend
      const calcResult = await base44.functions.invoke('cbamCalculationEngine', {
        entry_data: normalizedData,
        include_precursors: options.includePrecursors !== false
      });
      
      const calculation = calcResult.data;
      
      if (!calculation.success) {
        throw new Error(calculation.error || 'Calculation failed');
      }

      // Step 2: Get current user company
      const user = await base44.auth.me();
      const users = await base44.entities.User.list();
      const fullUser = users.find(u => u.email === user.email);
      
      // Step 3: Prepare entry data from calculation
      const entryToCreate = {
        // Core fields from calculation
        import_id: normalizedData.import_id || `IMP-2026-${Math.floor(Math.random() * 10000)}`,
        cn_code: calculation.calculated_entry.cn_code,
        quantity: calculation.calculated_entry.quantity,
        country_of_origin: calculation.calculated_entry.country_of_origin,
        calculation_method: calculation.calculated_entry.calculation_method,
        production_route: calculation.calculated_entry.production_route,
        
        // Emission values
        direct_emissions_specific: calculation.calculated_entry.direct_emissions_specific,
        indirect_emissions_specific: calculation.calculated_entry.indirect_emissions_specific,
        total_embedded_emissions: calculation.calculated_entry.total_embedded_emissions,
        precursor_emissions_embedded: calculation.calculated_entry.precursor_emissions_embedded,
        precursors_used: calculation.calculated_entry.precursors_used,
        
        // CBAM specific
        cbam_factor_applied: calculation.calculated_entry.cbam_factor_applied,
        free_allocation_adjustment: calculation.calculated_entry.free_allocation_adjustment,
        certificates_required: calculation.calculated_entry.certificates_required,
        default_value_used: calculation.calculated_entry.default_value_used,
        mark_up_percentage_applied: calculation.calculated_entry.mark_up_percentage_applied,
        
        // Metadata
        functional_unit: 'tonnes',
        validation_status: 'ai_validated',
        aggregated_goods_category: normalizedData.aggregated_goods_category,
        product_name: normalizedData.product_name,
        import_date: normalizedData.import_date,
        eori_number: normalizedData.eori_number,
        
        // Multi-tenant
        company_id: fullUser?.company_id,
        tenant_id: fullUser?.company_id,
        
        // Documents
        documents: entryData.documents || []
      };
      
      // Step 4: Create entry in database
      const entry = await base44.entities.CBAMEmissionEntry.create(entryToCreate);
      
      console.log('[Orchestrator] Entry created:', entry.id, 'with emissions:', entry.total_embedded_emissions);

      // Step 4.5: VERIFY the data was saved correctly
      if (!entry.total_embedded_emissions || entry.total_embedded_emissions === 0) {
        console.warn('[Orchestrator] WARNING: Entry created but emissions are zero. Re-updating...');
        await base44.entities.CBAMEmissionEntry.update(entry.id, {
          total_embedded_emissions: calculation.calculated_entry.total_embedded_emissions,
          certificates_required: calculation.calculated_entry.certificates_required
        });
      }

      // Step 4.6: Trigger auto-calculate webhook for any additional processing
      try {
        await base44.functions.invoke('cbamAutoCalculateOnCreate', { entry_id: entry.id });
      } catch (error) {
        console.warn('[Orchestrator] Auto-calculate webhook failed (non-critical):', error.message);
      }

      // Step 5: Optional hooks
      if (options.createAuditLog) {
        await this.createAuditLog(entry.id, 'create', 'Entry created with full calculation pipeline');
      }

      if (options.notifyStakeholders) {
        await this.notifyStakeholders(entry);
      }

      return { success: true, entry, calculation };
    } catch (error) {
      console.error('[Orchestrator] Entry creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Link entry to supplier and installation
   */
  static async linkEntryToSupplier(entryId, supplierId, installationId = null) {
    try {
      const updateData = { supplier_id: supplierId };
      
      if (installationId) {
        updateData.installation_id = installationId;
        
        // Auto-populate installation emission factors if available
        const installations = await base44.entities.CBAMInstallation.list();
        const installation = installations.find(i => i.id === installationId);
        
        if (installation?.emission_factors) {
          updateData.direct_emissions_specific = installation.emission_factors.direct_default;
          updateData.indirect_emissions_specific = installation.emission_factors.indirect_default;
          updateData.calculation_method = 'actual_values';
        }
      }

      await base44.entities.CBAMEmissionEntry.update(entryId, updateData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate report and auto-link entries
   */
  static async generateReport(params) {
    try {
      const response = await base44.functions.invoke('cbamReportGenerator', {
        reporting_year: params.year,
        reporting_quarter: params.quarter,
        eori_number: params.eoriNumber,
        member_state: params.memberState,
        auto_link_entries: true
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Report generation failed');
      }

      return { success: true, report: response.data.report };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Simple audit logging
   */
  static async createAuditLog(entityId, action, details) {
    try {
      const user = await base44.auth.me();
      await base44.entities.AuditLog.create({
        entity_type: 'CBAMEmissionEntry',
        entity_id: entityId,
        action,
        user_email: user?.email || 'system',
        details,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Audit log failed:', error);
    }
  }

  /**
   * Notify relevant parties
   */
  static async notifyStakeholders(entry) {
    try {
      // Create notification for pending verification
      if (entry.verification_status === 'not_verified') {
        await base44.entities.Notification.create({
          type: 'verification_required',
          title: 'New CBAM Entry Requires Verification',
          message: `Entry ${entry.import_id} needs third-party verification`,
          entity_type: 'CBAMEmissionEntry',
          entity_id: entry.id,
          read: false
        });
      }
    } catch (error) {
      console.error('Notification failed:', error);
    }
  }
}

export default CBAMOrchestrator;