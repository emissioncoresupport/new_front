# Contract 1 Data Mode Configuration & Verification Guide

## WHERE DATA_MODE IS SET

### 1. **Database Level: Company Entity**

**Entity Definition:** `entities/Company.json`

```json
{
  "name": "Company",
  "properties": {
    "tenant_id": { "type": "string" },
    "legal_name": { "type": "string" },
    "data_mode": {
      "type": "string",
      "enum": ["LIVE", "DEMO", "TEST"],
      "default": "LIVE",
      "description": "Data mode controls whether synthetic/test data is allowed"
    },
    "country_code": { "type": "string" }
  }
}
```

**Location:** Each Company record stores the tenant's immutable data_mode setting.

---

### 2. **UI Verification: SupplyLens Dashboard**

**Page:** `pages/SupplyLens.js` (Lines 26-36)

```javascript
const { data: tenantSettings = {} } = useQuery({
  queryKey: ['tenant-settings'],
  queryFn: async () => {
    const settings = await base44.asServiceRole.entities.Company.filter({
      tenant_id: 'CURRENT'
    });
    return settings?.[0] || { data_mode: 'LIVE' };
  }
});

const dataMode = tenantSettings?.data_mode || 'LIVE';
```

**How to verify at runtime:**
1. Navigate to SupplyLens page
2. Check header in Ingest & Seal tab
3. Data mode is queried from Company entity and passed to components
4. All server functions read this from `Company.filter({ tenant_id })` on each request

---

### 3. **Server-Side Enforcement**

**Ingestion Function:** `functions/ingestEvidenceDeterministic.js`

```javascript
// LOAD TENANT DATA_MODE (server-enforced, not client-settable)
const tenantRecords = await base44.asServiceRole.entities.Company.filter({ tenant_id: tenantId });
const dataModeServer = tenantRecords?.[0]?.data_mode || 'LIVE';

// RULE 1: Block TEST_FIXTURE in LIVE
if (dataModeServer === 'LIVE' && body.origin === 'TEST_FIXTURE') {
  return Response.json({
    ok: false,
    error_code: 'FIXTURE_BLOCKED_IN_LIVE',
    message: 'TEST_FIXTURE records cannot be created in LIVE mode',
    request_id: requestId
  }, { status: 403 });
}

// RULE 2: Block test execution in LIVE
if (dataModeServer === 'LIVE' && body.is_test_request === true) {
  return Response.json({
    ok: false,
    error_code: 'DATA_MODE_LIVE_BLOCKED',
    message: 'Test execution is blocked in LIVE mode',
    request_id: requestId
  }, { status: 403 });
}
```

---

## HOW TO VERIFY DATA_MODE

### Option 1: Check Dashboard (Recommended for Users)

1. Log in to app
2. Go to **SupplyLens → Ingest & Seal**
3. Look at the **Contract 1 Compliance Gate** card or header
4. Should display current data_mode: `TEST`, `DEMO`, or `LIVE`

### Option 2: API Query

**Function Call:**
```javascript
const tenantSettings = await base44.asServiceRole.entities.Company.filter({
  tenant_id: 'YOUR_TENANT_ID'
});
console.log('Data Mode:', tenantSettings[0].data_mode);
```

### Option 3: Via Test Functions

**Request:**
```
POST /functions/contract1VerificationHarness
```

**Response includes:**
```json
{
  "ok": true,
  "tenant_id": "TEST_TENANT_xyz",
  "audit_log": [
    {
      "step": "SETUP",
      "tenant_id": "TEST_TENANT_xyz",
      "data_mode": "TEST"
    }
  ]
}
```

---

## SETTING DATA_MODE (Admin Only)

To change data_mode for a tenant:

```javascript
const base44 = createClientFromRequest(req);

// Admin-only operation
const adminUser = await base44.auth.me();
if (adminUser.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

// Update Company record
await base44.asServiceRole.entities.Company.update(company_id, {
  data_mode: 'TEST'  // 'LIVE', 'DEMO', or 'TEST'
});
```

---

## RUNTIME VALUE VERIFICATION

### When Tests Run in TEST Mode:

1. **Test Setup** → Creates tenant with `data_mode: TEST`
2. **A1 Test** → Attempts test with `is_test_request=true` in TEST mode → Should PASS (allowed)
3. **A2 Test** → Attempts TEST_FIXTURE in TEST mode → Should PASS (allowed)

### When Tests Run in LIVE Mode:

1. **A1 Test** → Attempts test with `is_test_request=true` in LIVE mode → Should FAIL with 403 DATA_MODE_LIVE_BLOCKED
2. **A2 Test** → Attempts TEST_FIXTURE in LIVE mode → Should FAIL with 403 FIXTURE_BLOCKED_IN_LIVE

---

## KEY ENFORCEMENT POINTS

### Server-Side Guards (Non-Negotiable)

| Guard | Condition | Response | Code |
|-------|-----------|----------|------|
| **Fixture Block** | data_mode=LIVE AND origin=TEST_FIXTURE | 403 | FIXTURE_BLOCKED_IN_LIVE |
| **Test Block** | data_mode=LIVE AND is_test_request=true | 403 | DATA_MODE_LIVE_BLOCKED |
| **Invalid JSON** | Malformed JSON body | 400 | INVALID_JSON |
| **Missing Metadata** | Required fields missing | 422 | MISSING_REQUIRED_METADATA |
| **Invalid Retention** | Invalid retention_policy | 422 | INVALID_RETENTION_OR_DATE |
| **Sealed Immutable** | Update on SEALED record | 409 | SEALED_IMMUTABLE |
| **Idempotency Conflict** | API_PUSH same key, different payload | 409 | IDEMPOTENCY_CONFLICT |
| **Tenant Isolation** | Cross-tenant read | 404 | NOT_FOUND |

---

## AUDIT LOG VERIFICATION

Each request includes a correlation ID in the response:

```json
{
  "ok": true,
  "evidence_id": "...",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "..."
}
```

This `request_id` is logged in `AuditEvent.context_json` and server logs for traceability.

---

## PROOF CHECKLIST

- [ ] Data mode is stored in Company.data_mode
- [ ] Data mode is loaded server-side, not client-settable
- [ ] TEST mode allows fixtures and test execution
- [ ] LIVE mode blocks fixtures (403 FIXTURE_BLOCKED_IN_LIVE)
- [ ] LIVE mode blocks tests (403 DATA_MODE_LIVE_BLOCKED)
- [ ] Invalid inputs return 400/422 never 500
- [ ] Sealed records are immutable (409)
- [ ] Cross-tenant access returns 404 (no leakage)
- [ ] API_PUSH idempotency enforced
- [ ] All responses include request_id for audit trail