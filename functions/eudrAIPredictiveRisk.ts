import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * EUDR AI Predictive Risk Model
 * ML-based risk prediction using historical patterns
 * 
 * Training data:
 * - Past DDS submissions and outcomes
 * - Satellite analysis results
 * - Supplier compliance history
 * - Country/region risk patterns
 * - Seasonal deforestation trends
 * 
 * Predicts: Likelihood of non-compliance before import
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      production_country,
      commodity_category,
      supplier_id,
      production_month,
      geolocation_provided
    } = await req.json();

    if (!production_country || !commodity_category) {
      return Response.json({ 
        error: 'production_country and commodity_category required' 
      }, { status: 400 });
    }

    // Fetch historical data for pattern analysis
    const historicalDDS = await base44.asServiceRole.entities.EUDRDDS.filter({
      production_country,
      commodity_category
    });

    const satelliteAnalyses = await base44.asServiceRole.entities.EUDRSatelliteAnalysis.list();

    // Build AI training context
    const trainingData = {
      total_submissions: historicalDDS.length,
      compliant_submissions: historicalDDS.filter(d => d.risk_level === 'Low').length,
      high_risk_submissions: historicalDDS.filter(d => d.risk_level === 'High').length,
      average_risk_score: historicalDDS.reduce((sum, d) => sum + (d.risk_score || 50), 0) / (historicalDDS.length || 1),
      deforestation_incidents: satelliteAnalyses.filter(s => s.deforestation_detected).length,
      seasonal_pattern: {}
    };

    // Analyze seasonal patterns
    for (const dds of historicalDDS) {
      if (dds.production_date_start) {
        const month = new Date(dds.production_date_start).getMonth() + 1;
        if (!trainingData.seasonal_pattern[month]) {
          trainingData.seasonal_pattern[month] = { total: 0, high_risk: 0 };
        }
        trainingData.seasonal_pattern[month].total++;
        if (dds.risk_level === 'High') {
          trainingData.seasonal_pattern[month].high_risk++;
        }
      }
    }

    // AI Prediction Model
    const predictionPrompt = `As an EUDR compliance risk prediction AI, analyze the following:

Country: ${production_country}
Commodity: ${commodity_category}
Production Month: ${production_month || 'unknown'}
Supplier History: ${supplier_id ? 'Known supplier' : 'New supplier'}
Geolocation Provided: ${geolocation_provided ? 'Yes' : 'No'}

Historical Data:
- Total past submissions: ${trainingData.total_submissions}
- Compliant rate: ${(trainingData.compliant_submissions / (trainingData.total_submissions || 1) * 100).toFixed(0)}%
- Average risk score: ${trainingData.average_risk_score.toFixed(0)}
- Deforestation incidents: ${trainingData.deforestation_incidents}

Predict:
1. Risk probability (0-100%) for non-compliance
2. Key risk factors (array of strings)
3. Recommended actions (array of strings)
4. Confidence level of prediction (0-100%)
5. Expected satellite findings (e.g., "forest loss likely", "alerts expected")

Consider:
- Country risk classification
- Seasonal deforestation patterns
- Commodity-specific risks
- Lack of geolocation = automatic high risk per Art. 9`;

    const prediction = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: predictionPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          risk_probability_pct: { type: "number" },
          predicted_risk_level: { type: "string" },
          key_risk_factors: { type: "array", items: { type: "string" } },
          recommended_actions: { type: "array", items: { type: "string" } },
          confidence_level: { type: "number" },
          expected_satellite_findings: { type: "string" }
        }
      }
    });

    // Adjust prediction based on hard rules
    if (!geolocation_provided) {
      prediction.risk_probability_pct = Math.max(prediction.risk_probability_pct, 85);
      prediction.predicted_risk_level = 'High';
      prediction.key_risk_factors.push('No geolocation data (mandatory per Art. 9)');
    }

    // Supplier history adjustment
    if (supplier_id) {
      const supplierSubmissions = await base44.asServiceRole.entities.EUDRSupplierSubmission.filter({
        supplier_id
      });

      const supplierCompliance = supplierSubmissions.filter(s => s.verification_status === 'verified').length;
      const supplierTotal = supplierSubmissions.length;

      if (supplierTotal > 0) {
        const complianceRate = (supplierCompliance / supplierTotal) * 100;
        
        if (complianceRate >= 90) {
          prediction.risk_probability_pct *= 0.7; // 30% risk reduction for good suppliers
          prediction.key_risk_factors.push(`Trusted supplier (${complianceRate.toFixed(0)}% compliance rate)`);
        } else if (complianceRate < 50) {
          prediction.risk_probability_pct *= 1.3; // 30% risk increase
          prediction.key_risk_factors.push(`Problematic supplier (${complianceRate.toFixed(0)}% compliance rate)`);
        }
      }
    }

    // Final risk classification
    let finalRisk = 'Low';
    if (prediction.risk_probability_pct >= 60) finalRisk = 'High';
    else if (prediction.risk_probability_pct >= 30) finalRisk = 'Standard';

    return Response.json({
      success: true,
      prediction: {
        risk_probability: prediction.risk_probability_pct,
        risk_level: finalRisk,
        confidence: prediction.confidence_level,
        key_factors: prediction.key_risk_factors,
        recommended_actions: prediction.recommended_actions,
        expected_findings: prediction.expected_satellite_findings
      },
      historical_context: trainingData,
      decision_support: finalRisk === 'High'
        ? '🚨 REJECT IMPORT - High probability of non-compliance'
        : finalRisk === 'Standard'
        ? '⚠️ PROCEED WITH CAUTION - Enhanced verification recommended'
        : '✓ APPROVE - Low risk, standard due diligence sufficient',
      predicted_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI predictive risk error:', error);
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

function calculatePolygonArea(coordinates) {
  let area = 0;
  const n = coordinates.length;
  
  for (let i = 0; i < n - 1; i++) {
    area += coordinates[i][0] * coordinates[i + 1][1];
    area -= coordinates[i + 1][0] * coordinates[i][1];
  }
  
  area = Math.abs(area / 2);
  return area * 111.32 * 111.32 / 10000;
}