/**
 * ⚠️ DEPRECATED - LIFECYCLE VIOLATION
 * 
 * Forensic Audit Date: January 20, 2026
 * Lines: 481
 * Violations:
 * - Entry creation + Supplier mutation + Email sending in one component
 * - Direct entity mutations without service layer
 * - No mandatory audit logging
 * 
 * REPLACEMENT:
 * - Use CBAMEntryService.createEntry()
 * - Use event-driven supplier notifications
 * - Use mandatory audit trails
 * 
 * Scheduled for deletion: March 1, 2026
 */

export default function CBAMSmartImportWizard() {
  throw new Error('DEPRECATED: Use CBAMEntryService with event-driven workflow');
}