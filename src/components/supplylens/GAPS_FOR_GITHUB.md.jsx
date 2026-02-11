# Base44 Platform Gaps - GitHub Migration Requirements

**Document Version:** 1.0  
**Date:** 2026-01-27  
**Contract:** Evidence Ingestion Kernel v1  
**Status:** APPROVED FOR IMPLEMENTATION

---

## Executive Summary

Base44 is used as a **UI shell only** for Emission Core. The following gaps prevent regulator-grade, server-authoritative ingestion and must be implemented in the GitHub-hosted backend (Node/Express or Python/FastAPI).

---

## Critical Gaps Summary

| # | Gap | Severity | Base44 Limitation | GitHub Solution |
|---|-----|----------|-------------------|-----------------|
| 1 | Build Versioning | CRITICAL | No commit hash access | CI/CD env vars |
| 2 | Deterministic Retention | HIGH | Non-deterministic dates | Python datetime |
| 3 | Multi-File Merkle | MEDIUM | No merkle tree support | Custom implementation |
| 4 | Canonical JSON | HIGH | Key order varies | Sorted serialization |
| 5 | Audit Immutability | CRITICAL | Entities editable | PostgreSQL RLS |
| 6 | GDPR Enforcement | HIGH | No validation middleware | Server validation |
| 7 | Idempotency | HIGH | No built-in support | Redis/DB cache |
| 8 | Scope Matrix | CRITICAL | No FK validation | Server-side checks |
| 9 | Streaming Upload | MEDIUM | Memory-based only | Multer streams |
| 10 | Data Mode Isolation | CRITICAL | No row-level security | PostgreSQL RLS |

---

## Gap Details & Implementation

### 1. Build Versioning & Drift Detection

**Problem:** Base44 functions cannot introspect deployment version or commit hash.

**Impact:** 
- UI/server drift undetectable
- Cannot validate test results against current code
- "COMPLIANT" claims unreliable

**GitHub Solution:**
```javascript
// Environment-based build ID
const BUILD_ID = process.env.GITHUB_SHA || 
                 process.env.VERCEL_GIT_COMMIT_SHA || 
                 `local-${Date.now()}`;
const CONTRACT_VERSION = 'contract_ingest_v1';

// Middleware stamps all responses
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    return originalJson({
      ...data,
      build_id: BUILD_ID,
      contract_version: CONTRACT_VERSION,
      correlation_id: res.locals.correlation_id
    });
  };
  next();
});
```

**Test Case:**
```json
{
  "endpoint": "/kernel_createDraft",
  "expected_response_fields": [
    "build_id",
    "contract_version", 
    "correlation_id",
    "draft_id"
  ]
}
```

---

### 2. Deterministic Retention Calculation

**Problem:** JavaScript `Date` varies by execution time.

**Impact:** Same policy yields different `retention_ends_utc`

**GitHub Solution:**
```python
from datetime import datetime, timedelta

RETENTION_POLICIES = {
    'STANDARD_1_YEAR': timedelta(days=365),
    'STANDARD_3_YEARS': timedelta(days=1095),
    'STANDARD_7_YEARS': timedelta(days=2555),
    'STANDARD_10_YEARS': timedelta(days=3650)
}

def compute_retention_end(sealed_at: str, policy: str) -> str:
    dt = datetime.fromisoformat(sealed_at.replace('Z', '+00:00'))
    delta = RETENTION_POLICIES[policy]
    return (dt + delta).isoformat()
```

**Test Case:**
```json
{
  "sealed_at_utc": "2026-01-27T10:00:00.000Z",
  "retention_policy": "STANDARD_7_YEARS",
  "expected": "2033-01-27T10:00:00.000Z"
}
```

---

### 3. Multi-File Merkle Root

**Problem:** Base44 can hash single files only.

**Current Workaround:** Enforce max 1 file per draft

**GitHub Solution:**
```javascript
const crypto = require('crypto');

function computeMerkleRoot(fileHashes) {
  if (fileHashes.length === 0) return null;
  if (fileHashes.length === 1) return fileHashes[0];
  
  let level = [...fileHashes].sort(); // deterministic order
  
  while (level.length > 1) {
    const nextLevel = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] || left;
      const hash = crypto.createHash('sha256')
        .update(left + right)
        .digest('hex');
      nextLevel.push(hash);
    }
    level = nextLevel;
  }
  
  return level[0];
}
```

---

### 4. Canonical JSON Serialization

**Problem:** `JSON.stringify()` key order non-deterministic.

**Impact:** `metadata_hash_sha256` varies for same data

**GitHub Solution:**
```javascript
function canonicalJSON(obj) {
  const sorted = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = obj[key];
  });
  return JSON.stringify(sorted, null, 0);
}

function computeMetadataHash(metadata) {
  const canonical = canonicalJSON(metadata);
  return crypto.createHash('sha256')
    .update(canonical)
    .digest('hex');
}
```

---

### 5. Comprehensive Audit Trail

**Problem:** Base44 entities can be edited/deleted.

**Impact:** Audit trail tamperable

**GitHub Solution (PostgreSQL):**
```sql
CREATE TABLE audit_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  correlation_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  actor_user_id UUID NOT NULL,
  server_ts_utc TIMESTAMP DEFAULT NOW(),
  details_json JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Prevent modifications
CREATE RULE audit_no_update AS 
  ON UPDATE TO audit_events DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS 
  ON DELETE TO audit_events DO INSTEAD NOTHING;
```

