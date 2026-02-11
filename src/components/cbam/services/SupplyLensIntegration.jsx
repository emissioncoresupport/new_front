/**
 * CBAM ↔ SupplyLens Integration
 * SupplyLens is the system of record for Suppliers and SKUs
 * CBAM references these via canonical IDs: supplylens_supplier_id, supplylens_sku_id
 */

import { base44 } from '@/api/base44Client';

/**
 * Fetch all suppliers from SupplyLens (system of record)
 * Filter for non-EU suppliers if CBAM scope
 */
export const getSupplyLensSuppliers = async (filterNonEUOnly = true) => {
  try {
    const suppliers = await base44.entities.Supplier.list();
    
    if (filterNonEUOnly) {
      return suppliers.filter(s => !isEUCountry(s.country_code));
    }
    return suppliers;
  } catch (error) {
    console.error('Error fetching SupplyLens suppliers:', error);
    return [];
  }
};

/**
 * Fetch SKUs for a specific supplier from SupplyLens
 */
export const getSupplyLensSKUs = async (supplierLensId) => {
  try {
    if (!supplierLensId) return [];
    
    const skus = await base44.entities.SKU.filter({
      tenant_id: supplierLensId
    });
    
    return skus || [];
  } catch (error) {
    console.error('Error fetching SupplyLens SKUs:', error);
    return [];
  }
};

/**
 * Get single supplier from SupplyLens by ID
 */
export const getSupplyLensSupplier = async (supplierId) => {
  try {
    const supplier = await base44.entities.Supplier.get(supplierId);
    return supplier || null;
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return null;
  }
};

/**
 * Get single SKU from SupplyLens by ID
 */
export const getSupplyLensSKU = async (skuId) => {
  try {
    const sku = await base44.entities.SKU.get(skuId);
    return sku || null;
  } catch (error) {
    console.error('Error fetching SKU:', error);
    return null;
  }
};

/**
 * Check if country is in EU (CBAM only for non-EU imports)
 */
const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

export const isEUCountry = (countryCode) => {
  if (!countryCode) return false;
  return EU_COUNTRIES.includes(countryCode?.toUpperCase());
};

/**
 * Link CBAM entry to SupplyLens records
 * Stores canonical IDs for data consistency
 */
export const linkCBAMToSupplyLens = (cbamEntryData, supplensSupplier, supplensSkU) => {
  return {
    ...cbamEntryData,
    // Canonical foreign keys to SupplyLens
    supplylens_supplier_id: supplensSupplier?.id,
    supplylens_sku_id: supplensSkU?.id,
    // Keep legacy fields for backward compatibility
    supplier_id: supplensSupplier?.id,
    sku_id: supplensSkU?.id,
    // Audit trail
    data_source: 'Smart Import Wizard',
    linked_at: new Date().toISOString()
  };
};

/**
 * Validate supplier exists in SupplyLens before CBAM operations
 */
export const validateSupplierLinked = async (supplierId) => {
  if (!supplierId) {
    return { valid: false, message: 'Supplier not linked to SupplyLens' };
  }
  
  const supplier = await getSupplyLensSupplier(supplierId);
  if (!supplier) {
    return { valid: false, message: 'Supplier not found in SupplyLens' };
  }
  
  return { valid: true, supplier };
};

/**
 * Handle missing supplier gracefully - show "Not linked" state
 */
export const handleMissingSupplier = (supplierId) => {
  return {
    notLinked: true,
    message: `Supplier not linked to SupplyLens`,
    action: 'Link to SupplyLens',
    fallback: {
      legal_name: '⚠️ Not Linked',
      country: 'Unknown',
      primary_contact_email: 'supplier@unknown.com'
    }
  };
};