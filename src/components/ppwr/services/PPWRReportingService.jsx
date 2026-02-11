/**
 * PPWR Reporting Service
 * XML/XBRL export, EPR automated reporting, national authority submissions
 */

import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export class PPWRReportingService {
  
  /**
   * Generate XML report for national authority submission
   * Format: Based on upcoming EU standard (to be adopted by Dec 31, 2026)
   */
  static async generateXMLReport(packaging, options = {}) {
    try {
      const xmlData = {
        report_type: 'ppwr_packaging_declaration',
        version: '1.0',
        generated_date: new Date().toISOString(),
        packaging_data: {
          identification: {
            packaging_id: packaging.id,
            packaging_name: packaging.packaging_name,
            manufacturer_id: packaging.manufacturer_id,
            gtin: packaging.gtin || null,
            sku_reference: packaging.sku_id
          },
          material_composition: {
            primary_material: packaging.material_category,
            material_subcategory: packaging.material_subcategory,
            total_weight_kg: packaging.total_weight_kg,
            detailed_composition: packaging.label_material_composition
          },
          recycled_content: {
            percentage: packaging.recycled_content_percentage || 0,
            verification_method: packaging.recycled_content_verification_method || 'mass_balance',
            verified: packaging.recycled_content_verified || false,
            verification_certificate_url: packaging.verification_certificate_url
          },
          recyclability: {
            score: packaging.recyclability_score || 0,
            assessment_method: 'eu_standard',
            recycling_stream: this.determineRecyclingStream(packaging),
            collection_system: packaging.drs_eligible ? 'DRS' : 'separate_collection'
          },
          reusability: {
            is_reusable: packaging.is_reusable || false,
            reuse_cycles: packaging.reuse_cycles || 0,
            reuse_system: packaging.reuse_system || 'none'
          },
          compliance: {
            pfas_free: !packaging.contains_pfas,
            bisphenol_free: !packaging.contains_bisphenols,
            empty_space_ratio: packaging.empty_space_ratio,
            epr_registered: packaging.epr_registered,
            epr_scheme_id: packaging.epr_scheme_id,
            labeling_compliant: packaging.labeling_compliant
          },
          market_placement: {
            import_date: packaging.import_date,
            placed_on_market_date: packaging.placed_on_market_date,
            member_state: options.member_state || 'DE'
          }
        }
      };
      
      // Convert to XML string
      const xml = this.objectToXML(xmlData, 'PPWR_Declaration');
      
      return {
        xml: xml,
        filename: `PPWR_${packaging.packaging_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xml`,
        valid: true
      };
      
    } catch (error) {
      console.error('XML generation error:', error);
      throw error;
    }
  }
  
  /**
   * Automated EPR reporting pipeline
   * Generates and submits quarterly/annual reports to EPR schemes
   */
  static async generateEPRReport(period, memberState = 'DE') {
    try {
      const packaging = await base44.entities.PPWRPackaging.filter({
        epr_registered: true
      });
      
      // Group by EPR scheme
      const byScheme = {};
      packaging.forEach(pkg => {
        const scheme = pkg.epr_scheme_id || 'unknown';
        if (!byScheme[scheme]) {
          byScheme[scheme] = [];
        }
        byScheme[scheme].push(pkg);
      });
      
      const reports = [];
      
      for (const [schemeId, items] of Object.entries(byScheme)) {
        const totalWeight = items.reduce((sum, p) => sum + (p.total_weight_kg || 0), 0);
        const avgRecycledContent = items.length > 0
          ? items.reduce((sum, p) => sum + (p.recycled_content_percentage || 0), 0) / items.length
          : 0;
        
        // Calculate fees (simplified)
        const totalFees = items.reduce((sum, p) => {
          const baseFee = (p.total_weight_kg || 0) * 0.50; // Example rate
          return sum + baseFee;
        }, 0);
        
        const report = {
          epr_scheme_id: schemeId,
          reporting_period: period,
          member_state: memberState,
          total_packaging_count: items.length,
          total_weight_kg: totalWeight,
          breakdown_by_material: this.getMaterialBreakdown(items),
          avg_recycled_content: Math.round(avgRecycledContent),
          total_fees_eur: totalFees,
          payment_status: 'pending',
          generated_date: new Date().toISOString(),
          items: items.map(p => ({
            packaging_id: p.id,
            packaging_name: p.packaging_name,
            material: p.material_category,
            weight_kg: p.total_weight_kg,
            fee_eur: (p.total_weight_kg || 0) * 0.50
          }))
        };
        
        reports.push(report);
        
        // Save EPR report
        await base44.entities.PPWREPRReport?.create({
          ...report,
          status: 'draft'
        }).catch(() => {
          // Entity might not exist yet
          console.log('PPWREPRReport entity not found - skipping save');
        });
      }
      
      toast.success(`Generated ${reports.length} EPR reports for ${period}`);
      return reports;
      
    } catch (error) {
      console.error('EPR report error:', error);
      toast.error('EPR report generation failed');
      throw error;
    }
  }
  
  /**
   * Submit report to national authority API (simulated)
   */
  static async submitToAuthority(xmlReport, memberState = 'DE') {
    try {
      // In production: would POST to actual national authority API
      // Each MS has different endpoints and authentication
      
      const endpoints = {
        'DE': 'https://verpackungsregister.org/api/submit',
        'FR': 'https://citeo.com/api/declarations',
        'NL': 'https://afvalfondsverpakkingen.nl/api/submit',
        // ... other Member States
      };
      
      const endpoint = endpoints[memberState];
      if (!endpoint) {
        throw new Error(`No submission endpoint configured for ${memberState}`);
      }
      
      // Simulated submission
      toast.info('Submitting to national authority...');
      
      // Would do: await fetch(endpoint, { method: 'POST', body: xmlReport.xml, ... })
      
      const confirmationNumber = `PPWR-${memberState}-${Date.now()}`;
      
      return {
        submitted: true,
        confirmation_number: confirmationNumber,
        submission_date: new Date().toISOString(),
        member_state: memberState,
        status: 'accepted',
        message: 'Report successfully submitted (simulated)'
      };
      
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Submission failed');
      throw error;
    }
  }
  
  /**
   * Helper: Convert object to XML string
   */
  static objectToXML(obj, rootName = 'root') {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n`;
    
    const convert = (obj, indent = 2) => {
      let result = '';
      for (const [key, value] of Object.entries(obj)) {
        const spaces = ' '.repeat(indent);
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          result += `${spaces}<${key}>\n${convert(value, indent + 2)}${spaces}</${key}>\n`;
        } else if (Array.isArray(value)) {
          value.forEach(item => {
            if (typeof item === 'object') {
              result += `${spaces}<${key}>\n${convert(item, indent + 2)}${spaces}</${key}>\n`;
            } else {
              result += `${spaces}<${key}>${this.escapeXML(item)}</${key}>\n`;
            }
          });
        } else {
          result += `${spaces}<${key}>${this.escapeXML(value)}</${key}>\n`;
        }
      }
      return result;
    };
    
    xml += convert(obj);
    xml += `</${rootName}>`;
    
    return xml;
  }
  
  static escapeXML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  
  static determineRecyclingStream(packaging) {
    const streams = {
      'Plastic': 'plastic_packaging',
      'Paper/Cardboard': 'paper_cardboard',
      'Glass': 'glass',
      'Metal': 'metal',
      'Wood': 'wood',
      'Composite': 'mixed_materials'
    };
    return streams[packaging.material_category] || 'other';
  }
  
  static getMaterialBreakdown(items) {
    const breakdown = {};
    items.forEach(item => {
      const mat = item.material_category || 'Unknown';
      breakdown[mat] = (breakdown[mat] || 0) + (item.total_weight_kg || 0);
    });
    return breakdown;
  }
}

export default PPWRReportingService;