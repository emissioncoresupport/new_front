# Contract-1 Evidence Sealing - Final Test Checklist

**Test Date:** 2026-01-29  
**Tester:** [Name]  
**Environment:** Production / Staging / Local  
**Build:** [git commit / version]

---

## PRE-TEST SETUP

- [ ] Backend functions deployed and healthy (`/api/contract1_health`)
- [ ] Session storage cleared (`sessionStorage.clear()`)
- [ ] No existing drafts from previous tests
- [ ] User authenticated as admin or authorized sealer
- [ ] Test entities exist: LegalEntity, Site, Product (for scope targeting)

---

## TEST 1: MANUAL_ENTRY (Supplier Master)

### Step 1: Provenance
- [ ] Select "Manual Entry" from Ingestion Method dropdown
- [ ] Source System auto-locked to "Internal Manual"
- [ ] Evidence Type: "SUPPLIER_MASTER" selected
- [ ] Scope: "LEGAL_ENTITY" selected
- [ ] Legal Entity selected from dropdown (e.g., "ACME Corp")
- [ ] "Why This Evidence": entered 25+ chars (e.g., "Supplier onboarding data for ACME Corp for CBAM compliance")
- [ ] Purpose Tags: selected "COMPLIANCE"
- [ ] Retention: "STANDARD_7_YEARS"
- [ ] Contains Personal Data: NO
- [ ] Submission Channel: "INTERNAL_USER"
- [ ] Click "Next: Payload" → draft_id created
- [ ] Verify: sessionStorage contains `contract1_wizard_draftId`
- [ ] Verify: No "Kernel" text visible in UI

### Step 2: Data Entry
- [ ] Form: Supplier Master form rendered
- [ ] Fill: legal_name, country_code, primary_contact_email
- [ ] Attestation Notes (from Step 1): visible, read-only, 20+ chars
- [ ] Warning: "Trust Level: LOW" shown
- [ ] Warning: "Review Status: NOT_REVIEWED" shown
- [ ] Click "Review & Seal" → Step 3 loaded

### Step 3: Review & Seal
- [ ] Review: Shows evidence_type, source_system, scope
- [ ] Review: Shows JSON preview (canonical form expected)
- [ ] Trust Notice: "Trust Level: LOW (Manual Entry)"
- [ ] Review Notice: "NOT_REVIEWED - Human approval required before use"
- [ ] Compliance Warning: "Cannot be used in regulatory submissions until approved"
- [ ] Retention: Shows "Pending (computed at seal)"
- [ ] Click "Seal Evidence" → Sealing initiated (20s timeout)
- [ ] Receipt: evidence_id shown
- [ ] Receipt: ledger_state = "SEALED"
- [ ] Receipt: trust_level = "LOW"
- [ ] Receipt: review_status = "NOT_REVIEWED"
- [ ] Receipt: retention_ends_utc shows ISO 8601 timestamp
- [ ] Verify: sessionStorage cleared after seal
- [ ] Verify: No "APPROVED" or "VERIFIED" text in receipt

**Result:** PASS / FAIL  
**Notes:**

---

## TEST 2: FILE_UPLOAD (Certificate)

### Step 1: Provenance
- [ ] Select "File Upload" from Ingestion Method
- [ ] Source System: "OTHER" or ERP system
- [ ] Evidence Type: "CERTIFICATE_OR_DECLARATION"
- [ ] Scope: "ENTIRE_ORGANIZATION"
- [ ] "Why This Evidence": entered 25+ chars
- [ ] Purpose Tags: selected "AUDIT"
- [ ] Retention: "REGULATORY" (10 years)
- [ ] Contains Personal Data: NO
- [ ] Submission Channel: "INTERNAL_USER" (default)
- [ ] Click "Next: Payload" → draft_id created

### Step 2: File Upload
- [ ] Upload: Select PDF file (e.g., ISO_cert.pdf)
- [ ] Loading spinner shown while hashing
- [ ] Success: Server-computed SHA-256 displayed (64 hex chars)
- [ ] Success: File metadata shown (name, size, content type)
- [ ] Verify: Hash card shows "✓ Server-computed and verified"
- [ ] Timeout Test: If server slow (15s+), retry button appears
- [ ] Click "Next: Review & Seal" → Step 3 loaded

