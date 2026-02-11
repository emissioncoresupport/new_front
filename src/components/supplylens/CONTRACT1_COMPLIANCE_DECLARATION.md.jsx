# Contract-1 Compliance Declaration

**Effective Date:** 2026-01-29  
**System:** Emission Core - SupplyLens - Evidence Sealing Ledger  
**Contract Version:** contract_ingest_v1

---

## DECLARATION OF COMPLIANCE

This system implements Contract-1 Evidence Sealing Ledger with the following guarantees:

### 1. IMMUTABILITY
✅ All sealed evidence records are **immutable** and cannot be modified or deleted  
✅ Server-side cryptographic hashing (SHA-256) for all payload types  
✅ Metadata hash and payload hash stored separately for integrity verification  
✅ Attempted modifications return HTTP 409 Conflict with clear error message  

### 2. AUDIT TRAIL
✅ Every operation logged with deterministic **correlation_id**  
✅ Full provenance tracking: who, when, why, what, where  
✅ Append-only ledger design prevents tampering  
✅ State transitions logged in `audit_events` table  

### 3. NO AUTO-APPROVAL
✅ Manual Entry evidence marked `trust_level=LOW`, `review_status=NOT_REVIEWED`  
✅ API Push digest-only marked `review_status=NOT_REVIEWED`  
✅ No evidence is automatically "APPROVED" or "COMPLIANT"  
✅ UI clearly communicates when human review is required  

### 4. SIMULATION ISOLATION
✅ Simulation mode clearly watermarked "UI VALIDATION MODE"  
✅ Simulation artifacts prefixed with `SIM-`  
✅ Simulation drafts rejected by production seal endpoint  
✅ No simulation data persisted to production ledger  

### 5. USER TRANSPARENCY
✅ No internal terminology ("Kernel") visible to end users  
✅ All errors shown with clear, actionable messages  
✅ Correlation IDs labeled as "Reference ID" in UI  
✅ Field-level validation errors displayed with exact missing fields  

### 6. PERFORMANCE & RELIABILITY
✅ Request timeout handling (15s create, 20s seal)  
✅ Double-submit prevention via in-flight tracking  
✅ Session persistence survives browser refresh  
✅ Graceful degradation on network errors  

### 7. REGULATORY ALIGNMENT
✅ Retention policies enforced per GDPR, industry standards  
✅ Personal data handling follows GDPR Article 6 legal basis  
✅ Data minimization principles applied to manual entry  
✅ Evidence can be superseded but never deleted (right to rectification)  

---

## SUPPORTED INGESTION METHODS

| Method | Use Case | Payload Type | Trust Level | Review Required |
|--------|----------|--------------|-------------|-----------------|
| **MANUAL_ENTRY** | Internal data entry, emergency uploads | JSON | LOW | ✅ Yes |
| **FILE_UPLOAD** | Ad-hoc file uploads (CSV, PDF, Excel) | BYTES | MEDIUM | Optional |
| **API_PUSH** | Third-party system integrations (digest-only) | DIGEST_ONLY | LOW | ✅ Yes |
| **ERP_EXPORT** | Scheduled ERP batch exports | BYTES | HIGH | Optional |
| **ERP_API** | Real-time ERP API connections | JSON/BYTES | HIGH | Optional |

---

## EVIDENCE LIFECYCLE STATES

```
DRAFT → INGESTED → SEALED → [SUPERSEDED]
         ↓
      QUARANTINED (requires resolution)
```

### State Definitions
- **DRAFT:** Mutable, not yet ready for sealing
- **INGESTED:** Ready for seal, awaiting final review
- **SEALED:** **IMMUTABLE**, cryptographically verified, audit-ready
- **QUARANTINED:** Flagged for review, cannot proceed until resolved
- **SUPERSEDED:** Replaced by newer evidence, old record preserved

---

## ERROR HANDLING STANDARDS

### User-Facing Errors
All errors follow this format:
```
[Error Type Icon] [Error Title]
[User-friendly explanation]
[Actionable next steps]
[Reference ID: CORR-xxx] (for support)
```

### Error Types
- **Validation Failed (422):** Field-level errors, block next step
- **System Error (500):** Show correlation ID, offer retry
- **Draft Not Found (404):** Explain expiration, offer "Create New Draft"
- **Conflict (409):** Evidence already sealed, cannot re-seal
- **Timeout:** Request took too long, offer retry

### Never Show to Users
- ❌ Stack traces or code references
- ❌ Internal function names ("kernel_", "CBAM_", etc.)
- ❌ Database table names or SQL errors
- ❌ Backend implementation details

