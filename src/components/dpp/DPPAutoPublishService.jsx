/**
 * DPP Auto-Publish Service
 * Handles automated publishing triggers based on data quality thresholds
 */

export const AUTO_PUBLISH_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 85,
  ACCEPTABLE: 75
};

/**
 * Check if DPP meets auto-publish threshold
 */
export const shouldTriggerAutoPublish = (qualityScore, threshold = AUTO_PUBLISH_THRESHOLDS.GOOD) => {
  return qualityScore >= threshold;
};

/**
 * Check if DPP is ready for publication
 */
export const isReadyForPublication = (dppData, qualityResult) => {
  const checks = {
    has_category: !!dppData.category,
    has_materials: dppData.material_composition?.length > 0,
    materials_sum_100: Math.abs(
      (dppData.material_composition || []).reduce((sum, m) => sum + (m.percentage || 0), 0) - 100
    ) <= 0.1,
    has_gtin: !!dppData.general_info?.gtin,
    has_manufacturer: !!dppData.general_info?.manufacturer,
    no_critical_issues: qualityResult?.recommendations?.critical_issues?.length === 0,
    quality_threshold_met: qualityResult?.overall_score >= AUTO_PUBLISH_THRESHOLDS.GOOD
  };

  const allChecksPassed = Object.values(checks).every(Boolean);

  return {
    ready: allChecksPassed,
    checks,
    missing: Object.entries(checks)
      .filter(([_, passed]) => !passed)
      .map(([check]) => check)
  };
};

/**
 * Generate publication readiness report
 */
export const getPublicationReadiness = (dppData, qualityResult) => {
  const readiness = isReadyForPublication(dppData, qualityResult);
  const score = qualityResult?.overall_score || 0;

  let status = 'not_ready';
  let message = 'Complete required fields before publishing';
  let color = 'red';

  if (readiness.ready) {
    if (score >= AUTO_PUBLISH_THRESHOLDS.EXCELLENT) {
      status = 'excellent';
      message = 'Excellent data quality - Ready for immediate publication';
      color = 'emerald';
    } else if (score >= AUTO_PUBLISH_THRESHOLDS.GOOD) {
      status = 'ready';
      message = 'Good data quality - Ready for publication';
      color = 'green';
    } else {
      status = 'acceptable';
      message = 'Acceptable quality - Consider improvements before publishing';
      color = 'yellow';
    }
  }

  return {
    status,
    message,
    color,
    readiness,
    score,
    can_publish: readiness.ready
  };
};

/**
 * Validate scheduled publication date
 */
export const validateScheduledDate = (scheduledDate) => {
  const now = new Date();
  const scheduled = new Date(scheduledDate);

  if (scheduled <= now) {
    return {
      valid: false,
      error: 'Scheduled date must be in the future'
    };
  }

  // Maximum 1 year in advance
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);

  if (scheduled > maxDate) {
    return {
      valid: false,
      error: 'Cannot schedule more than 1 year in advance'
    };
  }

  return { valid: true };
};

/**
 * Calculate recommended publication date based on data quality
 */
export const getRecommendedPublicationDate = (qualityScore) => {
  const now = new Date();
  
  if (qualityScore >= AUTO_PUBLISH_THRESHOLDS.EXCELLENT) {
    // Ready now
    return now;
  } else if (qualityScore >= AUTO_PUBLISH_THRESHOLDS.GOOD) {
    // Review in 1 day
    return new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  } else if (qualityScore >= AUTO_PUBLISH_THRESHOLDS.ACCEPTABLE) {
    // Review in 3 days
    return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  } else {
    // Review in 1 week
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
};