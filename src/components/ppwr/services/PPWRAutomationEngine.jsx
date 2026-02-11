/**
 * PPWR Automation Engine
 * Real-time compliance monitoring & automated checks per Regulation (EU) 2024/1852
 * Entry into force: 11 Feb 2025 | Application: 12 Aug 2026
 */

import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export class PPWRAutomationEngine {
  
  /**
   * Automated compliance check for packaging item
   * Validates against all PPWR requirements (Dec 2025 standards)
   */
  static async runComplianceCheck(packaging) {
    const issues = [];
    const warnings = [];
    let complianceStatus = 'Compliant';
    
    // 1. Recycled Content Target Check (Art. 7)
    const pcrTargets = {
      'Plastic': { 2030: 30, 2040: 65 },
      'PET': { 2030: 30, 2040: 65 }
    };
    
    const materialTarget = pcrTargets[packaging.material_category] || pcrTargets[packaging.material_subcategory];
    if (materialTarget) {
      const currentYear = new Date().getFullYear();
      const targetYear = currentYear >= 2040 ? 2040 : 2030;
      const targetPCR = materialTarget[targetYear];
      
      if ((packaging.recycled_content_percentage || 0) < targetPCR) {
        const gap = targetPCR - (packaging.recycled_content_percentage || 0);
        issues.push({
          type: 'recycled_content',
          severity: gap > 10 ? 'critical' : 'warning',
          message: `PCR below ${targetYear} target: ${packaging.recycled_content_percentage || 0}% vs ${targetPCR}% required`,
          regulation: 'Art. 7 - Recycled Content Requirements',
          gap: gap,
          action: 'Increase recycled content or request supplier declaration'
        });
        complianceStatus = gap > 10 ? 'Critical' : 'Warning';
      }
    }
    
    // 2. Empty Space Ratio (Art. 9) - Max 40%
    if (['E-commerce', 'Transport'].includes(packaging.packaging_format)) {
      if ((packaging.empty_space_ratio || 0) > 40) {
        issues.push({
          type: 'empty_space',
          severity: 'critical',
          message: `Excessive empty space: ${packaging.empty_space_ratio}% (max 40% allowed)`,
          regulation: 'Art. 9 - Excessive Empty Space Ban',
          action: 'Redesign packaging to reduce void space'
        });
        complianceStatus = 'Critical';
      }
    }
    
    // 3. PFAS Ban (Art. 8) - Zero tolerance from 2026
    if (packaging.contains_pfas) {
      issues.push({
        type: 'pfas',
        severity: 'critical',
        message: 'PFAS substances detected - banned from 2026',
        regulation: 'Art. 8 - Hazardous Substances Ban',
        action: 'Remove PFAS immediately - find alternative materials'
      });
      complianceStatus = 'Critical';
    }
    
    // 4. Bisphenol Restrictions (Art. 8)
    if (packaging.contains_bisphenols) {
      warnings.push({
        type: 'bisphenol',
        severity: 'warning',
        message: 'Bisphenol A/S/F detected - restricted use',
        regulation: 'Art. 8 - Hazardous Substances Restrictions',
        action: 'Phase out bisphenols where possible'
      });
    }
    
    // 5. Labeling Compliance (Art. 11)
    if (!packaging.labeling_compliant) {
      issues.push({
        type: 'labeling',
        severity: 'warning',
        message: 'Labeling requirements not met',
        regulation: 'Art. 11 - Labeling Requirements',
        action: 'Add material composition and recyclability labels'
      });
      if (complianceStatus === 'Compliant') complianceStatus = 'Warning';
    }
    
    // 6. EPR Registration (Art. 48)
    if (!packaging.epr_registered) {
      issues.push({
        type: 'epr',
        severity: 'critical',
        message: 'Not registered with EPR scheme',
        regulation: 'Art. 48 - EPR Obligations',
        action: 'Register with national EPR organization'
      });
      complianceStatus = 'Critical';
    }
    
    // 7. Due Diligence (Art. 12)
    if (!packaging.due_diligence_completed) {
      warnings.push({
        type: 'due_diligence',
        severity: 'warning',
        message: 'Supply chain due diligence not completed',
        regulation: 'Art. 12 - Due Diligence',
        action: 'Complete supplier verification'
      });
    }
    
    // 8. Recyclability Score (Design for Recycling)
    if ((packaging.recyclability_score || 0) < 50) {
      warnings.push({
        type: 'recyclability',
        severity: 'warning',
        message: `Low recyclability score: ${packaging.recyclability_score || 0}/100`,
        regulation: 'Art. 6 - Design for Recycling',
        action: 'Optimize design for better recyclability'
      });
    }
    
    // 9. Reusability Mandate (Art. 26) - For applicable formats
    if (['Transport', 'Sales'].includes(packaging.packaging_format)) {
      if (!packaging.is_reusable && packaging.packaging_format === 'Transport') {
        warnings.push({
          type: 'reusability',
          severity: 'warning',
          message: 'Transport packaging should be reusable (40% target by 2030)',
          regulation: 'Art. 26 - Reuse Targets',
          action: 'Consider reusable design alternatives'
        });
      }
    }
    
    // 10. Digital Passport (Art. 10)
    if (!packaging.digital_passport_id) {
      warnings.push({
        type: 'digital_passport',
        severity: 'info',
        message: 'Digital Product Passport not created',
        regulation: 'Art. 10 - Digital Information',
        action: 'Generate DPP with QR code'
      });
    }
    
    return {
      compliant: complianceStatus === 'Compliant',
      status: complianceStatus,
      issues: issues,
      warnings: warnings,
      score: this.calculateComplianceScore(issues, warnings),
      nextActions: this.prioritizeActions(issues, warnings),
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Calculate overall compliance score (0-100)
   */
  static calculateComplianceScore(issues, warnings) {
    const criticalPenalty = issues.filter(i => i.severity === 'critical').length * 15;
    const warningPenalty = issues.filter(i => i.severity === 'warning').length * 5;
    const infoPenalty = warnings.length * 2;
    
    return Math.max(0, 100 - criticalPenalty - warningPenalty - infoPenalty);
  }
  
  /**
   * Prioritize remediation actions
   */
  static prioritizeActions(issues, warnings) {
    const allItems = [...issues, ...warnings];
    return allItems
      .sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
      .slice(0, 5)
      .map(item => item.action);
  }
  
  /**
   * Automated batch compliance check for all packaging
   */
  static async runBatchCompliance(packagingList) {
    const results = {
      total: packagingList.length,
      compliant: 0,
      warnings: 0,
      critical: 0,
      avgScore: 0,
      items: []
    };
    
    for (const pkg of packagingList) {
      const check = await this.runComplianceCheck(pkg);
      results.items.push({ id: pkg.id, name: pkg.packaging_name, ...check });
      
      if (check.status === 'Compliant') results.compliant++;
      else if (check.status === 'Warning') results.warnings++;
      else if (check.status === 'Critical') results.critical++;
      
      results.avgScore += check.score;
    }
    
    results.avgScore = packagingList.length > 0 
      ? Math.round(results.avgScore / packagingList.length) 
      : 0;
    
    return results;
  }
  
  /**
   * Monitor for regulatory changes (simulated - would connect to EU API)
   */
  static async checkRegulatoryUpdates() {
    // In production: fetch from EUR-Lex API or dedicated regulatory monitoring service
    const updates = [
      {
        date: '2025-12-15',
        type: 'amendment',
        title: 'Updated PCR calculation methodology published',
        regulation: 'Commission Delegated Regulation - Art. 7',
        impact: 'medium',
        action_required: 'Review mass balance documentation'
      }
    ];
    
    return updates;
  }
  
  /**
   * Auto-update packaging compliance status
   */
  static async autoUpdateCompliance(packagingId) {
    const packaging = await base44.entities.PPWRPackaging.filter({ id: packagingId });
    if (!packaging.length) return;
    
    const check = await this.runComplianceCheck(packaging[0]);
    
    await base44.entities.PPWRPackaging.update(packagingId, {
      compliance_status: check.status,
      last_compliance_check: new Date().toISOString(),
      compliance_score: check.score
    });
    
    return check;
  }
}

export default PPWRAutomationEngine;