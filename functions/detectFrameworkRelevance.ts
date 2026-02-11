import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { country, supplier_type, manufacturing_countries, certifications, entity_type } = await req.json();

    const frameworks = {
      cbam: false,
      eudr: false,
      pfas: false,
      ppwr: false,
      csrd: false,
      dpp: false,
      eudamed: false
    };

    const reasons = {};

    // CBAM: EU importer, high-carbon sectors (cement, steel, chemicals, fertilizers, aluminum)
    if (country && ['DE', 'FR', 'NL', 'BE', 'AT', 'SE', 'DK', 'FI', 'IE', 'LU'].includes(country)) {
      const cbam_sectors = ['cement', 'steel', 'fertilizer', 'chemical', 'aluminum', 'iron', 'glass'];
      if (supplier_type && cbam_sectors.some(s => supplier_type.toLowerCase().includes(s))) {
        frameworks.cbam = true;
        reasons.cbam = `Manufacturing country relevant to CBAM scope`;
      }
      if (manufacturing_countries && manufacturing_countries.some(c => !['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'].includes(c))) {
        frameworks.cbam = true;
        reasons.cbam = `Non-EU manufacturing detected`;
      }
    }

    // EUDR: Forests/deforestation risk commodities (cattle, cocoa, coffee, palm, soy, wood)
    const eudr_commodities = ['cattle', 'cocoa', 'coffee', 'palm', 'soy', 'wood', 'forest', 'agricultural', 'timber'];
    if (supplier_type && eudr_commodities.some(c => supplier_type.toLowerCase().includes(c))) {
      frameworks.eudr = true;
      reasons.eudr = `EUDR-relevant commodity detected`;
    }
    if (manufacturing_countries && ['ID', 'MY', 'BR', 'CD', 'GA', 'MM'].includes(...manufacturing_countries)) {
      frameworks.eudr = true;
      reasons.eudr = `High-deforestation-risk country detected`;
    }

    // PFAS: Chemicals, textiles, fluoropolymers, aqueous film formers
    const pfas_sectors = ['chemical', 'textile', 'fluoropolymer', 'foam', 'coating', 'oil', 'apparel'];
    if (supplier_type && pfas_sectors.some(s => supplier_type.toLowerCase().includes(s))) {
      frameworks.pfas = true;
      reasons.pfas = `PFAS-relevant sector detected`;
    }

    // PPWR: Packaging, batteries
    const ppwr_sectors = ['packaging', 'battery', 'electric', 'automotive'];
    if (supplier_type && ppwr_sectors.some(s => supplier_type.toLowerCase().includes(s))) {
      frameworks.ppwr = true;
      reasons.ppwr = `PPWR-relevant product detected`;
    }

    // EUDAMED: Medical devices
    if (entity_type === 'PRODUCT' || (supplier_type && supplier_type.toLowerCase().includes('medical'))) {
      frameworks.eudamed = true;
      reasons.eudamed = `Medical device sector detected`;
    }

    // CSRD: Large companies (>250 employees, >€50M revenue) - assume relevant
    frameworks.csrd = true;
    reasons.csrd = `CSRD applies to all large EU companies from 2025`;

    // DPP: All products sold in EU
    frameworks.dpp = true;
    reasons.dpp = `DPP applies to all products in scope`;

    return Response.json({
      success: true,
      frameworks: Object.keys(frameworks).filter(k => frameworks[k]),
      framework_details: reasons,
      recommendation: `Supplier is relevant to: ${Object.keys(frameworks).filter(k => frameworks[k]).join(', ')}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});