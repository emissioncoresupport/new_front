import { base44 } from '@/api/base44Client';

// ========================================
// Internal Audit Buffer - Zero UX Impact
// ========================================
window.__EC_AUDIT__ = window.__EC_AUDIT__ || { calls: [] };

const recordAuditCall = (call_name, mode, draft_id, correlation_id, success, error_code = null) => {
  const event = {
    ts: new Date().toISOString(),
    call_name,
    mode,
    draft_id: draft_id || null,
    correlation_id: correlation_id || null,
    success,
    error_code
  };
  window.__EC_AUDIT__.calls.push(event);
  // Keep only last 50
  if (window.__EC_AUDIT__.calls.length > 50) {
    window.__EC_AUDIT__.calls.shift();
  }
};

export const getAuditCalls = () => window.__EC_AUDIT__.calls;

/**
 * Mock Evidence API Adapter
 * Simulates backend with deterministic delays and state
 */
export class MockEvidenceApiAdapter {
  constructor(mockSealedRefs, setMockSealedRefs) {
    this.mode = 'mock';
    this.mockSealedRefs = mockSealedRefs;
    this.setMockSealedRefs = setMockSealedRefs;
    this.draftStore = new Map(); // Internal draft state store
    this.entityStore = new Map(); // Unified entity store (Supplier, SKU, etc)
    
    // Initialize with seed data
    this._initializeSeedData();
  }
  
  _initializeSeedData() {
    // Seed suppliers
    const seedSuppliers = [
      { id: 'supp_hp_nl', name: 'HP BV', legal_name: 'HP BV', country_code: 'NL', email: 'supply@hp.com' },
      { id: 'supp_apple_ie', name: 'Apple Cork', legal_name: 'Apple Cork', country_code: 'IE', email: 'procurement@apple.com' },
      { id: 'supp_dell_de', name: 'Dell Deutschland', legal_name: 'Dell Deutschland', country_code: 'DE', email: 'sales@dell.de' }
    ];
    
    seedSuppliers.forEach(s => this.entityStore.set(`Supplier:${s.id}`, s));
  }

  async createDraft(payload) {
    await new Promise(resolve => setTimeout(resolve, 800));
    const mockDraftId = `draft_${Date.now()}`;
    const mockCorrelationId = `corr_${crypto.randomUUID()}`;
    
    // Store draft snapshot in internal store
    this.draftStore.set(mockDraftId, {
      draft_id: mockDraftId,
      correlation_id: mockCorrelationId,
      status: 'DRAFT',
      ...payload,
      created_at: new Date().toISOString()
    });
    
    recordAuditCall('createDraft', 'mock', mockDraftId, mockCorrelationId, true);
    
    return { 
      draft_id: mockDraftId, 
      correlation_id: mockCorrelationId, 
      status: 'DRAFT' 
    };
  }

  async updateDraft(draftId, payload) {
    await new Promise(resolve => setTimeout(resolve, 600));
    const mockCorrelationId = `corr_${crypto.randomUUID()}`;
    
    // Simulate duplicate external_ref_id detection
    if (payload.external_reference_id && this.mockSealedRefs.has(payload.external_reference_id)) {
      recordAuditCall('updateDraft', 'mock', draftId, mockCorrelationId, false, 'DUPLICATE_EXTERNAL_REF');
      throw new Error(`Duplicate external_ref_id: ${payload.external_reference_id} already exists in sealed evidence`);
    }
    
    // Update draft snapshot in internal store
    const existing = this.draftStore.get(draftId) || {};
    this.draftStore.set(draftId, {
      ...existing,
      ...payload,
      draft_id: draftId,
      correlation_id: mockCorrelationId,
      status: 'READY_TO_SEAL',
      updated_at: new Date().toISOString()
    });
    
    recordAuditCall('updateDraft', 'mock', draftId, mockCorrelationId, true);
    
    return { 
      draft_id: draftId, 
      correlation_id: mockCorrelationId, 
      status: 'READY_TO_SEAL' 
    };
  }

