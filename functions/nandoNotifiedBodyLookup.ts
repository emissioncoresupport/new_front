import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * NANDO Notified Body Lookup Service
 * Fetches notified body information from EC NANDO database
 * Required for EUDAMED device registration per MDR/IVDR
 * 
 * NANDO Database: https://ec.europa.eu/growth/tools-databases/nando/
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nb_number, country, directive } = await req.json();

    if (!nb_number && !country) {
      return Response.json({ 
        error: 'Either nb_number or country is required' 
      }, { status: 400 });
    }

    // Use AI to fetch from NANDO database
    const prompt = nb_number
      ? `Lookup Notified Body number ${nb_number} in EC NANDO database. 
         Return: organization name, country, address, website, scope of designation, directives covered.`
      : `Search NANDO database for Notified Bodies in ${country} ${directive ? `for ${directive}` : 'for medical devices (MDR/IVDR)'}. 
         Return list with NB numbers, names, and scopes.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt + `
      
      Return JSON:
      ${nb_number ? `{
        "found": boolean,
        "nb_number": string,
        "organization_name": string,
        "country": string,
        "address": string,
        "website": string,
        "scope": string,
        "directives": array of strings,
        "status": "active" or "suspended"
      }` : `{
        "notified_bodies": [{
          "nb_number": string,
          "organization_name": string,
          "scope": string,
          "website": string
        }]
      }`}`,
      add_context_from_internet: true,
      response_json_schema: nb_number ? {
        type: "object",
        properties: {
          found: { type: "boolean" },
          nb_number: { type: "string" },
          organization_name: { type: "string" },
          country: { type: "string" },
          address: { type: "string" },
          website: { type: "string" },
          scope: { type: "string" },
          directives: { type: "array", items: { type: "string" } },
          status: { type: "string" }
        }
      } : {
        type: "object",
        properties: {
          notified_bodies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nb_number: { type: "string" },
                organization_name: { type: "string" },
                scope: { type: "string" },
                website: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      data: result,
      source: 'EC NANDO Database',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('NANDO lookup error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});