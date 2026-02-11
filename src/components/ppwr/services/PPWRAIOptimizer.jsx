/**
 * PPWR AI Optimizer
 * AI-powered design recommendations, material substitution, circular economy scoring
 */

import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export class PPWRAIOptimizer {
  
  /**
   * Generate design-for-recycling recommendations using AI
   */
  static async generateDesignRecommendations(packaging) {
    try {
      const prompt = `
You are a packaging design expert specializing in EU PPWR compliance (Regulation 2024/1852).

Analyze this packaging and provide design optimization recommendations:

Current Packaging:
- Name: ${packaging.packaging_name}
- Material: ${packaging.material_category} ${packaging.material_subcategory || ''}
- Weight: ${packaging.total_weight_kg} kg
- Recycled Content: ${packaging.recycled_content_percentage || 0}%
- Recyclability Score: ${packaging.recyclability_score || 0}/100
- Reusable: ${packaging.is_reusable ? 'Yes' : 'No'}
- Empty Space: ${packaging.empty_space_ratio || 0}%
- PFAS: ${packaging.contains_pfas ? 'Yes' : 'No'}
- Bisphenols: ${packaging.contains_bisphenols ? 'Yes' : 'No'}

PPWR Requirements:
- Recycled content target: 30% by 2030 for plastic
- Max empty space: 40%
- PFAS banned from 2026
- Reusability target: 40% by 2030

Provide specific, actionable recommendations to improve compliance and circularity.
      `;
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string', enum: ['material', 'design', 'weight_reduction', 'recyclability', 'reusability', 'compliance'] },
                  priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  impact_recycled_content: { type: 'number' },
                  impact_recyclability: { type: 'number' },
                  impact_weight: { type: 'number' },
                  estimated_cost: { type: 'string' },
                  implementation_difficulty: { type: 'string', enum: ['easy', 'moderate', 'complex'] }
                }
              }
            },
            overall_assessment: { type: 'string' },
            compliance_improvement_potential: { type: 'number' },
            estimated_roi_months: { type: 'number' }
          }
        }
      });
      
      return {
        success: true,
        recommendations: response.recommendations || [],
        assessment: response.overall_assessment,
        improvement_potential: response.compliance_improvement_potential,
        roi_months: response.estimated_roi_months
      };
      
    } catch (error) {
      console.error('AI recommendation error:', error);
      toast.error('Failed to generate recommendations');
      throw error;
    }
  }
  
  /**
   * PFAS-free material substitution advisor
   */
  static async suggestPFASAlternatives(packaging) {
    try {
      if (!packaging.contains_pfas) {
        return {
          required: false,
          message: 'No PFAS detected - packaging compliant'
        };
      }
      
      const prompt = `
You are a materials science expert specializing in PFAS-free packaging alternatives.

Current packaging contains PFAS and must be reformulated per EU PPWR Art. 8 (banned from 2026).

Packaging Details:
- Type: ${packaging.packaging_name}
- Material: ${packaging.material_category} ${packaging.material_subcategory || ''}
- Application: ${packaging.packaging_format}
- Current PFAS use: Barrier coating / water resistance

Provide PFAS-free alternatives that maintain performance characteristics.
Consider:
- Recycled content compatibility
- Recyclability impact
- Cost-effectiveness
- Food contact approval (if applicable)
- Commercial availability
      `;
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            alternatives: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  material_name: { type: 'string' },
                  description: { type: 'string' },
                  performance_vs_pfas: { type: 'string' },
                  recyclability_impact: { type: 'string' },
                  cost_factor: { type: 'number' },
                  availability: { type: 'string' },
                  suppliers: { type: 'array', items: { type: 'string' } },
                  food_contact_approved: { type: 'boolean' }
                }
              }
            },
            urgency: { type: 'string' },
            transition_timeline: { type: 'string' }
          }
        }
      });
      
      return {
        required: true,
        urgency: 'critical',
        alternatives: response.alternatives || [],
        transition_timeline: response.transition_timeline
      };
      
    } catch (error) {
      console.error('PFAS alternatives error:', error);
      toast.error('Failed to generate alternatives');
      throw error;
    }
  }
  
  /**
   * Circular economy scoring with AI insights
   */
  static async analyzeCircularityPotential(packaging) {
    try {
      const prompt = `
Analyze the circular economy potential of this packaging:

Packaging:
- Material: ${packaging.material_category}
- Recycled Content: ${packaging.recycled_content_percentage || 0}%
- Recyclability: ${packaging.recyclability_score || 0}/100
- Reusable: ${packaging.is_reusable}
- Reuse Cycles: ${packaging.reuse_cycles || 0}
- Weight: ${packaging.total_weight_kg} kg

Assess:
1. Material circularity (closed-loop potential)
2. Design for disassembly
3. End-of-life recovery rate potential
4. Economic value retention
5. Environmental impact reduction

Provide a comprehensive circularity assessment with specific improvement actions.
      `;
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            circularity_score: { type: 'number' },
            material_circularity_indicator: { type: 'number' },
            end_of_life_recovery_potential: { type: 'number' },
            value_retention_score: { type: 'number' },
            improvement_actions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action: { type: 'string' },
                  impact: { type: 'string' },
                  difficulty: { type: 'string' }
                }
              }
            },
            business_case: { type: 'string' }
          }
        }
      });
      
      return response;
      
    } catch (error) {
      console.error('Circularity analysis error:', error);
      throw error;
    }
  }
  
  /**
   * Penalty risk assessment
   */
  static async assessPenaltyRisk(packaging) {
    try {
      const currentYear = new Date().getFullYear();
      const risks = [];
      let totalRisk = 0;
      
      // Recycled content risk
      if (packaging.material_category === 'Plastic' || packaging.material_subcategory === 'PET') {
        const target = currentYear >= 2040 ? 65 : 30;
        const gap = target - (packaging.recycled_content_percentage || 0);
        if (gap > 0) {
          const riskScore = gap > 10 ? 'high' : 'medium';
          risks.push({
            type: 'recycled_content',
            risk_level: riskScore,
            description: `PCR below ${target}% target`,
            potential_penalty: 'Market access restrictions, EPR fee penalties',
            likelihood: gap > 15 ? 'very_high' : 'high',
            financial_impact_eur: gap * packaging.total_weight_kg * 2 // Estimated penalty
          });
          totalRisk += gap > 10 ? 30 : 15;
        }
      }
      
      // PFAS risk
      if (packaging.contains_pfas) {
        risks.push({
          type: 'pfas_ban',
          risk_level: 'critical',
          description: 'PFAS substances detected - banned from Jan 1, 2026',
          potential_penalty: 'Product recall, market ban, fines up to €500,000',
          likelihood: 'certain',
          financial_impact_eur: 500000
        });
        totalRisk += 50;
      }
      
      // Empty space risk
      if ((packaging.empty_space_ratio || 0) > 40 && ['E-commerce', 'Transport'].includes(packaging.packaging_format)) {
        risks.push({
          type: 'empty_space',
          risk_level: 'high',
          description: 'Excessive empty space violation',
          potential_penalty: 'Non-compliance penalties, EPR surcharges',
          likelihood: 'high',
          financial_impact_eur: 10000
        });
        totalRisk += 20;
      }
      
      // EPR non-registration risk
      if (!packaging.epr_registered) {
        risks.push({
          type: 'epr_non_compliance',
          risk_level: 'critical',
          description: 'Not registered with EPR scheme',
          potential_penalty: 'Market withdrawal, fines, legal action',
          likelihood: 'very_high',
          financial_impact_eur: 50000
        });
        totalRisk += 40;
      }
      
      const overallRisk = totalRisk >= 70 ? 'critical' : totalRisk >= 40 ? 'high' : totalRisk >= 20 ? 'medium' : 'low';
      
      return {
        overall_risk_level: overallRisk,
        risk_score: totalRisk,
        risks: risks,
        total_financial_exposure_eur: risks.reduce((sum, r) => sum + (r.financial_impact_eur || 0), 0),
        immediate_actions: risks.filter(r => r.risk_level === 'critical').map(r => r.description),
        recommended_priority: risks.sort((a, b) => {
          const order = { critical: 0, high: 1, medium: 2, low: 3 };
          return order[a.risk_level] - order[b.risk_level];
        })[0]
      };
      
    } catch (error) {
      console.error('Risk assessment error:', error);
      throw error;
    }
  }
}

export default PPWRAIOptimizer;