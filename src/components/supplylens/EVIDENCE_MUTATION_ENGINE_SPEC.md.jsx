# EVIDENCE MUTATION ENGINE - ARCHITECTURE SPECIFICATION

**Version:** 1.0.0  
**Date:** 2026-01-21  
**Status:** Design Specification (Pre-Implementation)  
**Audit Grade:** Regulator-Ready  

---

## SYSTEM OVERVIEW

The Evidence Mutation Engine is the **ONLY** component authorized to mutate Evidence state.
All state transitions are materialized as immutable events in an append-only event store.
The current state is a projection derived from event history.

### Design Principles

1. **Append-Only Event Sourcing** - No updates, only inserts
2. **Command/Event Separation** - Intent vs outcome
3. **Deterministic Replay** - Same events = same state
4. **Zero Trust** - Validate everything, trust nothing
5. **Explicit Rejection** - No silent failures
6. **Audit-First** - Every decision is traceable

---

## ARCHITECTURE DIAGRAM (TEXTUAL)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  (UI, Bulk Import, Supplier Portal, ERP Snapshot)               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ Command (Intent)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     COMMAND HANDLER                              │
│  - Validate command_id (idempotency)                            │
│  - Validate actor_role authorization                             │
│  - Validate payload schema                                       │
│  - Load current state from event store                          │
│  - Apply business rules (invariants)                             │
│  - Emit event OR reject                                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ├─ SUCCESS ──> Emit Event
                           │               │
                           │               ▼
                           │     ┌──────────────────────────┐
                           │     │   EVENT STORE            │
                           │     │   (Append-Only)          │
                           │     │                          │
                           │     │  - EvidenceCreated       │
                           │     │  - EvidenceClassified    │
                           │     │  - EvidenceStructured    │
                           │     │  - EvidenceRejected      │
                           │     │  - TransitionBlocked     │
                           │     └────────┬─────────────────┘
                           │              │
                           │              │ Event Stream
                           │              ▼
                           │     ┌──────────────────────────┐
                           │     │   PROJECTIONS            │
                           │     │   (Read Models)          │
                           │     │                          │
                           │     │  - CurrentState          │
                           │     │  - ClassificationHistory │
                           │     │  - StructuringHistory    │
                           │     │  - AuditTrail            │
                           │     └──────────────────────────┘
                           │
                           └─ FAILURE ──> Emit Blocked Event
                                          + Return Error
