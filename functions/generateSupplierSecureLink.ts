import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { request_id, supplier_id, expires_in_hours = 168 } = payload; // Default 7 days

    if (!request_id || !supplier_id) {
      return Response.json({ 
        error: 'request_id and supplier_id required',
        field_errors: {
          request_id: !request_id ? 'Required' : null,
          supplier_id: !supplier_id ? 'Required' : null
        }
      }, { status: 422 });
    }

    // Verify request exists
    const requests = await base44.asServiceRole.entities.CollaborationRequest.filter({ id: request_id });
    if (!requests.length) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    const request = requests[0];
    if (request.supplier_id !== supplier_id) {
      return Response.json({ error: 'Supplier mismatch' }, { status: 400 });
    }

    // Generate secure token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    // Hash token for storage
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token));
    const token_hash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Create submission record
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + expires_in_hours);

    const submission = await base44.asServiceRole.entities.CollaborationSubmission.create({
      tenant_id: request.tenant_id,
      request_id,
      supplier_id,
      status: 'STARTED',
      secure_token_hash: token_hash,
      token_expires_at_utc: expiry.toISOString()
    });

    // Generate secure link
    const baseUrl = req.headers.get('origin') || 'https://app.base44.com';
    const secure_link = `${baseUrl}/supplier-submit?token=${token}&submission_id=${submission.id}`;

    return Response.json({ 
      success: true,
      submission_id: submission.id,
      secure_link,
      expires_at: expiry.toISOString()
    });

  } catch (error) {
    console.error('Secure link generation error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});