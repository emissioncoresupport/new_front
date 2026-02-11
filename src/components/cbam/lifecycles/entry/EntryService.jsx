/**
 * LIFECYCLE 1: IMPORT ENTRY
 * Domain: Entry metadata CRUD only
 * Boundaries: NO calculations, NO validation, NO verification, NO supplier mutations
 */

import { base44 } from '@/api/base44Client';
import eventBus, { CBAM_EVENTS } from '../../services/CBAMEventBus';
import AuditTrailService from '../shared/AuditTrailService';

class EntryService {
  LIFECYCLE = 'ENTRY';
  
  /**
   * Create import entry - metadata only
   */
  async createEntry(entryData) {
    try {
      const user = await base44.auth.me();
      const users = await base44.entities.User.list();
      const fullUser = users.find(u => u.email === user.email);
      
      // Entry metadata only - NO calculations
      const entry = await base44.entities.CBAMEmissionEntry.create({
        ...entryData,
        company_id: fullUser?.company_id,
        validation_status: 'pending',
        calculation_status: 'pending',
        import_id: entryData.import_id || `IMP-${Date.now()}`,
        functional_unit: 'tonnes'
      });
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: this.LIFECYCLE,
        entity_type: 'CBAMEmissionEntry',
        entity_id: entry.id,
        action: 'created',
        user_email: user.email,
        details: { cn_code: entry.cn_code, quantity: entry.quantity }
      });
      
      // Emit event - trigger calculation lifecycle
      eventBus.emit(CBAM_EVENTS.ENTRY_CREATED, { entryId: entry.id, entry });
      
      return { success: true, entry };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Update entry metadata - NO calculations
   */
  async updateEntry(entryId, updates) {
    try {
      const user = await base44.auth.me();
      
      // Only update metadata fields
      const allowedFields = [
        'import_id', 'import_date', 'cn_code', 'product_name',
        'country_of_origin', 'quantity', 'eori_number',
        'customs_declaration_mrn', 'customs_value_eur', 'source'
      ];
      
      const filteredUpdates = {};
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) filteredUpdates[field] = updates[field];
      });
      
      const entry = await base44.entities.CBAMEmissionEntry.update(entryId, filteredUpdates);
      
      await AuditTrailService.log({
        lifecycle: this.LIFECYCLE,
        entity_type: 'CBAMEmissionEntry',
        entity_id: entryId,
        action: 'updated',
        user_email: user.email,
        details: filteredUpdates
      });
      
      eventBus.emit(CBAM_EVENTS.ENTRY_UPDATED, { entryId, entry });
      
      return { success: true, entry };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Delete entry
   */
  async deleteEntry(entryId) {
    try {
      const user = await base44.auth.me();
      
      await base44.entities.CBAMEmissionEntry.delete(entryId);
      
      await AuditTrailService.log({
        lifecycle: this.LIFECYCLE,
        entity_type: 'CBAMEmissionEntry',
        entity_id: entryId,
        action: 'deleted',
        user_email: user.email
      });
      
      eventBus.emit(CBAM_EVENTS.ENTRY_DELETED, { entryId });
      
      return { success: true };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Reference SupplyLens supplier by ID only - NO mutations
   */
  async linkSupplier(entryId, supplierId) {
    try {
      const user = await base44.auth.me();
      
      // ONLY store reference ID
      const entry = await base44.entities.CBAMEmissionEntry.update(entryId, {
        supplier_id: supplierId
      });
      
      await AuditTrailService.log({
        lifecycle: this.LIFECYCLE,
        entity_type: 'CBAMEmissionEntry',
        entity_id: entryId,
        action: 'supplier_linked',
        user_email: user.email,
        details: { supplier_id: supplierId }
      });
      
      return { success: true, entry };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new EntryService();