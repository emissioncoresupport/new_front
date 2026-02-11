import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Auditor API - Standardized RESTful API for third-party auditors and verifiers
 * Per Implementing Regulation 2023/1773 Art. 9 - Verification Requirements
 * 
 * Endpoints:
 * GET /entries - List all CBAM emission entries
 * GET /entries/:id - Get single entry with full calculation breakdown
 * GET /reports - List CBAM reports
 * GET /reports/:id - Get report details with linked entries
 * GET /evidence/:entryId - Get supporting evidence documents
 * GET /verification-reports - List verification reports
 * POST /verify/:entryId - Submit verification opinion
 * GET /audit-trail/:entryId - Get blockchain audit trail
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean);
    const method = req.method;

    // Authentication - Check for auditor role
    let user;
    try {
      user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized - Authentication required' }, { status: 401 });
      }
    } catch (e) {
      return Response.json({ error: 'Unauthorized - Invalid credentials' }, { status: 401 });
    }

    // Role check - Must be Auditor, Admin, or specific auditor API key
    const auditorRoles = ['Admin', 'Auditor', 'Verifier', 'IntegrationAdmin'];
    const hasAuditorAccess = auditorRoles.includes(user.role) || url.searchParams.get('api_key') === Deno.env.get('AUDITOR_API_KEY');

    if (!hasAuditorAccess) {
      return Response.json({ 
        error: 'Forbidden - Auditor role required',
        hint: 'Contact your administrator to request auditor access'
      }, { status: 403 });
    }

    // Route handling
    const endpoint = path[0];
    const resourceId = path[1];

    // GET /entries - List all entries (read-only)
    if (endpoint === 'entries' && method === 'GET' && !resourceId) {
      const filters = {
        verification_status: url.searchParams.get('status'),
        country_of_origin: url.searchParams.get('country'),
        aggregated_goods_category: url.searchParams.get('category')
      };
      
      // Remove null filters
      Object.keys(filters).forEach(key => filters[key] === null && delete filters[key]);

      const entries = await base44.asServiceRole.entities.CBAMEmissionEntry.filter(filters);
      
      return Response.json({
        success: true,
        count: entries.length,
        data: entries.map(e => ({
          id: e.id,
          cn_code: e.cn_code,
          product_name: e.product_name,
          country_of_origin: e.country_of_origin,
          quantity: e.quantity,
          direct_emissions_specific: e.direct_emissions_specific,
          indirect_emissions_specific: e.indirect_emissions_specific,
          total_embedded_emissions: e.total_embedded_emissions,
          calculation_method: e.calculation_method,
          verification_status: e.verification_status,
          import_date: e.import_date,
          created_date: e.created_date,
          supplier_name: e.supplier_name,
          data_quality_rating: e.data_quality_rating
        }))
      });
    }

    // GET /entries/:id - Single entry with full breakdown
    if (endpoint === 'entries' && method === 'GET' && resourceId) {
      const entry = await base44.asServiceRole.entities.CBAMEmissionEntry.filter({ id: resourceId });
      
      if (!entry || entry.length === 0) {
        return Response.json({ error: 'Entry not found' }, { status: 404 });
      }

      // Get precursor breakdown
      const precursors = await base44.asServiceRole.entities.CBAMPrecursor.filter({ 
        complex_good_entry_id: resourceId 
      });

      // Get verification report if exists
      let verificationReport = null;
      if (entry[0].verification_report_id) {
        const reports = await base44.asServiceRole.entities.CBAMVerificationReport.filter({ 
          id: entry[0].verification_report_id 
        });
        verificationReport = reports[0] || null;
      }

      return Response.json({
        success: true,
        data: {
          ...entry[0],
          precursors_breakdown: precursors,
          verification_report: verificationReport,
          calculation_breakdown: {
            direct: entry[0].direct_emissions_specific * entry[0].quantity,
            indirect: (entry[0].indirect_emissions_specific || 0) * entry[0].quantity,
            precursors: precursors.reduce((sum, p) => sum + (p.emissions_embedded || 0), 0),
            total: entry[0].total_embedded_emissions
          }
        }
      });
    }

    // GET /reports - List CBAM reports
    if (endpoint === 'reports' && method === 'GET' && !resourceId) {
      const reports = await base44.asServiceRole.entities.CBAMReport.list('-reporting_period');
      
      return Response.json({
        success: true,
        count: reports.length,
        data: reports.map(r => ({
          id: r.id,
          reporting_period: r.reporting_period,
          reporting_year: r.reporting_year,
          reporting_quarter: r.reporting_quarter,
          eori_number: r.eori_number,
          declarant_name: r.declarant_name,
          status: r.status,
          total_imports_count: r.total_imports_count,
          total_embedded_emissions: r.total_embedded_emissions,
          certificates_required: r.certificates_required,
          submission_date: r.submission_date,
          submission_deadline: r.submission_deadline
        }))
      });
    }

    // GET /reports/:id - Single report with entries
    if (endpoint === 'reports' && method === 'GET' && resourceId) {
      const reports = await base44.asServiceRole.entities.CBAMReport.filter({ id: resourceId });
      
      if (!reports || reports.length === 0) {
        return Response.json({ error: 'Report not found' }, { status: 404 });
      }

      const report = reports[0];
      
      // Get linked entries
      const linkedIds = report.linked_entries || [];
      const entries = linkedIds.length > 0 
        ? await base44.asServiceRole.entities.CBAMEmissionEntry.list()
        : [];
      
      const reportEntries = entries.filter(e => linkedIds.includes(e.id));

      return Response.json({
        success: true,
        data: {
          ...report,
          entries: reportEntries
        }
      });
    }

    // GET /evidence/:entryId - Get supporting documents
    if (endpoint === 'evidence' && method === 'GET' && resourceId) {
      const entries = await base44.asServiceRole.entities.CBAMEmissionEntry.filter({ id: resourceId });
      
      if (!entries || entries.length === 0) {
        return Response.json({ error: 'Entry not found' }, { status: 404 });
      }

      const documents = entries[0].documents || [];

      return Response.json({
        success: true,
        entry_id: resourceId,
        documents: documents
      });
    }

    // GET /verification-reports - List all verification reports
    if (endpoint === 'verification-reports' && method === 'GET') {
      const reports = await base44.asServiceRole.entities.CBAMVerificationReport.list('-created_date');
      
      return Response.json({
        success: true,
        count: reports.length,
        data: reports
      });
    }

    // POST /verify/:entryId - Submit verification (auditor action)
    if (endpoint === 'verify' && method === 'POST' && resourceId) {
      const body = await req.json();
      
      if (!body.verification_opinion || !body.verifier_name) {
        return Response.json({ 
          error: 'Missing required fields: verification_opinion, verifier_name' 
        }, { status: 400 });
      }

      // Create verification report
      const report = await base44.asServiceRole.entities.CBAMVerificationReport.create({
        reporting_year: new Date().getFullYear(),
        operator_name: body.operator_name || 'N/A',
        verifier_name: body.verifier_name,
        verifier_accreditation: body.verifier_accreditation || 'Accredited',
        verification_opinion: body.verification_opinion,
        findings_summary: body.findings_summary || '',
        recommendations: body.recommendations || '',
        materiality_threshold_percent: body.materiality_threshold || 5,
        site_visit_type: body.site_visit_type || 'remote',
        status: 'completed'
      });

      // Update entry
      const newStatus = body.verification_opinion === 'satisfactory' 
        ? 'accredited_verifier_satisfactory' 
        : 'accredited_verifier_unsatisfactory';

      await base44.asServiceRole.entities.CBAMEmissionEntry.update(resourceId, {
        verification_status: newStatus,
        verification_report_id: report.id,
        verifier_id: report.id
      });

      return Response.json({
        success: true,
        message: 'Entry verified successfully',
        verification_report_id: report.id,
        new_status: newStatus
      });
    }

    // GET /audit-trail/:entryId - Get blockchain audit trail
    if (endpoint === 'audit-trail' && method === 'GET' && resourceId) {
      const auditLogs = await base44.asServiceRole.entities.BlockchainAuditLog.filter({
        entity_id: resourceId,
        entity_type: 'CBAMEmissionEntry'
      });

      return Response.json({
        success: true,
        entry_id: resourceId,
        audit_trail: auditLogs.map(log => ({
          transaction_hash: log.transaction_hash,
          action: log.action,
          timestamp: log.timestamp,
          actor: log.actor_email,
          data_hash: log.data_hash,
          blockchain_verified: log.verification_status === 'verified'
        }))
      });
    }

    // Invalid endpoint
    return Response.json({ 
      error: 'Invalid endpoint',
      available_endpoints: [
        'GET /entries',
        'GET /entries/:id',
        'GET /reports',
        'GET /reports/:id',
        'GET /evidence/:entryId',
        'GET /verification-reports',
        'POST /verify/:entryId',
        'GET /audit-trail/:entryId'
      ]
    }, { status: 404 });

  } catch (error) {
    console.error('Auditor API Error:', error);
    return Response.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
});