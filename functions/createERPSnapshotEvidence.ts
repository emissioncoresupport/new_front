import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PHASE 2.2 - ERP SNAPSHOT INGESTION (ENABLED)
 * 
 * Creates point-in-time evidence snapshots from ERP data.
 * 
 * STRICT CONSTRAINTS:
 * - Snapshot mode only (no sync)
 * - No overwrites
 * - No auto-merge
 * - No auto-supplier creation
 * - Each row = Evidence record with hash
 * 
 * BEHAVIOR:
 * - Creates Evidence with state=RAW
 * - Stores snapshot timestamp
 * - Hashes each record for deduplication
 * - Tags with source_system
 * 
 * DOES NOT:
 * - Create Supplier records
 * - Update existing suppliers
 * - Activate compliance modules
 * - Merge with existing data
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      source_system, 
      snapshot_data, 
      declared_context 
    } = await req.json();

    if (!source_system || !snapshot_data || !Array.isArray(snapshot_data)) {
      return Response.json({ 
        error: 'Missing required fields: source_system, snapshot_data (array)' 
      }, { status: 400 });
    }

    if (snapshot_data.length === 0) {
      return Response.json({ 
        error: 'snapshot_data cannot be empty' 
      }, { status: 400 });
    }

    const snapshot_timestamp = new Date().toISOString();
    const evidenceRecords = [];
    const deduplicationHashes = new Set();

    // Check for duplicate hashes in this snapshot
    for (const record of snapshot_data) {
      // Generate deterministic hash for this record
      const recordString = JSON.stringify(record);
      const encoder = new TextEncoder();
      const data = encoder.encode(recordString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const declaration_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Check for duplicates within this snapshot
      if (deduplicationHashes.has(declaration_hash)) {
        console.warn(`Duplicate record detected in snapshot: ${declaration_hash}`);
        continue;
      }

      deduplicationHashes.add(declaration_hash);

      // Check if this exact declaration already exists
      const existing = await base44.asServiceRole.entities.Evidence.filter({
        declaration_hash_sha256: declaration_hash,
        tenant_id: user.email
      });

      if (existing.length > 0) {
        console.info(`Evidence already exists for hash ${declaration_hash}, skipping`);
        continue;
      }

      // Create Evidence record (DOES NOT CREATE SUPPLIER)
      const evidenceRecord = {
        tenant_id: user.email,
        evidence_id: `ERP_${source_system}_${Date.now()}_${crypto.randomUUID()}`,
        ingestion_path: 'erp_snapshot',
        declared_context: {
          entity_type: declared_context?.entity_type || 'supplier',
          intended_use: declared_context?.intended_use || 'general',
          source_role: 'system',
          reason: `ERP snapshot from ${source_system} at ${snapshot_timestamp}`
        },
        file_url: null, // No file for ERP snapshot
        file_hash_sha256: null,
        declaration_hash_sha256: declaration_hash,
        uploaded_at: snapshot_timestamp,
        actor_id: user.email,
        state: 'RAW',
        declared_entity_type: 'SUPPLIER',
        declared_evidence_type: 'ERP_SNAPSHOT',
        structured_payload: record, // Store ERP data as JSON
        source_system,
        immutable: true
      };

      evidenceRecords.push(evidenceRecord);
    }

    // Bulk create Evidence records
    if (evidenceRecords.length > 0) {
      await base44.asServiceRole.entities.Evidence.bulkCreate(evidenceRecords);
    }

    // Log to audit trail
    await base44.asServiceRole.entities.AuditLog.create({
      tenant_id: user.email,
      action: 'ERP_SNAPSHOT_INGESTION',
      entity_type: 'Evidence',
      actor_id: user.email,
      metadata: {
        source_system,
        snapshot_timestamp,
        records_submitted: snapshot_data.length,
        records_created: evidenceRecords.length,
        records_skipped_duplicate: snapshot_data.length - evidenceRecords.length
      },
      timestamp: new Date().toISOString()
    });

    return Response.json({
      success: true,
      snapshot_timestamp,
      source_system,
      records_submitted: snapshot_data.length,
      records_created: evidenceRecords.length,
      records_skipped_duplicate: snapshot_data.length - evidenceRecords.length,
      evidence_ids: evidenceRecords.map(e => e.evidence_id),
      next_action: 'Classify the new evidence records to enable downstream use',
      constraints_enforced: [
        'Snapshot mode only (no sync)',
        'No supplier auto-creation',
        'No overwrites',
        'No auto-merge',
        'Deduplication by hash'
      ]
    });

  } catch (error) {
    console.error('ERP snapshot ingestion error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});