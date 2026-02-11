import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { IngestionParityEnforcer } from './services/IngestionParityEnforcer.js';

// Bulk Import with Evidence-First Architecture
// EVERY CSV row creates an immutable Evidence record BEFORE processing

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      csv_text, 
      declared_context,
      batch_name 
    } = await req.json();

    // Validate context declaration
    if (!declared_context || !declared_context.entity_type || !declared_context.intended_use) {
      return Response.json({ 
        error: 'Context declaration required: entity_type, intended_use, source_role, reason' 
      }, { status: 400 });
    }

    const tenant_id = user.company_id || 'default';
    const batch_id = `BATCH-${Date.now()}`;
    
    // Parse CSV
    const rows = parseCSV(csv_text);
    if (rows.length === 0) {
      return Response.json({ error: 'No valid rows in CSV' }, { status: 400 });
    }

    const results = [];
    
    // Process each row: Evidence creation FIRST
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        // Generate declaration hash (immutable proof of CSV row data)
        const declaration_text = JSON.stringify(row);
        const hash_buffer = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(declaration_text)
        );
        const declaration_hash = Array.from(new Uint8Array(hash_buffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        // Create Evidence record for this CSV row
        const evidenceRes = await base44.functions.invoke('createEvidenceFromContext', {
          ingestion_path: 'bulk_import',
          declared_context: {
            ...declared_context,
            reason: `${declared_context.reason} - Row ${i + 1}: ${row.legal_name || 'unnamed'}`
          },
          file_url: null, // CSV rows don't have individual files
          file_hash_sha256: null,
          declaration_hash_sha256: declaration_hash,
          declared_entity_type: 'SUPPLIER',
          declared_evidence_type: 'CSV_ROW',
          batch_id,
          structured_payload: row
        });

        if (!evidenceRes.data.success) {
          throw new Error(evidenceRes.data.error);
        }

        results.push({
          row_number: i + 1,
          legal_name: row.legal_name,
          status: 'EVIDENCE_CREATED',
          evidence_id: evidenceRes.data.evidence_id,
          declaration_hash: declaration_hash
        });
      } catch (error) {
        results.push({
          row_number: i + 1,
          legal_name: row.legal_name,
          status: 'ERROR',
          error: error.message
        });

        // Log error in audit trail
        await base44.asServiceRole.entities.AuditLogEntry.create({
          tenant_id,
          resource_type: 'Evidence',
          resource_id: `BATCH-${batch_id}-ROW-${i + 1}`,
          action: 'EVIDENCE_CREATION_FAILED',
          actor_email: user.email,
          actor_role: user.role,
          action_timestamp: new Date().toISOString(),
          details: `Bulk import row ${i + 1} failed: ${error.message}`,
          status: 'FAILURE',
          error_message: error.message
        });
      }
    }

    // Log batch completion
    await base44.asServiceRole.entities.AuditLogEntry.create({
      tenant_id,
      resource_type: 'Evidence',
      resource_id: batch_id,
      action: 'BULK_IMPORT_COMPLETED',
      actor_email: user.email,
      actor_role: user.role,
      action_timestamp: new Date().toISOString(),
      details: `Bulk import: ${results.filter(r => r.status === 'EVIDENCE_CREATED').length}/${rows.length} Evidence records created`,
      status: 'SUCCESS'
    });

    return Response.json({
      success: true,
      batch_id,
      total_rows: rows.length,
      evidence_created: results.filter(r => r.status === 'EVIDENCE_CREATED').length,
      errors: results.filter(r => r.status === 'ERROR').length,
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function parseCSVLine(line) {
  // RFC 4180 compliant CSV parser
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] || '').trim();
    });
    
    // Only include non-empty rows
    if (row.legal_name || row.company_name) {
      rows.push(row);
    }
  }

  return rows;
}