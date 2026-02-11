/**
 * CBAM UI State Machine - Regulation-Driven
 * Per Art. 27-29 C(2025) 8151
 * 
 * FUNDAMENTAL RULE: The UI must NEVER allow a state that is not legally valid under CBAM.
 * If the regulation forbids it, the UI must BLOCK it, not warn about it.
 * 
 * All states are DETERMINISTIC and AUTOMATICALLY DERIVED from data, not user-selected.
 */

export const CBAM_UI_STATES = {
  S0_DRAFT: 'S0_DRAFT',
  S1_SCOPE_RESOLVED: 'S1_SCOPE_RESOLVED',
  S2_DATA_COLLECTION: 'S2_DATA_COLLECTION',
  S3_VALIDATION_PENDING: 'S3_VALIDATION_PENDING',
  S4_VALIDATION_FAILED: 'S4_VALIDATION_FAILED',
  S5_VALIDATED: 'S5_VALIDATED',
  S6_VERIFIED: 'S6_VERIFIED',
  S7_REPORT_READY: 'S7_REPORT_READY',
  S8_SUBMITTED: 'S8_SUBMITTED'
};

export class CBAMUIStateMachine {
  /**
   * Determine current state from entry data
   * DETERMINISTIC: No user choice, purely rule-based
   */
  static determineState(entry) {
    if (!entry) return CBAM_UI_STATES.S0_DRAFT;

    // S8: If submitted, always SUBMITTED (immutable)
    if (entry.status === 'submitted' || entry.submission_date) {
      return CBAM_UI_STATES.S8_SUBMITTED;
    }

    // S7: REPORT_READY if VALIDATED/VERIFIED + no lifecycle locks
    if ((entry.validation_status === 'PASS' || entry.validation_status === 'validated') &&
        (!entry.lifecycle_locks || entry.lifecycle_locks.length === 0)) {
      return CBAM_UI_STATES.S7_REPORT_READY;
    }

    // S6: VERIFIED if verification satisfactory
    if (entry.verification_status === 'accredited_verifier_satisfactory') {
      return CBAM_UI_STATES.S6_VERIFIED;
    }

    // S5: VALIDATED if validation passed
    if (entry.validation_status === 'PASS' || entry.validation_status === 'validated') {
      return CBAM_UI_STATES.S5_VALIDATED;
    }

    // S4: VALIDATION_FAILED if validation explicitly failed
    if (entry.validation_status === 'flagged' || entry.validation_status === 'rejected') {
      return CBAM_UI_STATES.S4_VALIDATION_FAILED;
    }

    // S3: VALIDATION_PENDING if all required data present but not yet validated
    if (this.isDataComplete(entry)) {
      return CBAM_UI_STATES.S3_VALIDATION_PENDING;
    }

    // S2: DATA_COLLECTION if scope resolved but data still incomplete
    if (entry.cn_code && entry.aggregated_goods_category) {
      return CBAM_UI_STATES.S2_DATA_COLLECTION;
    }

    // S1: SCOPE_RESOLVED if CN code validated
    if (entry.cn_code && entry.country_of_origin) {
      return CBAM_UI_STATES.S1_SCOPE_RESOLVED;
    }

    // S0: DRAFT (default)
    return CBAM_UI_STATES.S0_DRAFT;
  }

  /**
   * Check if data is complete enough for validation
   */
  static isDataComplete(entry) {
    if (!entry.cn_code || !entry.country_of_origin || !entry.quantity) return false;
    if (!entry.direct_emissions_specific || entry.direct_emissions_specific === 0) return false;
    
    // If complex good, must have precursors
    if (entry.is_complex_good && (!entry.precursors_used || entry.precursors_used.length === 0)) {
      return false;
    }

    return true;
  }

