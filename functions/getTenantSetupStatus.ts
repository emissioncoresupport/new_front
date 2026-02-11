import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if tenant has any suppliers
    const suppliers = await base44.entities.Supplier.list();
    const mappings = await base44.entities.MappingDecision.list();
    const auditLogs = await base44.entities.AuditLogEntry.list();

    const setupComplete = (suppliers && suppliers.length > 0) || 
                         (mappings && mappings.length > 0) || 
                         (auditLogs && auditLogs.some(l => l.action === 'INGESTION_PATH_SELECTED'));

    return Response.json({
      success: true,
      is_setup_complete: setupComplete,
      supplier_count: suppliers?.length || 0,
      mapping_count: mappings?.length || 0
    });
  } catch (error) {
    console.error('getTenantSetupStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});