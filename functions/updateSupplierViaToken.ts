import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PUBLIC endpoint for suppliers to update their own data via token
 * Data isolation: suppliers can ONLY update their own record
 */

Deno.serve(async (req) => {
  try {
    const { token, data } = await req.json();

    if (!token || !data) {
      return Response.json({ error: 'Token and data required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Validate token
    const tokens = await base44.asServiceRole.entities.SupplierInviteToken.filter({ 
      token,
      status: 'active'
    });

    if (!tokens.length) {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }

    const tokenData = tokens[0];

    // Check expiration
    if (new Date(tokenData.expires_at) < new Date()) {
      return Response.json({ error: 'Token expired' }, { status: 401 });
    }

    // WHITELIST: Only allow suppliers to update specific fields
    const allowedFields = [
      'production_capacity_annual',
      'lead_time_days',
      'moq',
      'csddd_human_rights_dd',
      'csddd_environmental_dd',
      'conflict_minerals',
      'reach_compliance',
      'carbon_performance',
      'ethics_compliance',
      'certifications',
      'primary_contact_phone',
      'preferred_contact'
    ];

    const sanitizedData = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        sanitizedData[field] = data[field];
      }
    }

    // Calculate completeness
    const completenessFields = [
      'production_capacity_annual',
      'lead_time_days',
      'moq',
      'csddd_human_rights_dd',
      'csddd_environmental_dd',
      'carbon_performance'
    ];
    const filled = completenessFields.filter(f => sanitizedData[f] && 
      (typeof sanitizedData[f] === 'object' ? Object.keys(sanitizedData[f]).length > 0 : true)
    ).length;
    sanitizedData.data_completeness = Math.round((filled / completenessFields.length) * 100);

    // Update supplier (service role to bypass auth)
    await base44.asServiceRole.entities.Supplier.update(
      tokenData.supplier_id, 
      sanitizedData
    );

    // Log audit trail
    await base44.asServiceRole.entities.AuditLog.create({
      tenant_id: tokenData.tenant_id,
      action: 'supplier_portal_data_update',
      entity_type: 'Supplier',
      entity_id: tokenData.supplier_id,
      user_email: tokenData.email,
      details: {
        updated_fields: Object.keys(sanitizedData),
        via_token: true
      },
      timestamp: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: 'Data updated successfully',
      completeness: sanitizedData.data_completeness
    });

  } catch (error) {
    console.error('Update error:', error);
    return Response.json({ 
      error: 'Update failed',
      details: error.message 
    }, { status: 500 });
  }
});