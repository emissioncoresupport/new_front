/**
 * Scheduled Risk Screening - Runs daily at 2 AM
 * Automatically screens all suppliers for:
 * - Sanctions lists (OFAC, EU, UN)
 * - News sentiment analysis
 * - Financial distress signals
 * - Geopolitical risks
 * - ESG rating changes
 */

export default async function scheduledRiskScreening(context) {
  const { base44 } = context;
  
  const suppliers = await base44.entities.Supplier.list();
  let alertsCreated = 0;

  for (const supplier of suppliers) {
    try {
      // AI-powered comprehensive risk analysis
      const riskAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Perform comprehensive risk screening for supplier: ${supplier.legal_name}, ${supplier.country}.
        
Analyze:
1. Sanctions Lists: Check OFAC, EU, UN sanctions (company name and country)
2. News Sentiment: Recent negative news, lawsuits, controversies
3. Financial Risk: Bankruptcy indicators, credit rating changes
4. Geopolitical Risk: Political instability, trade restrictions in country
5. ESG Risks: Environmental violations, labor issues, corruption
6. Supply Chain Disruption: Natural disasters, logistics issues in region

Return risk assessment with severity and specific findings.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            overall_risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
            sanctions_flag: { type: "boolean" },
            financial_risk: { type: "string" },
            geopolitical_risk: { type: "string" },
            esg_issues: { type: "array", items: { type: "string" } },
            news_sentiment: { type: "string" },
            recommendations: { type: "array", items: { type: "string" } },
            sources: { type: "array", items: { type: "string" } }
          }
        }
      });

      // Update supplier with AI findings
      await base44.entities.Supplier.update(supplier.id, {
        ai_risk_analysis: JSON.stringify(riskAnalysis),
        geopolitical_risk_flag: riskAnalysis.overall_risk_level === 'high' || riskAnalysis.overall_risk_level === 'critical',
        financial_risk_flag: riskAnalysis.financial_risk?.includes('high') || false,
        last_ai_analysis_date: new Date().toISOString()
      });

      // Create alerts for high/critical risks
      if (riskAnalysis.overall_risk_level === 'high' || riskAnalysis.overall_risk_level === 'critical') {
        await base44.entities.RiskAlert.create({
          supplier_id: supplier.id,
          alert_type: riskAnalysis.sanctions_flag ? 'sanctions' : 'risk_escalation',
          severity: riskAnalysis.overall_risk_level,
          title: `${riskAnalysis.overall_risk_level.toUpperCase()} Risk Detected: ${supplier.legal_name}`,
          description: `AI Risk Analysis:\n${riskAnalysis.news_sentiment}\n\nRecommendations:\n${riskAnalysis.recommendations.join('\n')}`,
          source: 'Automated Risk Screening',
          status: 'active'
        });
        
        // Send email notification
        await base44.integrations.Core.SendEmail({
          to: context.user.email,
          subject: `⚠️ Risk Alert: ${supplier.legal_name}`,
          body: `Risk Level: ${riskAnalysis.overall_risk_level}\n\n${riskAnalysis.news_sentiment}\n\nAction Required: Review supplier profile immediately.`
        });
        
        alertsCreated++;
      }
    } catch (error) {
      console.error(`Risk screening failed for ${supplier.legal_name}:`, error);
    }
  }

  return { 
    status: "success", 
    suppliers_screened: suppliers.length,
    alerts_created: alertsCreated,
    timestamp: new Date().toISOString()
  };
}

export const config = {
  schedule: "0 2 * * *", // Daily at 2 AM
  timeout: 600 // 10 minutes
};