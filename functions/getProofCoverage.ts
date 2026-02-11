import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all suppliers
    const allSuppliers = await base44.entities.Supplier.list();
    
    // Get all mapping decisions
    const allMappings = await base44.entities.MappingDecision.list();

    // Calculate proof coverage
    const totalSuppliers = (allSuppliers || []).length;
    const provenSuppliers = (allMappings || []).filter(m => 
      m.status === 'APPROVED' && m.entity_type === 'SUPPLIER'
    ).length;

    const proofCoverage = totalSuppliers > 0 
      ? Math.round((provenSuppliers / totalSuppliers) * 100)
      : 0;

    const draftSuppliers = (allMappings || []).filter(m => 
      m.status === 'PROVISIONAL' && m.entity_type === 'SUPPLIER'
    ).length;

    const unmappedSuppliers = totalSuppliers - provenSuppliers - draftSuppliers;

    return Response.json({
      success: true,
      total_suppliers: totalSuppliers,
      proven_suppliers: provenSuppliers,
      draft_suppliers: draftSuppliers,
      unmapped_suppliers: unmappedSuppliers,
      proof_coverage_percent: proofCoverage,
      status: proofCoverage === 100 ? 'COMPLETE' : proofCoverage >= 80 ? 'SUFFICIENT' : 'AT_RISK'
    });
  } catch (error) {
    console.error('getProofCoverage error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});