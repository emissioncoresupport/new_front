import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * GLEC Framework Route Optimizer
 * Multi-modal transport optimization for lowest carbon footprint
 * Per GLEC Framework v3.0 & ISO 14083:2023
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      origin_city,
      origin_country,
      destination_city,
      destination_country,
      cargo_weight_kg,
      urgency = 'standard' // 'urgent', 'standard', 'economy'
    } = await req.json();

    if (!origin_city || !destination_city || !cargo_weight_kg) {
      return Response.json({ 
        error: 'origin_city, destination_city, and cargo_weight_kg required' 
      }, { status: 400 });
    }

    // AI-powered route optimization
    const prompt = `As a logistics carbon optimization AI, calculate optimal transport routes from ${origin_city}, ${origin_country} to ${destination_city}, ${destination_country} for ${cargo_weight_kg}kg cargo.

Urgency level: ${urgency}

Calculate 3 route options:
1. LOWEST CARBON: Multi-modal with rail/sea priority
2. BALANCED: Cost-carbon balance
3. FASTEST: Air/road express (if urgent)

For each route provide:
- Transport modes sequence (e.g., ["Truck", "Rail", "Ship"])
- Leg-by-leg breakdown with distances
- Emission factor per leg (gCO2e/tkm per GLEC v3.0)
- Total emissions kgCO2e
- Estimated transit time days
- Estimated cost EUR
- Carbon vs speed trade-off score

Return JSON array of 3 optimized routes sorted by carbon footprint.`;

    const routes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          optimized_routes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                route_name: { type: "string" },
                legs: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      mode: { type: "string" },
                      from: { type: "string" },
                      to: { type: "string" },
                      distance_km: { type: "number" },
                      emission_factor_gco2_tkm: { type: "number" },
                      emissions_kgco2e: { type: "number" }
                    }
                  }
                },
                total_emissions_kgco2e: { type: "number" },
                total_distance_km: { type: "number" },
                transit_days: { type: "number" },
                estimated_cost_eur: { type: "number" },
                carbon_efficiency_score: { type: "number" }
              }
            }
          }
        }
      }
    });

    // Calculate savings vs worst option
    const emissions = routes.optimized_routes.map(r => r.total_emissions_kgco2e);
    const worstEmissions = Math.max(...emissions);
    const bestEmissions = Math.min(...emissions);
    const savingsPotential = ((worstEmissions - bestEmissions) / worstEmissions * 100).toFixed(1);

    await base44.asServiceRole.entities.UsageLog.create({
      tenant_id: user.tenant_id || user.email.split('@')[1],
      user_email: user.email,
      module: 'Logistics',
      operation_type: 'LOGISTICS_EMISSION_CALC',
      operation_details: { 
        origin: `${origin_city}, ${origin_country}`,
        destination: `${destination_city}, ${destination_country}`,
        routes_calculated: 3
      },
      cost_units: 1,
      unit_price_eur: 2.00,
      total_cost_eur: 2.00,
      status: 'completed',
      billing_period: new Date().toISOString().slice(0, 7)
    });

    return Response.json({
      success: true,
      routes: routes.optimized_routes,
      analysis: {
        best_emissions_kgco2e: bestEmissions,
        worst_emissions_kgco2e: worstEmissions,
        savings_potential_pct: parseFloat(savingsPotential),
        recommendation: routes.optimized_routes[0].route_name
      },
      calculated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('GLEC optimizer error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});