# SupplyLens Forensic Reality Audit - UNFILTERED
**Date:** 2026-01-21  
**Mode:** Evidence-First Architecture Reality Check  
**Standard:** Zero Assumptions, Expose Current State

---

## SECTION 1: UI METRICS VERIFICATION

### getOperationalDashboard.js Analysis:

| Metric | Backend Source | Reality Status | Data Dependency |
|--------|---------------|----------------|-----------------|
| **Velocity (suppliers/day)** | Line 49-52: `mappings.filter(approved_at >= 7d)` | ❌ **DEPENDS ON SUPPLIER CREATION** | Requires MappingDecision.status=APPROVED with supplier_id populated |
| **Approved %** | Line 56-66: `mappings.filter(status=APPROVED)` | ❌ **DEPENDS ON SUPPLIER CREATION** | Requires MappingDecision entity with approved_at timestamp |
| **Avg Time** | Line 43-47: `(approved_at - created_date)/hours` | ❌ **DEPENDS ON SUPPLIER CREATION** | Requires MappingDecision lifecycle timestamps |
| **Coverage %** | Line 69-70: `suppliers.filter(data_completeness >= 80)` | ❌ **DEPENDS ON SUPPLIER CREATION** | Requires Supplier entity with data_completeness field |
| **Risk Portfolio** | Line 30-38: `suppliers.filter(risk_level + regulation)` | ❌ **DEPENDS ON SUPPLIER CREATION** | Requires Supplier entity with risk_level and *_relevant flags |
| **Deadlines** | Line 84-97: **HARDCODED DATES** | ⚠️ **UI-ONLY** | Static dates (2026-10-01, 2025-04-28, etc) - not regulatory source |

### CRITICAL FINDING:
**ALL METRICS DEPEND ON SUPPLIER ENTITY EXISTENCE**

The dashboard function queries:
- `base44.entities.Supplier.list()` (line 16)
- `base44.entities.MappingDecision.list()` (line 15)

But the orchestrator (`SupplyLensIngestionOrchestrator.js`) **NEVER CREATES SUPPLIERS**.

Line 73-85 returns:
```javascript
return {
  success: true,
  stage: 'preview_ready',
  supplier_data: enriched,
  next_action: 'user_approval_required'
};
```

**NO SUPPLIER CREATION HAPPENS IN THE ORCHESTRATOR.**

### Verdict:
- Velocity: **NOT IMPLEMENTED** (no supplier creation = no approved mappings)
- Approved %: **NOT IMPLEMENTED** (no mappings to count)
- Avg Time: **NOT IMPLEMENTED** (no lifecycle to measure)
- Coverage %: **NOT IMPLEMENTED** (no suppliers to measure)
- Risk Portfolio: **NOT IMPLEMENTED** (no suppliers to risk-score)
- Deadlines: **UI-ONLY** (hardcoded, not from regulatory API)

---

## SECTION 2: PIPELINE STAGE REALITY CHECK

### Current Pipeline Stages in UI:
1. Ingestion
2. Normalize  
3. Mapping Gate
4. Created

### Backend Reality Check:

**Evidence Entity States (entities/Evidence.json):**
```json
"state": {
  "enum": ["RAW", "CLASSIFIED", "STRUCTURED", "REJECTED"]
}
```

**Mapping from `getOperationalDashboard.js`:**
- Line 23: `pipeline.ingestion = evidence.filter(state === 'RAW')`
- Line 24: `pipeline.classification = evidence.filter(state === 'CLASSIFIED')`
- Line 25: `pipeline.mapping_gate = evidence.filter(state === 'STRUCTURED')`
- Line 26: `pipeline.decision = mappings.filter(status === 'APPROVED')`

### Reality:
| UI Stage | Backend Enforcement | Can Skip? | Verdict |
|----------|-------------------|-----------|---------|
| Ingestion | ✅ Evidence.state='RAW' | No | **ENFORCED** |
| Normalize | ⚠️ Evidence.state='CLASSIFIED' | **YES** - no transition guard | **NOT ENFORCED** |
| Mapping Gate | ⚠️ Evidence.state='STRUCTURED' | **YES** - no state machine | **NOT ENFORCED** |
| Created | ❌ MappingDecision.status='APPROVED' | **N/A** - no mappings created | **NOT IMPLEMENTED** |

### CRITICAL FINDING:
**NO STATE MACHINE EXISTS**

File scan results:
- `validateEvidenceUpdate.js` - NOT FOUND
- `validateEvidenceDelete.js` - EXISTS but not called
- State transition enforcement - **NOT IMPLEMENTED**

Evidence can jump from RAW → STRUCTURED without validation.

---

## SECTION 3: INGESTION PATH SIDE EFFECTS

### Path Analysis:

