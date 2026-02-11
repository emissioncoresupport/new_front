/**
 * PPWR Master Orchestrator
 * Central integration layer - connects ALL services and triggers cross-module workflows
 * NO SILOS - everything flows through here
 */

import { base44 } from '@/api/base44Client';
import PPWRAutomationEngine from './PPWRAutomationEngine';
import PPWRCalculationService from './PPWRCalculationService';
import PPWRBlockchainService from './PPWRBlockchainService';
import PPWRIntegrationHub from './PPWRIntegrationHub';
import PPWRAIOptimizer from './PPWRAIOptimizer';
import { toast } from 'sonner';

export class PPWRMasterOrchestrator {
  
  /**
   * MASTER WORKFLOW: On packaging creation/update
   * Triggers all integrated services automatically
   */
  static async onPackagingChange(packaging, action = 'create') {
    const workflow = {
      packaging_id: packaging.id,
      action: action,
      started_at: new Date().toISOString(),
      steps: []
    };
    
    try {
      // STEP 1: Blockchain Audit Log
      workflow.steps.push({ step: 'blockchain', status: 'running' });
      if (action === 'create') {
        await PPWRBlockchainService.logPackagingCreation(packaging);
      } else {
        await PPWRBlockchainService.logDesignChange(
          packaging.id, 
          packaging, 
          packaging, 
          'Automated update'
        );
      }
      workflow.steps[workflow.steps.length - 1].status = 'completed';
      
      // STEP 2: Automated Compliance Check
      workflow.steps.push({ step: 'compliance_check', status: 'running' });
      const complianceResult = await PPWRAutomationEngine.runComplianceCheck(packaging);
      await base44.entities.PPWRPackaging.update(packaging.id, {
        compliance_status: complianceResult.status,
        compliance_score: complianceResult.score,
        last_compliance_check: new Date().toISOString()
      });
      workflow.steps[workflow.steps.length - 1].status = 'completed';
      workflow.steps[workflow.steps.length - 1].result = { score: complianceResult.score };
      
      // Log compliance check to blockchain
      await PPWRBlockchainService.logComplianceCheck(packaging.id, complianceResult);
      
      // STEP 3: Circularity Score Calculation
      workflow.steps.push({ step: 'circularity_score', status: 'running' });
      const circularityScore = PPWRCalculationService.calculateCircularityScore(packaging);
      await base44.entities.PPWRPackaging.update(packaging.id, {
        circularity_score: circularityScore.total_score
      });
      workflow.steps[workflow.steps.length - 1].status = 'completed';
      workflow.steps[workflow.steps.length - 1].result = { score: circularityScore.total_score };
      
      // STEP 4: Penalty Risk Assessment (if non-compliant)
      if (complianceResult.status !== 'Compliant') {
        workflow.steps.push({ step: 'risk_assessment', status: 'running' });
        const riskAssessment = await PPWRAIOptimizer.assessPenaltyRisk(packaging);
        await base44.entities.PPWRPackaging.update(packaging.id, {
          penalty_risk_level: riskAssessment.overall_risk_level
        });
        workflow.steps[workflow.steps.length - 1].status = 'completed';
        workflow.steps[workflow.steps.length - 1].result = { risk_level: riskAssessment.overall_risk_level };
        
        // Alert if critical
        if (riskAssessment.overall_risk_level === 'critical') {
          toast.error(`Critical compliance risk: ${packaging.packaging_name}`, {
            description: riskAssessment.immediate_actions[0]
          });
        }
      }
      
      // STEP 5: Auto-generate DPP (if eligible)
      if (!packaging.digital_passport_id && packaging.labeling_compliant) {
        workflow.steps.push({ step: 'dpp_generation', status: 'running' });
        try {
          const dpp = await PPWRIntegrationHub.generateDPP(packaging.id);
          workflow.steps[workflow.steps.length - 1].status = 'completed';
          workflow.steps[workflow.steps.length - 1].result = { dpp_id: dpp.dpp_id };
        } catch (error) {
          workflow.steps[workflow.steps.length - 1].status = 'failed';
          workflow.steps[workflow.steps.length - 1].error = error.message;
        }
      }
      
      // STEP 6: Request supplier data (if missing critical info)
      if (
        packaging.supplier_id && 
        !packaging.supplier_declaration_url && 
        (packaging.recycled_content_percentage > 0 || packaging.material_category === 'Plastic')
      ) {
        workflow.steps.push({ step: 'supplier_request', status: 'running' });
        try {
          await PPWRIntegrationHub.requestSupplierDeclaration(packaging.id);
          workflow.steps[workflow.steps.length - 1].status = 'completed';
        } catch (error) {
          workflow.steps[workflow.steps.length - 1].status = 'failed';
          workflow.steps[workflow.steps.length - 1].error = error.message;
        }
      }
      
      workflow.completed_at = new Date().toISOString();
      workflow.success = true;
      
      return workflow;
      
    } catch (error) {
      console.error('Orchestration error:', error);
      workflow.completed_at = new Date().toISOString();
      workflow.success = false;
      workflow.error = error.message;
      return workflow;
    }
  }
  
