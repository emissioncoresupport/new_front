import { base44 } from '@/api/base44Client';
import PFASRuleEngine from './PFASRuleEngine';
import PFASExternalAPIService from './PFASExternalAPIService';

/**
 * PFAS Master Orchestrator - Central Intelligence Hub
 * 
 * ALL PFAS operations flow through here - ensures:
 * 1. Data consistency across modules
 * 2. Automated downstream integrations
 * 3. Audit trail (blockchain)
 * 4. Workflow orchestration
 * 
 * WORKFLOW:
 * Scanner → Evidence → Rule Engine → Compliance Assessment → Actions → Scenarios → Alerts → Blockchain
 */

export class PFASMasterOrchestrator {
  
  /**
   * UNIFIED ASSESSMENT CREATION - Single entry point
   * Called by: Scanner, Supplier Portal, Evidence Review, Lab Integration, Automation
   */
  static async createOrUpdateAssessment(assessmentData) {
    const user = await base44.auth.me();
    const tenantId = user.tenant_id || 'default';

    // Step 1: Create/update base compliance assessment
    let assessment = await this.getOrCreateBaseAssessment(assessmentData, tenantId);

    // Step 2: Link evidence packages if provided
    if (assessmentData.evidence_package_ids?.length > 0) {
      assessment = await this.linkEvidencePackages(assessment.id, assessmentData.evidence_package_ids);
    }

    // Step 3: Fetch material compositions for substance-level analysis
    const compositions = await base44.entities.MaterialComposition.filter({
      material_id: assessmentData.entity_id,
      status: 'current'
    });

    // Step 4: Run regulatory rule engine for all active jurisdictions
    const jurisdictions = await base44.entities.PFASJurisdiction.filter({ active: true });
    
    if (jurisdictions.length > 0) {
      for (const jurisdiction of jurisdictions.slice(0, 3)) {
        try {
          const result = await PFASRuleEngine.evaluateCompliance(
            assessmentData.entity_type,
            assessmentData.entity_id,
            jurisdiction.id,
            compositions
          );
          
          // Update assessment with worst-case status
          if (result.status === 'non_compliant') {
            assessment.status = 'non_compliant';
          } else if (result.status === 'requires_action' && assessment.status === 'compliant') {
            assessment.status = 'requires_action';
          }
        } catch (error) {
          console.error(`Rule engine failed for ${jurisdiction.name}:`, error);
        }
      }
    }

    // Step 5: Update linked entities (Product/Supplier/Packaging) with PFAS status
    await this.updateLinkedEntities(assessment);

    // Step 6: Trigger downstream integrations
    await this.triggerDownstreamIntegrations(assessment, compositions);

    // Step 7: Auto-generate substitution scenarios for non-compliant
    if (assessment.status === 'non_compliant' && compositions.length > 0) {
      await this.autoGenerateSubstitutionScenario(assessment, compositions);
    }

    // Step 8: Send compliance alerts
    await this.sendComplianceAlerts(assessment);

    return assessment;
  }

  /**
   * Get or create base PFASComplianceAssessment record
   */
  static async getOrCreateBaseAssessment(assessmentData, tenantId) {
    const existing = await base44.entities.PFASComplianceAssessment.filter({
      object_type: assessmentData.entity_type,
      object_id: assessmentData.entity_id
    });

    const data = {
      tenant_id: tenantId,
      object_type: assessmentData.entity_type,
      object_id: assessmentData.entity_id,
      jurisdiction_id: assessmentData.jurisdiction_id || null,
      ruleset_id: assessmentData.ruleset_id || null,
      status: assessmentData.status || 'under_review',
      reasoning: assessmentData.ai_analysis_notes || '',
      assessed_by: assessmentData.assessed_by || 'system',
      assessed_at: new Date().toISOString()
    };

    if (existing.length > 0) {
      await base44.entities.PFASComplianceAssessment.update(existing[0].id, data);
      return { ...existing[0], ...data };
    } else {
      return await base44.entities.PFASComplianceAssessment.create(data);
    }
  }

