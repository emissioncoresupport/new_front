/**
 * CBAM Submission Gate - Regulatory Compliance Guard
 * Per Art. 27-29 C(2025) 8151
 * 
 * CRITICAL: Submission BLOCKED until all gates pass:
 * - Validation must be COMPLETE and PASS
 * - Verification must be COMPATIBLE with calculation method
 * - NO lifecycle locks (CN changes, precursor deviations pending)
 * - Direct emissions must be NON-ZERO
 * - Certificates required must be > 0
 * 
 * FAIL-SAFE: Cannot submit with unresolved issues
 */

export class CBAMSubmissionGate {
  /**
   * Evaluate if entry can be submitted
   */
  static canSubmit(entry) {
    const gates = this.evaluateAllGates(entry);
    return {
      canSubmit: gates.every(g => g.passed),
      gates,
      blockedReasons: gates.filter(g => !g.passed).map(g => g.reason)
    };
  }

  /**
   * Evaluate each submission gate
   */
  static evaluateAllGates(entry) {
    return [
      this.validateValidationStatus(entry),
      this.validateVerificationStatus(entry),
      this.validateLifecycleLocks(entry),
      this.validateEmissionsNonZero(entry),
      this.validateCertificatesRequired(entry),
      this.validatePrecursorCompleteness(entry)
    ];
  }

  /**
   * GATE 1: Validation Status
   * Must be explicitly "validated" or "PASS"
   * Pending/flagged blocks submission
   */
  static validateValidationStatus(entry) {
    const validStatuses = ['validated', 'PASS', 'valid'];
    const isValid = validStatuses.includes(
      String(entry.validation_status || '').toLowerCase()
    );

    return {
      gate: 'validation_status',
      passed: isValid,
      status: entry.validation_status || 'unknown',
      reason: isValid
        ? 'Validation complete'
        : `Validation not complete (status: ${entry.validation_status || 'unknown'})`
    };
  }

  /**
   * GATE 2: Verification Status
   * Must match calculation method:
   * - If actual_values or combined: must be "accredited_verifier_satisfactory"
   * - If default_values: verification NOT required (auto-pass)
   * - Unsatisfactory always blocks
   */
  static validateVerificationStatus(entry) {
    const method = (entry.calculation_method || 'default_values').toLowerCase();
    const verStatus = (entry.verification_status || 'not_verified').toLowerCase();

    // Default values don't require verification
    if (method === 'default_values' || method === 'default') {
      return {
        gate: 'verification_status',
        passed: true,
        status: 'not_required',
        reason: 'Default values - verification not required'
      };
    }

    // Actual/combined values MUST have satisfactory verification
    if (method === 'actual_values' || method === 'combined_actual_default') {
      const verified = verStatus === 'accredited_verifier_satisfactory';
      return {
        gate: 'verification_status',
        passed: verified,
        status: verStatus,
        reason: verified
          ? 'Accredited verifier approval obtained'
          : `Verification incomplete or unsatisfactory (status: ${verStatus})`
      };
    }

    return {
      gate: 'verification_status',
      passed: false,
      status: verStatus,
      reason: `Unknown calculation method: ${entry.calculation_method}`
    };
  }

  /**
   * GATE 3: Lifecycle Locks
   * Check for pending CN changes, precursor deviations, recalculation requests
   * Any lock blocks submission
   */
  static validateLifecycleLocks(entry) {
    const locks = entry.lifecycle_locks || [];
    
    // Check if any lock is ACTIVE (not approved/resolved)
    const activeLocks = locks.filter(lock => {
      const status = (lock.status || '').toLowerCase();
      return !['approved', 'resolved', 'rejected'].includes(status);
    });

    const hasLocks = activeLocks.length > 0;
    
    return {
      gate: 'lifecycle_locks',
      passed: !hasLocks,
      lockCount: activeLocks.length,
      locks: activeLocks,
      reason: hasLocks
        ? `${activeLocks.length} pending lifecycle action(s): ${activeLocks.map(l => l.type).join(', ')}`
        : 'No pending lifecycle actions'
    };
  }

  /**
   * GATE 4: Emissions Non-Zero
   * Default values MUST produce penalized emissions > 0
   * Per C(2025) 8552
   */
  static validateEmissionsNonZero(entry) {
    const emissions = entry.direct_emissions_specific || 0;
    const defaultUsed = entry.calculation_method === 'default_values';
    
    const isValid = emissions > 0.001;

    return {
      gate: 'emissions_nonzero',
      passed: isValid,
      emissions: emissions.toFixed(3),
      reason: isValid
        ? `Emissions calculated: ${emissions.toFixed(3)} tCO2e`
        : `${defaultUsed ? 'Default values' : 'Calculation'} produced zero/negative emissions - invalid`
    };
  }

  /**
   * GATE 5: Certificates Required
   * Must be > 0 if not in de-minimis
   */
  static validateCertificatesRequired(entry) {
    const certs = entry.certificates_required || 0;
    const deMinimis = entry.de_minimis_threshold_exceeded === false;

    // If below de minimis threshold, exempted
    if (deMinimis) {
      return {
        gate: 'certificates_required',
        passed: true,
        certificates: 0,
        reason: 'Below de-minimis threshold (exempted from CBAM obligation)'
      };
    }

    const isValid = certs > 0;
    
    return {
      gate: 'certificates_required',
      passed: isValid,
      certificates: certs.toFixed(3),
      reason: isValid
        ? `CBAM certificates required: ${certs.toFixed(3)}`
        : 'No CBAM certificates required (check calculation)'
    };
  }

  /**
   * GATE 6: Precursor Completeness
   * If complex good, must have precursor coverage
   */
  static validatePrecursorCompleteness(entry) {
    const isComplexGood = entry.is_complex_good === true;
    
    if (!isComplexGood) {
      return {
        gate: 'precursor_completeness',
        passed: true,
        reason: 'Simple good - precursors not required'
      };
    }

    const precursors = entry.precursors_used || [];
    const hasCoverage = precursors.length > 0;

    return {
      gate: 'precursor_completeness',
      passed: hasCoverage,
      precursorCount: precursors.length,
      reason: hasCoverage
        ? `${precursors.length} precursor(s) documented`
        : 'Complex good requires precursor data - missing'
    };
  }

  /**
   * Get human-readable submission summary
   */
  static getSubmissionSummary(entry) {
    const evaluation = this.canSubmit(entry);
    
    return {
      ready: evaluation.canSubmit,
      totalGates: evaluation.gates.length,
      passedGates: evaluation.gates.filter(g => g.passed).length,
      gates: evaluation.gates,
      blockers: evaluation.blockedReasons,
      reguVersion: entry.regulatory_version_id || 'CBAM-2026-v1'
    };
  }
}

export default CBAMSubmissionGate;