  /**
   * MASTER WORKFLOW: Batch processing for all packaging
   * Runs all checks, integrations, calculations in parallel
   */
  static async runFullAudit() {
    const packaging = await base44.entities.PPWRPackaging.list();
    
    const results = {
      total: packaging.length,
      processed: 0,
      failed: 0,
      workflows: []
    };
    
    for (const pkg of packaging) {
      try {
        const workflow = await this.onPackagingChange(pkg, 'audit');
        results.workflows.push(workflow);
        results.processed++;
      } catch (error) {
        results.failed++;
        console.error(`Failed to process ${pkg.id}:`, error);
      }
    }
    
    return results;
  }
  
  /**
   * INTEGRATION: Sync with SupplyLens on SKU update
   * Triggered when SKU/BOM changes in SupplyLens
   */
  static async onSKUUpdate(skuId) {
    try {
      const syncResult = await PPWRIntegrationHub.syncFromSupplyLens(skuId);
      
      if (syncResult.id) {
        // Get updated packaging
        const packaging = (await base44.entities.PPWRPackaging.filter({ id: syncResult.id }))[0];
        
        // Run full workflow
        await this.onPackagingChange(packaging, 'update');
        
        return { success: true, packaging_id: syncResult.id };
      }
      
    } catch (error) {
      console.error('SKU sync orchestration error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * INTEGRATION: Quarterly EPR reporting automation
   * Runs on schedule or manual trigger
   */
  static async quarterlyEPRWorkflow(period, memberState) {
    const workflow = {
      period: period,
      member_state: memberState,
      started_at: new Date().toISOString(),
      steps: []
    };
    
    try {
      // 1. Run compliance check on all EPR-registered packaging
      workflow.steps.push({ step: 'compliance_batch', status: 'running' });
      const packaging = await base44.entities.PPWRPackaging.filter({ epr_registered: true });
      const batchCompliance = await PPWRAutomationEngine.runBatchCompliance(packaging);
      workflow.steps[workflow.steps.length - 1].status = 'completed';
      workflow.steps[workflow.steps.length - 1].result = batchCompliance;
      
      // 2. Generate EPR reports
      workflow.steps.push({ step: 'epr_generation', status: 'running' });
      const PPWRReportingService = (await import('./PPWRReportingService')).default;
      const reports = await PPWRReportingService.generateEPRReport(period, memberState);
      workflow.steps[workflow.steps.length - 1].status = 'completed';
      workflow.steps[workflow.steps.length - 1].result = { report_count: reports.length };
      
      // 3. Log to blockchain
      for (const report of reports) {
        for (const item of report.items) {
          await PPWRBlockchainService.logEPRSubmission(item.packaging_id, {
            scheme_id: report.epr_scheme_id,
            period: period,
            weight_kg: item.weight_kg,
            fee_eur: item.fee_eur,
            confirmation_number: `EPR-${Date.now()}`
          });
        }
      }
      
      workflow.completed_at = new Date().toISOString();
      workflow.success = true;
      workflow.reports = reports;
      
      return workflow;
      
    } catch (error) {
      console.error('EPR workflow error:', error);
      workflow.completed_at = new Date().toISOString();
      workflow.success = false;
      workflow.error = error.message;
      return workflow;
    }
  }
  
  /**
   * INTEGRATION: Real-time alert system
   * Monitors for critical issues and sends notifications
   */
  static async monitorCriticalIssues() {
    const packaging = await base44.entities.PPWRPackaging.list();
    const alerts = [];
    
    for (const pkg of packaging) {
      // Check for PFAS (banned 2026)
      if (pkg.contains_pfas) {
        alerts.push({
          packaging_id: pkg.id,
          packaging_name: pkg.packaging_name,
          severity: 'critical',
          type: 'pfas_ban',
          message: 'PFAS banned from Jan 1, 2026 - immediate action required',
          action: 'Replace with PFAS-free alternatives'
        });
      }
      
      // Check for EPR non-registration
      if (!pkg.epr_registered && pkg.placed_on_market_date) {
        alerts.push({
          packaging_id: pkg.id,
          packaging_name: pkg.packaging_name,
          severity: 'critical',
          type: 'epr_missing',
          message: 'EPR registration required for market placement',
          action: 'Register with national EPR scheme'
        });
      }
      
      // Check for excessive empty space
      if ((pkg.empty_space_ratio || 0) > 40 && ['E-commerce', 'Transport'].includes(pkg.packaging_format)) {
        alerts.push({
          packaging_id: pkg.id,
          packaging_name: pkg.packaging_name,
          severity: 'high',
          type: 'empty_space',
          message: `Empty space ${pkg.empty_space_ratio}% exceeds 40% limit`,
          action: 'Redesign to reduce void space'
        });
      }
    }
    
    // Create notifications for critical alerts
    const user = await base44.auth.me();
    for (const alert of alerts.filter(a => a.severity === 'critical')) {
      try {
        await base44.entities.Notification.create({
          user_email: user.email,
          title: `PPWR Alert: ${alert.type}`,
          message: `${alert.packaging_name}: ${alert.message}`,
          type: 'compliance_alert',
          priority: 'high',
          read: false,
          action_url: '/PPWR?tab=compliance'
        });
      } catch (error) {
        console.log('Notification creation skipped:', error.message);
      }
    }
    
    return alerts;
  }
}

export default PPWRMasterOrchestrator;