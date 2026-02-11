/**
 * XBRL Report Generator
 * Generates compliant XBRL files for SEC/CSRD filings
 */

export default async function xbrlReportGenerator(context) {
  const { base44, data } = context;
  const { reporting_year, frameworks } = data; // frameworks: ['csrd', 'sec', 'ifrs']

  // Fetch all relevant data
  const csrdDataPoints = await base44.entities.CSRDDataPoint.filter({ 
    reporting_year 
  });
  const ccfEntries = await base44.entities.CCFEntry.filter({
    reporting_year
  });
  const goals = await base44.entities.SustainabilityGoal.list();

  // AI generates narrative content
  const narrativeContent = await base44.integrations.Core.InvokeLLM({
    prompt: `Generate executive sustainability narrative for ${reporting_year} annual report.

Key Metrics:
- Total Emissions: ${ccfEntries.reduce((s, e) => s + (e.co2e_tonnes || 0), 0)} tCO2e
- Data Points Collected: ${csrdDataPoints.length}
- Active Goals: ${goals.filter(g => g.status === 'active').length}

Create a professional 2-paragraph summary highlighting:
1. Overall sustainability performance
2. Key achievements and initiatives
3. Progress toward goals
4. Future commitments`,
    response_json_schema: {
      type: "object",
      properties: {
        executive_summary: { type: "string" },
        key_highlights: { type: "array", items: { type: "string" } }
      }
    }
  });

  // Build XBRL structure
  const xbrlData = {
    contextRef: `CY${reporting_year}`,
    entityScheme: "http://www.sec.gov/CIK",
    reportingPeriod: {
      startDate: `${reporting_year}-01-01`,
      endDate: `${reporting_year}-12-31`
    },
    emissions: {
      scope1: ccfEntries.filter(e => e.scope === 1).reduce((s, e) => s + (e.co2e_tonnes || 0), 0),
      scope2: ccfEntries.filter(e => e.scope === 2).reduce((s, e) => s + (e.co2e_tonnes || 0), 0),
      scope3: ccfEntries.filter(e => e.scope === 3).reduce((s, e) => s + (e.co2e_tonnes || 0), 0)
    },
    narrative: narrativeContent.executive_summary,
    dataPoints: csrdDataPoints.map(dp => ({
      esrs: dp.esrs_standard,
      code: dp.esrs_code,
      metric: dp.metric_name,
      value: dp.value,
      unit: dp.unit,
      verified: dp.verification_status === 'Externally Assured'
    }))
  };

  // Generate XBRL XML
  const xbrlXml = generateXBRL(xbrlData, frameworks);

  // Store file
  const fileName = `XBRL_Report_${reporting_year}_${Date.now()}.xml`;
  const { file_url } = await base44.integrations.Core.UploadFile({
    file: new Blob([xbrlXml], { type: 'application/xml' })
  });

  return {
    status: "success",
    file_url,
    frameworks: frameworks,
    reporting_year,
    data_summary: {
      total_emissions: xbrlData.emissions.scope1 + xbrlData.emissions.scope2 + xbrlData.emissions.scope3,
      data_points: csrdDataPoints.length,
      narrative_length: narrativeContent.executive_summary.length
    }
  };
}

function generateXBRL(data, frameworks) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xbrl xmlns="http://www.xbrl.org/2003/instance">
  <context id="${data.contextRef}">
    <entity>
      <identifier scheme="${data.entityScheme}">COMPANY_CIK</identifier>
    </entity>
    <period>
      <startDate>${data.reportingPeriod.startDate}</startDate>
      <endDate>${data.reportingPeriod.endDate}</endDate>
    </period>
  </context>
  
  <!-- Emissions Data -->
  <esg:Scope1Emissions contextRef="${data.contextRef}" unitRef="tCO2e" decimals="2">
    ${data.emissions.scope1}
  </esg:Scope1Emissions>
  <esg:Scope2Emissions contextRef="${data.contextRef}" unitRef="tCO2e" decimals="2">
    ${data.emissions.scope2}
  </esg:Scope2Emissions>
  <esg:Scope3Emissions contextRef="${data.contextRef}" unitRef="tCO2e" decimals="2">
    ${data.emissions.scope3}
  </esg:Scope3Emissions>
  
  <!-- Narrative -->
  <esg:SustainabilityNarrative contextRef="${data.contextRef}">
    ${escapeXml(data.narrative)}
  </esg:SustainabilityNarrative>
  
  <!-- CSRD Data Points -->
  ${data.dataPoints.map(dp => `
  <csrd:${dp.esrs.replace(' ', '')}_${dp.code} contextRef="${data.contextRef}" unitRef="${dp.unit}" decimals="2">
    ${dp.value}
  </csrd:${dp.esrs.replace(' ', '')}_${dp.code}>`).join('\n  ')}
</xbrl>`;
}

function escapeXml(str) {
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
    }
  });
}