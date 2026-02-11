/**
 * CBAM Entry Service - Import Entry Lifecycle ONLY
 * Domain: Entry creation, updates, deletion
 * Responsibilities: Entry CRUD, metadata management
 * Boundaries: Does NOT calculate, validate, verify, or report
 */

import { base44 } from '@/api/base44Client';
import eventBus, { CBAM_EVENTS } from '../CBAMEventBus';
import { AuditTrailService } from './CBAMAuditTrailService';

export class CBAMEntryService {
  /**
   * Create entry with basic metadata ONLY
   * Calculation happens in separate lifecycle via event
   */
  static async createEntry(entryData) {
    try {
      const user = await base44.auth.me();
      
      // Normalize input - no calculation here
      const entry = {
        // Core import data
        import_id: entryData.import_id || `IMP-${Date.now()}`,
        import_date: entryData.import_date,
        cn_code: entryData.cn_code,
        quantity: parseFloat(entryData.quantity),
        country_of_origin: entryData.country_of_origin,
        
        // Product metadata
        product_name: entryData.product_name,
        aggregated_goods_category: entryData.aggregated_goods_category,
        
        // Method selection (calculation happens later)
        calculation_method: entryData.calculation_method || 'default_values',
        
        // References only - no mutations
        supplier_id: entryData.supplier_id, // Reference, not mutation
        installation_id: entryData.installation_id, // Reference
        
        // Metadata
        eori_number: entryData.eori_number,
        reporting_period_year: entryData.reporting_period_year || 2026,
        
        // State
        validation_status: 'pending',
        verification_status: 'not_verified',
        
        // Tenant
        tenant_id: user.company_id,
        
        // Documents - references only
        documents: entryData.documents || []
      };
      
      // Create entry
      const created = await base44.entities.CBAMEmissionEntry.create(entry);
      
      // MANDATORY audit
      await AuditTrailService.log({
        entity_type: 'CBAMEmissionEntry',
        entity_id: created.id,
        action: 'create',
        user_email: user.email,
        details: 'Entry created - awaiting calculation',
        regulatory_reference: 'Art. 6(2) C(2025) 8151'
      });
      
      // Emit event - triggers calculation lifecycle
      eventBus.emit(CBAM_EVENTS.ENTRY_CREATED, { 
        entryId: created.id,
        entry: created 
      });
      
      return { success: true, entry: created };
    } catch (error) {
      console.error('[EntryService] Creation failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Update entry metadata only
   * Does NOT recalculate - emit event for that
   */
  static async updateEntry(entryId, updates) {
    try {
      const user = await base44.auth.me();
      const oldEntry = await base44.entities.CBAMEmissionEntry.filter({ id: entryId });
      
      // Only allow metadata updates
      const allowedFields = [
        'import_id', 'import_date', 'product_name', 
        'eori_number', 'customs_declaration_mrn',
        'supplier_id', 'installation_id', 'documents'
      ];
      
      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => ({ ...obj, [key]: updates[key] }), {});
      
      const updated = await base44.entities.CBAMEmissionEntry.update(entryId, filteredUpdates);
      
      // MANDATORY audit
      await AuditTrailService.log({
        entity_type: 'CBAMEmissionEntry',
        entity_id: entryId,
        action: 'update',
        user_email: user.email,
        old_value: oldEntry[0],
        new_value: updated,
        details: `Updated fields: ${Object.keys(filteredUpdates).join(', ')}`,
        regulatory_reference: 'Art. 6 C(2025) 8151'
      });
      
      // Emit update event
      eventBus.emit(CBAM_EVENTS.ENTRY_UPDATED, { 
        entryId,
        entry: updated 
      });
      
      return { success: true, entry: updated };
    } catch (error) {
      console.error('[EntryService] Update failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Delete entry
   */
  static async deleteEntry(entryId) {
    try {
      const user = await base44.auth.me();
      const entry = await base44.entities.CBAMEmissionEntry.filter({ id: entryId });
      
      await base44.entities.CBAMEmissionEntry.delete(entryId);
      
      // MANDATORY audit
      await AuditTrailService.log({
        entity_type: 'CBAMEmissionEntry',
        entity_id: entryId,
        action: 'delete',
        user_email: user.email,
        old_value: entry[0],
        details: 'Entry deleted',
        regulatory_reference: 'Art. 6 C(2025) 8151'
      });
      
      eventBus.emit(CBAM_EVENTS.ENTRY_DELETED, { entryId });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * List entries with filters
   */
  static async listEntries(filters = {}) {
    try {
      const user = await base44.auth.me();
      const entries = await base44.entities.CBAMEmissionEntry.filter({
        tenant_id: user.company_id,
        ...filters
      });
      
      return { success: true, entries };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default CBAMEntryService;