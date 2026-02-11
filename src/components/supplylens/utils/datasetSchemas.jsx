/**
 * Dataset Schema Registry for MANUAL_ENTRY validation
 * Defines required/optional fields + templates for each dataset_type
 */

export const DATASET_SCHEMAS = {
  SUPPLIER_MASTER: {
    required: ['supplier_name', 'country_code', 'primary_contact_email'],
    optional: ['vat_number', 'duns_number', 'address', 'city'],
    template: {
      supplier_name: "ACME Corporation Ltd",
      country_code: "DE",
      primary_contact_email: "contact@acme-corp.example",
      vat_number: "DE123456789",
      address: "123 Industrial Street",
      city: "Munich"
    }
  },
  PRODUCT_MASTER: {
    required: ['product_code', 'product_name', 'category'],
    optional: ['unit_of_measure', 'weight_kg', 'hs_code'],
    template: {
      product_code: "PRD-2026-001",
      product_name: "Precision Component X200",
      category: "Electronics",
      unit_of_measure: "pieces",
      weight_kg: 0.5,
      hs_code: "8517.62.00"
    }
  },
  BOM: {
    required: ['parent_product_code', 'component_items'],
    optional: ['bom_version', 'effective_date'],
    template: {
      parent_product_code: "PRD-PARENT-001",
      bom_version: "v1.2",
      effective_date: "2026-01-26",
      component_items: [
        { component_code: "CMP-001", quantity: 2, unit: "pieces" },
        { component_code: "CMP-002", quantity: 1, unit: "pieces" }
      ]
    }
  },
  TEST_REPORT: {
    required: ['test_date', 'test_type', 'result_status'],
    optional: ['lab_name', 'certificate_number', 'test_parameters'],
    template: {
      test_date: "2026-01-26",
      test_type: "Material Composition Analysis",
      result_status: "PASS",
      lab_name: "Certified Testing Lab GmbH",
      certificate_number: "CERT-2026-001",
      test_parameters: {
        lead_ppm: 5.2,
        cadmium_ppm: 0.8,
        mercury_ppm: 0.1
      }
    }
  },
  CERTIFICATE: {
    required: ['certificate_type', 'issued_by', 'valid_from', 'valid_until'],
    optional: ['certificate_number', 'scope', 'accreditation_body'],
    template: {
      certificate_type: "ISO 13485:2016",
      issued_by: "TÜV SÜD",
      valid_from: "2025-06-01",
      valid_until: "2028-05-31",
      certificate_number: "12345678",
      scope: "Medical Device Manufacturing",
      accreditation_body: "DAkkS"
    }
  },
  TRANSACTION_LOG: {
    required: ['transaction_id', 'transaction_date', 'transaction_type'],
    optional: ['amount', 'currency', 'reference'],
    template: {
      transaction_id: "TXN-2026-001",
      transaction_date: "2026-01-26T10:30:00Z",
      transaction_type: "PURCHASE_ORDER",
      amount: 15000.00,
      currency: "EUR",
      reference: "PO-2026-001"
    }
  },
  OTHER: {
    required: ['data_type', 'description'],
    optional: ['metadata'],
    template: {
      data_type: "Custom Dataset",
      description: "Description of the custom data being entered",
      metadata: {
        source: "Manual verification",
        verified_by: "Quality Team"
      }
    }
  }
};

export function getSchemaForDataset(datasetType) {
  return DATASET_SCHEMAS[datasetType] || DATASET_SCHEMAS.OTHER;
}

export function generateTemplate(datasetType) {
  const schema = getSchemaForDataset(datasetType);
  return JSON.stringify(schema.template, null, 2);
}

export function validatePayload(datasetType, payloadObj) {
  const schema = getSchemaForDataset(datasetType);
  const errors = [];

  // Check required fields
  for (const field of schema.required) {
    if (!payloadObj.hasOwnProperty(field)) {
      errors.push(`Missing required field: ${field}`);
    } else if (payloadObj[field] === null || payloadObj[field] === '') {
      errors.push(`Required field cannot be empty: ${field}`);
    }
  }

  // Detect placeholder values
  const placeholders = ['test', 'asdf', 'xxx', '-', 'n/a', 'tbd', 'placeholder', 'example'];
  for (const [key, value] of Object.entries(payloadObj)) {
    if (typeof value === 'string') {
      const lowerVal = value.toLowerCase().trim();
      if (placeholders.includes(lowerVal)) {
        errors.push(`Placeholder value not allowed for ${key}: "${value}"`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}