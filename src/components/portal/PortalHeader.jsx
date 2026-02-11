import React, { useState } from 'react';
import { Building2, MapPin, Globe, ShieldCheck, Lock, Shield, Info } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function PortalHeader({ supplier, token }) {
  return (
    <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-20 shadow-lg">
      {/* Top Security Bar */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-2">
        <div className="max-w-[1400px] mx-auto px-8 flex items-center justify-between text-xs">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Lock className="w-3 h-3" />
              <span className="font-semibold">Secure Connection (TLS 1.3)</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3 h-3" />
              <span className="font-semibold">GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3 h-3" />
              <span className="font-semibold">ISO 27001 Certified</span>
            </div>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 hover:underline">
                <Info className="w-3 h-3" />
                <span className="font-semibold">Privacy Policy</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 text-xs">
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Data Protection Notice</h4>
                <p className="text-slate-600">All data is encrypted (AES-256), stored in EU data centers (Frankfurt), and processed per GDPR Art. 6(1)(b) for contract fulfillment.</p>
                <p className="text-slate-600">Access logs are maintained for 90 days. Contact: privacy@emissioncore.eu</p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#02a1e8] to-[#0189c9] flex items-center justify-center shadow-xl shadow-[#02a1e8]/20 ring-4 ring-[#02a1e8]/10">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-extrabold text-[#545454] tracking-tight">{supplier.legal_name}</h1>
                <Badge className="bg-gradient-to-r from-[#86b027] to-[#769c22] text-white border-0 shadow-sm">
                  Verified Partner
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-[#545454]/70 mt-1 font-medium">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#86b027]" />
                  {supplier.city}, {supplier.country}
                </div>
                {supplier.vat_number && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">VAT:</span>
                    <span className="font-mono text-xs">{supplier.vat_number}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Session Type</p>
                <p className="text-sm font-bold text-slate-700">
                  {token ? '🔑 Tokenized Access' : '👤 Admin View'}
                </p>
              </div>
            </div>
            <div className="px-4 py-2 bg-gradient-to-br from-[#86b027]/10 to-[#769c22]/5 rounded-xl border border-[#86b027]/20">
              <p className="text-[10px] text-[#86b027] uppercase font-bold tracking-wider mb-0.5">Account ID</p>
              <p className="font-mono text-sm font-bold text-[#545454]">{supplier.id.substring(0, 12)}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}