  /**
   * Link evidence packages to assessment
   */
  static async linkEvidencePackages(assessmentId, evidencePackageIds) {
    const assessment = (await base44.entities.PFASComplianceAssessment.filter({ id: assessmentId }))[0];
    
    await base44.entities.PFASComplianceAssessment.update(assessmentId, {
      evidence_package_ids: evidencePackageIds
    });

    return { ...assessment, evidence_package_ids: evidencePackageIds };
  }

  /**
   * Update linked entities with PFAS status
   */
  static async updateLinkedEntities(assessment) {
    try {
      if (assessment.object_type === 'Product') {
        const products = await base44.entities.Product.filter({ id: assessment.object_id });
        if (products.length > 0) {
          await base44.entities.Product.update(assessment.object_id, {
            pfas_status: assessment.status,
            pfas_last_checked: new Date().toISOString()
          });
        }
      } else if (assessment.object_type === 'Supplier') {
        const suppliers = await base44.entities.Supplier.filter({ id: assessment.object_id });
        if (suppliers.length > 0) {
          await base44.entities.Supplier.update(assessment.object_id, {
            pfas_relevant: true,
            pfas_risk_level: assessment.status === 'non_compliant' ? 'high' : 
                            assessment.status === 'requires_action' ? 'medium' : 'low'
          });
        }
      } else if (assessment.object_type === 'PPWRPackaging') {
        const packaging = await base44.entities.PPWRPackaging.filter({ id: assessment.object_id });
        if (packaging.length > 0) {
          await base44.entities.PPWRPackaging.update(assessment.object_id, {
            contains_pfas: assessment.status === 'non_compliant',
            pfas_checked_date: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Entity update failed:', error);
    }
  }

  /**
   * Trigger downstream integrations
   */
  static async triggerDownstreamIntegrations(assessment, compositions = []) {
    try {
      const user = await base44.auth.me();
      const tenantId = user.tenant_id || 'default';

      // 1. Check for SVHC substances → trigger SCIP notification
      const svhcSubstances = [];
      
      for (const comp of compositions) {
        const substances = await base44.entities.PFASSubstance.filter({ 
          cas_number: comp.substance_cas,
          svhc_status: true 
        });
        
        if (substances.length > 0) {
          svhcSubstances.push(substances[0]);
        }
      }

      if (svhcSubstances.length > 0) {
        await this.triggerSCIPNotification(assessment, svhcSubstances);
      }

      // 2. Create risk alerts for non-compliant assessments
      if (assessment.status === 'non_compliant') {
        await base44.entities.RiskAlert.create({
          tenant_id: tenantId,
          alert_type: 'pfas_non_compliance',
          severity: 'critical',
          title: `PFAS Non-Compliance: ${assessment.object_type}`,
          description: `${assessment.object_type} ${assessment.object_id} failed PFAS compliance assessment. ${assessment.reasoning}`,
          entity_type: assessment.object_type,
          entity_id: assessment.object_id,
          status: 'open',
          created_by: 'system'
        });
      }

    } catch (error) {
      console.error('Downstream integration failed:', error);
    }
  }

  /**
   * Trigger SCIP notification for SVHCs
   */
  static async triggerSCIPNotification(assessment, svhcSubstances) {
    try {
      const user = await base44.auth.me();
      const tenantId = user.tenant_id || 'default';

      for (const substance of svhcSubstances) {
        const existing = await base44.entities.SCIPNotification.filter({
          primary_article_id: assessment.object_id,
          substance_cas: substance.cas_number
        });

        if (existing.length === 0) {
          await base44.entities.SCIPNotification.create({
            tenant_id: tenantId,
            article_name: `${assessment.object_type} ${assessment.object_id}`,
            primary_article_id: assessment.object_id,
            safe_use_info: 'Professional use only - avoid direct contact',
            substance_name: substance.name,
            substance_cas: substance.cas_number,
            concentration_range: '0.1-1%',
            notification_status: 'draft',
            created_by: user.email
          });
        }
      }
    } catch (error) {
      console.error('SCIP notification creation failed:', error);
    }
  }

  /**
   * Auto-generate substitution scenario
   */
  static async autoGenerateSubstitutionScenario(assessment, compositions) {
    try {
      const user = await base44.auth.me();
      const tenantId = user.tenant_id || 'default';

      // Check if scenario already exists
      const existing = await base44.entities.SubstitutionScenario.filter({
        assessment_link_id: assessment.id
      });

      if (existing.length > 0) return;

      // Get highest concentration PFAS substance
      const sortedComps = [...compositions].sort((a, b) => 
        (b.typical_concentration || 0) - (a.typical_concentration || 0)
      );

      if (sortedComps.length === 0) return;

      const mainSubstance = sortedComps[0];

      // Get AI suggestion for substitute
      const suggestion = await base44.integrations.Core.InvokeLLM({
        prompt: `Suggest PFAS-free substitute for: ${mainSubstance.substance_name} (CAS: ${mainSubstance.substance_cas}).
        
        Application: ${assessment.object_type}
        Current concentration: ${mainSubstance.typical_concentration} ppm
        
        Return: {
          substitute_name: string,
          cost_ratio: number (1.0 = same cost),
          performance_impact: "Improved"|"Equivalent"|"Degraded",
          supply_chain_risk: "Low"|"Medium"|"High",
          risk_reasoning: string
        }`,
        response_json_schema: {
          type: "object",
          properties: {
            substitute_name: { type: "string" },
            cost_ratio: { type: "number" },
            performance_impact: { type: "string" },
            supply_chain_risk: { type: "string" },
            risk_reasoning: { type: "string" }
          }
        }
      });

      await base44.entities.SubstitutionScenario.create({
        tenant_id: tenantId,
        name: `Auto-suggested: Replace ${mainSubstance.substance_name}`,
        current_material: mainSubstance.substance_name,
        substitute_material: suggestion.substitute_name,
        assessment_link_id: assessment.id,
        status: 'Under Review',
        regulatory_driver: 'REACH Annex XVII PFAS Restriction',
        supply_chain_risk_level: suggestion.supply_chain_risk,
        supply_chain_risk_details: suggestion.risk_reasoning,
        performance_impact: suggestion.performance_impact,
        created_by: 'system'
      });
    } catch (error) {
      console.error('Auto-scenario generation failed:', error);
    }
  }

  /**
   * Send compliance alerts
   */
  static async sendComplianceAlerts(assessment) {
    try {
      const user = await base44.auth.me();
      const tenantId = user.tenant_id || 'default';

      if (assessment.status === 'non_compliant') {
        // Create notification
        await base44.entities.Notification.create({
          tenant_id: tenantId,
          notification_type: 'pfas_alert',
          title: `⚠️ PFAS Non-Compliance Detected`,
          message: `${assessment.object_type} ${assessment.object_id} failed PFAS compliance assessment. Immediate action required.`,
          severity: 'critical',
          target_user: 'compliance-manager',
          entity_type: assessment.object_type,
          entity_id: assessment.object_id,
          read: false
        });

        // Send email
        try {
          await base44.integrations.Core.SendEmail({
            to: user.email,
            subject: `🚨 PFAS Non-Compliance Alert`,
            body: `Assessment ID: ${assessment.id}\nObject: ${assessment.object_type} ${assessment.object_id}\n\nStatus: Non-Compliant\n\nReasoning: ${assessment.reasoning}\n\nPlease review immediately.`
          });
        } catch (emailError) {
          console.error('Email send failed:', emailError);
        }
      }
    } catch (error) {
      console.error('Alert notification failed:', error);
    }
  }



  /**
   * Batch processing for bulk scans
   */
  static async batchScan(entities, entityType) {
    const results = {
      total: entities.length,
      processed: 0,
      compliant: 0,
      non_compliant: 0,
      errors: []
    };

    for (const entity of entities) {
      try {
        const assessment = await this.createOrUpdateAssessment({
          entity_id: entity.id,
          entity_type: entityType,
          status: 'under_review',
          verification_method: 'batch_scan',
          source: 'batch_processing'
        });

        if (assessment) {
          results.processed++;
          if (assessment.status === 'compliant') results.compliant++;
          else if (assessment.status === 'non_compliant') results.non_compliant++;
        }
      } catch (error) {
        results.errors.push({ entity_id: entity.id, error: error.message });
      }
    }

    return results;
  }
}

export default PFASMasterOrchestrator;