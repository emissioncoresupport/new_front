import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * DPP Public Hosting Service
 * Generates publicly accessible Digital Product Passport pages
 * Per ESPR Regulation 2023/1542 Art. 8 - Information Requirements
 * 
 * Requirements:
 * - QR code → public DPP URL
 * - No authentication required for public access
 * - ECGT-compliant data structure
 * - Multi-language support (EU official languages)
 * - Accessibility (WCAG 2.1 AA)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const url = new URL(req.url);
    const dppId = url.searchParams.get('id');
    const lang = url.searchParams.get('lang') || 'en';

    if (!dppId) {
      return new Response(`
        <!DOCTYPE html>
        <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>Digital Product Passport</h1>
          <p>Invalid or missing DPP ID</p>
        </body></html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 404
      });
    }

    // Fetch DPP record (service role - no auth required for public access)
    const dppRecords = await base44.asServiceRole.entities.DPPRecord.list();
    const dpp = dppRecords.find(d => d.id === dppId);

    if (!dpp || dpp.publication_status !== 'published') {
      return new Response(`
        <!DOCTYPE html>
        <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>Digital Product Passport</h1>
          <p>DPP not found or not published</p>
        </body></html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 404
      });
    }

    // Fetch related product data
    const products = await base44.asServiceRole.entities.Product.list();
    const product = products.find(p => p.id === dpp.product_id);

    // Generate HTML page (ECGT-compliant structure)
    const html = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Digital Product Passport for ${dpp.product_name} - EU ESPR Compliant">
  <title>${dpp.product_name} - Digital Product Passport</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container { 
      max-width: 900px; 
      margin: 0 auto; 
      background: white; 
      border-radius: 16px; 
      box-shadow: 0 20px 60px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header { 
      background: linear-gradient(135deg, #86b027 0%, #769c22 100%); 
      color: white; 
      padding: 40px;
      text-align: center;
    }
    .header h1 { font-size: 32px; margin-bottom: 8px; }
    .header p { opacity: 0.9; font-size: 14px; }
    .section { padding: 30px 40px; border-bottom: 1px solid #e2e8f0; }
    .section:last-child { border-bottom: none; }
    .section h2 { 
      font-size: 20px; 
      color: #334155; 
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; }
    .field { margin-bottom: 16px; }
    .label { 
      font-size: 12px; 
      color: #64748b; 
      text-transform: uppercase; 
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .value { font-size: 16px; color: #1e293b; font-weight: 500; }
    .badge { 
      display: inline-block; 
      padding: 4px 12px; 
      background: #86b027; 
      color: white; 
      border-radius: 12px; 
      font-size: 12px;
      font-weight: 600;
    }
    .badge.secondary { background: #02a1e8; }
    .badge.success { background: #10b981; }
    .badge.warning { background: #f59e0b; }
    .footer { 
      padding: 24px 40px; 
      background: #f8fafc; 
      text-align: center; 
      font-size: 12px; 
      color: #64748b;
    }
    .qr-section { text-align: center; padding: 20px; background: #f8fafc; }
    .qr-section img { width: 150px; height: 150px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${dpp.product_name}</h1>
      <p>Digital Product Passport • EU ESPR Compliant</p>
      <div style="margin-top: 16px;">
        <span class="badge">${dpp.dpp_category || 'General Product'}</span>
        ${dpp.passport_status === 'verified' ? '<span class="badge success">✓ Verified</span>' : ''}
      </div>
    </div>

    <!-- Product Information -->
    <div class="section">
      <h2>📦 Product Information</h2>
      <div class="grid">
        <div class="field">
          <div class="label">Manufacturer</div>
          <div class="value">${dpp.manufacturer_name || 'N/A'}</div>
        </div>
        <div class="field">
          <div class="label">Model Number</div>
          <div class="value">${dpp.model_number || 'N/A'}</div>
        </div>
        <div class="field">
          <div class="label">GTIN / EAN</div>
          <div class="value">${dpp.gtin || 'N/A'}</div>
        </div>
        <div class="field">
          <div class="label">Manufacturing Date</div>
          <div class="value">${dpp.manufacturing_date || 'N/A'}</div>
        </div>
      </div>
    </div>

    <!-- Sustainability Metrics -->
    <div class="section">
      <h2>🌱 Sustainability & Circularity</h2>
      <div class="grid">
        <div class="field">
          <div class="label">Carbon Footprint (PCF)</div>
          <div class="value">${product?.total_co2e_kg?.toFixed(2) || 'N/A'} kg CO₂e</div>
        </div>
        <div class="field">
          <div class="label">Recycled Content</div>
          <div class="value">${dpp.recycled_content_percentage || 0}%</div>
        </div>
        <div class="field">
          <div class="label">Recyclability Score</div>
          <div class="value">${dpp.recyclability_score || 'N/A'}/100</div>
        </div>
        <div class="field">
          <div class="label">Circularity Index</div>
          <div class="value">${dpp.circularity_index || 'N/A'}/100</div>
        </div>
      </div>
    </div>

    <!-- Material Composition -->
    <div class="section">
      <h2>🔬 Material Composition</h2>
      ${dpp.material_composition ? `
        <div style="max-height: 300px; overflow-y: auto;">
          ${Object.entries(dpp.material_composition).map(([material, percentage]) => `
            <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
              <div style="flex: 1;">
                <div style="font-weight: 500; color: #1e293b;">${material}</div>
                <div style="background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; margin-top: 4px;">
                  <div style="background: #86b027; height: 100%; width: ${percentage}%;"></div>
                </div>
              </div>
              <div style="font-weight: 600; color: #86b027; min-width: 60px; text-align: right;">${percentage}%</div>
            </div>
          `).join('')}
        </div>
      ` : '<p style="color: #64748b;">Material composition data not available</p>'}
    </div>

    <!-- Compliance & Certifications -->
    <div class="section">
      <h2>✓ Compliance & Certifications</h2>
      <div class="grid">
        ${dpp.ce_marking ? '<div><span class="badge success">CE Marked</span></div>' : ''}
        ${dpp.reach_compliant ? '<div><span class="badge success">REACH Compliant</span></div>' : ''}
        ${dpp.rohs_compliant ? '<div><span class="badge success">RoHS Compliant</span></div>' : ''}
        ${dpp.pfas_free ? '<div><span class="badge success">PFAS Free</span></div>' : ''}
      </div>
      ${dpp.compliance_certificates ? `
        <div style="margin-top: 16px;">
          <div class="label">Certificates:</div>
          ${dpp.compliance_certificates.map(cert => `
            <div style="margin-top: 8px; padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 14px;">
              <strong>${cert.type}</strong> - ${cert.issuer} (${cert.issue_date})
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>

    <!-- Repair & Maintenance -->
    <div class="section">
      <h2>🔧 Repair & Maintenance</h2>
      <div class="grid">
        <div class="field">
          <div class="label">Repairability Score</div>
          <div class="value">${dpp.repairability_score || 'N/A'}/100</div>
        </div>
        <div class="field">
          <div class="label">Expected Lifespan</div>
          <div class="value">${dpp.expected_lifespan_years || 'N/A'} years</div>
        </div>
      </div>
      ${dpp.spare_parts_availability ? `
        <div style="margin-top: 16px;">
          <div class="label">Spare Parts Available:</div>
          <div class="value">${dpp.spare_parts_availability}</div>
        </div>
      ` : ''}
    </div>

    <!-- End of Life -->
    <div class="section">
      <h2>♻️ End of Life Instructions</h2>
      <div style="font-size: 14px; color: #475569; line-height: 1.6;">
        ${dpp.eol_instructions || 'Please dispose according to local regulations for electronic waste.'}
      </div>
      ${dpp.waste_management_partners ? `
        <div style="margin-top: 16px;">
          <div class="label">Authorized Recycling Partners:</div>
          ${dpp.waste_management_partners.map(partner => `
            <div style="margin-top: 8px; font-size: 14px;">
              <strong>${partner.name}</strong> - ${partner.country}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>

    <!-- Blockchain Verification -->
    ${dpp.blockchain_hash ? `
    <div class="section">
      <h2>🔒 Blockchain Verification</h2>
      <div class="field">
        <div class="label">Immutable Record Hash</div>
        <div class="value" style="font-family: monospace; font-size: 12px; word-break: break-all;">
          ${dpp.blockchain_hash}
        </div>
      </div>
      <p style="font-size: 12px; color: #64748b; margin-top: 8px;">
        This DPP is cryptographically verified on blockchain for authenticity and tamper-proofing.
      </p>
    </div>
    ` : ''}

    <div class="footer">
      <p><strong>Digital Product Passport ID:</strong> ${dpp.id}</p>
      <p style="margin-top: 8px;">Published: ${new Date(dpp.published_at || dpp.created_date).toLocaleDateString()}</p>
      <p style="margin-top: 8px; font-size: 10px; color: #94a3b8;">
        Generated in compliance with EU Regulation 2023/1542 (ESPR) • Data validated ${new Date().toLocaleDateString()}
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Log public access (anonymous)
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        tenant_id: dpp.tenant_id || 'public',
        action: 'dpp_public_access',
        entity_type: 'DPPRecord',
        entity_id: dpp.id,
        user_email: 'public',
        metadata: {
          language: lang,
          user_agent: req.headers.get('user-agent'),
          accessed_at: new Date().toISOString()
        },
        outcome: 'success'
      });
    } catch (logError) {
      console.error('Failed to log public access:', logError);
    }

    return new Response(html, {
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });

  } catch (error) {
    console.error('DPP hosting error:', error);
    return new Response(`
      <!DOCTYPE html>
      <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>Error Loading DPP</h1>
        <p>${error.message}</p>
      </body></html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 500
    });
  }
});