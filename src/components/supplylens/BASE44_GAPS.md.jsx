# Base44 Platform Gaps - Contract 1 Kernel

**Last Updated:** 2026-01-27  
**Contract:** Evidence Ingestion Kernel v1  
**Status:** DOCUMENTED FOR GITHUB MIGRATION

---

## Critical Gaps Preventing Full Compliance

### 1. Build Versioning & Commit Hash

**Gap:** Base44 Deno functions cannot access git commit SHA or stable build identifier.

**Current Workaround:** Using `Date.now()` as temporary build_id (non-deterministic).

**Impact:** 
- Cannot reliably detect UI/server drift
- Test results cannot be tied to specific code versions
- Rollback verification impossible

**Required for GitHub:**
```javascript
const BUILD_ID = process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA;
```

---

### 2. Deterministic Retention Date Calculation

**Gap:** JavaScript `Date` varies by execution milliseconds.

**Current State:** 
```javascript
const retentionEnd = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);
```

**Issue:** Same `sealed_at_utc` + policy can yield different `retention_ends_utc` by milliseconds.

**Required:** Server-side canonical date math with timezone-aware UTC handling:
```python
retention_end = sealed_at + timedelta(days=retention_days)
```

---

### 3. Immutability Enforcement

**Gap:** Base44 entities can be updated/deleted via SDK.

**Current State:** `sealed_evidence` records are mutable - no database-level locks.

**Impact:** Sealed evidence can be altered → audit trail tamperable.

**Required:** PostgreSQL row-level security:
```sql
CREATE RULE sealed_no_update AS ON UPDATE TO sealed_evidence DO INSTEAD NOTHING;
CREATE RULE sealed_no_delete AS ON DELETE TO sealed_evidence DO INSTEAD NOTHING;
```

---

### 4. Tenant Isolation Validation

**Gap:** Base44 SDK does not enforce tenant_id foreign key integrity.

**Current State:** `scope_target_id` can reference entities in other tenants.

**Impact:** Cross-tenant data leakage possible.

**Required:** Server-side validation:
```javascript
const target = await db.query(
  'SELECT 1 FROM entities WHERE id = $1 AND tenant_id = $2',
  [scope_target_id, user.tenant_id]
);
if (!target) return 403;
```

---

### 5. Multi-File Merkle Root

**Gap:** Base44 file hash is per-file only. No merkle tree for multiple attachments.

**Current Workaround:** Using first attachment SHA-256 as `payload_hash_sha256`.

**Impact:** Cannot deterministically hash multiple files.

**Required:**
```javascript
function computeMerkleRoot(hashes) {
  let level = hashes.sort();
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const hash = sha256(level[i] + (level[i+1] || level[i]));
      next.push(hash);
    }
    level = next;
  }
  return level[0];
}
```

---

### 6. Canonical JSON Serialization

**Gap:** `JSON.stringify()` key order non-deterministic in JavaScript.

**Current State:** `metadata_hash_sha256` may vary for identical metadata.

**Impact:** Same metadata yields different hashes across executions.

**Required:**
```javascript
function canonicalJSON(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}
```

---

### 7. Idempotency Keys

**Gap:** Base44 functions can be called multiple times with same data.

**Current State:** No duplicate prevention on retries.

**Impact:** Same draft_id can be sealed twice → duplicate evidence records.

**Required:** Server-side idempotency cache:
```javascript
if (idempotencyCache.has(req.headers['idempotency-key'])) {
  return cached response;
}
```

---

### 8. Atomic Transactions

**Gap:** Base44 entity operations are not transactional.

**Current State:**
```javascript
await create(draft);
await create(attachment);  // If this fails, draft orphaned
await create(audit);
```

**Impact:** Partial failures leave inconsistent state.

**Required:** Database transactions:
```javascript
await db.transaction(async (tx) => {
  await tx.insert(draft);
  await tx.insert(attachment);
  await tx.insert(audit);
});
```

---

### 9. 90-Day Quarantine Deadline Validation

**Gap:** No server-side date validation for `resolution_due_date`.

**Current State:** Client can set any date → UI-only validation.

**Impact:** `resolution_due_date` can be > 90 days → compliance violation.

**Required:**
```javascript
const maxDeadline = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
if (new Date(resolution_due_date) > maxDeadline) {
  return { error_code: 'DEADLINE_TOO_FAR', ... };
}
```

---

### 10. DRAFT_ID Persistence Across Browser Refresh

**Gap:** `draft_id` stored in localStorage + URL params can desync.

**Current Workaround:**
```javascript
const draftId = urlParams.get('draft_id') || localStorage.getItem('draft_id');
```

**Issue:** User opens wizard in 2 tabs → race condition on draft_id.

**Required:** Server-side session management with CSRF token.

---

## Test Coverage Gaps

### Missing Tests
1. **Cross-tenant draft access** → should return 403/404
2. **Sealed draft mutation** → should return 409
3. **Duplicate file attachment** (same SHA-256) → should allow or reject?
4. **Attach file to non-existent draft_id** → currently returns 422, should be 404
5. **Step 2 → Step 3 hash consistency** → no automated test

---

## Developer Console Gaps

### Current Issues
- No "Copy Debug Bundle" button in UI
- Test runs do not store `build_id` in database
- Cannot filter test runs by `build_id`
- No DRIFT WARNING when `current_build_id != last_test_build_id`

### Required for Trustworthiness
```javascript
{
  run_id: "uuid",
  build_id: "abc123",
  executed_at: "2026-01-27T10:00:00Z",
  results: [...]
}
```

---

## Migration Checklist

- [ ] Replace `Date.now()` build_id with git SHA
- [ ] Add PostgreSQL immutability rules
- [ ] Implement tenant isolation FK validation
- [ ] Add merkle root for multi-file attachments
- [ ] Use canonical JSON for metadata hashing
- [ ] Add idempotency key middleware
- [ ] Wrap kernel operations in transactions
- [ ] Validate 90-day quarantine deadline server-side
- [ ] Add server-side session management for draft_id
- [ ] Add comprehensive test suite covering all gaps

---

## Deployment Notes

**Base44 Limitations:**
- No access to git commit SHA → temporary workaround with timestamps
- No database triggers/rules → manual immutability enforcement
- No row-level security → manual tenant isolation checks
- No transactional entity operations → risk of partial failures

**GitHub Backend Will Add:**
- PostgreSQL 15+ with RLS policies
- Database triggers for immutability
- Foreign key constraints with tenant_id
- Atomic transactions via Knex/Prisma
- Build ID from CI/CD environment variables

---

**Status:** READY FOR MIGRATION  
**Next Step:** Implement backend in Node/Express or Python/FastAPI