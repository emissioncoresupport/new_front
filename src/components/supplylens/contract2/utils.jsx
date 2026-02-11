// Contract 2 Utils: Deterministic ID generation, safe date handling, hash mocking

// Seeded ID generator for deterministic IDs
class SeededIDGenerator {
  constructor(seed = 42) {
    this.seed = seed;
  }
  
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  uuid() {
    const segments = [8, 4, 4, 4, 12];
    return segments.map(len => {
      let str = '';
      for (let i = 0; i < len; i++) {
        str += Math.floor(this.next() * 16).toString(16);
      }
      return str;
    }).join('-');
  }
  
  displayId(prefix, num) {
    return `${prefix}-${String(num).padStart(7, '0')}`;
  }
  
  idempotencyKey(...parts) {
    return parts.join('::');
  }
}

export const idGen = new SeededIDGenerator();

// Safe date formatter - never shows "Invalid Date"
export function safeDate(date, format = 'full') {
  if (!date) return '—';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    
    switch (format) {
      case 'iso':
        return d.toISOString();
      case 'date':
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      case 'time':
        return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      case 'full':
      default:
        return d.toLocaleString('en-GB', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
    }
  } catch {
    return '—';
  }
}

// Mock hash generation (deterministic)
export function mockHash(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'sha256:' + Math.abs(hash).toString(16).padStart(64, '0').slice(0, 64);
}

// Calculate retention end date (7 years from now for CONTRACT 2 compliance)
export function calculateRetentionEnd() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 7);
  return date.toISOString();
}

// Readiness calculation
export function calculateReadiness(entity) {
  if (!entity) return 'NOT_READY';
  
  const hasConflicts = entity.conflictCount > 0;
  const hasQuarantined = entity.quarantinedEvidenceCount > 0;
  const hasMapping = entity.mappingStatus === 'MAPPED';
  const requiredFieldsMissing = entity.missingRequiredFields?.length > 0;
  
  if (hasQuarantined || hasConflicts) return 'NOT_READY';
  if (!hasMapping) return 'PENDING_MATCH';
  if (requiredFieldsMissing) return 'READY_WITH_GAPS';
  return 'READY';
}

// SLA calculation
export function calculateSlaRemaining(createdAt, slaHours = 48) {
  try {
    const created = new Date(createdAt);
    const now = new Date();
    const elapsed = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return Math.max(0, Math.round(slaHours - elapsed));
  } catch {
    return 0;
  }
}

// Idempotency check helper
export function createIdempotencyKey(action, ...identifiers) {
  return `${action}:${identifiers.join(':')}`;
}