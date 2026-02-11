# Contract 1 Evidence Sealing UI/UX — Acceptance Report

**Date:** 2026-01-28  
**Version:** Regulator-Grade Compliance UI  
**Status:** ✅ COMPLETE

---

## 0. Non-Negotiables ✅

- ✅ **No "Kernel" in UI** — Renamed to "Evidence Engine" and "System Diagnostics" (dev-only)
- ✅ **No "AUTO_APPROVED"** — All instances replaced with "PENDING_REVIEW"
- ✅ **No "INVALID" retention** — Shows "Pending (calculated at seal)" before sealing
- ✅ **422 for validation failures** — Never 500 for user-correctable issues, field-level errors with correlation IDs

---

## 1. UI Validation Mode ✅

### ON (Simulation):
- ✅ File bytes NOT stored
- ✅ No ledger record created
- ✅ Deterministic simulated hash generated
- ✅ All IDs prefixed with `SIM_`
- ✅ Seal button disabled: "Sealing disabled in UI Validation Mode"
- ✅ Clear banner: "UI Validation Mode: No evidence stored. No ledger event created. Hash shown is test only and not audit evidence."
- ✅ Persisted in localStorage (browser session only)

### OFF (Production):
- ✅ Real upload and seal
- ✅ Upload failures show correlation ID + "Retry" + "Switch to UI Validation Mode to preview Step 3"

---

## 2. Step 1 Field Labels ✅

**Fixed labels:**
- ✅ "Evidence Type" (not Dataset Type or Evidence Category)
- ✅ "Business Object Scope" (not Declared Scope)
- ✅ Source System auto-locked for Manual Entry as "Internal Manual"

**Required fields:**
1. ✅ Ingestion Method
2. ✅ Source System (enforced by method)
3. ✅ Evidence Type (lean list)
4. ✅ Business Object Scope
5. ✅ Scope Target (entity selector when needed)
6. ✅ Why this evidence (min 20 chars, no placeholders)
7. ✅ Purpose Tags (min 1)
8. ✅ Retention Policy (STANDARD_1_YEAR, STANDARD_7_YEARS, CONTRACTUAL, REGULATORY, CUSTOM)
9. ✅ Contains Personal Data? (Yes/No)

---

## 3. Evidence Type List (Lean) ✅

**Contract 1 types (sufficient for CBAM, PCF/LCA, CSRD):**
1. ✅ SUPPLIER_MASTER
2. ✅ PRODUCT_MASTER
3. ✅ BOM
4. ✅ TRANSACTION_LOG
5. ✅ CERTIFICATE
6. ✅ TEST_REPORT
7. ✅ INVOICE
8. ✅ OTHER

---

## 4. Step 2 Method-Specific Behavior ✅

### File Upload:
- ✅ Requires ≥1 file
- ✅ Shows: filename, size, content type, server SHA-256 (or simulated hash)
- ✅ Upload failure: Shows correlation ID + "Retry" + "Switch to UI Validation Mode"

### Manual Entry:
- ✅ No "upload file" mentions
- ✅ Header: "Step 2: Payload" with "Enter Data" section
- ✅ Warning: "Manual entry is an attestation. This data will be sealed with LOW trust and requires review before use in calculations."
- ✅ "Files: 0 expected for MANUAL_ENTRY" shown as positive confirmation

---

## 5. Step 3 Always Reachable ✅

### Production Mode:
- ✅ Calls server draft verification
- ✅ Shows: Draft ID, scope binding, file list (FILE_UPLOAD) or payload summary (MANUAL_ENTRY)
- ✅ Displays computed hashes if available
- ✅ 422 failures show field errors with back links

### UI Validation Mode:
- ✅ Full UI shown
- ✅ All hashes labeled "simulated test hash"
- ✅ Seal button disabled: "Sealing disabled in UI Validation Mode"
- ✅ Shows "UI Ready: YES (simulation)" not "ready to seal: YES"

---

## 6. Fixed Broken States ✅

### A) File Upload Simulation:
- ✅ Simulated file treated as attachment for UI purposes
- ✅ No "attachments required" error if simulated file present

### B) Manual Entry 500 Errors:
- ✅ Replaced with proper status codes:
  - 422 if user correctable
  - 409 if immutable conflict
  - 403 if tenant/permission
  - 500 only for true internal errors with message: "Sealing not available in this environment"
- ✅ UI Validation Mode shows: "Simulated Result, No Ledger Record Created"

---

## 7. Debug Panels Hidden ✅

- ✅ "Kernel Debug Panel" removed from normal UI
- ✅ Renamed to "System Diagnostics"
- ✅ Only shown with `?debug=1` query param + developer role
- ✅ Internal identifiers hidden unless debug enabled

---

## 8. Acceptance Criteria ✅

### File Upload:
- ✅ UI Validation Mode: Select file → see simulated hash → reach Step 3 → review all UI (no blocking errors)
- ✅ Production Mode: Upload works OR fails cleanly with correlation ID and clear guidance

### Manual Entry:
- ✅ Step 2 is payload form, not file-oriented
- ✅ Step 3 does NOT show "no files attached" as error
- ✅ Seal failures never show 500 for validation issues

### Wording:
- ✅ No "Kernel" in user-facing UI
- ✅ No "AUTO_APPROVED" compliance statements
- ✅ No "INVALID retention"
- ✅ All banners clarify audit evidence vs UI simulation

---

## Server Contract Preserved ✅

- ✅ Same payload fields maintained
- ✅ Correlation ID discipline enforced
- ✅ DTOs remain compatible for future FastAPI migration
- ✅ Method rules matrix implemented server-side (kernelGetDraftForSeal)

---

**Conclusion:** Contract 1 UI/UX is production-ready with regulator-grade deterministic behavior, safe UI validation mode, and zero contradictory requirements.