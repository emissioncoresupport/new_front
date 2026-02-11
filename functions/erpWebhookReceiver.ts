/**
 * ERP Webhook Receiver - Real-time bidirectional sync
 * Receives webhook events from SAP, Oracle, MS Dynamics for instant data updates
 * Validates webhook signatures and processes changes in real-time
 * EU Green Deal Compliant (Dec 2025)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validate webhook signature based on ERP type
    const erpType = req.headers.get('x-erp-type') || 'generic';
    const signature = req.headers.get('x-webhook-signature');
    const webhookSecret = Deno.env.get('ERP_WEBHOOK_SECRET');
    
    // Verify signature for security
    if (signature && webhookSecret) {
      const payload = await req.text();
      const expectedSignature = await generateWebhookSignature(payload, webhookSecret);
      
      if (signature !== expectedSignature) {
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
      
      var body = JSON.parse(payload);
    } else {
      body = await req.json();
    }

    const { event_type, entity_type, data, erp_connection_id, tenant_id } = body;

    // Validate ERP connection
    const connections = await base44.asServiceRole.entities.ERPConnection.filter({
      id: erp_connection_id,
      tenant_id: tenant_id,
      status: 'active'
    });

    if (!connections || connections.length === 0) {
      return Response.json({ error: 'Invalid ERP connection' }, { status: 404 });
    }

    // Process webhook event
    let result;
    
    if (entity_type === 'supplier') {
      result = await processSupplie rWebhook(event_type, data, tenant_id, base44);
    } else if (entity_type === 'material' || entity_type === 'product') {
      result = await processMaterialWebhook(event_type, data, tenant_id, base44);
    } else if (entity_type === 'purchase_order') {
      result = await processPurchaseOrderWebhook(event_type, data, tenant_id, base44);
    } else if (entity_type === 'bom') {
      result = await processBOMWebhook(event_type, data, tenant_id, base44);
    } else {
      return Response.json({ error: 'Unsupported entity type' }, { status: 400 });
    }

    // Log webhook event
    await base44.asServiceRole.entities.AuditLog.create({
      tenant_id,
      user_email: 'system@erp-webhook',
      action: `erp_webhook_${event_type}`,
      entity_type: entity_type,
      entity_id: result.entity_id,
      details: { event_type, erp_type: erpType, data },
      timestamp: new Date().toISOString()
    });

    return Response.json({
      success: true,
      event_type,
      entity_type,
      result
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return Response.json({ 
      error: 'Webhook processing failed',
      message: error.message 
    }, { status: 500 });
  }
});

async function processSupplierWebhook(eventType, data, tenantId, base44) {
  const { erp_id, name, vat_number, eori_number, country, city, email, phone } = data;

  if (eventType === 'created' || eventType === 'updated') {
    // Check if supplier exists
    const existing = await base44.asServiceRole.entities.Supplier.filter({
      erp_id,
      company_id: tenantId
    });

    if (existing.length > 0) {
      // Update
      await base44.asServiceRole.entities.Supplier.update(existing[0].id, {
        legal_name: name,
        vat_number,
        eori_number,
        country,
        city,
        primary_contact_email: email,
        primary_contact_phone: phone,
        source: 'ERP_webhook',
        updated_at: new Date().toISOString()
      });
      return { action: 'updated', entity_id: existing[0].id };
    } else {
      // Create
      const supplier = await base44.asServiceRole.entities.Supplier.create({
        company_id: tenantId,
        legal_name: name,
        vat_number,
        eori_number,
        country,
        city,
        primary_contact_email: email,
        primary_contact_phone: phone,
        erp_id,
        source: 'ERP_webhook',
        status: 'active',
        tier: 'tier_1'
      });
      return { action: 'created', entity_id: supplier.id };
    }
  } else if (eventType === 'deleted') {
    const existing = await base44.asServiceRole.entities.Supplier.filter({
      erp_id,
      company_id: tenantId
    });
    
    if (existing.length > 0) {
      await base44.asServiceRole.entities.Supplier.update(existing[0].id, {
        status: 'inactive',
        updated_at: new Date().toISOString()
      });
      return { action: 'deactivated', entity_id: existing[0].id };
    }
  }

  return { action: 'no_change' };
}

async function processMaterialWebhook(eventType, data, tenantId, base44) {
  const { erp_id, sku, name, description, weight_kg, uom, supplier_erp_id } = data;

  if (eventType === 'created' || eventType === 'updated') {
    // Find supplier by ERP ID
    let supplierId = null;
    if (supplier_erp_id) {
      const suppliers = await base44.asServiceRole.entities.Supplier.filter({
        erp_id: supplier_erp_id,
        company_id: tenantId
      });
      if (suppliers.length > 0) supplierId = suppliers[0].id;
    }

    const existing = await base44.asServiceRole.entities.MaterialSKU.filter({
      internal_sku: sku,
      tenant_id: tenantId
    });

    const materialData = {
      material_name: name,
      description,
      weight_kg,
      uom: uom || 'kg',
      supplier_id: supplierId,
      source: 'ERP_webhook'
    };

    if (existing.length > 0) {
      await base44.asServiceRole.entities.MaterialSKU.update(existing[0].id, materialData);
      return { action: 'updated', entity_id: existing[0].id };
    } else {
      const material = await base44.asServiceRole.entities.MaterialSKU.create({
        tenant_id: tenantId,
        internal_sku: sku,
        ...materialData,
        status: 'active',
        active: true
      });
      return { action: 'created', entity_id: material.id };
    }
  }

  return { action: 'no_change' };
}

async function processPurchaseOrderWebhook(eventType, data, tenantId, base44) {
  const { po_number, supplier_erp_id, order_date, total_amount, currency, items } = data;

  if (eventType === 'created' || eventType === 'updated') {
    // Find supplier
    const suppliers = await base44.asServiceRole.entities.Supplier.filter({
      erp_id: supplier_erp_id,
      company_id: tenantId
    });

    if (suppliers.length === 0) {
      throw new Error(`Supplier not found for ERP ID: ${supplier_erp_id}`);
    }

    const existing = await base44.asServiceRole.entities.PurchaseOrder.filter({
      po_number,
      supplier_id: suppliers[0].id
    });

    const poData = {
      supplier_id: suppliers[0].id,
      order_date,
      total_amount,
      currency: currency || 'EUR',
      items: items || [],
      status: 'confirmed'
    };

    if (existing.length > 0) {
      await base44.asServiceRole.entities.PurchaseOrder.update(existing[0].id, poData);
      return { action: 'updated', entity_id: existing[0].id };
    } else {
      const po = await base44.asServiceRole.entities.PurchaseOrder.create({
        po_number,
        ...poData
      });
      return { action: 'created', entity_id: po.id };
    }
  }

  return { action: 'no_change' };
}

async function processBOMWebhook(eventType, data, tenantId, base44) {
  const { product_sku, components } = data;

  if (eventType === 'created' || eventType === 'updated') {
    // Find or create product
    const products = await base44.asServiceRole.entities.ProductSKU.filter({
      internal_product_sku: product_sku,
      tenant_id: tenantId
    });

    let productId;
    if (products.length > 0) {
      productId = products[0].id;
    } else {
      const product = await base44.asServiceRole.entities.ProductSKU.create({
        tenant_id: tenantId,
        internal_product_sku: product_sku,
        product_name: data.product_name || product_sku,
        status: 'active'
      });
      productId = product.id;
    }

    // Delete existing BOM items and recreate
    const existingItems = await base44.asServiceRole.entities.BOMItem.filter({
      product_sku_id: productId
    });
    
    for (const item of existingItems) {
      await base44.asServiceRole.entities.BOMItem.delete(item.id);
    }

    // Create new BOM items
    for (const component of components || []) {
      const materials = await base44.asServiceRole.entities.MaterialSKU.filter({
        internal_sku: component.material_sku,
        tenant_id: tenantId
      });

      if (materials.length > 0) {
        await base44.asServiceRole.entities.BOMItem.create({
          tenant_id: tenantId,
          product_sku_id: productId,
          material_sku_id: materials[0].id,
          quantity: component.quantity,
          unit: component.unit || 'piece'
        });
      }
    }

    return { action: 'updated', entity_id: productId };
  }

  return { action: 'no_change' };
}

async function generateWebhookSignature(payload, secret) {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, data);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}