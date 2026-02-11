import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { IngestionOrchestrator } from './services/SupplyLensIngestionOrchestrator.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      supplier_data,
      source_path,
      evidence_id,
      reason_for_upload
    } = await req.json();

    if (!supplier_data || !source_path) {
      return Response.json({ error: 'Missing supplier_data or source_path' }, { status: 400 });
    }

    // Run unified orchestration pipeline
    const result = await IngestionOrchestrator.processSupplierData(base44, {
      supplier_data,
      source_path,
      evidence_id,
      user_email: user.email,
      tenant_id: user.company_id || 'default',
      reason_for_upload
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});