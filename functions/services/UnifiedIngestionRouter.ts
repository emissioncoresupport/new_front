// Unified Ingestion Surface Router
// Routes all ingestion surfaces through the same orchestrator

export const IngestionRouter = {
  // Route dispatcher
  async route(base44, { source_path, payload, user_email, tenant_id }) {
    switch (source_path) {
      case 'bulk_import':
        return this.handleBulkImport(base44, payload, user_email, tenant_id);
      
      case 'single_upload':
        return this.handleSingleUpload(base44, payload, user_email, tenant_id);
      
      case 'supplier_portal':
        return this.handleSupplierPortal(base44, payload, user_email, tenant_id);
      
      case 'api':
        return this.handleAPIIngestion(base44, payload, user_email, tenant_id);
      
      case 'erp_sync':
        return this.handleERPSync(base44, payload, user_email, tenant_id);
      
      default:
        throw new Error(`Unknown ingestion source: ${source_path}`);
    }
  },

  // Handle bulk CSV import
  async handleBulkImport(base44, { csv_rows }, user_email, tenant_id) {
    const results = [];
    
    for (const row of csv_rows) {
      try {
        const result = await base44.functions.invoke('supplierIngestionOrchestrator', {
          source_path: 'bulk_import',
          supplier_data: row,
          user_email,
          tenant_id
        });
        results.push({ row, status: 'processed', result: result.data });
      } catch (error) {
        results.push({ row, status: 'error', error: error.message });
      }
    }
    
    return { 
      success: true, 
      total: csv_rows.length,
      processed: results.filter(r => r.status === 'processed').length,
      errors: results.filter(r => r.status === 'error').length,
      details: results 
    };
  },

  // Handle single supplier upload with evidence
  async handleSingleUpload(base44, { supplier_data, evidence_id }, user_email, tenant_id) {
    const result = await base44.functions.invoke('supplierIngestionOrchestrator', {
      source_path: 'single_upload',
      supplier_data,
      evidence_id,
      user_email,
      tenant_id
    });
    
    return result.data;
  },

  // Handle supplier portal submission
  async handleSupplierPortal(base44, { supplier_data, invite_token }, user_email, tenant_id) {
    // Validate invite token first
    const tokenValid = await this.validateInviteToken(base44, invite_token);
    if (!tokenValid) {
      throw new Error('Invalid or expired invite token');
    }
    
    const result = await base44.functions.invoke('supplierIngestionOrchestrator', {
      source_path: 'supplier_portal',
      supplier_data,
      user_email,
      tenant_id
    });
    
    // Mark token as redeemed
    await this.redeemInviteToken(base44, invite_token, result.data.supplier_id);
    
    return result.data;
  },

  // Handle API ingestion
  async handleAPIIngestion(base44, { supplier_data, api_key }, user_email, tenant_id) {
    // Validate API key
    const keyValid = await this.validateAPIKey(base44, api_key, tenant_id);
    if (!keyValid) {
      throw new Error('Invalid API key');
    }
    
    const result = await base44.functions.invoke('supplierIngestionOrchestrator', {
      source_path: 'api',
      supplier_data,
      user_email,
      tenant_id
    });
    
    return result.data;
  },

  // Handle ERP sync
  async handleERPSync(base44, { supplier_data, erp_connection_id }, user_email, tenant_id) {
    const result = await base44.functions.invoke('supplierIngestionOrchestrator', {
      source_path: 'erp_sync',
      supplier_data,
      user_email,
      tenant_id
    });
    
    // Log ERP sync
    await base44.asServiceRole.entities.ERPSyncRun.create({
      erp_connection_id,
      sync_date: new Date().toISOString(),
      records_synced: 1,
      status: result.data.success ? 'success' : 'failed'
    });
    
    return result.data;
  },

  // Utilities
  async validateInviteToken(base44, token) {
    const tokens = await base44.asServiceRole.entities.SupplierInviteToken.filter({ token, status: 'ACTIVE' });
    return tokens.length > 0 && new Date(tokens[0].expires_at) > new Date();
  },

  async redeemInviteToken(base44, token, supplier_id) {
    const tokens = await base44.asServiceRole.entities.SupplierInviteToken.filter({ token });
    if (tokens.length > 0) {
      await base44.asServiceRole.entities.SupplierInviteToken.update(tokens[0].id, {
        status: 'REDEEMED',
        redeemed_at: new Date().toISOString(),
        redeemed_supplier_id: supplier_id
      });
    }
  },

  async validateAPIKey(base44, api_key, tenant_id) {
    // TODO: Implement API key validation logic
    return true; // Placeholder
  }
};