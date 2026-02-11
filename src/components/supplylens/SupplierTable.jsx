import React from 'react';
import SupplierOrchestrationService from './SupplierOrchestrationService';
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Pencil, Trash2, MapPin, Building2, ExternalLink, Factory, AlertTriangle, RefreshCw, Database, ShieldCheck, Download, ShieldAlert } from "lucide-react";
import { createPageUrl } from "@/utils";
import RiskBadge from "./RiskBadge";
import TierBadge from "./TierBadge";
import RiskScoreGauge from "./RiskScoreGauge";
import { cn } from "@/lib/utils";
import CrossModuleSyncIndicator from "./CrossModuleSyncIndicator";

export default function SupplierTable({ suppliers, onView, onEdit, onDelete, onSyncCBAM, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-white/40 backdrop-blur-xl rounded-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-12">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#86b027] border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="bg-white/40 backdrop-blur-xl rounded-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-16 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100/80 flex items-center justify-center">
          <Building2 className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-lg font-light text-slate-900 mb-2">No suppliers found</h3>
        <p className="text-sm text-slate-600 font-medium">Add your first supplier or import from a file.</p>
      </div>
    );
  }

  const getCompletenessColor = (score) => {
    if (score >= 80) return "bg-[#86b027]";
    if (score >= 50) return "bg-slate-400";
    return "bg-slate-300";
  };

  const getRelevanceBadges = (supplier) => {
    const badges = [];
    if (supplier.cbam_relevant) badges.push({ label: "CBAM", color: "bg-slate-100 text-slate-700 border-slate-200" });
    if (supplier.pfas_relevant) badges.push({ label: "PFAS", color: "bg-slate-100 text-slate-700 border-slate-200" });
    if (supplier.eudr_relevant) badges.push({ label: "EUDR", color: "bg-slate-100 text-slate-700 border-slate-200" });
    if (supplier.ppwr_relevant) badges.push({ label: "PPWR", color: "bg-slate-100 text-slate-700 border-slate-200" });
    return badges;
  };

  return (
    <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
      <div className="relative overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/40 bg-white/20 backdrop-blur-md">
              <th className="text-left px-6 py-4 text-xs font-light text-slate-600 uppercase tracking-widest">Supplier</th>
              <th className="text-left px-6 py-4 text-xs font-light text-slate-600 uppercase tracking-widest">Location</th>
              <th className="text-left px-6 py-4 text-xs font-light text-slate-600 uppercase tracking-widest">Tier</th>
              <th className="text-center px-6 py-4 text-xs font-light text-slate-600 uppercase tracking-widest">Risk Score</th>
              <th className="text-left px-6 py-4 text-xs font-light text-slate-600 uppercase tracking-widest">Risk Level</th>
              <th className="text-left px-6 py-4 text-xs font-light text-slate-600 uppercase tracking-widest">Relevance</th>
              <th className="text-left px-6 py-4 text-xs font-light text-slate-600 uppercase tracking-widest">Data</th>
              <th className="text-center px-6 py-4 text-xs font-light text-slate-600 uppercase tracking-widest">Sync</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => {
              const relevanceBadges = getRelevanceBadges(supplier);
              return (
                <tr 
                  key={supplier.id} 
                  className="border-b border-white/30 hover:bg-white/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] cursor-pointer transition-all group"
                  onClick={() => onView(supplier)}
                >
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="font-light text-slate-900 group-hover:text-slate-950 transition-colors">{supplier.legal_name}</p>
                        {supplier.sanctions_status === 'blocked' && (
                          <Badge className="bg-red-100 text-red-700 border-red-200 text-[9px] font-light">
                            <ShieldAlert className="w-3 h-3 mr-1" /> SANCTIONED
                          </Badge>
                        )}
                      </div>
                      {supplier.trade_name && supplier.trade_name !== supplier.legal_name && (
                        <p className="text-xs text-slate-500 font-light">{supplier.trade_name}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm font-light">{supplier.country}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <TierBadge tier={supplier.tier} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <RiskScoreGauge score={supplier.risk_score} size="sm" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <RiskBadge level={supplier.risk_level} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {relevanceBadges.length > 0 ? (
                        relevanceBadges.map((badge, i) => (
                          <Badge key={i} variant="outline" className={cn("text-xs font-medium", badge.color)}>
                            {badge.label}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/40 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all", getCompletenessColor(supplier.data_completeness || 0))}
                          style={{ width: `${supplier.data_completeness || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-600 font-light min-w-[35px]">{supplier.data_completeness || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <CrossModuleSyncIndicator supplier={supplier} compact />
                  </td>
                  <td className="px-6 py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="h-8 w-8 rounded-lg hover:bg-white/60 transition-colors flex items-center justify-center">
                          <MoreHorizontal className="w-4 h-4 text-slate-600" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-2xl border-white/50">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(supplier); }}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(createPageUrl('SupplierPortal') + `?supplier_id=${supplier.id}`, '_blank'); }}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Portal
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(supplier); }}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async (e) => { 
                          e.stopPropagation(); 
                          await SupplierOrchestrationService.orchestrateSupplier(supplier.id, 'update');
                        }}>
                          <RefreshCw className="w-4 h-4 mr-2 text-[#86b027]" />
                          Sync to All Modules
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async (e) => { 
                          e.stopPropagation(); 
                          await SupplierOrchestrationService.requestPACTData(supplier.id);
                        }}>
                          <Database className="w-4 h-4 mr-2 text-slate-600" />
                          Request PACT PCF Data
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async (e) => { 
                          e.stopPropagation(); 
                          await SupplierOrchestrationService.validateEURegistries(supplier.id);
                        }}>
                          <ShieldCheck className="w-4 h-4 mr-2 text-slate-600" />
                          Validate EU Registries
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async (e) => {
                          e.stopPropagation();
                          const link = document.createElement('a');
                          link.href = `data:text/csv;charset=utf-8,${encodeURIComponent('BAFA Report Export\n\nSupplier: ' + supplier.legal_name)}`;
                          link.download = `BAFA_${supplier.legal_name}_${new Date().toISOString().split('T')[0]}.csv`;
                          link.click();
                        }}>
                          <Download className="w-4 h-4 mr-2 text-slate-500" /> Export BAFA Report
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); onDelete(supplier); }}
                          className="text-rose-600 focus:text-rose-700"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}