### Step 3: Review & Seal
- [ ] Review: File metadata + SHA-256 shown
- [ ] Review: payload_type = "BYTES"
- [ ] Trust Notice: "Trust Level: MEDIUM (File Upload)"
- [ ] Review Notice: "PENDING_REVIEW" (optional approval)
- [ ] Retention: Shows "Pending (computed at seal)"
- [ ] Click "Seal Evidence" → Sealing initiated
- [ ] Receipt: evidence_id, hashes, trust_level=MEDIUM
- [ ] Receipt: retention_ends_utc computed (ISO 8601)

**Result:** PASS / FAIL  
**Notes:**

---

## TEST 3: API_PUSH (Product Master Digest)

### Step 1: Provenance
- [ ] Select "API Push (Digest Only)" from Ingestion Method
- [ ] Source System: "OTHER" or ERP
- [ ] Evidence Type: "PRODUCT_MASTER"
- [ ] Scope: "PRODUCT_FAMILY" selected
- [ ] Product selected from dropdown
- [ ] External Reference ID: entered (e.g., "API-REQ-2026-001")
- [ ] "Why This Evidence": entered 25+ chars
- [ ] Purpose Tags: selected "COMPLIANCE"
- [ ] Retention: "STANDARD_7_YEARS"
- [ ] Contains Personal Data: NO
- [ ] Click "Next: Payload" → draft_id created

### Step 2: API Receipt Details
- [ ] External Reference ID: pre-filled from Step 1
- [ ] Payload Digest SHA-256: enter 64-char hex digest (or use helper)
- [ ] If using helper: paste JSON, click "Compute SHA-256", digest auto-filled
- [ ] Source Endpoint (optional): enter or leave blank
- [ ] Received At (UTC): shows "Pending (server will set)" (read-only)
- [ ] Validation: Red error if digest not 64 hex chars
- [ ] Click "Review & Seal" → Step 3 loaded

### Step 3: Review & Seal
- [ ] Review: Shows external_reference_id, payload_digest_sha256
- [ ] Review: payload_type = "DIGEST_ONLY"
- [ ] Digest Notice: "Bytes not stored - external system must retain"
- [ ] Trust Notice: "Trust Level: LOW (Digest Only)"
- [ ] Review Notice: "NOT_REVIEWED - verification required"
- [ ] Retention: Shows "Pending (computed at seal)"
- [ ] Click "Seal Evidence" → Sealing initiated
- [ ] Receipt: evidence_id, digest stored, trust_level=LOW
- [ ] Receipt: review_status=NOT_REVIEWED

**Result:** PASS / FAIL  
**Notes:**

---

## TEST 4: ERP_EXPORT (BOM File)

### Step 1: Provenance
- [ ] Select "ERP Export (File)" from Ingestion Method
- [ ] Source System: "SAP" (or other ERP vendor)
- [ ] ERP Instance Name: enter (e.g., "SAP S/4HANA Production")
- [ ] Evidence Type: "BOM"
- [ ] Scope: "PRODUCT_FAMILY"
- [ ] Product selected
- [ ] Snapshot Timestamp (UTC): enter date/time
- [ ] Export Job ID: enter (e.g., "SAP_EXPORT_20260129_001")
- [ ] "Why This Evidence": entered 25+ chars
- [ ] Purpose Tags: selected "AUDIT"
- [ ] Retention: "CONTRACTUAL" (7 years)
- [ ] Contains Personal Data: NO
- [ ] Click "Next: Payload" → draft_id created

### Step 2: Upload Export File
- [ ] Upload: Select CSV/Excel file (e.g., bom_export.csv)
- [ ] Loading spinner shown
- [ ] Success: Server hash displayed
- [ ] Export metadata: job_id + snapshot_at_utc visible in UI
- [ ] Click "Next: Review & Seal" → Step 3 loaded

