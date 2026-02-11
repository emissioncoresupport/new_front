# CBAM 2026 DEFINITIVE REGIME - COMPLIANCE AUDIT
## Full Regulatory Audit as of January 12, 2026

---

## EXECUTIVE SUMMARY

**Current Compliance Status: ~30%**

Critical gaps identified:
- ✅ Quarterly reporting framework exists
- ✅ Basic certificate management exists  
- ❌ **€150 threshold obsolete** → Must be 50 tonnes annual
- ❌ **Benchmarks outdated** → No 2026 official benchmarks implemented
- ❌ **Default values wrong** → Missing 10%/20%/30% phased markup
- ❌ **Pricing broken** → Quarterly vs weekly pricing not distinguished
- ❌ **Precursor calculations incomplete** → Art. 13-15 partially implemented
- ❌ **Monitoring plan validation missing** → English-only requirement not enforced
- ❌ **Free allocation wrong** → 2.5% CBAM factor for 2026 not applied
- ❌ **Verification workflow incomplete** → C(2025) 8150 not implemented

---

## OFFICIAL 2026 REGULATIONS

### Primary Legislation
1. **Regulation (EU) 2023/956** - Base CBAM Regulation
2. **C(2025) 8151** - Methodology (10 Dec 2025) ✅ Retrieved
3. **C(2025) 8150** - Verification (10 Dec 2025)
4. **C(2025) 8552** - Default Values (16 Dec 2025) ✅ Retrieved
5. **C(2025) 8560** - Certificate Pricing (10 Dec 2025) ✅ Retrieved
6. **CBAM Omnibus Regulation** - Simplifications

---

## DETAILED COMPLIANCE GAPS

### 1. DE MINIMIS THRESHOLD ❌ CRITICAL

**Current Implementation:**
```javascript
// OBSOLETE CODE - Remove completely
if (totalCBAMCost < 150) {
  return { exempt: true, reason: "€150 threshold" };
}
```

**2026 Requirement (CBAM Omnibus):**
- **50 tonnes per year** cumulative threshold
- Applies to **all Annex I goods combined** per legal entity
- Mass-based, not value-based
- Checked annually, not per shipment

**Required Implementation:**
```javascript
// Calculate cumulative annual imports per company
const annualTonnage = await calculateAnnualCBAMTonnage({
  company_id,
  reporting_year: 2026,
  goods: ['iron_steel', 'aluminium', 'cement', 'fertilizers', 'hydrogen', 'electricity']
});

if (annualTonnage < 50) {
  return {
    status: 'exempt',
    reason: 'Below 50 tonnes annual threshold (Omnibus Art. 2)',
    annualTonnage,
    nextCheck: '2027-01-01'
  };
}
```

**Action Items:**
- [ ] Remove all €150 threshold logic
- [ ] Create `CBAMDeMinimisTracker` component
- [ ] Add annual tonnage aggregation function
- [ ] Update validation rules

---

### 2. CERTIFICATE PRICING ❌ CRITICAL

**Current Implementation:**
- Single price field
- No quarterly vs weekly distinction
- Manual price entry

**2026 Requirement (C(2025) 8560):**

**For 2026 ONLY:**
- Quarterly average of EU ETS auction clearing prices
- Calculated first week of following quarter
- Q1-2026 price published week of April 7, 2026
- Weighted by auction volume

**From 2027 onwards:**
- Weekly average (calendar week)
- Calculated Monday of following week
- Published within 2 working days

**Required Implementation:**
```javascript
// Certificate pricing logic
const pricing = {
  year: 2026,
  periods: [
    { quarter: 'Q1', price: null, published: '2026-04-07' },
    { quarter: 'Q2', price: null, published: '2026-07-06' },
    { quarter: 'Q3', price: null, published: '2026-10-05' },
    { quarter: 'Q4', price: null, published: '2027-01-05' }
  ]
};

// From 2027
const pricing2027 = {
  year: 2027,
  pricingMode: 'weekly',
  weeks: [ /* weekly prices */ ]
};
```

**Action Items:**
- [ ] Update `CBAMCertificatePricingService` to distinguish 2026 vs 2027+
- [ ] Add quarterly pricing widget for 2026
- [ ] Implement EU ETS auction data fetcher (weighted average)
- [ ] Add automatic price publication calendar

