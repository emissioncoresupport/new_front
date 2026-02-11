import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Germany CBAM Registry API Connector
 * BzSt (Bundeszentralamt für Steuern) Integration
 * XML-based SOAP API per German specifications
 */

const DE_REGISTRY_BASE = 'https://cbam-registry.deutschland.de/ws';
const DE_AUTH_ENDPOINT = 'https://cbam-registry.deutschland.de/auth';

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
      
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ 
      error: error.message,
      registry: 'Germany',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});

async function authenticate(base44, params) {
  const clients = await base44.asServiceRole.entities.CBAMClient.filter({
    member_state: 'DE',
    status: 'active'
  });
  
  if (!clients.length) {
    return Response.json({ 
      error: 'No active Germany CBAM configuration found'
    }, { status: 400 });
  }
  
  const client = clients[0];
  
  // German system uses certificate-based auth + API key
  const authRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <wsse:UsernameToken>
        <wsse:Username>${client.eori_number}</wsse:Username>
        <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${client.api_key_encrypted}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soap:Header>
  <soap:Body>
    <AuthenticateRequest xmlns="urn:cbam:de:2026">
      <EORINumber>${client.eori_number}</EORINumber>
      <AccountNumber>${client.cbam_account_number}</AccountNumber>
    </AuthenticateRequest>
  </soap:Body>
</soap:Envelope>`;
  
  const response = await fetch(DE_AUTH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': 'urn:cbam:de:Authenticate'
    },
    body: authRequest
  });
  
  if (!response.ok) {
    return Response.json({ 
      error: 'Authentication failed',
      registry: 'Germany'
    }, { status: 401 });
  }
  
  const xmlResponse = await response.text();
  // Parse session token from XML (simplified)
  const tokenMatch = xmlResponse.match(/<SessionToken>(.*?)<\/SessionToken>/);
  const token = tokenMatch ? tokenMatch[1] : null;
  
  if (!token) {
    return Response.json({ 
      error: 'Failed to extract session token',
      registry: 'Germany'
    }, { status: 500 });
  }
  
  return Response.json({ 
    success: true,
    token,
    registry: 'Germany'
  });
}

async function submitReport(base44, params) {
  const { report_id, access_token } = params;
  
  const reports = await base44.asServiceRole.entities.CBAMReport.filter({ id: report_id });
  if (!reports.length) {
    return Response.json({ error: 'Report not found' }, { status: 404 });
  }
  
  const report = reports[0];
  const entries = await base44.asServiceRole.entities.CBAMEmissionEntry.filter({
    id: { $in: report.linked_entries || [] }
  });
  
  // Build German CBAM XML (GAEB-based format)
  const xmlSubmission = `<?xml version="1.0" encoding="UTF-8"?>
<CBAMDeclaration xmlns="urn:cbam:de:2026" version="2026.1">
  <Header>
    <DeclarationID>${report.id}</DeclarationID>
    <EORI>${report.eori_number}</EORI>
    <DeclarantName>${report.declarant_name}</DeclarantName>
    <CBAMAccountNumber>${report.cbam_account_number}</CBAMAccountNumber>
    <ReportingPeriod>
      <Year>${report.reporting_year}</Year>
      <Quarter>${report.reporting_quarter}</Quarter>
    </ReportingPeriod>
    <SubmissionDate>${new Date().toISOString()}</SubmissionDate>
  </Header>
  <Imports>
    ${entries.map(entry => `
    <Import>
      <ImportID>${entry.import_id}</ImportID>
      <ImportDate>${entry.import_date}</ImportDate>
      <CNCode>${entry.cn_code}</CNCode>
      <GoodsDescription>${entry.product_name}</GoodsDescription>
      <CountryOfOrigin>${entry.country_of_origin}</CountryOfOrigin>
      <Quantity unit="tonnes">${entry.quantity}</Quantity>
      <Emissions>
        <Direct>${entry.direct_emissions_specific}</Direct>
        <Indirect>${entry.indirect_emissions_specific}</Indirect>
        <Total>${entry.total_embedded_emissions}</Total>
        <CalculationMethod>${entry.calculation_method}</CalculationMethod>
      </Emissions>
      <ProductionRoute>${entry.production_route || 'Not_specified'}</ProductionRoute>
      <CarbonPricePaid>${entry.carbon_price_due_paid || 0}</CarbonPricePaid>
    </Import>
    `).join('')}
  </Imports>
  <Summary>
    <TotalImports>${entries.length}</TotalImports>
    <TotalQuantity>${report.total_goods_quantity_tonnes}</TotalQuantity>
    <TotalEmissions>${report.total_embedded_emissions}</TotalEmissions>
    <CertificatesRequired>${Math.ceil(report.total_embedded_emissions)}</CertificatesRequired>
  </Summary>
</CBAMDeclaration>`;
  
  const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <SessionToken>${access_token}</SessionToken>
  </soap:Header>
  <soap:Body>
    <SubmitDeclarationRequest xmlns="urn:cbam:de:2026">
      ${xmlSubmission}
    </SubmitDeclarationRequest>
  </soap:Body>
</soap:Envelope>`;
  
  const response = await fetch(`${DE_REGISTRY_BASE}/submission`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': 'urn:cbam:de:SubmitDeclaration'
    },
    body: soapRequest
  });
  
  if (!response.ok) {
    return Response.json({ 
      error: 'Submission failed',
      registry: 'Germany'
    }, { status: response.status });
  }
  
  const xmlResponse = await response.text();
  const confirmationMatch = xmlResponse.match(/<ConfirmationNumber>(.*?)<\/ConfirmationNumber>/);
  const confirmation = confirmationMatch ? confirmationMatch[1] : 'PENDING';
  
  await base44.asServiceRole.entities.CBAMReport.update(report_id, {
    status: 'submitted',
    submission_date: new Date().toISOString(),
    registry_confirmation_number: confirmation,
    submitted_via_cbam_registry: true
  });
  
  return Response.json({ 
    success: true,
    confirmation_number: confirmation,
    registry: 'Germany'
  });
}

async function getSubmissionStatus(base44, params) {
  const { confirmation_number, access_token } = params;
  
  const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <SessionToken>${access_token}</SessionToken>
  </soap:Header>
  <soap:Body>
    <GetStatusRequest xmlns="urn:cbam:de:2026">
      <ConfirmationNumber>${confirmation_number}</ConfirmationNumber>
    </GetStatusRequest>
  </soap:Body>
</soap:Envelope>`;
  
  const response = await fetch(`${DE_REGISTRY_BASE}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': 'urn:cbam:de:GetStatus'
    },
    body: soapRequest
  });
  
  if (!response.ok) {
    return Response.json({ 
      error: 'Status check failed',
      registry: 'Germany'
    }, { status: response.status });
  }
  
  const xmlResponse = await response.text();
  const statusMatch = xmlResponse.match(/<Status>(.*?)<\/Status>/);
  const status = statusMatch ? statusMatch[1] : 'UNKNOWN';
  
  return Response.json({ 
    success: true,
    status,
    registry: 'Germany'
  });
}

async function purchaseCertificates(base44, params) {
  // German certificate purchase via separate EEX integration
  return Response.json({ 
    error: 'Certificate purchase via EEX - use ETS Integration Hub',
    registry: 'Germany'
  }, { status: 501 });
}