#### 1. Upload Documents (`SupplierOnboardingFlow.js`)
- **Creates Supplier?** Line 169: ⚠️ **ATTEMPTS TO** via `mappingGateEnforcer` but gate doesn't exist
- **Creates Evidence?** ✅ YES - Line 101: `uploadEvidenceWithHash`
- **Overwrites data?** ❌ NO
- **Auto-merge?** ❌ NO - waits for user decision
- **Immutable Evidence?** ✅ YES

**SIDE EFFECT DETECTED:**
Line 162-174: Calls `mappingGateEnforcer` which doesn't exist or isn't deployed.
This will throw 404 and block the entire flow.

#### 2. Supplier Portal (`SupplierInviteModal.js` - NOT IN SNAPSHOT)
- **Status:** NOT VERIFIED - file not read

#### 3. Bulk Import (`BulkImportWizard.js`)
- **Creates Supplier?** Line 91: Calls `supplierIngestionOrchestrator` which returns `next_action: 'user_approval_required'` - **NO AUTO-CREATION**
- **Creates Evidence?** ❌ **NO** - Only processes supplier_data
- **Overwrites data?** ❌ NO
- **Auto-merge?** ❌ NO
- **Immutable Evidence?** ❌ **NOT IMPLEMENTED**

**CRITICAL VIOLATION:**
Bulk import does NOT create Evidence records. It processes raw supplier_data without proof.

#### 4. ERP Sync (`UnifiedIngestionRouter.js`)
- Line 107-125: `handleERPSync`
- **Mode:** Line 117-122: Creates ERPSyncRun record - **SNAPSHOT CONFIRMED**
- **Real-time?** ❌ NO CDC, no webhooks, no event streaming
- **Creates Supplier?** Line 109-114: Calls orchestrator which returns preview - **NO AUTO-CREATION**
- **Creates Evidence?** ❌ **NO**

**Verdict:** ERP Sync is SNAPSHOT but doesn't create Evidence - **ARCHITECTURAL VIOLATION**

---

## SECTION 4: BACKEND OBJECT INVENTORY

### Objects Created by System:

1. **Evidence** 
   - Created: `uploadEvidenceWithHash` function
   - Trigger: User file upload in SupplierOnboardingFlow
   - Can exist without Supplier? ✅ YES (correct)

2. **Supplier**
   - Created: ⚠️ **NOT FOUND IN ORCHESTRATOR**
   - Trigger: ❌ UNKNOWN - no code path found
   - Can exist without Evidence? ⚠️ **CANNOT VERIFY** (creation not implemented)

3. **MappingDecision**
   - Created: ❌ **NOT FOUND**
   - Trigger: ❌ UNKNOWN
   - Can exist without Evidence? ⚠️ **CANNOT VERIFY**

4. **AuditLogEntry**
   - Created: Line 333-346 in `SupplyLensIngestionOrchestrator.js`
   - Trigger: Every ingestion attempt (success or failure)
   - Properly logged: ✅ YES

5. **ImportJob**
   - Created: Line 47-53 in `bulkImportProcessor.js`
   - Trigger: Bulk CSV import completion
   - Purpose: Import summary/metadata

### CRITICAL ARCHITECTURAL VIOLATION:

**Supplier entities CAN be created without Evidence.**

Scan of Supplier creation paths:
- SupplierOnboardingFlow line 536: "Approve & Create" button exists
- But orchestrator returns `next_action: 'user_approval_required'` with NO creation logic
- No function found that creates Supplier from MappingDecision

**CONCLUSION:** Either:
1. Supplier creation is missing (NOT IMPLEMENTED), OR
2. Supplier creation bypasses Evidence (ARCHITECTURAL VIOLATION)

---

## SECTION 5: AUTOMATION & SILENT LOGIC SCAN

### Automatic Behaviors Detected:

1. **Status Calculation**
   - Location: `enrichSupplierData` line 256
   - Logic: Hardcoded `data_completeness = 65`
   - Audit logged? ❌ NO
   - **VERDICT:** ⚠️ **FAKE METRIC** - not calculated, just assigned

2. **Coverage Calculation**
   - Location: `getOperationalDashboard.js` line 69-70
   - Logic: Queries `suppliers.filter(data_completeness >= 80)`
   - But data_completeness is hardcoded at 65!
   - **VERDICT:** 🔴 **BROKEN LOGIC** - will always return 0%

3. **Readiness Scoring**
   - Location: `getOperationalDashboard.js` line 95
   - Logic: `100 - (daysLeft / 365) * 100`
   - Source: ❌ **NONSENSE FORMULA** - readiness decreases with time?
   - **VERDICT:** 🔴 **MISLEADING METRIC**

4. **Approval Assignment**
   - Location: ❌ NOT FOUND
   - **VERDICT:** NOT IMPLEMENTED

5. **Deduplication**
   - Location: `SupplyLensIngestionOrchestrator.js` line 137-161
   - Logic: Fuzzy string matching (name + country + VAT)
   - Threshold: 0.75 (hardcoded)
   - Audit logged? ✅ YES (line 37-41)
   - **VERDICT:** ✅ **IMPLEMENTED & LOGGED**

