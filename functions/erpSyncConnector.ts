import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { action, erp_system, connection_id, tenant_id } = body;

    if (action === 'test_connection') {
      return testERPConnection(base44, erp_system, body);
    } else if (action === 'sync') {
      return syncFromERP(base44, connection_id, tenant_id, body);
    } else if (action === 'map_fields') {
      return mapERPFields(base44, erp_system, body);
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('erpSyncConnector error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function testERPConnection(base44, erp_system, config) {
  // Simulate API call to ERP system
  const endpoints = {
    SAP: 'https://api.sap.com/suppliers',
    Oracle: 'https://api.oracle.com/suppliers',
    NetSuite: 'https://api.netsuite.com/rest/record/v1/vendor'
  };

  try {
    const response = await fetch(endpoints[erp_system] || '', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return Response.json({
        status: 'SUCCESS',
        message: `Connected to ${erp_system}`,
        system: erp_system
      });
    } else {
      return Response.json({
        status: 'FAILED',
        error: `${erp_system} API returned ${response.status}`
      }, { status: 400 });
    }
  } catch (err) {
    return Response.json({
      status: 'FAILED',
      error: err.message
    }, { status: 500 });
  }
}

async function syncFromERP(base44, connection_id, tenant_id, config) {
  // Fetch ERP connection details
  const connections = await base44.entities.ERPConnection.filter({ id: connection_id });
  if (!connections || connections.length === 0) {
    return Response.json({ error: 'Connection not found' }, { status: 404 });
  }

  const connection = connections[0];

  // Fetch suppliers from ERP
  const erpSuppliers = await fetchFromERP(connection);

  // Process each supplier through ingestion pipeline
  const results = [];
  for (const supplier of erpSuppliers) {
    const result = await base44.functions.invoke('supplierIngestionOrchestrator', {
      source_path: 'erp_sync',
      supplier_data: supplier,
      tenant_id,
      erp_system: connection.system_type,
      erp_record_id: supplier.id
    });
    results.push(result.data);
  }

  // Update connection last_sync_date
  await base44.entities.ERPConnection.update(connection_id, {
    last_sync_date: new Date().toISOString()
  });

  return Response.json({
    status: 'SUCCESS',
    suppliers_processed: erpSuppliers.length,
    results: results.filter(r => r.status === 'SUCCESS').length,
    sync_timestamp: new Date().toISOString()
  });
}

async function mapERPFields(base44, erp_system, mappingConfig) {
  // Store field mapping for this ERP system
  const mappings = {
    SAP: {
      'LIFNR': 'legal_name',
      'LAND1': 'country',
      'ADRESS': 'address',
      'ORT01': 'city',
      'PSTLZ': 'postal_code',
      'TELF1': 'primary_contact_phone',
      'SMTP_ADDR': 'primary_contact_email'
    },
    Oracle: {
      'VENDOR_NAME': 'legal_name',
      'COUNTRY': 'country',
      'ADDRESS_LINE1': 'address',
      'CITY': 'city',
      'POSTAL_CODE': 'postal_code',
      'PHONE': 'primary_contact_phone',
      'EMAIL_ADDRESS': 'primary_contact_email'
    },
    NetSuite: {
      'companyName': 'legal_name',
      'billaddress_country': 'country',
      'billaddress_addr1': 'address',
      'billaddress_city': 'city',
      'billaddress_zip': 'postal_code',
      'phone': 'primary_contact_phone',
      'email': 'primary_contact_email'
    }
  };

  return Response.json({
    status: 'SUCCESS',
    mappings: mappings[erp_system] || {},
    system: erp_system
  });
}

async function fetchFromERP(connection) {
  // Mock fetch - in production, call actual ERP API
  return [
    {
      id: 'SAP001',
      legal_name: 'Example Corp',
      country: 'DE',
      address: '123 Main St',
      city: 'Berlin',
      postal_code: '10115',
      primary_contact_email: 'contact@example.com'
    }
  ];
}