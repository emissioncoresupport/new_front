# CBAM Lifecycle Architecture - Strict Enforcement

**Version:** 2.0  
**Enforcement Date:** January 20, 2026  
**Architect:** Platform Architect

---

## 📐 LIFECYCLE DEFINITIONS

### **LIFECYCLE 1: IMPORT ENTRY**
**Folder:** `lifecycles/entry/`  
**Service:** `EntryService.jsx`  
**Domain:** Entry metadata CRUD only

**Allowed Operations:**
- ✅ Create import entry
- ✅ Update entry metadata (import_id, date, CN code, quantity, country)
- ✅ Link supplier by ID reference only
- ✅ Delete entry

**Forbidden Operations:**
- ❌ Calculate emissions
- ❌ Validate regulatory compliance
- ❌ Verify data
- ❌ Upload evidence
- ❌ Mutate Supplier entity
- ❌ Generate reports

**Event Emissions:**
- `ENTRY_CREATED` → triggers CALCULATION lifecycle
- `ENTRY_UPDATED` → may trigger recalculation
- `ENTRY_DELETED` → cleanup events

---

### **LIFECYCLE 2: EMISSION CALCULATION**
**Folder:** `lifecycles/calculation/`  
**Service:** `CalculationService.jsx`  
**Domain:** Pure computation only

**Allowed Operations:**
- ✅ Call pure calculation engine (backend)
- ✅ Update entry with calculation results
- ✅ Read precursor mappings

**Forbidden Operations:**
- ❌ Database writes (except updating calculation fields)
- ❌ Validation logic
- ❌ Verification logic
- ❌ UI rendering
- ❌ Event orchestration beyond emit

**Event Emissions:**
- `CALCULATION_COMPLETED` → triggers VALIDATION lifecycle

---

### **LIFECYCLE 3: VALIDATION**
**Folder:** `lifecycles/validation/`  
**Service:** `ValidationService.jsx`  
**Domain:** Regulatory rule enforcement

**Allowed Operations:**
- ✅ Check CN code format
- ✅ Check mandatory fields
- ✅ Materiality assessment
- ✅ Carbon price certificate validation
- ✅ Update validation status

**Forbidden Operations:**
- ❌ Calculations
- ❌ Verification decisions
- ❌ Report generation
- ❌ Certificate operations

**Event Emissions:**
- `ENTRY_VALIDATED` → enables REPORTING

---

### **LIFECYCLE 4: VERIFICATION**
**Folder:** `lifecycles/verification/`  
**Service:** `VerificationService.jsx`  
**Domain:** Accredited verifier state machine

**Allowed Operations:**
- ✅ Request verification from accredited verifier
- ✅ Record verifier decision
- ✅ State transition enforcement
- ✅ Link verification reports

**Forbidden Operations:**
- ❌ Manual status overrides
- ❌ Calculation or validation
- ❌ Evidence upload

**Allowed State Transitions:**
```
not_verified → verification_requested
verification_requested → accredited_verifier_satisfactory | accredited_verifier_unsatisfactory
accredited_verifier_unsatisfactory → requires_correction
requires_correction → verification_requested
```

**Event Emissions:**
- `VERIFICATION_REQUESTED`
- `VERIFICATION_COMPLETED`

---

### **LIFECYCLE 5: REPORTING**
**Folder:** `lifecycles/reporting/`  
**Service:** `ReportingService.jsx`  
**Domain:** Period aggregation

**Allowed Operations:**
- ✅ Aggregate validated entries by quarter
- ✅ Generate report datasets
- ✅ Submit to national registry (via backend)
- ✅ Read-only entry access

**Forbidden Operations:**
- ❌ Recalculation
- ❌ Validation
- ❌ Entry mutation
- ❌ Certificate purchase

**Event Emissions:**
- `REPORT_GENERATED`
- `REPORT_SUBMITTED`

---

### **LIFECYCLE 6: CERTIFICATES & FINANCIALS**
**Folder:** `lifecycles/certificates/`  
**Service:** `CertificateService.jsx`  
**Domain:** Financial exposure

**Allowed Operations:**
- ✅ Calculate certificate requirements (read-only aggregation)
- ✅ Purchase certificates
- ✅ Surrender certificates for reports
- ✅ Track financial exposure

**Forbidden Operations:**
- ❌ Emission calculation
- ❌ Entry mutation
- ❌ Validation logic

**Event Emissions:**
- `CERTIFICATE_PURCHASED`
- `CERTIFICATE_SURRENDERED`

---

## 🔒 CROSS-LIFECYCLE RULES

### **Rule 1: Event-Driven Communication ONLY**
```javascript
// ✅ ALLOWED
eventBus.emit(CBAM_EVENTS.ENTRY_CREATED, { entryId });

// ❌ FORBIDDEN
await CalculationService.calculate(entryId);
```

### **Rule 2: Read-Only References**
```javascript
// ✅ ALLOWED
const supplier = suppliers.find(s => s.id === entry.supplier_id);

// ❌ FORBIDDEN
await base44.entities.Supplier.update(supplierId, { ... });
```

### **Rule 3: No UI Orchestration**
```javascript
// ✅ ALLOWED - UI triggers service
<Button onClick={() => EntryService.createEntry(data)}>Create</Button>

// ❌ FORBIDDEN - UI orchestrates multiple lifecycles
<Button onClick={async () => {
  await createEntry();
  await calculateEmissions();
  await validateEntry();
}}>Create</Button>
```

