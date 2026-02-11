/**
 * PRECURSOR YEAR VALIDATION SERVICE
 * Enforces reporting-year alignment for precursor emissions
 * 
 * LIFECYCLE: Validation
 * DOMAIN: Complex goods precursor year enforcement
 * COMPLIANCE: CBAM Reg 2023/956 Art. 14(2) & C(2025) 8151 Art. 13-15
 */

import { base44 } from '@/api/base44Client';
import AuditTrailService from '../shared/AuditTrailService';

class PrecursorYearValidationService {
  VERSION = '2.0';
  LIFECYCLE = 'VALIDATION';

  /**
   * Validate precursor year consistency for complex goods
   * 
   * RULE: Precursor year must default to complex good reporting year
   * DEVIATION: Only allowed with explicit justification + evidence
   * BLOCKING: Year mismatch without justification blocks validation
   */
  async validatePrecursorYears(entryId) {
    try {
      const user = await base44.auth.me();

      // Fetch entry
      const entries = await base44.entities.CBAMEmissionEntry.list();
      const entry = entries.find(e => e.id === entryId);

      if (!entry) {
        return { success: false, error: 'Entry not found' };
      }

      // Check if entry has precursors
      if (!entry.precursors_used || entry.precursors_used.length === 0) {
        return {
          success: true,
          validation_type: 'no_precursors',
          message: 'No precursors present, validation skipped'
        };
      }

      const validationResults = [];
      let blockingIssueFound = false;

      // Validate each precursor
      for (const precursor of entry.precursors_used) {
        const precursorYear = precursor.reporting_period_year;
        const complexGoodYear = entry.reporting_period_year;

        // DEFAULT RULE: Years should match
        if (precursorYear === complexGoodYear) {
          validationResults.push({
            precursor_cn_code: precursor.precursor_cn_code,
            precursor_year: precursorYear,
            complex_good_year: complexGoodYear,
            status: 'PASS',
            message: 'Year alignment confirmed',
            requires_evidence: false
          });
          continue;
        }

        // DEVIATION: Year mismatch detected
        // Check for justification and evidence
        const deviation = await this._findPrecursorYearDeviation(
          entryId,
          precursor.precursor_cn_code,
          precursorYear
        );

        if (!deviation) {
          // NO JUSTIFICATION: Blocking issue
          validationResults.push({
            precursor_cn_code: precursor.precursor_cn_code,
            precursor_year: precursorYear,
            complex_good_year: complexGoodYear,
            status: 'BLOCKED',
            message: `Year mismatch: precursor ${precursorYear} vs complex good ${complexGoodYear}. Justification and evidence required.`,
            requires_evidence: true,
            severity: 'HIGH',
            compliance_risk: 'Art. 14(2) - Precursor year alignment'
          });
          blockingIssueFound = true;
          continue;
        }

        // HAS JUSTIFICATION AND EVIDENCE: Downgrade to WARNING
        if (deviation.status !== 'approved') {
          validationResults.push({
            precursor_cn_code: precursor.precursor_cn_code,
            precursor_year: precursorYear,
            complex_good_year: complexGoodYear,
            status: 'WARNING',
            message: `Year mismatch justified but pending review: ${deviation.justification}`,
            justification: deviation.justification,
            evidence_reference: deviation.evidence_reference,
            requires_evidence: true,
            severity: 'MEDIUM'
          });
          continue;
        }

        // APPROVED DEVIATION: Warning level
        validationResults.push({
          precursor_cn_code: precursor.precursor_cn_code,
          precursor_year: precursorYear,
          complex_good_year: complexGoodYear,
          status: 'WARNING',
          message: `Year mismatch approved with evidence: ${deviation.justification}`,
          justification: deviation.justification,
          evidence_reference: deviation.evidence_reference,
          approved_by: deviation.approved_by,
          severity: 'LOW'
        });
      }

      // Determine overall validation status
      const overallStatus = blockingIssueFound ? 'BLOCKED' : 
                           validationResults.some(r => r.status === 'WARNING') ? 'WARNING' : 
                           'PASS';

      const result = {
        success: true,
        validation_type: 'precursor_year_alignment',
        entry_id: entryId,
        overall_status: overallStatus,
        precursor_results: validationResults,
        blocked: blockingIssueFound,
        blocking_issues: validationResults.filter(r => r.status === 'BLOCKED'),
        warnings: validationResults.filter(r => r.status === 'WARNING'),
        regulatory_reference: 'CBAM Art. 14(2) & C(2025) 8151 Art. 13-15'
      };

      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'VALIDATION',
        entity_type: 'CBAMEmissionEntry',
        entity_id: entryId,
        action: 'precursor_year_validation',
        user_email: user.email,
        details: {
          overall_status: overallStatus,
          precursors_count: entry.precursors_used.length,
          blocking_issues: validationResults.filter(r => r.status === 'BLOCKED').length,
          warnings: validationResults.filter(r => r.status === 'WARNING').length
        }
      });

