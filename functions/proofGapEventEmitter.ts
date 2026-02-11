import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PROOF GAP EVENT EMITTER
 * Triggered after mapping gate enforcement
 * Emits events to downstream modules (CBAM, CSRD, EUDR, PFAS)
 * Event-driven, non-blocking, no circular logic
 * Production: Kafka topics or HTTP webhooks per framework
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mapping_decision_id, supplier_id } = await req.json();

    if (!mapping_decision_id) {
      return Response.json({ error: 'Missing mapping_decision_id' }, { status: 400 });
    }

    // Fetch mapping decision
    const mappingDecision = await base44.entities.MappingDecision.get(mapping_decision_id);
    const framework_gaps = mappingDecision.validation_result?.framework_gaps || {};

    const events = [];

    // Emit event per framework
    for (const [framework, gaps] of Object.entries(framework_gaps)) {
      const event = {
        event_type: 'proof_gap_detected',
        framework,
        supplier_id,
        mapping_decision_id,
        gaps,
        timestamp: new Date().toISOString(),
        action: 'READ_ONLY_UPDATE'
      };

      // Publish to module-specific queues (in production: Kafka, RabbitMQ, or HTTP webhooks)
      if (framework === 'CBAM') {
        // CBAM module receives: "Supplier PROVISIONAL. CN code missing."
        // Does NOT block, does NOT update SupplyLens
        events.push(publishCBAMEvent(event, base44));
      }

      if (framework === 'CSRD') {
        // CSRD module receives: "Activity classification missing."
        events.push(publishCSRDEvent(event, base44));
      }

      if (framework === 'EUDR') {
        events.push(publishEUDREvent(event, base44));
      }

      if (framework === 'PFAS') {
        events.push(publishPFASEvent(event, base44));
      }
    }

    await Promise.all(events);

    // Log event emission
    await base44.entities.AuditLogEntry.create({
      tenant_id: user.tenant_id,
      resource_type: 'MappingDecision',
      resource_id: mapping_decision_id,
      action: 'PROOF_GAPS_EMITTED',
      actor_email: user.email,
      actor_role: 'system',
      action_timestamp: new Date().toISOString(),
      details: `Emitted ${Object.keys(framework_gaps).length} framework gap events to downstream modules`,
      status: 'SUCCESS'
    });

    return Response.json({
      success: true,
      events_emitted: Object.keys(framework_gaps).length,
      frameworks: Object.keys(framework_gaps)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function publishCBAMEvent(event, base44) {
  // Production: POST to CBAM webhook or Kafka topic
  const webhook = Deno.env.get('CBAM_WEBHOOK_URL');
  if (webhook) {
    return fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': `${event.mapping_decision_id}-cbam` },
      body: JSON.stringify(event)
    }).then(r => r.json()).catch(e => console.error('[CBAM] Webhook failed:', e.message));
  }
  console.log(`[CBAM Event] Supplier ${event.supplier_id}: ${event.gaps.join(', ')}`);
}

async function publishCSRDEvent(event, base44) {
  const webhook = Deno.env.get('CSRD_WEBHOOK_URL');
  if (webhook) {
    return fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': `${event.mapping_decision_id}-csrd` },
      body: JSON.stringify(event)
    }).then(r => r.json()).catch(e => console.error('[CSRD] Webhook failed:', e.message));
  }
  console.log(`[CSRD Event] Supplier ${event.supplier_id}: ${event.gaps.join(', ')}`);
}

async function publishEUDREvent(event, base44) {
  const webhook = Deno.env.get('EUDR_WEBHOOK_URL');
  if (webhook) {
    return fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': `${event.mapping_decision_id}-eudr` },
      body: JSON.stringify(event)
    }).then(r => r.json()).catch(e => console.error('[EUDR] Webhook failed:', e.message));
  }
  console.log(`[EUDR Event] Supplier ${event.supplier_id}: ${event.gaps.join(', ')}`);
}

async function publishPFASEvent(event, base44) {
  const webhook = Deno.env.get('PFAS_WEBHOOK_URL');
  if (webhook) {
    return fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': `${event.mapping_decision_id}-pfas` },
      body: JSON.stringify(event)
    }).then(r => r.json()).catch(e => console.error('[PFAS] Webhook failed:', e.message));
  }
  console.log(`[PFAS Event] Supplier ${event.supplier_id}: ${event.gaps.join(', ')}`);
}