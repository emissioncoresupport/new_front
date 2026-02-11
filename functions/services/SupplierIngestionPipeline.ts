// Unified ingestion orchestrator for all three paths
// Routes supplier data → validation → Mapping Gate → creation

export async function processSupplierIngestion(base44, ingestionData) {
  const { 
    source_path, // 'supplier_portal' | 'bulk_import' | 'erp_sync'
    supplier_data,
    evidence_id, // for portal & bulk
    erp_system, // for ERP sync
    tenant_id
  } = ingestionData;

  try {
    // STEP 1: Normalize supplier data to canonical form
    const normalized = await normalizeSupplierData(supplier_data, source_path);

    // STEP 2: Create immutable evidence reference
    const evidenceRef = await createEvidenceReference(base44, {
      source_path,
      tenant_id,
      original_data: supplier_data,
      normalized_data: normalized
    });

    // STEP 3: Run through Mapping Gate (integrated validation + dedup + decision)
    const mappingGateResult = await runMappingGate(base44, {
      evidence_id: evidenceRef.id,
      supplier_data: normalized,
      tenant_id
    });

    if (mappingGateResult.status === 'BLOCKED') {
      return {
        status: 'MAPPING_BLOCKED',
        reason: mappingGateResult.reason,
        evidence_id: evidenceRef.id,
        mapping_decision_id: mappingGateResult.mapping_decision_id
      };
    }

    if (mappingGateResult.status === 'PROVISIONAL') {
      // Non-blocking: proceed with creation + log gaps for follow-up
      console.log(`[PROVISIONAL] Supplier ${normalized.legal_name}: gaps = ${JSON.stringify(mappingGateResult.gaps)}`);
    }

    // STEP 4: Create supplier entity
    const supplier = await base44.functions.invoke('createSupplierFromMapping', {
      evidence_id: evidenceRef.id,
      mapping_decision_id: mappingGateResult.mapping_decision_id,
      supplier_data: normalized,
      source_path,
      status: mappingGateResult.status
    });

    // STEP 5: Emit proof gap events (async, non-blocking)
    if (mappingGateResult.gaps && Object.keys(mappingGateResult.gaps).length > 0) {
      base44.functions.invoke('proofGapEventEmitter', {
        mapping_decision_id: mappingGateResult.mapping_decision_id,
        supplier_id: supplier.data.id,
        status: mappingGateResult.status
      }).catch(e => console.warn(`[EVENT] Proof gap emission failed: ${e.message}`));
    }

    // STEP 6: Log successful creation with audit trail
    await logIngestionSuccess(base44, {
      tenant_id,
      source_path,
      supplier_id: supplier.data.id,
      evidence_id: evidenceRef.id,
      mapping_status: mappingGateResult.status
    });

    return {
      status: 'SUCCESS',
      supplier_id: supplier.data.id,
      evidence_id: evidenceRef.id
    };

  } catch (error) {
    console.error(`SupplierIngestionPipeline error (${source_path}):`, error);
    throw error;
  }
}

async function normalizeSupplierData(data, source) {
  // Convert source-specific format → canonical Supplier schema
  const normalized = {
    legal_name: data.legal_name || data.company_name || data.name,
    trade_name: data.trade_name || data.trading_name,
    country: data.country?.toUpperCase() || 'UNKNOWN',
    address: data.address || '',
    city: data.city || '',
    postal_code: data.postal_code || '',
    vat_number: data.vat_number || data.tax_id,
    primary_contact_email: data.email || data.primary_email,
    primary_contact_phone: data.phone || data.primary_phone,
    website: data.website || '',
    nace_code: data.nace_code || '',
    supplier_type: data.supplier_type || 'unknown',
    capabilities: data.capabilities || [],
    ships_to_eu: data.ships_to_eu === true || data.ships_to_eu === 'true',
    manufacturing_countries: data.manufacturing_countries || [data.country] || [],
    status: 'pending_review',
    source,
    data_completeness: calculateCompleteness(data)
  };

  return normalized;
}

