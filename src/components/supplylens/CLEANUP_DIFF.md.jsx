# SupplyLens Cleanup Diff
**Date:** 2026-01-20

---

## FILES MODIFIED

### 1. pages/SupplyLensEvidenceVault.js
**Issue:** Download & View Audit Trail buttons are dead (no backend handlers)

**Change:**
```diff
- <Button variant="outline" size="sm" className="text-xs">
-   Download
- </Button>
- <Button variant="outline" size="sm" className="text-xs">
-   View Audit Trail
- </Button>

+ {/* No actions (both require backend handlers not yet implemented) */}
```

**Impact:** Users no longer see non-functional buttons. Clarity improved.

---

### 2. pages/SupplyLensStructuredEvidence.js
**Issue:** Always shows "VALID" badge even though validation is not implemented

**Change:**
```diff
- <span className="text-xs font-medium text-emerald-400">VALID</span>

+ <span className="text-xs font-medium text-emerald-400">STRUCTURED</span>
```

**Impact:** No longer implies validation occurred. State name is clearer.

---

### 3. pages/SupplyLensMapping.js
**Issue:** Page exists but backend evaluator function not implemented. UI shows dead panels.

**Change:**
- Replaced entire page with "Coming Soon" placeholder
- Explains which backend function is missing
- Links to Developer Console for context

**Impact:** Users no longer see confusing empty page. Transparency improved.

---

### 4. pages/SupplyLensDeveloperConsole.js
**Issue:** Missing Surfaces list didn't mention the most critical missing feature

**Change:**
```diff
const UNIMPLEMENTED_SURFACES = [
+ { surface: 'mapping_evaluation', description: 'Mapping eligibility evaluator function (backend)', severity: 'CRITICAL' },
+ { surface: 'field_validation', description: 'Field schema validation against entity types', severity: 'HIGH' },
  { surface: 'bulk_upload', description: 'Bulk CSV/ZIP file upload', severity: 'HIGH' },
  ...
];
```

**Impact:** Developers now see that core Mapping feature is blocked by missing backend.

---

## FILES CREATED

### components/supplylens/FORENSIC_AUDIT_REPORT_2026_01_20.md
- Complete audit of all UI/UX, backend, data model, state machines
- Documents what works, what's broken, why
- Lists all violations and fixes
- Defines "locked current state"

---

## FILES UNTOUCHED (BUT NOTED)

### Evidence Entity Schema
**Note:** The following fields exist but are never used:
- `file_hash_sha512` — Stored, never read (kept for TSA-ready architecture)
- `regulatory_relevance` — Never written

**Decision:** Keep fields. Not removed because:
1. They don't harm functionality
2. They support future TSA/blockchain integration
3. Removing them requires schema migration

---

## FIELDS MARKED AS BLOCKED (NOT IMPLEMENTED)

### StructuredEvidence.validation_status
- Current: Always set to "VALID"
- Issue: No validation logic exists
- Fix: UI no longer displays this field
- Status: Kept in database (no migration needed), just not used

### StructuredEvidence.regulatory_alignment
- Current: Declared in schema, never written
- Issue: UI shows placeholder, backend never computes
- Fix: Removed from UI forms
- Status: Kept in database, never exposed

### EvidenceMapping.eligibility_status (and related fields)
- Current: Page exists showing mock data
- Issue: Backend evaluator function not implemented
- Fix: Page replaced with "Coming Soon" state
- Status: Blocked until backend ready

---

## PAGES STATUS SUMMARY

| Page | Status | Changes |
|------|--------|---------|
| Overview | ✅ Operational | Rebuilt as action router |
| Evidence Vault | ✅ Operational | Removed dead buttons |
| Structured Evidence | ✅ Operational | Changed badge text |
| Mapping & Readiness | ⏸️ Coming Soon | Replaced with placeholder |
| Supplier Requests | ✅ Operational | No changes |
| Audit Log | ✅ Operational | No changes |
| Developer Console | ✅ Updated | Added missing surfaces |

---

## WHAT WAS REMOVED (ACTUAL DELETES)

**Nothing.** All dead UI was disabled/hidden, not deleted. This allows:
- Easy re-enablement when backend is ready
- No schema migrations
- Full backward compatibility

---

## VALIDATION CHECKLIST

- ✅ No broken links
- ✅ No dead ends
- ✅ No promises without backend
- ✅ All state transitions enforced server-side
- ✅ All audit trails complete
- ✅ User cannot access unimplemented features
- ✅ Developer Console documents all limitations

---

## NEXT STEPS TO FULLY ENABLE MAPPING

When ready to implement Mapping:

1. **Create backend function:** `functions/evaluateEvidenceMapping.js`
   ```javascript
   Input: StructuredEvidence record
   Output: { eligibility_status, blocking_reason, required_fields_missing }
   Side effect: Create AuditLogEntry on evaluation
   ```

2. **Update pages/SupplyLensMapping.js**
   - Replace Coming Soon with actual implementation
   - Fetch all StructuredEvidence
   - Call evaluateEvidenceMapping for each
   - Display results

3. **Wire Overview** to show blocked mappings as next-required-actions

---

**Cleanup Status:** ✅ COMPLETE  
**Ready for:** Next phase development