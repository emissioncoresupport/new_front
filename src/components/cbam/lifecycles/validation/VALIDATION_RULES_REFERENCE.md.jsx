# CBAM Validation Rules Reference

**Version:** 2.0  
**Last Updated:** January 20, 2026  
**Regulatory Basis:** C(2025) 8150, 8151, 8552, Reg 2023/956

---

## 📋 VALIDATION RULE SETS

### **RULE SET A: DATA COMPLETENESS & CONSISTENCY**

**Regulation:** C(2025) 8151 Art. 16(1), Reg 2023/956

| Field | Rule | Severity | Validation |
|-------|------|----------|------------|
| `cn_code` | Must be 8 digits | BLOCKING | Regex: `^\d{8}$` |
| `country_of_origin` | Mandatory | BLOCKING | Non-empty string |
| `quantity` | Must be > 0 | BLOCKING | `quantity > 0` |
| `reporting_period_year` | Must be >= 2026 | BLOCKING | `year >= 2026` |
| `functional_unit` | Must be 'tonnes' | WARNING | Default to tonnes if missing |

---

### **RULE SET B: MATERIALITY THRESHOLD**

**Regulation:** C(2025) 8150 Art. 5

**Threshold:** 5%

**Formula:**
```
variance_percent = |reported_emissions - benchmark_emissions| / benchmark_emissions * 100

IF variance_percent > 5%:
  → WARNING: Documentation required
  → Flag: materiality_assessment_5_percent = false
```

**Outcome:**
- **≤5%:** No action required
- **>5%:** Documentation mandatory, flag for review

**Evidence Required:**
- Explanation of variance
- Supporting production data
- Verification report

---

### **RULE SET C: METHOD ELIGIBILITY**

**Regulation:** C(2025) 8151 Chapters 2-3

| Method | Requirements | Verification | Outcome |
|--------|--------------|--------------|---------|
| `actual_values` | Operator data + monitoring plan | ✅ Accredited verifier MANDATORY | ACCEPTED if verified |
| `EU_method` | Operator data + monitoring plan | ✅ Accredited verifier MANDATORY | ACCEPTED if verified |
| `default_values` | No operator data available | ❌ Not required | ACCEPTED with markup |
| `combined_actual_default` | Partial operator data | ⚠️ Partial verification | ACCEPTED if documented |

**Fallback Hierarchy:**
```
1. Actual (if verified) → PREFERRED
2. Combined (if partial verification) → ACCEPTABLE
3. Default with markup (if no data) → LAST RESORT
```

**Markup Applied to Defaults:**
- 2026: +10%
- 2027: +20%
- 2028-2030: +30%

---

### **RULE SET D: PRECURSOR COMPLETENESS**

**Regulation:** C(2025) 8151 Art. 13-15

**Requirements for Complex Goods:**

1. **Reporting Year Alignment (Art. 14(2)):**
   - Default: Precursor year = Complex good year
   - Exception: Different year allowed WITH evidence

2. **Installation Traceability (Art. 14(3)):**
   - `production_installation_id` SHOULD be provided
   - Missing = WARNING, not blocking

3. **Emission Data (Art. 13):**
   - `emissions_embedded` OR `emissions_intensity_factor` REQUIRED
   - Missing = BLOCKING

4. **Value Type Declaration:**
   - `value_type`: 'actual' or 'default'
   - Actual requires verification
   - Default uses Table 6 values

**Example Validation:**
```json
{
  "precursor_cn_code": "72011000",
  "quantity_consumed": 50,
  "reporting_period_year": 2026,
  "production_installation_id": "INST-001",
  "emissions_embedded": 75.5,
  "value_type": "actual"
}
```

**Validation Checks:**
- ✅ Has emission data
- ✅ Year matches complex good
- ✅ Installation referenced
- ✅ Value type declared
- → **PASS**

---

### **RULE SET E: VERIFICATION REQUIREMENTS**

**Regulation:** C(2025) 8151 Chapter 5

**State Machine:**
```
not_verified → verification_requested → accredited_verifier_satisfactory | accredited_verifier_unsatisfactory
```

**Method-Specific Rules:**

| Method | Verification Status | Validation Outcome |
|--------|---------------------|-------------------|
| Actual | not_verified | BLOCKING ERROR |
| Actual | verification_requested | BLOCKING ERROR (pending) |
| Actual | accredited_verifier_satisfactory | PASS |
| Actual | accredited_verifier_unsatisfactory | BLOCKING ERROR |
| Default | any | PASS (not required) |