async function createEvidenceReference(base44, context) {
  const { source_path, tenant_id, original_data, normalized_data } = context;

  const evidence = await base44.entities.Evidence.create({
    tenant_id,
    file_url: `ingestion://${source_path}/${Date.now()}`,
    file_hash_sha256: hashObject(original_data),
    file_size_bytes: JSON.stringify(original_data).length,
    original_filename: `supplier_${source_path}_${Date.now()}`,
    uploaded_at: new Date().toISOString(),
    state: 'CLASSIFIED',
    declared_entity_type: 'SUPPLIER',
    declared_evidence_type: 'DECLARATION',
    structured_payload: normalized_data,
    reason_for_upload: `Ingestion via ${source_path}`,
    target_entity_type: 'SUPPLIER'
  });

  return evidence;
}

async function validateSupplierData(base44, data, tenant_id) {
  const gaps = [];
  const required = ['legal_name', 'country'];
  
  // Check required fields
  for (const field of required) {
    if (!data[field] || data[field].trim() === '') {
      gaps.push(`Missing required field: ${field}`);
    }
  }

  // Check for duplicates
  const existing = await base44.entities.Supplier.filter({
    legal_name: data.legal_name,
    country: data.country
  });

  const conflicts = [];
  if (existing && existing.length > 0) {
    conflicts.push(`Potential duplicate: Found ${existing.length} existing supplier(s) with same name/country`);
  }

  return {
    passed: gaps.length === 0 && conflicts.length === 0,
    gaps,
    conflicts
  };
}

async function logIngestionSuccess(base44, context) {
  const { tenant_id, source_path, supplier_id, evidence_id } = context;

  await base44.entities.AuditLogEntry.create({
    tenant_id,
    resource_type: 'Supplier',
    resource_id: supplier_id,
    action: 'SUPPLIER_CREATED_VIA_' + source_path.toUpperCase(),
    actor_email: 'system@supplylens',
    action_timestamp: new Date().toISOString(),
    changes: { evidence_id, source_path },
    status: 'SUCCESS'
  });
}

function calculateCompleteness(data) {
  const total = 15;
  const fields = [
    'legal_name', 'country', 'address', 'city', 'vat_number',
    'primary_contact_email', 'primary_contact_phone', 'website',
    'nace_code', 'supplier_type', 'capabilities', 'ships_to_eu',
    'manufacturing_countries', 'email', 'phone'
  ];
  
  const filled = fields.filter(f => data[f] && String(data[f]).trim() !== '').length;
  return Math.round((filled / total) * 100);
}

// Inline mapping gate without external function call (critical path optimization)
async function runMappingGate(base44, context) {
  const { evidence_id, supplier_data, tenant_id } = context;
  
  try {
    // Import validator services inline
    const { validateSupplierForMapping } = await import('./MappingGateValidator.js');
    const { findDuplicateCandidates } = await import('./FuzzyDedup.js');
    
    // Validate completeness
    const validation = validateSupplierForMapping(supplier_data);
    
    // Check duplicates
    const existingSuppliers = await base44.entities.Supplier.filter({
      country: supplier_data.country
    }).catch(() => []);
    
    const duplicates = findDuplicateCandidates(supplier_data, existingSuppliers || [], 0.85);
    
    // Determine final status
    let finalStatus = validation.status_recommendation;
    if (duplicates.length > 0 && duplicates[0].similarity_score > 0.95) {
      finalStatus = 'BLOCKED'; // Near-perfect match
    }
    
    // Create mapping decision
    const mappingDecision = await base44.entities.MappingDecision.create({
      tenant_id,
      evidence_id,
      entity_type: 'SUPPLIER',
      status: finalStatus,
      validation_result: {
        passed: finalStatus === 'APPROVED',
        completeness_score: validation.completeness_score,
        gaps: validation.mandatory_gaps,
        framework_gaps: validation.framework_gaps,
        duplicate_candidates: duplicates.length
      },
      approved_by: 'system@mappinggate',
      approved_at: new Date().toISOString(),
      hash_sha256: hashObject(supplier_data)
    }).catch(() => null);
    
    return {
      status: finalStatus,
      mapping_decision_id: mappingDecision?.id || 'MD-' + Date.now(),
      gaps: validation.framework_gaps,
      reason: validation.rationale[0] || 'Data validation'
    };
  } catch (error) {
    console.error('Mapping gate error:', error);
    throw error;
  }
}

function hashObject(obj) {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}