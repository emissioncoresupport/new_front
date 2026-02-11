# INGESTION EXECUTION CONTRACT
**Version:** 1.0.0  
**Effective Date:** 2026-01-21  
**Status:** AUTHORITATIVE REFERENCE  
**Authority:** Enterprise Architecture Team

---

## 1. PARTIES & SCOPE

This contract defines the canonical interface between:

- **Base44 Platform** (UI, orchestration, visibility, user feedback)
- **Custom Ingestion Backend** (execution, guarantees, determinism, Evidence creation)

**GLOBAL PRINCIPLE:** Once backend is active, Base44 MUST NOT create Evidence records directly. All ingestion execution guarantees live in the backend.

---

## 2. ENTERPRISE BENCHMARKING

This contract adopts enterprise patterns from:

| System | Pattern Adopted | Anti-Pattern Rejected |
|--------|----------------|----------------------|
| **SAP** | Strict master data separation | Silent normalization/overwrites |
| **ServiceNow** | Contract-driven orchestration | UI-driven truth |
| **Stripe** | Idempotent ingestion, explicit failures | Silent drops |
| **Financial KYC** | Evidence immutability, replayability | Eventual consistency without audit |

### Explicitly REJECTED Anti-Patterns:
- ❌ Silent normalization
- ❌ Auto-merge of records without approval
- ❌ Implicit defaults
- ❌ UI-driven truth (backend is authoritative)
- ❌ Eventual consistency without audit trace

---

## 3. INGESTION REQUEST SCHEMA

Base44 sends the following structure to the backend ingestion endpoint:

```json
{
  "request_id": "string (UUID, idempotency key)",
  "tenant_id": "string (REQUIRED)",
  "ingestion_path": "manual | bulk_import | supplier_portal | erp_snapshot | api",
  "actor_id": "string (user email)",
  "actor_role": "admin | legal | compliance | procurement | auditor",
  "declared_context": {
    "entity_type": "supplier | product | shipment | material | unknown",
    "intended_use": "CBAM | CSRD | EUDR | PFAS | PPWR | EUDAMED | general",
    "source_role": "buyer | supplier | system | auditor",
    "reason": "string (human-readable)"
  },
  "payload_reference": {
    "type": "file | csv_rows | declaration | erp_snapshot",
    "file_url": "string (if file)",
    "file_hash": "string (if file)",
    "rows": "array (if CSV)",
    "declaration": "object (if declarative)"
  },
  "request_timestamp": "string (ISO 8601 UTC)"
}
```

### Validation Responsibility:
- **Base44:** Validates presence of required fields only
- **Backend:** Validates semantics, business rules, authorization
- **Failure Mode:** Missing required fields → REJECTED with reason code `INVALID_REQUEST`

---

## 4. INGESTION RESPONSE SCHEMA

Backend returns the following structure:

```json
{
  "request_id": "string (echoed from request)",
  "outcome": "ACCEPTED | PARTIAL | REJECTED",
  "evidence_ids_created": ["string (Evidence IDs)"],
  "rejected_items": [
    {
      "item_reference": "string (row number, file name, etc.)",
      "reason_code": "INVALID_CONTEXT | UNAUTHORIZED | MALFORMED_PAYLOAD | DUPLICATE | VALIDATION_FAILED",
      "reason_detail": "string (human-readable)",
      "evidence_id": "string (if rejection was materialized as Evidence)"
    }
  ],
  "reason_codes": ["string (summary reason codes)"],
  "backend_timestamp": "string (ISO 8601 UTC)",
  "audit_log_id": "string (reference to backend audit log)"
}
```

### Rules:
- ✅ Partial success MUST be explicit (`outcome: PARTIAL`)
- ✅ Every rejected item MUST have a `reason_code` and `reason_detail`
- ✅ No silent drops allowed
- ✅ Backend MUST create audit trail for all requests

---

## 5. IDENTITY, IDEMPOTENCY & RETRIES

### Guarantees:

| Guarantee | Implementation |
|-----------|---------------|
| **Idempotency** | Same `request_id` MUST NOT create duplicate Evidence |
| **Retry Safety** | Retries with same `request_id` return identical outcome |
| **Determinism** | Same input ALWAYS produces same output |
| **Ownership** | Backend owns retry logic, Base44 only displays status |

### Backend Requirements:
- Track `request_id` in request log
- Return cached response if `request_id` seen before
- Timeout: 30 seconds for simple requests, 5 minutes for bulk
- Base44 MUST display timeout status and allow re-check

---

## 6. FAILURE MODES (ENTERPRISE-REQUIRED)

| Failure Mode | Outcome | Evidence Created? | Audit Logged? | UI Display |
|-------------|---------|-------------------|---------------|-----------|
| **Invalid Context** | REJECTED | No | Yes | Error modal with reason |
| **Unauthorized Actor** | REJECTED | No | Yes | "Permission denied" |
| **Malformed Payload** | REJECTED | No | Yes | Validation errors listed |
| **Partial Bulk Failure** | PARTIAL | Yes (for successful rows) | Yes | Success/failure breakdown |
| **Duplicate Submission** | REJECTED | No (return existing Evidence IDs) | Yes | "Already processed" |
| **Backend Timeout** | PENDING | No | Yes | "Processing... check status" |
| **Backend Unavailable** | ERROR | No | Base44 logs | "Service unavailable" |

### Critical Rule:
Every failure MUST be:
1. ✅ Materialized (response or Evidence)
2. ✅ Audit-logged
3. ✅ Visible in UI
4. ✅ Reference created when applicable

---

## 7. RESPONSIBILITY MATRIX (HARD SPLIT)

