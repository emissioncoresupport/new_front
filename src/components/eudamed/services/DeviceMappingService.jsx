import { base44 } from "@/api/base44Client";

/**
 * Device Mapping Service
 * 
 * Maps SupplyLens SKUs to EUDAMED Device Models
 * Under specific Economic Operator
 */

export default class DeviceMappingService {

  /**
   * Map SKU to Device Model under operator
   */
  static async mapSKUToDeviceModel(skuId, operatorId, deviceFamilyId) {
    const user = await base44.auth.me();
    const tenantId = user.tenant_id || 'default';

    const skus = await base44.entities.SKU.list();
    const sku = skus.find(s => s.id === skuId);

    if (!sku) {
      throw new Error('SKU not found');
    }

    // Check if already mapped
    const existingModels = await base44.entities.DeviceModel.list();
    const existing = existingModels.find(m => m.supplylens_sku_id === skuId && m.operator_id === operatorId);

    if (existing) {
      return { deviceModel: existing, isNew: false };
    }

    // Create device model
    const deviceModel = await base44.entities.DeviceModel.create({
      tenant_id: tenantId,
      operator_id: operatorId,
      device_family_id: deviceFamilyId,
      model_name: sku.sku_code || sku.internal_name,
      commercial_name: sku.internal_name,
      catalog_number: sku.sku_code,
      variant_attributes: {
        description: sku.description,
        category: sku.category,
        source: 'supplylens'
      },
      status: 'draft',
      supplylens_sku_id: skuId
    });

    return { deviceModel, isNew: true };
  }

  /**
   * Bulk map SKUs to devices for operator
   */
  static async bulkMapSKUs(operatorId, deviceFamilyId, skuIds = null) {
    const skus = await base44.entities.SKU.list();
    const targetSKUs = skuIds ? skus.filter(s => skuIds.includes(s.id)) : skus;

    const results = {
      created: [],
      existing: [],
      failed: []
    };

    for (const sku of targetSKUs) {
      try {
        const result = await this.mapSKUToDeviceModel(sku.id, operatorId, deviceFamilyId);
        if (result.isNew) {
          results.created.push(result.deviceModel);
        } else {
          results.existing.push(result.deviceModel);
        }
      } catch (error) {
        results.failed.push({ sku, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get device models for operator
   */
  static async getOperatorDevices(operatorId) {
    const models = await base44.entities.DeviceModel.list();
    return models.filter(m => m.operator_id === operatorId);
  }

  /**
   * Link supplier to device model (component traceability)
   */
  static async linkSupplierToDevice(deviceModelId, supplierId, componentDetails) {
    const user = await base44.auth.me();
    const tenantId = user.tenant_id || 'default';

    // Record in BoM or component tracking entity
    // This is for internal traceability, NOT EUDAMED submission
    
    const link = await base44.entities.SupplierPartMapping.create({
      tenant_id: tenantId,
      device_model_id: deviceModelId,
      supplier_id: supplierId,
      component_type: componentDetails.component_type,
      component_description: componentDetails.description,
      quantity_per_device: componentDetails.quantity || 1,
      critical_component: componentDetails.critical || false,
      udi_pi_required: componentDetails.udi_pi_required || false,
      status: 'active'
    });

    return link;
  }
}