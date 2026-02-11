/**
 * CBAM Verification Service
 * Handles accredited verifier workflow per C(2025) 8150
 * Verification opinion: Satisfactory / Unsatisfactory
 */

export class CBAMVerificationService {
  
  /**
   * Create verification request for an operator emission report
   * Per C(2025) 8150 Art. 3
   */
  static async createVerificationRequest(operatorReportId, verifierId, base44Client) {
    const request = await base44Client.entities.CBAMVerificationRequest.create({
      operator_report_id: operatorReportId,
      verifier_id: verifierId,
      status: 'pending',
      requested_date: new Date().toISOString(),
      verification_scope: 'full',
      regulation: 'C(2025) 8150'
    });
    
    return request;
  }
  
  /**
   * Validate verifier accreditation
   * Per C(2025) 8150 Art. 2
   */
  static async validateVerifierAccreditation(verifierId, base44Client) {
    const verifier = await base44Client.entities.CBAMVerifier.get(verifierId);
    
    if (!verifier) {
      return {
        valid: false,
        error: 'Verifier not found'
      };
    }
    
    const errors = [];
    const warnings = [];
    
    // MANDATORY: Accreditation status
    if (verifier.accreditation_status !== 'accredited') {
      errors.push({
        field: 'accreditation_status',
        message: 'Verifier must be accredited',
        regulation: 'Art. 2(1)'
      });
    }
    
    // MANDATORY: Accreditation body
    if (!verifier.accreditation_body) {
      errors.push({
        field: 'accreditation_body',
        message: 'Accreditation body REQUIRED',
        regulation: 'Art. 2(2)'
      });
    }
    
    // MANDATORY: Accreditation number
    if (!verifier.accreditation_number) {
      errors.push({
        field: 'accreditation_number',
        message: 'Accreditation number REQUIRED',
        regulation: 'Art. 2(3)'
      });
    }
    
    // Check expiry
    if (verifier.accreditation_expiry_date) {
      const expiry = new Date(verifier.accreditation_expiry_date);
      const now = new Date();
      
      if (expiry < now) {
        errors.push({
          field: 'accreditation_expiry_date',
          message: 'Accreditation EXPIRED',
          regulation: 'Art. 2(4)',
          severity: 'critical'
        });
      } else if (expiry < new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)) {
        warnings.push({
          field: 'accreditation_expiry_date',
          message: 'Accreditation expires within 90 days',
          regulation: 'Art. 2(4)'
        });
      }
    }
    
    // MANDATORY: Scope of accreditation
    if (!verifier.accreditation_scope || verifier.accreditation_scope.length === 0) {
      warnings.push({
        field: 'accreditation_scope',
        message: 'Accreditation scope should be specified',
        regulation: 'Art. 2(5)'
      });
    }
    
    return {
      valid: errors.length === 0,
      verifier,
      errors,
      warnings
    };
  }
  
  /**
   * Submit verification report
   * Per C(2025) 8150 Art. 4
   */
  static async submitVerificationReport(requestId, reportData, base44Client) {
    const validOpinions = ['satisfactory', 'satisfactory_with_comments', 'unsatisfactory'];
    
    if (!validOpinions.includes(reportData.verification_opinion)) {
      throw new Error('Invalid verification opinion');
    }
    
    const report = await base44Client.entities.CBAMVerificationReport.create({
      verification_request_id: requestId,
      verification_opinion: reportData.verification_opinion,
      verification_date: new Date().toISOString(),
      findings: reportData.findings || [],
      materiality_assessment: reportData.materiality_assessment,
      data_quality_assessment: reportData.data_quality_assessment,
      report_document_url: reportData.report_document_url,
      verifier_signature: reportData.verifier_signature,
      verifier_name: reportData.verifier_name,
      regulation: 'C(2025) 8150 Art. 4'
    });
    
    // Update request status
    await base44Client.entities.CBAMVerificationRequest.update(requestId, {
      status: 'completed',
      completed_date: new Date().toISOString()
    });
    
    return report;
  }
  
  /**
   * Generate verification checklist
   * Per C(2025) 8150 Art. 5
   */
  static generateVerificationChecklist(operatorReport) {
    return {
      data_completeness: [
        { item: 'Installation data complete', required: true },
        { item: 'Emission sources identified', required: true },
        { item: 'Monitoring methodology documented', required: true },
        { item: 'Activity data recorded', required: true },
        { item: 'Emission factors documented', required: true }
      ],
      data_quality: [
        { item: 'Data meets accuracy requirements', required: true },
        { item: 'Measurement systems calibrated', required: true },
        { item: 'Uncertainty assessment performed', required: false },
        { item: 'Quality control procedures followed', required: true }
      ],
      compliance: [
        { item: 'Monitoring plan approved', required: true },
        { item: 'Methodology per Chapter 2 or 3', required: true },
        { item: 'System boundaries correct', required: true },
        { item: 'Reporting period correct', required: true }
      ],
      materiality: [
        { item: 'Materiality threshold assessed (5%)', required: true },
        { item: 'Non-material issues justified', required: false }
      ],
      documentation: [
        { item: 'Supporting documents provided', required: true },
        { item: 'Calculation worksheets available', required: true },
        { item: 'Evidence for claimed values', required: true }
      ]
    };
  }
  
  /**
   * Calculate verification opinion score
   */
  static calculateVerificationScore(checklist) {
    let totalItems = 0;
    let passedItems = 0;
    let requiredFailed = 0;
    
    for (const section of Object.values(checklist)) {
      for (const item of section) {
        totalItems++;
        if (item.passed) {
          passedItems++;
        } else if (item.required) {
          requiredFailed++;
        }
      }
    }
    
    const score = (passedItems / totalItems) * 100;
    
    // Opinion logic
    let opinion = 'unsatisfactory';
    if (requiredFailed === 0 && score >= 95) {
      opinion = 'satisfactory';
    } else if (requiredFailed === 0 && score >= 80) {
      opinion = 'satisfactory_with_comments';
    }
    
    return {
      score,
      opinion,
      total_items: totalItems,
      passed_items: passedItems,
      required_failed: requiredFailed,
      recommendation: opinion === 'satisfactory' 
        ? 'Report meets verification requirements'
        : opinion === 'satisfactory_with_comments'
        ? 'Report meets requirements with minor issues to address'
        : 'Report does NOT meet verification requirements'
    };
  }
  
  /**
   * Validate verification report completeness
   */
  static validateVerificationReport(report) {
    const errors = [];
    
    if (!report.verification_opinion) {
      errors.push({
        field: 'verification_opinion',
        message: 'Verification opinion REQUIRED',
        regulation: 'Art. 4(1)'
      });
    }
    
    if (!report.verification_date) {
      errors.push({
        field: 'verification_date',
        message: 'Verification date REQUIRED',
        regulation: 'Art. 4(2)'
      });
    }
    
    if (!report.verifier_signature) {
      errors.push({
        field: 'verifier_signature',
        message: 'Verifier signature REQUIRED',
        regulation: 'Art. 4(3)'
      });
    }
    
    if (!report.report_document_url) {
      errors.push({
        field: 'report_document_url',
        message: 'Verification report document REQUIRED',
        regulation: 'Art. 4(4)'
      });
    }
    
    if (report.verification_opinion === 'unsatisfactory' && (!report.findings || report.findings.length === 0)) {
      errors.push({
        field: 'findings',
        message: 'Findings REQUIRED for unsatisfactory opinion',
        regulation: 'Art. 4(5)'
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default CBAMVerificationService;