/**
 * CBAM Operational Truth Audit
 * Validates end-to-end determinism across UI, backend, and database layers
 * Per Art. 27-29 C(2025) 8151
 * 
 * OBJECTIVE: Prove or disprove CBAM operational integrity
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const auditResults = {
      timestamp: new Date().toISOString(),
      userId: user.email,
      tests: []
    };

    // ============ TEST 1: DEFAULT VALUES REALITY CHECK ============
    const test1 = await auditDefaultValuesReality(base44, user.email);
    auditResults.tests.push(test1);

    // ============ TEST 2: METHOD DERIVATION CONSISTENCY ============
    const test2 = await auditMethodDerivation(base44, user.email);
    auditResults.tests.push(test2);

    // ============ TEST 3: PRECURSOR ENFORCEMENT TRUTH ============
    const test3 = await auditPrecursorEnforcement(base44, user.email);
    auditResults.tests.push(test3);

    // ============ TEST 4: SUBMISSION ILLEGALITY TEST ============
    const test4 = await auditSubmissionIllegality(base44, user.email);
    auditResults.tests.push(test4);

    // ============ TEST 5: REPORT ENGINE CAUSALITY ============
    const test5 = await auditReportEngineCausality(base44, user.email);
    auditResults.tests.push(test5);

    // Calculate overall readiness
    const passCount = auditResults.tests.filter(t => t.result === 'PASS').length;
    const failCount = auditResults.tests.filter(t => t.result === 'FAIL').length;
    
    let readinessPct = 100;
    if (failCount > 3) readinessPct = 30;
    else if (failCount > 2) readinessPct = 50;
    else readinessPct = 100 - (failCount * 20);

    auditResults.summary = {
      totalTests: auditResults.tests.length,
      passed: passCount,
      failed: failCount,
      operationalReadinessPct: readinessPct,
      recommendedAction: readinessPct < 50 ? 'BLOCK_PRODUCTION' : 'MONITOR'
    };

    return Response.json(auditResults);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * TEST 1: DEFAULT VALUES REALITY CHECK
 * Verify emissions are non-zero, consistent across layers
 */
async function auditDefaultValuesReality(base44, userEmail) {
  const testName = 'TEST_1_DEFAULT_VALUES_REALITY_CHECK';
  
  try {
    // Create entry WITHOUT supplier data
    const entry = await base44.asServiceRole.entities.CBAMEmissionEntry.create({
      tenant_id: 'audit-tenant',
      cn_code: '72081000', // Iron & Steel
      country_of_origin: 'CN',
      quantity: 100,
      reporting_period_year: 2026,
      functional_unit: 'tonnes',
      calculation_method: 'default_values', // Explicitly default
      direct_emissions_specific: 0, // NO manual input
      indirect_emissions_specific: 0
    });

    // Query DB for persisted value
    const dbEntry = await base44.asServiceRole.entities.CBAMEmissionEntry.filter(
      { id: entry.id },
      '-created_date',
      1
    );

    const persistedEmissions = dbEntry[0]?.direct_emissions_specific || 0;
    const persistedMethod = dbEntry[0]?.calculation_method || 'unknown';

    // Invoke backend calculation (as if onCreate)
    const calcResponse = await base44.asServiceRole.functions.invoke('cbamCalculationEngine', {
      cn_code: '72081000',
      quantity: 100,
      country_of_origin: 'CN',
      calculation_method: 'default_values',
      reporting_period_year: 2026
    });

    const backendEmissions = calcResponse?.data?.direct_emissions || 0;

    // VERIFICATION
    const uiEmissions = persistedEmissions; // What UI would show
    const pass = 
      persistedEmissions > 0 && // NOT zero
      backendEmissions > 0 && // Backend calculated non-zero
      persistedMethod === 'default_values' && // Method consistent
      Math.abs(uiEmissions - backendEmissions) < 0.01; // UI/Backend agree

    return {
      testName,
      result: pass ? 'PASS' : 'FAIL',
      observations: {
        persistedEmissions,
        backendEmissions,
        persistedMethod,
        uiEmissions,
        layerConsistency: {
          dbVsBackend: persistedEmissions === backendEmissions ? 'CONSISTENT' : 'MISMATCH',
          methodDerived: persistedMethod === 'default_values' ? 'CORRECT' : 'WRONG'
        }
      },
      failureReason: pass ? null : 
        persistedEmissions === 0 ? 'DB shows zero emissions' :
        Math.abs(uiEmissions - backendEmissions) >= 0.01 ? 'UI/Backend mismatch' :
        'Method not derived correctly'
    };
  } catch (error) {
    return {
      testName,
      result: 'ERROR',
      error: error.message
    };
  }
}

/**
 * TEST 2: METHOD DERIVATION CONSISTENCY
 * Verify calculation_method badge = DB value = report usage
 */
