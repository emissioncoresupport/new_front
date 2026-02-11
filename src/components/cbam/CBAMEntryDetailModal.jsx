import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Package, Globe, Calendar, Scale, Calculator, CheckCircle2, 
  AlertCircle, FileText, Euro, Layers, TrendingUp, Building2 
} from "lucide-react";
import { CountryFlag } from '@/components/utils/CountryFlagService';
import PrecursorBreakdownPanel from './PrecursorBreakdownPanel';

export default function CBAMEntryDetailModal({ entry, supplier, open, onClose }) {
  if (!entry) return null;

  const total = entry.total_embedded_emissions || 0;
  const certificates = entry.certificates_required || Math.ceil(total);
  const hasActualData = entry.calculation_method === 'EU_method' || entry.calculation_method === 'actual_values';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#86b027]" />
            Import Entry Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Header Card */}
          <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200/60">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="font-mono text-xs">
                      {entry.import_id || 'PENDING'}
                    </Badge>
                    <Badge className={hasActualData ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
                      {hasActualData ? 'Actual Data' : 'Default Values'}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">{entry.product_name || entry.goods_nomenclature}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">CN Code: {entry.cn_code}</p>
                </div>
                {entry.validation_status === 'ai_validated' || entry.validation_status === 'manual_verified' ? (
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-medium">Verified</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Pending</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Total Emissions</p>
                  <p className="text-2xl font-light text-slate-900">{total.toFixed(2)}</p>
                  <p className="text-xs text-slate-400">tCO2e</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Certificates Required</p>
                  <p className="text-2xl font-light text-slate-900">{certificates}</p>
                  <p className="text-xs text-slate-400">units</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Estimated Cost</p>
                  <p className="text-2xl font-light text-[#86b027]">€{(certificates * 88).toLocaleString()}</p>
                  <p className="text-xs text-slate-400">@ €88/unit</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Import Details */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-slate-600" />
                  Import Information
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Import Date:</span>
                    <span className="font-medium text-slate-900">{entry.import_date || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quantity:</span>
                    <span className="font-medium text-slate-900">{(entry.quantity || entry.net_mass_tonnes || 0).toFixed(3)} tonnes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">EORI Number:</span>
                    <span className="font-medium text-slate-900">{entry.eori_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Origin:</span>
                    <CountryFlag country={entry.country_of_origin} showName={true} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Calculator className="w-3.5 h-3.5 text-slate-600" />
                  Emissions Data
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Direct:</span>
                    <span className="font-medium text-slate-900">{(entry.direct_emissions_specific || 0).toFixed(3)} tCO2e/t</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Indirect:</span>
                    <span className="font-medium text-slate-900">{(entry.indirect_emissions_specific || 0).toFixed(3)} tCO2e/t</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Production Route:</span>
                    <span className="font-medium text-slate-900">{entry.production_route || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Markup Applied:</span>
                    <span className="font-medium text-slate-900">{entry.mark_up_percentage_applied || 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Supplier Info */}
          {supplier && (
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2 mb-3">
                  <Building2 className="w-3.5 h-3.5 text-slate-600" />
                  Supplier Information
                </h4>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{supplier.legal_name || supplier.trade_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{supplier.primary_contact_email || supplier.email}</p>
                  </div>
                  <Badge variant="outline">{supplier.country}</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Precursor Breakdown */}
          <PrecursorBreakdownPanel entry={entry} />

          {/* CBAM Calculation */}
          <Card className="bg-blue-50/30 border-blue-200/40">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2 mb-3">
                <Euro className="w-3.5 h-3.5 text-blue-600" />
                CBAM Obligation Breakdown
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Embedded Emissions:</span>
                  <span className="font-medium">{total.toFixed(2)} tCO2e</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Free Allocation (97.5% for 2026):</span>
                  <span className="font-medium">-{(entry.free_allocation_adjustment || 0).toFixed(2)} tCO2e</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Carbon Price Paid Abroad:</span>
                  <span className="font-medium">-€{(entry.carbon_price_due_paid || 0).toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-slate-900">Certificates Required:</span>
                  <span className="text-[#86b027]">{certificates} units</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-slate-900">Estimated Cost (€88/unit):</span>
                  <span className="text-[#86b027]">€{(certificates * 88).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Regulatory References */}
          <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-200/60">
            <p className="text-xs text-slate-600">
              <strong>Regulatory Basis:</strong> Commission Implementing Regulation (EU) 2025/8151 • 
              Default values per C(2025) 8552 • Free allocation per Art. 31 Reg 2023/956
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onClose(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}