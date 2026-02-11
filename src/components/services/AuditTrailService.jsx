/**
 * Audit Trail Service - Unified Blockchain Logging
 * All compliance modules use this for immutable audit trails
 * January 2026 - EU Digital Product Passport + CSRD requirements
 */

import BlockchainService from '../blockchain/BlockchainService';

class AuditTrailService {
  /**
   * Record any action to blockchain
   */
  async recordAction({ entityType, entityId, action, metadata = {} }) {
    try {
      const module = metadata.module || this.inferModule(entityType);
      
      const result = await BlockchainService.recordTransaction(
        module,
        entityType,
        entityId,
        action,
        {
          timestamp: new Date().toISOString(),
          ...metadata
        }
      );

      return result;
    } catch (error) {
      console.error('Audit trail recording failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify entity integrity
   */
  async verifyEntity(entityType, entityId) {
    return await BlockchainService.verifyDataIntegrity(entityType, entityId);
  }

  /**
   * Get complete audit trail
   */
  async getAuditTrail(entityType, entityId) {
    return await BlockchainService.getAuditTrail(entityType, entityId);
  }

  /**
   * Verify entire chain integrity
   */
  async verifyChainIntegrity() {
    return await BlockchainService.verifyChainIntegrity();
  }

  /**
   * Batch record multiple actions
   */
  async recordBatch(actions) {
    const results = [];

    for (const action of actions) {
      const result = await this.recordAction(action);
      results.push(result);
    }

    return {
      total: actions.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Infer module from entity type
   */
  inferModule(entityType) {
    const mapping = {
      CBAMEmissionEntry: 'cbam',
      CBAMInstallation: 'cbam',
      EUDRDDS: 'eudr',
      EUDRPlot: 'eudr',
      PFASComplianceAssessment: 'pfas',
      PFASSubstance: 'pfas',
      PPWRPackaging: 'ppwr',
      EUDAMEDDevice: 'eudamed',
      EUDAMEDActor: 'eudamed',
      DPPRecord: 'dpp',
      CCFEntry: 'ccf',
      LCAStudy: 'lca',
      Product: 'pcf',
      Supplier: 'supplylens',
      MaterialSKU: 'supplylens',
      ProductSKU: 'supplylens'
    };

    return mapping[entityType] || 'system';
  }

  /**
   * Get audit summary for entity
   */
  async getAuditSummary(entityType, entityId) {
    const trail = await this.getAuditTrail(entityType, entityId);

    return {
      total_actions: trail.length,
      first_recorded: trail[0]?.timestamp,
      last_recorded: trail[trail.length - 1]?.timestamp,
      actions_by_type: this.groupByAction(trail),
      blockchain_verified: trail.every(t => t.verified)
    };
  }

  /**
   * Group trail by action type
   */
  groupByAction(trail) {
    const grouped = {};
    
    trail.forEach(t => {
      if (!grouped[t.action]) {
        grouped[t.action] = 0;
      }
      grouped[t.action]++;
    });

    return grouped;
  }
}

export default new AuditTrailService();