import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * France CBAM Registry API Connector
 * DGDDI (Direction Générale des Douanes et Droits Indirects)
 * XML-heavy EDIFACT-based submission
 */

const FR_REGISTRY_BASE = 'https://cbam.douane.gouv.fr/api/v1';
const FR_AUTH_ENDPOINT = 'https://pro.douane.gouv.fr/auth/oauth2/token';

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
      
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ 
      error: error.message,
      registry: 'France'
    }, { status: 500 });
  }
});

async function authenticate(base44, params) {
  const clients = await base44.asServiceRole.entities.CBAMClient.filter({
    member_state: 'FR',
    status: 'active'
  });
  
  if (!clients.length) {
    return Response.json({ 
      error: 'No active France CBAM configuration'
    }, { status: 400 });
  }
  
  const client = clients[0];
  
  // French OAuth using EORI as client_id
  const tokenResponse = await fetch(FR_AUTH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: client.eori_number,
      client_secret: client.api_key_encrypted,
      scope: 'cbam.declarations.write cbam.certificates.read'
    })
  });
  
  if (!tokenResponse.ok) {
    return Response.json({ 
      error: 'French customs authentication failed',
      registry: 'France'
    }, { status: 401 });
  }
  
  const { access_token, expires_in } = await tokenResponse.json();
  
  return Response.json({ 
    success: true,
    token: access_token,
    expires_in,
    registry: 'France'
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
  
  // Build French CBAM XML (EDIFACT-inspired structure)
  const xmlDeclaration = buildFrenchCBAMXML(report, entries);
  
  // Submit via DGDDI API
  const response = await fetch(`${FR_REGISTRY_BASE}/declarations/cbam`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/xml; charset=utf-8',
      'X-Customs-EORI': report.eori_number
    },
    body: xmlDeclaration
  });
  
  if (!response.ok) {
    const error = await response.text();
    return Response.json({ 
      error: 'French registry submission failed',
      details: error,
      registry: 'France'
    }, { status: response.status });
  }
  
  const result = await response.json();
  
  await base44.asServiceRole.entities.CBAMReport.update(report_id, {
    status: 'submitted',
    submission_date: new Date().toISOString(),
    registry_confirmation_number: result.numero_recepisse,
    submitted_via_cbam_registry: true
  });
  
  return Response.json({ 
    success: true,
    confirmation_number: result.numero_recepisse,
    reference_douane: result.reference,
    registry: 'France'
  });
}

async function getSubmissionStatus(base44, params) {
  const { confirmation_number, access_token } = params;
  
  const response = await fetch(`${FR_REGISTRY_BASE}/declarations/status/${confirmation_number}`, {
    headers: {
      'Authorization': `Bearer ${access_token}`
    }
  });
  
  if (!response.ok) {
    return Response.json({ 
      error: 'Status check failed',
      registry: 'France'
    }, { status: response.status });
  }
  
  const status = await response.json();
  
  return Response.json({ 
    success: true,
    status: status.statut,
    acceptance_date: status.date_acceptation,
    errors: status.erreurs || [],
    registry: 'France'
  });
}

function buildFrenchCBAMXML(report, entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<DeclarationCBAM xmlns="urn:douane:cbam:2026" version="1.0">
  <EnTete>
    <NumeroEORI>${report.eori_number}</NumeroEORI>
    <NomDeclarant>${report.declarant_name}</NomDeclarant>
    <NumeroCompteCBAM>${report.cbam_account_number}</NumeroCompteCBAM>
    <PeriodeDeclaration>
      <Annee>${report.reporting_year}</Annee>
      <Trimestre>${report.reporting_quarter}</Trimestre>
    </PeriodeDeclaration>
    <DateSoumission>${new Date().toISOString()}</DateSoumission>
    <Langue>FR</Langue>
  </EnTete>
  <Importations>
    ${entries.map((entry, idx) => `
    <Importation numero="${idx + 1}">
      <IdentifiantImport>${entry.import_id}</IdentifiantImport>
      <DateImport>${entry.import_date}</DateImport>
      <CodeNC>${entry.cn_code}</CodeNC>
      <DesignationMarchandise>${entry.product_name}</DesignationMarchandise>
      <PaysOrigine>${entry.country_of_origin}</PaysOrigine>
      <Quantite unite="tonnes">${entry.quantity}</Quantite>
      <Emissions>
        <EmissionsDirectes>${entry.direct_emissions_specific}</EmissionsDirectes>
        <EmissionsIndirectes>${entry.indirect_emissions_specific}</EmissionsIndirectes>
        <EmissionsTotales>${entry.total_embedded_emissions}</EmissionsTotales>
        <MethodeCalcul>${entry.calculation_method}</MethodeCalcul>
      </Emissions>
      <VoieProduction>${entry.production_route || 'Non_specifie'}</VoieProduction>
      <PrixCarboneAcquitte>${entry.carbon_price_due_paid || 0}</PrixCarboneAcquitte>
    </Importation>
    `).join('')}
  </Importations>
  <Recapitulatif>
    <NombreImportations>${entries.length}</NombreImportations>
    <QuantiteTotale>${report.total_goods_quantity_tonnes}</QuantiteTotale>
    <EmissionsTotales>${report.total_embedded_emissions}</EmissionsTotales>
    <CertificatsRequis>${Math.ceil(report.total_embedded_emissions)}</CertificatsRequis>
  </Recapitulatif>
</DeclarationCBAM>`;
}