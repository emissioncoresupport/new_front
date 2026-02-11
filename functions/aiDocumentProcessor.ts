/**
 * AI Document Processor
 * Extracts structured data from any uploaded document
 * Supports: invoices, certificates, BOMs, sustainability reports, etc.
 */

export default async function aiDocumentProcessor(context) {
  const { base44, data } = context;
  const { file_url, document_type, target_schema } = data;

  if (!file_url) {
    throw new Error("file_url is required");
  }

  const prompts = {
    invoice: `Extract invoice data including: supplier name, invoice number, date, line items (product, quantity, price), total amount, currency, emissions data if present.`,
    
    bom: `Extract Bill of Materials: product name, components (name, quantity, unit, supplier), materials used, country of origin for each component.`,
    
    certificate: `Extract certificate details: certificate number, issuing body, valid from/until dates, scope, standards covered, facility name and location.`,
    
    sustainability_report: `Extract ESG metrics: GHG emissions (Scope 1/2/3), energy consumption, water usage, waste generated, employee count, diversity metrics, governance scores.`,
    
    cbam_data: `Extract CBAM-relevant data: installation name/location, CN codes, production processes, emission sources, direct emissions (tCO2/t product), electricity consumption, emission factors.`,
    
    eudr_data: `Extract EUDR data: product descriptions, commodity types, plot geolocation coordinates, harvest dates, supplier details, deforestation risk assessment.`,
    
    pfas_assessment: `Extract PFAS data: product name, chemical composition, CAS numbers, PFAS substances detected, concentration levels, test method, certification body.`
  };

  const prompt = prompts[document_type] || `Extract all structured data from this document based on the provided schema.`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `${prompt}\n\nExtract comprehensive data and return structured JSON matching the target schema. Be precise with numbers, dates, and identifiers.`,
    file_urls: [file_url],
    response_json_schema: target_schema || {
      type: "object",
      properties: {
        extracted_data: { type: "object" },
        confidence_score: { type: "number" },
        warnings: { type: "array", items: { type: "string" } }
      }
    }
  });

  // Log extraction for audit
  await base44.entities.EvidenceDocument.create({
    file_url,
    document_type,
    extracted_data: result.extracted_data || result,
    ai_confidence: result.confidence_score || 0.95,
    processing_date: new Date().toISOString(),
    status: 'processed'
  });

  return {
    status: "success",
    extracted_data: result.extracted_data || result,
    confidence: result.confidence_score || 0.95,
    warnings: result.warnings || []
  };
}