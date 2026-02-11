import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { v4 as uuidv4 } from 'npm:uuid@9.0.0';

/**
 * Auto-creates a GapItem when:
 * 1. Test runner endpoint is missing (404)
 * 2. Proof schema mismatch is detected
 * 3. Runtime errors occur during verification
 * 
 * Called from error handlers in frontend verification components.
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      area,
      title,
      description,
      current_behavior,
      required_behavior,
      risk_level,
      impact,
      owner,
      trigger_source
    } = body;

    if (!area || !title || !owner || !risk_level) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if gap already exists (deduplicate)
    const existing = await base44.asServiceRole.entities.GapItem.filter({
      contract: 'CONTRACT_1',
      area,
      title
    });

    if (existing.length > 0) {
      // Update last_updated_utc
      const gap = existing[0];
      await base44.asServiceRole.entities.GapItem.update(gap.id, {
        last_updated_utc: new Date().toISOString(),
        trigger_source
      });
      return Response.json({ action: 'updated', gap_id: gap.id }, { status: 200 });
    }

    // Create new gap
    const newGap = await base44.asServiceRole.entities.GapItem.create({
      contract: 'CONTRACT_1',
      module: 'MANUAL_ENTRY',
      area,
      title,
      description: description || 'Auto-detected gap',
      current_behavior,
      required_behavior,
      risk_level,
      impact: impact || [],
      owner,
      status: 'OPEN',
      auto_created: true,
      trigger_source,
      target_release: 'TBD'
    });

    return Response.json({ action: 'created', gap_id: newGap.id }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error.message, error_code: 'AUTO_GAP_CREATION_FAILED' },
      { status: 500 }
    );
  }
});