  /**
   * Get allowed UI actions for a given state
   */
  static getAllowedActions(state) {
    const actions = {
      [CBAM_UI_STATES.S0_DRAFT]: {
        canEditCNCode: true,
        canEditQuantity: true,
        canEditCountry: true,
        canEditProductionRoute: true,
        canEditEmissions: true,
        canAddPrecursors: false, // No scope yet
        canSubmit: false,
        canSelectMethod: false, // NEVER user-selectable
        canRequestData: false,
        methodDerived: null,
        editableFields: ['cn_code', 'country_of_origin', 'quantity'],
        livePreviewMode: 'conservative_default'
      },

      [CBAM_UI_STATES.S1_SCOPE_RESOLVED]: {
        canEditCNCode: false, // Locked after scope
        canEditQuantity: true,
        canEditCountry: false, // Locked after scope
        canEditProductionRoute: false, // Auto-derived from CN
        canEditEmissions: false, // Defaults apply
        canAddPrecursors: true, // Only if complex
        canSubmit: false,
        canSelectMethod: false,
        canRequestData: true, // Can request from suppliers
        methodDerived: 'default_values',
        editableFields: ['quantity'],
        livePreviewMode: 'conservative_default_applied'
      },

      [CBAM_UI_STATES.S2_DATA_COLLECTION]: {
        canEditCNCode: false,
        canEditQuantity: true,
        canEditCountry: false,
        canEditProductionRoute: false,
        canEditEmissions: false, // Defaults locked
        canAddPrecursors: true, // Data collection phase
        canSubmit: false,
        canSelectMethod: false,
        canRequestData: true, // Active data collection
        methodDerived: 'default_values',
        editableFields: ['quantity', 'precursors'],
        livePreviewMode: 'conservative_defaults_with_warnings'
      },

      [CBAM_UI_STATES.S3_VALIDATION_PENDING]: {
        canEditCNCode: false,
        canEditQuantity: false, // Locked during validation
        canEditCountry: false,
        canEditProductionRoute: false,
        canEditEmissions: false,
        canAddPrecursors: false,
        canSubmit: false,
        canSelectMethod: false,
        canRequestData: false, // Validation in progress
        methodDerived: 'default_values',
        editableFields: [],
        livePreviewMode: 'validating'
      },

      [CBAM_UI_STATES.S4_VALIDATION_FAILED]: {
        canEditCNCode: false,
        canEditQuantity: true, // User can correct
        canEditCountry: false,
        canEditProductionRoute: false,
        canEditEmissions: false,
        canAddPrecursors: true,
        canSubmit: false,
        canSelectMethod: false,
        canRequestData: true,
        methodDerived: 'default_values',
        editableFields: ['quantity', 'precursors'],
        livePreviewMode: 'conservative_with_errors',
        showBlockingReasons: true
      },

      [CBAM_UI_STATES.S5_VALIDATED]: {
        canEditCNCode: false,
        canEditQuantity: false, // Locked after validation
        canEditCountry: false,
        canEditProductionRoute: false,
        canEditEmissions: false,
        canAddPrecursors: false,
        canSubmit: false, // Need REPORT_READY
        canSelectMethod: false,
        canRequestData: true, // Can still request verification
        methodDerived: 'default_values', // Until verified
        editableFields: [],
        livePreviewMode: 'conservative_validated'
      },

      [CBAM_UI_STATES.S6_VERIFIED]: {
        canEditCNCode: false,
        canEditQuantity: false,
        canEditCountry: false,
        canEditProductionRoute: false,
        canEditEmissions: true, // NOW editable with verified data
        canAddPrecursors: false,
        canSubmit: false, // Still need REPORT_READY
        canSelectMethod: false, // NEVER user-selectable
        canRequestData: false, // Verification complete
        methodDerived: 'EU_method', // Auto-activated
        editableFields: ['direct_emissions_specific', 'indirect_emissions_specific'],
        livePreviewMode: 'verified_actuals'
      },

      [CBAM_UI_STATES.S7_REPORT_READY]: {
        canEditCNCode: false,
        canEditQuantity: false,
        canEditCountry: false,
        canEditProductionRoute: false,
        canEditEmissions: false, // Locked
        canAddPrecursors: false,
        canSubmit: true, // ONLY HERE
        canSelectMethod: false,
        canRequestData: false,
        methodDerived: 'determined',
        editableFields: [],
        livePreviewMode: 'final_submission_preview'
      },

      [CBAM_UI_STATES.S8_SUBMITTED]: {
        canEditCNCode: false,
        canEditQuantity: false,
        canEditCountry: false,
        canEditProductionRoute: false,
        canEditEmissions: false,
        canAddPrecursors: false,
        canSubmit: false, // Immutable
        canSelectMethod: false,
        canRequestData: false,
        canEdit: false, // Entire entry read-only
        methodDerived: 'submitted_snapshot',
        editableFields: [],
        livePreviewMode: 'submitted_readonly'
      }
    };

    return actions[state] || actions[CBAM_UI_STATES.S0_DRAFT];
  }

