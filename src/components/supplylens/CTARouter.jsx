import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

/**
 * Centralized CTA Router for SupplyLens
 * Ensures all CTAs route correctly without crashes, with deterministic error codes
 */

export class CTARouter {
  static async openIngestionWizard(setShowWizardCallback) {
    try {
      if (!setShowWizardCallback || typeof setShowWizardCallback !== 'function') {
        throw new Error('CTA_ROUTER_ERROR: Invalid wizard callback');
      }
      setShowWizardCallback(true);
      return { success: true };
    } catch (error) {
      console.error('[CTARouter] openIngestionWizard error:', error);
      toast.error(`Failed to open wizard: ${error.message}`);
      return { success: false, error_code: 'WIZARD_OPEN_FAILED', message: error.message };
    }
  }

  static async openEvidenceDetail(evidenceId, options = {}) {
    try {
      if (!evidenceId) {
        throw new Error('CTA_ROUTER_ERROR: Evidence ID required');
      }

      const { demoStore } = await import('./DemoDataStore');
      
      // Try to find evidence by record_id or display_id
      let evidence = demoStore.getEvidenceByRecordId(evidenceId);
      if (!evidence) {
        evidence = demoStore.getEvidenceByDisplayId(evidenceId);
      }

      if (!evidence) {
        toast.error('Evidence not found', { description: `ID: ${evidenceId}` });
        
        // Create BLOCKED work item
        const workItem = demoStore.createWorkItem({
          type: 'REVIEW',
          status: 'BLOCKED',
          priority: 'HIGH',
          title: `Evidence not found: ${evidenceId}`,
          required_action_text: 'EVIDENCE_NOT_FOUND',
          owner: 'admin@example.com',
          created_at_utc: new Date().toISOString(),
          details: {
            error_code: 'EVIDENCE_NOT_FOUND',
            evidence_id: evidenceId
          }
        });
        
        return { 
          success: false, 
          error_code: 'EVIDENCE_NOT_FOUND', 
          blocked_work_item_id: workItem.work_item_id 
        };
      }

      // Navigate to Evidence Vault with focus
      const url = `${createPageUrl('EvidenceVault')}?focus=${evidence.display_id}`;
      window.location.href = url;
      
      return { success: true, evidence_id: evidence.record_id };
    } catch (error) {
      console.error('[CTARouter] openEvidenceDetail error:', error);
      toast.error(`Failed to open evidence: ${error.message}`);
      return { success: false, error_code: 'EVIDENCE_OPEN_FAILED', message: error.message };
    }
  }

  static async openEntity(entityType, entityId) {
    try {
      if (!entityType || !entityId) {
        throw new Error('CTA_ROUTER_ERROR: Entity type and ID required');
      }

      // Map entity type to tab
      const tabMap = {
        'SUPPLIER': 'suppliers',
        'Supplier': 'suppliers',
        'SKU': 'skus',
        'BOM': 'bom',
        'SITE': 'suppliers'
      };

      const tab = tabMap[entityType] || 'suppliers';
      
      // Navigate to SupplyLensNetwork with entity focus
      const url = `${createPageUrl('SupplyLensNetwork')}?tab=${tab}&entity_type=${entityType}&entity_id=${entityId}`;
      window.location.href = url;
      
      return { success: true, entity_type: entityType, entity_id: entityId };
    } catch (error) {
      console.error('[CTARouter] openEntity error:', error);
      toast.error(`Failed to open entity: ${error.message}`, { 
        description: 'Creating BLOCKED work item' 
      });
      
      // Create BLOCKED work item
      try {
        const { demoStore } = await import('./DemoDataStore');
        const workItem = demoStore.createWorkItem({
          type: 'REVIEW',
          status: 'BLOCKED',
          priority: 'HIGH',
          title: `Entity not found: ${entityType} ${entityId}`,
          required_action_text: 'ENTITY_NOT_FOUND',
          owner: 'admin@example.com',
          created_at_utc: new Date().toISOString(),
          details: {
            error_code: 'ENTITY_NOT_FOUND',
            entity_type: entityType,
            entity_id: entityId
          }
        });
        
        return { 
          success: false, 
          error_code: 'ENTITY_NOT_FOUND', 
          blocked_work_item_id: workItem.work_item_id 
        };
      } catch (createError) {
        return { success: false, error_code: 'ENTITY_OPEN_FAILED', message: error.message };
      }
    }
  }

