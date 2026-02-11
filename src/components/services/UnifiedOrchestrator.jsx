/**
 * Unified Orchestrator - Single Entry Point for All Cross-Module Operations
 * Consolidates SupplierOrchestrationService + MasterDataOrchestrator + Backend triggers
 * January 2026 - EU Compliance Architecture
 */

import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import DataIngestionPipeline from './DataIngestionPipeline';
import ComplianceSyncEngine from './ComplianceSyncEngine';
import AuditTrailService from './AuditTrailService';
import AIService from './AIService';

class UnifiedOrchestrator {
  /**
   * MAIN ENTRY POINT: Orchestrate any entity change
   * Automatically determines what needs to sync based on entity type
   */
  async orchestrateEntityChange(entityType, entityId, operation = 'update', metadata = {}) {
    const orchestrationId = `${Date.now()}-${Math.random()}`;
    
    try {
      console.log(`[Orchestration ${orchestrationId}] Starting for ${entityType}:${entityId}`);

      // Step 1: Record to blockchain audit trail
      await AuditTrailService.recordAction({
        entityType,
        entityId,
        action: operation,
        metadata: { orchestrationId, ...metadata }
      });

      // Step 2: Determine sync requirements
      const syncPlan = this.determineSyncPlan(entityType);

      // Step 3: Execute syncs in parallel
      const syncPromises = [];

      if (syncPlan.compliance) {
        syncPromises.push(
          ComplianceSyncEngine.syncEntity(entityType, entityId, syncPlan.compliance)
        );
      }

      if (syncPlan.validation) {
        syncPromises.push(
          this.validateEntity(entityType, entityId, syncPlan.validation)
        );
      }

      if (syncPlan.enrichment) {
        syncPromises.push(
          this.enrichEntity(entityType, entityId, syncPlan.enrichment)
        );
      }

      const results = await Promise.allSettled(syncPromises);

      // Step 4: Log results to blockchain
      await AuditTrailService.recordAction({
        entityType,
        entityId,
        action: `${operation}_completed`,
        metadata: {
          orchestrationId,
          results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason })
        }
      });

      return {
        success: true,
        orchestrationId,
        results: results.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean)
      };

    } catch (error) {
      console.error(`[Orchestration ${orchestrationId}] Failed:`, error);
      await AuditTrailService.recordAction({
        entityType,
        entityId,
        action: `${operation}_failed`,
        metadata: { orchestrationId, error: error.message }
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Determine what needs to sync based on entity type
   */
  determineSyncPlan(entityType) {
    const plans = {
      Supplier: {
        compliance: ['cbam', 'eudr', 'pfas', 'eudamed', 'dpp'],
        validation: ['eu_vat', 'eori', 'sanctions'],
        enrichment: ['risk_scoring', 'data_completeness']
      },
      MaterialSKU: {
        compliance: ['pfas', 'reach', 'ppwr', 'cbam'],
        validation: ['cas_number', 'composition'],
        enrichment: ['carbon_footprint', 'circularity']
      },
      ProductSKU: {
        compliance: ['dpp', 'ppwr', 'cbam'],
        validation: ['bom_completeness'],
        enrichment: ['pcf_calculation', 'circularity_score']
      },
      CBAMEmissionEntry: {
        compliance: ['cbam', 'ccf'],
        validation: ['cn_code', 'emissions_data'],
        enrichment: ['free_allocation', 'certificate_cost']
      },
      EUDRDDS: {
        compliance: ['eudr', 'ccf'],
        validation: ['geolocation', 'traceability'],
        enrichment: ['deforestation_risk', 'satellite_check']
      }
    };

    return plans[entityType] || { compliance: [], validation: [], enrichment: [] };
  }

  /**
   * Validate entity data
   */
  async validateEntity(entityType, entityId, validationTypes) {
    const results = [];

    for (const validationType of validationTypes) {
      try {
        let result;
        
        switch (validationType) {
          case 'eu_vat':
            result = await base44.functions.invoke('euRegistryValidator', {
              entity_type: entityType,
              entity_id: entityId
            });
            break;
          
          case 'sanctions':
            result = await base44.functions.invoke('sanctionsScreening', {
              entity_id: entityId
            });
            break;
          
          case 'geolocation':
            result = await base44.functions.invoke('eudrGeolocationValidator', {
              dds_id: entityId
            });
            break;

          default:
            result = { validation: validationType, status: 'skipped' };
        }

        results.push({ type: validationType, success: true, result });
      } catch (error) {
        results.push({ type: validationType, success: false, error: error.message });
      }
    }

    return { validation_results: results };
  }

  /**
   * Enrich entity data
   */
  async enrichEntity(entityType, entityId, enrichmentTypes) {
    const results = [];

    for (const enrichmentType of enrichmentTypes) {
      try {
        let result;

        switch (enrichmentType) {
          case 'risk_scoring':
            result = await base44.functions.invoke('supplierRiskTierClassifier', {
              supplier_id: entityId
            });
            break;

          case 'data_completeness':
            result = await base44.functions.invoke('calculateDataQualityScore', {
              entity_type: entityType,
              entity_id: entityId
            });
            break;

          case 'carbon_footprint':
            result = await AIService.estimateEmissions(entityType, entityId);
            break;

          default:
            result = { enrichment: enrichmentType, status: 'skipped' };
        }

        results.push({ type: enrichmentType, success: true, result });
      } catch (error) {
        results.push({ type: enrichmentType, success: false, error: error.message });
      }
    }

    return { enrichment_results: results };
  }

  /**
   * Batch orchestrate multiple entities
   */
  async orchestrateBatch(entityType, entityIds, operation = 'update') {
    const batchId = `batch-${Date.now()}`;
    
    toast.loading(`Processing ${entityIds.length} ${entityType} records...`);

    const results = await Promise.allSettled(
      entityIds.map(id => this.orchestrateEntityChange(entityType, id, operation, { batchId }))
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    toast.success(`Batch complete: ${successful} succeeded, ${failed} failed`);

    return {
      batchId,
      total: entityIds.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Trigger automated workflows
   */
  async triggerWorkflows(entityType, entityId, event) {
    try {
      const workflows = await base44.entities.WorkflowAutomation.filter({
        status: 'active',
        trigger_module: this.getModuleForEntity(entityType),
        trigger_event: event
      });

      for (const workflow of workflows) {
        await base44.functions.invoke('workflowEngine', {
          workflow_id: workflow.id,
          trigger_data: {
            entity_type: entityType,
            entity_id: entityId,
            event
          }
        });
      }
    } catch (error) {
      console.error('Workflow trigger failed:', error);
    }
  }

  /**
   * Get module name for entity type
   */
  getModuleForEntity(entityType) {
    const mapping = {
      CBAMEmissionEntry: 'cbam',
      EUDRDDS: 'eudr',
      PFASComplianceAssessment: 'pfas',
      PPWRPackaging: 'ppwr',
      EUDAMEDDevice: 'eudamed',
      DPPRecord: 'dpp',
      CCFEntry: 'ccf',
      LCAStudy: 'lca',
      Product: 'pcf'
    };
    return mapping[entityType] || 'supplylens';
  }
}

export default new UnifiedOrchestrator();