# CBAM–CSRD Reconciliation Architecture

**Version:** 2.0  
**Date:** January 20, 2026  
**Regulatory Framework:** Reg 2023/956 (CBAM) + Directive 2022/2464 (CSRD/ESRS)

---

## 🎯 PURPOSE

Create a **read-only, auditable reconciliation layer** between:
- **CBAM** (Carbon Border Adjustment Mechanism) financial obligations
- **CSRD** (Corporate Sustainability Reporting Directive) climate disclosures

**Goal:** Expose discrepancies, transition risk misstatements, and supplier-driven financial exposure without modifying source data.

---

## 🚫 NON-NEGOTIABLE RULES

### **Rule 1: Module Separation**
- ✅ CBAM and CSRD remain independent modules
- ❌ No data merging or cross-module mutations
- ✅ Reconciliation is comparison only

### **Rule 2: Read-Only Analysis**
- ✅ Service reads CBAM and CSRD data
- ❌ Service NEVER recalculates or modifies either
- ✅ Service only flags discrepancies

### **Rule 3: Audit-Ready Outputs**
- ✅ All reconciliation results are logged
- ✅ CFO and auditor-grade transparency
- ✅ Regulatory references included

### **Rule 4: AI Role Limited**
- ✅ AI may explain discrepancies
- ❌ AI may NOT correct or approve changes
- ✅ AI explanations clearly labeled

### **Rule 5: No Silent Mutations**
- ❌ No automatic disclosure updates
- ❌ No automatic CBAM adjustments
- ✅ All changes require explicit user approval

---

## 📊 RECONCILIATION SCOPE

### **A. EMISSIONS ALIGNMENT**

**Mapping:**
```
CBAM total_embedded_emissions
  ↓
CSRD ESRS E1-6 Scope 3 Category 1 (Purchased goods and services)
```

**Boundary Check:**
- CBAM scope: Imported goods in Annex I only
- CSRD scope: All purchased goods and services
- **Expected:** CBAM ≤ CSRD Scope 3 Cat 1

**Flags:**
- `MATERIAL_VARIANCE`: Delta > 10%
- `MODERATE_VARIANCE`: Delta > 5%
- `POTENTIAL_UNDER_DISCLOSURE`: CBAM > CSRD (unexpected)

---

### **B. FINANCIAL RECONCILIATION**

**Comparison:**
```
CBAM Certificate Cost Exposure (certificates × ETS price)
  vs
CSRD ESRS E1-9 Transition Risk Financial Impact
```

**Assumptions Check:**
- CBAM uses: Live EU ETS price
- CSRD uses: Disclosed carbon price assumption
- **Flag if:** Price delta > €15/tCO₂

**Flags:**
- `MATERIAL_FINANCIAL_VARIANCE`: Delta > 20%
- `CARBON_PRICE_INCONSISTENCY`: Price assumptions differ
- `UNDERSTATED_TRANSITION_RISK`: CBAM cost >> CSRD disclosure

---

### **C. SUPPLIER RISK CONCENTRATION**

**Aggregation:**
- CBAM exposure by supplier
- Top suppliers by cost
- Suppliers using defaults (data quality risk)
- Unverified suppliers (compliance risk)

**CSRD Mapping:**
- → ESRS E1 narrative risk disclosures
- → CSDDD supplier due diligence (reference only)
- → ESRS 2 IRO-1 (Material impacts, risks, opportunities)

**Output:**
- Top 10 suppliers by CBAM cost
- Concentration % (how much exposure in top 10)
- Risk flags per supplier

---

### **D. TIME HORIZON CONSISTENCY**

**CBAM Timing:**
- Quarterly obligations (immediate, <1 year)
- Annual surrender requirements

**CSRD Timing:**
- Short-term: 1-3 years
- Medium-term: 3-5 years
- Long-term: 5+ years

**Flags:**
- `MISSING_SHORT_TERM_DISCLOSURE`: CBAM costs imminent but CSRD lacks short-term transition risk
- `UNREALISTIC_DEFERRAL`: CSRD defers impact to medium/long-term despite immediate CBAM obligations