  static async createMappingWorkItem(evidenceId, entityId = null) {
    try {
      if (!evidenceId) {
        throw new Error('CTA_ROUTER_ERROR: Evidence ID required');
      }

      const { demoStore } = await import('./DemoDataStore');
      
      // Get evidence to extract dataset type
      const evidence = demoStore.getEvidenceByRecordId(evidenceId) || 
                       demoStore.getEvidenceByDisplayId(evidenceId);
      
      if (!evidence) {
        throw new Error('Evidence not found');
      }
      
      const datasetType = evidence.dataset_type || 'UNKNOWN';
      const impactedModule = ['SUPPLIER_MASTER', 'SKU_MASTER', 'BOM'].includes(datasetType) ? 'CBAM' : null;
      const priority = impactedModule === 'CBAM' ? 'HIGH' : 'MEDIUM';
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      
      const workItemPayload = {
        type: 'MAPPING',
        status: 'OPEN',
        priority,
        title: `Mapping needed for ${datasetType}`,
        linked_evidence_record_ids: [evidence.record_id],
        linked_evidence_display_ids: [evidence.display_id],
        linked_entity: entityId ? { type: 'UNKNOWN', id: entityId } : null,
        required_action_text: 'USER_INITIATED_MAPPING',
        owner: 'admin@example.com',
        created_at_utc: new Date().toISOString(),
        due_date: dueDate.toISOString(),
        impacted_module: impactedModule,
        details: {
          dataset_type: datasetType,
          created_from: 'cta_router'
        }
      };
      
      const newWorkItem = demoStore.createWorkItem(workItemPayload);
      
      if (!newWorkItem || !newWorkItem.work_item_id) {
        throw new Error('Failed to create work item - no ID returned');
      }
      
      toast.success(`Work item ${newWorkItem.work_item_id} created`);
      
      return { 
        success: true, 
        work_item_id: newWorkItem.work_item_id 
      };
    } catch (error) {
      console.error('[CTARouter] createMappingWorkItem error:', error);
      toast.error(`Failed to create mapping work item: ${error.message}`);
      return { success: false, error_code: 'MAPPING_WI_CREATE_FAILED', message: error.message };
    }
  }

  static async createFollowUpWorkItem(parentWorkItemId, followUpType = 'REVIEW', priority = 'MEDIUM') {
    try {
      if (!parentWorkItemId) {
        throw new Error('CTA_ROUTER_ERROR: Parent work item ID required');
      }

      const { demoStore } = await import('./DemoDataStore');
      
      const followUp = demoStore.createFollowUp(parentWorkItemId, {
        type: followUpType,
        priority: priority
      });

      if (!followUp || !followUp.work_item_id) {
        throw new Error('Failed to create follow-up - no ID returned');
      }

      toast.success(`Follow-up ${followUp.work_item_id} created`);
      
      return { 
        success: true, 
        work_item_id: followUp.work_item_id 
      };
    } catch (error) {
      console.error('[CTARouter] createFollowUpWorkItem error:', error);
      toast.error(`Failed to create follow-up: ${error.message}`);
      return { success: false, error_code: 'FOLLOWUP_CREATE_FAILED', message: error.message };
    }
  }

  static async navigateToWorkQueue(filters = {}) {
    try {
      const params = new URLSearchParams();
      params.set('tab', 'queue');
      
      if (filters.type) params.set('filter_type', filters.type);
      if (filters.status) params.set('status', filters.status);
      if (filters.work_item_id) params.set('work_item_id', filters.work_item_id);
      if (filters.highlight) params.set('highlight', filters.highlight);
      
      const url = `${createPageUrl('SupplyLens')}?${params.toString()}`;
      window.location.href = url;
      
      return { success: true };
    } catch (error) {
      console.error('[CTARouter] navigateToWorkQueue error:', error);
      toast.error('Navigation failed');
      return { success: false, error_code: 'NAVIGATION_FAILED', message: error.message };
    }
  }
}

export default CTARouter;