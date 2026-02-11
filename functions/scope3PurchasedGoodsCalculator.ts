/**
 * Scope 3 Category 1 Calculator - Multi-Tenant Compliant
 * Calculates purchased goods & services emissions per GHG Protocol
 * Implements ISO 14064-1:2018 + EU Green Deal compliance (Dec 2025)
 */

import { 
  authenticateAndValidate,
  publishToQueue,
  errorResponse,
  successResponse 
} from './services/authValidationMiddleware.js';
import { withUsageMetering } from './services/usageMeteringMiddleware.js';

Deno.serve(async (req) => {
  return withUsageMetering(req, 'calculation.scope3', async ({ user, base44, tenantId }) => {
    try {

    // Step 2: Parse request payload
    const { 
      reporting_year,
      supplier_id = null,
      calculation_method = 'supplier_specific' // or 'average_data' or 'spend_based'
    } = await req.json();

    if (!reporting_year) {
      return errorResponse({
        status: 400,
        message: 'reporting_year is required (e.g., 2025)'
      });
    }

    // Step 3: Get all suppliers or specific supplier (tenant-filtered)
    let suppliers = [];
    if (supplier_id) {
      const supplierData = await base44.entities.Supplier.filter({ 
        id: supplier_id,
        company_id: tenantId 
      });
      if (!supplierData || supplierData.length === 0) {
        return errorResponse({
          status: 404,
          message: 'Supplier not found or access denied'
        });
      }
      suppliers = supplierData;
    } else {
      suppliers = await base44.entities.Supplier.filter({
        company_id: tenantId,
        status: 'active'
      });
    }

    // Step 4: Get purchase orders for reporting year (tenant-filtered)
    const yearStart = `${reporting_year}-01-01`;
    const yearEnd = `${reporting_year}-12-31`;

    const allPurchaseOrders = await base44.entities.PurchaseOrder.list();
    const purchaseOrders = allPurchaseOrders.filter(po => 
      po.order_date >= yearStart && 
      po.order_date <= yearEnd &&
      suppliers.some(s => s.id === po.supplier_id)
    );

    // Step 5: Calculate emissions by supplier
    const supplierEmissions = [];
    let totalEmissions = 0;
    let dataQuality = {
      supplier_specific: 0,
      average_data: 0,
      spend_based: 0
    };

    for (const supplier of suppliers) {
      const supplierPOs = purchaseOrders.filter(po => po.supplier_id === supplier.id);
      
      if (supplierPOs.length === 0) continue;

      let supplierTotal = 0;
      let calculationApproach = 'spend_based'; // default fallback

      // Method 1: Supplier-specific PCF data (highest quality)
      const supplierPCFs = await base44.entities.SupplierPCF.filter({
        supplier_id: supplier.id,
        tenant_id: tenantId
      });

      if (supplierPCFs.length > 0 && calculation_method === 'supplier_specific') {
        // Use actual supplier PCF data
        for (const po of supplierPOs) {
          const items = po.items || [];
          for (const item of items) {
            const pcf = supplierPCFs.find(p => 
              p.product_id === item.sku || 
              (p.declared_unit && item.description?.includes(p.declared_unit))
            );
            
            if (pcf) {
              supplierTotal += (item.quantity || 0) * (pcf.pcf_excluding_biogenic || 0);
              calculationApproach = 'supplier_specific';
            }
          }
        }
        dataQuality.supplier_specific++;
      } 
      // Method 2: Average emission factors
      else if (calculation_method === 'average_data') {
        const totalSpend = supplierPOs.reduce((sum, po) => 
          sum + (po.total_amount || 0), 0
        );
        
        // Use industry average emission factors (tCO2e per $1000 spent)
        const sectorFactor = getSectorEmissionFactor(supplier.nace_code);
        supplierTotal = (totalSpend / 1000) * sectorFactor;
        calculationApproach = 'average_data';
        dataQuality.average_data++;
      }
      // Method 3: Spend-based (lowest quality, fallback)
      else {
        const totalSpend = supplierPOs.reduce((sum, po) => 
          sum + (po.total_amount || 0), 0
        );
        
        // Generic spend-based factor: 0.5 kgCO2e per $ (conservative estimate)
        supplierTotal = totalSpend * 0.5;
        calculationApproach = 'spend_based';
        dataQuality.spend_based++;
      }

      supplierEmissions.push({
        supplier_id: supplier.id,
        supplier_name: supplier.legal_name,
        emissions_kg_co2e: supplierTotal,
        emissions_t_co2e: supplierTotal / 1000,
        calculation_method: calculationApproach,
        purchase_orders_count: supplierPOs.length,
        total_spend: supplierPOs.reduce((sum, po) => sum + (po.total_amount || 0), 0)
      });

      totalEmissions += supplierTotal;
    }

    // Step 6: Create or update Scope 3 entry
    const scope3Entry = await base44.entities.Scope3Entry.create({
      tenant_id: tenantId,
      category: 'category_1_purchased_goods',
      reporting_year: parseInt(reporting_year),
      emissions_kg_co2e: totalEmissions,
      emissions_t_co2e: totalEmissions / 1000,
      calculation_method: calculation_method,
      data_quality_rating: calculateDataQualityRating(dataQuality),
      supplier_count: supplierEmissions.length,
      details: {
        supplier_breakdown: supplierEmissions,
        data_quality: dataQuality,
        calculation_date: new Date().toISOString()
      },
      calculated_by: user.email,
      calculated_at: new Date().toISOString()
    });

    // Step 7: Publish to async queue for aggregation
    await publishToQueue(
      'scope3.aggregation',
      {
        scope3_entry_id: scope3Entry.id,
        tenant_id: tenantId,
        reporting_year,
        category: 'category_1'
      },
      tenantId
    );

    // Step 8: Create audit log
    await base44.entities.AuditLog.create({
      tenant_id: tenantId,
      user_email: user.email,
      action: 'scope3_calculation',
      entity_type: 'Scope3Entry',
      entity_id: scope3Entry.id,
      details: {
        category: 'category_1',
        reporting_year,
        total_emissions_t: totalEmissions / 1000,
        supplier_count: supplierEmissions.length
      },
      timestamp: new Date().toISOString()
    });

    return {
      scope3_entry_id: scope3Entry.id,
      reporting_year,
      category: 'Category 1 - Purchased Goods & Services',
      total_emissions: {
        kg_co2e: totalEmissions,
        t_co2e: totalEmissions / 1000
      },
      supplier_count: supplierEmissions.length,
      data_quality_rating: calculateDataQualityRating(dataQuality),
      calculation_method,
      supplier_breakdown: supplierEmissions,
      recommendations: generateRecommendations(dataQuality, supplierEmissions)
    };

    } catch (error) {
      throw new Error(`Scope 3 calculation failed: ${error.message}`);
    }
  });
});