      return result;

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Request precursor year deviation approval
   * User must provide justification + evidence to override year mismatch
   */
  async requestYearDeviation(params) {
    try {
      const user = await base44.auth.me();
      const {
        entry_id,
        precursor_cn_code,
        precursor_year,
        complex_good_year,
        justification,
        evidence_reference
      } = params;

      if (!justification || justification.trim().length < 20) {
        return { success: false, error: 'Justification must be at least 20 characters' };
      }

      if (!evidence_reference) {
        return { success: false, error: 'Evidence reference (document/certificate) required' };
      }

      // Create deviation record
      const deviation = await base44.entities.CBAMPrecursorYearDeviation.create({
        entry_id,
        precursor_cn_code,
        precursor_year,
        complex_good_year,
        justification,
        evidence_reference,
        requested_by: user.email,
        requested_date: new Date().toISOString(),
        status: 'pending_approval'
      });

      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'VALIDATION',
        entity_type: 'CBAMPrecursorYearDeviation',
        entity_id: deviation.id,
        action: 'precursor_year_deviation_requested',
        user_email: user.email,
        details: {
          entry_id,
          precursor_cn_code,
          year_mismatch: { from: precursor_year, to: complex_good_year },
          justification: justification.substring(0, 100) + '...'
        }
      });

      return {
        success: true,
        deviation,
        status: 'PENDING_APPROVAL',
        message: 'Year deviation request submitted for approval'
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Admin approves precursor year deviation
   * ADMIN ONLY
   */
  async approveYearDeviation(deviationId, approvalNotes) {
    try {
      const user = await base44.auth.me();

      // ENFORCE: Admin only
      if (user.role !== 'admin') {
        return {
          success: false,
          error: 'Only admins can approve year deviations'
        };
      }

      const deviations = await base44.entities.CBAMPrecursorYearDeviation.filter({
        id: deviationId
      });

      const deviation = deviations[0];

      if (!deviation) {
        return { success: false, error: 'Deviation not found' };
      }

      if (deviation.status !== 'pending_approval') {
        return {
          success: false,
          error: `Deviation is ${deviation.status}, cannot approve`
        };
      }

      // Approve deviation
      const approved = await base44.entities.CBAMPrecursorYearDeviation.update(deviationId, {
        status: 'approved',
        approved_by: user.email,
        approved_date: new Date().toISOString(),
        approval_notes: approvalNotes
      });

      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'VALIDATION',
        entity_type: 'CBAMPrecursorYearDeviation',
        entity_id: deviationId,
        action: 'precursor_year_deviation_approved',
        user_email: user.email,
        details: {
          entry_id: deviation.entry_id,
          precursor_cn_code: deviation.precursor_cn_code,
          approved_notes: approvalNotes
        }
      });

      return {
        success: true,
        deviation: approved,
        message: 'Precursor year deviation approved'
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject precursor year deviation
   */
  async rejectYearDeviation(deviationId, rejectionReason) {
    try {
      const user = await base44.auth.me();

      if (user.role !== 'admin') {
        return {
          success: false,
          error: 'Only admins can reject year deviations'
        };
      }

      const deviations = await base44.entities.CBAMPrecursorYearDeviation.filter({
        id: deviationId
      });

      const deviation = deviations[0];

      if (!deviation) {
        return { success: false, error: 'Deviation not found' };
      }

      // Reject deviation
      const rejected = await base44.entities.CBAMPrecursorYearDeviation.update(deviationId, {
        status: 'rejected',
        rejected_by: user.email,
        rejected_date: new Date().toISOString(),
        rejection_reason: rejectionReason
      });

      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: 'VALIDATION',
        entity_type: 'CBAMPrecursorYearDeviation',
        entity_id: deviationId,
        action: 'precursor_year_deviation_rejected',
        user_email: user.email,
        details: {
          entry_id: deviation.entry_id,
          precursor_cn_code: deviation.precursor_cn_code,
          reason: rejectionReason
        }
      });

      return {
        success: true,
        deviation: rejected,
        message: 'Precursor year deviation rejected'
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper: Find approved year deviation for precursor
   */
  async _findPrecursorYearDeviation(entryId, precursorCNCode, precursorYear) {
    try {
      const deviations = await base44.entities.CBAMPrecursorYearDeviation.filter({
        entry_id: entryId,
        precursor_cn_code: precursorCNCode
      });

      // Return first approved deviation, or pending one
      return deviations.find(d => d.status === 'approved') || 
             deviations.find(d => d.status === 'pending_approval') || 
             null;

    } catch {
      return null;
    }
  }
}

export default new PrecursorYearValidationService();