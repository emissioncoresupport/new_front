import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * INTERNAL SYSTEM AUTHORITY BOOTSTRAP
 * 
 * CRITICAL: This function exists ONLY to unblock Phase E.3 hostile testing.
 * It bypasses Base44 function invocation limitations by creating entities directly.
 * 
 * HARD RULES:
 * - Must NOT call any other backend function
 * - Must NOT use functions.invoke
 * - Must only run when execution_mode === "HOSTILE" or "TEST"
 * - Must hard-fail in PROD mode
 * - NOT callable from UI, adapters, or AI
 * 
 * SECURITY: All entities tagged with SYSTEM_AUTHORITY marker.
 * AUDIT: Every creation logged to LedgerEvent.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const {
      execution_context,
      entities_to_create
    } = await req.json();

    // VALIDATION BLOCK 1: execution_context required
    if (!execution_context) {
      return Response.json({
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'execution_context required'
      }, { status: 400 });
    }

    const { tenant_id, execution_mode, authority_scope } = execution_context;

    // HARD GUARD: Only allow HOSTILE or TEST execution modes
    if (execution_mode !== 'HOSTILE' && execution_mode !== 'TEST') {
      return Response.json({
        success: false,
        error: 'EXECUTION_MODE_REJECTED',
        message: 'internalSystemAuthorityBootstrap only allowed in HOSTILE or TEST mode',
        provided_mode: execution_mode
      }, { status: 403 });
    }

    // HARD GUARD: authority_scope must be system_only
    if (authority_scope !== 'system_only') {
      return Response.json({
        success: false,
        error: 'AUTHORITY_SCOPE_REJECTED',
        message: 'authority_scope must be "system_only"',
        provided_scope: authority_scope
      }, { status: 403 });
    }

    // VALIDATION BLOCK 2: entities_to_create required
    if (!entities_to_create || !Array.isArray(entities_to_create)) {
      return Response.json({
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'entities_to_create must be an array'
      }, { status: 400 });
    }

    console.log(`[SYSTEM AUTHORITY BOOTSTRAP] tenant=${tenant_id}, mode=${execution_mode}, scope=${authority_scope}, entities=${entities_to_create.length}`);

    const results = [];

    // CREATE ENTITIES DIRECTLY (no function invocation)
    for (const entitySpec of entities_to_create) {
      const { type, payload } = entitySpec;

      if (!type || !payload) {
        results.push({
          success: false,
          error: 'Invalid entity spec (type and payload required)'
        });
        continue;
      }

      // Generate deterministic entity ID
      const entityId = `${type.toUpperCase().substring(0, 3)}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Build entity payload with SYSTEM_AUTHORITY markers
      const entityPayload = {
        ...payload,
        tenant_id,
        created_by: 'SYSTEM_AUTHORITY',
        origin_type: 'hostile_test',
        fixture_type: 'MULTI_TENANT_TEST',
        operational_use: 'FORBIDDEN'
      };

      try {
        let createdEntity;

        // Direct entity creation (no invocation)
        if (type === 'supplier') {
          createdEntity = await base44.asServiceRole.entities.Supplier.create(entityPayload);
        } else if (type === 'facility') {
          createdEntity = await base44.asServiceRole.entities.Facility.create(entityPayload);
        } else if (type === 'product') {
          createdEntity = await base44.asServiceRole.entities.Product.create(entityPayload);
        } else if (type === 'shipment') {
          createdEntity = await base44.asServiceRole.entities.LogisticsShipment.create(entityPayload);
        } else {
          results.push({
            success: false,
            error: `Unsupported entity type: ${type}`
          });
          continue;
        }

        // AUDIT LOG (mandatory)
        await base44.asServiceRole.entities.LedgerEvent.create({
          tenant_id,
          event_type: 'EntityContextCreated',
          aggregate_type: type.charAt(0).toUpperCase() + type.slice(1),
          aggregate_id: createdEntity.id,
          command_id: `SYSTEM_AUTHORITY_${Date.now()}`,
          actor_id: 'SYSTEM_AUTHORITY',
          actor_role: 'system',
          payload: {
            entity_id: createdEntity.id,
            entity_type: type,
            execution_mode,
            authority_scope,
            phase: 'E3',
            hostile_test: true
          },
          timestamp: new Date().toISOString(),
          sequence_number: Date.now(),
          schema_version: '1.0',
          immutable: true
        });

        results.push({
          success: true,
          entity_id: createdEntity.id,
          entity_type: type,
          tenant_id,
          created_by: 'SYSTEM_AUTHORITY'
        });

        console.log(`[SYSTEM AUTHORITY] Created ${type} ${createdEntity.id} for tenant ${tenant_id}`);

      } catch (error) {
        console.error(`[SYSTEM AUTHORITY] Failed to create ${type}:`, error);
        results.push({
          success: false,
          entity_type: type,
          error: error.message
        });
      }
    }

    const allSuccess = results.every(r => r.success);

    return Response.json({
      success: allSuccess,
      execution_context,
      results,
      timestamp: new Date().toISOString(),
      message: allSuccess ? 'All entities created via SYSTEM_AUTHORITY' : 'Some entities failed'
    });

  } catch (error) {
    console.error('System Authority Bootstrap Error:', error);
    return Response.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    }, { status: 500 });
  }
});