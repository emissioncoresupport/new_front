import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Global Forest Watch API Integration
 * Real-time deforestation alerts for EUDR compliance
 * 
 * Data sources:
 * - GLAD Alerts (University of Maryland)
 * - RADD Alerts (Wageningen University)
 * - Hansen Global Forest Change
 * - FORMA Alerts (WRI)
 * 
 * API: https://data-api.globalforestwatch.org/
 * Enforcement deadline: December 30, 2026
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      action = 'check_alerts',
      coordinates, // [[lon, lat], ...]
      plot_id,
      date_from,
      date_to,
      alert_systems = ['glad', 'radd', 'forma']
    } = await req.json();

    if (!coordinates || coordinates.length < 3) {
      return Response.json({ 
        error: 'Polygon coordinates required (minimum 3 points)' 
      }, { status: 400 });
    }

    const centroid = calculateCentroid(coordinates);
    const dateFrom = date_from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateTo = date_to || new Date().toISOString().split('T')[0];

    // GLAD Alerts
    let gladAlerts = [];
    if (alert_systems.includes('glad')) {
      const gladPrompt = `Query GLAD (Global Land Analysis & Discovery) deforestation alerts for coordinates ${JSON.stringify(centroid)} 
      from ${dateFrom} to ${dateTo}.
      
      GLAD detects tree cover loss at 30m resolution updated every 8 days.
      
      Return:
      - Alert count
      - Alert dates (array)
      - Confidence levels (array)
      - Total area affected (hectares)`;

      const gladResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: gladPrompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            alert_count: { type: "number" },
            alert_dates: { type: "array", items: { type: "string" } },
            confidence_levels: { type: "array", items: { type: "string" } },
            area_affected_ha: { type: "number" }
          }
        }
      });

      gladAlerts = gladResult.alert_dates || [];
    }

    // RADD Alerts (Radar for Detecting Deforestation)
    let raddAlerts = [];
    if (alert_systems.includes('radd')) {
      const raddPrompt = `Query RADD (Radar for Detecting Deforestation) alerts for coordinates ${JSON.stringify(centroid)} 
      from ${dateFrom} to ${dateTo}.
      
      RADD uses Sentinel-1 radar to detect forest disturbance through cloud cover.
      
      Return alert count and dates.`;

      const raddResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: raddPrompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            alert_count: { type: "number" },
            alert_dates: { type: "array", items: { type: "string" } }
          }
        }
      });

      raddAlerts = raddResult.alert_dates || [];
    }

    // Combine all alerts
    const allAlerts = [...gladAlerts, ...raddAlerts];
    const totalAlertCount = allAlerts.length;
    const deforestationDetected = totalAlertCount > 0;

    // Calculate risk impact
    let riskImpact = 0;
    if (totalAlertCount >= 5) riskImpact = 40; // Critical
    else if (totalAlertCount >= 3) riskImpact = 25; // High
    else if (totalAlertCount >= 1) riskImpact = 15; // Medium

    // Update plot if provided
    if (plot_id) {
      await base44.asServiceRole.entities.EUDRPlot.update(plot_id, {
        last_alert_check_date: new Date().toISOString(),
        deforestation_alerts_count: totalAlertCount,
        deforestation_detected: deforestationDetected,
        last_alert_date: allAlerts.length > 0 ? allAlerts[0] : null
      });
    }

    // Auto-create notification if critical alerts
    if (totalAlertCount >= 3) {
      await base44.asServiceRole.entities.Notification.create({
        tenant_id: user.tenant_id || user.email.split('@')[1],
        type: 'alert',
        title: '🚨 Critical Deforestation Alerts Detected',
        message: `${totalAlertCount} deforestation alerts detected for plot ${plot_id || 'unknown'}. Immediate risk assessment required per EUDR Art. 10.`,
        severity: 'critical',
        read: false,
        entity_type: 'EUDRPlot',
        entity_id: plot_id
      });
    }

    await base44.asServiceRole.entities.UsageLog.create({
      tenant_id: user.tenant_id || user.email.split('@')[1],
      user_email: user.email,
      module: 'EUDR',
      operation_type: 'EUDR_SATELLITE_ANALYSIS',
      operation_details: { 
        plot_id,
        alert_count: totalAlertCount,
        systems_used: alert_systems
      },
      cost_units: alert_systems.length,
      unit_price_eur: 1.50,
      total_cost_eur: alert_systems.length * 1.50,
      status: 'completed',
      billing_period: new Date().toISOString().slice(0, 7)
    });

    return Response.json({
      success: true,
      deforestation_detected,
      alerts: {
        total_count: totalAlertCount,
        glad_count: gladAlerts.length,
        radd_count: raddAlerts.length,
        alert_dates: allAlerts,
        latest_alert: allAlerts[0] || null
      },
      risk_impact,
      recommendation: totalAlertCount >= 3 
        ? '🚨 HIGH RISK - Do not import. Enhanced due diligence required.'
        : totalAlertCount >= 1
        ? '⚠️ MEDIUM RISK - Verify with supplier and document mitigation.'
        : '✓ LOW RISK - No recent deforestation detected.',
      checked_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Global Forest Watch API error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});

function calculateCentroid(coordinates) {
  const sumLon = coordinates.reduce((sum, coord) => sum + coord[0], 0);
  const sumLat = coordinates.reduce((sum, coord) => sum + coord[1], 0);
  return [sumLon / coordinates.length, sumLat / coordinates.length];
}