  /**
   * Get derived calculation method for state
   * NEVER user-selectable. Automatically derived from verification status.
   */
  static getDerivedMethod(entry, state) {
    // Verification satisfactory → EU Method
    if (entry?.verification_status === 'accredited_verifier_satisfactory') {
      return 'EU_method';
    }

    // Everything else → Default Values (penalised)
    return 'default_values';
  }

  /**
   * Validate if an action is allowed in current state
   */
  static canPerformAction(state, action) {
    const allowed = this.getAllowedActions(state);

    const actionMap = {
      'edit_cn_code': 'canEditCNCode',
      'edit_quantity': 'canEditQuantity',
      'edit_country': 'canEditCountry',
      'edit_emissions': 'canEditEmissions',
      'add_precursors': 'canAddPrecursors',
      'submit': 'canSubmit',
      'select_method': 'canSelectMethod',
      'request_data': 'canRequestData',
      'edit_production_route': 'canEditProductionRoute'
    };

    const canPerform = allowed[actionMap[action]];
    
    return {
      allowed: canPerform === true,
      reason: canPerform === true ? 'Action allowed' : `Action blocked in ${state}`
    };
  }

  /**
   * Get UI visibility rules for state
   */
  static getVisibilityRules(state) {
    const rules = {
      [CBAM_UI_STATES.S0_DRAFT]: {
        showCNCodeField: true,
        showCountryField: true,
        showQuantityField: true,
        showProductionRoute: false,
        showPrecursors: false,
        showDefaultsWarning: true,
        showVerificationStatus: false,
        showMethodSelection: false,
        showSubmitButton: false
      },

      [CBAM_UI_STATES.S1_SCOPE_RESOLVED]: {
        showCNCodeField: true, // Read-only
        showCountryField: true, // Read-only
        showQuantityField: true,
        showProductionRoute: true, // Auto-populated
        showPrecursors: true, // Show if complex
        showDefaultsWarning: true,
        showVerificationStatus: false,
        showMethodSelection: false,
        showSubmitButton: false
      },

      [CBAM_UI_STATES.S2_DATA_COLLECTION]: {
        showCNCodeField: true, // Read-only
        showCountryField: true, // Read-only
        showQuantityField: true,
        showProductionRoute: true, // Read-only
        showPrecursors: true,
        showDefaultsWarning: true,
        showVerificationStatus: false,
        showMethodSelection: false,
        showSubmitButton: false,
        showDataCollectionWarnings: true
      },

      [CBAM_UI_STATES.S3_VALIDATION_PENDING]: {
        showCNCodeField: true, // Read-only
        showCountryField: true, // Read-only
        showQuantityField: true, // Read-only
        showProductionRoute: true, // Read-only
        showPrecursors: true, // Read-only
        showDefaultsWarning: false,
        showVerificationStatus: false,
        showMethodSelection: false,
        showSubmitButton: false,
        showValidationSpinner: true
      },

      [CBAM_UI_STATES.S4_VALIDATION_FAILED]: {
        showCNCodeField: true, // Read-only
        showCountryField: true, // Read-only
        showQuantityField: true,
        showProductionRoute: true, // Read-only
        showPrecursors: true,
        showDefaultsWarning: true,
        showVerificationStatus: false,
        showMethodSelection: false,
        showSubmitButton: false,
        showValidationErrors: true,
        showBlockingReasons: true
      },

      [CBAM_UI_STATES.S5_VALIDATED]: {
        showCNCodeField: true, // Read-only
        showCountryField: true, // Read-only
        showQuantityField: true, // Read-only
        showProductionRoute: true, // Read-only
        showPrecursors: true, // Read-only
        showDefaultsWarning: false,
        showVerificationStatus: true,
        showMethodSelection: false,
        showSubmitButton: false,
        showDataRequestOption: true
      },

      [CBAM_UI_STATES.S6_VERIFIED]: {
        showCNCodeField: true, // Read-only
        showCountryField: true, // Read-only
        showQuantityField: true, // Read-only
        showProductionRoute: true, // Read-only
        showPrecursors: true, // Read-only
        showDefaultsWarning: false,
        showVerificationStatus: true,
        showMethodSelection: false, // Auto: EU_method
        showMethodBadge: true, // Show it's EU_method now
        showSubmitButton: false,
        showVerificationEvidence: true
      },

      [CBAM_UI_STATES.S7_REPORT_READY]: {
        showCNCodeField: true, // Read-only
        showCountryField: true, // Read-only
        showQuantityField: true, // Read-only
        showProductionRoute: true, // Read-only
        showPrecursors: true, // Read-only
        showDefaultsWarning: false,
        showVerificationStatus: true,
        showMethodSelection: false,
        showMethodBadge: true,
        showSubmitButton: true, // ENABLED
        showSubmissionGate: true,
        showFinalPreview: true
      },

      [CBAM_UI_STATES.S8_SUBMITTED]: {
        showCNCodeField: true, // Read-only, greyed
        showCountryField: true, // Read-only, greyed
        showQuantityField: true, // Read-only, greyed
        showProductionRoute: true, // Read-only, greyed
        showPrecursors: true, // Read-only, greyed
        showDefaultsWarning: false,
        showVerificationStatus: true,
        showMethodSelection: false,
        showSubmitButton: false,
        showReadOnlyBanner: true,
        showSubmissionDate: true,
        allFieldsGreyed: true
      }
    };

    return rules[state] || rules[CBAM_UI_STATES.S0_DRAFT];
  }

