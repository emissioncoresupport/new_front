/**
 * CBAM Entry State Machine UI Controller
 * Manages all UI behavior based on deterministic state machine
 * No ad-hoc logic - purely state-driven
 */

import React, { useState, useEffect } from 'react';
import { CBAMUIStateMachine, CBAM_UI_STATES } from '../services/lifecycle/CBAMUIStateMachine';

export default function CBAMEntryStateMachineUI({ entry, onChange, onSubmit }) {
  const [currentState, setCurrentState] = useState(CBAM_UI_STATES.S0_DRAFT);
  const [rules, setRules] = useState({});
  const [derivedMethod, setDerivedMethod] = useState(null);

  // Update state based on entry data changes
  useEffect(() => {
    const newState = CBAMUIStateMachine.determineState(entry);
    setCurrentState(newState);
    
    const visibility = CBAMUIStateMachine.getVisibilityRules(newState);
    setRules(visibility);
    
    const method = CBAMUIStateMachine.getDerivedMethod(entry, newState);
    setDerivedMethod(method);
  }, [entry]);

  // Action validator
  const canPerform = (action) => {
    return CBAMUIStateMachine.canPerformAction(currentState, action).allowed;
  };

  // Render state badge
  const renderStateBadge = () => {
    const stateLabels = {
      [CBAM_UI_STATES.S0_DRAFT]: '📝 Draft',
      [CBAM_UI_STATES.S1_SCOPE_RESOLVED]: '🔍 Scope Resolved',
      [CBAM_UI_STATES.S2_DATA_COLLECTION]: '📊 Data Collection',
      [CBAM_UI_STATES.S3_VALIDATION_PENDING]: '⏳ Validating',
      [CBAM_UI_STATES.S4_VALIDATION_FAILED]: '❌ Validation Failed',
      [CBAM_UI_STATES.S5_VALIDATED]: '✅ Validated',
      [CBAM_UI_STATES.S6_VERIFIED]: '🔐 Verified',
      [CBAM_UI_STATES.S7_REPORT_READY]: '📋 Ready to Submit',
      [CBAM_UI_STATES.S8_SUBMITTED]: '✔️ Submitted'
    };

    return (
      <div className="px-3 py-1.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-900">
        {stateLabels[currentState] || currentState}
      </div>
    );
  };

  return {
    currentState,
    rules,
    derivedMethod,
    canPerform,
    renderStateBadge,
    // Helper methods for UI components
    isFieldEditable: (field) => {
      const allowed = CBAMUIStateMachine.getAllowedActions(currentState);
      return allowed.editableFields?.includes(field) || false;
    },
    isFieldVisible: (field) => {
      const key = `show${field.charAt(0).toUpperCase() + field.slice(1)}`;
      return rules[key] !== false;
    },
    isAllFieldsGreyed: () => rules.allFieldsGreyed === true,
    shouldShowValidationSpinner: () => rules.showValidationSpinner === true,
    shouldShowBlockingReasons: () => rules.showBlockingReasons === true,
    shouldShowReadOnlyBanner: () => rules.showReadOnlyBanner === true
  };
}