# CBAM Verification State Machine - Enforcement Reference

**Version:** 2.0  
**Regulatory Basis:** Reg 2023/956 Art. 18-20, C(2025) 8151 Chapter 5  
**Status:** ENFORCED

---

## 🔒 VERIFICATION STATES (ALLOWED)

### **State 1: not_verified**
**Initial State**

**Properties:**
- Default state for all new entries
- No verifier assigned
- No verification actions taken

**Exit Conditions:**
- Assign accredited verifier → `verifier_assigned`

---

### **State 2: verifier_assigned**
**Active Verification**

**Properties:**
- Accredited verifier assigned and confirmed
- Verification in progress
- Evidence collection phase

**Entry Conditions:**
- ✅ Verifier credentials validated
- ✅ Verifier accreditation active
- ✅ Assignment logged in audit trail

**Exit Conditions:**
- Submit satisfactory opinion → `verifier_satisfactory`
- Submit unsatisfactory opinion → `verifier_unsatisfactory`

---

### **State 3: verifier_satisfactory**
**Terminal State - Positive**

**Properties:**
- Verification complete with positive conclusion
- Evidence references attached
- Verification report submitted
- Entry can be included in reports

**Entry Conditions:**
- ✅ Assigned verifier submits opinion
- ✅ Evidence IDs provided (mandatory)
- ✅ Verification report ID provided (mandatory)
- ✅ All validation rules passed

**Exit Conditions:**
- **NONE** - Terminal state, cannot transition

**Reporting Impact:**
- Entry ALLOWED in CBAM reports
- Entry ALLOWED for certificate calculations

---

### **State 4: verifier_unsatisfactory**
**Terminal State - Negative**

**Properties:**
- Verification complete with negative conclusion
- Findings documented
- Entry BLOCKED from reporting

**Entry Conditions:**
- ✅ Assigned verifier submits opinion
- ✅ Findings documented (mandatory)
- ✅ Verification report ID provided

**Exit Conditions:**
- Request correction → `correction_required`

**Reporting Impact:**
- Entry BLOCKED from CBAM reports
- Certificate calculations BLOCKED

---

### **State 5: correction_required**
**Remediation Phase**

**Properties:**
- Unsatisfactory opinion issued
- Correction actions defined
- Awaiting data updates

**Entry Conditions:**
- ✅ Verifier requests corrections
- ✅ Correction actions documented

**Exit Conditions:**
- Re-assign verifier after updates → `verifier_assigned`

**Requirements for Re-verification:**
- Entry must be modified after correction request
- New verification cycle initiated
- Verification cycle counter incremented

---

## 🚫 FORBIDDEN STATES

The following states are **NEVER ALLOWED**:

- ❌ `verified` (ambiguous, use `verifier_satisfactory`)
- ❌ `approved` (not regulatory term)
- ❌ `manual_override` (audit violation)
- ❌ `auto_verified` (verifier role mandatory)
- ❌ `pending_verification` (use `verifier_assigned`)

**Any code using these states will FAIL the build.**

---

## 🔄 ALLOWED STATE TRANSITIONS

```
┌─────────────────┐
│  not_verified   │ (Initial State)
└────────┬────────┘
         │ assignVerifier()
         │ ✅ Verifier validated
         │ ✅ Audit logged
         ▼
┌─────────────────────┐
│  verifier_assigned  │ (Active Verification)
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
     │ submitSatisfactoryOpinion()     │ submitUnsatisfactoryOpinion()
     │ ✅ Evidence refs                │ ✅ Findings documented
     │ ✅ Report ID                    │ ✅ Report ID
     ▼                                 ▼
┌───────────────────────┐      ┌────────────────────────────┐
│ verifier_satisfactory │      │  verifier_unsatisfactory   │
│   (TERMINAL - PASS)   │      └──────────┬─────────────────┘
└───────────────────────┘                 │
                                          │ requestCorrection()
                                          │ ✅ Actions defined
                                          ▼
                                ┌─────────────────────┐
                                │ correction_required │
                                └──────────┬──────────┘
                                           │
                                           │ reassignAfterCorrection()
                                           │ ✅ Entry modified
                                           │ ✅ Cycle incremented
                                           ▼
                                ┌─────────────────────┐
                                │  verifier_assigned  │ (Cycle 2)
                                └─────────────────────┘
```

---

## 📋 TRANSITION REQUIREMENTS

### **Transition 1: not_verified → verifier_assigned**

**Method:** `assignVerifier(entryId, verifierId, assignedBy)`

**Pre-conditions:**
- Entry exists
- Current state is `not_verified` OR `correction_required`

**Validations:**
1. ✅ Verifier exists in CBAMVerifier registry
2. ✅ Verifier status = 'active'
3. ✅ Verifier has accreditation_number
4. ✅ Accreditation not expired

**Audit Log:**
- Previous state: `not_verified`
- New state: `verifier_assigned`
- Verifier ID
- Verifier accreditation number
- Regulation: Reg 2023/956 Art. 18

**Events Emitted:**
- `VERIFICATION_REQUESTED`

---

### **Transition 2: verifier_assigned → verifier_satisfactory**

**Method:** `submitSatisfactoryOpinion(entryId, verifierId, evidenceIds, reportId, notes)`

**Pre-conditions:**
- Current state is `verifier_assigned`
- User is assigned verifier

**Validations:**
1. ✅ verifierId matches entry.verifier_id
2. ✅ Verifier credentials valid
3. ✅ evidenceIds array not empty (MANDATORY)
4. ✅ reportId provided (MANDATORY)
5. ✅ All evidence documents exist

