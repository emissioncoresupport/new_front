/**
 * ⚠️ DEPRECATED - DO NOT USE
 * 
 * This file violates lifecycle boundaries.
 * Use individual lifecycle services instead:
 * 
 * - CBAMEntryService (entry operations)
 * - CBAMCalculationService (calculations)
 * - CBAMValidationService (validation)
 * - CBAMReportingService (reporting)
 * 
 * Scheduled for deletion: March 1, 2026
 */

// FROZEN - NO MODIFICATIONS ALLOWED
// Import new services instead:
// import CBAMEntryService from './lifecycle/CBAMEntryService';
// import CBAMCalculationService from './lifecycle/CBAMCalculationService';

export class CBAMOrchestrator {
  static async createEntry() {
    throw new Error('DEPRECATED: Use CBAMEntryService.createEntry()');
  }
  
  static async linkEntryToSupplier() {
    throw new Error('DEPRECATED: Use event-driven supplier linking via SupplyLens');
  }
  
  static async generateReport() {
    throw new Error('DEPRECATED: Use CBAMReportingService.generateReport()');
  }
}

export default CBAMOrchestrator;