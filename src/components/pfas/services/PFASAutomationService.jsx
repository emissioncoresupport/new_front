/**
 * PFAS Automation Service
 * Auto-scanning, monitoring, blockchain integration
 */

import { base44 } from '@/api/base44Client';

export class PFASAutomationService {
  
  /**
   * AUTO-SCAN: Triggered when new supplier is onboarded
   */
  static async autoScanSupplier(supplierId) {
    try {
      const supplier = (await base44.entities.Supplier.filter({ id: supplierId }))[0];
      if (!supplier) return null;

      // AI Analysis with real-time REACH/ECHA check
      const prompt = `Assess PFAS risk for this supplier profile:
      
      Supplier: ${supplier.legal_name || supplier.trade_name}
      Country: ${supplier.country_of_origin || supplier.country}
      Industry: ${supplier.industry_sector || 'Unknown'}
      Products: ${supplier.product_categories || 'Unknown'}
      
      Based on industry sector and country regulations, assess PFAS risk (0-100).
      Check against REACH Annex XVII and ECHA Candidate List.
      
      Return: { status, risk_score, ai_analysis_notes, detected_substances, regulatory_references }`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["Compliant", "Non-Compliant", "Suspected"] },
            risk_score: { type: "number" },
            ai_analysis_notes: { type: "string" },
            detected_substances: { type: "array", items: { type: "object" } },
            regulatory_references: { type: "array", items: { type: "string" } }
          }
        }
      });

      // Create assessment record
      const assessment = await base44.entities.PFASAssessment.create({
        entity_id: supplierId,
        entity_type: 'Supplier',
        name: supplier.legal_name || supplier.trade_name,
        status: analysis.status,
        risk_score: analysis.risk_score,
        detected_substances: analysis.detected_substances || [],
        ai_analysis_notes: analysis.ai_analysis_notes,
        regulatory_references: analysis.regulatory_references || [],
        verification_method: 'ai_analysis',
        last_checked: new Date().toISOString()
      });

      return assessment;

    } catch (error) {
      console.error('Auto-scan failed:', error);
      return null;
    }
  }

  /**
   * AUTO-SCAN: Triggered when new product is created
   */
  static async autoScanProduct(productId) {
    try {
      const product = (await base44.entities.Product.filter({ id: productId }))[0];
      if (!product) return null;

      // Fetch product components/BOM for context
      const components = await base44.entities.ProductComponent.list();
      const productComponents = components.filter(c => c.product_id === productId);

      const contextData = {
        product_name: product.name,
        category: product.category,
        components: productComponents.map(c => ({
          name: c.name,
          material: c.material_type
        }))
      };

      const prompt = `Assess PFAS risk for this product:
      
      ${JSON.stringify(contextData, null, 2)}
      
      Check materials against REACH Annex XVII restrictions and ECHA Candidate List.
      Focus on high-risk materials: textiles (water/stain repellents), cookware (non-stick), electronics (coatings).
      
      Return: { status, risk_score, ai_analysis_notes, detected_substances, regulatory_references }`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            status: { type: "string" },
            risk_score: { type: "number" },
            ai_analysis_notes: { type: "string" },
            detected_substances: { type: "array" },
            regulatory_references: { type: "array" }
          }
        }
      });

      const assessment = await base44.entities.PFASAssessment.create({
        entity_id: productId,
        entity_type: 'Product',
        name: product.name,
        status: analysis.status,
        risk_score: analysis.risk_score,
        detected_substances: analysis.detected_substances || [],
        ai_analysis_notes: analysis.ai_analysis_notes,
        regulatory_references: analysis.regulatory_references || [],
        verification_method: 'ai_analysis',
        last_checked: new Date().toISOString()
      });

      return assessment;

    } catch (error) {
      console.error('Product auto-scan failed:', error);
      return null;
    }
  }

  /**
   * AUTO-SCAN: PPWR Packaging (PFAS check per Art. 8)
   */
  static async autoScanPPWRPackaging(packagingId) {
    try {
      const packaging = (await base44.entities.PPWRPackaging.filter({ id: packagingId }))[0];
      if (!packaging) return null;

      const prompt = `Assess PFAS risk for this packaging:
      
      Name: ${packaging.packaging_name}
      Material: ${packaging.material_category} / ${packaging.material_subcategory || 'Unknown'}
      Format: ${packaging.packaging_format}
      
      Article 8 PPWR bans PFAS in food-contact packaging from 2026.
      Check if this packaging likely contains PFAS based on material type.
      
      Return: { contains_pfas (boolean), risk_score, analysis }`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            contains_pfas: { type: "boolean" },
            risk_score: { type: "number" },
            analysis: { type: "string" }
          }
        }
      });

      // Update PPWR packaging
      await base44.entities.PPWRPackaging.update(packagingId, {
        contains_pfas: analysis.contains_pfas
      });

      // Create PFAS assessment
      const assessment = await base44.entities.PFASAssessment.create({
        entity_id: packagingId,
        entity_type: 'PPWRPackaging',
        name: packaging.packaging_name,
        status: analysis.contains_pfas ? 'Non-Compliant' : 'Compliant',
        risk_score: analysis.risk_score,
        ai_analysis_notes: analysis.analysis,
        verification_method: 'ai_analysis',
        last_checked: new Date().toISOString()
      });

      return assessment;

    } catch (error) {
      console.error('PPWR PFAS auto-scan failed:', error);
      return null;
    }
  }

  /**
   * SCHEDULED: Monthly re-scan of all high-risk assessments
   */
  static async scheduledReScan() {
    const assessments = await base44.entities.PFASAssessment.filter({
      risk_score: { $gte: 50 }
    });

    const results = [];
    for (const assessment of assessments) {
      try {
        if (assessment.entity_type === 'Supplier') {
          const updated = await this.autoScanSupplier(assessment.entity_id);
          results.push({ id: assessment.entity_id, status: 'updated', new_score: updated?.risk_score });
        } else if (assessment.entity_type === 'Product') {
          const updated = await this.autoScanProduct(assessment.entity_id);
          results.push({ id: assessment.entity_id, status: 'updated', new_score: updated?.risk_score });
        }
      } catch (error) {
        results.push({ id: assessment.entity_id, status: 'failed', error: error.message });
      }
    }

    return results;
  }
}

export default PFASAutomationService;