  async uploadAttachment(draftId, file, metadata) {
    await new Promise(resolve => setTimeout(resolve, 1200));
    const mockFileUrl = `https://mock-storage.example.com/evidence/${draftId}/${Date.now()}_${file.name}`;
    const mockCorrelationId = `corr_${crypto.randomUUID()}`;
    
    recordAuditCall('uploadAttachment', 'mock', draftId, mockCorrelationId, true);
    
    return { 
      file_url: mockFileUrl, 
      file_name: file.name,
      file_size: file.size,
      correlation_id: mockCorrelationId,
      attachment_id: `attach_${Date.now()}`
    };
  }

  async sealDraft(draftId, externalRefId) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const mockCorrelationId = `corr_${crypto.randomUUID()}`;
    
    // Add to sealed refs to simulate backend state
    if (externalRefId && this.setMockSealedRefs) {
      this.setMockSealedRefs(prev => new Set([...prev, externalRefId]));
    }
    
    recordAuditCall('sealDraft', 'mock', draftId, mockCorrelationId, true);
    
    return { 
      record_id: `rec_${Date.now()}`, 
      correlation_id: mockCorrelationId, 
      status: 'SEALED',
      sealed_at_utc: new Date().toISOString(),
      payload_sha256: 'MOCK',
      file_sha256: 'MOCK'
    };
  }

  async getMethodContractRegistry({ method, evidence_type }) {
    await new Promise(resolve => setTimeout(resolve, 400));
    const mockCorrelationId = `corr_${crypto.randomUUID()}`;
    
    try {
      // Try calling the real backend function if it exists
      const response = await base44.functions.invoke('getMethodContractRegistry', {
        method,
        evidence_type
      });
      
      recordAuditCall('getMethodContractRegistry', 'mock', null, mockCorrelationId, true);
      
      return {
        correlation_id: mockCorrelationId,
        registry: response.data
      };
    } catch (err) {
      recordAuditCall('getMethodContractRegistry', 'mock', null, mockCorrelationId, true);
      
      // If function doesn't exist, return mock success anyway
      return {
        correlation_id: mockCorrelationId,
        registry: {
          valid: true,
          method_compatible: true,
          evidence_type_compatible: true
        }
      };
    }
  }

  async listEntities({ entity_type, limit = 100, search = null }) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const mockCorrelationId = `corr_${crypto.randomUUID()}`;
    
    try {
      // Fetch from Base44 entities if available
      let items = [];
      if (entity_type === 'Supplier') {
        items = await base44.entities.Supplier.list();
      } else if (entity_type === 'SKU') {
        items = await base44.entities.SKU.list();
      }
      
      recordAuditCall('listEntities', 'mock', null, mockCorrelationId, true);
      
      return {
        correlation_id: mockCorrelationId,
        items: items || []
      };
    } catch (err) {
      recordAuditCall('listEntities', 'mock', null, mockCorrelationId, false, err.message);
      
      // If entities unavailable, return empty array
      return {
        correlation_id: mockCorrelationId,
        items: []
      };
    }
  }

  async getDraftSnapshot(draftId) {
    await new Promise(resolve => setTimeout(resolve, 400));
    const mockCorrelationId = `corr_${crypto.randomUUID()}`;
    
    // Retrieve from internal draft store (NO backend call)
    const snapshot = this.draftStore.get(draftId);
    
    if (!snapshot) {
      recordAuditCall('getDraftSnapshot', 'mock', draftId, mockCorrelationId, false, 'DRAFT_NOT_FOUND');
      throw new Error(`Draft ${draftId} not found in mock store`);
    }
    
    recordAuditCall('getDraftSnapshot', 'mock', draftId, mockCorrelationId, true);
    
    // Return last persisted draft state from store
    return {
      correlation_id: mockCorrelationId,
      draft_id: draftId,
      snapshot
    };
  }

  async getEntity({ entity_type, entity_id }) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const mockCorrelationId = `corr_${crypto.randomUUID()}`;
    
    try {
      let entity = null;
      if (entity_type === 'Supplier') {
        entity = await base44.entities.Supplier.read(entity_id);
      } else if (entity_type === 'SKU') {
        entity = await base44.entities.SKU.read(entity_id);
      } else if (entity_type === 'Product') {
        entity = await base44.entities.Product.read(entity_id);
      } else if (entity_type === 'LegalEntity') {
        entity = await base44.entities.LegalEntity.read(entity_id);
      }
      
      recordAuditCall('getEntity', 'mock', null, mockCorrelationId, true);
      
      return {
        correlation_id: mockCorrelationId,
        entity: entity || null,
        found: !!entity
      };
    } catch (err) {
      recordAuditCall('getEntity', 'mock', null, mockCorrelationId, false, err.message);
      return {
        correlation_id: mockCorrelationId,
        entity: null,
        found: false,
        error: err.message
      };
    }
  }

  async createEntity({ entity_type, payload }) {
    await new Promise(resolve => setTimeout(resolve, 600));
    const mockCorrelationId = `corr_${crypto.randomUUID()}`;
    
    recordAuditCall('createEntity', 'mock', null, mockCorrelationId, true);
    
    // Create local mock entity
    const mockId = `${entity_type.toLowerCase()}_${Date.now()}`;
    const mockEntity = {
      id: mockId,
      ...payload,
      created_at: new Date().toISOString()
    };
    
    // Store in unified entity store with type prefix
    this.entityStore.set(`${entity_type}:${mockId}`, mockEntity);
    
    return {
      correlation_id: mockCorrelationId,
      entity_id: mockId,
      entity: mockEntity,
      label: payload.name || payload.legal_name || mockId
    };
  }
  
  // ===== UNIFIED ENTITIES INTERFACE =====
  get entities() {
    return {
      Supplier: {
        search: (query) => this.searchSuppliers(query),
        list: () => this.listSuppliers(),
        create: (payload) => this.createSupplier(payload),
        read: (id) => this.getSupplierById(id)
      },
      SKU: {
        search: (query) => this.searchSKUs(query),
        list: () => this.listSKUs(),
        create: (payload) => this.createSKU(payload),
        read: (id) => this.getSKUById(id)
      }
    };
  }
  
  async listSuppliers() {
    await new Promise(resolve => setTimeout(resolve, 200));
    const suppliers = [];
    for (const [key, value] of this.entityStore.entries()) {
      if (key.startsWith('Supplier:')) {
        suppliers.push(value);
      }
    }
    return suppliers;
  }
  
  async listSKUs() {
    await new Promise(resolve => setTimeout(resolve, 200));
    const skus = [];
    for (const [key, value] of this.entityStore.entries()) {
      if (key.startsWith('SKU:')) {
        skus.push(value);
      }
    }
    return skus;
  }
  
  async searchSKUs(query) {
    const lowerQuery = (query || '').toLowerCase();
    const allSKUs = await this.listSKUs();
    
    if (lowerQuery.length === 0) return allSKUs;
    
    return allSKUs.filter(s => 
      (s.name || '').toLowerCase().includes(lowerQuery) ||
      (s.sku_code || '').toLowerCase().includes(lowerQuery)
    );
  }
  
  async getSKUById(id) {
    await new Promise(resolve => setTimeout(resolve, 150));
    return this.entityStore.get(`SKU:${id}`) || null;
  }
  
  async createSKU(payload) {
    await new Promise(resolve => setTimeout(resolve, 400));
    const skuId = `sku_${Date.now()}`;
    const newSKU = {
      id: skuId,
      ...payload,
      created_at: new Date().toISOString()
    };
    
    this.entityStore.set(`SKU:${skuId}`, newSKU);
    return newSKU;
  }

  // ===== NEW SUPPLIER METHODS =====
  
  async searchSuppliers(query) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const lowerQuery = (query || '').toLowerCase();
    const allSuppliers = await this.listSuppliers();
    
    if (lowerQuery.length === 0) return allSuppliers;
    
    return allSuppliers.filter(s => 
      (s.name || '').toLowerCase().includes(lowerQuery) ||
      (s.legal_name || '').toLowerCase().includes(lowerQuery)
    );
  }

  async getSupplierById(id) {
    await new Promise(resolve => setTimeout(resolve, 150));
    return this.entityStore.get(`Supplier:${id}`) || null;
  }

  async createSupplier(payload) {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Validate required fields
    if (!payload.name && !payload.legal_name) {
      throw new Error('Supplier name is required');
    }
    if (!payload.country_code && !payload.country) {
      throw new Error('Country code is required');
    }
    
    const supplierName = payload.name || payload.legal_name;
    const countryCode = payload.country_code || payload.country;
    
    // Deterministic ID based on name + country
    const deterministic = `${supplierName}${countryCode}`;
    const hash = String(deterministic).split('').reduce((acc, c) => {
      acc = ((acc << 5) - acc) + c.charCodeAt(0);
      return acc & acc; // Convert to 32bit integer
    }, 0);
    
    const suppId = `supp_${Math.abs(hash % 1000000)}_${countryCode.toLowerCase()}`;
    
    const newSupplier = {
      id: suppId,
      name: supplierName,
      legal_name: supplierName,
      country_code: countryCode,
      email: payload.email || null,
      created_at: new Date().toISOString()
    };
    
    this.entityStore.set(`Supplier:${suppId}`, newSupplier);
    
    console.log('[MockAdapter] Created supplier:', newSupplier);
    return newSupplier;
  }
}

