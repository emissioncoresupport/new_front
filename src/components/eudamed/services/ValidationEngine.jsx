import { base44 } from '@/api/base44Client';

/**
 * EUDAMED Deterministic Validation Engine
 * Enforces MDR/IVDR compliance rules before entities can reach "ready" state
 */

const VALIDATION_RULES = {
  // Actor Module Rules
  'ACTOR_REQ_LEGAL_NAME': {
    module: 'Actor',
    entityType: 'EconomicOperator',
    severity: 'critical',
    check: (entity) => !!entity.legal_name && entity.legal_name.length > 0,
    message: 'Legal name is required for actor registration',
    field: 'legal_name'
  },
  'ACTOR_REQ_COUNTRY': {
    module: 'Actor',
    entityType: 'EconomicOperator',
    severity: 'critical',
    check: (entity) => !!entity.country && entity.country.length === 2,
    message: 'Valid ISO 3166-1 alpha-2 country code required',
    field: 'country'
  },
  'ACTOR_REQ_CONTACT': {
    module: 'Actor',
    entityType: 'EconomicOperator',
    severity: 'major',
    check: (entity) => !!entity.primary_contact_email,
    message: 'Primary contact email required for EUDAMED communication',
    field: 'primary_contact_email'
  },
  
  // Device Family Rules
  'FAMILY_REQ_MANUFACTURER': {
    module: 'UDI_Device',
    entityType: 'DeviceFamily',
    severity: 'critical',
    check: (entity) => !!entity.manufacturer_id,
    message: 'Device family must have assigned manufacturer',
    field: 'manufacturer_id',
    suggestedFix: 'Assign manufacturer via OperatorRoleAssignment'
  },
  'FAMILY_REQ_RISK_CLASS': {
    module: 'UDI_Device',
    entityType: 'DeviceFamily',
    severity: 'critical',
    check: (entity) => !!entity.risk_class,
    message: 'Risk classification required per MDR Annex VIII',
    field: 'risk_class'
  },
  'FAMILY_REQ_INTENDED_PURPOSE': {
    module: 'UDI_Device',
    entityType: 'DeviceFamily',
    severity: 'critical',
    check: (entity) => !!entity.intended_purpose && entity.intended_purpose.length >= 20,
    message: 'Intended purpose must be detailed (min 20 characters)',
    field: 'intended_purpose'
  },
  'FAMILY_REQ_GMDN': {
    module: 'UDI_Device',
    entityType: 'DeviceFamily',
    severity: 'major',
    check: (entity) => !!entity.gmdn_code,
    message: 'GMDN code recommended for device nomenclature',
    field: 'gmdn_code'
  },
  
  // Device Model Rules
  'MODEL_REQ_FAMILY': {
    module: 'UDI_Device',
    entityType: 'DeviceModel',
    severity: 'critical',
    check: (entity, context) => !!entity.device_family_id && !!context.deviceFamily,
    message: 'Device model must belong to valid device family',
    field: 'device_family_id',
    suggestedFix: 'Create or link to DeviceFamily first'
  },
  'MODEL_REQ_UDI_DI': {
    module: 'UDI_Device',
    entityType: 'DeviceModel',
    severity: 'critical',
    check: (entity, context) => context.hasUdiDi,
    message: 'Device model must have at least one UDI-DI record',
    field: 'udi_di',
    suggestedFix: 'Create UdiDiRecord for this model'
  },
  'MODEL_REQ_COMMERCIAL_NAME': {
    module: 'UDI_Device',
    entityType: 'DeviceModel',
    severity: 'critical',
    check: (entity) => !!entity.commercial_name,
    message: 'Commercial name required for market identification',
    field: 'commercial_name'
  },
  
  // UDI-DI Rules
  'UDI_REQ_FORMAT': {
    module: 'UDI_Device',
    entityType: 'UdiDiRecord',
    severity: 'critical',
    check: (entity) => {
      // Basic format check - real implementation would validate per issuing entity
      return !!entity.udi_di && entity.udi_di.length >= 8;
    },
    message: 'UDI-DI must be valid format per issuing entity',
    field: 'udi_di'
  },
  'UDI_UNIQUE_PER_ISSUER': {
    module: 'UDI_Device',
    entityType: 'UdiDiRecord',
    severity: 'critical',
    check: async (entity, context) => {
      // Check uniqueness within tenant + issuing entity
      const duplicates = context.allUdiRecords?.filter(
        u => u.udi_di === entity.udi_di && 
             u.issuing_entity === entity.issuing_entity && 
             u.id !== entity.id
      ) || [];
      return duplicates.length === 0;
    },
    message: 'UDI-DI must be unique per issuing entity',
    field: 'udi_di'
  },
  
  // Certificate Rules
  'CERT_REQ_DATES': {
    module: 'Certificates',
    entityType: 'Certificate',
    severity: 'critical',
    check: (entity) => {
      if (!entity.issue_date || !entity.expiry_date) return false;
      return new Date(entity.issue_date) < new Date(entity.expiry_date);
    },
    message: 'Issue date must be before expiry date',
    field: 'issue_date'
  },
  'CERT_REQ_NB': {
    module: 'Certificates',
    entityType: 'Certificate',
    severity: 'critical',
    check: (entity, context) => !!entity.notified_body_id && !!context.notifiedBody,
    message: 'Certificate must link to valid Notified Body',
    field: 'notified_body_id',
    suggestedFix: 'Select notified body from NANDO registry'
  },
  
  // Surveillance Rules
  'SURV_REQ_AUTHORITY': {
    module: 'Market_Surveillance',
    entityType: 'SurveillanceCase',
    severity: 'critical',
    check: (entity) => !!entity.authority && !!entity.country,
    message: 'Surveillance case must identify competent authority',
    field: 'authority'
  }
};

