import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * EUDR Automated Risk Assessment Engine
 * Per EU Regulation 2023/1115 Art. 10
 * 
 * ENFORCEMENT: December 30, 2026
 * 
 * Three-tier risk classification:
 * - Low Risk: Country benchmark + plot analysis = compliant
 * - Standard Risk: Requires standard due diligence
 * - High Risk: Requires enhanced due diligence + mitigation
 * 
 * Factors:
 * 1. Country of production (EU Commission country benchmarks)
 * 2. Geolocation satellite analysis
 * 3. Deforestation alerts (GLAD/RADD)
 * 4. Supplier compliance history
 * 5. Supply chain traceability
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      batch_id,
      dds_id,
      production_country,
      geolocation_coordinates,
      supplier_id,
      commodity_category
    } = await req.json();

    if (!production_country || !commodity_category) {
      return Response.json({ 
        error: 'production_country and commodity_category are required' 
      }, { status: 400 });
    }

    let totalRiskScore = 0;
    const riskBreakdown = {};

    // FACTOR 1: Country Risk Benchmark (Weight: 40%)
    // Fetch EU country benchmarks
    const benchmarks = await base44.asServiceRole.entities.EUDRCountryBenchmark.list();
    const countryBenchmark = benchmarks.find(b => 
      b.country_code === production_country && 
      b.commodity_category === commodity_category
    );

    let countryRisk = 50; // Default if no benchmark
    if (countryBenchmark) {
      if (countryBenchmark.risk_level === 'Low') countryRisk = 10;
      else if (countryBenchmark.risk_level === 'Standard') countryRisk = 50;
      else if (countryBenchmark.risk_level === 'High') countryRisk = 90;
    }
    
    const countryRiskWeighted = countryRisk * 0.4;
    totalRiskScore += countryRiskWeighted;
    riskBreakdown.country_risk = {
      raw_score: countryRisk,
      weighted_score: countryRiskWeighted,
      weight: '40%',
      classification: countryBenchmark?.risk_level || 'Unknown'
    };

    // FACTOR 2: Satellite Analysis (Weight: 35%)
    let satelliteRisk = 0;
    let satelliteAnalysis = null;

    if (geolocation_coordinates && geolocation_coordinates.length >= 3) {
      // Call satellite analysis
      const satResponse = await base44.asServiceRole.functions.invoke('eudrSatelliteAnalysis', {
        coordinates: geolocation_coordinates,
        analysis_period_start: startDate,
        analysis_period_end: endDate,
        analysis_type: 'full'
      });

      satelliteAnalysis = satResponse.data;
      satelliteRisk = satelliteAnalysis.risk_assessment.risk_score;
    } else {
      // No geolocation = automatic high risk per Art. 9
      satelliteRisk = 100;
      riskBreakdown.geolocation_missing = true;
    }

    const satelliteRiskWeighted = satelliteRisk * 0.35;
    totalRiskScore += satelliteRiskWeighted;
    riskBreakdown.satellite_risk = {
      raw_score: satelliteRisk,
      weighted_score: satelliteRiskWeighted,
      weight: '35%',
      deforestation_detected: satelliteAnalysis?.satellite_data?.forest_cover?.forest_loss_detected || false,
      ndvi_drop: satelliteAnalysis?.satellite_data?.ndvi?.significant_drop || false,
      alerts: satelliteAnalysis?.satellite_data?.alerts?.alert_count || 0
    };

    // FACTOR 3: Supplier Compliance History (Weight: 15%)
    let supplierRisk = 50; // Neutral default
    if (supplier_id) {
      const submissions = await base44.asServiceRole.entities.EUDRSupplierSubmission.filter({
        supplier_id: supplier_id
      });

      const compliantSubmissions = submissions.filter(s => s.verification_status === 'verified').length;
      const totalSubmissions = submissions.length;

      if (totalSubmissions > 0) {
        const complianceRate = (compliantSubmissions / totalSubmissions) * 100;
        supplierRisk = 100 - complianceRate; // Inverse: higher compliance = lower risk
      }
    }

    const supplierRiskWeighted = supplierRisk * 0.15;
    totalRiskScore += supplierRiskWeighted;
    riskBreakdown.supplier_risk = {
      raw_score: supplierRisk,
      weighted_score: supplierRiskWeighted,
      weight: '15%'
    };

    // FACTOR 4: Traceability Completeness (Weight: 10%)
    let traceabilityRisk = 50;
    if (batch_id) {
      const batches = await base44.asServiceRole.entities.EUDRBatch.list();
      const batch = batches.find(b => b.id === batch_id);
      
      if (batch) {
        // Check traceability links
        const links = await base44.asServiceRole.entities.EUDRTraceabilityLink.filter({
          batch_id: batch_id
        });
        
        if (links.length >= 3) traceabilityRisk = 20; // Good traceability
        else if (links.length >= 1) traceabilityRisk = 50; // Partial
        else traceabilityRisk = 80; // Poor traceability
      }
    }

    const traceabilityRiskWeighted = traceabilityRisk * 0.10;
    totalRiskScore += traceabilityRiskWeighted;
    riskBreakdown.traceability_risk = {
      raw_score: traceabilityRisk,
      weighted_score: traceabilityRiskWeighted,
      weight: '10%'
    };

    // FINAL RISK CLASSIFICATION
    let finalRiskLevel = 'Low';
    let requiredActions = [];
    
    if (totalRiskScore >= 60) {
      finalRiskLevel = 'High';
      requiredActions = [
        'Enhanced due diligence required',
        'On-site verification recommended',
        'Third-party audit may be necessary',
        'Mitigation measures mandatory before import',
        'Additional documentation required'
      ];
    } else if (totalRiskScore >= 30) {
      finalRiskLevel = 'Standard';
      requiredActions = [
        'Standard due diligence required',
        'Verify supplier declarations',
        'Review satellite analysis results',
        'Confirm geolocation accuracy'
      ];
    } else {
      finalRiskLevel = 'Low';
      requiredActions = [
        'Standard documentation sufficient',
        'Periodic monitoring recommended'
      ];
    }

    // Update DDS with risk assessment
    if (dds_id) {
      await base44.asServiceRole.entities.EUDRDDS.update(dds_id, {
        risk_level: finalRiskLevel,
        risk_score: totalRiskScore,
        risk_assessment_date: new Date().toISOString(),
        risk_breakdown: riskBreakdown,
        satellite_analysis_id: satelliteAnalysis?.analysis_id,
        deforestation_detected: satelliteAnalysis?.satellite_data?.forest_cover?.forest_loss_detected || false
      });
    }

    // Log usage
    await base44.asServiceRole.entities.UsageLog.create({
      tenant_id: user.tenant_id || user.email.split('@')[1],
      user_email: user.email,
      module: 'EUDR',
      operation_type: 'EUDR_RISK_ASSESSMENT',
      operation_details: { 
        dds_id,
        batch_id,
        risk_level: finalRiskLevel,
        risk_score: totalRiskScore
      },
      cost_units: 1,
      unit_price_eur: 5.00,
      total_cost_eur: 5.00,
      status: 'completed',
      billing_period: new Date().toISOString().slice(0, 7)
    });

    return Response.json({
      success: true,
      risk_assessment: {
        risk_level: finalRiskLevel,
        risk_score: totalRiskScore,
        risk_breakdown: riskBreakdown,
        required_actions: requiredActions
      },
      satellite_analysis: satelliteAnalysis,
      recommendation: finalRiskLevel === 'High' 
        ? '⚠️ DO NOT IMPORT - Enhanced due diligence required'
        : finalRiskLevel === 'Standard'
        ? '✓ Proceed with standard verification'
        : '✓ Low risk - proceed with import',
      compliance_status: finalRiskLevel === 'Low' ? 'compliant' : 'requires_action',
      assessed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Risk engine error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});