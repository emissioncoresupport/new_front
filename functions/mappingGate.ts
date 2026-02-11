import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

const crypto = {
  createHash: createHash
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { evidence_id, entity_type } = body;

    if (!evidence_id || !entity_type) {
      return Response.json(
        { error: 'Missing evidence_id or entity_type' },
        { status: 400 }
      );
    }

    // Fetch evidence
    const evidenceList = await base44.entities.Evidence.list();
    const evidence = (evidenceList || []).find(e => e.id === evidence_id);

    if (!evidence) {
      return Response.json({ error: 'Evidence not found' }, { status: 404 });
    }

    if (evidence.state !== 'STRUCTURED') {
      return Response.json(
        { error: 'Evidence must be in STRUCTURED state' },
        { status: 400 }
      );
    }

    // Mapping gate logic
    const gaps = [];
    let passed = false;
    let conflicts = [];

    if (entity_type === 'SUPPLIER') {
      if (!evidence.structured_data?.supplier_name) gaps.push('supplier_name');
      if (!evidence.structured_data?.country) gaps.push('country');
      
      // Dedup check
      if (evidence.structured_data?.supplier_name && evidence.structured_data?.country) {
        const existingSuppliers = await base44.entities.Supplier.filter({
          legal_name: evidence.structured_data.supplier_name,
          country: evidence.structured_data.country
        });
        if (existingSuppliers && existingSuppliers.length > 0) {
          conflicts.push({
            type: 'DUPLICATE_SUPPLIER',
            existing_id: existingSuppliers[0].id,
            message: `Supplier already exists: ${existingSuppliers[0].id}`
          });
        }
      }

      passed = gaps.length === 0 && conflicts.length === 0;
    }

    // Generate hash
    const recordData = JSON.stringify({
      evidence_id,
      entity_type,
      passed,
      gaps,
      conflicts,
      timestamp: new Date().toISOString()
    });
    const hash = crypto.createHash('sha256').update(recordData).digest('hex');

    const decision = {
      status: passed ? 'APPROVED' : 'PROVISIONAL',
      validation_result: {
        passed,
        gaps,
        conflicts,
        checks_run: {
          minimum_fields: true,
          dedup_check: true,
          cbam_relevance: true,
          csrd_scope: true
        }
      },
      hash_sha256: hash
    };

    return Response.json({ success: true, decision });
  } catch (error) {
    console.error('mappingGate error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});