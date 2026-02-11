/**
 * Work Item Assignment Engine
 * Deterministic, rule-based routing for owner assignment and priority escalation
 * Based on: type, datasetType, conflict details, evidence seal status
 */

import { SOURCE_TRUST_RANKS } from './data';

/**
 * Routing matrix: type + datasetType -> owner team + base priority
 */
const ROUTING_RULES = {
  'REVIEW:SUPPLIER_MASTER': {
    owner: 'compliance-team@emissioncore.io',
    basePriority: 'HIGH',
    reason: 'Supplier master requires compliance review'
  },
  'REVIEW:ERP_SYNC': {
    owner: 'data-integration@emissioncore.io',
    basePriority: 'MEDIUM',
    reason: 'ERP sync data validation'
  },
  'REVIEW:BOM': {
    owner: 'engineering@emissioncore.io',
    basePriority: 'MEDIUM',
    reason: 'BOM structure and completeness review'
  },
  'REVIEW:INVOICE': {
    owner: 'procurement@emissioncore.io',
    basePriority: 'LOW',
    reason: 'Invoice processing and data extraction'
  },

  'EXTRACTION:SUPPLIER_MASTER': {
    owner: 'ai-extraction@emissioncore.io',
    basePriority: 'HIGH',
    reason: 'Critical supplier data extraction'
  },
  'EXTRACTION:ERP_SYNC': {
    owner: 'ai-extraction@emissioncore.io',
    basePriority: 'MEDIUM',
    reason: 'ERP field extraction'
  },
  'EXTRACTION:BOM': {
    owner: 'ai-extraction@emissioncore.io',
    basePriority: 'MEDIUM',
    reason: 'BOM line item extraction'
  },
  'EXTRACTION:INVOICE': {
    owner: 'ai-extraction@emissioncore.io',
    basePriority: 'LOW',
    reason: 'Invoice line extraction'
  },

  'MAPPING:SUPPLIER_MASTER': {
    owner: 'mdm-team@emissioncore.io',
    basePriority: 'HIGH',
    reason: 'Master data governance - supplier identity resolution'
  },
  'MAPPING:ERP_SYNC': {
    owner: 'mdm-team@emissioncore.io',
    basePriority: 'MEDIUM',
    reason: 'ERP-to-canonical mapping'
  },
  'MAPPING:BOM': {
    owner: 'mdm-team@emissioncore.io',
    basePriority: 'MEDIUM',
    reason: 'BOM component mapping'
  },
  'MAPPING:INVOICE': {
    owner: 'mdm-team@emissioncore.io',
    basePriority: 'LOW',
    reason: 'Invoice vendor mapping'
  },

  'CONFLICT:SUPPLIER_MASTER': {
    owner: 'compliance-team@emissioncore.io',
    basePriority: 'CRITICAL',
    reason: 'Critical supplier conflict - requires immediate resolution'
  },
  'CONFLICT:ERP_SYNC': {
    owner: 'data-integration@emissioncore.io',
    basePriority: 'HIGH',
    reason: 'ERP conflict - data integrity risk'
  },
  'CONFLICT:BOM': {
    owner: 'engineering@emissioncore.io',
    basePriority: 'HIGH',
    reason: 'BOM conflict - product integrity'
  },
  'CONFLICT:INVOICE': {
    owner: 'procurement@emissioncore.io',
    basePriority: 'MEDIUM',
    reason: 'Invoice conflict - financial impact'
  }
};

/**
 * Calculate priority escalation based on conflict severity
 * - Trust rank variance (how different are the sources?)
 * - Field criticality (is this a required field?)
 * - Data mode (QUARANTINED evidence increases severity)
 */
function escalatePriority(basePriority, conflictDetails, evidenceStatus) {
  // If evidence is QUARANTINED, auto-escalate
  if (evidenceStatus === 'QUARANTINED') {
    return 'CRITICAL';
  }

  // If no conflict, return base
  if (!conflictDetails) {
    return basePriority;
  }

  const sources = conflictDetails.sources || [];
  if (sources.length < 2) return basePriority;

  // Calculate trust rank variance
  const trustRanks = sources.map(s => s.trustRank || 0);
  const maxTrust = Math.max(...trustRanks);
  const minTrust = Math.min(...trustRanks);
  const variance = maxTrust - minTrust;

  // High variance (conflicting sources from different trust levels) = escalate
  if (variance > 50 && basePriority === 'MEDIUM') {
    return 'HIGH';
  }
  if (variance > 50 && basePriority === 'HIGH') {
    return 'CRITICAL';
  }

  return basePriority;
}

/**
 * Main assignment function
 * Assigns owner and priority based on work item attributes
 */
export function assignWorkItem(workItem, evidenceStatus = null) {
  const { type, linkedEntityRef, details } = workItem;
  
  // Infer datasetType from linkedEntityRef or details
  let datasetType = workItem.datasetType || 'UNKNOWN';
  if (details?.datasetType) datasetType = details.datasetType;
  if (linkedEntityRef?.entityType === 'SUPPLIER') datasetType = 'SUPPLIER_MASTER';
  if (linkedEntityRef?.entityType === 'SKU') datasetType = 'BOM';

  // Look up routing rule
  const ruleKey = `${type}:${datasetType}`;
  const rule = ROUTING_RULES[ruleKey] || {
    owner: 'unassigned@emissioncore.io',
    basePriority: 'MEDIUM',
    reason: 'Default routing'
  };

  // Escalate priority if conflict details are severe
  const finalPriority = type === 'CONFLICT'
    ? escalatePriority(rule.basePriority, details, evidenceStatus)
    : rule.basePriority;

  return {
    owner: rule.owner,
    priority: finalPriority,
    assignmentReason: rule.reason,
    routingRule: ruleKey
  };
}

/**
 * Batch assignment for multiple work items
 */
export function assignMultipleWorkItems(workItems, evidenceStatusMap = {}) {
  return workItems.map(item => {
    const evidenceId = item.linkedEvidenceId;
    const status = evidenceStatusMap[evidenceId];
    return {
      ...item,
      ...assignWorkItem(item, status)
    };
  });
}

/**
 * Get all possible routing rules (for UI reference)
 */
export function getRoutingRules() {
  return ROUTING_RULES;
}

/**
 * Get owners by team (for filtering/display)
 */
export function getOwnersByTeam() {
  const teams = {};
  Object.values(ROUTING_RULES).forEach(rule => {
    if (!teams[rule.owner]) {
      teams[rule.owner] = [];
    }
  });
  return teams;
}