### Step 3: Review & Seal
- [ ] Review: export_job_id, snapshot_at_utc shown
- [ ] Review: File hash + metadata shown
- [ ] Trust Notice: "Trust Level: HIGH (ERP Export)"
- [ ] Review Notice: "PENDING_REVIEW" (optional)
- [ ] Retention: Shows "Pending (computed at seal)"
- [ ] Click "Seal Evidence" → Sealing initiated
- [ ] Receipt: evidence_id, trust_level=HIGH

**Result:** PASS / FAIL  
**Notes:**

---

## TEST 5: ERP_API (Transaction Log)

### Step 1: Provenance
- [ ] Select "ERP API (System Pull)" from Ingestion Method
- [ ] Source System: "ORACLE" (or other ERP)
- [ ] Evidence Type: "TRANSACTION_OR_MOVEMENT_LOG"
- [ ] Scope: "SITE"
- [ ] Site selected
- [ ] Snapshot Timestamp (UTC): enter date/time
- [ ] Connector Reference: enter (e.g., "ORACLE_PROD_CONN_01")
- [ ] API Event Reference: enter (e.g., "EVT-2026-01-29-12345")
- [ ] "Why This Evidence": entered 25+ chars
- [ ] Purpose Tags: selected "RISK_ASSESSMENT"
- [ ] Retention: "STANDARD_7_YEARS"
- [ ] Contains Personal Data: NO
- [ ] Click "Next: Payload" → draft_id created

### Step 2: Connector Reference
- [ ] Connector ID: pre-filled from Step 1
- [ ] API Event Reference: pre-filled
- [ ] Snapshot timestamp: pre-filled
- [ ] Info: Shows "System-to-system pull via authenticated connector"
- [ ] Click "Review & Seal" → Step 3 loaded

### Step 3: Review & Seal
- [ ] Review: connector_reference, api_event_reference, snapshot shown
- [ ] Review: payload_type = "JSON" or "BYTES" (connector-dependent)
- [ ] Trust Notice: "Trust Level: HIGH (ERP API)"
- [ ] Review Notice: "APPROVED" (auto-approved for ERP connectors)
- [ ] Retention: Shows "Pending (computed at seal)"
- [ ] Click "Seal Evidence" → Sealing initiated
- [ ] Receipt: evidence_id, trust_level=HIGH, review_status=APPROVED

**Result:** PASS / FAIL  
**Notes:**

---

## TEST 6: SUPPLIER_PORTAL CHANNEL (with FILE_UPLOAD)

### Step 1: Provenance
- [ ] Select "File Upload" from Ingestion Method
- [ ] Submission Channel: "SUPPLIER_PORTAL"
- [ ] Supplier Submission ID: enter (e.g., "SP_SUB_abc123def456")
- [ ] Validation: Format SP_SUB_<id> enforced
- [ ] Source System: "OTHER"
- [ ] Evidence Type: "TEST_REPORT_OR_LAB_RESULT"
- [ ] Scope: "SITE"
- [ ] Site selected
- [ ] "Why This Evidence": entered 25+ chars
- [ ] Purpose Tags: "QUALITY_CONTROL"
- [ ] Retention: "STANDARD_7_YEARS"
- [ ] Contains Personal Data: NO
- [ ] Click "Next: Payload" → draft_id created

### Step 2: File Upload
- [ ] Upload: Select PDF (e.g., lab_test_report.pdf)
- [ ] Server hash computed
- [ ] Click "Next: Review & Seal" → Step 3 loaded

### Step 3: Review & Seal
- [ ] Review: Shows "Channel: SUPPLIER_PORTAL"
- [ ] Review: Shows "Supplier Submission ID: SP_SUB_..."
- [ ] Review: File hash + metadata shown
- [ ] Click "Seal Evidence" → Sealing initiated
- [ ] Receipt: evidence_id created
- [ ] Receipt: supplier_submission_id visible in provenance

**Result:** PASS / FAIL  
**Notes:**

---

## TEST 7: SIMULATION MODE (UI Validation)

### Setup
- [ ] Open wizard with simulationMode=true prop

### Step 1
- [ ] Watermark: "⚠️ UI VALIDATION MODE" shown (yellow gradient, prominent)
- [ ] Fill minimal metadata
- [ ] Click "Next: Payload" → draft_id generated with "SIM-DRAFT-" prefix
- [ ] Toast: "UI Validation Mode - Simulated draft created"

