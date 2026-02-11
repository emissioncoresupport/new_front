{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://emissioncore.com/schemas/ingestion-response.json",
  "title": "Ingestion Response Schema",
  "description": "Contract schema for responses from custom ingestion backend to Base44",
  "type": "object",
  "required": [
    "request_id",
    "outcome",
    "backend_timestamp"
  ],
  "properties": {
    "request_id": {
      "type": "string",
      "format": "uuid",
      "description": "Echoed from request (idempotency validation)"
    },
    "outcome": {
      "type": "string",
      "enum": ["ACCEPTED", "PARTIAL", "REJECTED", "PENDING"],
      "description": "Overall outcome of ingestion request"
    },
    "evidence_ids_created": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of Evidence IDs created (empty if REJECTED)"
    },
    "rejected_items": {
      "type": "array",
      "description": "Items that failed validation/processing",
      "items": {
        "type": "object",
        "required": ["item_reference", "reason_code", "reason_detail"],
        "properties": {
          "item_reference": {
            "type": "string",
            "description": "Row number, file name, or item identifier"
          },
          "reason_code": {
            "type": "string",
            "enum": [
              "INVALID_CONTEXT",
              "UNAUTHORIZED",
              "MALFORMED_PAYLOAD",
              "DUPLICATE",
              "VALIDATION_FAILED",
              "HASH_MISMATCH",
              "FILE_NOT_FOUND",
              "SCHEMA_ERROR"
            ],
            "description": "Machine-readable reason code"
          },
          "reason_detail": {
            "type": "string",
            "description": "Human-readable explanation"
          },
          "evidence_id": {
            "type": "string",
            "description": "Evidence ID if rejection was materialized"
          },
          "field_errors": {
            "type": "object",
            "description": "Field-level validation errors",
            "additionalProperties": {
              "type": "string"
            }
          }
        }
      }
    },
    "reason_codes": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Summary array of all reason codes encountered"
    },
    "backend_timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 UTC timestamp when backend processed request"
    },
    "audit_log_id": {
      "type": "string",
      "description": "Reference to backend audit log entry"
    },
    "processing_time_ms": {
      "type": "integer",
      "description": "Backend processing time in milliseconds"
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Non-fatal warnings that don't prevent ingestion"
    },
    "metadata": {
      "type": "object",
      "description": "Optional metadata for debugging",
      "properties": {
        "backend_version": {
          "type": "string"
        },
        "execution_node": {
          "type": "string"
        }
      }
    }
  }
}