import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Publishes canonical entity events for downstream module consumption
 * This ensures other modules (CBAM, EUDR, PCF, etc.) use SupplyLens as single source of truth
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_type, entity_type, entity_id, payload } = await req.json();

    // Valid event types for canonical data changes
    const validEvents = [
      'supplier_created',
      'supplier_updated',
      'supplier_merged',
      'site_created',
      'part_created',
      'sku_created',
      'mapping_approved',
      'mapping_invalidated'
    ];

    if (!validEvents.includes(event_type)) {
      return Response.json({ error: 'Invalid event type' }, { status: 400 });
    }

    // Create event in outbox for processing
    const event = await base44.entities.EventOutbox.create({
      tenant_id: user.company_id,
      event_type,
      entity_type,
      entity_id,
      payload: {
        ...payload,
        timestamp: new Date().toISOString(),
        triggered_by: user.email
      },
      status: 'pending'
    });

    // Create audit log
    await base44.entities.AuditLog.create({
      tenant_id: user.company_id,
      entity_type: 'event_published',
      entity_id: event.id,
      action: event_type,
      user_email: user.email,
      changes: { event_type, entity_type, entity_id }
    });

    return Response.json({
      success: true,
      event_id: event.id,
      event_type,
      message: 'Canonical event published for downstream consumption'
    });

  } catch (error) {
    console.error('Publish canonical event error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});