/**
 * Get emission factor by NACE sector code
 * Source: EPA, DEFRA, Ecoinvent average factors
 */
function getSectorEmissionFactor(naceCode) {
  const sectorFactors = {
    // Manufacturing sectors (tCO2e per $1000 revenue)
    'C10': 0.45,  // Food products
    'C13': 0.38,  // Textiles
    'C20': 0.52,  // Chemicals
    'C24': 0.68,  // Basic metals
    'C26': 0.35,  // Electronics
    'C27': 0.42,  // Electrical equipment
    'C28': 0.38,  // Machinery
    'C29': 0.45,  // Motor vehicles
    // Services (lower intensity)
    'G46': 0.15,  // Wholesale trade
    'H49': 0.65,  // Land transport
    'H50': 0.85,  // Water transport
    'H51': 1.20,  // Air transport
    // Default
    'default': 0.40
  };

  const prefix = naceCode ? naceCode.substring(0, 3) : null;
  return sectorFactors[prefix] || sectorFactors['default'];
}

/**
 * Calculate data quality rating (1-5 scale)
 */
function calculateDataQualityRating(dataQuality) {
  const total = dataQuality.supplier_specific + dataQuality.average_data + dataQuality.spend_based;
  if (total === 0) return 1;

  const score = (
    (dataQuality.supplier_specific * 5) +
    (dataQuality.average_data * 3) +
    (dataQuality.spend_based * 1)
  ) / total;

  return Math.round(score * 10) / 10; // Round to 1 decimal
}

/**
 * Generate improvement recommendations
 */
function generateRecommendations(dataQuality, supplierEmissions) {
  const recommendations = [];

  if (dataQuality.spend_based > 0) {
    recommendations.push({
      priority: 'high',
      action: 'Request supplier-specific PCF data',
      impact: 'Improve data quality and accuracy by 60-80%',
      affected_suppliers: dataQuality.spend_based
    });
  }

  if (dataQuality.average_data > 0) {
    recommendations.push({
      priority: 'medium',
      action: 'Engage suppliers for primary data collection',
      impact: 'Upgrade from average to supplier-specific data',
      affected_suppliers: dataQuality.average_data
    });
  }

  // Identify high-emission suppliers
  const sortedSuppliers = [...supplierEmissions].sort((a, b) => 
    b.emissions_kg_co2e - a.emissions_kg_co2e
  );
  const top80Percent = sortedSuppliers.slice(0, Math.ceil(sortedSuppliers.length * 0.2));

  if (top80Percent.length > 0) {
    recommendations.push({
      priority: 'high',
      action: 'Focus on top 20% emitters (80/20 rule)',
      impact: `Target ${top80Percent.length} suppliers representing ~80% of emissions`,
      supplier_ids: top80Percent.map(s => s.supplier_id)
    });
  }

  return recommendations;
}