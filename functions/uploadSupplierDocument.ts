import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PUBLIC endpoint for suppliers to upload documents via token
 * Automatically classifies and extracts data using AI
 */

Deno.serve(async (req) => {
  try {
    const { token, category, file_url, file_name, file_size } = await req.json();

    if (!token || !file_url) {
      return Response.json({ error: 'Token and file_url required' }, { status: 400 });
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

    if (new Date(tokenData.expires_at) < new Date()) {
      return Response.json({ error: 'Token expired' }, { status: 401 });
    }

    // Store document
    const docRecord = await base44.asServiceRole.entities.Document.create({
      tenant_id: tokenData.tenant_id,
      object_type: 'Supplier',
      object_id: tokenData.supplier_id,
      file_name: file_name,
      file_url,
      file_size_bytes: file_size || 0,
      document_type: category || 'supplier_portal_upload',
      uploaded_by: tokenData.email,
      uploaded_at: new Date().toISOString(),
      status: 'processing'
    });

    // AI document classification & extraction
    try {
      const classificationResult = await base44.asServiceRole.functions.invoke(
        'intelligentDocumentClassifier',
        {
          file_url,
          supplier_id: tokenData.supplier_id
        }
      );

      await base44.asServiceRole.entities.Document.update(docRecord.id, {
        status: 'verified',
        metadata: classificationResult.data
      });

      return Response.json({
        success: true,
        document_id: docRecord.id,
        classification: classificationResult.data.classification,
        fields_extracted: classificationResult.data.fields_updated
      });
    } catch (error) {
      await base44.asServiceRole.entities.Document.update(docRecord.id, {
        status: 'pending_review'
      });

      return Response.json({
        success: true,
        document_id: docRecord.id,
        message: 'Document uploaded, manual review required'
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ 
      error: 'Upload failed',
      details: error.message 
    }, { status: 500 });
  }
});