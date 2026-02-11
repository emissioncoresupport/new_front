/**
 * CBAM Pre-Submission Validator
 * Comprehensive validation before quarterly report submission
 * Per C(2025) 8151 Art. 6-7
 */

import { CBAMValidationService } from './CBAMValidationService';
import { CBAMMaterialityService } from './CBAMMaterialityService';
import { CBAMDataQualityService } from './CBAMDataQualityService';
import { CBAMEORIValidator } from './CBAMEORIValidator';

export class CBAMPreSubmissionValidator {
  
  /**
   * Comprehensive pre-submission check
   * Blocks submission if critical issues found
   */
  static async validateForSubmission(reportData, entries, base44Client) {
    const validations = {
      report_metadata: this.validateReportMetadata(reportData),
      entries_validation: await this.validateAllEntries(entries),
      eori_validation: CBAMEORIValidator.validateBatch(entries),
      materiality_check: CBAMMaterialityService.assessMaterialityBatch(entries),
      data_quality: CBAMDataQualityService.assessBatchQuality(entries),
      certificates: this.validateCertificateBalance(reportData, entries),
      verification: await this.validateVerificationStatus(entries, base44Client)
    };
    
    // Collect all blocking issues
    const criticalErrors = [];
    const warnings = [];
    
    // Report metadata errors
    if (!validations.report_metadata.valid) {
      criticalErrors.push(...validations.report_metadata.errors);
    }
    warnings.push(...(validations.report_metadata.warnings || []));
    
    // Entry validation errors
    const failedEntries = validations.entries_validation.results.filter(r => !r.valid);
    if (failedEntries.length > 0) {
      criticalErrors.push({
        section: 'entries',
        message: `${failedEntries.length} entries have validation errors`,
        count: failedEntries.length
      });
    }
    
    // EORI errors
    if (validations.eori_validation.summary.invalid > 0) {
      criticalErrors.push({
        section: 'eori',
        message: `${validations.eori_validation.summary.invalid} entries have invalid EORI`,
        count: validations.eori_validation.summary.invalid
      });
    }
    
    // Material issues requiring verification
    const unverifiedMaterial = validations.materiality_check.results.filter(
      r => r.is_material && entries.find(e => e.id === r.entry_id)?.verification_status !== 'accredited_verifier_satisfactory'
    );
    if (unverifiedMaterial.length > 0) {
      warnings.push({
        section: 'materiality',
        message: `${unverifiedMaterial.length} material deviations lack verification`,
        count: unverifiedMaterial.length,
        severity: 'high'
      });
    }
    
    // Low data quality
    const lowQuality = validations.data_quality.results.filter(r => r.score < 60);
    if (lowQuality.length > 0) {
      warnings.push({
        section: 'data_quality',
        message: `${lowQuality.length} entries have low data quality`,
        count: lowQuality.length,
        severity: 'medium'
      });
    }
    
    // Certificate balance
    if (!validations.certificates.sufficient) {
      criticalErrors.push({
        section: 'certificates',
        message: 'Insufficient certificates for surrender',
        required: validations.certificates.required,
        available: validations.certificates.available,
        shortfall: validations.certificates.shortfall
      });
    }
    
    const canSubmit = criticalErrors.length === 0;
    const readinessScore = this.calculateReadinessScore(validations);
    
    return {
      can_submit: canSubmit,
      ready_for_submission: canSubmit && readinessScore >= 95,
      readiness_score: readinessScore,
      critical_errors: criticalErrors,
      warnings: warnings,
      validations,
      regulation: 'C(2025) 8151 Art. 6-7',
      recommendation: canSubmit 
        ? readinessScore >= 95 
          ? 'Ready for submission'
          : 'Can submit but address warnings for better quality'
        : 'Cannot submit - resolve critical errors first'
    };
  }
  