---

### 3. DEFAULT VALUES & MARKUPS ❌ CRITICAL

**Current Implementation:**
- Static default values from transitional period
- No markup applied

**2026 Requirement (C(2025) 8552):**

**Phased Markup Schedule:**
- **2026: 10%** markup on default values
- **2027: 20%** markup on default values  
- **2028: 30%** markup on default values

**Fertilizers Exception:**
- Lower markup applies (sector-specific)

**Formula:**
```
Default Value (2026) = Base Default × 1.10
Default Value (2027) = Base Default × 1.20
Default Value (2028) = Base Default × 1.30
```

**Precursors with Unknown Origin:**
- Use highest emission intensity country for that precursor (Annex IV)

**Action Items:**
- [ ] Download and parse Annex I from C(2025) 8552 (official 2026 default values)
- [ ] Implement phased markup calculation
- [ ] Create `CBAM2026DefaultValues` constant file
- [ ] Add fertilizer-specific markup logic
- [ ] Implement precursor unknown-origin logic (max value)

---

### 4. BENCHMARKS & FREE ALLOCATION ❌ CRITICAL

**Current Implementation:**
- Uses transitional benchmarks
- No phasing schedule

**2026 Requirement:**

**CBAM Factor (Art. 31 & Free Allocation Regulation):**
- **2026: 2.5%** of embedded emissions subject to CBAM
- **2027: 5%**
- **2028: 10%**
- **2029: 20%**
- ... scaling to **100% by 2034**

**Formula:**
```
Certificates Required = (Total Embedded Emissions - Free Allocation) × CBAM Factor

2026: Certificates = (Emissions - FAA) × 0.025
2027: Certificates = (Emissions - FAA) × 0.05
```

**Free Allocation Benchmarks:**
- Product-specific benchmarks from C(2025) 8151 Annexes
- Aligned with EU ETS benchmarks but adjusted for CBAM

**Action Items:**
- [ ] Extract official 2026 benchmarks from C(2025) 8151
- [ ] Implement CBAM factor phasing (2.5% for 2026)
- [ ] Update `CBAMFreeAllocationBenchmark` entity
- [ ] Create year-aware benchmark selector
- [ ] Add phasing schedule widget

---

### 5. MONITORING PLANS ⚠️ PARTIAL

**Current Status:**
- Basic monitoring plan entity exists
- No validation of English language
- No completeness checks per Art. 10-12

**2026 Requirement (C(2025) 8151 Art. 10-12):**

**Mandatory Requirements:**
- **Language: English only** (Art. 10)
- Must include all elements per template
- Must be submitted before first import
- Must be approved by verifier before use
- Must be updated annually or when production changes

**Template Elements (Minimum):**
1. Installation identification
2. System boundaries
3. Production processes defined
4. Calculation methodology
5. Data collection procedures
6. Quality assurance/control
7. Responsible persons

**Action Items:**
- [x] Create `CBAMMonitoringPlanValidator` service ✅ (Already implemented)
- [x] Add English language enforcement ✅ (Already implemented)
- [ ] Add template completeness scoring
- [ ] Implement approval workflow
- [ ] Add expiry tracking (annual renewal)

---

### 6. PRECURSOR EMISSIONS 🟡 NEEDS IMPROVEMENT

**Current Status:**
- Basic precursor array on CBAMEmissionEntry ✅
- Some calculation logic exists
- No validation of Art. 13-15 requirements

**2026 Requirement (C(2025) 8151 Art. 13-15):**

**Complex Goods:**
- Must calculate precursor emissions embedded in final goods
- Example: Hot-rolled steel coil uses pig iron as precursor
- Precursor emissions = precursor's direct + indirect emissions

**Rules:**
- Default reporting period: same as complex good
- Can use different period if evidence provided
- Must track production installation ID for each precursor
- Can use default values if actual not available

**Action Items:**
- [ ] Validate precursor reporting period logic
- [ ] Add precursor installation tracking
- [ ] Implement Art. 14 (actual values for precursors)
- [ ] Implement Art. 15 (default values for precursors)
- [ ] Add precursor evidence upload

---

### 7. VERIFICATION REQUIREMENTS ❌ NOT IMPLEMENTED

