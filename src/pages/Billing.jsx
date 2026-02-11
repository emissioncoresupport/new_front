import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Euro, TrendingUp, BarChart3, Settings, FileText, Clock, ShieldAlert } from "lucide-react";
import { base44 } from '@/api/base44Client';
import BillingDashboard from '@/components/billing/BillingDashboard';
import UsageHistory from '@/components/billing/UsageHistory';
import PricingConfiguration from '@/components/billing/PricingConfiguration';
import InvoiceManagement from '@/components/billing/InvoiceManagement';

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="max-w-md border-rose-200">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Admin Access Required</h2>
            <p className="text-slate-600">
              This page is only accessible to administrators for internal billing and revenue tracking.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
                <Euro className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Internal Usage & Billing</h1>
                <p className="text-sm text-slate-600 mt-1">
                  Admin-only: Track all tenant usage, manage pricing, and generate customer invoices
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-rose-600 text-white px-3 py-1">
                <ShieldAlert className="w-3 h-3 mr-1" />
                Admin Only
              </Badge>
              <Badge className="bg-blue-600 text-white px-3 py-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-8 py-6">
        <Alert className="mb-6 border-rose-200 bg-rose-50">
          <ShieldAlert className="h-4 w-4 text-rose-600" />
          <AlertDescription className="text-sm text-slate-700">
            <strong>Internal Use Only:</strong> This billing module tracks all customer usage across CBAM, EUDR, PPWR, SupplyLens, and other modules for revenue management. 
            All operations (calculations, AI calls, reports, DDS submissions) are automatically logged and billed.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2">
            <TabsList className="bg-transparent p-0 inline-flex h-auto gap-1 w-full justify-start">
              <TabsTrigger value="dashboard" className="gap-2 rounded-lg px-4 py-3 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all hover:bg-slate-50">
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="usage" className="gap-2 rounded-lg px-4 py-3 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all hover:bg-slate-50">
                <Clock className="w-4 h-4" />
                Usage History
              </TabsTrigger>
              <TabsTrigger value="invoices" className="gap-2 rounded-lg px-4 py-3 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all hover:bg-slate-50">
                <FileText className="w-4 h-4" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="pricing" className="gap-2 rounded-lg px-4 py-3 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all hover:bg-slate-50">
                <Settings className="w-4 h-4" />
                Pricing Config
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard">
            <BillingDashboard />
          </TabsContent>

          <TabsContent value="usage">
            <UsageHistory />
          </TabsContent>

          <TabsContent value="invoices">
            <InvoiceManagement />
          </TabsContent>

          <TabsContent value="pricing">
            <PricingConfiguration />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}