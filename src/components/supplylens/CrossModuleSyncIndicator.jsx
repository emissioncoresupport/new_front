/**
 * Cross-Module Sync Indicator
 * Real-time visual status for supplier data propagation across modules
 */

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function CrossModuleSyncIndicator({ supplier, compact = false }) {
    if (!supplier) return null;

    const syncStatus = {
        eu_validated: supplier.validation_status === 'verified',
        dpp_synced: supplier.dpp_actor_id || false,
        cbam_synced: supplier.cbam_installations_count > 0,
        scope3_calculated: supplier.scope3_last_calc_date || false,
        pact_requested: supplier.pact_request_sent || false
    };

    const allSynced = Object.values(syncStatus).filter(Boolean).length;
    const totalModules = Object.keys(syncStatus).length;
    const syncPercentage = Math.round((allSynced / totalModules) * 100);

    if (compact) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5">
                            <div className={cn(
                                "w-2 h-2 rounded-full",
                                syncPercentage === 100 ? "bg-[#86b027]" :
                                syncPercentage >= 60 ? "bg-amber-500" :
                                syncPercentage > 0 ? "bg-blue-500" :
                                "bg-slate-300"
                            )} />
                            <span className="text-[10px] font-light text-slate-600">
                                {allSynced}/{totalModules}
                            </span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="space-y-1 text-xs">
                            <SyncBadge synced={syncStatus.eu_validated} label="EU Validated" />
                            <SyncBadge synced={syncStatus.dpp_synced} label="DPP Actor" />
                            <SyncBadge synced={syncStatus.cbam_synced} label="CBAM Inst." />
                            <SyncBadge synced={syncStatus.scope3_calculated} label="Scope 3" />
                            <SyncBadge synced={syncStatus.pact_requested} label="PACT" />
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <div className="grid grid-cols-5 gap-2">
            <SyncCard synced={syncStatus.eu_validated} label="EU Registry" icon={CheckCircle2} />
            <SyncCard synced={syncStatus.dpp_synced} label="DPP" icon={Zap} />
            <SyncCard synced={syncStatus.cbam_synced} label="CBAM" icon={Zap} />
            <SyncCard synced={syncStatus.scope3_calculated} label="Scope 3" icon={Zap} />
            <SyncCard synced={syncStatus.pact_requested} label="PACT" icon={Zap} />
        </div>
    );
}

function SyncBadge({ synced, label }) {
    return (
        <div className="flex items-center gap-2">
            {synced ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            ) : (
                <XCircle className="w-3 h-3 text-slate-400" />
            )}
            <span className={synced ? "text-emerald-600" : "text-slate-500"}>{label}</span>
        </div>
    );
}

function SyncCard({ synced, label, icon: Icon }) {
    return (
        <div className={cn(
            "relative p-3 rounded-lg border text-center transition-all overflow-hidden",
            synced 
                ? "bg-[#86b027]/10 border-[#86b027]/30 backdrop-blur-sm" 
                : "bg-white/30 border-white/40 backdrop-blur-sm"
        )}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
            <div className="relative">
                <Icon className={cn(
                    "w-4 h-4 mx-auto mb-1",
                    synced ? "text-[#86b027]" : "text-slate-400"
                )} />
                <p className="text-[9px] font-light uppercase tracking-wider text-slate-700">{label}</p>
                {synced && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#86b027] animate-pulse" />
                )}
            </div>
        </div>
    );
}