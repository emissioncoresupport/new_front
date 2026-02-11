/**
 * Usage Metering Service
 * Track and log all billable operations across modules
 */

import { base44 } from '@/api/base44Client';

class UsageMeteringService {
  /**
   * Log a billable operation
   * @param {Object} params - Operation parameters
   * @returns {Promise<Object>} - Created usage log
   */
  static async logUsage({
    module,
    operationType,
    operationDetails = {},
    costUnits = 1,
    unitPriceEur = null,
    aiTokensUsed = null,
    aiModel = null,
    entityType = null,
    entityId = null,
    status = 'completed'
  }) {
    try {
      const user = await base44.auth.me();
      const tenantId = user.tenant_id || user.email.split('@')[1];
      
      // Get pricing if not provided
      let calculatedUnitPrice = unitPriceEur;
      if (!calculatedUnitPrice) {
        const pricing = await this.getPricingForOperation(tenantId, module, operationType);
        calculatedUnitPrice = pricing.unitPrice;
      }

      const totalCostEur = costUnits * calculatedUnitPrice;
      const billingPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

      const usageLog = await base44.entities.UsageLog.create({
        tenant_id: tenantId,
        user_email: user.email,
        module,
        operation_type: operationType,
        operation_details: operationDetails,
        cost_units: costUnits,
        unit_price_eur: calculatedUnitPrice,
        total_cost_eur: totalCostEur,
        ai_tokens_used: aiTokensUsed,
        ai_model: aiModel,
        entity_type: entityType,
        entity_id: entityId,
        status,
        billing_period: billingPeriod,
        invoiced: false
      });

      return usageLog;
    } catch (error) {
      console.error('Failed to log usage:', error);
      // Don't throw - we don't want to break user operations if logging fails
      return null;
    }
  }

  /**
   * Get pricing for a specific operation
   */
  static async getPricingForOperation(tenantId, module, operationType) {
    try {
      // First try tenant-specific pricing
      let pricingPlan = await base44.entities.PricingPlan.filter({
        tenant_id: tenantId,
        module,
        active: true
      });

      // Fallback to default pricing
      if (!pricingPlan || pricingPlan.length === 0) {
        pricingPlan = await base44.entities.PricingPlan.filter({
          is_default: true,
          module,
          active: true
        });
      }

      // Fallback to "ALL" module pricing
      if (!pricingPlan || pricingPlan.length === 0) {
        pricingPlan = await base44.entities.PricingPlan.filter({
          is_default: true,
          module: 'ALL',
          active: true
        });
      }

      if (pricingPlan && pricingPlan.length > 0) {
        const pricing = pricingPlan[0].pricing[operationType];
        if (pricing) {
          // Return per-call, per-token, or per-unit pricing
          return {
            unitPrice: pricing.per_call || pricing.per_1k_tokens || pricing.per_entry || 
                      pricing.per_document || pricing.per_image || pricing.per_assessment ||
                      pricing.per_submission || pricing.per_product || pricing.per_supplier ||
                      pricing.per_shipment || pricing.per_100_records || pricing.per_report ||
                      pricing.per_transaction || 0.01,
            pricingModel: pricing
          };
        }
      }

      // Default pricing if nothing found
      return { unitPrice: 0.01, pricingModel: null };
    } catch (error) {
      console.error('Failed to get pricing:', error);
      return { unitPrice: 0.01, pricingModel: null };
    }
  }

  /**
   * Track AI LLM call
   */
  static async trackAICall({ module, prompt, tokensUsed, model = 'gpt-4', details = {} }) {
    return this.logUsage({
      module,
      operationType: 'AI_LLM_CALL',
      operationDetails: { prompt: prompt.substring(0, 200), ...details },
      costUnits: tokensUsed / 1000, // Per 1k tokens
      aiTokensUsed: tokensUsed,
      aiModel: model
    });
  }

  /**
   * Track document analysis
   */
  static async trackDocumentAnalysis({ module, documentUrl, entityType, entityId }) {
    return this.logUsage({
      module,
      operationType: 'AI_DOCUMENT_ANALYSIS',
      operationDetails: { documentUrl },
      costUnits: 1,
      entityType,
      entityId
    });
  }

  /**
   * Track CBAM operations
   */
  static async trackCBAMCalculation({ entryId, entriesCount = 1 }) {
    return this.logUsage({
      module: 'CBAM',
      operationType: 'CBAM_CALCULATION',
      costUnits: entriesCount,
      entityType: 'CBAMEmissionEntry',
      entityId: entryId
    });
  }