**Audit Log:**
- Previous state: `verifier_assigned`
- New state: `verifier_satisfactory`
- Verifier accreditation
- Report ID
- Evidence count
- Regulation: Reg 2023/956 Art. 19-20

**Events Emitted:**
- `VERIFICATION_COMPLETED` (decision: satisfactory)

---

### **Transition 3: verifier_assigned → verifier_unsatisfactory**

**Method:** `submitUnsatisfactoryOpinion(entryId, verifierId, evidenceIds, reportId, findings, notes)`

**Pre-conditions:**
- Current state is `verifier_assigned`
- User is assigned verifier

**Validations:**
1. ✅ verifierId matches entry.verifier_id
2. ✅ Verifier credentials valid
3. ✅ findings array not empty (MANDATORY)
4. ✅ reportId provided

**Audit Log:**
- Previous state: `verifier_assigned`
- New state: `verifier_unsatisfactory`
- Findings count
- Regulation: Reg 2023/956 Art. 19-20

**Events Emitted:**
- `VERIFICATION_COMPLETED` (decision: unsatisfactory)

---

### **Transition 4: verifier_unsatisfactory → correction_required**

**Method:** `requestCorrection(entryId, verifierId, correctionActions)`

**Pre-conditions:**
- Current state is `verifier_unsatisfactory`
- User is assigned verifier

**Validations:**
1. ✅ verifierId matches entry.verifier_id
2. ✅ correctionActions defined

**Audit Log:**
- Previous state: `verifier_unsatisfactory`
- New state: `correction_required`
- Correction actions

---

### **Transition 5: correction_required → verifier_assigned**

**Method:** `reassignAfterCorrection(entryId, verifierId)`

**Pre-conditions:**
- Current state is `correction_required`
- Entry has been modified since correction request

**Validations:**
1. ✅ entry.updated_date > entry.correction_requested_date
2. ✅ Verifier credentials valid
3. ✅ Verification cycle incremented

**Audit Log:**
- Previous state: `correction_required`
- New state: `verifier_assigned`
- Verification cycle number

---

## 🔐 ROLE ENFORCEMENT

### **Verifier Role Requirements:**

**Who Can:**
- Assign verifier: Importer/Admin
- Submit opinion: Assigned verifier ONLY
- Request correction: Assigned verifier ONLY

**Verification:**
```javascript
// ENFORCED in service
if (entry.verifier_id !== verifierId) {
  throw new Error('Only assigned verifier can perform this action');
}
```

**Verifier Registry:**
- Entity: `CBAMVerifier`
- Required fields:
  - `accreditation_number`
  - `accreditation_body`
  - `accreditation_expires`
  - `status` (active/suspended/revoked)
  - `scope` (goods categories)

---

## 📎 EVIDENCE ENFORCEMENT

### **Evidence References (MANDATORY):**

**For Satisfactory Opinion:**
```javascript
// BLOCKING if empty
if (!evidenceIds || evidenceIds.length === 0) {
  throw new Error('Evidence references mandatory per Art. 19');
}
```

**Evidence Types:**
- Monitoring plans
- Emission reports
- Measurement data
- Laboratory test results
- Installation documentation

**Evidence Lifecycle:**
- Evidence stored in Evidence entity
- Referenced by ID only (immutable)
- No direct file uploads in verification flow

---

## 🚨 INTEGRATION ENFORCEMENT

### **Validation Lifecycle:**
```javascript
// In ValidationService.jsx
if (method === 'actual_values' && 
    verification_status !== 'verifier_satisfactory') {
  blockingIssues.push({
    rule: 'VERIFICATION_REQUIREMENT',
    message: 'Actual emissions require satisfactory verification',
    regulation: 'C(2025) 8151 Chapter 5'
  });
}
```

### **Reporting Lifecycle:**
```javascript
// In ReportingService.jsx
const validEntries = allEntries.filter(e => {
  // Allow default methods without verification
  if (e.calculation_method === 'default_values') return true;
  
  // Actual methods MUST be verified satisfactorily
  return e.verification_status === 'verifier_satisfactory';
});
```

### **Certificate Lifecycle:**
```javascript
// Only consume verified reports
if (report.unverified_actual_entries > 0) {
  throw new Error('Cannot calculate certificates for unverified actual emissions');
}
```

---

## 📊 AUDIT TRAIL REQUIREMENTS

**Every verification action logs:**
```javascript
{
  lifecycle: 'VERIFICATION',
  entity_type: 'CBAMEmissionEntry',
  entity_id: string,
  action: string, // 'verifier_assigned', 'verification_satisfactory', etc.
  user_email: string,
  timestamp: ISO8601,
  details: {
    previous_state: string,
    new_state: string,
    verifier_id: string,
    verifier_accreditation: string,
    evidence_count?: number,
    findings_count?: number,
    verification_cycle?: number,
    regulation: string
  }
}
```

**Audit Query:**
```javascript
const history = await VerificationService.getVerificationHistory(entryId);
// Returns all state transitions with timestamps
```

---

## ✅ BUILD ENFORCEMENT RULES

**Build PASSES when:**
- ✅ All verification states from VERIFICATION_STATES enum
- ✅ All transitions use VerificationService methods
- ✅ No UI components set verification_status directly
- ✅ All verifier actions validate credentials
- ✅ Evidence references mandatory for satisfactory opinions

**Build FAILS when:**
- ❌ Forbidden states used
- ❌ Direct database writes to verification_status
- ❌ Transitions skip state machine
- ❌ Verifier role not enforced
- ❌ Evidence optional

---

**Last Updated:** January 20, 2026  
**Enforcement Level:** STRICT  
**Maintained By:** Platform Architect