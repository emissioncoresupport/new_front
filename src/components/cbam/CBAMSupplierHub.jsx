import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Network, Building2 } from "lucide-react";
import CBAMUnifiedSupplierHub from './unified/CBAMUnifiedSupplierHub';
import CBAMSupplyChain from './CBAMSupplyChain';
import CBAMInstallations from './CBAMInstallations';

export default function CBAMSupplierHub() {
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
        <h2 className="text-base font-medium text-slate-900">Supplier Management</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Consolidated supplier onboarding, approvals, and installation tracking
        </p>
      </div>

      <Tabs defaultValue="suppliers" className="space-y-5">
        <TabsList className="bg-slate-50/50 border-b border-slate-200/60 rounded-none h-auto p-0 w-full justify-start">
          <TabsTrigger value="suppliers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">
            Suppliers & Submissions
          </TabsTrigger>
          <TabsTrigger value="network" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">
            Supply Chain Network
          </TabsTrigger>
          <TabsTrigger value="installations" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">
            Installations Registry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers">
          <CBAMUnifiedSupplierHub />
        </TabsContent>

        <TabsContent value="network">
          <CBAMSupplyChain />
        </TabsContent>

        <TabsContent value="installations">
          <CBAMInstallations />
        </TabsContent>
      </Tabs>
    </div>
  );
}