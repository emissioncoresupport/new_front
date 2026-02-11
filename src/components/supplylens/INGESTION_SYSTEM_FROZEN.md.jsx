# ⛔ INGESTION SYSTEM - FROZEN & PROTECTED

**Status:** LOCKED as of 2026-02-03  
**Version:** Contract1 + Registry-Driven + Kernel Pipeline  
**Reason:** Immutable sealing workflow - core compliance infrastructure

---

## 🔒 PROTECTED FILES - DO NOT MODIFY

### Core Wizard
- `components/supplylens/IngestionWizardRegistryDriven.js` ✓ LOCKED
- `components/supplylens/HowMethodsWorkModal.js` ✓ LOCKED

### Registry & Validation
- `components/supplylens/utils/registryValidator.js` ✓ LOCKED
- `components/supplylens/utils/contract1MethodRegistry.js` ✓ LOCKED
- `components/supplylens/utils/ingestionMethodRegistry.js` ✓ LOCKED
- `components/supplylens/utils/wizardDraftManager.js` ✓ LOCKED

### Step Components
- `components/supplylens/steps/Step2RegistryDriven.js` ✓ LOCKED
- `components/supplylens/steps/Step2SupplierMasterData.js` ✓ LOCKED
- `components/supplylens/steps/Step2ProductMasterData.js` ✓ LOCKED
- `components/supplylens/steps/method-specific/*.js` ✓ ALL LOCKED

### Pickers & Modals
- `components/supplylens/pickers/*.js` ✓ LOCKED
- `components/supplylens/modals/CreateEntityModal.js` ✓ LOCKED

### Adapters
- `components/supplylens/adapters/EvidenceApiAdapter.js` ✓ LOCKED

### Factory & Step Registry
- `components/supplylens/ingestion/stepFactoryRegistry.js` ✓ LOCKED

---

## 📋 CRITICAL INTERFACES - IMMUTABLE

```typescript
// Draft Model Contract
{
  draft_id: string,
  correlation_id: string,
  ingestion_method: string,
  evidence_type: string,
  declared_scope: string,
  binding_mode: "BIND_EXISTING" | "CREATE_NEW" | "DEFER",
  binding_state: "NONE" | "BOUND" | "DEFERRED",
  binding_target_type: string | null,
  bound_entity_id: string | null,
  binding_identity: { name, country_code } | null,
  payload_data_json: object | null,
  retention_policy: string,
  contains_personal_data: boolean,
  why_this_evidence: string,
  attestation_notes: string | null,
  reconciliation_hint: string | null,
  external_reference_id: string | null
}

// Seal Response Contract
{
  record_id: string,
  tenant_id: string,
  correlation_id: string,
  sealed_at_utc: string,
  payload_sha256: string,
  hash_scope: string,
  review_status: "NOT_REVIEWED" | "APPROVED",
  binding_state: string,
  reconciliation_status: string
}

// Registry Proof
{
  method_id: string,
  evidence_types: string[],
  scopes_per_type: { [type]: string[] },
  binding_modes: string[],
  requires_external_reference_id: boolean
}
```

---

## 🛡️ KNOWN DEPENDENCIES - PRESERVE

- **Draft Manager:** Handles idempotency, correlation tracking, state persistence
- **Registry Validator:** Validates method/evidence/scope compatibility
- **Step Factory:** Routes to correct step component based on method + evidence type
- **Seal Pipeline:** Contract1-compliant kernel-based sealing

---

## ❌ DO NOT

- ❌ Rename any function signatures
- ❌ Change return types of `validateStep1()`, `validateStep2()`, `canSeal()`
- ❌ Modify draft upsert/seal mutation payloads
- ❌ Alter binding state machine transitions
- ❌ Remove any method from `getAllMethods()` registry
- ❌ Change evidence type enums
- ❌ Modify scope compatibility rules
- ❌ Remove correlation ID tracking
- ❌ Change hash computation algorithm

---

## ✅ ALLOWED CHANGES (If Absolutely Necessary)

- UI styling only (Tailwind classes, colors, spacing)
- Add new Step 2 components for NEW evidence types (with backward compatibility)
- Add new validation rules (append-only to validator)
- Enhance error messages (no functional change)
- Add new registry entries (scopes, methods) - backward compatible only

---

## 🔐 WHY THIS IS FROZEN

1. **Deterministic Sealing:** Every field maps to hash canonicalization
2. **Audit Compliance:** Correlation IDs + draft tracking = full reconstruction
3. **Regulatory Proof:** Contract1 acceptance tests depend on exact flows
4. **Identity Binding:** Locked snapshots prevent retroactive changes
5. **State Machine:** Binding transitions have legal significance

---

## 🚨 If You Need to Extend

Create **new** components instead:
- `Step2NewEvidenceType.js` (for new evidence)
- `NewBindingMode.js` (for new binding logic)
- Add to registry with new ID (never overwrite)

**Always:** Maintain backward compatibility with existing draft versions.

---

**Last Updated:** 2026-02-03  
**Frozen By:** Architecture Team  
**Next Review:** Only if regulatory changes require it