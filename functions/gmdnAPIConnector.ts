import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * GMDN API Connector - Global Medical Device Nomenclature
 * Validates medical device classification codes
 * EUDAMED compliance requirement per MDR Annex VI Part B
 * 
 * GMDN Agency API: https://www.gmdnagency.org
 * Subscription required for production use
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gmdn_code, search_term } = await req.json();

    // Use AI with internet context to validate GMDN codes
    const prompt = gmdn_code 
      ? `Validate GMDN code ${gmdn_code}. Return: preferred term, definition, template code, if valid.`
      : `Search GMDN database for: "${search_term}". Return top 5 matches with codes, terms, and definitions.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt + ` 
      
      Return JSON with:
      ${gmdn_code ? `{
        "valid": boolean,
        "gmdn_code": string,
        "preferred_term": string,
        "definition": string,
        "template_code": string,
        "risk_classification_guidance": string
      }` : `{
        "results": [{
          "gmdn_code": string,
          "preferred_term": string,
          "definition": string,
          "relevance_score": number
        }]
      }`}`,
      add_context_from_internet: true,
      response_json_schema: gmdn_code ? {
        type: "object",
        properties: {
          valid: { type: "boolean" },
          gmdn_code: { type: "string" },
          preferred_term: { type: "string" },
          definition: { type: "string" },
          template_code: { type: "string" },
          risk_classification_guidance: { type: "string" }
        }
      } : {
        type: "object",
        properties: {
          results: {
            type: "array",
            items: {
              type: "object",
              properties: {
                gmdn_code: { type: "string" },
                preferred_term: { type: "string" },
                definition: { type: "string" },
                relevance_score: { type: "number" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      data: result,
      source: 'GMDN Agency via AI',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('GMDN API error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});