**Current Status:**
- Basic verification status field
- No accredited verifier workflow
- No C(2025) 8150 compliance

**2026 Requirement (C(2025) 8150 - Verification Regulation):**

**Mandatory Verification:**
- All actual emissions must be verified by accredited CBAM verifier
- Verification opinion: Satisfactory / Satisfactory with comments / Unsatisfactory
- Materiality threshold: 5% (C(2025) 8150 Art. 5)
- Verifier must check monitoring plan compliance

**Verification Report Must Include:**
1. Verification opinion
2. Findings (if any)
3. Materiality assessment
4. Recommendations
5. Verifier accreditation details

**Action Items:**
- [ ] Create `CBAMVerifier` onboarding workflow
- [ ] Build `CBAMVerificationReport` generation
- [ ] Implement 5% materiality threshold checks
- [ ] Add verification opinion workflow
- [ ] Create accredited verifier directory

---

### 8. QUARTERLY REPORTING 🟡 EXISTS BUT INCOMPLETE

**Current Status:**
- Quarterly report entity exists ✅
- Basic submission tracking ✅
- Missing validation checks

**2026 Requirement:**

**Deadlines (Art. 6):**
- Q1 2026: Due May 31, 2026
- Q2 2026: Due August 31, 2026
- Q3 2026: Due November 30, 2026
- Q4 2026: Due February 28, 2027

**Certificate Surrender Deadline:**
- **May 31, 2027** for all 2026 imports (Annual)
- **Exception 2027**: First surrender deadline postponed to September 30, 2027

**Report Must Include:**
- All imports for the quarter
- Embedded emissions (direct + indirect + precursors)
- Carbon price paid in origin country (if any)
- Verification status
- Link to monitoring plans & operator reports

**Action Items:**
- [ ] Add automated deadline calculation
- [ ] Implement pre-submission validation (blocking)
- [ ] Create quarterly report summary generator
- [ ] Add certificate surrender tracking (2027-05-31)
- [ ] Build XML export for CBAM Registry

---

### 9. CALCULATION ENGINE ❌ PARTIALLY BROKEN

**Current Status:**
- `cbamCalculationEngine` function exists
- Uses outdated benchmarks
- No 2026 methodology alignment

**2026 Requirement (C(2025) 8151 - Calculation Methodology):**

**System Boundaries:**
- Direct emissions from installation
- Indirect emissions from electricity (if not Annex II goods)
- Precursor emissions (for complex goods)

**Attribution Method:**
- Weighted average if multiple production routes in same installation (Art. 4(6))
- Must use functional unit (tonnes, kWh, kg N, etc.)

**Calculation Steps:**
1. Determine production process
2. Monitor installation-level emissions
3. Attribute emissions to production process
4. Calculate specific emissions per functional unit
5. Attribute to individual goods

**Action Items:**
- [ ] Rewrite calculation engine per C(2025) 8151
- [ ] Implement weighted average for multi-route installations
- [ ] Add functional unit mapping (Art. 4)
- [ ] Update attribution logic
- [ ] Add calculation audit trail

---

### 10. REGISTRY INTEGRATION ❌ NOT IMPLEMENTED

**Current Status:**
- No CBAM Registry API integration
- No authorisation management
- No certificate purchase flow

**2026 Requirement:**

**CBAM Registry (Official EU System):**
- Authorised declarant must register via Registry
- Account number format: EU-CBAM-[MS]-[Number]
- Certificate purchase must be via Registry
- Annual declaration submitted via Registry

**Required APIs:**
1. Authorisation Management Module (AMM)
2. Certificate Purchase Module
3. Declaration Submission Module
4. Certificate Surrender Module

**Action Items:**
- [ ] Research CBAM Registry API documentation
- [ ] Implement OAuth/API key integration
- [ ] Build certificate purchase workflow
- [ ] Create declaration XML generator (per official schema)
- [ ] Add certificate surrender tracking

---

### 11. DATA QUALITY & VALIDATION ⚠️ WEAK

**Current Status:**
- Basic field validation
- No regulatory compliance checks
- No 5% materiality assessment

**2026 Requirement:**

**Validation Rules:**
- CN codes must be from Annex I ✅ (Partially implemented)
- Reporting year cannot be before 2026 ✅ (Implemented)
- EORI format validation (EU regex) ❌
- Emissions > 0 ❌
- Installation ID required for actual values ❌
- Monitoring plan ID required for actual values ❌

