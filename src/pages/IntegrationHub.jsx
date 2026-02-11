import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Settings, Users, Database, Send, Share2, FileText, ShieldCheck } from 'lucide-react';
import IntegrationHubComponent from '@/components/integration/IntegrationHub';
import SupplierInboxView from '@/components/supplylens/SupplierInboxView';
import SupplierPortalView from '@/components/supplylens/SupplierPortalView';

export default function IntegrationHubPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="border-b border-slate-200 bg-white/60 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-8 py-6">
          <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-[0.15em] font-medium mb-2">
            <Settings className="w-3.5 h-3.5 text-slate-700" />
            SupplyLens
          </div>
          <h1 className="text-3xl font-light text-slate-900 tracking-tight">Integrations</h1>
          <p className="text-slate-600 font-light mt-1">Data sources, supplier portals, and external system connections</p>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-8 py-8">
        <Tabs defaultValue="sources" className="space-y-8">
          <TabsList className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm rounded-lg p-1">
            <TabsTrigger 
              value="sources" 
              className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 rounded-md transition-all font-light"
            >
              <Database className="w-4 h-4 mr-2" />
              Data Sources
            </TabsTrigger>
            <TabsTrigger 
              value="portal" 
              className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 rounded-md transition-all font-light"
            >
              <Users className="w-4 h-4 mr-2" />
              Supplier Portal
            </TabsTrigger>
            <TabsTrigger 
              value="exchange" 
              className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 rounded-md transition-all font-light"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Supplier Exchange
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sources" className="space-y-6">
            <IntegrationHubComponent />
            
            {/* Contract 6: Connector Health */}
            <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all rounded-xl">
              <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-white/40 via-white/20 to-white/40 backdrop-blur-sm">
                <CardTitle className="text-base font-light tracking-tight text-slate-900">Connector Health</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-white/40 via-white/20 to-white/40 backdrop-blur-sm border-b border-slate-200/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Connector ID</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Last Sync</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Failures (24h)</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Retry Queue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50">
                      <tr className="hover:bg-white/50 backdrop-blur-sm transition-all duration-200">
                        <td className="px-6 py-4 font-mono text-xs text-slate-900 font-medium">SAP-ERP-01</td>
                        <td className="px-6 py-4"><Badge className="bg-slate-100 text-slate-900 border border-slate-300 text-xs">ACTIVE</Badge></td>
                        <td className="px-6 py-4 text-slate-600 font-light">2 min ago</td>
                        <td className="px-6 py-4 text-slate-900 font-light">0</td>
                        <td className="px-6 py-4 text-slate-900 font-light">0</td>
                      </tr>
                      <tr className="hover:bg-white/50 backdrop-blur-sm transition-all duration-200">
                        <td className="px-6 py-4 font-mono text-xs text-slate-900 font-medium">CUSTOMS-API-01</td>
                        <td className="px-6 py-4"><Badge className="bg-slate-200 text-slate-700 border border-slate-400 text-xs">DEGRADED</Badge></td>
                        <td className="px-6 py-4 text-slate-600 font-light">15 min ago</td>
                        <td className="px-6 py-4 text-slate-700 font-semibold">3</td>
                        <td className="px-6 py-4 text-slate-700 font-semibold">12</td>
                      </tr>
                      <tr className="hover:bg-white/50 backdrop-blur-sm transition-all duration-200">
                        <td className="px-6 py-4 font-mono text-xs text-slate-900 font-medium">SUPPLIER-PORTAL-01</td>
                        <td className="px-6 py-4"><Badge className="bg-slate-100 text-slate-900 border border-slate-300 text-xs">ACTIVE</Badge></td>
                        <td className="px-6 py-4 text-slate-600 font-light">5 min ago</td>
                        <td className="px-6 py-4 text-slate-900 font-light">0</td>
                        <td className="px-6 py-4 text-slate-900 font-light">0</td>
                      </tr>
                      <tr className="hover:bg-white/50 backdrop-blur-sm transition-all duration-200">
                        <td className="px-6 py-4 font-mono text-xs text-slate-900 font-medium">CBAM-REGISTRY-DE</td>
                        <td className="px-6 py-4"><Badge className="bg-black text-white border border-black text-xs">ERROR</Badge></td>
                        <td className="px-6 py-4 text-slate-600 font-light">2 hours ago</td>
                        <td className="px-6 py-4 text-slate-900 font-semibold">8</td>
                        <td className="px-6 py-4 text-slate-900 font-semibold">25</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Contract 6: Job Queue Status */}
            <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all rounded-xl">
              <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-white/40 via-white/20 to-white/40 backdrop-blur-sm">
                <CardTitle className="text-base font-light tracking-tight text-slate-900">Job Queue Status</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-white/60 to-slate-50/40 backdrop-blur-sm border border-slate-200/60 rounded-xl p-6 hover:shadow-lg transition-all">
                    <div className="text-xs text-slate-600 uppercase tracking-[0.15em] font-semibold mb-3">Extraction Queue</div>
                    <div className="text-4xl font-light text-slate-900">8</div>
                  </div>
                  <div className="bg-gradient-to-br from-white/60 to-slate-50/40 backdrop-blur-sm border border-slate-200/60 rounded-xl p-6 hover:shadow-lg transition-all">
                    <div className="text-xs text-slate-600 uppercase tracking-[0.15em] font-semibold mb-3">Mapping Queue</div>
                    <div className="text-4xl font-light text-slate-900">5</div>
                  </div>
                  <div className="bg-gradient-to-br from-white/60 to-slate-50/40 backdrop-blur-sm border border-slate-200/60 rounded-xl p-6 hover:shadow-lg transition-all">
                    <div className="text-xs text-slate-600 uppercase tracking-[0.15em] font-semibold mb-3">Export Queue</div>
                    <div className="text-4xl font-light text-slate-900">2</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portal" className="space-y-6">
            {/* Supplier Portal - Request-Scoped Interface */}
            <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg rounded-xl">
              <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-white/40 via-white/20 to-white/40">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-slate-600" />
                  <CardTitle className="text-base font-light tracking-tight text-slate-900">Supplier Portal (Request Inbox)</CardTitle>
                </div>
                <p className="text-xs text-slate-600 font-light mt-1">
                  Deny-by-default • Request-bound uploads • Supplier-owned evidence only
                </p>
              </CardHeader>
              <CardContent className="p-4">
                <SupplierPortalView />
              </CardContent>
            </Card>

            <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl rounded-xl shadow-lg">
              <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-white/40 via-white/20 to-white/40">
                <CardTitle className="text-base font-light tracking-tight text-slate-900">Authorization Rules (Enforced)</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-900 mt-1.5" />
                    <div>
                      <p className="font-semibold text-slate-900">Request-Scoped Access</p>
                      <p className="text-xs text-slate-600 font-light">Supplier sees ONLY requests where supplier_org_id matches auth context</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-900 mt-1.5" />
                    <div>
                      <p className="font-semibold text-slate-900">Upload Bound to Request</p>
                      <p className="text-xs text-slate-600 font-light">Evidence uploads locked to request_id, buyer_org_id cannot be changed</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-900 mt-1.5" />
                    <div>
                      <p className="font-semibold text-slate-900">Deny-by-Default</p>
                      <p className="text-xs text-slate-600 font-light">Supplier cannot browse buyer data or entities; direct URL attempts rejected</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-900 mt-1.5" />
                    <div>
                      <p className="font-semibold text-slate-900">Owner-Only Evidence Search</p>
                      <p className="text-xs text-slate-600 font-light">Grant Existing modal shows only evidence where owner_org_id == supplier_org_id</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exchange" className="space-y-6">
            <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Share2 className="w-6 h-6 text-slate-900" />
                  <div>
                    <h3 className="text-lg font-light text-slate-900 tracking-tight">Supplier Exchange</h3>
                    <p className="text-sm text-slate-600 font-light">Permissioned data reuse • Submit once, share many</p>
                  </div>
                </div>
                <div className="bg-white/60 rounded-lg border border-slate-200/60 p-4 mb-4">
                  <p className="text-xs text-slate-700 font-light leading-relaxed">
                    <strong>Strict Isolation:</strong> Evidence bytes remain in SupplierOrg workspace. Buyers see only metadata, hashes, and structured outputs per explicit Grant. 
                    All access is logged. Grants are append-only decision records.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-6">
              {/* Supplier Portal (as SupplierOrg) */}
              <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all rounded-xl">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-white/60 to-slate-50/40 backdrop-blur-sm rounded-full border border-slate-200/60 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-slate-900" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-slate-900 mb-2">Supplier Portal</h4>
                    <p className="text-sm text-slate-600 font-light">Upload evidence once, grant access to buyers</p>
                  </div>
                  <Button
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 shadow-md hover:shadow-lg transition-all"
                    onClick={() => {
                      window.location.href = createPageUrl('SupplierSubmit');
                    }}
                  >
                    Open Supplier Portal
                  </Button>
                  <p className="text-xs text-slate-500 font-light">Acting as: <strong>SupplierOrg</strong></p>
                </CardContent>
              </Card>

              {/* Request Data (as BuyerOrg) */}
              <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all rounded-xl">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-white/60 to-slate-50/40 backdrop-blur-sm rounded-full border border-slate-200/60 flex items-center justify-center">
                    <Send className="w-8 h-8 text-slate-700" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-slate-900 mb-2">Request Data</h4>
                    <p className="text-sm text-slate-600 font-light">Request evidence from suppliers in your network</p>
                  </div>
                  <Button
                    className="w-full bg-white/90 backdrop-blur-sm border-2 border-slate-200 text-slate-900 hover:bg-white hover:border-slate-400 rounded-xl h-12 transition-all"
                    onClick={() => {
                      window.location.href = `${createPageUrl('SupplyLens')}?filter_type=DATA_REQUEST`;
                    }}
                  >
                    View Supplier Requests
                  </Button>
                  <p className="text-xs text-slate-500 font-light">Acting as: <strong>BuyerOrg</strong></p>
                </CardContent>
              </Card>
            </div>

            {/* Exchange Guarantees */}
            <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg rounded-xl">
              <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-white/40 via-white/20 to-white/40">
                <CardTitle className="text-base font-light tracking-tight text-slate-900">Exchange Guarantees</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-900 mt-1.5" />
                    <div>
                      <p className="font-semibold text-slate-900">Tenant Isolation</p>
                      <p className="text-xs text-slate-600 font-light">Evidence bytes never leave SupplierOrg workspace</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-900 mt-1.5" />
                    <div>
                      <p className="font-semibold text-slate-900">Explicit Grants Only</p>
                      <p className="text-xs text-slate-600 font-light">No automatic sharing; controlled by Grant decisions</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-900 mt-1.5" />
                    <div>
                      <p className="font-semibold text-slate-900">Append-Only Access Log</p>
                      <p className="text-xs text-slate-600 font-light">Every view/denial logged with tenant, actor, evidence_id</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-900 mt-1.5" />
                    <div>
                      <p className="font-semibold text-slate-900">Metadata Only for Buyers</p>
                      <p className="text-xs text-slate-600 font-light">Buyers see hashes + structured outputs, not raw files</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}