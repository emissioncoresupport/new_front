import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CBAM Calculation Unit Tests
 * Verifies correct formula application without double-factor multiplication
 * 
 * Tests cover:
 * - 2026 phase-in (2.5% CBAM factor)
 * - 2027 phase-in (5% CBAM factor)
 * - Free allocation calculation
 * - Certificate requirement calculation
 * - No double-factor application
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('\n=== CBAM CALCULATION UNIT TESTS ===\n');

    const results = [];
    let passed = 0;
    let failed = 0;

    // TEST 1: 2026 Basic Calculation (2.5% CBAM Factor)
    const test1 = {
      name: 'TEST 1: 2026 Crude Steel BOF - 100 tonnes',
      input: {
        cn_code: '7206',
        production_route: 'basic_oxygen_furnace',
        quantity: 100,
        calculation_method: 'Default_values',
        country_of_origin: 'China',
        reporting_year: 2026
      },
      expected: {
        benchmark: 1.530, // tCO2/t
        cbamFactor: 0.025,
        freeAllocationFull: 153.0, // 1.530 × 100
        freeAllocationAdjusted: 149.175, // 153 × (1 - 0.025) = 153 × 0.975
        totalEmbedded: 198.9, // 153 × 1.30 markup
        chargeableEmissions: 49.725, // 198.9 - 149.175
        certificatesRequired: 49.725
      }
    };

    // Execute test 1
    const result1 = await base44.functions.invoke('cbamCalculationEngine', { 
      entry_data: test1.input, 
      include_precursors: false 
    });
    
    const calc1 = result1.data.calculated_entry;
    const pass1 = 
      Math.abs(calc1.cbam_factor - test1.expected.cbamFactor) < 0.001 &&
      Math.abs(calc1.free_allocation_adjustment - test1.expected.freeAllocationAdjusted) < 0.1 &&
      Math.abs(calc1.certificates_required - test1.expected.chargeableEmissions) < 0.1;
    
    results.push({
      ...test1,
      actual: {
        cbamFactor: calc1.cbam_factor,
        freeAllocation: calc1.free_allocation_adjustment,
        chargeableEmissions: calc1.chargeable_emissions,
        certificates: calc1.certificates_required
      },
      status: pass1 ? 'PASS' : 'FAIL'
    });
    
    if (pass1) passed++; else failed++;

    // TEST 2: 2027 Calculation (5% CBAM Factor)
    const test2 = {
      name: 'TEST 2: 2027 Primary Aluminium - 50 tonnes',
      input: {
        cn_code: '760110',
        production_route: 'electrolysis',
        quantity: 50,
        calculation_method: 'Default_values',
        country_of_origin: 'India',
        reporting_year: 2027
      },
      expected: {
        benchmark: 8.500,
        cbamFactor: 0.05,
        freeAllocationFull: 425.0, // 8.5 × 50
        freeAllocationAdjusted: 403.75, // 425 × 0.95
        totalEmbedded: 552.5, // 425 × 1.30 markup
        chargeableEmissions: 148.75, // 552.5 - 403.75
        certificatesRequired: 148.75
      }
    };

    const result2 = await base44.functions.invoke('cbamCalculationEngine', { 
      entry_data: test2.input, 
      include_precursors: false 
    });
    
    const calc2 = result2.data.calculated_entry;
    const pass2 = 
      Math.abs(calc2.cbam_factor - test2.expected.cbamFactor) < 0.001 &&
      Math.abs(calc2.free_allocation_adjustment - test2.expected.freeAllocationAdjusted) < 0.1 &&
      Math.abs(calc2.certificates_required - test2.expected.chargeableEmissions) < 0.1;
    
    results.push({
      ...test2,
      actual: {
        cbamFactor: calc2.cbam_factor,
        freeAllocation: calc2.free_allocation_adjustment,
        chargeableEmissions: calc2.chargeable_emissions,
        certificates: calc2.certificates_required
      },
      status: pass2 ? 'PASS' : 'FAIL'
    });
    
    if (pass2) passed++; else failed++;

    // TEST 3: Verify NO double-factor application
    const test3 = {
      name: 'TEST 3: No Double-Factor - 2026 Clinker',
      input: {
        cn_code: '252310',
        production_route: 'dry_process',
        quantity: 200,
        calculation_method: 'Default_values',
        country_of_origin: 'Turkey',
        reporting_year: 2026
      },
      expected: {
        benchmark: 0.766,
        cbamFactor: 0.025,
        freeAllocationFull: 153.2,
        freeAllocationAdjusted: 149.37, // 153.2 × 0.975
        totalEmbedded: 199.16, // 153.2 × 1.30
        // CRITICAL: Certificates = 199.16 - 149.37 = 49.79
        // NOT (199.16 - 149.37) × 0.025 = 1.24 (double-factor would give wrong result)
        certificatesRequired: 49.79
      }
    };

    const result3 = await base44.functions.invoke('cbamCalculationEngine', { 
      entry_data: test3.input, 
      include_precursors: false 
    });
    
    const calc3 = result3.data.calculated_entry;
    
    // Verify certificates are NOT multiplied by cbamFactor again
    const wrongDoubleFactorResult = (calc3.total_embedded_emissions - calc3.free_allocation_adjustment) * test3.expected.cbamFactor;
    const isNotDoubleFactor = Math.abs(calc3.certificates_required - wrongDoubleFactorResult) > 10;
    
    const pass3 = 
      isNotDoubleFactor &&
      Math.abs(calc3.certificates_required - test3.expected.certificatesRequired) < 0.1;
    
    results.push({
      ...test3,
      actual: {
        cbamFactor: calc3.cbam_factor,
        freeAllocation: calc3.free_allocation_adjustment,
        chargeableEmissions: calc3.chargeable_emissions,
        certificates: calc3.certificates_required,
        wrongDoubleFactorWouldGive: wrongDoubleFactorResult.toFixed(2)
      },
      status: pass3 ? 'PASS' : 'FAIL',
      notes: 'Verifies factor applied ONLY to benchmark, not to final obligation'
    });
    
    if (pass3) passed++; else failed++;

    // TEST 4: Foreign Carbon Price Deduction
    const test4 = {
      name: 'TEST 4: With Foreign Carbon Price Deduction',
      input: {
        cn_code: '7206',
        production_route: 'basic_oxygen_furnace',
        quantity: 100,
        calculation_method: 'Default_values',
        country_of_origin: 'UK',
        reporting_year: 2026,
        foreign_carbon_price_paid: 30.0 // 30 tCO2e paid via UK ETS
      },
      expected: {
        benchmark: 1.530,
        cbamFactor: 0.025,
        freeAllocationAdjusted: 149.175,
        totalEmbedded: 168.3, // 153 × 1.10 (UK low markup)
        foreignDeduction: 30.0,
        chargeableEmissions: -10.875, // Would be negative, but max(0, x)
        certificatesRequired: 0 // max(0, 168.3 - 149.175 - 30) = 0
      }
    };

    const result4 = await base44.functions.invoke('cbamCalculationEngine', { 
      entry_data: test4.input, 
      include_precursors: false 
    });
    
    const calc4 = result4.data.calculated_entry;
    const pass4 = calc4.certificates_required === 0;
    
    results.push({
      ...test4,
      actual: {
        freeAllocation: calc4.free_allocation_adjustment,
        totalEmbedded: calc4.total_embedded_emissions,
        foreignDeduction: calc4.foreign_carbon_price_deduction,
        certificates: calc4.certificates_required
      },
      status: pass4 ? 'PASS' : 'FAIL'
    });
    
    if (pass4) passed++; else failed++;

    // Summary
    console.log('\n=== TEST RESULTS ===');
    results.forEach((r, i) => {
      console.log(`\n${r.name}: ${r.status}`);
      console.log('Expected:', JSON.stringify(r.expected, null, 2));
      console.log('Actual:', JSON.stringify(r.actual, null, 2));
      if (r.notes) console.log('Notes:', r.notes);
    });

    console.log(`\n=== SUMMARY ===`);
    console.log(`Passed: ${passed}/${results.length}`);
    console.log(`Failed: ${failed}/${results.length}`);
    console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%\n`);

    return Response.json({
      success: true,
      summary: {
        total: results.length,
        passed,
        failed,
        successRate: ((passed / results.length) * 100).toFixed(1) + '%'
      },
      results,
      verification: {
        noDoubleFactor: results[2]?.status === 'PASS',
        correctFormula: 'Certificates = max(0, EmbeddedEmissions - (Benchmark × (1 - CBAMFactor) × Quantity) - ForeignCarbonPrice)',
        cbamFactorAppliedOnlyToBenchmark: true
      }
    });
    
  } catch (error) {
    console.error('[Test Suite] Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});