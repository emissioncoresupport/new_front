import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * External Data Enrichment Service
 * Auto-fetches data from public sources to enrich supplier profiles
 * - Company registries (OpenCorporates, etc.)
 * - Credit bureaus (D&B, Creditreform)
 * - Sanctions lists (OFAC, EU, UN)
 * - News monitoring
 * - Public sustainability databases
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { supplier_id } = await req.json();

    const supplier = await base44.entities.Supplier.filter({ id: supplier_id });
    if (!supplier || supplier.length === 0) {
      return Response.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const s = supplier[0];
    const enrichedData = {};
    const sources = [];

    // 1. Company Registry Data (using AI + web search)
    try {
      const companyData = await base44.integrations.Core.InvokeLLM({
        prompt: `Search for company information for: ${s.legal_name}, ${s.country}
        
Find and extract:
- Employee count (approximate)
- Annual revenue (if publicly available)
- Legal form (GmbH, AG, Ltd, Inc, etc.)
- Industry sector/NACE code
- Website URL
- Year founded
- Company description

Use official company registries, LinkedIn, company websites.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            employee_count: { type: "integer" },
            annual_revenue_eur: { type: "number" },
            website: { type: "string" },
            nace_code: { type: "string" },
            description: { type: "string" }
          }
        }
      });

      Object.assign(enrichedData, companyData);
      sources.push('Company Registry / Public Records');
    } catch (error) {
      console.error('Company data enrichment failed:', error);
    }

    // 2. Credit Rating (simulated - in production use D&B API)
    try {
      const creditData = await estimateCreditRating(s);
      Object.assign(enrichedData, creditData);
      sources.push('Credit Assessment');
    } catch (error) {
      console.error('Credit assessment failed:', error);
    }

    // 3. Sustainability Data (CDP, SBTi, public reports)
    try {
      const sustainabilityData = await base44.integrations.Core.InvokeLLM({
        prompt: `Search for sustainability/ESG information for: ${s.legal_name}, ${s.country}
        
Find if company has:
- CDP disclosure (Climate Disclosure Project)
- SBTi approved targets (Science Based Targets)
- Net zero commitment
- Published sustainability reports
- Carbon footprint data
- Renewable energy usage

Search CDP database, SBTi website, company sustainability reports.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            carbon_performance: {
              type: "object",
              properties: {
                has_sbti_target: { type: "boolean" },
                net_zero_commitment: { type: "boolean" },
                cdp_score: { type: "string" }
              }
            }
          }
        }
      });

      if (sustainabilityData.carbon_performance) {
        enrichedData.carbon_performance = {
          ...s.carbon_performance,
          ...sustainabilityData.carbon_performance
        };
        sources.push('Public Sustainability Databases (CDP, SBTi)');
      }
    } catch (error) {
      console.error('Sustainability data enrichment failed:', error);
    }

    // 4. Certifications (search for public certificates)
    try {
      const certData = await base44.integrations.Core.InvokeLLM({
        prompt: `Search for quality/compliance certifications for: ${s.legal_name}, ${s.country}
        
Find ISO certifications:
- ISO 9001 (Quality Management)
- ISO 14001 (Environmental Management)
- ISO 45001 (Occupational Health & Safety)
- ISO 13485 (Medical Devices)
- ISO 27001 (Information Security)
- ISO 50001 (Energy Management)

Search certification body databases (TÜV, BSI, DNV, etc.).`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            certifications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  issuing_body: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (certData.certifications && certData.certifications.length > 0) {
        enrichedData.certifications = [
          ...(s.certifications || []),
          ...certData.certifications
        ];
        sources.push('Public Certification Databases');
      }
    } catch (error) {
      console.error('Certification search failed:', error);
    }

    // 5. News Monitoring (risks/incidents)
    try {
      const newsData = await base44.integrations.Core.InvokeLLM({
        prompt: `Search recent news (last 12 months) for: ${s.legal_name}, ${s.country}
        
Look for:
- Labor violations / human rights issues
- Environmental incidents
- Corruption allegations
- Bankruptcy / financial distress
- Legal disputes
- Sanctions
- Major contracts / partnerships

Summarize any significant findings.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            has_negative_news: { type: "boolean" },
            news_summary: { type: "string" },
            risk_flags: { type: "array", items: { type: "string" } }
          }
        }
      });

      if (newsData.has_negative_news) {
        await base44.entities.RiskAlert.create({
          supplier_id: supplier_id,
          alert_type: 'performance',
          severity: 'warning',
          title: 'Negative News Detected',
          description: newsData.news_summary,
          source: 'Automated News Monitoring',
          status: 'open'
        });
        sources.push('News Monitoring');
      }
    } catch (error) {
      console.error('News monitoring failed:', error);
    }

    // Update supplier with enriched data
    if (Object.keys(enrichedData).length > 0) {
      await base44.entities.Supplier.update(supplier_id, {
        ...enrichedData,
        data_completeness: calculateCompleteness({ ...s, ...enrichedData })
      });
    }

    // Create audit log
    await base44.entities.AuditLog.create({
      tenant_id: user.company_id,
      object_type: 'Supplier',
      object_id: supplier_id,
      action: 'data_enrichment',
      severity: 'low',
      details: {
        fields_enriched: Object.keys(enrichedData),
        sources: sources
      },
      performed_by: 'system'
    });

    return Response.json({
      success: true,
      fields_enriched: Object.keys(enrichedData).length,
      sources: sources,
      enriched_data: enrichedData
    });

  } catch (error) {
    console.error('Data enrichment error:', error);
    return Response.json({ 
      error: 'Data enrichment failed', 
      details: error.message 
    }, { status: 500 });
  }
});

function estimateCreditRating(supplier) {
  // Simplified credit scoring - in production use D&B API
  let score = 0;
  
  if (supplier.annual_revenue_eur > 10000000) score += 30;
  else if (supplier.annual_revenue_eur > 1000000) score += 20;
  else score += 10;
  
  if (supplier.employee_count > 100) score += 20;
  else if (supplier.employee_count > 10) score += 10;
  
  if (supplier.certifications && supplier.certifications.length > 0) score += 20;
  
  const ratings = {
    90: 'AAA', 80: 'AA', 70: 'A', 60: 'BBB', 50: 'BB', 40: 'B'
  };
  
  const rating = Object.keys(ratings).reverse().find(threshold => score >= threshold);
  
  return {
    credit_rating: ratings[rating] || 'B'
  };
}

function calculateCompleteness(supplier) {
  const criticalFields = [
    'legal_name', 'country', 'vat_number', 'primary_contact_email',
    'supplier_type', 'annual_revenue_eur', 'employee_count'
  ];
  
  const filled = criticalFields.filter(f => supplier[f]).length;
  return Math.round((filled / criticalFields.length) * 100);
}