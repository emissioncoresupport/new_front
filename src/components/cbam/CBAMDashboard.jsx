import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertTriangle, TrendingUp, Leaf, Euro, FileCheck, 
  CalendarClock, ArrowUpRight, Info, BarChart3, PieChart, Scale, Layers,
  Filter, Globe, Calendar, UserCheck, RefreshCw, X, Download, CheckCircle2, Shield, Cloud
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CBAMRiskMap from './CBAMRiskMap';
import EmissionsTrendChart from './charts/EmissionsTrendChart';
import CountrySectorBreakdown from './charts/CountrySectorBreakdown';
import CBAMDeMinimisTracker from './CBAMDeMinimisTracker';
import CBAMDeadlineWidget from './CBAMDeadlineWidget';
import CBAMComplianceChecklist from './CBAMComplianceChecklist';
import CBAMCertificatePriceWidget from './CBAMCertificatePriceWidget';

import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { isEUCountry } from './constants.jsx';
import { getCurrentCompany } from '@/components/utils/multiTenant';

export default function CBAMDashboard({ reports, entries, certificates, purchaseOrders = [] }) {
  const [year, setYear] = useState("2026");
  const [period, setPeriod] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const queryClient = useQueryClient();

  // Get current company for multi-tenant filtering
  const { data: company } = useQuery({
    queryKey: ['current-company'],
    queryFn: getCurrentCompany
  });

  // Filter data by company
  const companyEntries = entries.filter(e => !company || e.company_id === company.id || e.created_by === company.id);
  const companyCertificates = certificates.filter(c => !company || c.company_id === company.id || c.created_by === company.id);
  const companyOrders = purchaseOrders.filter(o => !company || o.company_id === company.id || o.created_by === company.id);

  // Fetch real EU ETS prices
  const { data: priceHistory = [] } = useQuery({
    queryKey: ['cbam-price-history'],
    queryFn: () => base44.entities.CBAMPriceHistory.list('-date', 20)
  });

  // Calculate Filters
  const filteredEntries = useMemo(() => {
    return companyEntries.filter(e => {
      // Country Filter
      if (selectedCountry !== "all" && e.country_of_origin !== selectedCountry) return false;
      
      // Date Filter
      if (!e.import_date) return true;
      const date = new Date(e.import_date);
      const entryYear = date.getFullYear().toString();
      const month = date.getMonth();
      const q = month < 3 ? "Q1" : month < 6 ? "Q2" : month < 9 ? "Q3" : "Q4";
      
      if (year !== "all" && entryYear !== year) return false;
      if (period !== "all" && q !== period) return false;
      
      return true;
    });
  }, [companyEntries, year, period, selectedCountry]);

  // Derive Dropdown Options (exclude EU countries - CBAM only for non-EU imports)
  const countries = useMemo(() => 
    [...new Set(companyEntries.map(e => e.country_of_origin).filter(c => c && !isEUCountry(c)))].sort(), 
    [companyEntries]
  );

  // Calculate Stats based on filtered data - handle both field naming conventions
  const totalEmissions = filteredEntries.reduce((acc, curr) => {
    const emissions = curr.total_embedded_emissions || 0;
    // If no pre-calculated emissions, calculate from specific values
    if (emissions === 0) {
      const qty = curr.quantity || curr.net_mass_tonnes || 0;
      const direct = curr.direct_emissions_specific || 0;
      const indirect = curr.indirect_emissions_specific || 0;
      return acc + (qty * (direct + indirect));
    }
    return acc + emissions;
  }, 0);
  const totalImports = filteredEntries.length;
  
  // Certificate Calculations with correct regulatory formula
  const currentBalance = companyCertificates
    .filter(c => c.status === 'active')
    .reduce((acc, curr) => acc + (curr.quantity || 0), 0);
    
  const pendingOrdersQuantity = companyOrders
    .filter(o => o.status === 'draft' || o.status === 'pending_approval' || o.status === 'approved')
    .reduce((acc, curr) => acc + (curr.quantity || 0), 0);

  // Use pre-calculated certificates_required if available, otherwise 1:1 ratio
  const chargeableEmissions = filteredEntries.reduce((acc, curr) => {
    return acc + (curr.certificates_required || curr.total_embedded_emissions || 0);
  }, 0);
  const requiredCertificates = Math.ceil(chargeableEmissions || totalEmissions);
  const shortfall = Math.max(0, requiredCertificates - (currentBalance + pendingOrdersQuantity));
  
  // Real EU ETS price - use latest available or calculate average
  const latestPrice = priceHistory[0]?.cbam_certificate_price || priceHistory[0]?.eua_price || 85;
  const avgPrice = priceHistory.length > 0 
    ? priceHistory.reduce((sum, p) => sum + (p.cbam_certificate_price || p.eua_price || 0), 0) / priceHistory.length
    : 85;

  // Mock Status Logic (Simulated from entries)
  const verifiedCount = filteredEntries.filter(e => e.validation_status === 'ai_validated' || e.validation_status === 'manual_verified').length;
  const pendingCount = filteredEntries.filter(e => e.validation_status === 'pending').length;
  const readiness = totalImports > 0 ? Math.round((verifiedCount / totalImports) * 100) : 0;
  
  // Mutation for Auto-Purchase
  const createOrderMutation = useMutation({
    mutationFn: (qty) => base44.entities.CBAMPurchaseOrder.create({
      company_id: company?.id,
      order_number: `PO-CBAM-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      quantity: qty,
      estimated_price: avgPrice,
      total_amount: qty * avgPrice,
      order_date: new Date().toISOString().split('T')[0],
      status: "draft",
      supplier: "EU CBAM Registry",
      notes: `Auto-generated for projected shortfall of ${qty} units.`
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-purchase-orders'] });
      toast.success(`Draft Purchase Order created for ${shortfall} certificates`);
    }
  });



  const resetFilters = () => {
    setYear("2026");
    setPeriod("Q1");
    setSelectedCountry("all");
  };

  return (
    <div className="space-y-8">
      
      {/* Certificate Price + De Minimis + Deadline + Compliance */}
      <div className="grid grid-cols-4 gap-4">
        <CBAMCertificatePriceWidget />
        <CBAMDeMinimisTracker />
        <CBAMDeadlineWidget />
        <CBAMComplianceChecklist />
      </div>

      {/* Tesla-Style Filter Control */}
      <div className="flex items-center justify-start gap-3 py-6">
        {/* Year Selector */}
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="h-10 w-[110px] bg-white/70 backdrop-blur-2xl text-slate-900 border border-white/60 rounded-xl hover:bg-white/90 hover:shadow-lg transition-all font-light text-sm shadow-md">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2026">2026</SelectItem>
            <SelectItem value="all">All Years</SelectItem>
          </SelectContent>
        </Select>

        {/* Period Selector */}
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="h-10 w-[100px] bg-white/70 backdrop-blur-2xl text-slate-900 border border-white/60 rounded-xl hover:bg-white/90 hover:shadow-lg transition-all font-light text-sm shadow-md">
            <SelectValue placeholder="Qtr" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Q1">Q1</SelectItem>
            <SelectItem value="Q2">Q2</SelectItem>
            <SelectItem value="Q3">Q3</SelectItem>
            <SelectItem value="Q4">Q4</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>

        {/* Country Selector */}
        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
          <SelectTrigger className="h-10 w-[160px] bg-white/70 backdrop-blur-2xl text-slate-900 border border-white/60 rounded-xl hover:bg-white/90 hover:shadow-lg transition-all font-light text-sm shadow-md">
            <SelectValue placeholder="Origin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Origins</SelectItem>
            {countries.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button 
          onClick={resetFilters} 
          className="h-10 w-10 bg-white/70 hover:bg-white/90 backdrop-blur-2xl text-red-500 border border-white/60 rounded-xl transition-all shadow-md hover:shadow-lg p-0"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Scorecards - Enhanced Tesla Style */}
      <div className="grid grid-cols-4 gap-4">
        <div className="relative bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-[0_4px_16px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.5)_inset] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative p-5 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/60 flex items-center justify-center shadow-sm">
              <FileCheck className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
            </div>
            <div className="text-3xl font-light text-slate-900 mb-1">{totalImports}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-light">Total Imports</div>
            <div className="text-[9px] text-slate-400 mt-0.5 font-light">{year} {period}</div>
          </div>
        </div>

        <div className="relative bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-[0_4px_16px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.5)_inset] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative p-5 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/60 flex items-center justify-center shadow-sm">
              <Cloud className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
            </div>
            <div className="text-3xl font-light text-slate-900 mb-1">{totalEmissions.toFixed(1)}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-light">Emissions</div>
            <div className="text-[9px] text-slate-400 mt-0.5 font-light">tCO2e</div>
          </div>
        </div>

        <div className="relative bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-[0_4px_16px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.5)_inset] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative p-5 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/60 flex items-center justify-center shadow-sm">
              <Euro className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
            </div>
            <div className="text-3xl font-light text-slate-900 mb-1">{requiredCertificates}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-light">Certificates</div>
            <div className="text-[9px] text-[#02a1e8] mt-0.5 font-light">tCO2e chargeable</div>
          </div>
        </div>

        <div className="relative bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-[0_4px_16px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.5)_inset] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative p-5 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/60 flex items-center justify-center shadow-sm">
              <Scale className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
            </div>
            <div className="text-3xl font-light text-slate-900 mb-1">
              {filteredEntries.reduce((sum, e) => sum + (e.quantity || 0), 0).toFixed(1)}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-light">Total Goods</div>
            <div className="text-[9px] text-slate-400 mt-0.5 font-light">tonnes</div>
          </div>
        </div>
      </div>

      {/* Minimalist Alert */}
      {shortfall > 0 && (
        <div className="relative bg-gradient-to-br from-amber-50/60 via-amber-50/40 to-amber-50/30 backdrop-blur-xl rounded-2xl border border-amber-300/40 shadow-[0_4px_16px_rgba(251,191,36,0.12)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-100/20 via-transparent to-transparent pointer-events-none"></div>
          <div className="relative p-5 flex items-center justify-between">
            <div>
              <h4 className="font-light text-slate-900 text-base">Certificate Shortfall Detected</h4>
              <p className="text-sm text-slate-600 mt-1 font-light">
                <strong>{shortfall} units</strong> needed (Have: {currentBalance + pendingOrdersQuantity})
              </p>
            </div>
            <Button 
              onClick={() => createOrderMutation.mutate(shortfall)} 
              disabled={createOrderMutation.isPending}
              className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-md text-sm font-light"
            >
              {createOrderMutation.isPending ? 'Generating...' : 'Auto-Purchase'}
            </Button>
          </div>
        </div>
      )}







      {/* Clean Map Section */}
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative px-6 py-5 border-b border-white/40">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-extralight text-slate-900">Geographic Risk Exposure</h3>
              <p className="text-sm text-slate-500 mt-0.5 font-light">Import origins and carbon pricing</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 font-light">{countries.length} Origins</span>
              <Button variant="outline" size="sm" className="rounded-md border-slate-300 text-slate-700 hover:bg-slate-50 font-light">
                Export
              </Button>
            </div>
          </div>
        </div>
        <div className="h-[500px] relative">
          <CBAMRiskMap />
        </div>
      </div>
    </div>
  );
}