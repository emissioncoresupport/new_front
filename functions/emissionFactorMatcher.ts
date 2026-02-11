/**
 * AI Emission Factor Matcher
 * Automatically matches activities to appropriate emission factors
 */

export default async function emissionFactorMatcher(context) {
  const { base44, data } = context;
  const { activity_description, scope, category } = data;

  // Get all available emission factors
  const factors = await base44.entities.EmissionFactor.list();

  // AI-powered matching
  const matching = await base44.integrations.Core.InvokeLLM({
    prompt: `Match this activity to the most appropriate emission factor.

Activity: ${activity_description}
Scope: ${scope}
Category: ${category}

Available emission factors:
${factors.slice(0, 50).map(f => `- ${f.factor_name} (${f.category}, ${f.region}, ${f.unit}): ${f.factor_value} ${f.unit_co2e}`).join('\n')}

Select the best matching factor(s) and explain why. If no good match exists, suggest what factor should be used and from which database (DEFRA, EPA, ecoinvent, etc.).`,
    response_json_schema: {
      type: "object",
      properties: {
        best_match_id: { type: "string" },
        confidence: { type: "number" },
        reasoning: { type: "string" },
        alternative_matches: { 
          type: "array", 
          items: { 
            type: "object",
            properties: {
              factor_id: { type: "string" },
              confidence: { type: "number" }
            }
          }
        },
        suggested_factor: { 
          type: "object",
          properties: {
            name: { type: "string" },
            database: { type: "string" },
            value: { type: "number" }
          }
        }
      }
    }
  });

  const bestMatch = factors.find(f => f.id === matching.best_match_id);

  return {
    status: "success",
    matched_factor: bestMatch || matching.suggested_factor,
    confidence: matching.confidence,
    reasoning: matching.reasoning,
    alternatives: matching.alternative_matches
  };
}