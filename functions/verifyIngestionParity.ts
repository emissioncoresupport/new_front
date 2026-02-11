import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { IngestionParityEnforcer } from './services/IngestionParityEnforcer.js';

/**
 * Phase 1.2.5 Verification Endpoint
 * 
 * ADMIN ONLY: Tests ingestion parity across all paths
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const testContext = {
      entity_type: 'supplier',
      intended_use: 'CBAM',
      source_role: 'buyer'
    };

    const testInput = {
      name: 'Test Supplier',
      country: 'DE'
    };

    // Run parity check
    const parityResult = IngestionParityEnforcer.verifyParity(testInput, testContext);

    // Test context validation
    const contextTests = [
      { context: testContext, expected: true },
      { context: { entity_type: 'supplier' }, expected: false }, // Missing fields
      { context: null, expected: false } // No context
    ];

    const contextResults = contextTests.map(test => ({
      input: test.context,
      result: IngestionParityEnforcer.validateContext(test.context, 'test_path'),
      expected: test.expected
    }));

    // Test Evidence payload creation
    const evidenceTest = IngestionParityEnforcer.createEvidencePayload({
      tenant_id: 'test',
      declared_context: testContext,
      declaration_hash_sha256: 'abc123',
      actor_id: user.email,
      ingestion_path: 'test_path'
    });

    // Test rejection materialization
    const rejectionTest = IngestionParityEnforcer.createRejectedEvidence({
      tenant_id: 'test',
      declared_context: testContext,
      actor_id: user.email,
      ingestion_path: 'test_path',
      rejection_reason: 'Test rejection',
      original_input: testInput
    });

    // Test ERP validation
    const erpTest = IngestionParityEnforcer.validateERPSnapshot({
      source_system: 'SAP',
      snapshot_date: '2026-01-21'
    });

    return Response.json({
      phase: '1.2.5',
      status: parityResult.parity ? 'PASS' : 'FAIL',
      tests: {
        parity: parityResult,
        context_validation: contextResults,
        evidence_creation: evidenceTest,
        rejection_materialization: rejectionTest,
        erp_validation: erpTest
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Verification failed:', error);
    return Response.json({ 
      error: error.message,
      phase: '1.2.5',
      status: 'ERROR'
    }, { status: 500 });
  }
});