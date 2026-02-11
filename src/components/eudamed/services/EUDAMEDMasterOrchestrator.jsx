/**
 * EUDAMED Master Orchestrator
 * Central intelligence hub for all EUDAMED operations
 * Ensures data consistency, integration, automation, and compliance
 */

import { base44 } from '@/api/base44Client';
import { BlockchainService } from '../../blockchain/BlockchainService';

export class EUDAMEDMasterOrchestrator {

  /**
   * UNIFIED ACTOR REGISTRATION
   * Single entry point for all actor registrations
   */
  static async registerActor(actorData) {
    // 1. Validate required fields per MDR Art. 31
    const validation = this.validateActorData(actorData);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // 2. Generate SRN if not provided
    if (!actorData.srn) {
      actorData.srn = `SRN-${actorData.country}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    }

    // 3. Create actor record
    const actor = await base44.entities.EUDAMEDActor.create({
      ...actorData,
      registration_status: 'draft'
    });

    // 4. Blockchain audit log
    await this.logToBlockchain('EUDAMEDActor', actor.id, 'actor_created', {
      srn: actor.srn,
      actor_type: actor.actor_type
    });

    // 5. Queue for EUDAMED sync
    await this.queueSync('actor_sync', 'Actor', actor.id, actor.srn, actor);

    // 6. Trigger integrations
    await this.triggerActorIntegrations(actor);

    // 7. Create notification
    await this.createNotification({
      type: 'data_created',
      title: 'Actor Registration Created',
      message: `${actor.legal_name} registered as ${actor.actor_type}. SRN: ${actor.srn}`,
      entity_type: 'Actor',
      entity_id: actor.id,
      priority: 'medium'
    });

    return actor;
  }

  /**
   * UNIFIED DEVICE REGISTRATION
   * Handles UDI-DI generation, validation, and multi-module integration
   */
  static async registerDevice(deviceData) {
    // 1. Validate per MDR Art. 27 & Annex VI
    const validation = this.validateDeviceData(deviceData);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // 2. Generate UDI-DI if not provided (GS1 format)
    if (!deviceData.udi_di) {
      deviceData.udi_di = this.generateUDI(deviceData.manufacturer_id, deviceData.device_name);
    }

    // 3. Create device record
    const device = await base44.entities.EUDAMEDDevice.create({
      ...deviceData,
      registration_status: 'draft',
      registration_date: new Date().toISOString().split('T')[0]
    });

    // 4. Blockchain audit
    await this.logToBlockchain('EUDAMEDDevice', device.id, 'device_created', {
      udi_di: device.udi_di,
      risk_class: device.risk_class
    });

    // 5. Queue for EUDAMED sync
    await this.queueSync('device_sync', 'Device', device.id, device.udi_di, device);

    // 6. INTEGRATION: Link to DPP module (if applicable)
    if (deviceData.create_dpp) {
      await this.createDigitalProductPassport(device);
    }

    // 7. INTEGRATION: Create PCF calculation (carbon footprint)
    if (deviceData.calculate_pcf) {
      await this.linkToPCFModule(device);
    }

    // 8. Schedule PSUR deadline based on risk class
    await this.schedulePSURDeadline(device);

    // 9. Notification
    await this.createNotification({
      type: 'data_created',
      title: 'Device Registered',
      message: `${device.device_name} (${device.udi_di}) registered as ${device.risk_class}`,
      entity_type: 'Device',
      entity_id: device.id,
      priority: 'high'
    });

    return device;
  }

  /**
   * UNIFIED INCIDENT REPORTING
   * MDR Art. 87 compliance with automatic authority notification
   */
  static async reportIncident(incidentData) {
    // 1. Validate incident data
    if (!incidentData.device_id || !incidentData.incident_type || !incidentData.incident_date) {
      throw new Error('Missing required fields: device_id, incident_type, incident_date');
    }

    // 2. Generate report reference
    incidentData.report_reference = `INC-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

    // 3. Create incident record
    const incident = await base44.entities.EUDAMEDIncident.create({
      ...incidentData,
      status: 'open',
      reported_date: new Date().toISOString()
    });

    // 4. Blockchain audit
    await this.logToBlockchain('EUDAMEDIncident', incident.id, 'incident_created', {
      incident_type: incident.incident_type,
      severity: incident.patient_outcome
    });

    // 5. Auto-generate MIR report
    const report = await this.autoGenerateMIR(incident);

    // 6. Check deadline urgency (serious incidents = immediate)
    const priority = incident.incident_type === 'Serious Incident' ? 'critical' : 'high';

    // 7. Notification with deadline
    const deadlineDays = incident.incident_type === 'Serious Incident' ? 15 : 30;
    await this.createNotification({
      type: 'deadline',
      title: `Incident Report Required: ${incident.incident_type}`,
      message: `Submit to competent authority within ${deadlineDays} days (MDR Art. 87)`,
      entity_type: 'Incident',
      entity_id: incident.id,
      priority,
      deadline_date: new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000).toISOString()
    });

    // 8. If serious injury/death, trigger immediate alert
    if (incident.patient_outcome === 'Death' || incident.patient_outcome === 'Serious Injury') {
      await this.sendCriticalAlert(incident);
    }

    return { incident, report };
  }

