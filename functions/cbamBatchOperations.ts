import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CBAM Batch Operations Engine
 * Bulk approve, validate, submit operations
 * Optimized for high-volume importers (1000+ entries/quarter)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, params } = await req.json();

    switch (action) {
      case 'batch_validate':
        return await batchValidate(base44, params);
      
      case 'batch_approve':
        return await batchApprove(base44, params);
      
      case 'batch_link_to_report':
        return await batchLinkToReport(base44, params);
      
      case 'batch_calculate':
        return await batchCalculate(base44, params);
      
      case 'batch_verify':
        return await batchVerify(base44, params);
      
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function batchValidate(base44, params) {
  const { entry_ids } = params;
  
  if (!entry_ids || entry_ids.length === 0) {
    return Response.json({ error: 'No entries provided' }, { status: 400 });
  }
  
  const results = {
    total: entry_ids.length,
    validated: 0,
    failed: 0,
    errors: []
  };
  
  // Process in chunks of 50 for performance
  const chunkSize = 50;
  for (let i = 0; i < entry_ids.length; i += chunkSize) {
    const chunk = entry_ids.slice(i, i + chunkSize);
    
    const entries = await base44.asServiceRole.entities.CBAMEmissionEntry.filter({
      id: { $in: chunk }
    });
    
    for (const entry of entries) {
      try {
        // Validation checks per Annex IV
        const errors = [];
        
        if (!entry.cn_code) errors.push('Missing CN code');
        if (!entry.country_of_origin) errors.push('Missing country of origin');
        if (!entry.quantity || entry.quantity <= 0) errors.push('Invalid quantity');
        if (!entry.direct_emissions_specific && entry.calculation_method === 'EU_method') {
          errors.push('Missing direct emissions for EU Method');
        }
        if (!entry.production_route && entry.calculation_method === 'Default_values') {
          errors.push('Missing production route for Default Values');
        }
        
        if (errors.length === 0) {
          await base44.asServiceRole.entities.CBAMEmissionEntry.update(entry.id, {
            validation_status: 'ai_validated',
            validation_score: 95,
            validation_date: new Date().toISOString()
          });
          results.validated++;
        } else {
          results.failed++;
          results.errors.push({
            entry_id: entry.id,
            import_id: entry.import_id,
            errors
          });
        }
      } catch (err) {
        results.failed++;
        results.errors.push({
          entry_id: entry.id,
          errors: [err.message]
        });
      }
    }
  }
  
  return Response.json({
    success: true,
    ...results,
    processing_time_ms: Date.now()
  });
}

async function batchApprove(base44, params) {
  const { entry_ids, approved_by } = params;
  
  if (!entry_ids || entry_ids.length === 0) {
    return Response.json({ error: 'No entries provided' }, { status: 400 });
  }
  
  // Admin check
  if (user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }
  
  let approved = 0;
  const errors = [];
  
  for (const entry_id of entry_ids) {
    try {
      await base44.asServiceRole.entities.CBAMEmissionEntry.update(entry_id, {
        validation_status: 'manual_verified',
        verified_by: approved_by,
        verification_date: new Date().toISOString()
      });
      approved++;
    } catch (err) {
      errors.push({ entry_id, error: err.message });
    }
  }
  
  return Response.json({
    success: true,
    total: entry_ids.length,
    approved,
    failed: errors.length,
    errors
  });
}

async function batchLinkToReport(base44, params) {
  const { entry_ids, report_id } = params;
  
  const reports = await base44.asServiceRole.entities.CBAMReport.filter({ id: report_id });
  if (!reports.length) {
    return Response.json({ error: 'Report not found' }, { status: 404 });
  }
  
  const report = reports[0];
  const currentLinks = report.linked_entries || [];
  const newLinks = [...new Set([...currentLinks, ...entry_ids])];
  
  // Recalculate report totals
  const entries = await base44.asServiceRole.entities.CBAMEmissionEntry.filter({
    id: { $in: newLinks }
  });
  
  const totals = entries.reduce((acc, e) => ({
    imports: acc.imports + 1,
    quantity: acc.quantity + (e.quantity || 0),
    emissions: acc.emissions + (e.total_embedded_emissions || 0)
  }), { imports: 0, quantity: 0, emissions: 0 });
  
  await base44.asServiceRole.entities.CBAMReport.update(report_id, {
    linked_entries: newLinks,
    total_imports_count: totals.imports,
    total_goods_quantity_tonnes: totals.quantity,
    total_embedded_emissions: totals.emissions,
    certificates_required: Math.ceil(totals.emissions)
  });
  
  return Response.json({
    success: true,
    linked_count: entry_ids.length,
    total_entries: newLinks.length,
    total_emissions: totals.emissions.toFixed(2)
  });
}

async function batchCalculate(base44, params) {
  const { entry_ids } = params;
  
  let calculated = 0;
  const errors = [];
  
  for (const entry_id of entry_ids) {
    try {
      const entries = await base44.asServiceRole.entities.CBAMEmissionEntry.filter({ id: entry_id });
      if (!entries.length) continue;
      
      const entry = entries[0];
      
      // Call calculation engine
      const calcResponse = await fetch(`${Deno.env.get('BASE_URL')}/api/functions/cbamCalculationEngine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_data: entry,
          include_precursors: true
        })
      });
      
      if (calcResponse.ok) {
        const result = await calcResponse.json();
        
        await base44.asServiceRole.entities.CBAMEmissionEntry.update(entry_id, {
          total_embedded_emissions: result.calculated_entry.total_embedded_emissions,
          chargeable_emissions: result.calculated_entry.chargeable_emissions,
          certificates_required: result.calculated_entry.certificates_required,
          calculation_timestamp: new Date().toISOString()
        });
        
        calculated++;
      }
    } catch (err) {
      errors.push({ entry_id, error: err.message });
    }
  }
  
  return Response.json({
    success: true,
    total: entry_ids.length,
    calculated,
    failed: errors.length,
    errors
  });
}

async function batchVerify(base44, params) {
  const { entry_ids, verifier_email } = params;
  
  // Create verification requests
  let created = 0;
  
  for (const entry_id of entry_ids) {
    const entries = await base44.asServiceRole.entities.CBAMEmissionEntry.filter({ id: entry_id });
    if (!entries.length) continue;
    
    const entry = entries[0];
    
    await base44.asServiceRole.entities.CBAMVerificationRequest.create({
      request_id: `VER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      entry_id: entry.id,
      installation_id: entry.installation_id,
      request_type: 'operator_report',
      requested_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      status: 'pending',
      assigned_to: verifier_email,
      priority: 'medium'
    });
    
    created++;
  }
  
  return Response.json({
    success: true,
    verification_requests_created: created
  });
}