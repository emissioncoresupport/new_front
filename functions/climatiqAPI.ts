import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const CLIMATIQ_API_KEY = Deno.env.get('CLIMATIQ_API_KEY');
const CLIMATIQ_BASE_URL = 'https://api.climatiq.io';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { method, params } = await req.json();

    // Search emission factors
    if (method === 'search') {
      const { query, region, year, category } = params;
      
      const searchParams = new URLSearchParams({
        query: query,
        ...(region && { region }),
        ...(year && { year }),
        ...(category && { category })
      });

      const response = await fetch(`${CLIMATIQ_BASE_URL}/search?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${CLIMATIQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Climatiq API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Track API usage for billing
      await base44.asServiceRole.entities.UsageLog.create({
        tenant_id: user.tenant_id || user.email.split('@')[1],
        user_email: user.email,
        module: 'PCF',
        operation_type: 'API_CALL',
        operation_details: { 
          service: 'Climatiq',
          method: 'search',
          query: query 
        },
        cost_units: 1,
        unit_price_eur: 0.001,
        total_cost_eur: 0.001,
        status: 'completed',
        billing_period: new Date().toISOString().slice(0, 7)
      });

      return Response.json({
        results: data.results.map(factor => ({
          id: factor.activity_id,
          name: factor.name,
          category: factor.category,
          factor: factor.factor,
          unit: factor.factor_unit,
          region: factor.region,
          year: factor.year,
          source: factor.source,
          source_dataset: factor.source_dataset,
          data_quality_flags: factor.data_quality_flags,
          uncertainty: factor.uncertainty_percentage
        }))
      });
    }

    // Get specific emission factor by ID
    if (method === 'get_factor') {
      const { activity_id } = params;
      
      const response = await fetch(`${CLIMATIQ_BASE_URL}/emission-factors/${activity_id}`, {
        headers: {
          'Authorization': `Bearer ${CLIMATIQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Climatiq API error: ${response.statusText}`);
      }

      const factor = await response.json();
      
      return Response.json({
        id: factor.activity_id,
        name: factor.name,
        factor: factor.factor,
        unit: factor.factor_unit,
        region: factor.region,
        year: factor.year,
        source: factor.source,
        uncertainty: factor.uncertainty_percentage
      });
    }

    // Calculate emissions (batch calculation)
    if (method === 'calculate') {
      const { items } = params;
      
      const response = await fetch(`${CLIMATIQ_BASE_URL}/estimate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLIMATIQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emission_factor: items
        })
      });

      if (!response.ok) {
        throw new Error(`Climatiq API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Track calculation usage
      await base44.asServiceRole.entities.UsageLog.create({
        tenant_id: user.tenant_id || user.email.split('@')[1],
        user_email: user.email,
        module: 'PCF',
        operation_type: 'API_CALL',
        operation_details: { 
          service: 'Climatiq',
          method: 'calculate',
          items_count: items.length 
        },
        cost_units: items.length,
        unit_price_eur: 0.002,
        total_cost_eur: items.length * 0.002,
        status: 'completed',
        billing_period: new Date().toISOString().slice(0, 7)
      });

      return Response.json({
        results: data.results
      });
    }

    return Response.json({ error: 'Unknown method' }, { status: 400 });

  } catch (error) {
    console.error('Climatiq API Error:', error);
    return Response.json({ 
      error: error.message,
      details: 'Check Climatiq API key and connectivity'
    }, { status: 500 });
  }
});