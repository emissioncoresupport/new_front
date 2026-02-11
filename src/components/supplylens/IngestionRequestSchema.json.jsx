{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://emissioncore.com/schemas/ingestion-request.json",
  "title": "Ingestion Request Schema",
  "description": "Contract schema for requests from Base44 to custom ingestion backend",
  "type": "object",
  "required": [
    "request_id",
    "tenant_id",
    "ingestion_path",
    "actor_id",
    "actor_role",
    "declared_context",
    "payload_reference",
    "request_timestamp"
  ],
  "properties": {
    "request_id": {
      "type": "string",
      "format": "uuid",
      "description": "Idempotency key (UUID v4)"
    },
    "tenant_id": {
      "type": "string",
      "description": "Multi-tenant isolation identifier"
    },
    "ingestion_path": {
      "type": "string",
      "enum": ["manual", "bulk_import", "supplier_portal", "erp_snapshot", "api"],
      "description": "How this data is being ingested"
    },
    "actor_id": {
      "type": "string",
      "description": "User email or system identifier"
    },
    "actor_role": {
      "type": "string",
      "enum": ["admin", "legal", "compliance", "procurement", "auditor", "system"],
      "description": "Role of the actor performing ingestion"
    },
    "declared_context": {
      "type": "object",
      "required": ["entity_type", "intended_use", "source_role"],
      "properties": {
        "entity_type": {
          "type": "string",
          "enum": ["supplier", "product", "shipment", "material", "unknown"],
          "description": "What entity type this data represents"
        },
        "intended_use": {
          "type": "string",
          "enum": ["CBAM", "CSRD", "EUDR", "PFAS", "PPWR", "EUDAMED", "general"],
          "description": "Which regulation/framework this supports"
        },
        "source_role": {
          "type": "string",
          "enum": ["buyer", "supplier", "system", "auditor"],
          "description": "Who is providing this data"
        },
        "reason": {
          "type": "string",
          "description": "Human-readable reason for this ingestion"
        }
      }
    },
    "payload_reference": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["file", "csv_rows", "declaration", "erp_snapshot"],
          "description": "Type of payload being ingested"
        },
        "file_url": {
          "type": "string",
          "description": "URL to uploaded file (required if type=file)"
        },
        "file_hash": {
          "type": "string",
          "pattern": "^[a-f0-9]{64}$",
          "description": "SHA-256 hash of file (required if type=file)"
        },
        "rows": {
          "type": "array",
          "description": "Array of CSV row objects (required if type=csv_rows)",
          "items": {
            "type": "object"
          }
        },
        "declaration": {
          "type": "object",
          "description": "Declarative data object (required if type=declaration)"
        },
        "erp_snapshot": {
          "type": "object",
          "description": "ERP batch metadata (required if type=erp_snapshot)",
          "properties": {
            "sync_run_id": {
              "type": "string"
            },
            "source_system": {
              "type": "string"
            },
            "batch_size": {
              "type": "integer"
            }
          }
        }
      }
    },
    "request_timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 UTC timestamp when request was created"
    },
    "metadata": {
      "type": "object",
      "description": "Optional metadata for tracing",
      "properties": {
        "ui_version": {
          "type": "string"
        },
        "user_agent": {
          "type": "string"
        },
        "trace_id": {
          "type": "string"
        }
      }
    }
  }
}