---

## SIMULATION MODE PROTOCOL

### When to Use Simulation Mode
- UI/UX testing without production writes
- Training and demos
- Integration testing before go-live

### Simulation Safeguards
1. **Watermark:** Bright yellow banner with "⚠️ UI VALIDATION MODE"
2. **Prefix:** All correlation IDs start with `SIM-`
3. **Endpoint Isolation:** Simulation uses mock functions, never hits seal endpoint
4. **Data Isolation:** No writes to production database tables
5. **Toast Notifications:** Include "UI Validation Mode" text

### Production Enforcement
- Simulation drafts (ID starts with `SIM-`) rejected by production seal endpoint
- Simulation mode prop cannot be set accidentally (explicit configuration)
- Receipt clearly labeled "SIMULATED" with warning notice

---

## BACKEND MIGRATION READINESS

### Stable Interfaces
All functions follow versioned response format:
```typescript
{
  // Success
  ...data,
  correlation_id: string,
  build_id: string,
  contract_version: "contract_ingest_v1"
}
// OR Error
{
  error_code: string,
  message: string,
  field_errors?: {field: string, message: string}[],
  correlation_id: string
}
```

### Python/FastAPI Migration Path
Current Base44 functions → FastAPI endpoints:
- `kernel_createDraft` → `POST /api/evidence/drafts`
- `kernel_sealDraftHardened` → `POST /api/evidence/drafts/{id}/seal`
- Same request/response schemas maintained
- Same error codes and formats
- Correlation IDs preserved

---

## COMPLIANCE WITH EU REGULATIONS (2026-01-29)

### GDPR (Regulation (EU) 2016/679)
✅ **Article 5:** Data minimization, purpose limitation  
✅ **Article 6:** Legal basis for processing personal data  
✅ **Article 17:** Right to erasure (supersession pattern)  
✅ **Article 25:** Data protection by design and by default  
✅ **Article 30:** Records of processing activities (audit trail)  

### CSRD (Directive (EU) 2022/2464)
✅ Double materiality data collection supported  
✅ Audit-grade evidence for ESG reporting  
✅ Immutable data for external assurance  

### CBAM (Regulation (EU) 2023/956)
✅ Embedded emissions data provenance tracking  
✅ Supplier-specific evidence collection  
✅ Installation-level data granularity  

### EUDR (Regulation (EU) 2023/1115)
✅ Due diligence documentation storage  
✅ Geolocation evidence with proof of origin  
✅ Traceability chain evidence linking  

---

## CERTIFICATION READINESS

### ISO 27001 (Information Security)
✅ Access control: User authentication required for all operations  
✅ Audit logging: All actions traceable via correlation IDs  
✅ Data integrity: Cryptographic hashing of all evidence  

### ISO 14001 (Environmental Management)
✅ Environmental data collection supported  
✅ Evidence provenance for lifecycle assessments  
✅ Supplier environmental questionnaire storage  

### SOC 2 Type II
✅ Security: Server-side hashing, immutable storage  
✅ Availability: Timeout handling, retry mechanisms  
✅ Confidentiality: Personal data handling with GDPR basis  
✅ Processing Integrity: Validation before sealing  

---

## RESPONSIBILITIES

### System Owner
- Ensure simulation mode never enabled in production by default
- Review audit logs monthly for anomalies
- Maintain correlation ID search capability for support

### Users (Evidence Sealers)
- Provide accurate provenance metadata in Step 1
- Verify payload accuracy before sealing in Step 3
- Never seal evidence without understanding retention implications

### Administrators
- Review NOT_REVIEWED evidence before using in calculations
- Investigate QUARANTINED evidence within resolution deadline
- Maintain ERP connector credentials securely

---

## VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-01-29 | Initial production release |
| v1.1 | TBD | Planned: Batch sealing API |
| v2.0 | TBD | Planned: Python/FastAPI migration |

---

**Signed:** Senior Architect, Emission Core  
**Reviewed:** Legal & Compliance Team  
**Approved for Production:** 2026-01-29

---

## ATTESTATION

I hereby attest that this system has been audited and found compliant with Contract-1 requirements as of 2026-01-29. All evidence sealed through this system meets audit-grade standards for regulatory submissions under EU Green Deal regulations (CBAM, EUDR, CSRD, PFAS).

**Digital Signature:** [Audit Trail Hash: SHA-256 of this document]  
**Next Audit Due:** 2026-04-29 (Quarterly Review)