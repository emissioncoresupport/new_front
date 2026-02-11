# ⚠️ DEPRECATED LEGACY COMPONENTS

**Status:** FROZEN - NO NEW LOGIC PERMITTED  
**Migration Target:** New Lifecycle Services  
**Deprecation Date:** January 20, 2026  
**Complete Removal:** March 1, 2026

---

## 🚫 DEPRECATED FILES

### **1. CBAMOrchestrator.jsx**
- **Reason:** Violates lifecycle boundaries - orchestrates across ALL lifecycles
- **Replacement:** Event-driven coordination via CBAMEventBus
- **Action:** Delete all imports and usages

### **2. CBAMEntryModal.jsx**
- **Reason:** Spans Entry + Evidence + Supplier + Validation lifecycles in single component
- **Replacement:** Separate modals per lifecycle:
  - `CBAMEntryForm` (entry metadata only)
  - Evidence upload via SupplyLens Evidence Service
  - Supplier linking via SupplyLens events
- **Action:** Refactor to use new CBAMEntryService

### **3. CBAMUnifiedReportWorkflow.jsx**
- **Reason:** Crosses Entry, Report, Certificate, Submission lifecycles
- **Replacement:**
  - `CBAMReportingService.generateReport()` for aggregation
  - `CBAMReportingService.submitReport()` for submission
  - Separate financial UI for certificates
- **Action:** Refactor to event-driven workflow

### **4. functions/cbamCalculationEngine.js (V1)**
- **Reason:** Superseded by V2, contains duplicate logic
- **Replacement:** `cbamCalculationEngineV2.js`
- **Action:** Redirect all calls to V2

### **5. components/cbam/services/CBAMCalculationService.jsx (OLD)**
- **Reason:** Contains orchestration + calculation mixed
- **Replacement:** `services/lifecycle/CBAMCalculationService.jsx`
- **Action:** Update all imports

---

## 📋 MIGRATION CHECKLIST

### **Phase 1: Service Layer (Week 1)**
- [x] Create `CBAMEntryService`
- [x] Create `CBAMCalculationService` (pure)
- [x] Create `CBAMValidationService` (consolidated)
- [x] Create `CBAMVerificationService` (state machine)
- [x] Create `CBAMReportingService` (aggregation)
- [x] Create `CBAMCertificateService` (financial)
- [x] Create `CBAMAuditTrailService` (mandatory logging)

### **Phase 2: UI Refactor (Week 2)**
- [ ] Create `CBAMEntryForm` (metadata only)
- [ ] Create `CBAMCalculationPanel` (triggers calc, displays results)
- [ ] Create `CBAMValidationPanel` (displays validation results)
- [ ] Create `CBAMReportBuilder` (aggregation UI)
- [ ] Remove business logic from all UI components

### **Phase 3: Event-Driven Migration (Week 3)**
- [ ] Replace all direct service calls with events
- [ ] Implement event listeners in each lifecycle service
- [ ] Remove cross-lifecycle dependencies

### **Phase 4: Testing & Cleanup (Week 4)**
- [ ] Unit tests for all lifecycle services
- [ ] Integration tests for event flows
- [ ] Delete deprecated components
- [ ] Update documentation

---

## 🚨 BUILD FAILURES

The following violations will **FAIL THE BUILD**:

1. ❌ Any component spanning multiple lifecycles
2. ❌ UI components containing business logic
3. ❌ CBAM services mutating Supplier/Evidence entities
4. ❌ Optional audit logging (must be mandatory)
5. ❌ Direct service-to-service calls across lifecycles

---

## 📞 MIGRATION SUPPORT

For questions or migration assistance:
- Review lifecycle service implementations in `services/lifecycle/`
- Check event bus usage in `CBAMEventBus.jsx`
- Refer to architectural constraints in project README

**Last Updated:** January 20, 2026