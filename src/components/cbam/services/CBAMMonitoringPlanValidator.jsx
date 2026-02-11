/**
 * CBAM Monitoring Plan Validator
 * Validates monitoring plans per C(2025) 8151 Art. 8-12
 * Enforces English language requirement and completeness checks
 */

export class CBAMMonitoringPlanValidator {
  
  /**
   * Validate monitoring plan for all regulatory requirements
   * Per Art. 8-12 C(2025) 8151
   */
  static validatePlan(plan) {
    const errors = [];
    const warnings = [];
    
    // 1. MANDATORY: English language (Art. 10(4))
    if (!plan.language || plan.language !== 'English') {
      errors.push({
        field: 'language',
        message: 'Monitoring plan MUST be in English',
        regulation: 'Art. 10(4) C(2025) 8151',
        severity: 'critical'
      });
    }
    
    // 2. MANDATORY: Installation linkage
    if (!plan.installation_id) {
      errors.push({
        field: 'installation_id',
        message: 'Installation reference REQUIRED',
        regulation: 'Art. 8(1)',
        severity: 'critical'
      });
    }
    
    // 3. MANDATORY: Plan reference number
    if (!plan.plan_reference) {
      errors.push({
        field: 'plan_reference',
        message: 'Unique plan reference number REQUIRED',
        regulation: 'Art. 8(2)',
        severity: 'critical'
      });
    }
    
    // 4. MANDATORY: Reporting period (2026+)
    if (!plan.reporting_period_year) {
      errors.push({
        field: 'reporting_period_year',
        message: 'Reporting period year REQUIRED',
        regulation: 'Art. 7',
        severity: 'critical'
      });
    } else if (plan.reporting_period_year < 2026) {
      errors.push({
        field: 'reporting_period_year',
        message: 'Reporting period cannot be before 2026',
        regulation: 'Art. 7',
        severity: 'critical'
      });
    }
    
    // 5. MANDATORY: Functional units definition
    if (!plan.functional_units || plan.functional_units.length === 0) {
      errors.push({
        field: 'functional_units',
        message: 'At least one functional unit REQUIRED',
        regulation: 'Art. 4',
        severity: 'critical'
      });
    } else {
      // Validate each functional unit
      plan.functional_units.forEach((fu, idx) => {
        if (!fu.cn_code) {
          errors.push({
            field: `functional_units[${idx}].cn_code`,
            message: 'CN code REQUIRED for each functional unit',
            regulation: 'Art. 4(1)',
            severity: 'high'
          });
        }
        if (!fu.functional_unit_type) {
          errors.push({
            field: `functional_units[${idx}].functional_unit_type`,
            message: 'Functional unit type REQUIRED',
            regulation: 'Art. 4(2)',
            severity: 'high'
          });
        }
      });
    }
    
    // 6. MANDATORY: Production processes (Art. 9)
    if (!plan.production_processes || plan.production_processes.length === 0) {
      errors.push({
        field: 'production_processes',
        message: 'At least one production process REQUIRED',
        regulation: 'Art. 9',
        severity: 'critical'
      });
    } else {
      // Validate each process
      plan.production_processes.forEach((proc, idx) => {
        if (!proc.process_name) {
          errors.push({
            field: `production_processes[${idx}].process_name`,
            message: 'Process name REQUIRED',
            regulation: 'Art. 9(1)',
            severity: 'high'
          });
        }
        if (!proc.system_boundary_description) {
          warnings.push({
            field: `production_processes[${idx}].system_boundary_description`,
            message: 'System boundary description recommended',
            regulation: 'Art. 9(2)'
          });
        }
        if (!proc.emission_sources || proc.emission_sources.length === 0) {
          errors.push({
            field: `production_processes[${idx}].emission_sources`,
            message: 'Emission sources REQUIRED',
            regulation: 'Art. 9(3)',
            severity: 'high'
          });
        }
      });
    }
    
    // 7. MANDATORY: Monitoring methodology
    const validMethods = ['calculation_based', 'measurement_based', 'mass_balance'];
    if (!plan.monitoring_methodology) {
      errors.push({
        field: 'monitoring_methodology',
        message: 'Monitoring methodology REQUIRED',
        regulation: 'Art. 10',
        severity: 'critical'
      });
    } else if (!validMethods.includes(plan.monitoring_methodology)) {
      errors.push({
        field: 'monitoring_methodology',
        message: `Invalid methodology. Allowed: ${validMethods.join(', ')}`,
        regulation: 'Art. 10',
        severity: 'high'
      });
    }
    
    // 8. Measurement systems (if measurement-based)
    if (plan.monitoring_methodology === 'measurement_based') {
      if (!plan.measurement_systems || plan.measurement_systems.length === 0) {
        errors.push({
          field: 'measurement_systems',
          message: 'Measurement systems REQUIRED for measurement-based methodology',
          regulation: 'Art. 10(3)',
          severity: 'critical'
        });
      } else {
        plan.measurement_systems.forEach((sys, idx) => {
          if (!sys.type) {
            errors.push({
              field: `measurement_systems[${idx}].type`,
              message: 'Measurement system type REQUIRED',
              regulation: 'Art. 10(3)',
              severity: 'high'
            });
          }
          if (!sys.accuracy) {
            warnings.push({
              field: `measurement_systems[${idx}].accuracy`,
              message: 'Accuracy specification recommended',
              regulation: 'Art. 10(3)'
            });
          }
          if (!sys.calibration_frequency) {
            warnings.push({
              field: `measurement_systems[${idx}].calibration_frequency`,
              message: 'Calibration frequency specification recommended',
              regulation: 'Art. 10(3)'
            });
          }
        });
      }
    }
    
    // 9. Document attachment recommended
    if (!plan.file_url) {
      warnings.push({
        field: 'file_url',
        message: 'Uploading the monitoring plan document is recommended',
        regulation: 'Art. 8(4)'
      });
    }
    
    // 10. Status validation
    if (plan.status === 'approved' && !plan.approved_by) {
      errors.push({
        field: 'approved_by',
        message: 'Approver REQUIRED for approved plans',
        regulation: 'Art. 11',
        severity: 'high'
      });
    }
    
    if (plan.status === 'approved' && !plan.approved_date) {
      errors.push({
        field: 'approved_date',
        message: 'Approval date REQUIRED for approved plans',
        regulation: 'Art. 11',
        severity: 'high'
      });
    }
    
    // Calculate completeness score
    const totalChecks = 10;
    const failedCritical = errors.filter(e => e.severity === 'critical').length;
    const failedHigh = errors.filter(e => e.severity === 'high').length;
    const warningCount = warnings.length;
    
    const completeness = Math.max(0, 100 - (failedCritical * 20) - (failedHigh * 10) - (warningCount * 2));
    
    const isValid = failedCritical === 0 && failedHigh === 0;
    const isReadyForSubmission = isValid && completeness >= 95;
    
    return {
      valid: isValid,
      ready_for_submission: isReadyForSubmission,
      completeness_score: completeness,
      errors,
      warnings,
      critical_issues: failedCritical,
      high_issues: failedHigh,
      summary: {
        language_valid: plan.language === 'English',
        installation_linked: !!plan.installation_id,
        functional_units_defined: plan.functional_units?.length > 0,
        processes_defined: plan.production_processes?.length > 0,
        methodology_specified: !!plan.monitoring_methodology,
        document_attached: !!plan.file_url,
        status: plan.status
      }
    };
  }
  
