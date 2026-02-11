import { base44 } from '@/api/base44Client';

/**
 * PFAS Rule Engine - Evaluates regulatory rules against assessments
 * Ensures audit-safe compliance decisions with full traceability
 */

export class PFASRuleEngine {
  
  /**
   * Evaluate all applicable rules for a given object in a jurisdiction
   */
  static async evaluateCompliance(objectType, objectId, jurisdictionId, materialCompositions = []) {
    const user = await base44.auth.me();
    const tenantId = user.tenant_id || 'default';
    
    // Fetch jurisdiction
    const jurisdictions = await base44.entities.PFASJurisdiction.filter({ id: jurisdictionId });
    const jurisdiction = jurisdictions[0];
    
    if (!jurisdiction) {
      throw new Error('Jurisdiction not found');
    }
    
    // Fetch active rulesets for this jurisdiction
    const rulesets = await base44.entities.PFASRuleset.filter({
      jurisdiction_id: jurisdictionId,
      status: 'active'
    });
    
    if (rulesets.length === 0) {
      return {
        status: 'insufficient_data',
        reasoning: 'No active rulesets found for jurisdiction',
        triggered_rules: []
      };
    }
    
    // Evaluate each ruleset's rules
    const triggeredRules = [];
    let overallStatus = 'compliant';
    const reasoning = [];
    
    for (const ruleset of rulesets) {
      const rules = await base44.entities.PFASRule.filter({ ruleset_id: ruleset.id });
      
      for (const rule of rules) {
        const evaluation = await this.evaluateRule(rule, objectType, materialCompositions);
        
        if (evaluation.triggered) {
          triggeredRules.push({
            rule_id: rule.id,
            rule_number: rule.rule_number,
            severity: rule.severity,
            actions: rule.actions_json,
            reasoning: evaluation.reasoning
          });
          
          if (rule.severity === 'critical') {
            overallStatus = 'non_compliant';
          } else if (rule.severity === 'warning' && overallStatus === 'compliant') {
            overallStatus = 'requires_action';
          }
          
          reasoning.push(evaluation.reasoning);
        }
      }
    }
    
    // Create PFASComplianceAssessment record
    const assessment = await base44.entities.PFASComplianceAssessment.create({
      tenant_id: tenantId,
      object_type: objectType,
      object_id: objectId,
      jurisdiction_id: jurisdictionId,
      ruleset_id: rulesets[0].id, // Primary ruleset
      status: overallStatus,
      reasoning: reasoning.join('\n\n'),
      evidence_package_ids: [], // To be linked by caller
      decision_snapshot: {
        evaluated_at: new Date().toISOString(),
        rulesets_evaluated: rulesets.map(r => r.id),
        triggered_rules: triggeredRules,
        material_compositions: materialCompositions
      },
      assessed_by: user.email,
      assessed_at: new Date().toISOString()
    });
    
    // Generate actions for each triggered rule
    for (const triggered of triggeredRules) {
      if (triggered.actions?.action_types) {
        for (const actionType of triggered.actions.action_types) {
          await base44.entities.PFASAction.create({
            tenant_id: tenantId,
            assessment_id: assessment.id,
            action_type: actionType,
            owner: user.email,
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            priority: triggered.severity === 'critical' ? 'critical' : 'high',
            description: `Action required based on ${triggered.rule_number}: ${triggered.reasoning}`,
            status: 'open'
          });
        }
      }
    }
    
    return {
      assessment,
      status: overallStatus,
      triggered_rules: triggeredRules,
      reasoning: reasoning.join('\n\n')
    };
  }
  
  /**
   * Evaluate a single rule against material compositions
   */
  static async evaluateRule(rule, objectType, materialCompositions) {
    // Check if rule applies to this object type
    if (rule.scope !== objectType && rule.scope !== 'material') {
      return { triggered: false };
    }
    
    const condition = rule.condition_json;
    const thresholds = rule.thresholds_json;
    
    // Evaluate condition logic
    let triggered = false;
    let reasoning = '';
    
    // Example: Check if any PFAS substances exceed thresholds
    if (thresholds.max_concentration_ppm) {
      const exceedances = materialCompositions.filter(comp => 
        comp.substance_cas && 
        comp.typical_concentration > thresholds.max_concentration_ppm
      );
      
      if (exceedances.length > 0) {
        triggered = true;
        reasoning = `${exceedances.length} substance(s) exceed threshold of ${thresholds.max_concentration_ppm} ppm: ${exceedances.map(e => e.substance_name).join(', ')}`;
      }
    }
    
    // Check aggregate PFAS limit
    if (thresholds.aggregate_pfas_ppm) {
      const totalPFAS = materialCompositions
        .filter(comp => comp.substance_cas) // Assume all tracked substances are PFAS for now
        .reduce((sum, comp) => sum + (comp.typical_concentration || 0), 0);
      
      if (totalPFAS > thresholds.aggregate_pfas_ppm) {
        triggered = true;
        reasoning += ` Total PFAS concentration (${totalPFAS.toFixed(2)} ppm) exceeds aggregate limit of ${thresholds.aggregate_pfas_ppm} ppm.`;
      }
    }
    
    // Check exemptions
    if (triggered && rule.exemptions_json?.exempted_uses) {
      const isExempt = rule.exemptions_json.exempted_uses.some(use => 
        condition.use_categories?.includes(use)
      );
      
      if (isExempt) {
        triggered = false;
        reasoning += ' [Exemption applied]';
      }
    }
    
    return { triggered, reasoning: reasoning.trim() };
  }
  
  /**
   * Apply manual override with approval workflow
   */
  static async applyOverride(assessmentId, newStatus, justification, expiryDate, requiresApproval = true) {
    const user = await base44.auth.me();
    
    const assessment = await base44.entities.PFASComplianceAssessment.update(assessmentId, {
      status: newStatus,
      override_applied: true,
      override_justification: justification,
      override_by: user.email,
      override_expires: expiryDate
    });
    
    if (requiresApproval && assessment.status === 'compliant') {
      // High-risk overrides need second-person approval
      await base44.entities.PFASAction.create({
        tenant_id: assessment.tenant_id,
        assessment_id: assessmentId,
        action_type: 'escalate',
        owner: 'compliance-manager@company.com', // Configure via settings
        priority: 'critical',
        description: `Approval required for compliance override by ${user.email}: ${justification}`,
        status: 'open',
        escalation_level: 1
      });
    }
    
    return assessment;
  }
}

export default PFASRuleEngine;