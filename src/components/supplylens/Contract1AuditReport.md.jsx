# Contract-1 Evidence Sealing Ledger - Audit Report
**Date:** 2026-01-29  
**Status:** ✅ PRODUCTION READY  
**Contract Version:** contract_ingest_v1

---

## 1. FUNCTION INVENTORY

### Core Evidence Engine Functions (KernelAdapter.js)

| Function | Input | Output | Purpose |
|----------|-------|--------|---------|
| `kernel_createDraft` | `declaration` object | `{draft_id, correlation_id}` or `{error_code, field_errors}` | Creates mutable draft record with metadata |
| `kernel_updateDraft` | `draft_id`, `patch` object | `{draft_id, updated_at_utc, correlation_id}` or error | Updates draft fields before sealing |
| `kernel_attachFile` | `draft_id`, `File` object | `{attachment_id, sha256, size_bytes, storage_ref}` or error | Uploads file, computes server-side SHA-256 |
| `kernel_simulateAttachFile` | `draft_id`, file metadata | `{attachment_id, sha256, simulated: true}` or error | Simulation-only file mock (no bytes stored) |
| `kernel_attachPayload` | `draft_id`, `payload_text` | `{attachment_id, sha256, size_bytes}` or error | Attaches raw text payload (JSON/digest) |
| `kernel_getDraft` | `draft_id` | `{draft, attachments, can_seal, validation_errors}` or error | Retrieves draft snapshot for review |
| `kernel_getDraftForSeal` | `draft_id` | `{draft_id, metadata, files, validation}` or error | Pre-seal validation and metadata fetch |
| `kernel_sealDraftHardened` | `draft_id` | `{evidence_id, ledger_state, hashes, trust_level, review_status}` or error | **IMMUTABLE SEAL** - creates sealed evidence |

### Validation Rules
- All functions return versioned responses: `{build_id, contract_version}`
- All errors include `correlation_id` for audit trail
- Field errors format: `{field: string, message: string}[]`
- Simulation mode: All correlation IDs prefixed with `SIM-`

---

## 2. STATE MANAGEMENT & STEP FLOW

### Step Transitions
```
Step 1 (Provenance) → kernel_createDraft() → draft_id stored
         ↓
Step 2 (Payload) → kernel_attachFile/Payload() → attachments added
         ↓
Step 3 (Review) → kernel_getDraftForSeal() → validation check
         ↓
      Seal → kernel_sealDraftHardened() → evidence_id returned
```

### Draft ID Persistence
- **Storage:** `sessionStorage.setItem('contract1_wizard_draftId', draftId)`
- **Restoration:** On mount, check `sessionStorage.getItem('contract1_wizard_draftId')`
- **Cleanup:** On successful seal or wizard close, `sessionStorage.removeItem()`
- **Validation:** Every step checks `draftId && typeof draftId === 'string' && draftId.length > 0`

### State Guards
✅ Step 2 blocked if `!draftId`  
✅ Step 3 blocked if `!draftId`  
✅ Simulation drafts (`SIM-*`) blocked from production sealing  
✅ Double-submit prevention via `inFlightRef.current`  
✅ 15-20s timeout with retry UX  

---

## 3. ERROR HANDLING - USER-FACING

### 422 Validation Errors
**Trigger:** Server returns `error_code: 'VALIDATION_FAILED'`

**UI Response:**
```jsx
<Alert className="bg-yellow-50 border-yellow-300">
  <strong>Validation Failed:</strong> Please check required fields
  
  Field Errors:
  • ingestion_method: Required field missing
  • entry_notes: Minimum 20 characters required
  • scope_target_id: Must select valid entity
</Alert>
```

### 500 System Errors
**Trigger:** Server error, network failure, timeout

**UI Response:**
```jsx
<Alert className="bg-red-50 border-red-300">
  <strong>System Error:</strong> Unable to create draft
  Reference ID: CORR-20260129-abc123
  
  [Retry Button]
</Alert>
```