/**
 * Real Evidence API Adapter
 * Routes to actual backend functions
 */
export class RealEvidenceApiAdapter {
  constructor() {
    this.mode = 'real';
  }
  
  // ===== UNIFIED ENTITIES INTERFACE =====
  get entities() {
    return {
      Supplier: {
        search: (query) => this.searchSuppliers(query),
        list: () => this.listSuppliers(),
        create: (payload) => this.createSupplier(payload),
        read: (id) => this.getSupplierById(id)
      },
      SKU: {
        search: (query) => this.searchSKUs(query),
        list: () => this.listSKUs(),
        create: (payload) => this.createSKU(payload),
        read: (id) => this.getSKUById(id)
      }
    };
  }
  
  async listSuppliers() {
    return base44.entities.Supplier.list();
  }
  
  async listSKUs() {
    return base44.entities.SKU.list();
  }
  
  async searchSKUs(query) {
    const allSKUs = await this.listSKUs();
    const lowerQuery = (query || '').toLowerCase();
    
    if (lowerQuery.length === 0) return allSKUs;
    
    return allSKUs.filter(s => 
      (s.name || '').toLowerCase().includes(lowerQuery) ||
      (s.sku_code || '').toLowerCase().includes(lowerQuery)
    );
  }
  
  async getSKUById(id) {
    return base44.entities.SKU.read(id);
  }
  
