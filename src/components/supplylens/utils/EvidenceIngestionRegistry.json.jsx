{
  "version": "1.0.0",
  "last_updated": "2026-01-29",
  "description": "Single source of truth for Evidence Ingestion Wizard validation rules",
  
  "ingestion_methods": {
    "FILE_UPLOAD": {
      "id": "FILE_UPLOAD",
      "label": "File Upload",
      "description": "Upload evidence files (certificates, reports, documents)",
      "payload_mode": "FILE_BYTES",
      "allowed_evidence_types": [
        "SUPPLIER_MASTER",
        "PRODUCT_MASTER",
        "BOM",
        "CERTIFICATE_DOC",
        "TEST_REPORT",
        "TRANSACTION_LOG",
        "OTHER"
      ],
      "step1_required_fields": [
        "ingestion_method",
        "evidence_type",
        "declared_scope",
        "why_this_evidence"
      ],
      "step2_required_fields": [
        "attachments"
      ],
      "step2_validation": {
        "min_attachments": 1,
        "requires_server_hash": true
      },
      "defaults": {
        "trust_level": "MEDIUM",
        "review_status": "PENDING_REVIEW",
        "source_system": "FILE_UPLOAD"
      }
    },
    
    "MANUAL_ENTRY": {
      "id": "MANUAL_ENTRY",
      "label": "Manual Entry",
      "description": "Manually enter structured evidence data",
      "payload_mode": "CANONICAL_JSON",
      "allowed_evidence_types": [
        "SUPPLIER_MASTER",
        "PRODUCT_MASTER",
        "BOM",
        "TRANSACTION_LOG"
      ],
      "step1_required_fields": [
        "ingestion_method",
        "evidence_type",
        "declared_scope",
        "why_this_evidence",
        "submission_channel"
      ],
      "step2_required_fields": [
        "attestation_notes",
        "payload_data_json"
      ],
      "step2_validation": {
        "attestation_notes_min_length": 20,
        "payload_data_json_required": true,
        "requires_server_hash": true,
        "max_attachments": 0
      },
      "defaults": {
        "trust_level": "LOW",
        "review_status": "PENDING_REVIEW",
        "source_system": "MANUAL_ENTRY"
      }
    },
    
    "API_PUSH_DIGEST_ONLY": {
      "id": "API_PUSH_DIGEST_ONLY",
      "label": "API Push (Digest Only)",
      "description": "External system pushes evidence digest for audit trail",
      "payload_mode": "DIGEST_ONLY",
      "allowed_evidence_types": [
        "SUPPLIER_MASTER",
        "PRODUCT_MASTER",
        "BOM",
        "TRANSACTION_LOG",
        "OTHER"
      ],
      "step1_required_fields": [
        "ingestion_method",
        "evidence_type",
        "declared_scope",
        "why_this_evidence",
        "external_reference_id"
      ],
      "step2_required_fields": [
        "payload_digest_sha256",
        "received_at_utc"
      ],
      "step2_validation": {
        "payload_digest_sha256_format": "^[a-f0-9]{64}$",
        "received_at_utc_required": true,
        "max_attachments": 0
      },
      "defaults": {
        "trust_level": "MEDIUM",
        "review_status": "NOT_REVIEWED",
        "source_system": "API_PUSH"
      }
    },
    
    "ERP_EXPORT_FILE": {
      "id": "ERP_EXPORT_FILE",
      "label": "ERP Export (File)",
      "description": "Batch export file from ERP system",
      "payload_mode": "FILE_BYTES",
      "allowed_evidence_types": [
        "SUPPLIER_MASTER",
        "PRODUCT_MASTER",
        "BOM",
        "TRANSACTION_LOG"
      ],
      "step1_required_fields": [
        "ingestion_method",
        "evidence_type",
        "declared_scope",
        "why_this_evidence",
        "external_reference_id"
      ],
      "step2_required_fields": [
        "attachments",
        "erp_instance_name",
        "snapshot_datetime_utc"
      ],
      "step2_validation": {
        "min_attachments": 1,
        "requires_server_hash": true,
        "erp_instance_name_required": true
      },
      "defaults": {
        "trust_level": "HIGH",
        "review_status": "NOT_REVIEWED",
        "source_system": "ERP_EXPORT"
      }
    },
    
    "ERP_API_PULL": {
      "id": "ERP_API_PULL",
      "label": "ERP API (System Pull)",
      "description": "Real-time pull from ERP API connector",
      "payload_mode": "ERP_REF",
      "allowed_evidence_types": [
        "SUPPLIER_MASTER",
        "PRODUCT_MASTER",
        "BOM",
        "TRANSACTION_LOG"
      ],
      "step1_required_fields": [
        "ingestion_method",
        "evidence_type",
        "declared_scope",
        "why_this_evidence",
        "external_reference_id"
      ],
      "step2_required_fields": [
        "connector_id",
        "sync_run_id"
      ],
      "step2_validation": {
        "connector_id_required": true,
        "sync_run_id_required": true,
        "max_attachments": 0
      },
      "defaults": {
        "trust_level": "HIGH",
        "review_status": "NOT_REVIEWED",
        "source_system": "ERP_API"
      }
    }
  },
  
  "evidence_types": {
    "SUPPLIER_MASTER": {
      "id": "SUPPLIER_MASTER",
      "label": "Supplier Master Data",
      "allowed_scopes": ["ENTIRE_ORG", "LEGAL_ENTITY", "SUPPLIER"]
    },
    "PRODUCT_MASTER": {
      "id": "PRODUCT_MASTER",
      "label": "Product Master Data",
      "allowed_scopes": ["ENTIRE_ORG", "LEGAL_ENTITY", "PRODUCT_FAMILY", "PRODUCT"]
    },
    "BOM": {
      "id": "BOM",
      "label": "Bill of Materials",
      "allowed_scopes": ["PRODUCT_FAMILY", "PRODUCT"]
    },
    "CERTIFICATE_DOC": {
      "id": "CERTIFICATE_DOC",
      "label": "Certificate / Compliance Document",
      "allowed_scopes": ["ENTIRE_ORG", "LEGAL_ENTITY", "SUPPLIER", "PRODUCT_FAMILY", "PRODUCT", "SITE"]
    },
    "TEST_REPORT": {
      "id": "TEST_REPORT",
      "label": "Test Report / Lab Results",
      "allowed_scopes": ["PRODUCT_FAMILY", "PRODUCT", "SUPPLIER", "SITE"]
    },
    "TRANSACTION_LOG": {
      "id": "TRANSACTION_LOG",
      "label": "Transaction / Shipment Log",
      "allowed_scopes": ["ENTIRE_ORG", "LEGAL_ENTITY", "SUPPLIER"]
    },
    "OTHER": {
      "id": "OTHER",
      "label": "Other Evidence",
      "allowed_scopes": ["ENTIRE_ORG", "LEGAL_ENTITY", "PRODUCT_FAMILY", "PRODUCT", "SUPPLIER", "SITE"],
      "restrictions": {
        "allowed_methods_only": ["FILE_UPLOAD", "API_PUSH_DIGEST_ONLY"],
        "manual_entry_requires_template": true
      }
    }
  },
  
  "scopes": {
    "ENTIRE_ORG": {
      "id": "ENTIRE_ORG",
      "label": "Entire Organization",
      "requires_target": false
    },
    "LEGAL_ENTITY": {
      "id": "LEGAL_ENTITY",
      "label": "Legal Entity",
      "requires_target": true,
      "target_entity_type": "LegalEntity"
    },
    "PRODUCT_FAMILY": {
      "id": "PRODUCT_FAMILY",
      "label": "Product Family",
      "requires_target": true,
      "target_entity_type": "ProductFamily"
    },
    "PRODUCT": {
      "id": "PRODUCT",
      "label": "Product / SKU",
      "requires_target": true,
      "target_entity_type": "SKU"
    },
    "SUPPLIER": {
      "id": "SUPPLIER",
      "label": "Supplier",
      "requires_target": true,
      "target_entity_type": "Supplier"
    },
    "SITE": {
      "id": "SITE",
      "label": "Site / Facility",
      "requires_target": true,
      "target_entity_type": "SupplierSite"
    }
  },
  
  "submission_channels": {
    "INTERNAL_USER": {
      "id": "INTERNAL_USER",
      "label": "Internal User",
      "description": "Submitted by internal company user",
      "additional_fields": []
    },
    "SUPPLIER_PORTAL": {
      "id": "SUPPLIER_PORTAL",
      "label": "Supplier Portal",
      "description": "Submitted via supplier collaboration portal",
      "additional_fields": ["submission_reference_id"]
    },
    "CONSULTANT_PORTAL": {
      "id": "CONSULTANT_PORTAL",
      "label": "Consultant Portal",
      "description": "Submitted by external consultant",
      "additional_fields": ["consultant_id"]
    },
    "EMAIL": {
      "id": "EMAIL",
      "label": "Email Submission",
      "description": "Received via email and processed",
      "additional_fields": ["email_reference_id"]
    },
    "API_INTEGRATION": {
      "id": "API_INTEGRATION",
      "label": "API Integration",
      "description": "Automated API integration",
      "additional_fields": ["integration_id", "api_endpoint"]
    }
  },
  
  "validation_rules": {
    "why_this_evidence_min_length": 20,
    "attestation_notes_min_length": 20,
    "external_reference_id_max_length": 255,
    "payload_digest_sha256_regex": "^[a-f0-9]{64}$"
  }
}