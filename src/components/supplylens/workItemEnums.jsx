/**
 * Work Item Enums & Configurations
 * CONTRACT 2: Conflict Resolution & Follow-up Management
 */

export const WORK_ITEM_TYPES = {
  REVIEW: 'REVIEW',
  EXTRACTION: 'EXTRACTION',
  MAPPING: 'MAPPING',
  CONFLICT: 'CONFLICT'
};

export const WORK_ITEM_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  BLOCKED: 'BLOCKED',
  DONE: 'DONE'
};

export const WORK_ITEM_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

export const CONFLICT_STRATEGIES = {
  PREFER_SOURCE_A: {
    label: 'Source A',
    description: 'Use the value from the first evidence source',
    icon: 'check'
  },
  PREFER_SOURCE_B: {
    label: 'Source B',
    description: 'Use the value from the second evidence source',
    icon: 'check'
  },
  PREFER_TRUSTED_SYSTEM: {
    label: 'Trusted System',
    description: 'Use the value from the most trusted/authoritative system',
    icon: 'shield'
  },
  MANUAL_OVERRIDE: {
    label: 'Manual Override',
    description: 'Manually enter the correct value',
    icon: 'edit',
    requiresInput: true
  },
  DEFER_AND_REQUEST_EVIDENCE: {
    label: 'Request More Evidence',
    description: 'Create a follow-up to gather additional evidence',
    icon: 'search'
  },
  ESCALATE_TO_OWNER: {
    label: 'Escalate to Owner',
    description: 'Route to the data owner for resolution',
    icon: 'alert'
  }
};

export const FOLLOW_UP_TYPES = {
  REQUEST_ADDITIONAL_EVIDENCE: 'REQUEST_ADDITIONAL_EVIDENCE',
  VERIFY_WITH_SUPPLIER: 'VERIFY_WITH_SUPPLIER',
  CLARIFY_SCOPE: 'CLARIFY_SCOPE',
  INVESTIGATE_CONFLICT: 'INVESTIGATE_CONFLICT'
};