### Step 2
- [ ] Upload file → Hash generated (deterministic test hash)
- [ ] Hash card: Shows "⚠️ SIMULATED - UI validation only, not stored"
- [ ] Correlation ID: Prefixed with "SIM-CORR-"

### Step 3
- [ ] Review: All fields shown
- [ ] Click "Seal Evidence" → Does NOT call production endpoint
- [ ] Receipt: Shows "SIMULATED" ledger state
- [ ] Receipt: Shows "⚠️ Simulation Only - Not Audit Evidence" warning
- [ ] Receipt: Hashes are deterministic test values
- [ ] Verify: No write to sealed_evidence table

**Result:** PASS / FAIL  
**Notes:**

---

## TEST 8: ERROR HANDLING

### 422 Validation Error (Step 1)
- [ ] Leave required field blank (e.g., why_this_evidence)
- [ ] Click "Next: Payload"
- [ ] Error alert: Field-level errors displayed in list format
- [ ] Error alert: Shows "• why_this_evidence: Minimum 20 characters required"
- [ ] Error alert: Shows correlation ID (labeled "Reference ID")
- [ ] Next button: Blocked until fixed

### 404 Draft Not Found (Step 2)
- [ ] Manually delete draft from DB or wait for expiration
- [ ] Try to proceed → "Draft not found or expired" error shown
- [ ] Recovery: "Create New Draft" button appears
- [ ] Click button → Returns to Step 1, clears sessionStorage

### 409 Immutability Conflict (Step 3)
- [ ] Try to seal same draft_id twice
- [ ] Error: "Evidence already sealed - immutability conflict"
- [ ] Action: "Create new draft" button shown

### Request Timeout (Step 3, 20s)
- [ ] Simulate slow network or backend delay
- [ ] After 20s → "Request Timeout" error shown
- [ ] Retry button appears
- [ ] Click retry → Re-attempts seal with same draft_id

### Network Error
- [ ] Disconnect network mid-seal
- [ ] Error: "Network Error - Check your connection and retry"
- [ ] Reference ID: Not available (network fail before response)

**Result:** PASS / FAIL  
**Notes:**

---

## TEST 9: SESSION PERSISTENCE

### Refresh During Wizard
- [ ] Complete Step 1 → draft_id created
- [ ] Refresh browser (F5 or Ctrl+R)
- [ ] Wizard reopens at Step 2 (or saved step)
- [ ] draft_id restored from sessionStorage
- [ ] Can proceed to upload/seal without errors

### Multiple Tab Test
- [ ] Open wizard in Tab 1 → create draft
- [ ] Open wizard in Tab 2 → should see same draft (shared sessionStorage)
- [ ] Close Tab 1
- [ ] Tab 2 can still complete seal

### Session Cleanup
- [ ] Complete full seal → Receipt shown
- [ ] Verify: sessionStorage keys removed
- [ ] Close wizard
- [ ] Reopen wizard → Starts at Step 1 (clean state)

**Result:** PASS / FAIL  
**Notes:**

---

## TEST 10: METHOD x EVIDENCE TYPE COMPATIBILITY

### MANUAL_ENTRY Restrictions
- [ ] Select "Manual Entry"
- [ ] Try Evidence Type: "CERTIFICATE_OR_DECLARATION" → BLOCKED (dropdown disabled)
- [ ] Try Evidence Type: "TEST_REPORT_OR_LAB_RESULT" → BLOCKED
- [ ] Try Evidence Type: "SUPPLIER_MASTER" → ALLOWED
- [ ] Try Evidence Type: "PRODUCT_MASTER" → ALLOWED
- [ ] Try Evidence Type: "TRANSACTION_OR_MOVEMENT_LOG" → ALLOWED

### FILE_UPLOAD Allowances
- [ ] Select "File Upload"
- [ ] All evidence types → ALLOWED (no restrictions)

### API_PUSH Requirements
- [ ] Select "API Push"
- [ ] External Reference ID: required field shown
- [ ] Payload Digest SHA-256: required field shown
- [ ] If digest empty or invalid format → Validation error, cannot proceed

