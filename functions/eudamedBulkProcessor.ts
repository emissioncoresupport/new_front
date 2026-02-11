import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * EUDAMED Bulk Submission Processor
 * Batch processing for Actor & Device registration
 * 
 * Features:
 * - Parallel processing (max 10 concurrent)
 * - Automatic retry on failure
 * - Detailed logging
 * - Progress tracking
 * - Error aggregation
 * 
 * Mandatory from: May 28, 2026
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      entity_type, // 'actor' or 'device'
      entity_ids, // Array of IDs to process
      parallel_limit = 10,
      retry_on_failure = true
    } = await req.json();

    if (!entity_type || !entity_ids || entity_ids.length === 0) {
      return Response.json({ 
        error: 'entity_type and entity_ids required' 
      }, { status: 400 });
    }

    const results = {
      total: entity_ids.length,
      successful: 0,
      failed: 0,
      details: [],
      started_at: new Date().toISOString()
    };

    // Process in batches for parallel execution
    const batches = [];
    for (let i = 0; i < entity_ids.length; i += parallel_limit) {
      batches.push(entity_ids.slice(i, i + parallel_limit));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (entityId) => {
        try {
          let entity;
          let submitResult;

          if (entity_type === 'actor') {
            const actors = await base44.asServiceRole.entities.EUDAMEDActor.list();
            entity = actors.find(a => a.id === entityId);

            if (!entity) {
              throw new Error('Actor not found');
            }

            // Validate required fields
            if (!entity.legal_name || !entity.actor_type || !entity.country) {
              throw new Error('Missing required fields: legal_name, actor_type, or country');
            }

            // MOCK EUDAMED API submission
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

            // Generate SRN if not exists
            if (!entity.srn) {
              const srn = `SRN-${entity.country}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
              entity.srn = srn;
            }

            // Update status
            await base44.asServiceRole.entities.EUDAMEDActor.update(entityId, {
              registration_status: 'registered',
              registration_date: new Date().toISOString().split('T')[0],
              srn: entity.srn
            });

            // Log audit
            await base44.asServiceRole.entities.EUDAMEDAuditLog.create({
              tenant_id: user.tenant_id || user.email.split('@')[1],
              action_type: 'actor_registration',
              entity_type: 'Actor',
              entity_id: entityId,
              entity_reference: entity.srn,
              action_description: `Bulk registration of actor: ${entity.legal_name}`,
              outcome: 'success',
              user_email: user.email,
              user_name: user.full_name,
              timestamp: new Date().toISOString(),
              metadata: { bulk_processing: true }
            });

            submitResult = { success: true, srn: entity.srn };

          } else if (entity_type === 'device') {
            const devices = await base44.asServiceRole.entities.EUDAMEDDevice.list();
            entity = devices.find(d => d.id === entityId);

            if (!entity) {
              throw new Error('Device not found');
            }

            // Validate
            if (!entity.device_name || !entity.udi_di || !entity.risk_class) {
              throw new Error('Missing required fields: device_name, udi_di, or risk_class');
            }

            // MOCK submission
            await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));

            await base44.asServiceRole.entities.EUDAMEDDevice.update(entityId, {
              registration_status: 'registered',
              registration_date: new Date().toISOString().split('T')[0]
            });

            await base44.asServiceRole.entities.EUDAMEDAuditLog.create({
              tenant_id: user.tenant_id || user.email.split('@')[1],
              action_type: 'device_registration',
              entity_type: 'Device',
              entity_id: entityId,
              entity_reference: entity.udi_di,
              action_description: `Bulk registration of device: ${entity.device_name}`,
              outcome: 'success',
              user_email: user.email,
              user_name: user.full_name,
              timestamp: new Date().toISOString(),
              metadata: { bulk_processing: true }
            });

            submitResult = { success: true, udi_di: entity.udi_di };
          }

          results.successful++;
          results.details.push({
            entity_id: entityId,
            status: 'success',
            result: submitResult
          });

        } catch (error) {
          results.failed++;
          results.details.push({
            entity_id: entityId,
            status: 'failed',
            error: error.message
          });

          // Queue for retry if enabled
          if (retry_on_failure) {
            await base44.asServiceRole.entities.EUDAMEDSyncQueue.create({
              tenant_id: user.tenant_id || user.email.split('@')[1],
              operation_type: entity_type === 'actor' ? 'actor_sync' : 'device_sync',
              entity_type: entity_type === 'actor' ? 'Actor' : 'Device',
              entity_id: entityId,
              status: 'retry_scheduled',
              retry_count: 0,
              next_retry_at: new Date(Date.now() + 300000).toISOString(),
              last_error: error.message,
              priority: 'medium'
            });
          }
        }
      });

      await Promise.all(batchPromises);
    }

    results.completed_at = new Date().toISOString();
    results.success_rate = ((results.successful / results.total) * 100).toFixed(1);

    // Create summary notification
    await base44.asServiceRole.entities.Notification.create({
      tenant_id: user.tenant_id || user.email.split('@')[1],
      type: 'submission_success',
      title: `EUDAMED Bulk Submission Complete`,
      message: `Processed ${results.total} ${entity_type}s: ${results.successful} successful, ${results.failed} failed`,
      severity: results.failed === 0 ? 'info' : 'medium',
      read: false,
      metadata: results
    });

    await base44.asServiceRole.entities.UsageLog.create({
      tenant_id: user.tenant_id || user.email.split('@')[1],
      user_email: user.email,
      module: 'EUDAMED',
      operation_type: 'BULK_IMPORT',
      operation_details: { 
        entity_type,
        total: results.total,
        successful: results.successful,
        failed: results.failed
      },
      cost_units: results.total,
      unit_price_eur: 0.20,
      total_cost_eur: results.total * 0.20,
      status: 'completed',
      billing_period: new Date().toISOString().slice(0, 7)
    });

    return Response.json({
      success: true,
      results,
      message: `Bulk processing complete: ${results.successful}/${results.total} successful`
    });

  } catch (error) {
    console.error('Bulk processor error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});