import { base44 } from '@base44/sdk';

/**
 * Export CBAM data to ERP system
 * Sends validated emission entries and reports back to ERP
 */
export default async function exportToERP(req, res) {
  try {
    const { companyId, dataType, entityIds } = req.body;

    if (!companyId || !dataType) {
      return res.status(400).json({ error: 'Missing companyId or dataType' });
    }

    const company = await base44.entities.Company.get(companyId);
    
    if (!company || !company.erp_api_endpoint || !company.erp_api_key) {
      return res.status(400).json({ 
        error: 'ERP credentials not configured',
        message: 'Please configure ERP API endpoint and key in Company Settings'
      });
    }

    const results = {
      exported: 0,
      errors: [],
      details: []
    };

    if (dataType === 'cbam_entries') {
      const exportResult = await exportCBAMEntries(company, entityIds);
      Object.assign(results, exportResult);
    } else if (dataType === 'cbam_reports') {
      const exportResult = await exportCBAMReports(company, entityIds);
      Object.assign(results, exportResult);
    } else if (dataType === 'supplier_data') {
      const exportResult = await exportSupplierData(company, entityIds);
      Object.assign(results, exportResult);
    } else {
      return res.status(400).json({ error: 'Invalid dataType' });
    }

    // Create audit log
    await base44.entities.AuditLog.create({
      company_id: companyId,
      action: 'EXPORT',
      entity_type: `ERP_${dataType}`,
      module: 'CBAM',
      severity: results.errors.length > 0 ? 'WARNING' : 'INFO',
      notes: `ERP Export: ${results.exported} exported, ${results.errors.length} errors`
    });

    return res.json(results);

  } catch (error) {
    console.error('ERP export error:', error);
    return res.status(500).json({ 
      error: 'Export failed',
      message: error.message 
    });
  }
}

async function exportCBAMEntries(company, entityIds) {
  const results = { exported: 0, errors: [], details: [] };
  
  try {
    const entries = entityIds 
      ? await Promise.all(entityIds.map(id => base44.entities.CBAMEmissionEntry.get(id)))
      : await base44.entities.CBAMEmissionEntry.filter({ validation_status: 'validated' });

    const exportData = entries.map(entry => ({
      external_id: entry.id,
      import_id: entry.import_id,
      cn_code: entry.cn_code,
      product_name: entry.product_name,
      country_of_origin: entry.country_of_origin,
      quantity: entry.quantity,
      direct_emissions: entry.direct_emissions_specific,
      indirect_emissions: entry.indirect_emissions_specific,
      total_emissions: entry.total_embedded_emissions,
      import_date: entry.import_date,
      validation_status: entry.validation_status,
      data_quality: entry.data_quality_rating
    }));

    const erpResponse = await fetch(`${company.erp_api_endpoint}/cbam/entries`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${company.erp_api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ entries: exportData })
    });

    if (!erpResponse.ok) {
      throw new Error(`ERP API error: ${erpResponse.status} - ${await erpResponse.text()}`);
    }

    const erpResult = await erpResponse.json();
    results.exported = exportData.length;
    results.details = erpResult;

  } catch (error) {
    results.errors.push(error.message);
  }

  return results;
}

async function exportCBAMReports(company, entityIds) {
  const results = { exported: 0, errors: [], details: [] };
  
  try {
    const reports = entityIds 
      ? await Promise.all(entityIds.map(id => base44.entities.CBAMReport.get(id)))
      : await base44.entities.CBAMReport.filter({ status: 'submitted' });

    const exportData = reports.map(report => ({
      external_id: report.id,
      reporting_period: report.reporting_period,
      eori_number: report.eori_number,
      total_imports: report.total_imports_count,
      total_emissions: report.total_embedded_emissions,
      submission_date: report.submission_date,
      registry_confirmation: report.registry_confirmation_number,
      status: report.status,
      xml_url: report.xml_file_url
    }));

    const erpResponse = await fetch(`${company.erp_api_endpoint}/cbam/reports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${company.erp_api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reports: exportData })
    });

    if (!erpResponse.ok) {
      throw new Error(`ERP API error: ${erpResponse.status}`);
    }

    results.exported = exportData.length;

  } catch (error) {
    results.errors.push(error.message);
  }

  return results;
}

async function exportSupplierData(company, entityIds) {
  const results = { exported: 0, errors: [], details: [] };
  
  try {
    const suppliers = entityIds 
      ? await Promise.all(entityIds.map(id => base44.entities.Supplier.get(id)))
      : await base44.entities.Supplier.filter({ company_id: company.id });

    const exportData = suppliers.map(supplier => ({
      external_id: supplier.id,
      supplier_code: supplier.supplier_code,
      company_name: supplier.company_name,
      country: supplier.country,
      contact_email: supplier.contact_email,
      esg_score: supplier.esg_score,
      compliance_status: supplier.compliance_status
    }));

    const erpResponse = await fetch(`${company.erp_api_endpoint}/suppliers/update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${company.erp_api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ suppliers: exportData })
    });

    if (!erpResponse.ok) {
      throw new Error(`ERP API error: ${erpResponse.status}`);
    }

    results.exported = exportData.length;

  } catch (error) {
    results.errors.push(error.message);
  }

  return results;
}