/**
 * CONTRACT 1 STATE LOCK
 * 
 * Enforces Contract 1 boundaries - system cannot transition to states
 * that are not implemented in Contract 1.
 * 
 * ALLOWED STATES (Contract 1):
 * - INGESTED
 * - SEALED
 * - REJECTED
 * - FAILED
 * - SUPERSEDED
 * 
 * BLOCKED STATES (Contract 2+):
 * - CLASSIFIED
 * - STRUCTURED
 */

export const SUPPLYLENS_CONTRACT_VERSION = 1;

export const CONTRACT_1_ALLOWED_STATES = [
  'INGESTED',
  'SEALED',
  'REJECTED',
  'FAILED',
  'SUPERSEDED'
];

export const CONTRACT_2_STATES = [
  'CLASSIFIED',
  'STRUCTURED'
];

export function validateStateTransition(newState) {
  if (SUPPLYLENS_CONTRACT_VERSION === 1) {
    if (CONTRACT_2_STATES.includes(newState)) {
      return {
        allowed: false,
        error: {
          code: 'CONTRACT_LOCK_CONTRACT1',
          message: `Contract 1 does not allow transition to ${newState}. This state requires Contract 2 implementation.`,
          contract_version: SUPPLYLENS_CONTRACT_VERSION,
          attempted_state: newState,
          allowed_states: CONTRACT_1_ALLOWED_STATES,
          blocked_states: CONTRACT_2_STATES
        }
      };
    }
  }

  return { allowed: true };
}

export function getValidStatesForCurrentContract() {
  return SUPPLYLENS_CONTRACT_VERSION === 1 
    ? CONTRACT_1_ALLOWED_STATES 
    : [...CONTRACT_1_ALLOWED_STATES, ...CONTRACT_2_STATES];
}