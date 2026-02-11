import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { randomBytes } from 'node:crypto';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { supplier_email, tenant_id } = body;

    if (!supplier_email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    // Generate unique token
    const token = randomBytes(32).toString('hex');
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    // Create invite token record
    const inviteToken = await base44.entities.SupplierInviteToken.create({
      tenant_id,
      token,
      supplier_email,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      expires_at: expiryDate.toISOString(),
      created_by: user.email
    });

    const inviteLink = `${Deno.env.get('APP_URL') || 'https://supplylens.app'}/supplier-portal?token=${token}`;

    // Log audit trail
    await base44.entities.AuditLogEntry.create({
      tenant_id,
      resource_type: 'SupplierInviteToken',
      resource_id: inviteToken.id,
      action: 'SUPPLIER_INVITE_CREATED',
      actor_email: user.email,
      action_timestamp: new Date().toISOString(),
      changes: { supplier_email, expires_in_days: 30 },
      status: 'SUCCESS'
    });

    return Response.json({
      success: true,
      invite_link: inviteLink,
      token,
      expires_at: expiryDate.toISOString()
    });
  } catch (error) {
    console.error('createSupplierInvite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});