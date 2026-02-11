import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Secure Supplier Portal Invitation System
 * - Generates time-limited access tokens
 * - Sends personalized invitation emails
 * - GDPR compliant (suppliers only see their own data)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { supplier_id, custom_message } = await req.json();

    // Fetch supplier
    const supplier = await base44.entities.Supplier.filter({ id: supplier_id });
    if (!supplier.length) {
      return Response.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const supplierData = supplier[0];

    if (!supplierData.primary_contact_email) {
      return Response.json({ 
        error: 'Supplier has no primary contact email. Please add contact first.' 
      }, { status: 400 });
    }

    // Generate secure token (valid for 90 days)
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    // Create invite token record
    const inviteToken = await base44.entities.SupplierInviteToken.create({
      supplier_id,
      tenant_id: user.company_id,
      token,
      email: supplierData.primary_contact_email,
      expires_at: expiresAt.toISOString(),
      status: 'active',
      invited_by: user.email,
      invited_at: new Date().toISOString(),
      access_count: 0
    });

    // Generate portal URL
    const appUrl = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'https://app.base44.com';
    const portalUrl = `${appUrl}/supplier-portal?token=${token}`;

    // Send invitation email
    const companyName = user.company_name || user.email.split('@')[0];
    
    await base44.integrations.Core.SendEmail({
      to: supplierData.primary_contact_email,
      subject: `Supplier Data Request from ${companyName}`,
      body: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #86b027 0%, #6a8c20 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #86b027; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .info-box { background: white; padding: 20px; border-left: 4px solid #86b027; margin: 20px 0; border-radius: 4px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
    .shield { font-size: 48px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="shield">🛡️</div>
      <h1 style="margin: 0; font-size: 24px;">Supplier Compliance Data Request</h1>
    </div>
    
    <div class="content">
      <p><strong>Hello ${supplierData.legal_name} Team,</strong></p>
      
      <p>${companyName} has invited you to complete your supplier compliance profile through our secure self-service portal.</p>

      ${custom_message ? `<div class="info-box"><p><em>${custom_message}</em></p></div>` : ''}

      <div class="info-box">
        <h3 style="margin-top: 0; color: #86b027;">What we need:</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Operational capabilities (production capacity, lead times, certifications)</li>
          <li>ESG & CSDDD compliance data (human rights, environmental policies)</li>
          <li>Sustainability metrics (carbon emissions, renewable energy usage)</li>
          <li>Supporting documents (ISO certificates, audit reports, declarations)</li>
        </ul>
      </div>

      <p><strong>🔒 Privacy & Security:</strong></p>
      <ul>
        <li>✓ You will ONLY see and edit your company's information</li>
        <li>✓ No access to ${companyName}'s internal data or other suppliers</li>
        <li>✓ Secure token-based authentication (no password required)</li>
        <li>✓ GDPR compliant - your data is encrypted and protected</li>
        <li>✓ This link expires in 90 days</li>
      </ul>

      <div style="text-align: center;">
        <a href="${portalUrl}" class="button">
          Access Secure Portal →
        </a>
      </div>

      <p style="font-size: 13px; color: #6b7280; margin-top: 30px;">
        <strong>Need help?</strong> Contact us at ${user.email}<br>
        <strong>Security tip:</strong> This email contains a secure access link unique to ${supplierData.legal_name}. Do not share this link.
      </p>
    </div>

    <div class="footer">
      <p>Powered by SupplyLens | EU Green Deal Compliance Platform</p>
      <p style="font-size: 11px;">This is an automated message. Link valid until ${expiresAt.toLocaleDateString()}</p>
    </div>
  </div>
</body>
</html>
      `
    });

    // Log audit trail
    await base44.asServiceRole.entities.AuditLog.create({
      tenant_id: user.company_id,
      action: 'supplier_portal_invite_sent',
      entity_type: 'Supplier',
      entity_id: supplier_id,
      user_email: user.email,
      details: {
        recipient: supplierData.primary_contact_email,
        token_expires: expiresAt.toISOString(),
        portal_url: portalUrl
      },
      timestamp: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: `Invitation sent to ${supplierData.primary_contact_email}`,
      portal_url: portalUrl,
      expires_at: expiresAt.toISOString(),
      token_id: inviteToken.id
    });

  } catch (error) {
    console.error('Invitation error:', error);
    return Response.json({ 
      error: error.message,
      details: 'Failed to send supplier portal invitation'
    }, { status: 500 });
  }
});