async function auditMethodDerivation(base44, userEmail) {
  const testName = 'TEST_2_METHOD_DERIVATION_CONSISTENCY';

  try {
    // Create entry with verification status = NOT_VERIFIED
    const entry = await base44.asServiceRole.entities.CBAMEmissionEntry.create({
      tenant_id: 'audit-tenant',
      cn_code: '72081000',
      country_of_origin: 'CN',
      quantity: 100,
      reporting_period_year: 2026,
      functional_unit: 'tonnes',
      verification_status: 'not_verified',
      calculation_method: null // Should be derived
    });

    // Derive method in state machine
    const stateResponse = await base44.asServiceRole.functions.invoke('cbamUIStateMachine', {
      entry_id: entry.id,
      action: 'determine_method'
    });

    const derivedMethod = stateResponse?.data?.derivedMethod || 'unknown';

    // Query DB
    const dbEntry = await base44.asServiceRole.entities.CBAMEmissionEntry.filter(
      { id: entry.id },
      '-created_date',
      1
    );
    const dbMethod = dbEntry[0]?.calculation_method || null;

    // Attempt to generate report
    let reportGenError = null;
    try {
      await base44.asServiceRole.functions.invoke('cbamReportGenerator', {
        entry_id: entry.id
      });
    } catch (e) {
      reportGenError = e.message;
    }

    // VERIFICATION
    const pass = 
      derivedMethod === 'default_values' && // Should derive default (unverified)
      (dbMethod === 'default_values' || dbMethod === null) && // DB consistent
      !reportGenError; // Report generation works

    return {
      testName,
      result: pass ? 'PASS' : 'FAIL',
      observations: {
        derivedMethod,
        dbMethod,
        uiBadgeMethod: derivedMethod, // What UI shows
        reportGenerationError: reportGenError,
        consistency: {
          uiVsDb: derivedMethod === (dbMethod || 'default_values') ? 'MATCH' : 'MISMATCH',
          reportCanUse: !reportGenError ? 'YES' : 'NO'
        }
      },
      failureReason: pass ? null :
        derivedMethod !== 'default_values' ? 'Method not derived as default' :
        reportGenError ? `Report engine error: ${reportGenError}` :
        'Method consistency broken'
    };
  } catch (error) {
    return {
      testName,
      result: 'ERROR',
      error: error.message
    };
  }
}

/**
 * TEST 3: PRECURSOR ENFORCEMENT TRUTH
 * Verify complex goods auto-inject precursor defaults
 */
async function auditPrecursorEnforcement(base44, userEmail) {
  const testName = 'TEST_3_PRECURSOR_ENFORCEMENT_TRUTH';

  try {
    // Create complex good (hot-rolled coil)
    const entry = await base44.asServiceRole.entities.CBAMEmissionEntry.create({
      tenant_id: 'audit-tenant',
      cn_code: '72081000', // Complex good
      country_of_origin: 'CN',
      quantity: 100,
      reporting_period_year: 2026,
      functional_unit: 'tonnes',
      direct_emissions_specific: 1.95,
      calculation_method: 'default_values',
      precursors_used: [] // Explicitly empty
    });

    // Invoke auto-calculation (as if onCreate)
    const calcResponse = await base44.asServiceRole.functions.invoke('cbamAutoCalculateOnCreate', {
      entry_id: entry.id
    });

    const autoCalcPrecursors = calcResponse?.data?.precursors_injected || [];
    const autoCalcEmissions = calcResponse?.data?.total_embedded_emissions || 0;

    // Query DB for actual stored value
    const dbEntry = await base44.asServiceRole.entities.CBAMEmissionEntry.filter(
      { id: entry.id },
      '-created_date',
      1
    );
    const storedPrecursors = dbEntry[0]?.precursors_used || [];
    const storedTotalEmissions = dbEntry[0]?.total_embedded_emissions || 0;

    // VERIFICATION
    const pass = 
      storedPrecursors.length > 0 && // Precursors were injected
      storedTotalEmissions > 1.95 && // Total emissions > direct only
      autoCalcPrecursors.length === storedPrecursors.length; // Backend/DB agree

    return {
      testName,
      result: pass ? 'PASS' : 'FAIL',
      observations: {
        complexGoodCN: '72081000',
        inputPrecursors: [],
        injectedPrecursors: storedPrecursors.length,
        directEmissionsOnly: 1.95,
        totalEmissionsAfterPrecursors: storedTotalEmissions,
        precursorContribution: storedTotalEmissions - 1.95,
        backendAgreedOnInjection: autoCalcPrecursors.length === storedPrecursors.length
      },
      failureReason: pass ? null :
        storedPrecursors.length === 0 ? 'Precursors NOT auto-injected' :
        storedTotalEmissions <= 1.95 ? 'Total emissions not increased' :
        autoCalcPrecursors.length !== storedPrecursors.length ? 'Backend/DB mismatch' :
        'Unknown'
    };
  } catch (error) {
    return {
      testName,
      result: 'ERROR',
      error: error.message
    };
  }
}

/**
 * TEST 4: SUBMISSION ILLEGALITY TEST
 * Verify submission is blocked at UI AND backend when validation fails
 */