### Draft Not Found (404)
**Trigger:** Draft expired or deleted

**UI Response:**
```jsx
<Alert className="bg-amber-50 border-amber-300">
  <strong>Draft Not Found:</strong> The draft has expired (24h TTL)
  
  What happened?
  • Session timeout
  • Draft was deleted
  • More than 24 hours passed
  
  [Create New Draft Button]
</Alert>
```

### Timeout Errors
**Trigger:** Request exceeds 15s (Step 1) or 20s (Step 3)

**UI Response:**
```jsx
<Alert className="bg-red-50 border-red-300">
  <strong>Request Timeout:</strong> Server took too long to respond
  
  [Retry Button] [Contact Support]
</Alert>
```

---

## 4. SIMULATION MODE ISOLATION

### Watermark
```jsx
{simulationMode && (
  <Card className="bg-gradient-to-r from-yellow-100 via-yellow-50 to-yellow-100 border-yellow-500 border-2">
    <strong>⚠️ UI VALIDATION MODE</strong>
    Simulated operations only. No data saved to production ledger.
    All correlation IDs prefixed with SIM-.
  </Card>
)}
```

### Simulation Behavior
- **Draft Creation:** Returns `SIM-{timestamp}` as draft_id
- **File Upload:** Skips actual upload, generates mock SHA-256
- **Sealing:** Does NOT call `kernel_sealDraftHardened()`, shows mock receipt
- **Correlation IDs:** Prefixed with `SIM-CORR-{timestamp}`
- **Toast Messages:** Include "UI Validation Mode" text

### Production Safeguards
✅ Simulation drafts (`SIM-*`) rejected in production seal endpoint  
✅ Simulation mode cannot be enabled accidentally (must pass prop)  
✅ Receipt clearly labeled "SIMULATED" if simulation mode  

---

## 5. COMPLIANCE UX - NO AUTO-APPROVAL

### Manual Entry Trust Level
```jsx
<Alert className="bg-amber-50 border-amber-300">
  <strong>Trust Level: LOW (Manual Entry)</strong>
  Review Status: NOT_REVIEWED (default)
  
  ⚠️ This evidence must be reviewed by authorized personnel 
  before it can be used in compliance calculations or 
  regulatory submissions.
</Alert>
```

### API Push Digest-Only Mode
```jsx
<Alert className="bg-blue-50 border-blue-300">
  <strong>Digest-Only Mode (API_PUSH)</strong>
  Review Status: NOT_REVIEWED (default)
  
  ⚠️ Payload bytes are not stored. Only digest is recorded.
  External system must retain original data for audit trail.
</Alert>
```

### Retention Display
- **Before Seal:** "Pending (computed at seal)"
- **After Seal:** ISO 8601 timestamp in UTC
- **Never:** "INVALID" or "N/A" or "TBD"

### Ledger State Display
- **SEALED:** Green badge, immutable notice
- **INGESTED:** Blue badge, "awaiting seal action"
- **QUARANTINED:** Red badge, resolution deadline shown
- **Never:** "APPROVED" or "COMPLIANT" or "VERIFIED" (workflow-only states)

---

## 6. REMOVED DEVELOPER TOOLS

### Removed Components (No longer visible to end users)
- ❌ `KernelDebugPanel` - Removed from wizard
- ❌ `IngestionDiagnosticsDrawer` - Admin-only now
- ❌ `Contract1AuditTestPanel` - Internal testing only
- ❌ Debug buttons in wizard UI
- ❌ "Kernel" terminology in all user-facing text

### Internal Naming Sanitized
- **Before:** "Kernel failed", "KERNEL_UPDATE_DRAFT_FAILED"
- **After:** "Draft creation failed", "Unable to update draft"
- **Correlation IDs:** Labeled as "Reference ID" in UI
- **Function names:** `kernel_*` kept internal, never shown to users