---

## 🔄 RECONCILIATION WORKFLOW

```
User requests reconciliation
  ↓
Service fetches CBAM data (read-only)
  ↓
Service fetches CSRD data (read-only)
  ↓
Service compares across 4 dimensions:
  - Emissions alignment
  - Financial reconciliation
  - Supplier concentration
  - Time horizon consistency
  ↓
Service computes:
  - reconciliation_status (ALIGNED/PARTIAL/MISALIGNED)
  - Deltas (emissions, financial, carbon price)
  - Flags (severity, regulation, explanation)
  ↓
Service logs mandatory audit trail
  ↓
Service returns structured output
  ↓
UI displays results (read-only)
  ↓
Optional: AI explains discrepancies (no execution rights)
```

---

## 📋 RECONCILIATION OUTPUT STRUCTURE

```javascript
{
  reporting_year: 2026,
  overall_status: "MISALIGNED" | "PARTIAL" | "ALIGNED",
  high_severity_flags: 3,
  total_flags: 7,
  
  emissions_alignment: {
    reconciliation_status: "MISALIGNED",
    emissions_cbam_tco2e: 15000,
    emissions_csrd_scope3_cat1_tco2e: 12000,
    emissions_delta_tco2e: 3000,
    delta_percent: 25.0,
    flags: [
      {
        type: "POTENTIAL_UNDER_DISCLOSURE",
        severity: "HIGH",
        message: "CBAM data suggests CSRD Scope 3 may be understated",
        regulation: "ESRS E1-6"
      }
    ],
    cbam_entries_count: 120,
    csrd_data_source: "consolidated_scope3_reporting",
    boundary_notes: "CBAM includes only imported goods in Annex I scope"
  },
  
  financial_alignment: {
    reconciliation_status: "MISALIGNED",
    cbam_cost_exposure_eur: 1275000,
    cbam_certificates_required: 15000,
    cbam_ets_price_eur: 85.0,
    csrd_transition_risk_eur: 800000,
    csrd_carbon_price_assumption_eur: 75.0,
    financial_delta_eur: 475000,
    financial_delta_percent: 59.4,
    carbon_price_delta_eur: 10.0,
    flags: [
      {
        type: "UNDERSTATED_TRANSITION_RISK",
        severity: "HIGH",
        message: "CSRD transition risk disclosure may understate CBAM financial impact",
        regulation: "ESRS E1-9, ESRS 2 IRO-1"
      }
    ]
  },
  
  supplier_concentration: {
    total_suppliers: 45,
    top_10_suppliers: [...],
    top_10_cost_concentration_pct: 72.3,
    high_risk_suppliers_count: 8
  },
  
  time_horizon_alignment: {
    cbam_quarterly_obligations: [...],
    csrd_horizons: {...},
    consistency_check: "INCONSISTENT",
    flags: [...]
  },
  
  all_flags: [...],
  action_required: "3 high-severity discrepancies require review",
  generated_at: "2026-01-20T15:30:00Z",
  regulatory_framework: "CBAM Reg 2023/956 + CSRD Directive 2022/2464 (ESRS E1)"
}
```

---

## 🔐 ENFORCEMENT GUARANTEES

### **No Data Mutation:**
```javascript
// ✅ ALLOWED
const cbamData = await base44.entities.CBAMReport.list();
const csrdData = await base44.entities.CSRDDataPoint.list();
const delta = cbamData.total - csrdData.total;

// ❌ FORBIDDEN
await base44.entities.CSRDDataPoint.update(id, { value: cbamData.total });
await base44.entities.CBAMReport.update(id, { total: csrdData.total });
```

### **No Recalculation:**
```javascript
// ✅ ALLOWED
const variance = (cbam - csrd) / csrd * 100;

// ❌ FORBIDDEN
await CalculationService.recalculate(entryId);
await ValidationService.validate(entryId);
```

