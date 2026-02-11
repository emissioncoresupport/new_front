import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { file_url, tenant_id, batch_id } = body;

    // Fetch and parse CSV from file_url
    const fileResponse = await fetch(file_url);
    const csvText = await fileResponse.text();
    const rows = parseCSV(csvText);

    if (!rows || rows.length === 0) {
      return Response.json({ error: 'No valid rows in CSV' }, { status: 400 });
    }

    // Process each row in parallel (up to 10 at a time)
    const results = [];
    const chunk = 10;

    for (let i = 0; i < rows.length; i += chunk) {
      const batch = rows.slice(i, i + chunk);
      const batchResults = await Promise.all(
        batch.map(row => processSupplierRow(base44, row, tenant_id, batch_id))
      );
      results.push(...batchResults);
    }

    // Summarize results
    const summary = {
      total: rows.length,
      success: results.filter(r => r.status === 'SUCCESS').length,
      failed: results.filter(r => r.status !== 'SUCCESS').length,
      errors: results.filter(r => r.status !== 'SUCCESS'),
      batch_id,
      processed_at: new Date().toISOString()
    };

    // Create import job record
    const importJob = await base44.entities.ImportJob.create({
      name: `Bulk Import - ${new Date().toLocaleDateString()}`,
      source_type: 'CSV',
      schedule_type: 'One-time',
      status: summary.failed === 0 ? 'Active' : 'Completed',
      config: JSON.stringify(summary)
    });

    return Response.json({
      status: summary.failed === 0 ? 'SUCCESS' : 'PARTIAL',
      summary,
      import_job_id: importJob.id
    });
  } catch (error) {
    console.error('bulkImportProcessor error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function processSupplierRow(base44, row, tenant_id, batch_id) {
  try {
    const result = await base44.functions.invoke('supplierIngestionOrchestrator', {
      source_path: 'bulk_import',
      supplier_data: row,
      tenant_id,
      batch_id
    });

    return {
      row: row.legal_name || row.company_name,
      status: result.data.status,
      supplier_id: result.data.supplier_id,
      error: result.data.error
    };
  } catch (error) {
    return {
      row: row.legal_name || row.company_name,
      status: 'ERROR',
      error: error.message
    };
  }
}

function parseCSV(csvText) {
  // RFC 4180 compliant CSV parser
  const lines = csvText.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line) {
  // Handle quoted fields with commas inside
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}