  async createSKU(payload) {
    const user = await base44.auth.me();
    const tenant_id = user.email.split('@')[0];
    
    return base44.entities.SKU.create({
      tenant_id,
      ...payload
    });
  }
  
  async createDraft(payload) {
    try {
      const response = await base44.functions.invoke('upsertEvidenceDraft', {
        ...payload
      });
      const data = response.data;
      recordAuditCall('createDraft', 'real', data.draft_id, data.correlation_id, true);
      return data;
    } catch (err) {
      recordAuditCall('createDraft', 'real', null, null, false, err.message);
      throw err;
    }
  }

  async updateDraft(draftId, payload) {
    try {
      const response = await base44.functions.invoke('upsertEvidenceDraft', {
        draft_id: draftId,
        ...payload
      });
      const data = response.data;
      recordAuditCall('updateDraft', 'real', draftId, data.correlation_id, true);
      return data;
    } catch (err) {
      recordAuditCall('updateDraft', 'real', draftId, null, false, err.message);
      throw err;
    }
  }

  async uploadAttachment(draftId, file, metadata) {
    const corrId = `corr_${crypto.randomUUID()}`;
    
    recordAuditCall('uploadAttachment', 'real', draftId, corrId, false, 'NOT_CONFIGURED');
    
    // Real file upload endpoint not yet configured
    throw new Error(JSON.stringify({
      error: "NOT_CONFIGURED",
      correlation_id: corrId,
      message: "Real file upload endpoint not configured. Use Mock mode or contact support.",
      call: "uploadAttachment"
    }));
  }

  async sealDraft(draftId, correlationId) {
    try {
      const response = await base44.functions.invoke('sealEvidenceDraft', {
        draft_id: draftId,
        correlation_id: correlationId
      });
      const data = response.data;
      recordAuditCall('sealDraft', 'real', draftId, data.correlation_id, true);
      return data;
    } catch (err) {
      recordAuditCall('sealDraft', 'real', draftId, correlationId, false, err.message);
      throw err;
    }
  }

  async getMethodContractRegistry({ method, evidence_type }) {
    const corrId = `corr_${crypto.randomUUID()}`;
    
    recordAuditCall('getMethodContractRegistry', 'real', null, corrId, false, 'NOT_CONFIGURED');
    
    // Real endpoint not yet configured
    return {
      error: "NOT_CONFIGURED",
      correlation_id: corrId,
      message: "Real registry endpoint not configured. Use Mock mode for registry validation."
    };
  }

