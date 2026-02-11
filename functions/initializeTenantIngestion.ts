import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { ingestion_path } = body;

    if (!['buyer_upload', 'supplier_portal', 'erp_sync', 'bulk_import'].includes(ingestion_path)) {
      return Response.json({ error: 'Invalid ingestion path' }, { status: 400 });
    }

    // Create tenant onboarding record
    const config = {
      tenant_id: user.company_id || 'default',
      ingestion_path,
      initialized_by: user.email,
      initialized_at: new Date().toISOString(),
      proof_coverage_percent: 0,
      total_suppliers: 0,
      proven_suppliers: 0,
      status: 'ACTIVE'
    };

    // Hash the configuration (immutable)
    const configHash = createHash('sha256')
      .update(JSON.stringify(config))
      .digest('hex');

    config.hash_sha256 = configHash;

    // Store in audit trail
    const auditEntry = {
      tenant_id: user.company_id || 'default',
      resource_type: 'TenantOnboarding',
      resource_id: `tenant_${user.company_id || 'default'}`,
      action: 'INGESTION_PATH_SELECTED',
      actor_email: user.email,
      action_timestamp: new Date().toISOString(),
      changes: { ingestion_path, proof_type: getProofType(ingestion_path) },
      status: 'SUCCESS',
      hash_sha256: createHash('sha256')
        .update(JSON.stringify({
          action: 'INGESTION_PATH_SELECTED',
          path: ingestion_path,
          timestamp: new Date().toISOString()
        }))
        .digest('hex')
    };

    await base44.entities.AuditLogEntry.create(auditEntry);

    return Response.json({
      success: true,
      config,
      next_steps: getNextSteps(ingestion_path)
    });
  } catch (error) {
    console.error('initializeTenantIngestion error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getProofType(path) {
  const map = {
    buyer_upload: 'Document hash + metadata',
    supplier_portal: 'Questionnaire hash + timestamp',
    erp_sync: 'ERP record hash + sync log',
    bulk_import: 'File hash + row checksums'
  };
  return map[path] || 'Unknown';
}

function getNextSteps(path) {
  const steps = {
    buyer_upload: [
      'Go to "Upload Document"',
      'Select supplier document',
      'Confirm supplier details',
      'System creates supplier'
    ],
    supplier_portal: [
      'Copy invite link',
      'Send to suppliers',
      'Review responses',
      'Approve suppliers'
    ],
    erp_sync: [
      'Go to "ERP Connection"',
      'Select SAP/Oracle/NetSuite',
      'Enter credentials',
      'Test connection'
    ],
    bulk_import: [
      'Download Excel template',
      'Fill in supplier data',
      'Upload file',
      'Review errors & approve'
    ]
  };
  return steps[path] || [];
}