/**
 * Run validation for a specific entity
 */
export async function validateEntity(entityType, entityId, module) {
  const startTime = Date.now();
  const issues = [];
  
  try {
    // Fetch entity
    let entity;
    switch (entityType) {
      case 'EconomicOperator':
        const operators = await base44.entities.EconomicOperator.list();
        entity = operators.find(e => e.id === entityId);
        break;
      case 'DeviceFamily':
        const families = await base44.entities.DeviceFamily.list();
        entity = families.find(e => e.id === entityId);
        break;
      case 'DeviceModel':
        const models = await base44.entities.DeviceModel.list();
        entity = models.find(e => e.id === entityId);
        break;
      case 'UdiDiRecord':
        const udis = await base44.entities.UdiDiRecord.list();
        entity = udis.find(e => e.id === entityId);
        break;
      case 'Certificate':
        const certs = await base44.entities.Certificate.list();
        entity = certs.find(e => e.id === entityId);
        break;
      case 'SurveillanceCase':
        const cases = await base44.entities.SurveillanceCase.list();
        entity = cases.find(e => e.id === entityId);
        break;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
    
    if (!entity) {
      throw new Error(`Entity not found: ${entityType}/${entityId}`);
    }
    
    // Build context for relational checks
    const context = await buildValidationContext(entity, entityType);
    
    // Run applicable rules
    const applicableRules = Object.entries(VALIDATION_RULES).filter(
      ([_, rule]) => rule.entityType === entityType && rule.module === module
    );
    
    for (const [ruleId, rule] of applicableRules) {
      const passed = await Promise.resolve(rule.check(entity, context));
      
      if (!passed) {
        issues.push({
          rule_id: ruleId,
          severity: rule.severity,
          field_path: rule.field,
          message: rule.message,
          suggested_fix: rule.suggestedFix || null,
          evidence_links: []
        });
      }
    }
    
    // Determine outcome
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const warningCount = issues.filter(i => i.severity === 'minor' || i.severity === 'info').length;
    const outcome = criticalCount > 0 ? 'fail' : warningCount > 0 ? 'warning' : 'pass';
    
    // Create ValidationRun
    const user = await base44.auth.me();
    const validationRun = await base44.entities.ValidationRun.create({
      tenant_id: entity.tenant_id,
      entity_type: entityType,
      entity_id: entityId,
      module: module,
      executed_at: new Date().toISOString(),
      executed_by: user?.email || 'system',
      outcome: outcome,
      issues_count: issues.length,
      critical_issues: criticalCount,
      warnings: warningCount,
      validation_duration_ms: Date.now() - startTime
    });
    
    // Create ValidationIssue records
    for (const issue of issues) {
      await base44.entities.ValidationIssue.create({
        tenant_id: entity.tenant_id,
        validation_run_id: validationRun.id,
        ...issue
      });
    }
    
    return {
      outcome,
      issues,
      validationRunId: validationRun.id,
      canPromote: outcome === 'pass' || outcome === 'warning'
    };
    
  } catch (error) {
    console.error('Validation failed:', error);
    throw error;
  }
}

/**
 * Build context for relational validation checks
 */
async function buildValidationContext(entity, entityType) {
  const context = {};
  
  if (entityType === 'DeviceModel') {
    // Fetch related family
    if (entity.device_family_id) {
      const families = await base44.entities.DeviceFamily.list();
      context.deviceFamily = families.find(f => f.id === entity.device_family_id);
    }
    
    // Check for UDI-DI records
    const udiRecords = await base44.entities.UdiDiRecord.filter({ device_model_id: entity.id });
    context.hasUdiDi = udiRecords.length > 0;
  }
  
  if (entityType === 'UdiDiRecord') {
    // Fetch all UDI records for uniqueness check
    const allUdiRecords = await base44.entities.UdiDiRecord.list();
    context.allUdiRecords = allUdiRecords;
  }
  
  if (entityType === 'Certificate') {
    // Fetch notified body
    if (entity.notified_body_id) {
      const nbs = await base44.entities.NotifiedBody.list();
      context.notifiedBody = nbs.find(nb => nb.id === entity.notified_body_id);
    }
  }
  
  return context;
}

/**
 * Promote entity to next state with validation gating
 */
export async function promoteEntityState(entityType, entityId, targetState) {
  // State transition rules
  const allowedTransitions = {
    'draft': ['validated'],
    'validated': ['ready', 'draft'],
    'ready': ['exported', 'validated'],
    'exported': ['archived']
  };
  
  // Fetch current entity
  let entity;
  const EntityClass = base44.entities[entityType];
  const allEntities = await EntityClass.list();
  entity = allEntities.find(e => e.id === entityId);
  
  if (!entity) throw new Error('Entity not found');
  
  const currentState = entity.status || 'draft';
  
  // Check if transition is allowed
  if (!allowedTransitions[currentState]?.includes(targetState)) {
    throw new Error(`Cannot transition from ${currentState} to ${targetState}`);
  }
  
  // Validation gating: only validated entities can become ready
  if (targetState === 'ready') {
    const moduleMap = {
      'EconomicOperator': 'Actor',
      'DeviceFamily': 'UDI_Device',
      'DeviceModel': 'UDI_Device',
      'UdiDiRecord': 'UDI_Device',
      'Certificate': 'Certificates',
      'SurveillanceCase': 'Market_Surveillance'
    };
    
    const module = moduleMap[entityType];
    const validationResult = await validateEntity(entityType, entityId, module);
    
    if (validationResult.outcome === 'fail') {
      throw new Error(`Cannot promote to ready: ${validationResult.issues.length} critical issues found`);
    }
  }
  
  // Update state
  await EntityClass.update(entityId, {
    status: targetState,
    last_validated_at: targetState === 'validated' || targetState === 'ready' ? new Date().toISOString() : entity.last_validated_at,
    exported_at: targetState === 'exported' ? new Date().toISOString() : entity.exported_at
  });
  
  // Log ledger event
  await logLedgerEvent(entityType, entityId, 'STATUS_CHANGE', {
    ...entity,
    status: targetState
  });
  
  return { success: true, newState: targetState };
}

/**
 * Auto-downgrade entity to validated if updated while in ready state
 */
export async function handleEntityUpdate(entityType, entityId, updates) {
  const EntityClass = base44.entities[entityType];
  const allEntities = await EntityClass.list();
  const entity = allEntities.find(e => e.id === entityId);
  
  if (!entity) throw new Error('Entity not found');
  
  // If entity is "ready" and being updated, downgrade to validated
  if (entity.status === 'ready') {
    updates.status = 'validated';
    updates.last_validated_at = null; // Force re-validation
  }
  
  await EntityClass.update(entityId, updates);
  
  // Log ledger event
  await logLedgerEvent(entityType, entityId, 'UPDATE', { ...entity, ...updates });
}

/**
 * Hash chain implementation for tamper-evident audit trail
 */
async function logLedgerEvent(entityType, entityId, eventType, entitySnapshot) {
  const user = await base44.auth.me();
  
  // Fetch previous event for this entity
  const allEvents = await base44.entities.LedgerEvent.list();
  const entityEvents = allEvents
    .filter(e => e.entity_type === entityType && e.entity_id === entityId)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  
  const prevEvent = entityEvents[0];
  
  // Canonicalize payload (deterministic JSON serialization)
  const canonicalPayload = canonicalizeJSON(entitySnapshot);
  
  // Calculate prev_hash
  let prevHash;
  if (prevEvent) {
    prevHash = prevEvent.event_hash;
  } else {
    // Genesis hash
    prevHash = await hashString(`GENESIS:${entitySnapshot.tenant_id}:${entityId}`);
  }
  
  // Calculate event_hash
  const eventHash = await hashString(JSON.stringify(canonicalPayload) + prevHash);
  
  // Create ledger event
  await base44.entities.LedgerEvent.create({
    tenant_id: entitySnapshot.tenant_id,
    entity_type: entityType,
    entity_id: entityId,
    event_type: eventType,
    canonical_payload_json: canonicalPayload,
    prev_hash: prevHash,
    event_hash: eventHash,
    created_by: user?.email || 'system'
  });
  
  return eventHash;
}

/**
 * Deterministic JSON canonicalization
 */
function canonicalizeJSON(obj) {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(canonicalizeJSON);
  }
  
  // Sort keys alphabetically
  const sorted = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = canonicalizeJSON(obj[key]);
  });
  
  return sorted;
}

/**
 * SHA-256 hash implementation (browser-compatible)
 */
async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify hash chain integrity
 */
export async function verifyLedgerIntegrity(entityType, entityId) {
  const allEvents = await base44.entities.LedgerEvent.list();
  const events = allEvents
    .filter(e => e.entity_type === entityType && e.entity_id === entityId)
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  
  const issues = [];
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    
    // Recalculate expected hash
    const expectedHash = await hashString(
      JSON.stringify(event.canonical_payload_json) + event.prev_hash
    );
    
    if (expectedHash !== event.event_hash) {
      issues.push({
        eventId: event.id,
        message: 'Hash mismatch - possible tampering detected',
        expected: expectedHash,
        actual: event.event_hash
      });
    }
    
    // Check chain linkage
    if (i > 0) {
      const prevEvent = events[i - 1];
      if (event.prev_hash !== prevEvent.event_hash) {
        issues.push({
          eventId: event.id,
          message: 'Chain break - prev_hash does not match previous event_hash'
        });
      }
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
    eventsChecked: events.length
  };
}

export default {
  validateEntity,
  promoteEntityState,
  handleEntityUpdate,
  verifyLedgerIntegrity,
  VALIDATION_RULES
};