### **Rule 4: Mandatory Audit**
```javascript
// ✅ ALLOWED
await AuditTrailService.log({ lifecycle: 'ENTRY', ... });

// ❌ FORBIDDEN
if (options.createAudit) { await AuditTrailService.log(...); }
```

---

## 📁 FOLDER STRUCTURE (ENFORCED)

```
components/cbam/
├── lifecycles/
│   ├── entry/
│   │   ├── EntryService.jsx ✅
│   │   └── ui/
│   │       └── EntryForm.jsx ✅
│   ├── calculation/
│   │   └── CalculationService.jsx ✅
│   ├── validation/
│   │   ├── ValidationService.jsx ✅
│   │   └── ui/
│   │       └── ValidationPanel.jsx ✅
│   ├── verification/
│   │   ├── VerificationService.jsx ✅
│   │   └── ui/
│   │       └── VerificationHub.jsx
│   ├── reporting/
│   │   ├── ReportingService.jsx ✅
│   │   └── ui/
│   │       └── ReportBuilder.jsx
│   ├── certificates/
│   │   ├── CertificateService.jsx ✅
│   │   └── ui/
│   │       └── CertificateManager.jsx
│   └── shared/
│       └── AuditTrailService.jsx ✅
├── services/
│   └── CBAMEventBus.jsx ✅
├── constants/
│   └── regulatorySchedules.js ✅
├── ui/ (Projection components only)
│   ├── CBAMEntryForm.jsx ✅
│   ├── CBAMCalculationPanel.jsx ✅
│   └── CBAMValidationPanel.jsx ✅
└── legacy/ (Deprecated code)
    └── ... (frozen)

functions/
└── cbamCalculationEngine.js ✅ (Pure calculation only)
```

---

## 🔄 EVENT FLOW

```
User Action → UI Component
              ↓
         Service Method (single lifecycle)
              ↓
         Database Write
              ↓
         Mandatory Audit Log
              ↓
         Event Emission
              ↓
    Next Lifecycle Service (listener)
```

**Example: Create Entry Flow**
```
1. User fills CBAMEntryForm.jsx
2. Form triggers EntryService.createEntry()
3. EntryService creates entry in DB
4. EntryService logs audit trail
5. EntryService emits ENTRY_CREATED event
6. CalculationService (listener) auto-triggers
7. CalculationService calls backend engine
8. CalculationService updates entry with results
9. CalculationService logs audit trail
10. CalculationService emits CALCULATION_COMPLETED event
11. ValidationService (listener) auto-triggers
12. ValidationService validates rules
13. ValidationService updates validation status
14. ValidationService logs audit trail
15. ValidationService emits ENTRY_VALIDATED event
16. Entry ready for reporting
```

---

## ✅ COMPLIANCE CHECKLIST

**Every service MUST:**
- [ ] Declare `LIFECYCLE = 'NAME'` property
- [ ] Enforce single-lifecycle responsibility
- [ ] Call `AuditTrailService.log()` for every write
- [ ] Emit events for state changes
- [ ] Never call other lifecycle services directly
- [ ] Never mutate SupplyLens entities

**Every UI component MUST:**
- [ ] Import service, not contain logic
- [ ] Render data only (projection)
- [ ] Trigger ONE service method per action
- [ ] Never orchestrate multiple lifecycles
- [ ] Never mutate state directly

---

## 🚨 BUILD ENFORCEMENT

**Automated Checks (CI/CD):**

```javascript
// Check 1: No cross-lifecycle imports
if (file.path.includes('entry/') && file.imports.some(i => i.includes('calculation/'))) {
  throw new Error('LIFECYCLE VIOLATION: Entry cannot import Calculation');
}

// Check 2: Service purity
if (service.LIFECYCLE !== service.folder) {
  throw new Error('SERVICE MISMATCH: Service must match folder lifecycle');
}

// Check 3: Mandatory audits
if (code.includes('base44.entities') && !code.includes('AuditTrailService.log')) {
  throw new Error('AUDIT VIOLATION: All mutations must be audited');
}

// Check 4: No direct service calls
if (code.includes('CalculationService.calculate') && !code.includes('eventBus.on')) {
  throw new Error('EVENT VIOLATION: Use event-driven flow only');
}
```

---

## 📚 DEVELOPER GUIDE

### **Creating a New Entry (Correct Pattern):**
```javascript
import EntryService from '@/components/cbam/lifecycles/entry/EntryService';

const result = await EntryService.createEntry({
  cn_code: '72081000',
  quantity: 100,
  country_of_origin: 'China',
  import_date: '2026-01-15'
});

// Calculation auto-triggers via event
// Validation auto-triggers after calculation
// NO manual orchestration needed
```

### **WRONG Pattern (Violates Lifecycle):**
```javascript
// ❌ DO NOT DO THIS
await EntryService.createEntry(data);
await CalculationService.calculate(entryId); // FORBIDDEN
await ValidationService.validate(entryId); // FORBIDDEN
```

---

## 🎓 MIGRATION FROM OLD CODE

| Old Pattern | New Pattern |
|-------------|-------------|
| `CBAMOrchestrator.createEntry()` | `EntryService.createEntry()` + events |
| Inline calculations in UI | `CalculationService.calculateAndUpdate()` |
| Manual validation calls | Auto-triggered via events |
| Direct supplier mutations | Event-driven requests to SupplyLens |
| Optional audit trails | Mandatory in every service |

---

**Last Updated:** January 20, 2026  
**Status:** Enforced  
**Next Review:** Every commit via CI/CD