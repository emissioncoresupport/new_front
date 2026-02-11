import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_type, normalized_data } = await req.json();

    let existingEntities = [];

    // Fetch existing canonical entities based on type
    if (entity_type === 'supplier') {
      existingEntities = await base44.entities.Supplier.filter({ tenant_id: user.company_id });
    } else if (entity_type === 'material' || entity_type === 'sku') {
      existingEntities = await base44.entities.MaterialSKU.filter({ tenant_id: user.company_id });
    } else if (entity_type === 'site') {
      existingEntities = await base44.entities.SupplierSite.list();
    }

    // AI-powered fuzzy matching
    const matchingPrompt = `Analyze if this new record matches any existing records:

NEW RECORD:
${JSON.stringify(normalized_data, null, 2)}

EXISTING RECORDS:
${JSON.stringify(existingEntities.slice(0, 20), null, 2)}

For each potential match, return:
- id: existing entity ID
- match_score: 0-100
- matching_fields: array of field names that match
- reason: explanation
- data: the matched entity data

Only return matches with score >= 70.`;

    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: matchingPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          duplicates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                match_score: { type: "number" },
                matching_fields: { type: "array", items: { type: "string" } },
                reason: { type: "string" },
                data: { type: "object" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      duplicates: aiResult.duplicates || []
    });

  } catch (error) {
    console.error('Detect duplicates error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});