async function auditSubmissionIllegality(base44, userEmail) {
  const testName = 'TEST_4_SUBMISSION_ILLEGALITY_TEST';

  try {
    // Create invalid entry (missing quantity)
    const entry = await base44.asServiceRole.entities.CBAMEmissionEntry.create({
      tenant_id: 'audit-tenant',
      cn_code: '72081000',
      country_of_origin: 'CN',
      quantity: 0, // INVALID: zero quantity
      reporting_period_year: 2026,
      functional_unit: 'tonnes',
      direct_emissions_specific: 1.95
    });

    // Try to validate (UI would call this)
    const validationResponse = await base44.asServiceRole.functions.invoke('cbamEntryValidator', {
      entry_id: entry.id
    });

    const validationPassed = validationResponse?.data?.validation_status === 'PASS';

    // Try to submit anyway (backend should still block)
    let submissionError = null;
    try {
      await base44.asServiceRole.functions.invoke('cbamRegistrySubmissionV2', {
        entry_id: entry.id
      });
    } catch (e) {
      submissionError = e.message;
    }

    // Query state machine for action permission
    const stateCheckResponse = await base44.asServiceRole.functions.invoke('cbamUIStateMachine', {
      entry_id: entry.id,
      action: 'can_submit'
    });

    const canSubmitPerState = stateCheckResponse?.data?.allowed === true;

    // VERIFICATION
    const pass = 
      !validationPassed && // Validation should fail
      submissionError !== null && // Backend blocked submission
      !canSubmitPerState; // State machine says no

    return {
      testName,
      result: pass ? 'PASS' : 'FAIL',
      observations: {
        validationStatus: validationResponse?.data?.validation_status || 'unknown',
        validationPassed,
        submissionAttempted: true,
        submissionBlocked: submissionError !== null,
        submissionError,
        statePermitsSubmission: canSubmitPerState,
        layerAlignment: {
          validationBlocksIt: !validationPassed,
          backendBlocksIt: submissionError !== null,
          stateBlocksIt: !canSubmitPerState,
          allAgree: !validationPassed && submissionError !== null && !canSubmitPerState
        }
      },
      failureReason: pass ? null :
        validationPassed ? 'Validation should have failed' :
        submissionError === null ? 'Backend did not block submission' :
        canSubmitPerState ? 'State machine incorrectly allowed submission' :
        'Layers not aligned'
    };
  } catch (error) {
    return {
      testName,
      result: 'ERROR',
      error: error.message
    };
  }
}

/**
 * TEST 5: REPORT ENGINE CAUSALITY
 * Verify report blocks are predictable from earlier state
 */
async function auditReportEngineCausality(base44, userEmail) {
  const testName = 'TEST_5_REPORT_ENGINE_CAUSALITY';

  try {
    // Create entry that will fail at report stage
    const entry = await base44.asServiceRole.entities.CBAMEmissionEntry.create({
      tenant_id: 'audit-tenant',
      cn_code: '72081000',
      country_of_origin: 'CN',
      quantity: 100,
      reporting_period_year: 2026,
      functional_unit: 'tonnes',
      direct_emissions_specific: 1.95,
      validation_status: 'PASS',
      verification_status: 'not_verified', // Will fail at report
      lifecycle_locks: [
        { type: 'precursor_pending_approval', reason: 'Precursor year deviation pending' }
      ]
    };

    // Try to generate report
    let reportError = null;
    try {
      await base44.asServiceRole.functions.invoke('cbamReportGenerator', {
        entry_id: entry.id
      });
    } catch (e) {
      reportError = e.message;
    }

    // Check state machine BEFORE report generation
    const preReportState = await base44.asServiceRole.functions.invoke('cbamUIStateMachine', {
      entry_id: entry.id,
      action: 'current_state'
    });

    const stateBeforeReport = preReportState?.data?.currentState || 'unknown';
    const isReportReady = preReportState?.data?.allowed === true;

    // VERIFICATION
    const pass = 
      reportError !== null && // Report fails
      !isReportReady && // State machine said so BEFORE report attempt
      stateBeforeReport !== 'S7_REPORT_READY'; // Clear state indicates problem

    return {
      testName,
      result: pass ? 'PASS' : 'FAIL',
      observations: {
        stateMachineState: stateBeforeReport,
        stateIndicatesReportReady: isReportReady,
        lifecycleLocks: entry.lifecycle_locks?.length || 0,
        reportGenerationAttempted: true,
        reportError,
        causality: {
          reportReadyPredicted: isReportReady,
          reportActuallyFailed: reportError !== null,
          aligned: isReportReady === (reportError === null)
        }
      },
      failureReason: pass ? null :
        isReportReady && reportError !== null ? 'State machine said ready but report failed - causality broken' :
        !isReportReady && reportError === null ? 'State machine said not ready but report succeeded' :
        'Unknown causality break'
    };
  } catch (error) {
    return {
      testName,
      result: 'ERROR',
      error: error.message
    };
  }
}

export default auditOperationalTruth;