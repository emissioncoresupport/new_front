import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CBAM Certificate Purchase Engine
 * Real ETS price integration + auto-purchase logic
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, quantity, company_id } = await req.json();
    
    console.log('[Cert Purchase] Action:', action, 'Qty:', quantity);
    
    // Get latest ETS price
    const prices = await base44.asServiceRole.entities.CBAMPriceHistory.list('-date', 1);
    const currentPrice = prices.length > 0 ? prices[0].cbam_certificate_price : 88;
    
    const totalCost = quantity * currentPrice;
    
    // Get user company
    const users = await base44.asServiceRole.entities.User.list();
    const fullUser = users.find(u => u.email === user.email);
    const userCompanyId = company_id || fullUser?.company_id;
    
    // Create purchase order
    const order = await base44.asServiceRole.entities.CBAMPurchaseOrder.create({
      company_id: userCompanyId,
      order_number: `PO-${Date.now()}`,
      order_type: 'CBAM_certificate',
      quantity,
      estimated_price: currentPrice,
      total_amount: totalCost,
      status: 'approved', // Auto-approve
      order_date: new Date().toISOString(),
      delivery_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // T+2
      supplier_vendor: 'EEX Spot Market',
      auto_generated: action === 'auto_purchase'
    });
    
    console.log('[Cert Purchase] Order created:', order.id);
    
    // Immediately create certificate (simulate instant settlement)
    const certificate = await base44.asServiceRole.entities.CBAMCertificate.create({
      company_id: userCompanyId,
      certificate_type: 'CBAM_certificate',
      quantity,
      price_per_unit: currentPrice,
      total_cost: totalCost,
      purchase_date: new Date().toISOString(),
      status: 'active',
      registry_reference: `CERT-${Date.now()}`,
      purchased_from: 'EEX Spot',
      valid_from: new Date().toISOString(),
      valid_until: `${new Date().getFullYear() + 1}-12-31`
    });
    
    console.log('[Cert Purchase] Certificate issued:', certificate.id, quantity, 'units');
    
    // Send confirmation email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: `✅ CBAM Certificates Purchased - ${quantity} units`,
      body: `
        Your certificate purchase has been completed.
        
        Quantity: ${quantity} CBAM certificates
        Unit Price: €${currentPrice.toFixed(2)}
        Total Cost: €${totalCost.toLocaleString()}
        Settlement: T+2 (2 business days)
        
        Certificate ID: ${certificate.id}
        Order Reference: ${order.order_number}
        
        View certificates: ${Deno.env.get('BASE_URL')}/CBAM?tab=certificates
      `
    });
    
    return Response.json({
      success: true,
      order_id: order.id,
      certificate_id: certificate.id,
      quantity,
      unit_price: currentPrice,
      total_cost: totalCost,
      settlement_date: order.delivery_date
    });
    
  } catch (error) {
    console.error('[Cert Purchase] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});