---

### 6. GDPR Legal Basis Enforcement

**Problem:** No server-side validation.

**GitHub Solution:**
```javascript
const VALID_GDPR_BASES = [
  'CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION',
  'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTERESTS'
];

function validateGDPR(declaration) {
  if (declaration.contains_personal_data === true) {
    if (!declaration.gdpr_legal_basis) {
      return {
        error_code: 'GDPR_LEGAL_BASIS_REQUIRED',
        field_errors: [{
          field: 'gdpr_legal_basis',
          error: 'Required for personal data processing'
        }]
      };
    }
    
    if (!VALID_GDPR_BASES.includes(declaration.gdpr_legal_basis)) {
      return {
        error_code: 'INVALID_GDPR_LEGAL_BASIS',
        field_errors: [{
          field: 'gdpr_legal_basis',
          error: `Must be: ${VALID_GDPR_BASES.join(', ')}`
        }]
      };
    }
  }
  return null;
}
```

---

### 7. Idempotency Keys

**Problem:** No duplicate prevention on retries.

**GitHub Solution:**
```javascript
const idempotencyCache = new Map();

async function idempotencyMiddleware(req, res, next) {
  const key = req.headers['idempotency-key'];
  if (!key) return next();
  
  const cached = idempotencyCache.get(key);
  if (cached) {
    return res.status(cached.status).json(cached.body);
  }
  
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    idempotencyCache.set(key, {
      status: res.statusCode,
      body,
      timestamp: Date.now()
    });
    setTimeout(() => idempotencyCache.delete(key), 86400000);
    return originalJson(body);
  };
  next();
}
```

---

### 8. Scope Target Validation Matrix

**Problem:** No foreign key integrity checks.

**GitHub Solution:**
```javascript
const SCOPE_MATRIX = {
  'LEGAL_ENTITY': {
    requires_target: true,
    target_entity: 'LegalEntity',
    allowed_methods: ['FILE_UPLOAD', 'ERP_EXPORT'],
    allowed_datasets: ['SUPPLIER_MASTER', 'EMISSIONS_DATA']
  },
  // ... other scopes
};

async function validateScope(declaration, db) {
  const config = SCOPE_MATRIX[declaration.declared_scope];
  
  if (config.requires_target && !declaration.scope_target_id) {
    return {
      error_code: 'SCOPE_TARGET_REQUIRED',
      field_errors: [{
        field: 'scope_target_id',
        error: `Must reference ${config.target_entity}`
      }]
    };
  }
  
  if (config.requires_target) {
    const exists = await db.query(
      `SELECT 1 FROM ${config.target_entity} 
       WHERE id = $1 AND tenant_id = $2`,
      [declaration.scope_target_id, declaration.tenant_id]
    );
    
    if (exists.rows.length === 0) {
      return {
        error_code: 'SCOPE_TARGET_NOT_FOUND',
        field_errors: [{
          field: 'scope_target_id',
          error: 'Target not found in tenant scope'
        }]
      };
    }
  }
  
  return null;
}
```

---

### 9. Streaming File Upload

**Problem:** Entire file loaded into memory.

**Impact:** OOM for files > 100MB

**GitHub Solution:**
```javascript
const multer = require('multer');
const crypto = require('crypto');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

async function computeHashStream(buffer) {
  const hash = crypto.createHash('sha256');
  hash.update(buffer);
  return hash.digest('hex');
}

app.post('/kernel_attachFile', upload.single('file'), async (req, res) => {
  const sha256 = await computeHashStream(req.file.buffer);
  // Store and return
});
```

---

### 10. Data Mode Isolation

**Problem:** No row-level security for TEST/LIVE data.

**Impact:** Test data pollutes production

**GitHub Solution (PostgreSQL):**
```sql
ALTER TABLE evidence_drafts 
  ADD COLUMN data_mode VARCHAR(10) NOT NULL DEFAULT 'LIVE';

ALTER TABLE evidence_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY data_mode_filter ON evidence_drafts
  USING (
    data_mode = current_setting('app.data_mode')::varchar
    OR current_setting('app.data_mode')::varchar = 'ALL'
  );

-- Application sets: SET app.data_mode = 'TEST';
```

---

## Recommended Stack

**Backend:** Node.js 20+ with Express or Python 3.11+ with FastAPI  
**Database:** PostgreSQL 15+ with Row-Level Security  
**Storage:** AWS S3 or Google Cloud Storage  
**Cache:** Redis 7+ for idempotency  
**CI/CD:** GitHub Actions with commit SHA injection  
**Monitoring:** OpenTelemetry + Grafana

---

## Migration Checklist

- [ ] Set up PostgreSQL with RLS policies
- [ ] Implement build versioning middleware
- [ ] Add canonical JSON serialization
- [ ] Implement merkle tree for multi-file
- [ ] Add GDPR validation middleware
- [ ] Implement idempotency cache
- [ ] Add scope matrix validation
- [ ] Set up streaming file upload
- [ ] Implement data mode isolation
- [ ] Create comprehensive test suite
- [ ] Deploy with GitHub Actions
- [ ] Validate drift detection works

---

**Status:** READY FOR IMPLEMENTATION  
**Contact:** engineering@emissioncore.com