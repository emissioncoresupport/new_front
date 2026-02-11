# SupplyLens Ingestion Surfaces Contract

**Version:** 1.0  
**Date:** 2026-01-20  
**Status:** CANONICAL — All ingestion must conform to this contract

---

## Core Principle

**All ingestion creates EVIDENCE. Nothing else.**

No ingestion path may:
- Create canonical suppliers
- Create products
- Modify existing data
- Bypass Evidence Vault rules

---

## Ingestion Surfaces (Locked)

Exactly five ingestion surfaces are defined:

### 1. MANUAL UPLOAD

**Intended user:** Internal compliance, supply-chain, sustainability teams

**Capabilities:**
- Upload single file (PDF, XLS, CSV, DOC, ZIP)
- Add optional description and tags

**Hard limits:**
- Max file size: 500 MB
- One Evidence per upload

**Output:**
- `Evidence.state = RAW`
- `source_type = manual`
- `ingestion_surface = manual_upload`

---

### 2. BULK FILE UPLOAD

**Intended user:** Power users, onboarding teams

**Capabilities:**
- Upload multiple files in batch
- Zip unpacking allowed
- Batch tagging

**Rules:**
- Each file creates its OWN Evidence record
- No aggregation into one record
- Partial failures allowed and logged
- Max 50 files per batch

**Output:**
- `Evidence.state = RAW`
- `source_type = manual`
- `ingestion_surface = bulk_upload`

---

### 3. ERP DECLARATION (METADATA-ONLY)

**Intended use:** SAP, Oracle, Dynamics, Odoo declarations

**IMPORTANT:** This is NOT an API execution layer.

**Capabilities:**
- Declare that data exists in ERP
- Upload exported files or snapshots
- Store ERP metadata (system name, export date, table, query)

**Rules:**
- No live API calls
- No background sync
- No delta logic
- File OR payload required

**Output:**
- Evidence with attached file or payload
- `source_type = ERP`
- `ingestion_surface = erp_declaration`
- ERP metadata stored in Evidence payload

---

### 4. SUPPLIER SUBMISSION

**Intended use:** External suppliers responding to requests

**Capabilities:**
- Upload files via token-based portal
- Fill structured forms (still Evidence-backed)
- Multiple documents per submission

**Rules:**
- Supplier NEVER sees internal mapping
- Supplier NEVER creates canonical data
- Every submission is new Evidence
- Token-based, time-limited access

**Output:**
- `Evidence.state = RAW`
- `source_type = supplier`
- `ingestion_surface = supplier_submission`
- `received_at` timestamp required (supplier submission date)

---

### 5. API / SYSTEM INGESTION

**Intended use:** Advanced integrations, data pipelines, webhooks

**Capabilities:**
- Authenticated POST to Evidence ingestion endpoint
- Idempotent via hash-based deduplication
- Rate-limited per tenant
- Webhook receivers

**Rules:**
- Append-only
- Idempotent (hash-based)
- Rate-limited (100 requests/min per tenant)
- Authenticated per tenant
- No privileged behavior

**Output:**
- Evidence created exactly as other surfaces
- `source_type = manual` or explicit `source_type`
- `ingestion_surface = api_ingestion`

---

## Common Ingestion Rules (Apply to All)

For every ingestion surface:

### Output MUST be:
- One or more Evidence records
- Each with cryptographic hash (SHA-256 min)
- Server-side timestamps (UTC)
- Immutable once created

### Evidence MUST include:
- `source_type`
- `ingestion_surface`
- `created_by` or `source_identity`
- `uploaded_at` (server-side)
- `hashed_at` (server-side)
- `file_hash_sha256`

### Ingestion MUST FAIL if:
- File cannot be stored
- Hash cannot be computed
- Tenant context is missing
- Authentication fails

### Ingestion MUST NOT:
- Parse data into canonical fields
- Auto-structure evidence
- Infer suppliers or products
- Modify existing Evidence
- Create suppliers or products as side effect

---

## AI Usage (Strict)

**AI MAY:**
- Classify document type
- Suggest entity scope (SUPPLIER, SITE, SKU, etc.)
- Flag potential duplicates via hash similarity
- Extract candidate fields for review

**AI MAY NOT:**
- Approve ingestion
- Change Evidence state automatically
- Create or update canonical data
- Modify Evidence post-ingestion

All AI output must be labeled: **"SUGGESTION — NOT APPLIED"**

---

## Audit & Compliance Alignment

All ingestion MUST be defensible under:
- CSRD assurance (documented trail)
- CBAM audits (immutable records)
- EUDR checks (chain of custody)
- GDPR Articles 5, 6, 30 (data integrity)

Every ingestion logged to `AuditLogEntry` with:
- Event type (EVIDENCE_UPLOADED, EVIDENCE_INGESTED, etc.)
- Actor (user or system)
- Timestamp (UTC)
- Result (SUCCESS/FAILURE)

---

## Developer Console Entry (Mandatory)

**Title:** SupplyLens Ingestion Surfaces Contract  
**Severity:** CRITICAL  
**Description:**  
"All data entry into SupplyLens occurs via five defined ingestion surfaces that create immutable Evidence. No ingestion path may bypass the Evidence Vault. Each surface is locked: Manual Upload, Bulk Upload, ERP Declaration, Supplier Submission, API Ingestion."

---

## Acceptance Criteria

This contract is COMPLETE when:
- ✅ Five ingestion surfaces explicitly defined
- ✅ All common rules locked
- ✅ All future ingestion logic references this contract
- ✅ Developer Console entry created
- ✅ No ingestion logic exists outside this scope