/**
 * State Transition Validator
 * Ensures only legal transitions occur
 * Blocks illegal state changes at source
 */

export class StateTransitionValidator {
  /**
   * Validate before allowing user action
   * Returns { allowed, reason, nextState }
   */
  static validateAction(currentState, action, entryData) {
    const CBAMUIStateMachine = require('../services/lifecycle/CBAMUIStateMachine').CBAMUIStateMachine;

    // Check if action is allowed in current state
    const actionCheck = CBAMUIStateMachine.canPerformAction(currentState, action);
    if (!actionCheck.allowed) {
      return {
        allowed: false,
        reason: `Action "${action}" blocked in state ${currentState}`,
        canRetry: false
      };
    }

    // Determine what the next state would be if action succeeds
    const predictedState = this.predictNextState(currentState, action, entryData);

    // Validate transition is legal
    if (!CBAMUIStateMachine.isLegalTransition(currentState, predictedState)) {
      return {
        allowed: false,
        reason: `Illegal transition from ${currentState} to ${predictedState}`,
        canRetry: false
      };
    }

    return {
      allowed: true,
      reason: 'Action allowed',
      nextState: predictedState
    };
  }

  /**
   * Predict next state based on action
   */
  static predictNextState(currentState, action, entryData) {
    const CBAMUIStateMachine = require('../services/lifecycle/CBAMUIStateMachine').CBAMUIStateMachine;
    const CBAM_UI_STATES = require('../services/lifecycle/CBAMUIStateMachine').CBAM_UI_STATES;

    // After action completes, determine new state
    // This is a pure function of the entry data
    return CBAMUIStateMachine.determineState(entryData);
  }

  /**
   * Get list of what user needs to do to unlock next state
   */
  static getUnblockingSteps(currentState, entryData) {
    const CBAMUIStateMachine = require('../services/lifecycle/CBAMUIStateMachine').CBAMUIStateMachine;

    const steps = [];

    if (currentState === 'S0_DRAFT' || currentState === 'S1_SCOPE_RESOLVED') {
      if (!entryData.cn_code) steps.push('Enter valid 8-digit CN code');
      if (!entryData.country_of_origin) steps.push('Select country of origin');
      if (!entryData.quantity || entryData.quantity === 0) steps.push('Enter quantity > 0');
    }

    if (currentState === 'S1_SCOPE_RESOLVED' || currentState === 'S2_DATA_COLLECTION') {
      if (!entryData.aggregated_goods_category) steps.push('Select goods category');
      if (!entryData.direct_emissions_specific || entryData.direct_emissions_specific === 0) {
        steps.push('Emissions must be calculated (not zero)');
      }
      if (entryData.is_complex_good && (!entryData.precursors_used || entryData.precursors_used.length === 0)) {
        steps.push('Complex good: add precursor data');
      }
    }

    if (currentState === 'S3_VALIDATION_PENDING') {
      steps.push('Validation in progress...');
    }

    if (currentState === 'S4_VALIDATION_FAILED') {
      steps.push('Review validation errors and correct data');
    }

    if (currentState === 'S5_VALIDATED') {
      steps.push('Request verification from accredited verifier (optional)');
    }

    if (currentState === 'S7_REPORT_READY') {
      steps.push('All gates passed - ready to submit');
    }

    return steps;
  }
}

export default StateTransitionValidator;