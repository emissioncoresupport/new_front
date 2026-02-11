import { base44 } from "@/api/base44Client";

// Simple SHA-256 hash function (browser-compatible)
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createDPPAuditLog(dppId, productId, actionType, changes, currentUser) {
    try {
        if (!currentUser) {
            console.warn('No user provided for audit log, using system user');
            currentUser = { email: 'system', full_name: 'System' };
        }

        // Fetch previous hash for chain linking
        const allLogs = await base44.entities.DPPAuditLog.list();
        const dppLogs = allLogs.filter(log => log.dpp_id === dppId).sort((a, b) => 
            new Date(b.created_date) - new Date(a.created_date)
        );
        const previousHash = dppLogs[0]?.blockchain_hash || '0000000000000000000000000000000000000000000000000000000000000000';

        // Create blockchain hash
        const timestamp = new Date().toISOString();
        const dataToHash = JSON.stringify({
            dpp_id: dppId,
            action: actionType,
            actor: currentUser?.email,
            timestamp,
            previous: previousHash,
            changes
        });

        const blockchainHash = await sha256(dataToHash);

        // Create audit log with data snapshot for full traceability
        const log = await base44.entities.DPPAuditLog.create({
            dpp_id: dppId,
            product_id: productId,
            action_type: actionType,
            actor_email: currentUser?.email,
            actor_name: currentUser?.full_name,
            changes,
            blockchain_hash: blockchainHash,
            previous_hash: previousHash,
            data_snapshot: changes,
            verification_status: 'verified'
        });

        return log;
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw - allow DPP creation to continue even if audit log fails
        return null;
    }
}

export async function verifyDPPChainIntegrity(dppId) {
    const allLogs = await base44.entities.DPPAuditLog.list();
    const dppLogs = allLogs.filter(log => log.dpp_id === dppId).sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
    );

    for (let i = 1; i < dppLogs.length; i++) {
        const current = dppLogs[i];
        const previous = dppLogs[i - 1];

        if (current.previous_hash !== previous.blockchain_hash) {
            // Chain broken - mark as tampered
            await base44.entities.DPPAuditLog.update(current.id, {
                verification_status: 'tampered'
            });
            return { 
                valid: false, 
                tampered_block: current.id,
                message: 'Chain integrity compromised'
            };
        }
    }

    return { valid: true, message: 'Chain integrity verified' };
}