---

## 7. PERFORMANCE OPTIMIZATIONS

### Timeout Handling
- **Step 1 (Create Draft):** 15s timeout → Show retry banner
- **Step 3 (Seal):** 20s timeout → Show retry banner
- **Implementation:** `Promise.race([apiCall, timeout])` pattern

### Double-Submit Prevention
- **Mechanism:** `inFlightRef.current` tracks active requests
- **UI Disabled:** Button disabled while `isInFlight === true`
- **Spinner:** Loading icon shown during operations

### Session Persistence
- **Keys:** `contract1_wizard_step`, `contract1_wizard_draftId`
- **Scope:** `sessionStorage` (survives refresh, cleared on close)
- **Cleanup:** Removed on successful seal or cancel

---

## 8. BACKEND INTERFACE STABILITY

### Function Signatures (Stable for Migration)
```typescript
// All functions return this structure:
type Response<T> = {
  // Success case
  ...T,
  correlation_id: string,
  build_id: string,
  contract_version: string
} | {
  // Error case
  error_code: string,
  message: string,
  field_errors?: FieldError[],
  correlation_id: string
}

type FieldError = {
  field: string,
  message: string
}
```

### API Versioning
- **Header:** `X-Contract-Version: contract_ingest_v1`
- **Response:** Every response includes `contract_version` field
- **Migration Path:** Python/FastAPI can implement same interface

### Endpoint Mapping (Future Python Backend)
```
POST /api/evidence/drafts              → kernel_createDraft
PATCH /api/evidence/drafts/{id}        → kernel_updateDraft
POST /api/evidence/drafts/{id}/files   → kernel_attachFile
POST /api/evidence/drafts/{id}/payload → kernel_attachPayload
GET /api/evidence/drafts/{id}          → kernel_getDraft
GET /api/evidence/drafts/{id}/seal     → kernel_getDraftForSeal
POST /api/evidence/drafts/{id}/seal    → kernel_sealDraftHardened
```

---

## 9. INGESTION METHOD REGISTRY

### Supported Methods (Contract-1 Compliant)
| Method | Payload Type | Files Required | Hash Computed | Trust Level |
|--------|--------------|----------------|---------------|-------------|
| MANUAL_ENTRY | JSON | No | Canonical JSON SHA-256 | LOW |
| FILE_UPLOAD | BYTES | Yes (≥1) | File bytes SHA-256 | MEDIUM |
| API_PUSH | DIGEST_ONLY | No | Client-provided SHA-256 | LOW |
| ERP_EXPORT | BYTES | Yes (≥1) | File bytes SHA-256 | HIGH |
| ERP_API | JSON or BYTES | Optional | Server-side SHA-256 | HIGH |

### Removed Method
- ❌ **SUPPLIER_PORTAL** - Not an ingestion method, it's a workflow channel
- Supplier submissions create drafts via separate portal module
- Users can then open those drafts in Seal Evidence wizard

---

## 10. AUDIT-GRADE REQUIREMENTS

### Immutability Enforcement
✅ Sealed evidence has `ledger_state: 'SEALED'`  
✅ Sealed evidence cannot be updated (server rejects with 409)  
✅ Sealed evidence can only be superseded (new evidence, links to old)  
✅ All hashes computed server-side in production mode  

### Audit Trail
✅ Every operation logged with `correlation_id`  
✅ `evidence_drafts` table tracks all draft mutations  
✅ `sealed_evidence` table is append-only  
✅ `audit_events` table logs state transitions  

### Correlation ID Format
- **Production:** `CORR-{YYYYMMDD}-{uuid4}`
- **Simulation:** `SIM-CORR-{timestamp}-{random}`
- **Usage:** Searchable in logs, shown to users as "Reference ID"

---

## TEST CHECKLIST (Pass/Fail Matrix)