```

---

## EVENT STORE SCHEMA

### Core Event Structure

All events share this base structure:

```json
{
  "event_id": "uuid (v4)",
  "event_type": "EvidenceCreated | EvidenceClassified | EvidenceStructured | EvidenceRejected | EvidenceStateTransitionBlocked",
  "event_version": "1.0.0",
  "tenant_id": "string (immutable)",
  "evidence_id": "string (immutable)",
  "command_id": "uuid (for idempotency)",
  "actor_id": "email",
  "actor_role": "admin | legal | compliance | procurement | auditor",
  "previous_state": "RAW | CLASSIFIED | STRUCTURED | REJECTED | null",
  "new_state": "RAW | CLASSIFIED | STRUCTURED | REJECTED | null",
  "timestamp": "ISO 8601 UTC (server-generated)",
  "sequence_number": "integer (auto-increment per evidence_id)",
  "payload": {
    // Event-specific data
  }
}
```

---

### Event Type 1: EvidenceCreated

**Trigger:** Initial evidence ingestion  
**Previous State:** null  
**New State:** RAW  

```json
{
  "event_type": "EvidenceCreated",
  "previous_state": null,
  "new_state": "RAW",
  "payload": {
    "ingestion_path": "upload_documents | bulk_import | supplier_portal | erp_snapshot | api",
    "declared_context": {
      "entity_type": "supplier | product | shipment | material | unknown",
      "intended_use": "CBAM | CSRD | EUDR | PFAS | PPWR | EUDAMED | general",
      "source_role": "buyer | supplier | system | auditor",
      "reason": "string"
    },
    "file_url": "string (null for declarative)",
    "file_hash_sha256": "string (64 hex chars)",
    "declaration_hash_sha256": "string (for CSV rows)",
    "file_size_bytes": "number",
    "original_filename": "string",
    "declared_entity_type": "SUPPLIER | SITE | SKU | MATERIAL | OTHER | UNDECLARED",
    "declared_evidence_type": "DECLARATION | CERTIFICATE | TEST_REPORT | AUDIT_REPORT | CSV_ROW | ERP_SNAPSHOT | OTHER"
  }
}
```

**Invariants:**
- `ingestion_path` must be enum value
- `declared_context` must be complete (all 4 fields)
- `file_hash_sha256` OR `declaration_hash_sha256` must exist
- `actor_id` must be authenticated user

---

### Event Type 2: EvidenceClassified

**Trigger:** Human classification of RAW evidence  
**Previous State:** RAW  
**New State:** CLASSIFIED  

```json
{
  "event_type": "EvidenceClassified",
  "previous_state": "RAW",
  "new_state": "CLASSIFIED",
  "payload": {
    "classification_id": "uuid",
    "evidence_type": "invoice | certificate | contract | declaration | erp_snapshot | test_report | audit_report | email | spreadsheet | other",
    "claimed_scope": "supplier_identity | facility | product | shipment | material | batch | unknown",
    "claimed_frameworks": ["CBAM", "CSRD", "EUDR", "PFAS", "PPWR", "EUDAMED", "none"],
    "classifier_id": "email",
    "classifier_role": "admin | legal | compliance | procurement | auditor",
    "confidence": "high | medium | low",
    "notes": "string (optional)",
    "ai_suggestion": {
      "evidence_type": "string",
      "claimed_scope": "string",
      "claimed_frameworks": ["string"],
      "confidence_score": "number (0-100)"
    }
  }
}
```

**Invariants:**
- `previous_state` MUST be RAW
- `classifier_role` MUST be in [admin, legal, compliance, procurement, auditor]
- `actor_id` MUST equal `classifier_id`
- `actor_role` MUST equal `classifier_role`
- `evidence_type`, `claimed_scope`, `claimed_frameworks` are REQUIRED
- `ai_suggestion` is informational only - CANNOT trigger state change

---

### Event Type 3: EvidenceStructured

**Trigger:** Human-approved structuring of CLASSIFIED evidence  
**Previous State:** CLASSIFIED  
**New State:** STRUCTURED  

```json
{
  "event_type": "EvidenceStructured",
  "previous_state": "CLASSIFIED",
  "new_state": "STRUCTURED",
  "payload": {
    "structured_record_id": "uuid",
    "schema_type": "supplier_identity | facility | product | shipment | material | batch | other",
    "schema_version": "1.0",
    "extracted_fields": {
      // Key/value pairs extracted from Evidence
    },
    "extraction_source": "human | ai_suggestion",
    "ai_confidence_score": "number (0-100, null if human)",
    "ai_extraction_model": "string (null if human)",
    "approver_id": "email (REQUIRED)",
    "approver_role": "admin | legal | compliance | procurement | auditor",
    "approval_timestamp": "ISO 8601 UTC",
    "supersedes_record_id": "uuid (null if first)",
    "validation_errors": ["string"]
  }
}
```

**Invariants:**
- `previous_state` MUST be CLASSIFIED
- `approver_id` is REQUIRED (even if extraction_source=human)
- `approver_role` MUST be in [admin, legal, compliance, procurement, auditor]
- `actor_id` MUST equal `approver_id`
- `actor_role` MUST equal `approver_role`
- `schema_version` MUST exist in schema registry
- If `extraction_source=ai_suggestion`, human approval is MANDATORY
- `extracted_fields` MUST be valid JSON object (not array)

---

### Event Type 4: EvidenceRejected

**Trigger:** Human rejection of evidence (any state → REJECTED)  
**Previous State:** RAW | CLASSIFIED | STRUCTURED  
**New State:** REJECTED  

```json
{
  "event_type": "EvidenceRejected",
  "previous_state": "RAW | CLASSIFIED | STRUCTURED",
  "new_state": "REJECTED",
  "payload": {
    "rejection_reason": "string (REQUIRED)",
    "rejected_by": "email",
    "rejected_by_role": "admin | legal | compliance | auditor",
    "rejection_category": "invalid_file | fraudulent | duplicate | out_of_scope | data_quality | other",
    "rejection_timestamp": "ISO 8601 UTC"
  }
}
```

**Invariants:**
- `rejection_reason` is REQUIRED
- `rejected_by_role` MUST be in [admin, legal, compliance, auditor]
- `actor_id` MUST equal `rejected_by`
- Rejection is FINAL - no transitions from REJECTED

---

### Event Type 5: EvidenceStateTransitionBlocked

**Trigger:** Invariant violation or unauthorized attempt  
**Previous State:** any  
**New State:** null (no change)  

```json
{
  "event_type": "EvidenceStateTransitionBlocked",
  "previous_state": "RAW | CLASSIFIED | STRUCTURED | REJECTED",
  "new_state": null,
  "payload": {
    "attempted_command": "ClassifyEvidenceCommand | ApproveStructuringCommand | RejectEvidenceCommand",
    "blocked_reason": "unauthorized_role | invalid_state_transition | missing_required_fields | duplicate_command_id | schema_validation_failed | ai_approval_bypass | unknown_schema_version | other",
    "blocked_reason_detail": "string",
    "validation_errors": ["string"],
    "attempted_by": "email",
    "attempted_by_role": "string",
    "blocked_at": "ISO 8601 UTC"
  }
}
```

**Invariants:**
- ALWAYS emitted when command rejected
- `new_state` is null - no state change occurred
- `blocked_reason` MUST be explicit enum value
- `attempted_by` preserved for audit

---

## COMMAND DEFINITIONS

### Command Structure (Base)

All commands share this structure:

```json
{
  "command_id": "uuid (v4, REQUIRED)",
  "command_type": "ClassifyEvidenceCommand | ApproveStructuringCommand | RejectEvidenceCommand",
  "tenant_id": "string (REQUIRED)",
  "evidence_id": "string (REQUIRED)",
  "actor_id": "email (REQUIRED)",
  "actor_role": "string (REQUIRED)",
  "declared_intent": "string (human-readable)",
  "issued_at": "ISO 8601 UTC (client-generated)",
  "payload": {
    // Command-specific data
  }
}
```

---

### Command 1: ClassifyEvidenceCommand

**Intent:** Classify RAW evidence  
**Required State:** RAW  

```json
{
  "command_type": "ClassifyEvidenceCommand",
  "payload": {
    "evidence_type": "invoice | certificate | contract | declaration | erp_snapshot | test_report | audit_report | email | spreadsheet | other",
    "claimed_scope": "supplier_identity | facility | product | shipment | material | batch | unknown",
    "claimed_frameworks": ["CBAM", "CSRD", "EUDR", "PFAS", "PPWR", "EUDAMED", "none"],
    "classifier_role": "admin | legal | compliance | procurement | auditor",
    "confidence": "high | medium | low",
    "notes": "string (optional)"
  }
}
```

**Validation Rules:**
1. `evidence_id` must exist
2. Current state must be RAW
3. `actor_role` must match `classifier_role`
4. `actor_role` must be in authorized list
5. `command_id` must be unique (idempotency)
6. All required payload fields must be present

**Success:** Emits `EvidenceClassified` event  
**Failure:** Emits `EvidenceStateTransitionBlocked` event + returns error

---

### Command 2: ApproveStructuringCommand

**Intent:** Approve structuring of CLASSIFIED evidence  
**Required State:** CLASSIFIED  

```json
{
  "command_type": "ApproveStructuringCommand",
  "payload": {
    "schema_type": "supplier_identity | facility | product | shipment | material | batch | other",
    "schema_version": "1.0",
    "extracted_fields": {
      // Key/value pairs
    },
    "extraction_source": "human | ai_suggestion",
    "ai_confidence_score": "number (0-100, null if human)",
    "ai_extraction_model": "string (null if human)",
    "approver_role": "admin | legal | compliance | procurement | auditor",
    "supersedes_record_id": "uuid (optional)"
  }
}
```

**Validation Rules:**
1. `evidence_id` must exist
2. Current state must be CLASSIFIED
3. `actor_role` must match `approver_role`
4. `actor_role` must be in authorized list
5. `schema_version` must exist in schema registry
6. `command_id` must be unique
7. If `extraction_source=ai_suggestion`, human approval is MANDATORY
8. `extracted_fields` must be valid JSON object

**Success:** Emits `EvidenceStructured` event  
**Failure:** Emits `EvidenceStateTransitionBlocked` event + returns error

---

### Command 3: RejectEvidenceCommand

**Intent:** Reject evidence (from any state)  
**Required State:** RAW | CLASSIFIED | STRUCTURED  

```json
{
  "command_type": "RejectEvidenceCommand",
  "payload": {
    "rejection_reason": "string (REQUIRED)",
    "rejection_category": "invalid_file | fraudulent | duplicate | out_of_scope | data_quality | other",
    "rejected_by_role": "admin | legal | compliance | auditor"
  }
}
```

**Validation Rules:**
1. `evidence_id` must exist
2. Current state must NOT be REJECTED (already rejected)
3. `actor_role` must match `rejected_by_role`
4. `actor_role` must be in authorized list
5. `rejection_reason` is REQUIRED (not empty)
6. `command_id` must be unique

**Success:** Emits `EvidenceRejected` event  
**Failure:** Emits `EvidenceStateTransitionBlocked` event + returns error

---

## INVARIANT RULES (BACKEND ENFORCEMENT)

### State Transition Rules

```
ALLOWED TRANSITIONS:
  null → RAW (via EvidenceCreated)
  RAW → CLASSIFIED (via ClassifyEvidenceCommand)
  RAW → REJECTED (via RejectEvidenceCommand)
  CLASSIFIED → STRUCTURED (via ApproveStructuringCommand)
  CLASSIFIED → REJECTED (via RejectEvidenceCommand)
  STRUCTURED → REJECTED (via RejectEvidenceCommand)