  /**
   * Validate report metadata
   */
  static validateReportMetadata(report) {
    const errors = [];
    const warnings = [];
    
    // MANDATORY fields
    if (!report.reporting_year || report.reporting_year < 2026) {
      errors.push({
        field: 'reporting_year',
        message: 'Reporting year REQUIRED (≥2026)',
        regulation: 'Art. 7'
      });
    }
    
    if (!report.reporting_quarter || report.reporting_quarter < 1 || report.reporting_quarter > 4) {
      errors.push({
        field: 'reporting_quarter',
        message: 'Reporting quarter REQUIRED (1-4)',
        regulation: 'Art. 7'
      });
    }
    
    if (!report.eori_number) {
      errors.push({
        field: 'eori_number',
        message: 'Declarant EORI REQUIRED',
        regulation: 'Art. 16(1)'
      });
    }
    
    if (!report.member_state) {
      errors.push({
        field: 'member_state',
        message: 'Member state REQUIRED',
        regulation: 'Art. 6(2)'
      });
    }
    
    // Check submission deadline
    const deadline = this.getSubmissionDeadline(report.reporting_year, report.reporting_quarter);
    const now = new Date();
    
    if (now > deadline) {
      errors.push({
        field: 'submission_date',
        message: 'Submission deadline passed',
        deadline: deadline.toISOString().split('T')[0],
        regulation: 'Art. 6(2)'
      });
    } else if (now > new Date(deadline.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      warnings.push({
        field: 'submission_date',
        message: 'Less than 7 days until deadline',
        deadline: deadline.toISOString().split('T')[0]
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Get submission deadline per Art. 6(2)
   * Within 1 month after end of reporting quarter
   */
  static getSubmissionDeadline(year, quarter) {
    const quarterEndMonth = quarter * 3;
    const deadline = new Date(year, quarterEndMonth, 31); // Last day of following month
    return deadline;
  }
  
  /**
   * Validate all entries using existing validation service
   */
  static async validateAllEntries(entries) {
    const results = [];
    
    for (const entry of entries) {
      const validation = CBAMValidationService.validateEntry(entry);
      results.push({
        entry_id: entry.id,
        cn_code: entry.cn_code,
        ...validation
      });
    }
    
    const validCount = results.filter(r => r.valid).length;
    
    return {
      results,
      summary: {
        total: entries.length,
        valid: validCount,
        invalid: entries.length - validCount,
        compliance_rate: entries.length > 0 ? (validCount / entries.length) * 100 : 0
      }
    };
  }
  
  /**
   * Validate certificate balance for surrender
   */
  static validateCertificateBalance(report, entries) {
    const totalRequired = entries.reduce((sum, e) => 
      sum + (e.certificates_required || 0), 0
    );
    
    const certificatesAvailable = report.certificates_surrendered || 0;
    const shortfall = Math.max(0, totalRequired - certificatesAvailable);
    
    return {
      required: Math.ceil(totalRequired),
      available: certificatesAvailable,
      shortfall: Math.ceil(shortfall),
      sufficient: shortfall === 0,
      regulation: 'Art. 22 Reg 2023/956'
    };
  }
  
  /**
   * Validate verification status
   */
  static async validateVerificationStatus(entries, base44Client) {
    const actualDataEntries = entries.filter(e => 
      e.calculation_method === 'actual_values' || e.calculation_method === 'EU_method'
    );
    
    const verified = actualDataEntries.filter(e => 
      e.verification_status === 'accredited_verifier_satisfactory'
    );
    
    const unverified = actualDataEntries.length - verified.length;
    
    return {
      total_actual_data: actualDataEntries.length,
      verified: verified.length,
      unverified: unverified,
      verification_rate: actualDataEntries.length > 0 
        ? (verified.length / actualDataEntries.length) * 100 
        : 100,
      requires_action: unverified > 0,
      regulation: 'C(2025) 8150'
    };
  }
  
  /**
   * Calculate overall readiness score
   */
  static calculateReadinessScore(validations) {
    const weights = {
      report_metadata: 0.15,
      entries_validation: 0.30,
      eori_validation: 0.15,
      data_quality: 0.20,
      certificates: 0.10,
      verification: 0.10
    };
    
    let score = 0;
    
    // Report metadata
    score += validations.report_metadata.valid ? 100 * weights.report_metadata : 0;
    
    // Entries validation
    score += validations.entries_validation.summary.compliance_rate * weights.entries_validation;
    
    // EORI validation
    const eoriRate = validations.eori_validation.summary.total > 0
      ? (validations.eori_validation.summary.valid / validations.eori_validation.summary.total) * 100
      : 100;
    score += eoriRate * weights.eori_validation;
    
    // Data quality
    score += validations.data_quality.summary.average_score * weights.data_quality;
    
    // Certificates
    score += validations.certificates.sufficient ? 100 * weights.certificates : 0;
    
    // Verification
    score += validations.verification.verification_rate * weights.verification;
    
    return Math.round(score);
  }
}

export default CBAMPreSubmissionValidator;