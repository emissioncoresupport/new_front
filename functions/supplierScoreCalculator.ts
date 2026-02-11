/**
 * Supplier Performance Score Calculator
 * Calculates comprehensive supplier score based on multiple dimensions
 */

export default async function supplierScoreCalculator(context) {
  const { base44, data } = context;
  const { supplier_id } = data;

  const supplier = await base44.entities.Supplier.filter({ id: supplier_id });
  if (!supplier.length) throw new Error("Supplier not found");

  const supplierData = supplier[0];

  // Fetch related data
  const tasks = await base44.entities.OnboardingTask.filter({ supplier_id });
  const esgData = await base44.entities.SupplierESGData.filter({ supplier_id });
  const assessments = await base44.entities.SupplierAssessment.filter({ supplier_id });
  const incidents = await base44.entities.SupplyChainIncident.filter({ supplier_id });
  const verificationRequests = await base44.entities.DataVerificationRequest.filter({ supplier_id });

  // Calculate scores
  const scores = {
    // Compliance Score (30%)
    compliance: {
      weight: 0.30,
      value: 0
    },
    
    // Data Quality Score (25%)
    data_quality: {
      weight: 0.25,
      value: supplierData.data_completeness || 0
    },
    
    // Responsiveness Score (20%)
    responsiveness: {
      weight: 0.20,
      value: 0
    },
    
    // ESG Performance Score (15%)
    esg_performance: {
      weight: 0.15,
      value: 0
    },
    
    // Risk Score (10%) - inverse
    risk: {
      weight: 0.10,
      value: 0
    }
  };

  // Compliance: % of tasks completed
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  scores.compliance.value = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 50;

  // Responsiveness: Average response time for verification requests
  const respondedRequests = verificationRequests.filter(r => r.status === 'supplier_responded' || r.status === 'resolved');
  if (respondedRequests.length > 0) {
    const avgResponseDays = respondedRequests.reduce((sum, r) => {
      if (r.response_date) {
        const days = (new Date(r.response_date) - new Date(r.created_date)) / (1000 * 60 * 60 * 24);
        return sum + days;
      }
      return sum;
    }, 0) / respondedRequests.length;
    
    scores.responsiveness.value = Math.max(0, 100 - (avgResponseDays * 10)); // Penalty for slow response
  } else {
    scores.responsiveness.value = 50; // Neutral if no data
  }

  // ESG Performance: Average assessment scores
  const completedAssessments = assessments.filter(a => a.status === 'completed');
  if (completedAssessments.length > 0) {
    scores.esg_performance.value = completedAssessments.reduce((sum, a) => sum + (a.score || 0), 0) / completedAssessments.length;
  } else {
    scores.esg_performance.value = 50;
  }

  // Risk: Inverse of risk score (fewer incidents = higher score)
  const activeIncidents = incidents.filter(i => i.status !== 'Closed').length;
  scores.risk.value = Math.max(0, 100 - (activeIncidents * 20));

  // Calculate weighted total
  const totalScore = Object.values(scores).reduce((sum, s) => {
    return sum + (s.value * s.weight);
  }, 0);

  // Determine rating
  let rating = 'Poor';
  if (totalScore >= 90) rating = 'Excellent';
  else if (totalScore >= 75) rating = 'Good';
  else if (totalScore >= 60) rating = 'Fair';
  else if (totalScore >= 40) rating = 'Below Average';

  // Update supplier
  await base44.entities.Supplier.update(supplier_id, {
    performance_score: Math.round(totalScore),
    performance_rating: rating
  });

  return {
    status: "success",
    supplier_name: supplierData.legal_name,
    total_score: Math.round(totalScore),
    rating: rating,
    score_breakdown: {
      compliance: Math.round(scores.compliance.value),
      data_quality: Math.round(scores.data_quality.value),
      responsiveness: Math.round(scores.responsiveness.value),
      esg_performance: Math.round(scores.esg_performance.value),
      risk: Math.round(scores.risk.value)
    }
  };
}