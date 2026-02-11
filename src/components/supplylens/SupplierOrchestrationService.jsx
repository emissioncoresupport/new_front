/**
 * Supplier Orchestration Service
 * Frontend service layer for triggering backend orchestration on supplier changes
 * Auto-syncs data across PCF, DPP, CBAM, EUDR, CCF modules
 */

import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

class SupplierOrchestrationService {
    /**
     * Run full orchestration on supplier create/update
     */
    static async orchestrateSupplier(supplierId, operation = 'update') {
        try {
            const loadingToast = toast.loading('Syncing supplier data across modules...');

            const response = await base44.functions.invoke('supplierDataOrchestrator', {
                supplier_id: supplierId,
                operation
            });

            toast.dismiss(loadingToast);

            if (response.data.success) {
                const results = response.data.results;
                const messages = [];

                if (results.validations?.eu_registry?.vat_valid) {
                    messages.push('✓ EU VAT verified');
                }
                if (results.syncs?.dpp_actor_registry?.actor_id) {
                    messages.push('✓ Synced to DPP Actor Registry');
                }
                if (results.syncs?.cbam_installations) {
                    messages.push(`✓ ${results.syncs.cbam_installations.installations_synced || 0} CBAM installations synced`);
                }
                if (results.enrichments?.scope3_category1) {
                    messages.push('✓ Scope 3 emissions calculated');
                }

                toast.success(messages.join('\n'), { duration: 5000 });
                
                return response.data;
            } else {
                toast.error('Orchestration failed');
                return null;
            }
        } catch (error) {
            console.error('Orchestration error:', error);
            toast.error('Failed to sync supplier data');
            return null;
        }
    }

    /**
     * Validate supplier against EU registries
     */
    static async validateEURegistries(supplierId) {
        try {
            const supplier = (await base44.entities.Supplier.list()).find(s => s.id === supplierId);
            if (!supplier) throw new Error('Supplier not found');

            const response = await base44.functions.invoke('euRegistryValidator', {
                vat_number: supplier.vat_number,
                eori_number: supplier.eori_number,
                country: supplier.country
            });

            return response.data;
        } catch (error) {
            console.error('EU validation error:', error);
            return null;
        }
    }

    /**
     * Request PACT PCF data from supplier
     */
    static async requestPACTData(supplierId, productId = null) {
        try {
            toast.loading('Sending PACT data request...');

            const response = await base44.functions.invoke('pactDataExchange', {
                supplier_id: supplierId,
                action: 'request_pcf',
                auto_send: true,
                product_id: productId
            });

            if (response.data.success) {
                toast.success(`PACT request sent${response.data.result.email_sent ? ' via email' : ''}`);
                return response.data;
            } else {
                toast.error('Failed to send PACT request');
                return null;
            }
        } catch (error) {
            console.error('PACT request error:', error);
            toast.error('PACT request failed');
            return null;
        }
    }

    /**
     * Calculate Scope 3 Category 1 for supplier
     */
    static async calculateScope3(supplierId, reportingYear = null) {
        try {
            const response = await base44.functions.invoke('scope3PurchasedGoodsCalculator', {
                supplier_id: supplierId,
                reporting_year: reportingYear
            });

            if (response.data.success) {
                return response.data;
            }
            return null;
        } catch (error) {
            console.error('Scope 3 calc error:', error);
            return null;
        }
    }

    /**
     * Automated risk screening
     */
    static async screenRisks(supplierId, depth = 'standard') {
        try {
            const response = await base44.functions.invoke('automatedRiskScreening', {
                supplier_id: supplierId,
                screening_depth: depth
            });

            if (response.data.success) {
                const assessment = response.data.risk_assessment;
                
                if (assessment.risk_signals.length > 0) {
                    toast.warning(`${assessment.risk_signals.length} risk signal(s) detected`, {
                        description: `Risk Level: ${assessment.risk_level.toUpperCase()}`
                    });
                } else {
                    toast.success('No risks detected - supplier verified');
                }
                
                return assessment;
            }
            return null;
        } catch (error) {
            console.error('Risk screening error:', error);
            return null;
        }
    }

    /**
     * Ingest data from ERP system
     */
    static async ingestFromERP(erpConnectionId, entityTypes, autoResolve = false) {
        try {
            const loadingToast = toast.loading('Importing data from ERP...');

            const response = await base44.functions.invoke('erpDataIngestion', {
                erp_connection_id: erpConnectionId,
                entity_types: entityTypes,
                auto_resolve_conflicts: autoResolve
            });

            toast.dismiss(loadingToast);

            if (response.data.success) {
                const report = response.data.ingestion_report;
                let summary = [];
                
                Object.entries(report.results).forEach(([entity, stats]) => {
                    summary.push(`${entity}: ${stats.created} created, ${stats.updated} updated, ${stats.conflicts} conflicts`);
                });

                toast.success('ERP Import Complete', {
                    description: summary.join('\n'),
                    duration: 6000
                });

                return report;
            } else {
                toast.error('ERP import failed');
                return null;
            }
        } catch (error) {
            console.error('ERP ingestion error:', error);
            toast.error('Failed to import from ERP');
            return null;
        }
    }
}

export default SupplierOrchestrationService;