  /**
   * Validate English language in text content
   * Basic check for non-English characters
   */
  static validateEnglishText(text) {
    if (!text) return { valid: true };
    
    // Check for common non-English characters
    const nonEnglishPattern = /[^\x00-\x7F\u0080-\u00FF]/g;
    const matches = text.match(nonEnglishPattern);
    
    if (matches && matches.length > 10) {
      return {
        valid: false,
        message: 'Text appears to contain non-English characters',
        regulation: 'Art. 10(4)'
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Check if plan is approved and can be used for operator reports
   */
  static canBeUsedForReporting(plan) {
    const validation = this.validatePlan(plan);
    
    return {
      can_use: plan.status === 'approved' && validation.valid,
      reason: plan.status !== 'approved' 
        ? 'Plan must be approved' 
        : !validation.valid 
        ? 'Plan has validation errors' 
        : null,
      validation
    };
  }
  
  /**
   * Generate approval checklist
   */
  static getApprovalChecklist(plan) {
    const validation = this.validatePlan(plan);
    
    return {
      ready_for_approval: validation.valid && validation.completeness_score >= 95,
      checklist: [
        { item: 'Language is English', passed: plan.language === 'English', required: true },
        { item: 'Installation linked', passed: !!plan.installation_id, required: true },
        { item: 'Functional units defined', passed: plan.functional_units?.length > 0, required: true },
        { item: 'Production processes defined', passed: plan.production_processes?.length > 0, required: true },
        { item: 'Monitoring methodology specified', passed: !!plan.monitoring_methodology, required: true },
        { item: 'Document uploaded', passed: !!plan.file_url, required: false },
        { item: 'No critical validation errors', passed: validation.critical_issues === 0, required: true },
        { item: 'Completeness ≥95%', passed: validation.completeness_score >= 95, required: true }
      ],
      validation
    };
  }
}

export default CBAMMonitoringPlanValidator;