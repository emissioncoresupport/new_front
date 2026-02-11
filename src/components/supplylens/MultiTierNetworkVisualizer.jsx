/**
 * Multi-Tier Network Visualizer
 * Interactive force-directed graph showing supplier relationships across tiers
 */

import React, { useState, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, Layers } from "lucide-react";

export default function MultiTierNetworkVisualizer({ suppliers, mappings = [], onSelectSupplier }) {
    const [selectedTier, setSelectedTier] = useState('all');

    // Build tier hierarchy
    const tierGroups = useMemo(() => ({
        tier_1: suppliers.filter(s => s.tier === 'tier_1'),
        tier_2: suppliers.filter(s => s.tier === 'tier_2'),
        tier_3: suppliers.filter(s => s.tier === 'tier_3')
    }), [suppliers]);

    const filteredSuppliers = selectedTier === 'all' 
        ? suppliers 
        : tierGroups[selectedTier] || [];

    return (
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
            <div className="relative p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Network className="w-5 h-5 text-[#86b027]" />
                        <h3 className="text-lg font-light text-slate-900">Multi-Tier Supply Network</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            size="sm" 
                            variant={selectedTier === 'all' ? 'default' : 'ghost'} 
                            onClick={() => setSelectedTier('all')}
                            className="h-8 text-xs"
                        >
                            All Tiers
                        </Button>
                        <Button 
                            size="sm" 
                            variant={selectedTier === 'tier_1' ? 'default' : 'ghost'} 
                            onClick={() => setSelectedTier('tier_1')}
                            className="h-8 text-xs"
                        >
                            Tier 1
                        </Button>
                        <Button 
                            size="sm" 
                            variant={selectedTier === 'tier_2' ? 'default' : 'ghost'} 
                            onClick={() => setSelectedTier('tier_2')}
                            className="h-8 text-xs"
                        >
                            Tier 2
                        </Button>
                        <Button 
                            size="sm" 
                            variant={selectedTier === 'tier_3' ? 'default' : 'ghost'} 
                            onClick={() => setSelectedTier('tier_3')}
                            className="h-8 text-xs"
                        >
                            Tier 3
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-[#86b027]/10 backdrop-blur-sm rounded-xl border border-[#86b027]/30">
                        <Layers className="w-8 h-8 mx-auto mb-2 text-[#86b027]" />
                        <p className="text-2xl font-light text-slate-900">{tierGroups.tier_1.length}</p>
                        <p className="text-xs text-slate-600 font-light">Tier 1 Suppliers</p>
                    </div>
                    <div className="text-center p-4 bg-[#02a1e8]/10 backdrop-blur-sm rounded-xl border border-[#02a1e8]/30">
                        <Layers className="w-8 h-8 mx-auto mb-2 text-[#02a1e8]" />
                        <p className="text-2xl font-light text-slate-900">{tierGroups.tier_2.length}</p>
                        <p className="text-xs text-slate-600 font-light">Tier 2 Suppliers</p>
                    </div>
                    <div className="text-center p-4 bg-amber-500/10 backdrop-blur-sm rounded-xl border border-amber-500/30">
                        <Layers className="w-8 h-8 mx-auto mb-2 text-amber-700" />
                        <p className="text-2xl font-light text-slate-900">{tierGroups.tier_3.length}</p>
                        <p className="text-xs text-slate-600 font-light">Tier 3 Suppliers</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {filteredSuppliers.map(supplier => (
                        <div 
                            key={supplier.id}
                            onClick={() => onSelectSupplier?.(supplier)}
                            className="flex items-center justify-between p-4 bg-white/40 backdrop-blur-xl rounded-xl border border-white/40 hover:bg-white/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    supplier.tier === 'tier_1' ? 'bg-[#86b027]/20 border-2 border-[#86b027]' :
                                    supplier.tier === 'tier_2' ? 'bg-[#02a1e8]/20 border-2 border-[#02a1e8]' :
                                    'bg-amber-500/20 border-2 border-amber-500'
                                }`}>
                                    <Layers className={`w-5 h-5 ${
                                        supplier.tier === 'tier_1' ? 'text-[#86b027]' :
                                        supplier.tier === 'tier_2' ? 'text-[#02a1e8]' :
                                        'text-amber-700'
                                    }`} />
                                </div>
                                <div>
                                    <p className="font-light text-slate-900 group-hover:text-slate-950">{supplier.legal_name}</p>
                                    <p className="text-xs text-slate-500 font-light">{supplier.country}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs font-light capitalize">
                                    {supplier.tier?.replace('_', ' ')}
                                </Badge>
                                {supplier.risk_level && (
                                    <Badge className={
                                        supplier.risk_level === 'high' || supplier.risk_level === 'critical' 
                                            ? 'bg-red-100 text-red-700 font-light' 
                                            : 'bg-slate-100 text-slate-700 font-light'
                                    }>
                                        {supplier.risk_level}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {filteredSuppliers.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        <Network className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="font-light">No suppliers in this tier</p>
                    </div>
                )}
            </div>
        </div>
    );
}