### Base44 RESPONSIBLE FOR:

| Responsibility | Details |
|---------------|---------|
| **UI Flows** | Upload forms, bulk import wizards, portal interfaces |
| **Context Capture** | Collecting `declared_context` from user |
| **User Feedback** | Displaying outcomes, errors, progress |
| **Pre-Validation** | Presence checks only (not semantics) |
| **Blocking Unavailable Paths** | Disable UI if backend not ready |
| **Developer Console Link** | Show gaps and limitations |
| **Request ID Generation** | Generate UUID for `request_id` |

### Backend RESPONSIBLE FOR:

| Responsibility | Details |
|---------------|---------|
| **Evidence Creation** | All Evidence records created here |
| **Hashing** | SHA-256 for files and declarations |
| **Validation** | Semantic, business rules, authorization |
| **Failure Materialization** | Create rejection Evidence when needed |
| **Determinism** | Same input → same output |
| **Replayability** | Idempotency guarantees |
| **State Machine** | Evidence state transitions |
| **Audit Trail** | All requests logged with outcomes |

### FORBIDDEN:

| Action | Reason |
|--------|--------|
| Base44 creates Evidence directly | Backend is authoritative |
| Base44 performs semantic validation | Backend owns business rules |
| Backend creates UI feedback | Base44 owns presentation |
| Silent normalization | Must be explicit and logged |
| Implicit defaults | All defaults must be documented |

---

## 8. DEVELOPER CONSOLE INTEGRATION

For every contract gap or unimplemented backend capability, a Developer Console entry MUST exist.

### Required Fields per Gap:
- `entry_id`: e.g., `DCE-2026-A2-001`
- `phase`: "Phase A.2"
- `component`: "Ingestion" or "Backend"
- `limitation_type`: `NOT_IMPLEMENTED` | `PARTIAL` | `BLOCKED`
- `description`: Precise gap description
- `why_it_matters`: Audit/legal/reliability impact
- `current_behavior`: What Base44 does now (e.g., creates Evidence directly)
- `expected_behavior`: Backend creates Evidence per contract
- `backend_action_required`: Explicit action for backend engineers
- `risk_level`: `HIGH` or `CRITICAL` for contract violations
- `status`: `OPEN`

---

## 9. INGESTION PATH SPECIFICS

### Manual Upload (manual)
- **Input:** Single file + context
- **Backend:** Create one Evidence, return `evidence_id`
- **Failure:** File hash validation, context validation

### Bulk Import (bulk_import)
- **Input:** CSV file or array of rows
- **Backend:** Create Evidence per row, return array
- **Failure:** Partial success allowed, return breakdown

### Supplier Portal (supplier_portal)
- **Input:** Form data + uploaded files
- **Backend:** Create Evidence, validate supplier authorization
- **Failure:** Supplier not found, unauthorized

### ERP Snapshot (erp_snapshot)
- **Input:** Batch from ERP connector
- **Backend:** Create Evidence batch, link to sync run
- **Failure:** Schema mismatch, duplicate detection

### API (api)
- **Input:** JSON payload via REST API
- **Backend:** Create Evidence, validate API key
- **Failure:** Rate limit, authentication

---

## 10. MIGRATION PATH (CURRENT → TARGET)

### Current State (as of 2026-01-21):
- ❌ Base44 creates Evidence directly via `createEvidenceFromContext` function
- ❌ No backend ingestion endpoint exists
- ❌ No idempotency guarantees
- ❌ No failure materialization
- ❌ UI and backend logic mixed

### Target State (per this contract):
- ✅ Backend ingestion endpoint implemented
- ✅ Base44 calls backend, receives response
- ✅ All Evidence creation in backend
- ✅ Idempotency via `request_id`
- ✅ Explicit failure handling
- ✅ Developer Console tracks progress

### Migration Steps:
1. **Backend Implementation:** Create ingestion endpoint per contract
2. **Base44 Integration:** Update UI to call backend instead of direct DB
3. **Parallel Run:** Run both systems, compare outputs
4. **Cutover:** Disable Base44 Evidence creation
5. **Cleanup:** Remove deprecated functions

---

## 11. TESTING & VALIDATION

### Backend Contract Tests:
- ✅ Idempotency: Same `request_id` → same outcome
- ✅ Rejection: Invalid context → `REJECTED` + reason
- ✅ Partial Success: Bulk with errors → `PARTIAL` + breakdown
- ✅ Timeout: Long request → status checkable
- ✅ Audit: All requests logged

### Base44 Integration Tests:
- ✅ Upload file → backend called with correct schema
- ✅ Bulk import → backend receives CSV rows
- ✅ Supplier portal → backend validates actor
- ✅ Error display → rejected items shown to user
- ✅ Developer Console → gaps visible

---

## 12. VERSIONING & EVOLUTION

### Contract Version: 1.0.0
- **Breaking Changes:** Require new major version (2.0.0)
- **Additive Changes:** New optional fields → minor version (1.1.0)
- **Clarifications:** Patch version (1.0.1)

### Deprecation Policy:
- All breaking changes MUST have 90-day deprecation notice
- Developer Console MUST track deprecated features
- Backward compatibility MUST be maintained during transition

---

## 13. CONCLUSION

This contract is the **authoritative reference** for all ingestion execution between Base44 and the custom backend.

Any deviation from this contract MUST be:
1. Documented in Developer Console
2. Approved by architecture team
3. Time-boxed with resolution date

**Backend engineers:** Use this contract to implement ingestion endpoints.  
**Base44 engineers:** Use this contract to integrate with backend.  
**Auditors:** Use this contract to verify compliance.

**END OF CONTRACT**