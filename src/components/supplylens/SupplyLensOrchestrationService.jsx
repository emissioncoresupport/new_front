import { base44 } from '@/api/base44Client';
import MasterDataOrchestrator from './MasterDataOrchestrator';

/**
 * SupplyLens Orchestration Service
 * Central event-driven service that auto-triggers across all modules
 * Hooks into: Material creation, Supplier onboarding, CBAM imports, PFAS checks, EUDR submissions
 */

class SupplyLensOrchestrationService {
  constructor() {
    this.listeners = new Set();
    this.isProcessing = false;
  }

  /**
   * Register global event listeners for automatic orchestration
   */
  initialize() {
    if (typeof window !== 'undefined') {
      // Listen for material creation events
      window.addEventListener('materialCreated', this.handleMaterialCreated.bind(this));
      
      // Listen for supplier creation/update events
      window.addEventListener('supplierCreated', this.handleSupplierCreated.bind(this));
      window.addEventListener('supplierUpdated', this.handleSupplierUpdated.bind(this));
      
      // Listen for CBAM import events
      window.addEventListener('cbamImportCreated', this.handleCBAMImport.bind(this));
      
      // Listen for PFAS assessment events
      window.addEventListener('pfasAssessmentCreated', this.handlePFASAssessment.bind(this));
      
      // Listen for EUDR submission events
      window.addEventListener('eudrSubmissionCreated', this.handleEUDRSubmission.bind(this));

      console.log('✅ SupplyLens Orchestration Service initialized');
    }
  }

  /**
   * AUTO-TRIGGER 1: When material is created, immediately find potential suppliers
   */
  async handleMaterialCreated(event) {
    const { materialId, material } = event.detail;
    
    try {
      // Auto-discover supplier relationships
      const suggestions = await MasterDataOrchestrator.discoverRelationships({
        minConfidence: 75,
        autoApprove: false,
        filterMaterialId: materialId
      });

      // Auto-approve high confidence matches
      for (const suggestion of suggestions) {
        if (suggestion.confidence >= 90 && suggestion.material_id === materialId) {
          await MasterDataOrchestrator.linkSupplierToMaterial(
            suggestion.supplier_id,
            materialId,
            'manufacturer',
            suggestion.confidence
          );
        }
      }

      // Check compliance requirements
      await this.checkComplianceRequirements(materialId, material);

      this.emit('materialOrchestrated', { materialId, suggestions });
    } catch (error) {
      console.error('Material orchestration failed:', error);
    }
  }

  /**
   * AUTO-TRIGGER 2: When supplier is created, find matching materials
   */
  async handleSupplierCreated(event) {
    const { supplierId, supplier } = event.detail;
    
    try {
      // Auto-discover material relationships
      const suggestions = await MasterDataOrchestrator.discoverRelationships({
        minConfidence: 75,
        autoApprove: false,
        filterSupplierId: supplierId
      });

      // Auto-approve high confidence matches
      for (const suggestion of suggestions) {
        if (suggestion.confidence >= 90 && suggestion.supplier_id === supplierId) {
          await MasterDataOrchestrator.linkSupplierToMaterial(
            supplierId,
            suggestion.material_id,
            'manufacturer',
            suggestion.confidence
          );
        }
      }

      // Trigger onboarding tasks based on supplier capabilities
      await this.createSupplierOnboardingTasks(supplierId, supplier);

      this.emit('supplierOrchestrated', { supplierId, suggestions });
    } catch (error) {
      console.error('Supplier orchestration failed:', error);
    }
  }

  /**
   * AUTO-TRIGGER 3: When supplier is updated, re-sync all modules
   */
  async handleSupplierUpdated(event) {
    const { supplierId, changes } = event.detail;
    
    try {
      // Re-sync with compliance modules if relevant fields changed
      const relevantFields = [
        'cbam_relevant', 'pfas_relevant', 'eudr_relevant', 
        'country', 'supplier_type', 'capabilities'
      ];

      if (Object.keys(changes).some(key => relevantFields.includes(key))) {
        // Get all materials linked to this supplier
        const mappings = await base44.entities.SupplierSKUMapping.filter({
          supplier_id: supplierId
        });

        // Re-sync each material with compliance modules
        for (const mapping of mappings) {
          await MasterDataOrchestrator.syncToComplianceModules(
            supplierId, 
            mapping.sku_id
          );
        }
      }

      this.emit('supplierReSynced', { supplierId });
    } catch (error) {
      console.error('Supplier re-sync failed:', error);
    }
  }

