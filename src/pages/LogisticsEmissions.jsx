import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Truck, FileText, Plus, UploadCloud, Download, Calculator, Container, Database } from "lucide-react";
import CarrierManager from '@/components/carriers/CarrierManager';
import { Button } from "@/components/ui/button";
import LogisticsDashboard from '@/components/logistics/LogisticsDashboard';
import ShipmentList from '@/components/logistics/ShipmentList';
import EvidenceVault from '@/components/logistics/EvidenceVault';
import NewShipmentModal from '@/components/logistics/NewShipmentModal';
import LogisticsBulkImport from '@/components/logistics/LogisticsBulkImport';
import EmissionFactorManager from '@/components/logistics/EmissionFactorManager';
import TMSIntegrationStatus from '@/components/logistics/TMSIntegrationStatus';
import IntermodalComparison from '@/components/logistics/IntermodalComparison';
import CarrierBenchmarking from '@/components/logistics/CarrierBenchmarking';
import CustomerCarbonReceipts from '@/components/logistics/CustomerCarbonReceipts';
import LogisticsBackendValidator from '@/components/logistics/LogisticsBackendValidator';
import ISO14083CompliancePanel from '@/components/logistics/ISO14083CompliancePanel';

export default function LogisticsEmissionsPage() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [showNewShipment, setShowNewShipment] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/30 to-white p-6 md:p-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest font-light mb-2">
                  <Truck className="w-3.5 h-3.5" />
                  Logistics Emissions
                </div>
                <h1 className="text-4xl font-light text-slate-900 tracking-tight">Logistics & Transport</h1>
                <p className="text-slate-500 font-light mt-1">ISO 14083 compliant - GLEC Framework.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowBulkImport(true)}
                  className="bg-white/50 backdrop-blur-sm border-slate-200 hover:bg-white hover:shadow-md transition-all h-9 text-sm font-normal"
                >
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
                <Button 
                  onClick={() => setShowNewShipment(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm h-9 text-sm font-normal"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Shipment
                </Button>
              </div>
            </div>

            <div className="relative bg-white/50 backdrop-blur-sm rounded-lg border border-slate-200/60 shadow-sm overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-white/50 backdrop-blur-md border-b border-slate-200/60 rounded-none h-auto p-0 w-full justify-start">
                        <TabsTrigger
                            value="dashboard"
                            className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
                        >
                            <span className="relative z-10">Dashboard</span>
                        </TabsTrigger>
                        <TabsTrigger value="shipments" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
                            <span className="relative z-10">Shipments</span>
                        </TabsTrigger>
                        <TabsTrigger value="evidence" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
                            <span className="relative z-10">Evidence</span>
                        </TabsTrigger>
                        <TabsTrigger value="factors" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
                            <span className="relative z-10">Factors</span>
                        </TabsTrigger>
                        <TabsTrigger value="carriers" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
                            <span className="relative z-10">Carriers</span>
                        </TabsTrigger>
                        <TabsTrigger value="tms" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
                            <span className="relative z-10">TMS</span>
                        </TabsTrigger>
                        <TabsTrigger value="intermodal" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
                            <span className="relative z-10">Intermodal</span>
                        </TabsTrigger>
                        <TabsTrigger value="benchmarking" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
                            <span className="relative z-10">Benchmarking</span>
                        </TabsTrigger>
                        <TabsTrigger value="receipts" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
                            <span className="relative z-10">Receipts</span>
                        </TabsTrigger>
                        <TabsTrigger value="compliance" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
                            <span className="relative z-10">ISO 14083</span>
                        </TabsTrigger>
                        <TabsTrigger value="backend" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
                            <span className="relative z-10">Backend</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard" className="mt-0 p-6">
                        <LogisticsDashboard onNavigate={setActiveTab} />
                    </TabsContent>

                    <TabsContent value="shipments" className="mt-0 p-6">
                        <ShipmentList />
                    </TabsContent>

                    <TabsContent value="evidence" className="mt-0 p-6">
                        <EvidenceVault />
                    </TabsContent>

                    <TabsContent value="factors" className="mt-0 p-6">
                        <EmissionFactorManager />
                    </TabsContent>

                    <TabsContent value="carriers" className="mt-0 p-6">
                        <CarrierManager />
                    </TabsContent>

                    <TabsContent value="tms" className="mt-0 p-6">
                        <TMSIntegrationStatus />
                    </TabsContent>

                    <TabsContent value="intermodal" className="mt-0 p-6">
                        <IntermodalComparison />
                    </TabsContent>

                    <TabsContent value="benchmarking" className="mt-0 p-6">
                        <CarrierBenchmarking />
                    </TabsContent>

                    <TabsContent value="receipts" className="mt-0 p-6">
                        <CustomerCarbonReceipts />
                    </TabsContent>

                    <TabsContent value="compliance" className="mt-0 p-6">
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-2">ISO 14083:2023 Validation</h2>
                                <p className="text-sm text-slate-600">Validate shipments against international transport emission standard</p>
                            </div>
                            <div className="text-center py-8 text-slate-400">
                                <p>Select a shipment from the Registered Shipments tab to validate</p>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="backend" className="mt-0 p-6">
                        <LogisticsBackendValidator />
                    </TabsContent>
                </Tabs>
            </div>

            <NewShipmentModal open={showNewShipment} onOpenChange={setShowNewShipment} />
            <LogisticsBulkImport open={showBulkImport} onOpenChange={setShowBulkImport} />
        </div>
    );
}