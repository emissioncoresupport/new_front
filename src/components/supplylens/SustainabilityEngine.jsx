import { base44 } from '@/api/base44Client';

/**
 * Calculates the aggregated Product Carbon Footprint (PCF) for a BOM tree.
 * @param {string} skuId - The root SKU ID to calculate for.
 * @param {Array} bomLinks - All BOM link entities.
 * @param {Array} skus - All SKU entities.
 * @returns {Object} - { total_co2e, coverage_percent, missing_data_skus }
 */
export function calculateAggregatedPCF(skuId, bomLinks, skus, ancestors = new Set()) {
  // Cycle detection
  if (ancestors.has(skuId)) {
    console.warn(`Cycle detected in BOM for SKU ${skuId}`);
    return { total_co2e: 0, coverage_percent: 0, missing_data_skus: [] };
  }
  const nextAncestors = new Set(ancestors).add(skuId);

  const rootSku = skus.find(s => s.id === skuId);
  if (!rootSku) return { total_co2e: 0, coverage_percent: 0, missing_data_skus: [] };

  // If root has explicit EPD verified data, use it (Cradle-to-Gate usually)
  // But often we want to sum up components if the parent data is missing or being modeled.
  // Strategy: Sum children + processing overhead (overhead ignored for now)
  
  let total = 0;
  let componentsCount = 0;
  let componentsWithData = 0;
  let missingSkus = [];

  const children = bomLinks.filter(link => link.parent_sku_id === skuId);

  if (children.length === 0) {
    // Leaf node
    const val = rootSku.pcf_co2e || 0;
    return {
      total_co2e: val,
      coverage_percent: rootSku.pcf_co2e ? 100 : 0,
      missing_data_skus: rootSku.pcf_co2e ? [] : [{ sku: rootSku }]
    };
  }

  children.forEach(link => {
    const childSku = skus.find(s => s.id === link.child_sku_id);
    if (childSku) {
      componentsCount++;
      // Recursive call
      const childResult = calculateAggregatedPCF(childSku.id, bomLinks, skus, nextAncestors);
      
      if (childResult.coverage_percent > 0) {
        componentsWithData++;
        total += (childResult.total_co2e * (link.quantity || 1));
      } else {
        // If child has no data, add it as missing (wrapper object)
        missingSkus.push({ sku: childSku, quantity: link.quantity });
      }
      
      // Accumulate missing from children (already wrappers)
      missingSkus = [...missingSkus, ...childResult.missing_data_skus];
    }
  });

  // Simple coverage metric: % of direct children with data
  const coverage = componentsCount > 0 ? Math.round((componentsWithData / componentsCount) * 100) : 0;

  // Deduplicate missing SKUs by ID
  const uniqueMissing = [];
  const seenIds = new Set();
  missingSkus.forEach(item => {
    if (item.sku && !seenIds.has(item.sku.id)) {
      seenIds.add(item.sku.id);
      uniqueMissing.push(item);
    }
  });

  return {
    total_co2e: parseFloat(total.toFixed(2)),
    coverage_percent: coverage,
    missing_data_skus: uniqueMissing
  };
}

/**
 * Checks readiness for CSRD/CSDDD reporting
 */
export function checkSustainabilityCompliance(sku, supplier) {
  const checks = [];
  
  // EPD Check
  if (sku.lca_stage === 'epd_verified') {
    checks.push({ type: 'LCA', status: 'pass', label: 'EPD Verified' });
  } else if (sku.lca_stage === 'full_lca') {
    checks.push({ type: 'LCA', status: 'warning', label: 'Self-Declared LCA' });
  } else {
    checks.push({ type: 'LCA', status: 'fail', label: 'Missing LCA/EPD' });
  }

  // PCF Data
  if (sku.pcf_co2e > 0) {
    checks.push({ type: 'PCF', status: 'pass', label: `${sku.pcf_co2e} kgCO2e` });
  } else {
    checks.push({ type: 'PCF', status: 'fail', label: 'No Carbon Data' });
  }

  // Supplier CSRD Readiness (Proxy via risk score/data completeness)
  if (supplier) {
    if (supplier.data_completeness > 80) {
      checks.push({ type: 'CSRD', status: 'pass', label: 'Supplier CSRD Ready' });
    } else {
      checks.push({ type: 'CSRD', status: 'warning', label: 'Supplier Data Gap' });
    }
  }

  return checks;
}