import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Netherlands CBAM Registry API Connector
 * Belastingdienst (Dutch Tax Authority) Integration
 * Based on Dutch CBAM Portal specifications
 */

const NL_REGISTRY_BASE = 'https://cbam.belastingdienst.nl/api/v1';
const NL_AUTH_ENDPOINT = 'https://login.belastingdienst.nl/oauth2/token';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, params } = await req.json();

    switch (action) {
      case 'authenticate':
        return await authenticate(base44, params);
      
      case 'submit_report':
        return await submitReport(base44, params);
      
      case 'get_submission_status':
        return await getSubmissionStatus(base44, params);
      
      case 'purchase_certificates':
        return await purchaseCertificates(base44, params);
      
      case 'get_balance':
        return await getCertificateBalance(base44, params);
      
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ 
      error: error.message,
      registry: 'Netherlands',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});

async function authenticate(base44, params) {
  // Get credentials from CBAMClient entity
  const clients = await base44.asServiceRole.entities.CBAMClient.filter({
    member_state: 'NL',
    status: 'active'
  });
  
  if (!clients.length) {
    return Response.json({ 
      error: 'No active Netherlands CBAM configuration found',
      action_required: 'Configure credentials in Registry Integration settings'
    }, { status: 400 });
  }
  
  const client = clients[0];
  
  // OAuth 2.0 Client Credentials Flow
  const tokenResponse = await fetch(NL_AUTH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: client.eori_number,
      client_secret: client.api_key_encrypted, // Decryption handled by Base44
      scope: 'cbam:read cbam:write'
    })
  });
  
  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    return Response.json({ 
      error: 'Authentication failed',
      details: error,
      registry: 'Netherlands'
    }, { status: 401 });
  }
  
  const { access_token, expires_in } = await tokenResponse.json();
  
  // Store token for reuse (in memory or cache)
  return Response.json({ 
    success: true,
    token: access_token,
    expires_in,
    registry: 'Netherlands'
  });
}

async function submitReport(base44, params) {
  const { report_id, access_token } = params;
  
  // Fetch report data
  const reports = await base44.asServiceRole.entities.CBAMReport.filter({ id: report_id });
  if (!reports.length) {
    return Response.json({ error: 'Report not found' }, { status: 404 });
  }
  
  const report = reports[0];
  
  // Fetch linked entries
  const entries = await base44.asServiceRole.entities.CBAMEmissionEntry.filter({
    id: { $in: report.linked_entries || [] }
  });
  
  // Build Dutch CBAM submission format (JSON-based)
  const submission = {
    declarant: {
      eori: report.eori_number,
      name: report.declarant_name,
      cbam_account: report.cbam_account_number
    },
    reporting_period: {
      year: report.reporting_year,
      quarter: report.reporting_quarter
    },
    imports: entries.map(entry => ({
      import_id: entry.import_id,
      import_date: entry.import_date,
      cn_code: entry.cn_code,
      goods_description: entry.product_name,
      country_of_origin: entry.country_of_origin,
      quantity: {
        value: entry.quantity,
        unit: 'tonnes'
      },
      emissions: {
        direct: entry.direct_emissions_specific,
        indirect: entry.indirect_emissions_specific,
        total: entry.total_embedded_emissions,
        calculation_method: entry.calculation_method
      },
      production_route: entry.production_route,
      carbon_price_paid: entry.carbon_price_due_paid || 0
    })),
    summary: {
      total_imports: entries.length,
      total_quantity: report.total_goods_quantity_tonnes,
      total_emissions: report.total_embedded_emissions,
      certificates_required: Math.ceil(report.total_embedded_emissions)
    },
    declaration: {
      language: 'en',
      submitted_by: report.submitted_by,
      submission_date: new Date().toISOString()
    }
  };
  
  // Submit to Dutch registry
  const response = await fetch(`${NL_REGISTRY_BASE}/declarations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      'X-CBAM-Version': '2026'
    },
    body: JSON.stringify(submission)
  });
  
  if (!response.ok) {
    const error = await response.json();
    return Response.json({ 
      success: false,
      error: 'Submission failed',
      details: error,
      registry: 'Netherlands'
    }, { status: response.status });
  }
  
  const result = await response.json();
  
  // Update report with confirmation
  await base44.asServiceRole.entities.CBAMReport.update(report_id, {
    status: 'submitted',
    submission_date: new Date().toISOString(),
    registry_confirmation_number: result.confirmation_number,
    submitted_via_cbam_registry: true
  });
  
  return Response.json({ 
    success: true,
    confirmation_number: result.confirmation_number,
    reference: result.reference,
    registry: 'Netherlands',
    status: result.status
  });
}

async function getSubmissionStatus(base44, params) {
  const { confirmation_number, access_token } = params;
  
  const response = await fetch(`${NL_REGISTRY_BASE}/declarations/${confirmation_number}`, {
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'X-CBAM-Version': '2026'
    }
  });
  
  if (!response.ok) {
    return Response.json({ 
      error: 'Status check failed',
      registry: 'Netherlands'
    }, { status: response.status });
  }
  
  const status = await response.json();
  
  return Response.json({ 
    success: true,
    status: status.processing_status,
    acceptance_date: status.acceptance_date,
    errors: status.validation_errors || [],
    registry: 'Netherlands'
  });
}

async function purchaseCertificates(base44, params) {
  const { quantity, access_token, eori } = params;
  
  const response = await fetch(`${NL_REGISTRY_BASE}/certificates/purchase`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      eori,
      quantity,
      payment_method: 'bank_transfer'
    })
  });
  
  if (!response.ok) {
    return Response.json({ 
      error: 'Purchase failed',
      registry: 'Netherlands'
    }, { status: response.status });
  }
  
  const result = await response.json();
  
  // Record purchase in database
  await base44.asServiceRole.entities.CBAMCertificate.create({
    certificate_type: 'CBAM_certificate',
    quantity,
    price_per_unit: result.price_per_certificate,
    total_cost: result.total_amount,
    purchase_date: new Date().toISOString(),
    status: 'active',
    registry_reference: result.transaction_id,
    purchased_from: 'Netherlands CBAM Registry'
  });
  
  return Response.json({ 
    success: true,
    transaction_id: result.transaction_id,
    quantity,
    total_cost: result.total_amount,
    registry: 'Netherlands'
  });
}

async function getCertificateBalance(base44, params) {
  const { eori, access_token } = params;
  
  const response = await fetch(`${NL_REGISTRY_BASE}/certificates/balance?eori=${eori}`, {
    headers: {
      'Authorization': `Bearer ${access_token}`
    }
  });
  
  if (!response.ok) {
    return Response.json({ 
      error: 'Balance check failed',
      registry: 'Netherlands'
    }, { status: response.status });
  }
  
  const balance = await response.json();
  
  return Response.json({ 
    success: true,
    balance: balance.available_certificates,
    obligations: balance.pending_obligations,
    last_updated: balance.timestamp,
    registry: 'Netherlands'
  });
}