  /**
   * AUTO-TRIGGER 4: When CBAM import is created, auto-link supplier and material
   */
  async handleCBAMImport(event) {
    const { importId, importData } = event.detail;
    
    try {
      // Extract supplier info from CBAM import
      const supplierId = importData.supplier_id;
      const materialName = importData.goods_description;
      const cnCode = importData.cn_code;

      if (!supplierId) return;

      // Find or create material
      let material = await base44.entities.MaterialSKU.filter({
        material_name: materialName
      });

      if (material.length === 0) {
        // Create material from CBAM data
        material = await base44.entities.MaterialSKU.create({
          material_name: materialName,
          category: this.getCategoryFromCNCode(cnCode),
          cbam_relevant: true,
          cn_code: cnCode,
          source_module: 'cbam'
        });
      } else {
        material = material[0];
      }

      // Auto-link supplier to material
      await MasterDataOrchestrator.linkSupplierToMaterial(
        supplierId,
        material.id,
        'manufacturer',
        100
      );

      // Update CBAM entry with material link
      await base44.entities.CBAMEmissionEntry.update(importId, {
        linked_material_id: material.id
      });

      this.emit('cbamMaterialLinked', { importId, materialId: material.id });
    } catch (error) {
      console.error('CBAM import orchestration failed:', error);
    }
  }