  async listEntities({ entity_type, limit = 100, search = null }) {
    const corrId = `corr_${crypto.randomUUID()}`;
    
    recordAuditCall('listEntities', 'real', null, corrId, false, 'NOT_CONFIGURED');
    
    // Real endpoint not yet configured
    return {
      error: "NOT_CONFIGURED",
      correlation_id: corrId,
      message: "Real entity list endpoint not configured. Use Mock mode.",
      items: []
    };
  }

  async getDraftSnapshot(draftId) {
    try {
      const response = await base44.functions.invoke('getDraftSnapshot', {
        draft_id: draftId
      });
      const data = response.data;
      recordAuditCall('getDraftSnapshot', 'real', draftId, data.correlation_id, true);
      return data;
    } catch (err) {
      recordAuditCall('getDraftSnapshot', 'real', draftId, null, false, err.message);
      throw err;
    }
  }

  async getEntity({ entity_type, entity_id }) {
    try {
      let entity = null;
      if (entity_type === 'Supplier') {
        entity = await base44.entities.Supplier.read(entity_id);
      } else if (entity_type === 'SKU') {
        entity = await base44.entities.SKU.read(entity_id);
      } else if (entity_type === 'Product') {
        entity = await base44.entities.Product.read(entity_id);
      } else if (entity_type === 'LegalEntity') {
        entity = await base44.entities.LegalEntity.read(entity_id);
      }
      
      const corrId = `corr_${crypto.randomUUID()}`;
      recordAuditCall('getEntity', 'real', null, corrId, !!entity);
      
      return {
        correlation_id: corrId,
        entity: entity || null,
        found: !!entity
      };
    } catch (err) {
      const corrId = `corr_${crypto.randomUUID()}`;
      recordAuditCall('getEntity', 'real', null, corrId, false, err.message);
      return {
        correlation_id: corrId,
        entity: null,
        found: false,
        error: err.message
      };
    }
  }

  async createEntity({ entity_type, payload }) {
    const corrId = `corr_${crypto.randomUUID()}`;
    
    recordAuditCall('createEntity', 'real', null, corrId, false, 'NOT_CONFIGURED');
    
    // Real entity creation endpoint not yet configured
    throw new Error(JSON.stringify({
      error: "NOT_CONFIGURED",
      correlation_id: corrId,
      message: "Real entity creation endpoint not configured. Use Mock mode or create entities directly.",
      call: "createEntity"
    }));
  }

  // ===== NEW SUPPLIER METHODS =====

  async searchSuppliers(query) {
    const allSuppliers = await this.listSuppliers();
    const lowerQuery = (query || '').toLowerCase();
    
    if (lowerQuery.length === 0) return allSuppliers;
    
    return allSuppliers.filter(s => 
      (s.name || '').toLowerCase().includes(lowerQuery) ||
      (s.legal_name || '').toLowerCase().includes(lowerQuery)
    );
  }

  async getSupplierById(id) {
    return base44.entities.Supplier.read(id);
  }

  async createSupplier(payload) {
    const user = await base44.auth.me();
    const tenant_id = user.email.split('@')[0];
    
    // Validate required fields
    if (!payload.name && !payload.legal_name) {
      throw new Error('Supplier name is required');
    }
    if (!payload.country_code && !payload.country) {
      throw new Error('Country code is required');
    }
    
    const supplierName = payload.name || payload.legal_name;
    const countryCode = payload.country_code || payload.country;
    
    const createdSupplier = await base44.entities.Supplier.create({
      tenant_id,
      supplier_id: `SUP-${Date.now()}`,
      legal_name: supplierName,
      country_code: countryCode,
      primary_contact_email: payload.email || `${supplierName.toLowerCase().replace(/\s/g, '')}@example.com`,
      supplier_status: 'active',
      creation_source: 'MANUAL',
      created_by_user_id: user.id,
      created_at: new Date().toISOString()
    });
    
    // Normalize response to match mock adapter interface
    return {
      id: createdSupplier.id,
      name: createdSupplier.legal_name,
      legal_name: createdSupplier.legal_name,
      country_code: createdSupplier.country_code,
      email: createdSupplier.primary_contact_email,
      ...createdSupplier
    };
  }
}