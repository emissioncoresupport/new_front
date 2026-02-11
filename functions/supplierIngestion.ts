import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * UNIFIED INGESTION ENDPOINT
 * All data paths (Portal, Bulk, ERP) → Normalize → MappingGate → Create
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (req.method !== 'POST') {
      return Response.json({ error: 'POST only' }, { status: 405 });
    }

    const { source_path, supplier_data, tenant_id } = await req.json();

    // Validate input
    if (!source_path || !supplier_data || !tenant_id) {
      return Response.json({
        status: 'ERROR',
        message: 'Missing source_path, supplier_data, or tenant_id'
      }, { status: 400 });
    }

    if (!['supplier_portal', 'bulk_import', 'erp_sync'].includes(source_path)) {
      return Response.json({
        status: 'ERROR',
        message: 'Invalid source_path'
      }, { status: 400 });
    }

    // STEP 1: Normalize
    const normalized = normalizeSupplierData(supplier_data, source_path);

    // STEP 2: Create immutable evidence reference
    const evidence = await base44.entities.Evidence.create({
      tenant_id,
      file_url: `ingestion://${source_path}/${Date.now()}`,
      file_hash_sha256: simpleHash(normalized),
      file_size_bytes: JSON.stringify(normalized).length,
      original_filename: `supplier_${source_path}_${Date.now()}`,
      uploaded_at: new Date().toISOString(),
      state: 'CLASSIFIED',
      declared_entity_type: 'SUPPLIER',
      declared_evidence_type: 'DECLARATION',
      structured_payload: normalized,
      reason_for_upload: `Ingestion via ${source_path}`,
      target_entity_type: 'SUPPLIER'
    });

    // STEP 3: Run Mapping Gate (inline validation + dedup + decision)
    const gateResult = await runMappingGate(base44, {
      evidence_id: evidence.id,
      supplier_data: normalized,
      tenant_id
    });

    if (gateResult.status === 'BLOCKED') {
      // Log and return
      await base44.entities.AuditLogEntry.create({
        tenant_id,
        resource_type: 'MappingDecision',
        resource_id: gateResult.mapping_decision_id,
        action: 'MAPPING_BLOCKED',
        actor_email: user.email,
        actor_role: user.role,
        action_timestamp: new Date().toISOString(),
        status: 'SUCCESS',
        details: `Blocked: ${gateResult.reason}`
      }).catch(() => null);

      return Response.json({
        status: 'BLOCKED',
        reason: gateResult.reason,
        evidence_id: evidence.id,
        mapping_decision_id: gateResult.mapping_decision_id
      }, { status: 400 });
    }

    // STEP 4: Create supplier entity
    const supplier = await base44.entities.Supplier.create({
      ...normalized,
      status: gateResult.status === 'PROVISIONAL' ? 'pending_review' : 'active',
      validation_status: 'verified',
      data_completeness: calculateCompleteness(normalized)
    });

    // STEP 5: Update mapping decision with supplier reference
    await base44.entities.MappingDecision.update(gateResult.mapping_decision_id, {
      entity_id: supplier.id
    }).catch(() => null);

    // STEP 6: Emit proof gap events (async, non-blocking)
    if (gateResult.gaps && Object.keys(gateResult.gaps).length > 0) {
      base44.asServiceRole.functions.invoke('proofGapEventEmitter', {
        mapping_decision_id: gateResult.mapping_decision_id,
        supplier_id: supplier.id,
        gaps: gateResult.gaps,
        status: gateResult.status
      }).catch(e => console.warn(`Proof gap event failed: ${e.message}`));
    }

    // STEP 7: Audit log
    await base44.entities.AuditLogEntry.create({
      tenant_id,
      resource_type: 'Supplier',
      resource_id: supplier.id,
      action: 'SUPPLIER_CREATED_VIA_' + source_path.toUpperCase(),
      actor_email: user.email,
      actor_role: user.role,
      action_timestamp: new Date().toISOString(),
      changes: {
        evidence_id: evidence.id,
        mapping_status: gateResult.status,
        source_path
      },
      status: 'SUCCESS',
      details: `Created via ${source_path}`
    }).catch(() => null);

    return Response.json({
      status: 'SUCCESS',
      supplier_id: supplier.id,
      evidence_id: evidence.id,
      mapping_decision_id: gateResult.mapping_decision_id,
      completeness: calculateCompleteness(normalized),
      gate_status: gateResult.status
    });
  } catch (error) {
    console.error('Ingestion error:', error);
    return Response.json({
      status: 'ERROR',
      message: error.message
    }, { status: 500 });
  }
});