FORBIDDEN TRANSITIONS:
  CLASSIFIED → RAW (downgrade)
  STRUCTURED → RAW (downgrade)
  STRUCTURED → CLASSIFIED (downgrade)
  RAW → STRUCTURED (skip CLASSIFIED)
  REJECTED → * (rejection is final)
```

**Enforcement:** Backend MUST validate current state before emitting event.

---

### Authorization Rules

**Authorized Roles for Classification:**
- admin
- legal
- compliance
- procurement
- auditor

**Authorized Roles for Structuring:**
- admin
- legal
- compliance
- procurement
- auditor

**Authorized Roles for Rejection:**
- admin
- legal
- compliance
- auditor

**Enforcement:** Backend MUST validate `actor_role` before processing command.

---

### Idempotency Rules

**Rule:** Same `command_id` executed multiple times MUST return cached result.

**Implementation:**
1. Before processing command, check if `command_id` exists in event store
2. If exists AND same payload, return previous event (idempotent)
3. If exists AND different payload, reject with error (conflicting command)
4. If not exists, process command

**Enforcement:** Backend MUST track command_id + response mapping.

---

### Immutability Rules

**Rule:** Evidence content MUST NEVER be mutated.

**Prohibited Operations:**
- Update `file_hash_sha256`
- Update `declaration_hash_sha256`
- Update `declared_context`
- Update `uploaded_at`
- Update `actor_id` of creation event

**Allowed Operations:**
- Append state transition events
- Supersede structured records (via `supersedes_record_id`)

**Enforcement:** Backend MUST reject Evidence.update() calls. Use event sourcing only.

---

### AI Approval Rules

**Rule:** AI suggestions can NEVER autonomously change state.

**Enforcement:**
1. If `extraction_source=ai_suggestion`, `approver_id` is REQUIRED
2. `approver_id` MUST be human (not AI system account)
3. `approver_role` MUST be in authorized list
4. Backend MUST reject structuring commands with AI-only approval

---

### Schema Version Rules

**Rule:** Schema versions MUST be validated against schema registry.

**Enforcement:**
1. Backend maintains schema version registry
2. Before emitting `EvidenceStructured` event, validate `schema_version` exists
3. Reject with error if version unknown or deprecated

---

## REJECTION CASES

### Case 1: Unauthorized Role

**Trigger:** `actor_role` not in authorized list  
**Response:**
```json
{
  "error_code": "UNAUTHORIZED_ROLE",
  "error_message": "Role 'user' is not authorized to classify evidence. Allowed: [admin, legal, compliance, procurement, auditor]",
  "blocked_event_id": "uuid",
  "http_status": 403
}
```

**Event Emitted:** `EvidenceStateTransitionBlocked`  
**State Change:** None  

---

### Case 2: Invalid State Transition

**Trigger:** Attempt forbidden transition (e.g., RAW → STRUCTURED)  
**Response:**
```json
{
  "error_code": "INVALID_STATE_TRANSITION",
  "error_message": "Cannot transition from RAW to STRUCTURED. Must be CLASSIFIED first.",
  "current_state": "RAW",
  "attempted_state": "STRUCTURED",
  "blocked_event_id": "uuid",
  "http_status": 400
}
```

**Event Emitted:** `EvidenceStateTransitionBlocked`  
**State Change:** None  

---

### Case 3: Missing Required Fields

**Trigger:** Command payload incomplete  
**Response:**
```json
{
  "error_code": "VALIDATION_FAILED",
  "error_message": "Command validation failed",
  "validation_errors": [
    "evidence_type is required",
    "classifier_role is required"
  ],
  "blocked_event_id": "uuid",
  "http_status": 400
}
```

**Event Emitted:** `EvidenceStateTransitionBlocked`  
**State Change:** None  

---

### Case 4: Duplicate Command ID (Conflicting Payload)

**Trigger:** Same `command_id` with different payload  
**Response:**
```json
{
  "error_code": "DUPLICATE_COMMAND_CONFLICT",
  "error_message": "Command ID already processed with different payload",
  "original_command_id": "uuid",
  "original_event_id": "uuid",
  "http_status": 409
}
```

**Event Emitted:** `EvidenceStateTransitionBlocked`  
**State Change:** None  

---

### Case 5: AI Approval Bypass

**Trigger:** `extraction_source=ai_suggestion` without human `approver_id`  
**Response:**
```json
{
  "error_code": "AI_APPROVAL_BYPASS",
  "error_message": "AI suggestions require human approver. approver_id is required.",
  "blocked_event_id": "uuid",
  "http_status": 400
}
```

**Event Emitted:** `EvidenceStateTransitionBlocked`  
**State Change:** None  

---

### Case 6: Unknown Schema Version

**Trigger:** `schema_version` not in registry  
**Response:**
```json
{
  "error_code": "UNKNOWN_SCHEMA_VERSION",
  "error_message": "Schema version '999.999.999' not found in registry",
  "available_versions": ["1.0", "1.1", "2.0"],
  "blocked_event_id": "uuid",
  "http_status": 400
}
```

**Event Emitted:** `EvidenceStateTransitionBlocked`  
**State Change:** None  

---

## READ PROJECTIONS

### Projection 1: CurrentEvidenceState

**Purpose:** Provide current state of Evidence for UI queries  
**Derivation:** Replay all events for `evidence_id`, apply last state  

```json
{
  "evidence_id": "uuid",
  "tenant_id": "string",
  "current_state": "RAW | CLASSIFIED | STRUCTURED | REJECTED",
  "created_at": "ISO 8601 UTC",
  "last_updated_at": "ISO 8601 UTC",
  "last_event_id": "uuid",
  "sequence_number": "integer",
  "is_immutable": true
}
```

**Rebuild:** Replay events from event store, project latest state.

---

### Projection 2: ClassificationHistory

**Purpose:** Show all classifications for an Evidence  
**Derivation:** Filter events by `event_type=EvidenceClassified`  

```json
{
  "evidence_id": "uuid",
  "classifications": [
    {
      "classification_id": "uuid",
      "event_id": "uuid",
      "evidence_type": "string",
      "claimed_scope": "string",
      "claimed_frameworks": ["string"],
      "classifier_id": "email",
      "classifier_role": "string",
      "confidence": "string",
      "timestamp": "ISO 8601 UTC"
    }
  ]
}
```

**Rebuild:** Filter event store, project classification events.

---

### Projection 3: StructuringHistory

**Purpose:** Show all structuring approvals for an Evidence  
**Derivation:** Filter events by `event_type=EvidenceStructured`  

```json
{
  "evidence_id": "uuid",
  "structuring_records": [
    {
      "structured_record_id": "uuid",
      "event_id": "uuid",
      "schema_type": "string",
      "schema_version": "string",
      "extraction_source": "string",
      "approver_id": "email",
      "approver_role": "string",
      "approval_timestamp": "ISO 8601 UTC",
      "supersedes_record_id": "uuid (null if first)"
    }
  ]
}
```

**Rebuild:** Filter event store, project structuring events.

---

### Projection 4: AuditTrail

**Purpose:** Full audit trail for regulators  
**Derivation:** All events for `evidence_id`  

```json
{
  "evidence_id": "uuid",
  "audit_trail": [
    {
      "event_id": "uuid",
      "event_type": "string",
      "actor_id": "email",
      "actor_role": "string",
      "previous_state": "string",
      "new_state": "string",
      "timestamp": "ISO 8601 UTC",
      "command_id": "uuid",
      "sequence_number": "integer"
    }
  ]
}
```

**Rebuild:** Read all events for `evidence_id`, order by `sequence_number`.

---

## AUDIT GUARANTEES

### Guarantee 1: Full Replay by Tenant

**Query:**
```sql
SELECT * FROM events 
WHERE tenant_id = '<tenant_id>' 
ORDER BY timestamp ASC, sequence_number ASC
```

**Result:** Deterministic reconstruction of all Evidence states for tenant.

**Usage:** Regulator requests full tenant history for audit period.

---

### Guarantee 2: Full Replay by Evidence

**Query:**
```sql
SELECT * FROM events 
WHERE evidence_id = '<evidence_id>' 
ORDER BY sequence_number ASC
```

**Result:** Deterministic reconstruction of single Evidence lifecycle.

**Usage:** Regulator traces specific Evidence from creation to current state.

---

### Guarantee 3: Deterministic State Reconstruction

**Algorithm:**
1. Load all events for `evidence_id` ordered by `sequence_number`
2. Initialize state = null
3. For each event:
   - Verify `previous_state` matches current state
   - Apply `new_state`
   - If mismatch, flag corruption
4. Final state = last `new_state`

**Guarantee:** Same event sequence ALWAYS produces same final state.

---

### Guarantee 4: Proof of No Forbidden Transition

**Query:**
```sql
SELECT * FROM events 
WHERE evidence_id = '<evidence_id>' 
  AND (
    (previous_state = 'CLASSIFIED' AND new_state = 'RAW') OR
    (previous_state = 'STRUCTURED' AND new_state = 'RAW') OR
    (previous_state = 'STRUCTURED' AND new_state = 'CLASSIFIED') OR
    (previous_state = 'RAW' AND new_state = 'STRUCTURED')
  )
