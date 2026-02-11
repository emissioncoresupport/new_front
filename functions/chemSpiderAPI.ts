import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ChemSpider API Connector
 * Fetches chemical data from ChemSpider (Royal Society of Chemistry)
 * https://developer.rsc.org/compounds-v1/apis
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { casNumber } = await req.json();

    if (!casNumber) {
      return Response.json({ error: 'CAS number required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('CHEMSPIDER_API_KEY');
    
    if (!apiKey) {
      return Response.json({ 
        found: false, 
        error: 'ChemSpider API key not configured',
        note: 'Set CHEMSPIDER_API_KEY in environment variables'
      });
    }

    // Step 1: Search by CAS number
    const searchResponse = await fetch(
      `https://api.rsc.org/compounds/v1/filter/name`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey
        },
        body: JSON.stringify({ name: casNumber })
      }
    );

    if (!searchResponse.ok) {
      return Response.json({ found: false, error: 'ChemSpider search failed' });
    }

    const searchData = await searchResponse.json();
    const queryId = searchData.queryId;

    // Step 2: Wait for results (polling)
    await new Promise(resolve => setTimeout(resolve, 2000));

    const resultsResponse = await fetch(
      `https://api.rsc.org/compounds/v1/filter/${queryId}/results`,
      {
        headers: { 'apikey': apiKey }
      }
    );

    const resultsData = await resultsResponse.json();
    const recordIds = resultsData.results?.slice(0, 1); // First result

    if (!recordIds || recordIds.length === 0) {
      return Response.json({ found: false });
    }

    // Step 3: Get compound details
    const detailsResponse = await fetch(
      `https://api.rsc.org/compounds/v1/records/${recordIds[0]}/details`,
      {
        headers: { 'apikey': apiKey }
      }
    );

    const details = await detailsResponse.json();

    return Response.json({
      found: true,
      chemspider_id: recordIds[0],
      name: details.commonName || details.name || 'Unknown',
      molecular_formula: details.molecularFormula,
      molecular_weight: details.molecularWeight,
      synonyms: details.synonyms || [],
      cas_number: casNumber,
      smiles: details.smiles,
      inchi: details.inchi,
      source: 'ChemSpider',
      fetched_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      found: false 
    }, { status: 500 });
  }
});