**Materiality Assessment (C(2025) 8150 Art. 5):**
- If emissions deviate >5% from similar entries → flag for review
- Compare by CN code + country + production route

**Action Items:**
- [ ] Strengthen field validation
- [ ] Add EORI format validator (EU-specific)
- [ ] Implement 5% materiality checks
- [ ] Create data quality scoring
- [ ] Add pre-submission blocking validation

---

### 12. ELECTRICITY SPECIAL RULES ❌ NOT IMPLEMENTED

**Current Status:**
- Basic electricity imports handled
- No actual emission factor tracking
- No criteria validation (Annex IV points 5-6)

**2026 Requirement (C(2025) 8151):**

**Using Actual Emissions for Electricity:**
Must meet ALL criteria (Annex IV points 5-6):
1. Power Purchase Agreement (PPA) or equivalent
2. No network congestion on path
3. Measurement via smart meters at both ends
4. Nomination of capacity at interconnector
5. Temporal matching (hourly or better)

**If criteria not met:**
- Use country grid emission factor (default)
- 5-year rolling average per C(2025) 8552 Annex II

**Action Items:**
- [ ] Implement PPA evidence upload & validation
- [ ] Add smart meter data requirements
- [ ] Create electricity criteria checklist
- [ ] Implement country grid emission factors (5-year avg)
- [ ] Build electricity-specific calculation path

---

## ARCHITECTURE & SCALABILITY ISSUES

### Current Problems:

1. **No Multi-Tenant Isolation in CBAM Module**
   - Other modules use `getCurrentCompany()` consistently
   - CBAM queries don't filter by `tenant_id`
   - Risk of data leakage

2. **Calculation Engine is Monolithic**
   - Single 500+ line function
   - Hard to test
   - Hard to update for new regulations

3. **No Event-Driven Architecture**
   - Manual recalculation required
   - No automatic updates when prices change
   - No audit trail

4. **Missing Service Layer**
   - Business logic mixed with UI
   - Hard to reuse across modules
   - No clear boundaries

5. **No Caching Strategy**
   - Benchmarks/default values fetched every time
   - Slow dashboard loading
   - Unnecessary DB load

### Required Refactoring:

```
components/cbam/
├── services/
│   ├── CBAMCalculationEngine2026.js ← NEW (modular)
│   ├── CBAMValidationEngine.js ← EXISTS (needs update)
│   ├── CBAMPricingService.js ← EXISTS (broken)
│   ├── CBAMBenchmarkService.js ← NEW
│   ├── CBAMDefaultValueService.js ← NEW
│   ├── CBAMPrecursorService.js ← NEW
│   ├── CBAMVerificationService.js ← NEW
│   └── CBAMRegistryAPIClient.js ← NEW
├── constants/
│   ├── official2026Benchmarks.js ← NEW
│   ├── official2026DefaultValues.js ← NEW
│   ├── cbamFactorSchedule.js ← NEW
│   └── validationRules2026.js ← NEW
└── hooks/
    ├── useCBAMCalculation.js ← NEW
    ├── useCBAMPricing.js ← NEW
    └── useCBAMValidation.js ← NEW
```

---

## PRIORITY ACTION PLAN

### Phase 1: CRITICAL FIXES (Week 1-2)
**Goal: Make system legally compliant for 2026**

1. ✅ **De Minimis Threshold** 
   - Remove €150 logic
   - Implement 50 tonnes tracking
   - Add company-level annual aggregation

2. ✅ **Certificate Pricing**
   - Distinguish 2026 (quarterly) vs 2027+ (weekly)
   - Update pricing widget
   - Add EU ETS price fetcher

3. ✅ **Default Values & Markups**
   - Download C(2025) 8552 Annexes
   - Implement 10% markup for 2026
   - Create constants file

4. ✅ **CBAM Factor (2.5%)**
   - Update free allocation calculation
   - Add phasing schedule
   - Fix certificate requirement formula

5. ✅ **Monitoring Plan English Validation**
   - Enforce English-only
   - Add completeness checks
   - Block non-compliant submissions

### Phase 2: CALCULATION ENGINE (Week 3-4)
**Goal: Accurate emissions calculations**

