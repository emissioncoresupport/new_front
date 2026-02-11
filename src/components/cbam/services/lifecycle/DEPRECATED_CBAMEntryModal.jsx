/**
 * ⚠️ DEPRECATED - LIFECYCLE VIOLATION
 * 
 * Forensic Audit Date: January 20, 2026
 * Lines: 1010
 * Violations:
 * - Spans Entry + Evidence + Supplier + Calculation lifecycles
 * - Contains inline calculations (lines 84-95)
 * - Directly mutates Supplier entity (line 290)
 * - Performs email operations (line 136)
 * - Mixes UI with orchestration logic
 * 
 * REPLACEMENT:
 * - Use components/cbam/ui/CBAMEntryForm.jsx for metadata input
 * - Use CBAMEntryService for entry creation
 * - Use event-driven supplier linking
 * - Use CBAMCalculationService for calculations
 * 
 * Scheduled for deletion: March 1, 2026
 * DO NOT IMPORT THIS FILE IN NEW CODE
 */

// FROZEN - NO MODIFICATIONS ALLOWED
// Import new components instead

export default function CBAMEntryModal() {
  throw new Error('DEPRECATED: Use components/cbam/ui/CBAMEntryForm.jsx instead');
}