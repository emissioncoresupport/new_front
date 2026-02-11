# CBAM Module Architecture - Lifecycle-Driven Design

**Last Updated:** January 20, 2026  
**Compliance:** C(2025) 8151, C(2025) 8150, Reg 2023/956

---

## 📐 ARCHITECTURAL PRINCIPLES

### **1. Lifecycle Isolation**
Each lifecycle operates independently with clear boundaries:

```
Entry Lifecycle → Calculation Lifecycle → Validation Lifecycle
                                                ↓
                                        Verification Lifecycle
                                                ↓
                                        Reporting Lifecycle
                                                ↓
                                    Certificate Lifecycle
```

### **2. Event-Driven Coordination**
Cross-lifecycle operations use events:

```javascript
// Entry created → triggers calculation
eventBus.emit(CBAM_EVENTS.ENTRY_CREATED, { entryId, entry });

// Calculation completed → triggers validation
eventBus.emit(CBAM_EVENTS.CALCULATION_COMPLETED, { entryId, entry });

// Validation passed → triggers reporting eligibility
eventBus.emit(CBAM_EVENTS.ENTRY_VALIDATED, { entryId, validation });
```

### **3. Mandatory Audit Trails**
Every regulated operation logs:

```javascript
await AuditTrailService.log({
  entity_type: 'CBAMEmissionEntry',
  entity_id: entryId,
  action: 'calculate',
  user_email: user.email,
  details: 'Calculation completed',
  regulatory_reference: 'Art. 4-15 C(2025) 8151'
});
```

---

## 📦 LIFECYCLE SERVICES

### **1. Entry Lifecycle**
**File:** `services/lifecycle/CBAMEntryService.jsx`

**Responsibilities:**
- Create, update, delete entries
- Manage import metadata
- Reference suppliers/installations (no mutations)

**Events Emitted:**
- `ENTRY_CREATED`
- `ENTRY_UPDATED`
- `ENTRY_DELETED`

**Boundaries:**
- ❌ Does NOT calculate emissions
- ❌ Does NOT validate
- ❌ Does NOT mutate suppliers

---

### **2. Calculation Lifecycle**
**File:** `services/lifecycle/CBAMCalculationService.jsx`

**Responsibilities:**
- Pure emission calculations
- Apply benchmarks, markups, free allocation
- Update entries with calculation results

**Events Emitted:**
- `CALCULATION_COMPLETED`

**Boundaries:**
- ❌ Does NOT create entries
- ❌ Does NOT validate regulatory rules
- ❌ Does NOT generate reports

---

### **3. Validation Lifecycle**
**File:** `services/lifecycle/CBAMValidationService.jsx`

**Responsibilities:**
- Single source of truth for validation rules
- Enforce C(2025) 8151 compliance
- Update validation status

**Events Emitted:**
- `ENTRY_VALIDATED`

**Boundaries:**
- ❌ Does NOT calculate
- ❌ Does NOT mutate entry data
- ✅ Pure validation only

---

### **4. Verification Lifecycle**
**File:** `services/lifecycle/CBAMVerificationService.jsx`

**Responsibilities:**
- State machine for verification status
- Manage third-party verifier workflow
- Enforce status transitions

**Events Emitted:**
- `VERIFICATION_REQUESTED`
- `VERIFICATION_COMPLETED`

**Boundaries:**
- ❌ Does NOT validate business rules
- ✅ Only manages verification states

---

### **5. Reporting Lifecycle**
**File:** `services/lifecycle/CBAMReportingService.jsx`

**Responsibilities:**
- Aggregate entries into quarterly reports
- Calculate deadlines
- Submit to registry

**Events Emitted:**
- `REPORT_GENERATED`
- `REPORT_SUBMITTED`

**Boundaries:**
- ❌ Does NOT calculate emissions
- ❌ Does NOT validate entries
- ✅ Pure aggregation

---

### **6. Certificate Lifecycle**
**File:** `services/lifecycle/CBAMCertificateService.jsx`

**Responsibilities:**
- Purchase certificates
- Surrender for reports
- Financial tracking

**Events Emitted:**
- `CERTIFICATE_PURCHASED`
- `CERTIFICATE_SURRENDERED`

**Boundaries:**
- ❌ Does NOT calculate emissions
- ❌ Does NOT generate reports
- ✅ Pure financial operations

---

## 🎨 UI COMPONENT RULES

### **What UI Components CAN Do:**
✅ Render data  
✅ Trigger lifecycle events  
✅ Display validation results  
✅ Navigate between views  

### **What UI Components CANNOT Do:**
❌ Calculate emissions  
❌ Validate regulatory rules  
❌ Mutate entities directly  
❌ Contain business logic  

### **Example - Clean UI Component:**

```javascript
export default function CBAMEntryForm({ onSubmit }) {
  const [formData, setFormData] = useState({});
  
  const handleSubmit = async () => {
    // Trigger service - no business logic here
    const result = await CBAMEntryService.createEntry(formData);
    
    if (result.success) {
      onSubmit(result.entry);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Pure rendering - no calculations */}
    </form>
  );
}
```

---

## 🔗 SUPPLYLENS BOUNDARY

CBAM **NEVER** mutates SupplyLens entities directly:

```javascript
// ❌ WRONG - Direct mutation
await base44.entities.Supplier.update(supplierId, { cbam_relevant: true });

// ✅ CORRECT - Event-driven
eventBus.emit('SUPPLIER_DATA_REQUIRED', { 
  supplierId, 
  context: 'cbam_entry_creation' 
});

// SupplyLens handles mutation and emits back:
eventBus.on('SUPPLIER_DATA_LINKED', ({ supplierId, entryId }) => {
  // CBAM only updates reference
  CBAMEntryService.updateEntry(entryId, { supplier_id: supplierId });
});
```

---

## 📊 DATA FLOW

```
┌─────────────┐
│   User UI   │
└──────┬──────┘
       │ (triggers)
       ▼
┌─────────────┐
│ Entry Service│──► Entry Created ──► Calculation Service
└─────────────┘                              │
                                             │ (calculates)
                                             ▼
                                   Calculation Complete
                                             │
                                             ▼
                                   Validation Service
                                             │
                                             ▼
                                   Entry Validated
                                             │
                                             ▼
                                   Reporting Service
                                             │
                                             ▼
                                   Report Generated
```

---

## 🧪 TESTING STRATEGY

### **Unit Tests:**
- Each service tested independently
- Mock event bus
- No cross-lifecycle dependencies

### **Integration Tests:**
- Event flow from Entry → Calculation → Validation
- Full lifecycle workflows

### **E2E Tests:**
- User creates entry → calculation auto-triggers → validation → report

---

## 📝 REGULATORY COMPLIANCE

All services enforce:
- **C(2025) 8151** - Calculation methodology
- **C(2025) 8150** - Verification requirements
- **Reg 2023/956** - Reporting obligations

Mandatory audits ensure compliance traceability.

---

## 🚀 FUTURE ENHANCEMENTS

1. **Microservices Ready:** Each lifecycle service can become independent microservice
2. **Async Processing:** Long calculations can be moved to background jobs
3. **Multi-Tenant:** All services respect tenant boundaries
4. **Scalable:** Event-driven design supports horizontal scaling

---

**Architecture Owner:** Platform Architect  
**Last Review:** January 20, 2026  
**Next Review:** March 1, 2026