  /**
   * Validation: is state transition legal?
   */
  static isLegalTransition(fromState, toState) {
    // S0 → S1: Must have CN + country
    if (fromState === CBAM_UI_STATES.S0_DRAFT && toState === CBAM_UI_STATES.S1_SCOPE_RESOLVED) {
      return true;
    }

    // S1 → S2: Must have aggregated_goods_category
    if (fromState === CBAM_UI_STATES.S1_SCOPE_RESOLVED && toState === CBAM_UI_STATES.S2_DATA_COLLECTION) {
      return true;
    }

    // S2 → S3: Data must be complete
    if (fromState === CBAM_UI_STATES.S2_DATA_COLLECTION && toState === CBAM_UI_STATES.S3_VALIDATION_PENDING) {
      return true;
    }

    // S3 → S5 or S4: Validation result
    if (fromState === CBAM_UI_STATES.S3_VALIDATION_PENDING) {
      return toState === CBAM_UI_STATES.S5_VALIDATED || toState === CBAM_UI_STATES.S4_VALIDATION_FAILED;
    }

    // S4 → S3: User corrects and re-validates
    if (fromState === CBAM_UI_STATES.S4_VALIDATION_FAILED && toState === CBAM_UI_STATES.S3_VALIDATION_PENDING) {
      return true;
    }

    // S5 → S6: Verification succeeds
    if (fromState === CBAM_UI_STATES.S5_VALIDATED && toState === CBAM_UI_STATES.S6_VERIFIED) {
      return true;
    }

    // S5/S6 → S7: No lifecycle locks + report ready
    if ((fromState === CBAM_UI_STATES.S5_VALIDATED || fromState === CBAM_UI_STATES.S6_VERIFIED) && 
        toState === CBAM_UI_STATES.S7_REPORT_READY) {
      return true;
    }

    // S7 → S8: Submission executed
    if (fromState === CBAM_UI_STATES.S7_REPORT_READY && toState === CBAM_UI_STATES.S8_SUBMITTED) {
      return true;
    }

    return false;
  }
}

export default CBAMUIStateMachine;