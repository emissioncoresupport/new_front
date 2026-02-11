/**
 * CBAM Certificate Service - Certificate & Financial Lifecycle ONLY
 * Domain: Certificate purchase, surrender, financial tracking
 * Responsibilities: Certificate CRUD, cost calculations
 * Boundaries: Does NOT calculate emissions or generate reports
 */

import { base44 } from '@/api/base44Client';
import eventBus, { CBAM_EVENTS } from '../CBAMEventBus';
import { AuditTrailService } from './CBAMAuditTrailService';

export class CBAMCertificateService {
  /**
   * Purchase certificates
   */
  static async purchaseCertificates(quantity, pricePerUnit) {
    try {
      const user = await base44.auth.me();
      
      // Create certificate record
      const certificate = await base44.entities.CBAMCertificate.create({
        certificate_id: `CERT-${Date.now()}`,
        purchase_date: new Date().toISOString(),
        quantity,
        price_per_unit: pricePerUnit,
        status: 'active',
        expiry_date: this.calculateExpiry()
      });
      
      // MANDATORY audit
      await AuditTrailService.log({
        entity_type: 'CBAMCertificate',
        entity_id: certificate.id,
        action: 'purchase',
        user_email: user.email,
        details: `Purchased ${quantity} certificates at €${pricePerUnit}/unit (Total: €${(quantity * pricePerUnit).toFixed(2)})`,
        regulatory_reference: 'Art. 22 Reg 2023/956'
      });
      
      // Emit event
      eventBus.emit(CBAM_EVENTS.CERTIFICATE_PURCHASED, { 
        certificateId: certificate.id,
        certificate
      });
      
      return { success: true, certificate };
    } catch (error) {
      console.error('[CertificateService] Purchase failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Surrender certificates for report
   */
  static async surrenderCertificates(certificateIds, reportId) {
    try {
      const user = await base44.auth.me();
      
      // Update certificate status
      for (const certId of certificateIds) {
        await base44.entities.CBAMCertificate.update(certId, {
          status: 'surrendered',
          surrendered_for_report_id: reportId
        });
        
        // MANDATORY audit
        await AuditTrailService.log({
          entity_type: 'CBAMCertificate',
          entity_id: certId,
          action: 'surrender',
          user_email: user.email,
          details: `Certificate surrendered for report ${reportId}`,
          regulatory_reference: 'Art. 22 Reg 2023/956'
        });
      }
      
      // Emit event
      eventBus.emit(CBAM_EVENTS.CERTIFICATE_SURRENDERED, { 
        certificateIds,
        reportId
      });
      
      return { success: true, surrendered: certificateIds.length };
    } catch (error) {
      console.error('[CertificateService] Surrender failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Calculate certificate balance
   */
  static async getBalance() {
    try {
      const user = await base44.auth.me();
      
      // Fetch all certificates
      const certificates = await base44.entities.CBAMCertificate.list();
      
      const active = certificates.filter(c => c.status === 'active');
      const surrendered = certificates.filter(c => c.status === 'surrendered');
      
      const activeQuantity = active.reduce((sum, c) => sum + c.quantity, 0);
      const surrenderedQuantity = surrendered.reduce((sum, c) => sum + c.quantity, 0);
      
      return {
        success: true,
        balance: {
          active: activeQuantity,
          surrendered: surrenderedQuantity,
          total: activeQuantity + surrenderedQuantity
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Calculate expiry date (2 years from purchase per regulation)
   */
  static calculateExpiry() {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 2);
    return date.toISOString();
  }
  
  /**
   * Calculate financial summary
   */
  static async getFinancialSummary() {
    try {
      const user = await base44.auth.me();
      
      // Fetch entries and certificates
      const entries = await base44.entities.CBAMEmissionEntry.filter({
        tenant_id: user.company_id
      });
      
      const certificates = await base44.entities.CBAMCertificate.list();
      
      // Calculate totals
      const totalEmissions = entries.reduce((sum, e) => sum + (e.total_embedded_emissions || 0), 0);
      const certificatesRequired = entries.reduce((sum, e) => sum + (e.certificates_required || 0), 0);
      
      const certificatesPurchased = certificates.reduce((sum, c) => sum + c.quantity, 0);
      const totalCost = certificates.reduce((sum, c) => sum + (c.quantity * c.price_per_unit), 0);
      
      const shortfall = Math.max(0, certificatesRequired - certificatesPurchased);
      
      return {
        success: true,
        summary: {
          totalEmissions,
          certificatesRequired,
          certificatesPurchased,
          shortfall,
          totalCost,
          avgPrice: totalCost / certificatesPurchased || 0
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default CBAMCertificateService;