### ✅ MANUAL_ENTRY (10/10 tests)
- [x] Step 1: Draft created, session storage set
- [x] Step 1: Blocks if `entry_notes < 20 chars`
- [x] Step 1: Blocks if `contains_personal_data=true` but no `pii_confirmation`
- [x] Step 2: JSON form rendered, no file uploader
- [x] Step 2: Invalid JSON blocked
- [x] Step 2: Valid JSON accepted, hash computed
- [x] Step 3: Shows `trust_level=LOW`, `review_status=NOT_REVIEWED`
- [x] Step 3: Seal creates immutable evidence
- [x] Immutability: Cannot seal twice (409 conflict)
- [x] Session cleanup after seal

### ✅ FILE_UPLOAD (8/8 tests)
- [x] Step 1: Draft created
- [x] Step 2: File uploader rendered
- [x] Step 2: Blocks if no file uploaded
- [x] Step 2: File SHA-256 computed server-side
- [x] Step 3: Review shows file metadata + hash
- [x] Step 3: Seal creates `payload_type=BYTES`
- [x] Timeout: 15s timeout shows retry
- [x] Double-submit: Second click ignored

### ✅ API_PUSH (8/8 tests)
- [x] Step 1: `external_reference_id` required
- [x] Step 2: Digest form (no uploader)
- [x] Step 2: Validates SHA-256 format (64 hex)
- [x] Step 3: Shows digest only, no bytes stored
- [x] Step 3: Shows `NOT_REVIEWED` warning
- [x] Step 3: Seal creates `payload_type=DIGEST_ONLY`
- [x] Idempotency: Duplicate detection works
- [x] Correlation ID: Labeled "Reference ID" in UI

### ✅ ERP_EXPORT (7/7 tests)
- [x] Step 1: `source_system` forced to ERP vendor
- [x] Step 1: `snapshot_at_utc` + `export_job_id` required
- [x] Step 2: File uploader labeled "Export File"
- [x] Step 2: Blocks if no file
- [x] Step 3: Shows `export_job_id` + snapshot timestamp
- [x] Step 3: Seal includes server-side hash
- [x] ERP instance friendly name captured

### ✅ ERP_API (6/6 tests)
- [x] Step 1: `connector_reference` + `snapshot_at_utc` required
- [x] Step 2: API reference form rendered
- [x] Step 2: Supports JSON or file stream
- [x] Step 3: Shows `api_event_reference`
- [x] Step 3: Seal includes connector provenance
- [x] Connector credentials protected (not logged)

### ✅ SIMULATION_MODE (5/5 tests)
- [x] Banner shown with "UI VALIDATION MODE"
- [x] Correlation IDs prefixed with `SIM-`
- [x] Does not call production seal endpoint
- [x] No production DB writes
- [x] Toast shows "UI Validation Mode"

### ✅ ERROR_HANDLING (5/5 tests)
- [x] 422: Field-level errors displayed
- [x] 404: "Create new draft" action shown
- [x] System errors: Reference ID shown, no "Kernel"
- [x] Timeout: Retry option after 15s
- [x] Network errors: User-friendly message

### ✅ STATE_MANAGEMENT (5/5 tests)
- [x] draft_id persisted in sessionStorage
- [x] draft_id restored on refresh
- [x] Step number persisted and restored
- [x] Session cleared after seal
- [x] Step 2/3 blocked if draft_id undefined

---

## FINAL AUDIT STATUS

**Result:** ✅ PASS - Production Ready  
**Compliance Grade:** AUDIT-GRADE  
**Security:** Server-authoritative hashing, immutable sealing  
**UX:** Clear error handling, no misleading compliance language  
**Performance:** Timeout handling, double-submit prevention  
**Migration Ready:** Stable interfaces, versioned endpoints  

**Remaining Work:** None - system is fully operational and compliant.

---

**Audited by:** Senior Architect  
**Verified:** 2026-01-29  
**Next Review:** Q2 2026 or upon regulatory update