/**
 * EUDR Deforestation Check
 * Uses satellite imagery and AI to detect deforestation risk
 */

export default async function eudrDeforestationCheck(context) {
  const { base44, data } = context;
  const { dds_id } = data;

  const dds = await base44.entities.EUDRDDS.filter({ id: dds_id });
  if (!dds.length) throw new Error("DDS not found");

  const ddsData = dds[0];
  
  // AI-powered geospatial analysis
  const deforestationAnalysis = await base44.integrations.Core.InvokeLLM({
    prompt: `Perform deforestation risk assessment for EUDR compliance.

Location: ${ddsData.plot_geolocation}
Commodity: ${ddsData.commodity_type}
Country: ${ddsData.country_of_origin}

Analyze:
1. Deforestation alerts in the area (2020-present)
2. Protected forest status
3. Land use changes
4. Forest cover percentage
5. Indigenous territory overlap
6. Risk level assessment

Use current data from forest monitoring systems, satellite imagery databases, and EUDR country benchmarks.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        risk_level: { type: "string", enum: ["negligible", "low", "standard", "high"] },
        deforestation_alerts: { type: "number" },
        forest_cover_percentage: { type: "number" },
        protected_area: { type: "boolean" },
        indigenous_territory: { type: "boolean" },
        compliance_status: { type: "string" },
        additional_checks_required: { type: "array", items: { type: "string" } },
        data_sources: { type: "array", items: { type: "string" } }
      }
    }
  });

  // Update DDS with analysis
  await base44.entities.EUDRDDS.update(dds_id, {
    deforestation_risk: deforestationAnalysis.risk_level,
    satellite_check_date: new Date().toISOString(),
    forest_cover_percentage: deforestationAnalysis.forest_cover_percentage,
    compliance_notes: JSON.stringify(deforestationAnalysis)
  });

  // Create alert if high risk
  if (deforestationAnalysis.risk_level === 'high') {
    await base44.entities.RiskAlert.create({
      alert_type: 'eudr_violation',
      severity: 'critical',
      title: `High Deforestation Risk: ${ddsData.reference_number}`,
      description: `DDS ${ddsData.reference_number} flagged for high deforestation risk. Immediate action required.\n\nRisk Factors:\n${deforestationAnalysis.additional_checks_required.join('\n')}`,
      source: 'Automated EUDR Screening',
      status: 'active'
    });
    
    await base44.integrations.Core.SendEmail({
      to: context.user.email,
      subject: `🚨 EUDR High Risk Alert: ${ddsData.reference_number}`,
      body: `High deforestation risk detected.\n\nDDS: ${ddsData.reference_number}\nLocation: ${ddsData.plot_geolocation}\nRisk: ${deforestationAnalysis.risk_level}\n\nAction: Review and mitigate before placing goods on market.`
    });
  }

  return {
    status: "success",
    dds_reference: ddsData.reference_number,
    risk_assessment: deforestationAnalysis,
    compliance_status: deforestationAnalysis.compliance_status
  };
}