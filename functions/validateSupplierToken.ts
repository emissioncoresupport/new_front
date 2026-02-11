import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PUBLIC endpoint to validate supplier portal tokens
 * Returns ONLY the supplier's own data (data isolation)
 */

Deno.serve(async (req) => {
  try {
    // This is a PUBLIC endpoint - no authentication required
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token required' }, { status: 400 });
    }

    // Use service role to validate token
    const base44 = createClientFromRequest(req);

    // Find token
    const tokens = await base44.asServiceRole.entities.SupplierInviteToken.filter({ 
      token,
      status: 'active'
    });

    if (!tokens.length) {
      return Response.json({ 
        error: 'Invalid or inactive token' 
      }, { status: 401 });
    }

    const tokenData = tokens[0];

    // Check expiration
    if (new Date(tokenData.expires_at) < new Date()) {
      await base44.asServiceRole.entities.SupplierInviteToken.update(tokenData.id, {
        status: 'expired'
      });
      return Response.json({ 
        error: 'Token has expired. Please request a new invitation.' 
      }, { status: 401 });
    }

    // Fetch supplier data (ONLY this supplier's data)
    const suppliers = await base44.asServiceRole.entities.Supplier.filter({ 
      id: tokenData.supplier_id 
    });

    if (!suppliers.length) {
      return Response.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const supplier = suppliers[0];

    // Increment access count
    await base44.asServiceRole.entities.SupplierInviteToken.update(tokenData.id, {
      access_count: (tokenData.access_count || 0) + 1,
      last_accessed_at: new Date().toISOString()
    });

    // Return ONLY supplier's own data (no tenant data, no other suppliers)
    return Response.json({
      success: true,
      supplier: {
        id: supplier.id,
        legal_name: supplier.legal_name,
        trade_name: supplier.trade_name,
        country: supplier.country,
        city: supplier.city,
        website: supplier.website,
        primary_contact_email: supplier.primary_contact_email,
        primary_contact_phone: supplier.primary_contact_phone,
        preferred_contact: supplier.preferred_contact,
        production_capacity_annual: supplier.production_capacity_annual,
        lead_time_days: supplier.lead_time_days,
        moq: supplier.moq,
        csddd_human_rights_dd: supplier.csddd_human_rights_dd,
        csddd_environmental_dd: supplier.csddd_environmental_dd,
        conflict_minerals: supplier.conflict_minerals,
        reach_compliance: supplier.reach_compliance,
        carbon_performance: supplier.carbon_performance,
        ethics_compliance: supplier.ethics_compliance,
        data_completeness: supplier.data_completeness,
        // EXCLUDE: risk scores, internal notes, other suppliers, tenant info
      },
      token_expires: tokenData.expires_at
    });

  } catch (error) {
    console.error('Token validation error:', error);
    return Response.json({ 
      error: 'Token validation failed',
      details: error.message 
    }, { status: 500 });
  }
});