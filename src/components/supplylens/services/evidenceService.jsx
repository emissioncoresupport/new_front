// Evidence Service Abstraction Layer
// Routes between Simulation Mode (local mocks with SIM- IDs) and Production (real kernel)
// CRITICAL: Simulation must NEVER call backend endpoints

import { base44 } from '@/api/base44Client';

// Environment and mode detection
const isProduction = () => {
  if (typeof window === 'undefined') return false;
  // In production environment, never allow simulation
  return process.env.NODE_ENV === 'production' && !new URLSearchParams(window.location.search).has('simulate');
};

const canSimulate = () => {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('simulate') || process.env.NODE_ENV !== 'production';
};

// Crypto utility: compute SHA-256 of file bytes (UI validation only)
const computeFileSHA256 = async (fileBytes) => {
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    console.error('[EvidenceService] SHA-256 compute failed:', e);
    return null;
  }
};

// Deterministic placeholder hash (if file bytes not accessible)
const placeholderHash = () => {
  return '0'.repeat(64); // 64-char hex string
};

const EvidenceService = {
  // Check if simulation mode is active
  isSimulationMode: (simulationModeFlag) => {
    if (isProduction()) return false; // Production env: never simulate
    return simulationModeFlag === true;
  },

  // Check if simulation UI toggle should be visible
  canShowSimulationToggle: () => canSimulate(),

  // Create a new draft
  createDraft: async (declarationData, simulationMode) => {
    if (simulationMode && !isProduction()) {
      // Simulation: return local mock draft
      const draftId = 'SIMDRAFT-' + crypto.randomUUID();
      console.log('[EvidenceService] Simulation: created draft', draftId);
      return {
        draft_id: draftId,
        status: 'DRAFT',
        ingestion_method: declarationData.ingestion_method,
        source_system: declarationData.source_system,
        dataset_type: declarationData.dataset_type,
        declared_scope: declarationData.declared_scope,
        created_at_utc: new Date().toISOString(),
        error_code: null,
        message: 'OK (simulated)',
        correlation_id: null
      };
    }

    // Production: call real backend
    console.log('[EvidenceService] Production: creating draft via kernel...');
    const result = await base44.functions.invoke('ingestKernelDraftCreate', {
      ...declarationData
    });
    return result.data;
  },

  // Attach file to draft
  attachFile: async (draftId, file, simulationMode) => {
    if (simulationMode && !isProduction()) {
      // Simulation: generate local mock response
      const fileId = 'SIMFILE-' + crypto.randomUUID();
      let uiHash = null;

      // Try to compute real hash from file bytes
      if (file && file.size > 0) {
        try {
          const bytes = await file.arrayBuffer();
          uiHash = await computeFileSHA256(new Uint8Array(bytes));
        } catch (e) {
          console.warn('[EvidenceService] Could not read file bytes, using placeholder');
          uiHash = placeholderHash();
        }
      } else {
        uiHash = placeholderHash();
      }

      console.log('[EvidenceService] Simulation: attached file', fileId, 'hash:', uiHash.substring(0, 16) + '...');
      return {
        file_id: fileId,
        draft_id: draftId,
        filename: file.name,
        size_bytes: file.size,
        content_type: file.type,
        sha256: uiHash,
        ui_hash_only: true, // CRITICAL FLAG: indicates this is UI validation only
        storage_ref: 'SIM_STORAGE_' + fileId,
        uploaded_at_utc: new Date().toISOString(),
        error_code: null,
        message: 'OK (simulated)',
        correlation_id: null
      };
    }

    // Production: call real backend file upload
    console.log('[EvidenceService] Production: uploading file via kernel...');
    const result = await base44.functions.invoke('ingestKernelFileUploadAndAttach', {
      draft_id: draftId,
      file: file
    });
    return result.data;
  },

  // Get draft for sealing (Step 3)
  getDraftForSeal: async (draftId, simulationMode, localFile = null) => {
    if (simulationMode && !isProduction()) {
      // Simulation: return local mock draft snapshot
      console.log('[EvidenceService] Simulation: fetching draft for seal');

      let uiPayloadHash = null;
      if (localFile && localFile.size > 0) {
        try {
          const bytes = await localFile.arrayBuffer();
          uiPayloadHash = await computeFileSHA256(new Uint8Array(bytes));
        } catch (e) {
          uiPayloadHash = placeholderHash();
        }
      } else {
        uiPayloadHash = placeholderHash();
      }

      return {
        draft_id: draftId,
        status: 'READY',
        validation: {
          ready_to_seal: true,
          missing_fields: [],
          errors: []
        },
        files: localFile ? [
          {
            file_id: 'SIMFILE-' + crypto.randomUUID(),
            filename: localFile.name,
            size_bytes: localFile.size,
            content_type: localFile.type,
            sha256: uiPayloadHash,
            ui_hash_only: true
          }
        ] : [],
        payload_hash_sha256: uiPayloadHash,
        ui_hash_only: true, // CRITICAL: this hash is for UI validation only
        metadata_hash_sha256: '0'.repeat(64),
        ui_hash_only_meta: true,
        sealed_at_utc: null,
        retention_policy: 'STANDARD_7_YEARS',
        retention_days: 365 * 7,
        retention_end_utc: null,
        review_status: 'PENDING_REVIEW',
        error_code: null,
        message: 'OK (simulated)',
        correlation_id: null
      };
    }

    // Production: call real backend
    console.log('[EvidenceService] Production: fetching draft for seal from kernel...');
    const result = await base44.functions.invoke('ingestKernelGetDraftForSeal', {
      draft_id: draftId
    });
    return result.data;
  },

  // Seal draft (finalize evidence)
  sealDraft: async (draftId, simulationMode) => {
    if (simulationMode && !isProduction()) {
      // Simulation: generate local mock sealed record
      console.log('[EvidenceService] Simulation: sealing draft (mock)');
      const evidenceId = 'SIM-' + crypto.randomUUID();
      const sealedAt = new Date().toISOString();

      // Compute retention end (default 7 years)
      const retentionDays = 365 * 7;
      const sealedDate = new Date(sealedAt);
      const retentionEnd = new Date(sealedDate.getTime() + retentionDays * 24 * 60 * 60 * 1000);

      return {
        evidence_id: evidenceId,
        draft_id: draftId,
        ledger_state: 'SEALED', // SEALED or QUARANTINED
        payload_hash_sha256: '0'.repeat(64),
        metadata_hash_sha256: '0'.repeat(64),
        sealed_at_utc: sealedAt,
        retention_ends_utc: retentionEnd.toISOString(),
        trust_level: 'MEDIUM',
        review_status: 'PENDING_REVIEW', // NOT AUTO_APPROVED
        sealed_by_user_id: 'sim-user',
        is_simulated: true, // CRITICAL FLAG
        error_code: null,
        message: 'OK (simulated - not a ledger event)',
        correlation_id: null
      };
    }

    // Production: call real backend seal
    console.log('[EvidenceService] Production: sealing via kernel...');
    const result = await base44.functions.invoke('ingestKernelSealHardened', {
      draft_id: draftId
    });
    return result.data;
  },

  // Utility: determine button text based on mode
  getSealButtonText: (simulationMode, isSealing) => {
    if (simulationMode) {
      return 'Sealing disabled in Simulation (UI validation only)';
    }
    return isSealing ? 'Sealing...' : 'Seal Evidence';
  }
};

export default EvidenceService;