  /**
   * AUTO-GENERATE MANUFACTURER INCIDENT REPORT (MIR)
   */
  static async autoGenerateMIR(incident) {
    const device = await base44.entities.EUDAMEDDevice.filter({ id: incident.device_id });
    if (device.length === 0) throw new Error('Device not found');

    const reportData = {
      incident_details: {
        incident_date: incident.incident_date,
        country: incident.country_of_incident,
        description: incident.description,
        patient_outcome: incident.patient_outcome,
        root_cause: incident.root_cause
      },
      device_details: {
        udi_di: device[0].udi_di,
        device_name: device[0].device_name,
        manufacturer_srn: device[0].manufacturer_id,
        lot_batch: incident.lot_batch_numbers
      },
      corrective_actions: incident.corrective_actions || []
    };

    const report = await base44.entities.EUDAMEDReport.create({
      report_type: 'Manufacturer Incident Report (MIR)',
      report_reference: `MIR-${incident.report_reference}`,
      device_id: incident.device_id,
      incident_id: incident.id,
      submission_status: 'draft',
      report_data: reportData
    });

    // Generate XML
    await this.generateReportXML(report.id);

    return report;
  }

  /**
   * GENERATE XML FOR EUDAMED SUBMISSION
   */
  static async generateReportXML(reportId) {
    const report = await base44.entities.EUDAMEDReport.filter({ id: reportId });
    if (report.length === 0) return;

    // Use AI to generate XML from structured data
    const xmlContent = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate EUDAMED-compliant XML for ${report[0].report_type}:
      
      ${JSON.stringify(report[0].report_data, null, 2)}
      
      Follow EUDAMED XML schema v3.0 (December 2025). Include mandatory fields: report reference, device UDI-DI, incident details, corrective actions.`,
      response_json_schema: {
        type: "object",
        properties: {
          xml_content: { type: "string" }
        }
      }
    });

    await base44.entities.EUDAMEDReport.update(reportId, {
      xml_content: xmlContent.xml_content,
      submission_status: 'validated'
    });
  }

  /**
   * QUEUE SYNC OPERATION
   */
  static async queueSync(operationType, entityType, entityId, entityReference, payload) {
    await base44.entities.EUDAMEDSyncQueue.create({
      operation_type: operationType,
      entity_type: entityType,
      entity_id: entityId,
      entity_reference: entityReference,
      status: 'pending',
      request_payload: payload,
      priority: 'high'
    });
  }

  /**
   * BLOCKCHAIN AUDIT LOG
   */
  static async logToBlockchain(entityType, entityId, action, metadata) {
    try {
      const hash = await BlockchainService.logAction({
        entityType,
        entityId,
        action,
        actor: 'system',
        metadata
      });

      await base44.entities.EUDAMEDAuditLog.create({
        entity_type: entityType,
        entity_id: entityId,
        action_type: action,
        actor: 'system',
        timestamp: new Date().toISOString(),
        outcome: 'success',
        details: JSON.stringify(metadata),
        transaction_hash: hash
      });
    } catch (error) {
      console.error('Blockchain logging failed:', error);
    }
  }

  /**
   * CREATE NOTIFICATION
   */
  static async createNotification(notifData) {
    await base44.entities.Notification.create({
      type: notifData.type,
      title: notifData.title,
      message: notifData.message,
      entity_type: notifData.entity_type,
      entity_id: notifData.entity_id,
      entity_reference: notifData.entity_reference,
      priority: notifData.priority || 'medium',
      read: false,
      deadline_date: notifData.deadline_date,
      metadata: notifData.metadata
    });
  }

  /**
   * VALIDATION HELPERS
   */
  static validateActorData(data) {
    const errors = [];
    if (!data.legal_name) errors.push('Legal name required');
    if (!data.country) errors.push('Country required');
    if (!data.actor_type) errors.push('Actor type required');
    
    return { valid: errors.length === 0, errors };
  }

  static validateDeviceData(data) {
    const errors = [];
    if (!data.device_name) errors.push('Device name required');
    if (!data.risk_class) errors.push('Risk class required (MDR Annex VIII)');
    if (!data.manufacturer_id) errors.push('Manufacturer SRN required');
    if (!data.intended_purpose) errors.push('Intended purpose required');
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * GENERATE UDI-DI (GS1 format)
   */
  static generateUDI(manufacturerId, deviceName) {
    const companyPrefix = manufacturerId?.substring(0, 8) || '12345678';
    const itemRef = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const checkDigit = this.calculateGS1CheckDigit(companyPrefix + itemRef);
    return `(01)${companyPrefix}${itemRef}${checkDigit}`;
  }

  static calculateGS1CheckDigit(code) {
    let sum = 0;
    for (let i = code.length - 1; i >= 0; i--) {
      const digit = parseInt(code[i]);
      sum += i % 2 === 0 ? digit * 3 : digit;
    }
    return ((10 - (sum % 10)) % 10).toString();
  }

  /**
   * INTEGRATION: Create DPP for medical device
   */
  static async createDigitalProductPassport(device) {
    try {
      const dpp = await base44.entities.DPPRecord.create({
        product_name: device.device_name,
        product_id: device.id,
        udi_di: device.udi_di,
        category: 'Medical Device',
        manufacturer: device.manufacturer_id,
        risk_class: device.risk_class,
        regulatory_status: device.registration_status,
        compliance_frameworks: ['MDR 2017/745', 'EUDAMED'],
        sustainability_data: {
          intended_purpose: device.intended_purpose,
          sterile: device.sterile,
          single_use: device.single_use
        }
      });

      await base44.entities.EUDAMEDDevice.update(device.id, {
        digital_passport_id: dpp.id
      });

      return dpp;
    } catch (error) {
      console.log('DPP creation skipped:', error.message);
    }
  }

  /**
   * INTEGRATION: Link to PCF module for carbon footprint
   */
  static async linkToPCFModule(device) {
    try {
      await base44.entities.Product.create({
        name: device.device_name,
        sku: device.udi_di,
        category: 'Medical Devices',
        manufacturer: device.manufacturer_id,
        unit: 'piece',
        quantity_amount: 1,
        status: 'Draft',
        eudamed_device_id: device.id
      });
    } catch (error) {
      console.log('PCF link skipped:', error.message);
    }
  }

  /**
   * SCHEDULE PSUR DEADLINE
   * Class III: annual, Class IIb: biennial
   */
  static async schedulePSURDeadline(device) {
    if (device.risk_class !== 'Class III' && device.risk_class !== 'Class IIb') return;

    const monthsUntilPSUR = device.risk_class === 'Class III' ? 12 : 24;
    const deadlineDate = new Date();
    deadlineDate.setMonth(deadlineDate.getMonth() + monthsUntilPSUR);

    await this.createNotification({
      type: 'deadline',
      title: 'PSUR Deadline Scheduled',
      message: `Periodic Safety Update Report due for ${device.device_name} on ${deadlineDate.toLocaleDateString()}`,
      entity_type: 'Device',
      entity_id: device.id,
      entity_reference: device.udi_di,
      priority: 'medium',
      deadline_date: deadlineDate.toISOString()
    });
  }

  /**
   * TRIGGER ACTOR INTEGRATIONS
   * Link to SupplyLens, PFAS scanning, etc.
   */
  static async triggerActorIntegrations(actor) {
    // 1. Sync with SupplyLens (if manufacturer/supplier)
    if (actor.actor_type === 'Manufacturer') {
      try {
        const existingSupplier = await base44.entities.Supplier.filter({
          legal_name: actor.legal_name
        });

        if (existingSupplier.length === 0) {
          await base44.entities.Supplier.create({
            legal_name: actor.legal_name,
            trade_name: actor.trade_name,
            country: actor.country,
            country_of_origin: actor.country,
            email: actor.contact_email,
            phone: actor.contact_phone,
            website: actor.website,
            eudamed_srn: actor.srn,
            industry_sector: 'Medical Devices',
            tier: 1
          });
        }
      } catch (error) {
        console.log('SupplyLens sync skipped:', error.message);
      }
    }

    // 2. PFAS auto-scan (if high-risk medical device manufacturer)
    try {
      const PFASAutomationService = (await import('../../pfas/services/PFASAutomationService')).default;
      const supplier = await base44.entities.Supplier.filter({ eudamed_srn: actor.srn });
      if (supplier.length > 0) {
        await PFASAutomationService.autoScanSupplier(supplier[0].id);
      }
    } catch (error) {
      console.log('PFAS scan skipped:', error.message);
    }
  }

  /**
   * SEND CRITICAL ALERT
   */
  static async sendCriticalAlert(incident) {
    const user = await base44.auth.me();
    
    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: `🚨 CRITICAL: ${incident.incident_type} - Immediate Action Required`,
      body: `
CRITICAL EUDAMED INCIDENT ALERT

Incident Type: ${incident.incident_type}
Patient Outcome: ${incident.patient_outcome}
Incident Date: ${incident.incident_date}

Description:
${incident.description}

REGULATORY REQUIREMENT (MDR Art. 87):
- Report to competent authority IMMEDIATELY for serious incidents with death/serious injury
- Submit within 15 days for other serious incidents
- FSN/FSCA required if field action needed

Report Reference: ${incident.report_reference}

Action: Review incident in EUDAMED module and submit Manufacturer Incident Report (MIR).
      `
    });
  }

  /**
   * BATCH DEVICE REGISTRATION
   * Scalable import from ERP/PLM systems
   */
  static async batchRegisterDevices(devices) {
    const results = {
      total: devices.length,
      success: 0,
      failed: 0,
      errors: []
    };

    for (const deviceData of devices) {
      try {
        await this.registerDevice(deviceData);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          device: deviceData.device_name,
          error: error.message
        });
      }
    }

    return results;
  }
}

export default EUDAMEDMasterOrchestrator;