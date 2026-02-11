/**
 * CBAM Entry Workflow - Event-Driven Orchestration
 * Domain: Coordinate Entry → Calculation → Validation lifecycle
 * Responsibilities: Event listeners, workflow state
 * Boundaries: NO direct mutations, event-driven only
 */

import React, { useEffect, useState } from 'react';
import eventBus, { CBAM_EVENTS } from '../services/CBAMEventBus';
import CBAMCalculationService from '../services/lifecycle/CBAMCalculationService';
import CBAMValidationService from '../services/lifecycle/CBAMValidationService';
import { toast } from 'sonner';

/**
 * Event-driven workflow hook
 * Automatically triggers calculation → validation when entry created
 */
export function useCBAMEntryWorkflow() {
  useEffect(() => {
    // Listen for entry creation
    const unsubscribeCreate = eventBus.on(CBAM_EVENTS.ENTRY_CREATED, async ({ entryId, entry }) => {
      console.log('[Workflow] Entry created - triggering calculation');
      
      // Auto-trigger calculation
      const calcResult = await CBAMCalculationService.calculateAndUpdate(entryId);
      
      if (!calcResult.success) {
        toast.error('Auto-calculation failed: ' + calcResult.error);
      }
    });
    
    // Listen for calculation completion
    const unsubscribeCalc = eventBus.on(CBAM_EVENTS.CALCULATION_COMPLETED, async ({ entryId }) => {
      console.log('[Workflow] Calculation complete - triggering validation');
      
      // Auto-trigger validation
      const validationResult = await CBAMValidationService.validateAndUpdate(entryId);
      
      if (!validationResult.success) {
        toast.error('Auto-validation failed: ' + validationResult.error);
      } else if (validationResult.validation.valid) {
        toast.success('Entry validated and ready for reporting');
      } else {
        toast.warning(`Validation issues: ${validationResult.validation.errors.length} errors`);
      }
    });
    
    return () => {
      unsubscribeCreate();
      unsubscribeCalc();
    };
  }, []);
}

/**
 * Workflow component (runs in background)
 */
export default function CBAMEntryWorkflow() {
  useCBAMEntryWorkflow();
  return null; // Invisible background service
}