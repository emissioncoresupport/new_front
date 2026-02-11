/**
 * CBAM Unified Certificates Hub
 * CONSOLIDATES: CBAMCertificateMarketplace, CBAMCertificates, CBAMCertificateAutomation
 * Single interface for purchasing, managing, and automating certificate procurement
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { 
  Euro, ShoppingCart, CheckCircle2, AlertTriangle, 
  TrendingUp, Zap, Settings
} from "lucide-react";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CBAMUnifiedCertificatesHub() {
  const [activeTab, setActiveTab] = useState('purchase');
  const [selectedReport, setSelectedReport] = useState(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState('');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  
  // Automation settings
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [threshold, setThreshold] = useState(10);
  const [priceThreshold, setPriceThreshold] = useState(100);

  const queryClient = useQueryClient();

  // Fetch data
  const { data: reports = [] } = useQuery({
    queryKey: ['cbam-reports'],
    queryFn: () => base44.entities.CBAMReport.list('-submission_deadline')
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['cbam-certificates'],
    queryFn: () => base44.entities.CBAMCertificate.list('-purchase_date')
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['cbam-purchase-orders'],
    queryFn: () => base44.entities.CBAMPurchaseOrder.list('-created_date')
  });

  const { data: priceHistory = [] } = useQuery({
    queryKey: ['cbam-price-history'],
    queryFn: () => base44.entities.CBAMPriceHistory.list('-date', 20)
  });

  // Calculate balance
  const balance = certificates
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + (c.quantity || 0), 0);

  const requiredTotal = reports
    .filter(r => r.status !== 'draft')
    .reduce((sum, r) => sum + (r.certificates_required || 0), 0);

  const shortfall = Math.max(0, requiredTotal - balance);

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: async ({ reportId, quantity }) => {
      const response = await base44.functions.invoke('cbamCertificatePurchase', {
        action: 'purchase',
        report_id: reportId,
        certificates_quantity: parseFloat(quantity),
        payment_method: 'bank_transfer'
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-certificates'] });
      queryClient.invalidateQueries({ queryKey: ['cbam-purchase-orders'] });
      setShowPurchaseModal(false);
      setSelectedReport(null);
      toast.success('Certificate purchase initiated');
    }
  });

  // ETS price trend data
  const latestPrice = priceHistory[0]?.cbam_certificate_price || 88.9;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-base font-medium text-slate-900">Unified Certificates Hub</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Purchase, manage, and automate certificate procurement
            </p>
          </div>
          <Badge className="bg-blue-50 text-blue-700 border border-blue-100 text-xs">
            Live EUA: €{latestPrice.toFixed(2)}
          </Badge>
        </div>
      </div>

      {/* Balance Grid */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Balance</p>
          <p className="text-3xl font-light text-slate-900">{balance.toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-1.5">Certificates owned</p>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Required</p>
          <p className="text-3xl font-light text-slate-900">{requiredTotal.toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-1.5">Total obligations</p>
        </div>
        <div className={`border rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center ${shortfall > 0 ? 'bg-red-50/30 border-red-200/60' : 'bg-emerald-50/30 border-emerald-200/60'}`}>
          <p className="text-[10px] uppercase tracking-wide mb-2">{shortfall > 0 ? 'Shortfall' : 'Surplus'}</p>
          <p className={`text-3xl font-light ${shortfall > 0 ? 'text-red-900' : 'text-emerald-900'}`}>{Math.abs(shortfall).toFixed(2)}</p>
          <p className="text-xs mt-1.5">{shortfall > 0 ? 'Must purchase' : 'Extra certificates'}</p>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Pending Orders</p>
          <p className="text-3xl font-light text-slate-900">
            {purchaseOrders.filter(o => ['draft', 'pending_approval'].includes(o.status)).length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-50/50 border-b border-slate-200/60 rounded-none h-auto p-0 w-full justify-start">
          <TabsTrigger value="purchase" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">
            Purchase
          </TabsTrigger>
          <TabsTrigger value="automation" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">
            Automation
          </TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">
            Inventory
          </TabsTrigger>
        </TabsList>

        {/* Purchase Tab */}
        <TabsContent value="purchase">
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="border-b border-slate-200/60 px-5 py-4">
                <h3 className="text-sm font-medium text-slate-900">Reports Requiring Certificates</h3>
              </div>
              <div className="p-5 space-y-3 max-h-[400px] overflow-y-auto">
                {reports.filter(r => (r.certificates_required || 0) > (r.certificates_surrendered || 0)).map(report => (
                  <button
                    key={report.id}
                    onClick={() => {
                      setSelectedReport(report);
                      setPurchaseQuantity(((report.certificates_required || 0) - (report.certificates_surrendered || 0)).toFixed(2));
                      setShowPurchaseModal(true);
                    }}
                    className="w-full p-4 border border-slate-200 rounded-lg text-left hover:border-slate-900 transition-colors"
                  >
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-medium text-slate-900">{report.reporting_period}</h4>
                        <p className="text-xs text-slate-500">EORI: {report.eori_number}</p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-800 border-0">
                        {((report.certificates_required || 0) - (report.certificates_surrendered || 0)).toFixed(2)} tCO2e
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ETS Price Chart */}
            <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="border-b border-slate-200/60 px-5 py-4">
                <h3 className="text-sm font-medium text-slate-900">EU ETS Price Trend</h3>
              </div>
              <div className="p-5">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={priceHistory.slice(0, 12).reverse()}>
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#86b027" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#86b027" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="quarter" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip />
                    <Area type="monotone" dataKey="cbam_certificate_price" stroke="#86b027" strokeWidth={2} fill="url(#priceGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation">
          <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
            <h3 className="text-sm font-medium text-slate-900 mb-4">Auto-Purchase Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <Label className="text-sm font-medium">Enable Automation</Label>
                  <p className="text-xs text-slate-500">Auto-generate purchase orders when shortfall detected</p>
                </div>
                <Switch checked={automationEnabled} onCheckedChange={setAutomationEnabled} />
              </div>

              {automationEnabled && (
                <>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <div>
                      <Label className="text-sm font-medium">Auto-Approve Orders</Label>
                      <p className="text-xs text-slate-500">Automatically execute purchases (requires approval otherwise)</p>
                    </div>
                    <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Shortfall Threshold (tCO2e)</Label>
                      <Input
                        type="number"
                        value={threshold}
                        onChange={(e) => setThreshold(parseFloat(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Max Price (€/tCO2e)</Label>
                      <Input
                        type="number"
                        value={priceThreshold}
                        onChange={(e) => setPriceThreshold(parseFloat(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-900">
                      <strong>Current Status:</strong> {shortfall >= threshold ? `Shortfall (${shortfall.toFixed(2)} tCO2e) triggers auto-purchase` : 'No action required'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="border-b border-slate-200/60 px-5 py-4">
              <h3 className="text-sm font-medium text-slate-900">Certificate Portfolio</h3>
            </div>
            <div className="p-5 space-y-3">
              {certificates.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Euro className="w-12 h-12 mx-auto mb-3" />
                  <p className="text-sm">No certificates purchased</p>
                </div>
              ) : (
                certificates.map(cert => (
                  <div key={cert.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{cert.quantity || 0} tCO2e</p>
                      <p className="text-xs text-slate-500">
                        Purchased: {cert.purchase_date} • Expires: {cert.expiry_date}
                      </p>
                    </div>
                    <Badge className={cert.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-slate-100 text-slate-700 border-0'}>
                      {cert.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Purchase Modal */}
      <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase CBAM Certificates</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900">{selectedReport.reporting_period}</p>
                <p className="text-xs text-blue-700">EORI: {selectedReport.eori_number}</p>
              </div>
              <div>
                <Label>Quantity (tCO2e)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={purchaseQuantity}
                  onChange={(e) => setPurchaseQuantity(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">Price:</span>
                  <span className="font-mono">€{latestPrice.toFixed(2)} / tCO2e</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-900">Total:</span>
                  <span className="text-[#86b027]">€{(parseFloat(purchaseQuantity || 0) * latestPrice).toFixed(2)}</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPurchaseModal(false)}>Cancel</Button>
                <Button
                  onClick={() => purchaseMutation.mutate({ reportId: selectedReport.id, quantity: purchaseQuantity })}
                  disabled={!purchaseQuantity || purchaseMutation.isPending}
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {purchaseMutation.isPending ? 'Processing...' : 'Purchase'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}