6. **Data Overwrite**
   - Location: ❌ NOT FOUND
   - **VERDICT:** NOT IMPLEMENTED

### Automations Without Audit Logging:

1. **data_completeness = 65** (line 256 of orchestrator)
   - No audit log entry created
   - No justification for value
   - **ACTION:** DISABLE and replace with "NOT CALCULATED"

2. **Readiness calculation** (getOperationalDashboard.js line 95)
   - Nonsense formula
   - **ACTION:** DISABLE and replace with "NOT IMPLEMENTED"

---

## SECTION 6: DEVELOPER CONSOLE COMPLETENESS

### Current State:
- Developer Console exists: ✅ YES (`SupplyLensDeveloperConsole.js`)
- Populated with findings: ⚠️ PARTIAL (only includes technical issues, not architectural)
- Blocked features logged: ❌ NO

### Missing Developer Console Entries:

1. **Feature:** Operational Metrics
   - **Why blocked:** Supplier creation not implemented
   - **Risk:** False confidence in system maturity
   - **Required:** Implement supplier promotion from Evidence → Supplier with hash-chain audit

2. **Feature:** Risk Portfolio
   - **Why blocked:** data_completeness hardcoded, risk_level not calculated
   - **Risk:** Misleading compliance status
   - **Required:** Deterministic risk scoring algorithm

3. **Feature:** Real-time ERP Sync
   - **Why blocked:** Only snapshot mode implemented
   - **Risk:** Data staleness, race conditions
   - **Required:** CDC (Change Data Capture) with conflict resolution

4. **Feature:** Automatic Supplier Creation
   - **Why blocked:** Evidence-first enforcement
   - **Risk:** Unvetted suppliers in master data
   - **Required:** Human-in-loop approval for all promotions

5. **Feature:** Bulk Import Evidence Generation
   - **Why blocked:** NOT IMPLEMENTED
   - **Risk:** Suppliers created without proof
   - **Required:** Link every CSV row to an Evidence record

---

## FINAL TRUTH MATRIX

| Component | Claimed State | Actual State | Evidence |
|-----------|--------------|--------------|----------|
| Orchestrator | "Unified ingestion" | ✅ EXISTS | Returns preview, doesn't create entities |
| Mapping Gate | "Enforced validation" | ❌ **FUNCTION 404** | SupplierOnboardingFlow line 162 calls non-existent function |
| Evidence Pipeline | "Immutable proof" | ⚠️ **PARTIAL** | Upload creates Evidence, Bulk does NOT |
| Supplier Creation | "Gate-protected" | ❌ **NOT IMPLEMENTED** | No creation logic found in orchestrator |
| State Machine | "Lifecycle enforced" | ❌ **NOT IMPLEMENTED** | Evidence states not validated on update |
| Dedup | "Fuzzy matching" | ✅ **IMPLEMENTED** | Levenshtein + weighted score working |
| Audit Trail | "Immutable logging" | ⚠️ **PARTIAL** | Logged but not hash-chained |
| ERP Sync | "Real-time" | ❌ **SNAPSHOT ONLY** | No CDC, just bulk sync |
| Dashboard Metrics | "Real-time ops" | ❌ **ALL FAKE** | All metrics depend on Supplier creation which doesn't exist |

---

## IMMEDIATE ACTIONS REQUIRED

### Priority 0 - DISABLE IMMEDIATELY:
1. ✅ **DONE:** Disabled all operational metrics in UI
2. ✅ **DONE:** Blocked ERP sync with warning
3. 🔴 **TODO:** Remove `mappingGateEnforcer` call (returns 404)
4. 🔴 **TODO:** Add Evidence creation to Bulk Import
5. 🔴 **TODO:** Populate Developer Console with all 5 blocked features

### Priority 1 - FIX THIS WEEK:
6. Implement actual supplier creation logic
7. Add Evidence state machine validation
8. Replace hardcoded data_completeness with calculation
9. Remove fake readiness formula

### Priority 2 - ARCHITECTURAL:
10. Add hash-chain to audit logs
11. Implement transaction rollback
12. Add Evidence → Supplier promotion workflow

---

## HONEST SYSTEM STATE

**What Actually Works:**
- Evidence upload with SHA-256 hash ✅
- Fuzzy deduplication ✅
- Framework detection ✅
- Audit trail logging ✅
- Context-required uploads ✅

**What's Broken:**
- Supplier creation ❌
- Mapping gate (404) ❌
- All dashboard metrics ❌
- Bulk import evidence ❌
- State machine ❌
- Real-time ERP ❌

**Current Capability:**
SupplyLens can collect Evidence and detect duplicates, but CANNOT create Suppliers or produce compliance outputs.

**Honest Assessment:**
This is a **data collection prototype**, not a supplier hub. 

No supplier can be onboarded end-to-end without manual intervention.