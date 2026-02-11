import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PubChem API Connector
 * Fetches chemical substance data from PubChem REST API
 * https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest
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

    // Step 1: Lookup CID by CAS number
    const cidResponse = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(casNumber)}/cids/JSON`
    );

    if (!cidResponse.ok) {
      return Response.json({ 
        found: false, 
        error: 'Substance not found in PubChem' 
      });
    }

    const cidData = await cidResponse.json();
    const cid = cidData.IdentifierList?.CID?.[0];

    if (!cid) {
      return Response.json({ found: false });
    }

    // Step 2: Get compound details
    const detailsResponse = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,IUPACName/JSON`
    );

    const detailsData = await detailsResponse.json();
    const props = detailsData.PropertyTable?.Properties?.[0];

    // Step 3: Get synonyms
    const synonymsResponse = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`
    );

    const synonymsData = await synonymsResponse.json();
    const synonyms = synonymsData.InformationList?.Information?.[0]?.Synonym || [];

    return Response.json({
      found: true,
      pubchem_cid: cid.toString(),
      name: props?.IUPACName || synonyms[0] || 'Unknown',
      molecular_formula: props?.MolecularFormula || null,
      molecular_weight: props?.MolecularWeight || null,
      synonyms: synonyms.slice(0, 20), // Top 20 synonyms
      cas_number: casNumber,
      source: 'PubChem',
      fetched_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      found: false 
    }, { status: 500 });
  }
});