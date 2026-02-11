import { base44 } from "@/api/base44Client";

/**
 * EFRAG IG 1 Compliant Materiality Assessment Service
 * Automates double materiality scoring with company data
 */

export async function autoAssessMateriality() {
  try {
    // Fetch company operational data
    const [suppliers, products, dataPoints, scope3, incidents] = await Promise.all([
      base44.entities.Supplier.list(),
      base44.entities.Product.list(),
      base44.entities.CSRDDataPoint.list(),
      base44.entities.Scope3Entry.list().catch(() => []),
      base44.entities.EUDAMEDIncident.list().catch(() => [])
    ]);

    const companyContext = {
      supplier_count: suppliers.length,
      high_risk_suppliers: suppliers.filter(s => s.risk_level === 'high' || s.risk_level === 'critical').length,
      countries: [...new Set(suppliers.map(s => s.country))],
      product_count: products.length,
      has_scope3_data: scope3.length > 0,
      has_incidents: incidents.length > 0,
      existing_data_points: dataPoints.length
    };

    // AI-powered materiality assessment
    const assessment = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an EFRAG CSRD expert conducting double materiality assessment per EFRAG IG 1.

COMPANY OPERATIONAL DATA:
- Suppliers: ${companyContext.supplier_count} (${companyContext.high_risk_suppliers} high-risk)
- Operating Countries: ${companyContext.countries.join(', ')}
- Products: ${companyContext.product_count}
- Scope 3 Emissions Tracked: ${companyContext.has_scope3_data ? 'Yes' : 'No'}
- Safety Incidents: ${companyContext.has_incidents ? 'Yes' : 'No'}

TASK: Assess ALL ESRS topics (E1-E5, S1-S4, G1) for double materiality.

For EACH topic, evaluate:
1. IMPACT MATERIALITY (0-10): Severity × Likelihood of impact on people/environment
2. FINANCIAL MATERIALITY (0-10): Magnitude × Probability of financial effect
3. IS MATERIAL: True if EITHER score ≥ 5 (per EFRAG IG 1)

Consider company context above when scoring. Output structured assessment.`,
      response_json_schema: {
        type: 'object',
        properties: {
          topics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                topic_name: { type: 'string' },
                esrs_standard: { type: 'string' },
                impact_materiality_score: { type: 'number' },
                financial_materiality_score: { type: 'number' },
                is_material: { type: 'boolean' },
                impact_description: { type: 'string' },
                financial_impact_description: { type: 'string' },
                stakeholder_groups: { type: 'array', items: { type: 'string' } }
              },
              required: ['topic_name', 'esrs_standard', 'impact_materiality_score', 'financial_materiality_score', 'is_material']
            }
          }
        }
      }
    });

    return assessment.topics;
  } catch (error) {
    console.error('Materiality assessment failed:', error);
    throw error;
  }
}

export async function generateTasksFromMateriality(materialTopics) {
  const tasks = [];
  
  for (const topic of materialTopics) {
    // Generate data collection tasks for material topics
    tasks.push({
      title: `Collect ${topic.esrs_standard} Data`,
      description: `Collect quantitative metrics for ${topic.topic_name} per ESRS disclosure requirements`,
      task_type: 'data_collection',
      esrs_standard: topic.esrs_standard,
      priority: 'high',
      status: 'pending'
    });

    // Generate narrative tasks
    tasks.push({
      title: `Draft ${topic.esrs_standard} Narrative`,
      description: `Prepare sustainability narrative for ${topic.topic_name}`,
      task_type: 'narrative_preparation',
      esrs_standard: topic.esrs_standard,
      priority: 'medium',
      status: 'pending'
    });
  }

  return tasks;
}

export async function assessMaterialityWithAI(topicName, companyContext = {}) {
  try {
    const assessment = await base44.integrations.Core.InvokeLLM({
      prompt: `Assess materiality for: ${topicName}

Company Context: ${JSON.stringify(companyContext)}

Evaluate per EFRAG IG 1:
- Impact Materiality (0-10): Severity × Likelihood
- Financial Materiality (0-10): Magnitude × Probability
- Is Material: true if either ≥ 5`,
      response_json_schema: {
        type: 'object',
        properties: {
          impact_materiality_score: { type: 'number' },
          financial_materiality_score: { type: 'number' },
          is_material: { type: 'boolean' },
          impact_reasoning: { type: 'string' },
          financial_reasoning: { type: 'string' },
          recommended_esrs_standard: { type: 'string' }
        }
      }
    });
    return assessment;
  } catch (error) {
    console.error('AI assessment failed:', error);
    throw error;
  }
}

export async function suggestESRSDataPoints(esrsStandard) {
  try {
    const suggestions = await base44.integrations.Core.InvokeLLM({
      prompt: `Suggest common data points for ${esrsStandard}`,
      response_json_schema: {
        type: 'object',
        properties: {
          data_points: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                metric_name: { type: 'string' },
                esrs_code: { type: 'string' },
                unit: { type: 'string' }
              }
            }
          }
        }
      }
    });
    return suggestions.data_points || [];
  } catch (error) {
    return [];
  }
}

export async function autoCollectDataFromModules(esrsStandard) {
  const dataPoints = [];

  try {
    if (esrsStandard === 'ESRS E1') {
      // Climate Change - collect from CCF module
      const [ccfEntries, scope3] = await Promise.all([
        base44.entities.CCFEntry.list().catch(() => []),
        base44.entities.Scope3Entry.list().catch(() => [])
      ]);

      const totalScope1 = ccfEntries.filter(e => e.scope === 'Scope 1').reduce((sum, e) => sum + (e.co2e || 0), 0);
      const totalScope2 = ccfEntries.filter(e => e.scope === 'Scope 2').reduce((sum, e) => sum + (e.co2e || 0), 0);
      const totalScope3 = scope3.reduce((sum, e) => sum + (e.total_emissions || 0), 0);

      if (totalScope1 > 0) dataPoints.push({ metric_name: 'Total Scope 1 GHG Emissions', esrs_code: 'E1-5', value: totalScope1, unit: 'tCO2e' });
      if (totalScope2 > 0) dataPoints.push({ metric_name: 'Total Scope 2 GHG Emissions', esrs_code: 'E1-5', value: totalScope2, unit: 'tCO2e' });
      if (totalScope3 > 0) dataPoints.push({ metric_name: 'Total Scope 3 GHG Emissions', esrs_code: 'E1-5', value: totalScope3, unit: 'tCO2e' });
    }

    if (esrsStandard === 'ESRS S2') {
      // Value Chain Workers - collect from SupplyLens
      const suppliers = await base44.entities.Supplier.list();
      const highRiskSuppliers = suppliers.filter(s => s.human_rights_risk > 50).length;
      
      if (suppliers.length > 0) {
        dataPoints.push({ 
          metric_name: 'Value Chain Workers - Suppliers Assessed', 
          esrs_code: 'S2-1', 
          value: suppliers.length, 
          unit: 'suppliers' 
        });
        dataPoints.push({ 
          metric_name: 'High Human Rights Risk Suppliers', 
          esrs_code: 'S2-4', 
          value: highRiskSuppliers, 
          unit: 'suppliers' 
        });
      }
    }

    if (esrsStandard === 'ESRS E5') {
      // Circular Economy - collect from DPP/Products
      const products = await base44.entities.Product.list().catch(() => []);
      const dppRecords = await base44.entities.DPPRecord.list().catch(() => []);
      
      const avgRecyclability = dppRecords.length > 0 
        ? dppRecords.reduce((sum, d) => sum + (d.sustainability_metrics?.recyclability_score || 0), 0) / dppRecords.length 
        : 0;

      if (products.length > 0) {
        dataPoints.push({ 
          metric_name: 'Products with Circularity Assessment', 
          esrs_code: 'E5-4', 
          value: dppRecords.length, 
          unit: 'products' 
        });
      }
      if (avgRecyclability > 0) {
        dataPoints.push({ 
          metric_name: 'Average Product Recyclability Score', 
          esrs_code: 'E5-5', 
          value: Math.round(avgRecyclability), 
          unit: '%' 
        });
      }
    }

    return dataPoints;
  } catch (error) {
    console.error('Auto data collection failed:', error);
    return [];
  }
}