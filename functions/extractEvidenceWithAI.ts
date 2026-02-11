import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, entity_type, reason_for_upload } = await req.json();
    if (!file_url) return Response.json({ error: 'Missing file_url' }, { status: 400 });

    // AI extraction with vision + structured output
    const extractionResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a compliance document analyzer. Extract supplier/entity data from this document.
Entity type: ${entity_type}
Context: ${reason_for_upload}

Extract and return ONLY valid fields with confidence scores (0-100). For supplier: legal_name, country, vat_number, eori_number, email, supplier_type, certifications, contact_person, production_countries.
For each field include: value, confidence, source_text (snippet from doc).`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          extracted_fields: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field_name: { type: 'string' },
                value: { type: 'string' },
                confidence: { type: 'number' },
                source_text: { type: 'string' }
              }
            }
          },
          extraction_quality: { type: 'string', enum: ['high', 'medium', 'low'] },
          document_type_detected: { type: 'string' },
          warnings: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    // Build structured payload with provenance
    const structured = {};
    const field_provenance = {};
    extractionResult.extracted_fields.forEach(field => {
      if (field.confidence >= 70) {
        structured[field.field_name] = field.value;
        field_provenance[field.field_name] = {
          source: 'ai_extracted',
          confidence: field.confidence,
          source_text: field.source_text
        };
      }
    });

    return Response.json({
      success: true,
      structured_payload: structured,
      field_provenance,
      extraction_quality: extractionResult.extraction_quality,
      document_type_detected: extractionResult.document_type_detected,
      warnings: extractionResult.warnings || [],
      high_confidence_fields: Object.keys(field_provenance).filter(k => field_provenance[k].confidence >= 85)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});