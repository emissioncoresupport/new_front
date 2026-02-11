// SupplyLens Unified Ingestion Orchestrator
// Single entry point for all ingestion paths (bulk, single, API)
// Deterministic rules engine with full audit trail and compliance gating

export const IngestionOrchestrator = {
  // Main orchestration pipeline
  async processSupplierData(base44, {
    supplier_data,
    source_path, // 'bulk_import' | 'single_upload' | 'api' | 'erp_sync'
    evidence_id,
    user_email,
    tenant_id,
    reason_for_upload
  }) {
    const auditLog = {
      initiated_at: new Date().toISOString(),
      initiated_by: user_email,
      source: source_path,
      tenant_id,
      evidence_id,
      stages: {}
    };

    try {
      // Stage 1: Schema Validation
      const validation = await this.validateSchema(supplier_data);
      auditLog.stages.schema_validation = {
        passed: validation.passed,
        score: validation.completeness_score,
        gaps: validation.missing_fields
      };
      if (!validation.passed && validation.completeness_score < 30) {
        throw new Error(`Data completeness too low: ${validation.completeness_score}%`);
      }

      // Stage 2: Dedup Check
      const dedupCheck = await this.checkDuplicates(base44, supplier_data, tenant_id);
      auditLog.stages.dedup_check = {
        duplicates_found: dedupCheck.matches.length > 0,
        matches: dedupCheck.matches.map(m => ({ id: m.id, score: m.match_score }))
      };

      // Stage 3: Framework Detection
      const frameworks = await this.detectFrameworks(supplier_data);
      auditLog.stages.framework_detection = {
        relevant_frameworks: frameworks.frameworks,
        reasoning: frameworks.reasoning
      };

      // Stage 4: Risk Screening
      const riskScreen = await this.screenRisks(base44, supplier_data);
      auditLog.stages.risk_screening = {
        overall_risk: riskScreen.overall_risk_level,
        flags: riskScreen.risk_checks.filter(r => !r.passed).map(r => r.name)
      };

      // Stage 5: Data Enrichment
      const enriched = await this.enrichSupplierData(base44, supplier_data);
      auditLog.stages.enrichment = {
        external_ids_found: Object.keys(enriched.external_ids || {}).length,
        certifications_found: enriched.certifications?.length || 0
      };

      // Stage 6: Mapping Preview (show conflicts before approval)
      const mappingPreview = await this.generateMappingPreview(base44, enriched, dedupCheck.matches);
      auditLog.stages.mapping_preview = {
        conflicts_detected: mappingPreview.conflicts.length > 0,
        auto_mappings: mappingPreview.auto_mappings.length,
        user_decisions_needed: mappingPreview.conflicts.length
      };

      // Return decision-grade output
      return {
        success: true,
        stage: 'preview_ready',
        pipeline_id: `ING-${Date.now()}`,
        supplier_data: enriched,
        validation: validation,
        dedup_matches: dedupCheck.matches,
        frameworks: frameworks.frameworks,
        risk_level: riskScreen.overall_risk_level,
        mapping_preview: mappingPreview,
        audit_log: auditLog,
        next_action: 'user_approval_required'
      };
    } catch (error) {
      auditLog.error = error.message;
      auditLog.failed_at_stage = Object.keys(auditLog.stages).pop();
      await this.logAuditTrail(base44, auditLog, tenant_id);
      throw error;
    }
  },

  // Stage 1: Deterministic schema validation
  async validateSchema(supplier_data) {
    const mandatory_global = [
      'legal_name',
      'country'
    ];

    const mandatory_frameworks = {
      cbam: ['country'],
      eudr: ['country', 'supplier_type'],
      pfas: ['supplier_type'],
      ppwr: [],
      csrd: [],
      eudamed: []
    };

    const all_fields = Object.keys(supplier_data);
    const missing_mandatory = mandatory_global.filter(f => !supplier_data[f]);
    
    const field_scores = {
      legal_name: supplier_data.legal_name ? 15 : 0,
      country: supplier_data.country ? 15 : 0,
      email: supplier_data.email ? 10 : 0,
      vat_number: supplier_data.vat_number ? 10 : 0,
      supplier_type: supplier_data.supplier_type ? 10 : 0,
      phone: supplier_data.phone ? 5 : 0,
      address: supplier_data.address ? 5 : 0,
      certifications: supplier_data.certifications?.length > 0 ? 10 : 0,
      website: supplier_data.website ? 5 : 0,
      manufacturing_countries: supplier_data.manufacturing_countries?.length > 0 ? 10 : 0
    };

    const completeness_score = Object.values(field_scores).reduce((a, b) => a + b, 0);

    return {
      passed: missing_mandatory.length === 0,
      completeness_score: Math.min(completeness_score, 100),
      missing_fields: missing_mandatory,
      field_scores
    };
  },

  // Stage 2: Fuzzy dedup check
  async checkDuplicates(base44, supplier_data, tenant_id) {
    // Fetch existing suppliers
    const existing = await base44.asServiceRole.entities.Supplier.filter({ company_id: tenant_id }, '', 100);
    
    const matches = [];
    const threshold = 0.75;

    for (const existing_supplier of existing) {
      const score = this.calculateMatchScore(supplier_data, existing_supplier);
      if (score >= threshold) {
        matches.push({
          id: existing_supplier.id,
          legal_name: existing_supplier.legal_name,
          match_score: score,
          matched_on: this.getMatchedFields(supplier_data, existing_supplier)
        });
      }
    }

    return {
      matches: matches.sort((a, b) => b.match_score - a.match_score),
      has_exact_match: matches.some(m => m.match_score === 1.0),
      has_strong_match: matches.some(m => m.match_score >= 0.9)
    };
  },

  // Stage 3: Framework detection
  async detectFrameworks(supplier_data) {
    const frameworks = [];
    const reasoning = {};

    // CBAM: EU countries + high-carbon sectors
    const eu_countries = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];
    if (supplier_data.country && eu_countries.includes(supplier_data.country)) {
      const cbam_sectors = ['cement', 'steel', 'fertilizer', 'chemical', 'aluminum', 'iron'];
      if (supplier_data.supplier_type && cbam_sectors.some(s => supplier_data.supplier_type.toLowerCase().includes(s))) {
        frameworks.push('cbam');
        reasoning.cbam = 'EU manufacturer in carbon-intensive sector';
      }
    }

    // EUDR: Deforestation commodities
    const eudr_commodities = ['cattle', 'cocoa', 'coffee', 'palm', 'soy', 'wood', 'timber', 'agricultural'];
    if (supplier_data.supplier_type && eudr_commodities.some(c => supplier_data.supplier_type.toLowerCase().includes(c))) {
      frameworks.push('eudr');
      reasoning.eudr = 'Deforestation-risk commodity detected';
    }

    // PFAS: Chemistry, textiles, fluoropolymers
    if (supplier_data.supplier_type && ['chemical', 'textile', 'fluoropolymer', 'coating'].some(s => supplier_data.supplier_type.toLowerCase().includes(s))) {
      frameworks.push('pfas');
      reasoning.pfas = 'PFAS-risk sector detected';
    }

    // PPWR: Packaging, batteries
    if (supplier_data.supplier_type && ['packaging', 'battery', 'automotive'].some(s => supplier_data.supplier_type.toLowerCase().includes(s))) {
      frameworks.push('ppwr');
      reasoning.ppwr = 'PPWR-relevant product detected';
    }

    // EUDAMED: Medical devices
    if (supplier_data.supplier_type && supplier_data.supplier_type.toLowerCase().includes('medical')) {
      frameworks.push('eudamed');
      reasoning.eudamed = 'Medical device sector detected';
    }

    // CSRD: All large companies
    frameworks.push('csrd');
    reasoning.csrd = 'CSRD applies to all large EU companies';

    return {
      frameworks: [...new Set(frameworks)],
      reasoning
    };
  },

  // Stage 4: Risk screening
  async screenRisks(base44, supplier_data) {
    const risk_checks = [];
    const critical_countries = ['KP', 'IR', 'SY'];

    // Sanctions check
    if (supplier_data.country && critical_countries.includes(supplier_data.country)) {
      risk_checks.push({ name: 'sanctions', passed: false, severity: 'critical' });
    } else {
      risk_checks.push({ name: 'sanctions', passed: true, severity: 'low' });
    }

    // Deforestation risk
    const high_deforestation = ['ID', 'MY', 'BR', 'CD'];
    if (supplier_data.manufacturing_countries && supplier_data.manufacturing_countries.some(c => high_deforestation.includes(c))) {
      risk_checks.push({ name: 'deforestation', passed: false, severity: 'high' });
    } else {
      risk_checks.push({ name: 'deforestation', passed: true, severity: 'low' });
    }

    // Conflict minerals
    const conflict_sectors = ['mining', 'mineral', 'cobalt', 'tungsten', 'tantalum'];
    if (supplier_data.supplier_type && conflict_sectors.some(s => supplier_data.supplier_type.toLowerCase().includes(s))) {
      risk_checks.push({ name: 'conflict_minerals', passed: false, severity: 'high' });
    } else {
      risk_checks.push({ name: 'conflict_minerals', passed: true, severity: 'low' });
    }

    const overall_risk = risk_checks.some(r => !r.passed && r.severity === 'critical') ? 'critical' :
                         risk_checks.some(r => !r.passed && r.severity === 'high') ? 'high' : 'low';

    return {
      risk_checks,
      overall_risk_level: overall_risk
    };
  },

  // Stage 5: Data enrichment
  async enrichSupplierData(base44, supplier_data) {
    const enriched = { ...supplier_data };

    // Auto-lookup external IDs, certifications, etc if needed
    enriched.external_ids = enriched.external_ids || {};
    enriched.data_completeness = 65; // TODO: calculate from validation
    
    return enriched;
  },

  // Stage 6: Mapping preview
  async generateMappingPreview(base44, supplier_data, dedup_matches) {
    const auto_mappings = [];
    const conflicts = [];

    // If strong dedup matches, flag as conflict
    if (dedup_matches.length > 0) {
      conflicts.push({
        type: 'duplicate_detected',
        severity: 'high',
        message: `Found ${dedup_matches.length} potential matches`,
        matches: dedup_matches.slice(0, 3)
      });
    }

    // Check for conflicting data
    if (supplier_data.vat_number && supplier_data.country) {
      auto_mappings.push({
        field: 'vat_number',
        confidence: 0.95,
        suggestion: `VAT ${supplier_data.vat_number} in ${supplier_data.country}`
      });
    }

    return {
      auto_mappings,
      conflicts,
      recommended_action: conflicts.length > 0 ? 'user_decision_required' : 'proceed_to_gate'
    };
  },

  // Utility: Calculate match score
  calculateMatchScore(supplier_data, existing_supplier) {
    let matches = 0;
    let total = 0;

    // Legal name match
    if (supplier_data.legal_name && existing_supplier.legal_name) {
      const name1 = supplier_data.legal_name.toLowerCase();
      const name2 = existing_supplier.legal_name.toLowerCase();
      if (name1 === name2) matches += 3;
      else if (name1.includes(name2) || name2.includes(name1)) matches += 2;
      else matches += 0;
      total += 3;
    }

    // Country match
    if (supplier_data.country && existing_supplier.country) {
      if (supplier_data.country === existing_supplier.country) matches += 1;
      total += 1;
    }

    // VAT match
    if (supplier_data.vat_number && existing_supplier.vat_number) {
      if (supplier_data.vat_number === existing_supplier.vat_number) matches += 1;
      total += 1;
    }

    return total > 0 ? matches / total : 0;
  },

  // Utility: Get matched fields
  getMatchedFields(supplier_data, existing_supplier) {
    const matched = [];
    if (supplier_data.legal_name === existing_supplier.legal_name) matched.push('legal_name');
    if (supplier_data.country === existing_supplier.country) matched.push('country');
    if (supplier_data.vat_number === existing_supplier.vat_number) matched.push('vat_number');
    return matched;
  },

  // Log audit trail
  async logAuditTrail(base44, auditLog, tenant_id) {
    try {
      await base44.asServiceRole.entities.AuditLogEntry.create({
        tenant_id,
        resource_type: 'Supplier',
        action: 'INGESTION_INITIATED',
        actor_email: auditLog.initiated_by,
        action_timestamp: auditLog.initiated_at,
        details: JSON.stringify(auditLog),
        status: auditLog.error ? 'FAILURE' : 'SUCCESS',
        error_message: auditLog.error
      });
    } catch (err) {
      console.error('Audit logging failed:', err.message);
    }
  }
};