  static async trackCBAMReport({ reportId }) {
    return this.logUsage({
      module: 'CBAM',
      operationType: 'CBAM_REPORT_GENERATION',
      costUnits: 1,
      entityType: 'CBAMReport',
      entityId: reportId
    });
  }

  static async trackCBAMDDS({ submissionId }) {
    return this.logUsage({
      module: 'CBAM',
      operationType: 'CBAM_DDS_SUBMISSION',
      costUnits: 1,
      entityType: 'CBAMReport',
      entityId: submissionId
    });
  }

  /**
   * Track EUDR operations
   */
  static async trackEUDRDDS({ submissionId }) {
    return this.logUsage({
      module: 'EUDR',
      operationType: 'EUDR_DDS_SUBMISSION',
      costUnits: 1,
      entityType: 'EUDRDDS',
      entityId: submissionId
    });
  }

  static async trackEUDRRiskAssessment({ batchId }) {
    return this.logUsage({
      module: 'EUDR',
      operationType: 'EUDR_RISK_ASSESSMENT',
      costUnits: 1,
      entityType: 'EUDRBatch',
      entityId: batchId
    });
  }

  static async trackEUDRSatellite({ analysisId }) {
    return this.logUsage({
      module: 'EUDR',
      operationType: 'EUDR_SATELLITE_ANALYSIS',
      costUnits: 1,
      entityType: 'EUDRSatelliteAnalysis',
      entityId: analysisId
    });
  }

  /**
   * Track SupplyLens operations
   */
  static async trackSupplierOnboarding({ supplierId }) {
    return this.logUsage({
      module: 'SupplyLens',
      operationType: 'SUPPLIER_ONBOARDING',
      costUnits: 1,
      entityType: 'Supplier',
      entityId: supplierId
    });
  }

  static async trackSupplierRiskScan({ supplierId }) {
    return this.logUsage({
      module: 'SupplyLens',
      operationType: 'SUPPLIER_RISK_SCAN',
      costUnits: 1,
      entityType: 'Supplier',
      entityId: supplierId
    });
  }

  /**
   * Track data imports
   */
  static async trackDataImport({ module, recordCount, entityType }) {
    return this.logUsage({
      module,
      operationType: 'DATA_IMPORT',
      costUnits: Math.ceil(recordCount / 100), // Per 100 records
      operationDetails: { recordCount },
      entityType
    });
  }

  /**
   * Track logistics operations
   */
  static async trackShipmentCalculation({ shipmentId }) {
    return this.logUsage({
      module: 'Logistics',
      operationType: 'LOGISTICS_EMISSION_CALC',
      costUnits: 1,
      entityType: 'LogisticsShipment',
      entityId: shipmentId
    });
  }

  /**
   * Track PCF/LCA calculations
   */
  static async trackPCFCalculation({ productId }) {
    return this.logUsage({
      module: 'PCF',
      operationType: 'PCF_CALCULATION',
      costUnits: 1,
      entityType: 'Product',
      entityId: productId
    });
  }

  static async trackLCACalculation({ studyId }) {
    return this.logUsage({
      module: 'LCA',
      operationType: 'LCA_CALCULATION',
      costUnits: 1,
      entityType: 'LCAStudy',
      entityId: studyId
    });
  }

  /**
   * Get usage summary for current month
   */
  static async getCurrentMonthUsage() {
    try {
      const user = await base44.auth.me();
      const tenantId = user.tenant_id || user.email.split('@')[1];
      const currentPeriod = new Date().toISOString().slice(0, 7);

      const logs = await base44.entities.UsageLog.filter({
        tenant_id: tenantId,
        billing_period: currentPeriod
      });

      const totalCost = logs.reduce((sum, log) => sum + (log.total_cost_eur || 0), 0);
      const totalOperations = logs.length;

      const byModule = {};
      const byOperation = {};

      logs.forEach(log => {
        byModule[log.module] = (byModule[log.module] || 0) + log.total_cost_eur;
        byOperation[log.operation_type] = (byOperation[log.operation_type] || 0) + log.total_cost_eur;
      });

      return {
        totalCost,
        totalOperations,
        byModule,
        byOperation,
        logs
      };
    } catch (error) {
      console.error('Failed to get usage summary:', error);
      return null;
    }
  }
}

export default UsageMeteringService;