**Evidence Requirements:**
- Verification report ID mandatory for actual methods
- Verifier must be accredited per C(2025) 8151 Annex V

---

### **RULE SET F: CARBON PRICE DEDUCTION**

**Regulation:** Reg 2023/956 Art. 9

**Requirements:**
```
IF carbon_price_due_paid > 0:
  THEN carbon_price_certificate_url MUST be provided
  AND carbon_price_scheme_name SHOULD be provided
```

**Validation:**
- Missing certificate → BLOCKING
- Missing scheme name → WARNING

**Accepted Schemes:**
- EU ETS
- UK ETS
- Swiss ETS
- California Cap-and-Trade
- China National ETS

---

## 🔄 VALIDATION WORKFLOW

### **Automatic Validation Trigger:**
```
CALCULATION_COMPLETED event
  ↓
ValidationService.validateAndUpdate()
  ↓
Evaluate ALL rule sets
  ↓
Compute validation_status (PASS/WARNING/BLOCKED)
  ↓
Update entry with results
  ↓
Log mandatory audit trail
  ↓
Emit ENTRY_VALIDATED event
```

### **Manual Validation Trigger:**
```
User clicks "Validate" button
  ↓
UI calls ValidationService.validateAndUpdate(entryId)
  ↓
Service re-evaluates rules
  ↓
Returns updated validation result
```

---

## 📊 VALIDATION OUTPUT STRUCTURE

```javascript
{
  validation_status: "PASS" | "WARNING" | "BLOCKED",
  valid: boolean,
  compliance_score: 85, // 0-100
  
  blocking_issues: [
    {
      rule: "CN_CODE_FORMAT",
      field: "cn_code",
      severity: "BLOCKING",
      message: "CN code must be exactly 8 digits",
      regulation: "C(2025) 8151 Art. 16(1)",
      current_value: "1234567"
    }
  ],
  
  warnings: [
    {
      rule: "MATERIALITY",
      field: "total_embedded_emissions",
      severity: "WARNING",
      message: "Variance 7.2% exceeds 5% materiality threshold",
      regulation: "C(2025) 8150 Art. 5",
      variance_percent: 7.2
    }
  ],
  
  applied_rules: [
    "DATA_COMPLETENESS",
    "MATERIALITY_ASSESSMENT",
    "METHOD_ELIGIBILITY",
    "PRECURSOR_COMPLETENESS",
    "CARBON_PRICE_DEDUCTION"
  ],
  
  materiality_result: {
    variance_percent: 7.2,
    threshold: 5.0,
    exceeds_threshold: true,
    reported: 150.5,
    benchmark: 140.0,
    regulation: "C(2025) 8150 Art. 5"
  },
  
  method_acceptance: {
    method: "actual_values",
    reason: "ACCEPTED: Actual emissions with satisfactory verification",
    accepted: true
  },
  
  precursor_validation: {
    complete: true,
    issues: []
  },
  
  regulatory_references: {
    validation_version: "2.0",
    primary_regulation: "C(2025) 8151",
    materiality_regulation: "C(2025) 8150",
    default_values_regulation: "C(2025) 8552"
  },
  
  validated_at: "2026-01-20T14:30:00Z",
  validated_by: "user@example.com"
}
```

---

## 🚨 BLOCKING vs WARNING

### **BLOCKING Issues:**
- Prevent report submission
- Require correction before proceeding
- Examples:
  - Invalid CN code format
  - Missing mandatory fields
  - Actual method without verification
  - Carbon price deduction without certificate

### **WARNING Issues:**
- Allow report submission with documentation
- Flagged for review
- Examples:
  - Materiality threshold exceeded
  - Precursor missing installation reference
  - Unknown calculation method
  - Missing optional fields

---

## 🔐 ENFORCEMENT GUARANTEES

### **1. No Validation Logic Outside This Service**
- ✅ UI components CANNOT validate
- ✅ Calculation engine CANNOT validate
- ✅ Reporting service CANNOT validate
- ✅ ONLY ValidationService validates

### **2. Read-Only Validation**
- ✅ Validation NEVER modifies emission values
- ✅ Validation NEVER recalculates
- ✅ Validation ONLY updates validation_status fields

### **3. Deterministic & Reproducible**
- ✅ Same entry + same rules = same result
- ✅ All rules versioned
- ✅ Audit trail captures rule versions

### **4. Mandatory Audit**
- ✅ Every validation logs audit entry
- ✅ Audit includes all applied rules
- ✅ Audit includes compliance score

---

**Last Updated:** January 20, 2026  
**Maintained By:** Platform Architect  
**Status:** Production Active