### **Mandatory Audit:**
```javascript
// ✅ ENFORCED
await AuditTrailService.log({
  lifecycle: 'RECONCILIATION',
  entity_type: 'EmissionsReconciliation',
  action: 'emissions_reconciled',
  details: { cbam, csrd, delta, status }
});
```

---

## 🤖 AI ASSISTANCE (LIMITED ROLE)

### **AI MAY:**
- Explain why discrepancies exist (boundary differences, timing, data sources)
- Suggest actions (supplier engagement, data quality improvement)
- Recommend ESRS data points to update

**Example AI Explanation:**
```
"The €475,000 financial variance exists because:
1. CBAM uses live ETS price (€85) vs CSRD assumption (€75)
2. CBAM includes 12 high-emission suppliers using default values
3. CSRD Scope 3 Cat 1 may exclude some import categories

Recommendations:
- Update ESRS E1-9 carbon price assumption to €85
- Engage top 5 suppliers to provide actual emissions data
- Review CSRD boundary definition for Scope 3 Category 1"
```

### **AI MAY NOT:**
- Modify CBAM entries
- Update CSRD data points
- Approve reconciliation
- Execute recommendations

---

## 🚨 BUILD ENFORCEMENT

**Build PASSES when:**
- ✅ Reconciliation service in `lifecycles/shared/`
- ✅ No writes to CBAM or CSRD entities
- ✅ All reconciliation results audited
- ✅ AI explanations clearly labeled

**Build FAILS when:**
- ❌ Reconciliation modifies source data
- ❌ Financial deltas hidden or suppressed
- ❌ AI has execution rights
- ❌ Audit trail missing

---

## 📈 USE CASES

### **Use Case 1: Pre-CSRD Report Review**
**Scenario:** Before submitting annual CSRD report, check CBAM alignment

**Workflow:**
1. Generate CBAM annual report
2. Run reconciliation for same year
3. Review flags
4. Update CSRD disclosures if needed (manual)
5. Re-run reconciliation
6. Submit CSRD report when aligned

---

### **Use Case 2: CFO Financial Planning**
**Scenario:** CFO needs to understand true carbon cost exposure

**Workflow:**
1. View reconciliation dashboard
2. See CBAM cost exposure vs CSRD disclosed transition risk
3. Identify understated financial impact
4. Update financial planning assumptions
5. Update CSRD ESRS E1-9 disclosures

---

### **Use Case 3: Supplier Risk Management**
**Scenario:** Identify which suppliers drive most CBAM cost

**Workflow:**
1. View supplier concentration analysis
2. See top 10 suppliers by cost
3. Flag suppliers using default values
4. Engage suppliers for actual emissions data
5. Track data quality improvement

---

## 📚 REGULATORY REFERENCES

| Aspect | CBAM Reference | CSRD Reference |
|--------|----------------|----------------|
| Emissions | Reg 2023/956 Art. 7 | ESRS E1-6 (Scope 3) |
| Financial Impact | Art. 22-24 (Certificates) | ESRS E1-9 (Financial effects) |
| Time Horizons | Art. 6 (Quarterly reporting) | ESRS 1 (Time horizons) |
| Supplier Risk | Art. 14-15 (Operator data) | ESRS 2 IRO-1 (Material risks) |

---

## ✅ COMPLIANCE CHECKLIST

**Reconciliation Service MUST:**
- [ ] Read CBAM data without modification
- [ ] Read CSRD data without modification
- [ ] Calculate deltas deterministically
- [ ] Flag material variances (>10% emissions, >20% financial)
- [ ] Log all reconciliations to audit trail
- [ ] Reference regulations in all outputs

**UI MUST:**
- [ ] Display reconciliation results read-only
- [ ] Highlight high-severity flags
- [ ] Show AI explanations with disclaimer
- [ ] Never allow direct data editing

**AI MUST:**
- [ ] Only explain, never execute
- [ ] Provide regulatory context
- [ ] Suggest actions, not perform them

---

**Last Updated:** January 20, 2026  
**Status:** Production Active  
**Maintained By:** Platform Architect