function normalizeSupplierData(data, source) {
  return {
    legal_name: data.legal_name || data.company_name || data.name || '',
    trade_name: data.trade_name || data.trading_name || '',
    country: (data.country || '').toUpperCase(),
    city: data.city || '',
    address: data.address || '',
    postal_code: data.postal_code || '',
    vat_number: data.vat_number || data.tax_id || '',
    eori_number: data.eori_number || '',
    chamber_id: data.chamber_id || '',
    primary_contact_email: data.email || data.primary_email || '',
    primary_contact_phone: data.phone || data.primary_phone || '',
    website: data.website || '',
    nace_code: data.nace_code || '',
    supplier_type: data.supplier_type || 'unknown',
    capabilities: data.capabilities || [],
    ships_to_eu: data.ships_to_eu === true || data.ships_to_eu === 'true',
    manufacturing_countries: data.manufacturing_countries || [data.country] || [],
    source: source
  };
}

async function runMappingGate(base44, context) {
  const { evidence_id, supplier_data, tenant_id } = context;

  try {
    // Validate required fields
    const gaps = [];
    if (!supplier_data.legal_name || supplier_data.legal_name.trim() === '') {
      gaps.push('legal_name');
    }
    if (!supplier_data.country || supplier_data.country.trim() === '') {
      gaps.push('country');
    }

    // Check duplicates via fuzzy match
    let duplicates = [];
    try {
      const existing = await base44.entities.Supplier.filter({
        country: supplier_data.country
      });

      duplicates = (existing || [])
        .map(e => ({
          id: e.id,
          name: e.legal_name,
          similarity: calculateSimilarity(supplier_data.legal_name, e.legal_name),
          vat_match: supplier_data.vat_number && e.vat_number === supplier_data.vat_number
        }))
        .filter(d => d.similarity > 0.85)
        .sort((a, b) => b.similarity - a.similarity);
    } catch (e) {
      console.warn('Duplicate check failed:', e.message);
    }

    // Determine status
    let finalStatus = 'APPROVED';
    if (gaps.length > 1) finalStatus = 'PROVISIONAL';
    if (duplicates.length > 0 && duplicates[0].similarity > 0.95 && duplicates[0].vat_match) {
      finalStatus = 'BLOCKED';
    }

    // Create mapping decision
    const mappingDecision = await base44.entities.MappingDecision.create({
      tenant_id,
      evidence_id,
      entity_type: 'SUPPLIER',
      status: finalStatus,
      validation_result: {
        passed: finalStatus === 'APPROVED',
        gaps: gaps,
        duplicate_count: duplicates.length,
        highest_match: duplicates.length > 0 ? duplicates[0].similarity : 0
      },
      approved_by: 'system@ingestion',
      approved_at: new Date().toISOString(),
      hash_sha256: simpleHash(supplier_data)
    });

    return {
      status: finalStatus,
      mapping_decision_id: mappingDecision.id,
      gaps: { required: gaps, duplicates: duplicates.length },
      reason: finalStatus === 'BLOCKED' ? `Likely duplicate: ${duplicates[0]?.name} (${(duplicates[0]?.similarity * 100).toFixed(1)}% match)` : gaps.length > 0 ? 'Incomplete data (will be flagged for follow-up)' : 'Valid'
    };
  } catch (error) {
    console.error('Mapping gate error:', error);
    throw error;
  }
}

function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1;

  const editDistance = getLevenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function getLevenshteinDistance(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function calculateCompleteness(data) {
  const fields = [
    'legal_name', 'country', 'city', 'vat_number',
    'primary_contact_email', 'primary_contact_phone', 'website',
    'nace_code', 'supplier_type'
  ];
  const filled = fields.filter(f => data[f] && String(data[f]).trim() !== '').length;
  return Math.round((filled / fields.length) * 100);
}

function simpleHash(obj) {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}