```

**Result:** Empty set = proof that no forbidden transitions occurred.

**Usage:** Regulator verifies state machine compliance.

---

### Guarantee 5: Actor Accountability

**Query:**
```sql
SELECT actor_id, actor_role, event_type, timestamp 
FROM events 
WHERE evidence_id = '<evidence_id>' 
ORDER BY sequence_number ASC
```

**Result:** Chain of custody showing who did what when.

**Usage:** Regulator establishes accountability for each decision.

---

### Guarantee 6: Idempotency Proof

**Query:**
```sql
SELECT command_id, COUNT(*) as execution_count
FROM events 
WHERE tenant_id = '<tenant_id>'
GROUP BY command_id
HAVING execution_count > 1
```

**Result:** Duplicate `command_id` entries = idempotency validated.

**Usage:** Verify system correctly handles retries and replays.

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Event Store
- [ ] Create `events` table with immutable append-only constraint
- [ ] Implement `sequence_number` auto-increment per `evidence_id`
- [ ] Add composite index on `(evidence_id, sequence_number)`
- [ ] Add index on `(tenant_id, timestamp)`
- [ ] Add index on `(command_id)` for idempotency check

### Phase 2: Command Handlers
- [ ] Implement `ClassifyEvidenceCommandHandler`
- [ ] Implement `ApproveStructuringCommandHandler`
- [ ] Implement `RejectEvidenceCommandHandler`
- [ ] Add idempotency check (duplicate `command_id` detection)
- [ ] Add authorization check (`actor_role` validation)
- [ ] Add payload validation (JSON schema)

### Phase 3: Invariant Enforcement
- [ ] Implement state transition validator
- [ ] Implement authorization validator
- [ ] Implement AI approval validator
- [ ] Implement schema version validator
- [ ] Emit `EvidenceStateTransitionBlocked` on violations

### Phase 4: Projections
- [ ] Build `CurrentEvidenceState` projection
- [ ] Build `ClassificationHistory` projection
- [ ] Build `StructuringHistory` projection
- [ ] Build `AuditTrail` projection
- [ ] Add projection rebuild mechanism

### Phase 5: Audit Queries
- [ ] Implement replay-by-tenant query
- [ ] Implement replay-by-evidence query
- [ ] Implement forbidden-transition detection query
- [ ] Implement actor accountability query
- [ ] Implement idempotency verification query

---

## BACKEND API SPECIFICATION

### Endpoint 1: Submit Command

**POST** `/api/v1/evidence/commands`

**Request:**
```json
{
  "command_id": "uuid",
  "command_type": "ClassifyEvidenceCommand | ApproveStructuringCommand | RejectEvidenceCommand",
  "tenant_id": "string",
  "evidence_id": "string",
  "actor_id": "email",
  "actor_role": "string",
  "declared_intent": "string",
  "issued_at": "ISO 8601 UTC",
  "payload": {}
}
```

**Response (Success - 201 Created):**
```json
{
  "event_id": "uuid",
  "event_type": "EvidenceClassified | EvidenceStructured | EvidenceRejected",
  "evidence_id": "string",
  "previous_state": "string",
  "new_state": "string",
  "timestamp": "ISO 8601 UTC",
  "sequence_number": "integer"
}
```

**Response (Failure - 400/403/409):**
```json
{
  "error_code": "string",
  "error_message": "string",
  "validation_errors": ["string"],
  "blocked_event_id": "uuid",
  "http_status": "integer"
}
```

---

### Endpoint 2: Get Evidence State

**GET** `/api/v1/evidence/{evidence_id}/state`

**Response (200 OK):**
```json
{
  "evidence_id": "uuid",
  "current_state": "RAW | CLASSIFIED | STRUCTURED | REJECTED",
  "last_updated_at": "ISO 8601 UTC",
  "sequence_number": "integer"
}
```

---

### Endpoint 3: Get Event History

**GET** `/api/v1/evidence/{evidence_id}/events`

**Response (200 OK):**
```json
{
  "evidence_id": "uuid",
  "events": [
    {
      "event_id": "uuid",
      "event_type": "string",
      "actor_id": "email",
      "actor_role": "string",
      "previous_state": "string",
      "new_state": "string",
      "timestamp": "ISO 8601 UTC",
      "sequence_number": "integer"
    }
  ]
}
```

---

### Endpoint 4: Replay by Tenant (Admin/Auditor Only)

**GET** `/api/v1/tenants/{tenant_id}/events?start_date=<date>&end_date=<date>`

**Response (200 OK):**
```json
{
  "tenant_id": "string",
  "start_date": "ISO 8601 UTC",
  "end_date": "ISO 8601 UTC",
  "total_events": "integer",
  "events": [
    {
      "event_id": "uuid",
      "evidence_id": "uuid",
      "event_type": "string",
      "actor_id": "email",
      "timestamp": "ISO 8601 UTC"
    }
  ]
}
```

---

## HOSTILE AUDIT RESISTANCE

### Attack Vector 1: Command Replay
**Defense:** Idempotency check via `command_id` tracking  
**Result:** Duplicate commands return cached response, no double-execution  

### Attack Vector 2: State Downgrade
**Defense:** State transition validator rejects forbidden transitions  
**Result:** `EvidenceStateTransitionBlocked` event emitted, no state change  

### Attack Vector 3: Authorization Bypass
**Defense:** Role validator rejects unauthorized `actor_role`  
**Result:** 403 Forbidden + blocked event  

### Attack Vector 4: AI Autonomy
**Defense:** Approval validator requires human `approver_id` for AI suggestions  
**Result:** AI-only structuring rejected  

### Attack Vector 5: Event Tampering
**Defense:** Append-only event store, immutable events  
**Result:** Cannot modify or delete historical events  

### Attack Vector 6: Schema Version Exploit
**Defense:** Schema version registry validation  
**Result:** Unknown versions rejected  

---

## PRODUCTION READINESS CRITERIA

- [ ] Event store supports 10M+ events with <100ms query time
- [ ] Command processing <200ms p99 latency
- [ ] Projection rebuild <5 minutes for 1M events
- [ ] Zero data loss guarantee (append-only)
- [ ] Full audit trail for 7+ years retention
- [ ] Automated idempotency testing (10K duplicate commands)
- [ ] Automated state machine testing (all forbidden transitions)
- [ ] Load testing: 1000 concurrent commands/sec
- [ ] Disaster recovery: rebuild all projections from events

---

**END OF SPECIFICATION**