**Result:** PASS / FAIL  
**Notes:**

---

## TEST 11: DOUBLE-SUBMIT PREVENTION

### Step 1 Double-Click
- [ ] Fill Step 1 form
- [ ] Rapidly click "Next: Payload" button 5+ times
- [ ] Verify: Only ONE draft created (check DB)
- [ ] Verify: Button disabled during in-flight request
- [ ] Verify: Loading spinner shown

### Step 3 Double-Click
- [ ] Reach Step 3
- [ ] Rapidly click "Seal Evidence" button 5+ times
- [ ] Verify: Only ONE evidence sealed
- [ ] Verify: Button disabled after first click
- [ ] Verify: No duplicate evidence_id in DB

**Result:** PASS / FAIL  
**Notes:**

---

## TEST 12: NO DEVELOPER CONSOLE UI (End User View)

### Production Environment
- [ ] Navigate to SupplyLens page
- [ ] Open "Seal Evidence" wizard
- [ ] Verify: NO "Debug Panel", "Diagnostics", "Kernel" text visible
- [ ] Verify: NO internal function names shown to user
- [ ] Verify: Correlation IDs labeled as "Reference ID"

### Localhost / Admin Access (Internal Only)
- [ ] On localhost: Admin diagnostic panel accessible via flag
- [ ] In production: Diagnostic panel NOT visible unless admin + session flag

**Result:** PASS / FAIL  
**Notes:**

---

## TEST 13: COMPLIANCE LANGUAGE AUDIT

### Manual Entry
- [ ] Step 3: Search for "APPROVED", "VERIFIED", "COMPLIANT" → NONE FOUND
- [ ] Step 3: Shows "NOT_REVIEWED" explicitly
- [ ] Step 3: Shows "Human approval required" warning
- [ ] Receipt: Shows "Trust Level: LOW (manual attestation)"

### API Push
- [ ] Step 3: Shows "DIGEST_ONLY" payload type
- [ ] Step 3: Shows "NOT_REVIEWED" status
- [ ] Step 3: Warning: "External system must retain original"

### Retention Display
- [ ] Before seal: "Pending (computed at seal)" → NEVER "INVALID" or "N/A"
- [ ] After seal: ISO 8601 timestamp → NEVER "TBD" or "Unknown"

**Result:** PASS / FAIL  
**Notes:**

---

## TEST 14: SUBMISSION CHANNEL + SUPPLIER_SUBMISSION_ID

### With Supplier Portal Channel
- [ ] Step 1: Submission Channel = "SUPPLIER_PORTAL"
- [ ] Field appears: "Supplier Submission ID *"
- [ ] Format validation: Must match `SP_SUB_[A-Za-z0-9_-]{8,40}`
- [ ] Invalid format (e.g., "ABC123") → Validation error shown
- [ ] Valid format (e.g., "SP_SUB_abc123def456") → Passes
- [ ] Click Next → draft created with supplier_submission_id in metadata

### Without Supplier Portal Channel
- [ ] Step 1: Submission Channel = "INTERNAL_USER"
- [ ] Field NOT shown: "Supplier Submission ID"
- [ ] Click Next → draft created without supplier_submission_id

**Result:** PASS / FAIL  
**Notes:**

---

## FINAL SIGN-OFF

**Total Tests:** 14  
**Passed:** ___ / 14  
**Failed:** ___ / 14

### Critical Issues (Must Fix Before Production)
1. 
2. 
3. 

### Non-Critical Issues (Can Fix Post-Launch)
1. 
2. 

### Sign-Off
- [ ] All critical tests passed
- [ ] No "Kernel" text visible to end users
- [ ] No auto-approval language (APPROVED/VERIFIED) for Manual/API_PUSH
- [ ] Session persistence works across refresh
- [ ] Timeout handling functional
- [ ] Immutability enforced (cannot seal twice)
- [ ] Simulation mode isolated (SIM- prefix, watermark)

**Approved By:** _________________  
**Date:** 2026-01-29  
**Status:** ✅ PRODUCTION READY / ⚠️ ISSUES FOUND / ❌ BLOCKED