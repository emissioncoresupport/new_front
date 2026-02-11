/**
 * CBAM CERTIFICATE SERVICE - SOLE CERTIFICATE AUTHORITY
 * Version: 2.0 - Certificate Management & Surrender
 * Compliance: Reg 2023/956 Art. 21-32
 * 
 * LIFECYCLE 6A: CERTIFICATES
 * Domain: Certificate acquisition, tracking, and surrender
 * Boundaries: NO emission calculation, NO entry mutation
 */

import { base44 } from '@/api/base44Client';
import eventBus, { CBAM_EVENTS } from '../../services/CBAMEventBus';
import AuditTrailService from '../shared/AuditTrailService';

class CertificateService {
  LIFECYCLE = 'CERTIFICATES';
  VERSION = '2.0';
  
  /**
   * Calculate certificate requirements from report
   * READ-ONLY aggregation
   */
  async calculateRequirements(reportId = null, entryIds = null) {
    try {
      let certificatesRequired = 0;
      let entriesAnalyzed = 0;
      
      if (reportId) {
        // Calculate from report
        const reports = await base44.entities.CBAMReport.list();
        const report = reports.find(r => r.id === reportId);
        
        if (!report) {
          return { success: false, error: 'Report not found' };
        }
        
        certificatesRequired = report.certificates_required || 0;
        entriesAnalyzed = report.linked_entries?.length || 0;
        
      } else if (entryIds) {
        // Calculate from specific entries
        const entries = await base44.entities.CBAMEmissionEntry.list();
        const selectedEntries = entries.filter(e => entryIds.includes(e.id));
        
        certificatesRequired = selectedEntries.reduce(
          (sum, e) => sum + (e.certificates_required || 0), 
          0
        );
        entriesAnalyzed = selectedEntries.length;
        
      } else {
        // Calculate from all entries
        const entries = await base44.entities.CBAMEmissionEntry.list();
        certificatesRequired = entries.reduce(
          (sum, e) => sum + (e.certificates_required || 0), 
          0
        );
        entriesAnalyzed = entries.length;
      }
      
      // Round per regulation (Art. 23)
      certificatesRequired = Math.ceil(certificatesRequired);
      
      // Get current balance
      const certificates = await base44.entities.CBAMCertificate.list();
      const activeBalance = certificates
        .filter(c => c.status === 'active')
        .reduce((sum, c) => sum + (c.quantity || 0), 0);
      
      const shortfall = Math.max(0, certificatesRequired - activeBalance);
      
      return {
        success: true,
        required: certificatesRequired,
        balance: activeBalance,
        shortfall,
        entries_analyzed: entriesAnalyzed,
        recommendation: shortfall > 0 
          ? `Purchase ${shortfall} certificates to meet obligation`
          : 'No additional certificates needed'
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Purchase certificates - EXPLICIT USER ACTION REQUIRED
   * NO automatic purchases allowed
   */
  async purchaseCertificates(quantity, pricePerUnit, userConfirmed = false) {
    try {
      // ENFORCE: User confirmation mandatory
      if (!userConfirmed) {
        return { 
          success: false, 
          error: 'Certificate purchase requires explicit user confirmation',
          requires_confirmation: true
        };
      }
      
      const user = await base44.auth.me();
      
      // Validate inputs
      if (!quantity || quantity <= 0) {
        return { success: false, error: 'Quantity must be positive' };
      }
      
      if (!pricePerUnit || pricePerUnit <= 0) {
        return { success: false, error: 'Price must be positive' };
      }
      
      const totalCost = quantity * pricePerUnit;
      
      // Create certificate record
      const certificate = await base44.entities.CBAMCertificate.create({
        certificate_id: `CBAM-${Date.now()}`,
        purchase_date: new Date().toISOString().split('T')[0],
        price_per_unit: pricePerUnit,
        quantity,
        total_cost: totalCost,
        status: 'active',
        currency: 'EUR',
        expiry_date: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 years
        purchased_by: user.email
      });
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: this.LIFECYCLE,
        entity_type: 'CBAMCertificate',
        entity_id: certificate.id,
        action: 'purchased',
        user_email: user.email,
        details: {
          quantity,
          price_per_unit: pricePerUnit,
          total_cost: totalCost,
          currency: 'EUR',
          regulation: 'Reg 2023/956 Art. 22-23'
        }
      });
      
      // Emit event
      eventBus.emit(CBAM_EVENTS.CERTIFICATE_PURCHASED, { 
        certificate,
        quantity,
        total_cost: totalCost
      });
      
      return { 
        success: true, 
        certificate,
        total_cost: totalCost
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Surrender certificates for report compliance
   * ENFORCED: Must match report requirements
   */
  async surrenderCertificates(reportId, userConfirmed = false) {
    try {
      // ENFORCE: User confirmation mandatory
      if (!userConfirmed) {
        return { 
          success: false, 
          error: 'Certificate surrender requires explicit user confirmation',
          requires_confirmation: true
        };
      }
      
      const user = await base44.auth.me();
      
      // Fetch report
      const reports = await base44.entities.CBAMReport.list();
      const report = reports.find(r => r.id === reportId);
      
      if (!report) {
        return { success: false, error: 'Report not found' };
      }
      
      const requiredQuantity = report.certificates_required || 0;
      
      if (requiredQuantity === 0) {
        return { success: false, error: 'Report requires 0 certificates' };
      }
      
      // Find active certificates (FIFO)
      const allCerts = await base44.entities.CBAMCertificate.list();
      const activeCerts = allCerts
        .filter(c => c.status === 'active')
        .sort((a, b) => new Date(a.purchase_date) - new Date(b.purchase_date)); // Oldest first
      
      let remaining = requiredQuantity;
      const surrendered = [];
      let totalCost = 0;
      
      for (const cert of activeCerts) {
        if (remaining <= 0) break;
        
        const toSurrender = Math.min(cert.quantity, remaining);
        
        // If partial surrender needed, split the certificate
        if (toSurrender < cert.quantity) {
          // Keep remaining active
          await base44.entities.CBAMCertificate.update(cert.id, {
            quantity: cert.quantity - toSurrender
          });
          
          // Create new surrendered certificate record
          const surrenderedCert = await base44.entities.CBAMCertificate.create({
            certificate_id: `${cert.certificate_id}-SURRENDERED`,
            purchase_date: cert.purchase_date,
            price_per_unit: cert.price_per_unit,
            quantity: toSurrender,
            total_cost: toSurrender * cert.price_per_unit,
            status: 'surrendered',
            surrendered_for_report_id: reportId,
            surrendered_date: new Date().toISOString(),
            currency: 'EUR'
          });
          
          surrendered.push({ id: surrenderedCert.id, quantity: toSurrender });
          
        } else {
          // Surrender entire certificate
          await base44.entities.CBAMCertificate.update(cert.id, {
            status: 'surrendered',
            surrendered_for_report_id: reportId,
            surrendered_date: new Date().toISOString()
          });
          
          surrendered.push({ id: cert.id, quantity: toSurrender });
        }
        
        totalCost += toSurrender * cert.price_per_unit;
        remaining -= toSurrender;
      }
      
      if (remaining > 0) {
        return { 
          success: false, 
          error: `Insufficient certificates: ${remaining} short`,
          shortfall: remaining
        };
      }
      
      // Update report
      await base44.entities.CBAMReport.update(reportId, {
        certificates_surrendered: requiredQuantity,
        surrender_date: new Date().toISOString(),
        surrender_total_cost: totalCost
      });
      
      // Mandatory audit
      await AuditTrailService.log({
        lifecycle: this.LIFECYCLE,
        entity_type: 'CBAMCertificate',
        entity_id: reportId,
        action: 'surrendered',
        user_email: user.email,
        details: {
          report_id: reportId,
          quantity: requiredQuantity,
          certificates_used: surrendered.length,
          total_cost: totalCost,
          regulation: 'Reg 2023/956 Art. 24'
        }
      });
      
      // Emit event
      eventBus.emit(CBAM_EVENTS.CERTIFICATE_SURRENDERED, { 
        reportId, 
        quantity: requiredQuantity, 
        certificates: surrendered,
        total_cost: totalCost
      });
      
      return { 
        success: true, 
        surrendered,
        total_cost: totalCost,
        quantity: requiredQuantity
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get certificate portfolio summary
   */
  async getPortfolioSummary() {
    try {
      const certificates = await base44.entities.CBAMCertificate.list();
      
      const summary = {
        active: {
          quantity: 0,
          count: 0,
          total_cost: 0,
          avg_price: 0
        },
        surrendered: {
          quantity: 0,
          count: 0,
          total_cost: 0
        },
        expired: {
          quantity: 0,
          count: 0
        }
      };
      
      certificates.forEach(cert => {
        if (cert.status === 'active') {
          summary.active.quantity += cert.quantity || 0;
          summary.active.count++;
          summary.active.total_cost += cert.total_cost || (cert.quantity * cert.price_per_unit) || 0;
        } else if (cert.status === 'surrendered') {
          summary.surrendered.quantity += cert.quantity || 0;
          summary.surrendered.count++;
          summary.surrendered.total_cost += cert.total_cost || (cert.quantity * cert.price_per_unit) || 0;
        } else if (cert.status === 'expired') {
          summary.expired.quantity += cert.quantity || 0;
          summary.expired.count++;
        }
      });
      
      if (summary.active.quantity > 0) {
        summary.active.avg_price = summary.active.total_cost / summary.active.quantity;
      }
      
      return { success: true, summary };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new CertificateService();