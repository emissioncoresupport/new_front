import { base44 } from '@base44/sdk';

/**
 * Sync data from ERP system to Emission CORE
 * Supports SAP, Oracle, Microsoft Dynamics, and generic REST APIs
 */
export default async function syncFromERP(req, res) {
  try {
    const { companyId, dataType } = req.body; // dataType: 'suppliers', 'products', 'emissions'

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
      imported: 0,
      updated: 0,
      errors: [],
      data: []
    };

    // Sync based on data type
    if (dataType === 'suppliers') {
      const syncResult = await syncSuppliers(company);
      Object.assign(results, syncResult);
    } else if (dataType === 'products') {
      const syncResult = await syncProducts(company);
      Object.assign(results, syncResult);
    } else if (dataType === 'emissions') {
      const syncResult = await syncEmissionFactors(company);
      Object.assign(results, syncResult);
    } else {
      return res.status(400).json({ error: 'Invalid dataType' });
    }

    // Create audit log
    await base44.entities.AuditLog.create({
      company_id: companyId,
      action: 'IMPORT',
      entity_type: `ERP_${dataType}`,
      module: 'System',
      severity: results.errors.length > 0 ? 'WARNING' : 'INFO',
      notes: `ERP Sync: ${results.imported} imported, ${results.updated} updated, ${results.errors.length} errors`
    });

    return res.json(results);

  } catch (error) {
    console.error('ERP sync error:', error);
    return res.status(500).json({ 
      error: 'Sync failed',
      message: error.message 
    });
  }
}

async function syncSuppliers(company) {
  const results = { imported: 0, updated: 0, errors: [], data: [] };
  
  try {
    const erpResponse = await fetch(`${company.erp_api_endpoint}/suppliers`, {
      headers: {
        'Authorization': `Bearer ${company.erp_api_key}`,
        'Content-Type': 'application/json'
      }
    });

    if (!erpResponse.ok) {
      throw new Error(`ERP API error: ${erpResponse.status}`);
    }

    const erpSuppliers = await erpResponse.json();
    const suppliers = Array.isArray(erpSuppliers) ? erpSuppliers : erpSuppliers.data || [];

    const existingSuppliers = await base44.entities.Supplier.list();

    for (const erpSupplier of suppliers) {
      try {
        const supplierData = {
          company_id: company.id,
          company_name: erpSupplier.name || erpSupplier.supplier_name,
          country: erpSupplier.country,
          contact_email: erpSupplier.email,
          supplier_code: erpSupplier.code || erpSupplier.supplier_id,
          external_id: erpSupplier.id || erpSupplier.supplier_id
        };

        const existing = existingSuppliers.find(s => 
          s.external_id === supplierData.external_id || 
          s.supplier_code === supplierData.supplier_code
        );

        if (existing) {
          await base44.entities.Supplier.update(existing.id, supplierData);
          results.updated++;
        } else {
          const created = await base44.entities.Supplier.create(supplierData);
          results.imported++;
          results.data.push(created);
        }
      } catch (err) {
        results.errors.push(`Supplier ${erpSupplier.name}: ${err.message}`);
      }
    }
  } catch (error) {
    results.errors.push(error.message);
  }

  return results;
}

async function syncProducts(company) {
  const results = { imported: 0, updated: 0, errors: [], data: [] };
  
  try {
    const erpResponse = await fetch(`${company.erp_api_endpoint}/products`, {
      headers: {
        'Authorization': `Bearer ${company.erp_api_key}`,
        'Content-Type': 'application/json'
      }
    });

    if (!erpResponse.ok) {
      throw new Error(`ERP API error: ${erpResponse.status}`);
    }

    const erpProducts = await erpResponse.json();
    const products = Array.isArray(erpProducts) ? erpProducts : erpProducts.data || [];

    const existingSKUs = await base44.entities.SKU.list();

    for (const erpProduct of products) {
      try {
        const skuData = {
          company_id: company.id,
          product_name: erpProduct.name || erpProduct.description,
          sku_name: erpProduct.sku || erpProduct.product_code,
          hs_code: erpProduct.hs_code || erpProduct.cn_code,
          external_id: erpProduct.id || erpProduct.product_id
        };

        const existing = existingSKUs.find(s => 
          s.external_id === skuData.external_id || 
          s.sku_name === skuData.sku_name
        );

        if (existing) {
          await base44.entities.SKU.update(existing.id, skuData);
          results.updated++;
        } else {
          const created = await base44.entities.SKU.create(skuData);
          results.imported++;
          results.data.push(created);
        }
      } catch (err) {
        results.errors.push(`Product ${erpProduct.name}: ${err.message}`);
      }
    }
  } catch (error) {
    results.errors.push(error.message);
  }

  return results;
}

async function syncEmissionFactors(company) {
  const results = { imported: 0, updated: 0, errors: [], data: [] };
  
  try {
    const erpResponse = await fetch(`${company.erp_api_endpoint}/emission-factors`, {
      headers: {
        'Authorization': `Bearer ${company.erp_api_key}`,
        'Content-Type': 'application/json'
      }
    });

    if (!erpResponse.ok) {
      throw new Error(`ERP API error: ${erpResponse.status}`);
    }

    const erpFactors = await erpResponse.json();
    const factors = Array.isArray(erpFactors) ? erpFactors : erpFactors.data || [];

    const existingFactors = await base44.entities.EmissionFactor.list();

    for (const erpFactor of factors) {
      try {
        const factorData = {
          company_id: company.id,
          factor_name: erpFactor.name || erpFactor.description,
          scope: erpFactor.scope || 'Scope 1',
          emission_factor_value: erpFactor.value || erpFactor.co2_factor,
          unit: erpFactor.unit || 'kg CO2e',
          source: company.erp_system || 'ERP System',
          external_id: erpFactor.id
        };

        const existing = existingFactors.find(f => f.external_id === factorData.external_id);

        if (existing) {
          await base44.entities.EmissionFactor.update(existing.id, factorData);
          results.updated++;
        } else {
          const created = await base44.entities.EmissionFactor.create(factorData);
          results.imported++;
          results.data.push(created);
        }
      } catch (err) {
        results.errors.push(`Emission Factor ${erpFactor.name}: ${err.message}`);
      }
    }
  } catch (error) {
    results.errors.push(error.message);
  }

  return results;
}