  /**
   * AUTO-TRIGGER 5: When PFAS assessment is created, link to supplier
   */
  async handlePFASAssessment(event) {
    const { assessmentId, materialId } = event.detail;
    
    try {
      // Get all suppliers for this material
      const mappings = await base44.entities.SupplierSKUMapping.filter({
        sku_id: materialId
      });

      // Update each supplier's PFAS relevance
      for (const mapping of mappings) {
        await base44.entities.Supplier.update(mapping.supplier_id, {
          pfas_relevant: true
        });

        // Create PFAS onboarding task if needed
        const existingTasks = await base44.entities.OnboardingTask.filter({
          supplier_id: mapping.supplier_id,
          task_type: 'questionnaire',
          questionnaire_type: 'pfas'
        });

        if (existingTasks.length === 0) {
          await base44.entities.OnboardingTask.create({
            supplier_id: mapping.supplier_id,
            task_type: 'questionnaire',
            questionnaire_type: 'pfas',
            title: 'PFAS Declaration Required',
            description: 'Submit PFAS substance information for materials',
            status: 'pending',
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }

      this.emit('pfasSupplierLinked', { assessmentId, materialId });
    } catch (error) {
      console.error('PFAS assessment orchestration failed:', error);
    }
  }

  /**
   * AUTO-TRIGGER 6: When EUDR submission is created, trace back to materials
   */
  async handleEUDRSubmission(event) {
    const { submissionId, supplierId, commodity } = event.detail;
    
    try {
      // Find materials that match this commodity
      const materials = await base44.entities.MaterialSKU.filter({
        category: commodity
      });

      // Link supplier to commodity materials
      for (const material of materials) {
        await MasterDataOrchestrator.linkSupplierToMaterial(
          supplierId,
          material.id,
          'raw_material_supplier',
          85
        );

        // Mark material as EUDR relevant
        await base44.entities.MaterialSKU.update(material.id, {
          eudr_relevant: true
        });
      }

      // Mark supplier as EUDR relevant
      await base44.entities.Supplier.update(supplierId, {
        eudr_relevant: true
      });

      this.emit('eudrMaterialsLinked', { submissionId, supplierId });
    } catch (error) {
      console.error('EUDR submission orchestration failed:', error);
    }
  }

  /**
   * Check compliance requirements for a material
   */
  async checkComplianceRequirements(materialId, material) {
    const updates = {};

    // Auto-detect CBAM relevance (metals, minerals, cement, electricity, etc.)
    const cbamCategories = ['metal', 'steel', 'aluminium', 'cement', 'fertilizer', 'hydrogen'];
    if (cbamCategories.some(cat => material.category?.toLowerCase().includes(cat))) {
      updates.cbam_relevant = true;
    }

    // Auto-detect PFAS relevance (fluorinated substances, coatings, textiles)
    const pfasCategories = ['coating', 'textile', 'chemical', 'fluorinated'];
    if (pfasCategories.some(cat => material.category?.toLowerCase().includes(cat))) {
      updates.pfas_relevant = true;
    }

    // Auto-detect EUDR relevance (wood, palm oil, cattle, soy, coffee, cocoa, rubber)
    const eudrCommodities = ['wood', 'palm', 'cattle', 'soy', 'coffee', 'cocoa', 'rubber'];
    if (eudrCommodities.some(com => material.material_name?.toLowerCase().includes(com))) {
      updates.eudr_relevant = true;
    }

    if (Object.keys(updates).length > 0) {
      await base44.entities.MaterialSKU.update(materialId, updates);
    }
  }

  /**
   * Create onboarding tasks based on supplier capabilities
   */
  async createSupplierOnboardingTasks(supplierId, supplier) {
    const tasks = [];

    // Check if any compliance-relevant flags are set
    if (supplier.cbam_relevant) {
      tasks.push({
        supplier_id: supplierId,
        task_type: 'questionnaire',
        title: 'CBAM Emission Data Required',
        description: 'Submit embedded emissions for CBAM goods',
        status: 'pending'
      });
    }

    if (supplier.pfas_relevant) {
      tasks.push({
        supplier_id: supplierId,
        task_type: 'questionnaire',
        questionnaire_type: 'pfas',
        title: 'PFAS Declaration Required',
        description: 'Submit PFAS substance information',
        status: 'pending'
      });
    }

    if (supplier.eudr_relevant) {
      tasks.push({
        supplier_id: supplierId,
        task_type: 'questionnaire',
        questionnaire_type: 'eudr',
        title: 'EUDR Due Diligence Statement',
        description: 'Submit deforestation-free declaration',
        status: 'pending'
      });
    }

    // Create tasks in bulk
    for (const task of tasks) {
      try {
        await base44.entities.OnboardingTask.create(task);
      } catch (error) {
        console.error('Failed to create onboarding task:', error);
      }
    }
  }

  /**
   * Get material category from CN code
   */
  getCategoryFromCNCode(cnCode) {
    if (!cnCode) return 'other';
    
    const prefix = cnCode.substring(0, 2);
    const categoryMap = {
      '72': 'steel',
      '73': 'iron_steel_articles',
      '76': 'aluminium',
      '25': 'cement',
      '31': 'fertilizer',
      '28': 'chemical',
      '29': 'organic_chemical'
    };

    return categoryMap[prefix] || 'other';
  }

  /**
   * Event emitter
   */
  emit(eventName, data) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }
  }

  /**
   * Run scheduled background orchestration
   */
  async runBackgroundOrchestration() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    try {
      console.log('🔄 Running background orchestration...');

      // Auto-discover relationships for all unmapped entities
      await MasterDataOrchestrator.discoverRelationships({
        minConfidence: 80,
        autoApprove: true
      });

      // Validate all supplier data quality
      const suppliers = await base44.entities.Supplier.list();
      for (const supplier of suppliers) {
        await MasterDataOrchestrator.validateSupplierDataQuality(supplier.id);
      }

      // Re-sync compliance modules
      const mappings = await base44.entities.SupplierSKUMapping.list();
      for (const mapping of mappings) {
        await MasterDataOrchestrator.syncToComplianceModules(
          mapping.supplier_id,
          mapping.sku_id
        );
      }

      console.log('✅ Background orchestration complete');
    } catch (error) {
      console.error('Background orchestration failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}

// Singleton instance
const orchestrationService = new SupplyLensOrchestrationService();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  orchestrationService.initialize();
  
  // Run background orchestration every 30 minutes
  setInterval(() => {
    orchestrationService.runBackgroundOrchestration();
  }, 30 * 60 * 1000);
}

export default orchestrationService;