6. ⬜ **Rewrite Calculation Engine**
   - Modular architecture
   - C(2025) 8151 compliance
   - Unit tests

7. ⬜ **Precursor Logic Enhancement**
   - Art. 13-15 full implementation
   - Validation rules
   - Evidence tracking

8. ⬜ **Benchmarks Update**
   - Extract 2026 official benchmarks
   - Create benchmark service
   - Add caching

### Phase 3: VERIFICATION & QUALITY (Week 5-6)
**Goal: Data integrity and verifier workflow**

9. ⬜ **Verification Workflow**
   - Verifier onboarding
   - Verification reports
   - Materiality checks (5%)

10. ⬜ **Data Quality Engine**
    - Field validation strengthening
    - EORI validation
    - Pre-submission checks

### Phase 4: REGISTRY INTEGRATION (Week 7-8)
**Goal: Official EU CBAM Registry integration**

11. ⬜ **Registry API Research**
    - API documentation
    - Authentication
    - Test environment access

12. ⬜ **XML Generation**
    - Official schema implementation
    - Validation against XSD
    - Submission workflow

### Phase 5: SCALABILITY & POLISH (Week 9-10)
**Goal: Production-ready, scalable system**

13. ⬜ **Multi-Tenant Refactoring**
    - Add tenant_id filters everywhere
    - Row-level security
    - Company isolation tests

14. ⬜ **Performance Optimization**
    - Caching layer
    - Query optimization
    - Lazy loading

15. ⬜ **UI/UX Polish**
    - Dashboard improvements
    - Guided workflows
    - Error messaging

---

## TESTING REQUIREMENTS

### Unit Tests Needed:
- [ ] Calculation engine (all scenarios)
- [ ] Validation rules (all edge cases)
- [ ] Pricing calculations
- [ ] Precursor logic
- [ ] Default value selection with markup

### Integration Tests:
- [ ] Full import → calculation → reporting flow
- [ ] Multi-company isolation
- [ ] Certificate purchase flow
- [ ] Verification workflow

### Compliance Tests:
- [ ] C(2025) 8151 calculations match examples
- [ ] C(2025) 8552 default values applied correctly
- [ ] C(2025) 8560 pricing formula accurate
- [ ] 50-tonne threshold logic
- [ ] 2.5% CBAM factor for 2026

---

## DOCUMENTATION REQUIREMENTS

### Developer Docs:
- [ ] Architecture decision records
- [ ] API documentation
- [ ] Service layer documentation
- [ ] Calculation engine specification

### User Docs:
- [ ] CBAM 2026 compliance guide
- [ ] Step-by-step import workflow
- [ ] Verification process guide
- [ ] Registry integration guide

### Regulatory Docs:
- [ ] Mapping: Code → Regulation articles
- [ ] Compliance checklist
- [ ] Audit trail documentation

---

## ESTIMATED COMPLETION

- **Phase 1 (Critical):** 2 weeks → **January 26, 2026**
- **Phase 2 (Calculation):** 2 weeks → **February 9, 2026**
- **Phase 3 (Verification):** 2 weeks → **February 23, 2026**
- **Phase 4 (Registry):** 2 weeks → **March 9, 2026**
- **Phase 5 (Scale):** 2 weeks → **March 23, 2026**

**Total: 10 weeks to 100% compliance**

---

## CRITICAL NEXT STEPS (NOW)

1. **Download Official Annexes:**
   - C(2025) 8151 Annexes (benchmarks, methodology)
   - C(2025) 8552 Annexes (default values)
   - Parse into constants files

2. **Fix De Minimis:**
   - Remove €150 threshold TODAY
   - Implement 50 tonnes logic

3. **Fix Pricing:**
   - Update widget to show quarterly 2026 pricing
   - Add weekly 2027+ logic

4. **Fix CBAM Factor:**
   - Change from variable to 2.5% for 2026
   - Add year-based schedule

5. **Update Validation:**
   - Block reports with wrong benchmarks
   - Enforce monitoring plan requirements

---

**END OF AUDIT**

*Generated: January 12, 2026*  
*Regulations Version: Definitive Regime (C(2025) 8151, 8150, 8552, 8560)*  
*Next Review: March 2026 (post Phase 3)*