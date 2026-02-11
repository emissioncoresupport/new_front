import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, History, MessageSquare, Building2, Info, Globe,
  CheckCircle2, Clock, AlertTriangle
} from "lucide-react";
import CBAMSupplierDataUpload from '../components/cbam/supplier/CBAMSupplierDataUpload';
import CBAMSupplierHistory from '../components/cbam/supplier/CBAMSupplierHistory';
import CBAMSupplierCommunication from '../components/cbam/supplier/CBAMSupplierCommunication';

export default function CBAMSupplierPortal() {
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [buyerCompanyId, setBuyerCompanyId] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    enabled: !!user
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list()
  });

  useEffect(() => {
    if (user && suppliers.length > 0) {
      const supplier = suppliers.find(s => s.email === user.email);
      setCurrentSupplier(supplier);
      // For demo: get first company as buyer
      if (companies.length > 0) {
        setBuyerCompanyId(companies[0].id);
      }
    }
  }, [user, suppliers, companies]);

  const { data: submissions = [] } = useQuery({
    queryKey: ['supplier-stats', currentSupplier?.id],
    queryFn: async () => {
      const all = await base44.entities.SupplierCBAMSubmission.list();
      return all.filter(s => s.supplier_id === currentSupplier?.id);
    },
    enabled: !!currentSupplier
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['supplier-message-stats', currentSupplier?.id],
    queryFn: async () => {
      const all = await base44.entities.SupplierCBAMMessage.list();
      return all.filter(m => m.supplier_id === currentSupplier?.id);
    },
    enabled: !!currentSupplier
  });

  if (!currentSupplier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-100 to-white">
        <Card className="max-w-md border-none shadow-lg">
          <CardContent className="pt-6 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Supplier Access Required</h2>
            <p className="text-slate-600">
              Your account is not linked to a supplier profile. Please contact your buyer to request access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const verifiedCount = submissions.filter(s => s.verification_status === 'verified').length;
  const pendingCount = submissions.filter(s => s.verification_status === 'pending').length;
  const unreadMessages = messages.filter(m => !m.is_read && m.sender_type === 'company').length;
  const complianceRate = submissions.length > 0 
    ? Math.round((submissions.filter(s => s.compliance_status === 'compliant').length / submissions.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-white relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-slate-900/10 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-[#86b027] shadow-lg shadow-[#86b027]/20">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    CBAM Supplier Portal
                  </h1>
                  <p className="text-sm text-slate-600">
                    {currentSupplier.legal_name || currentSupplier.trade_name} • {currentSupplier.country}
                  </p>
                </div>
              </div>
              <Badge className="bg-[#86b027] text-white border-0 text-sm">
                Active Supplier
              </Badge>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
          {/* Info Alert */}
          <Alert className="border-[#02a1e8]/30 bg-[#02a1e8]/5">
            <Info className="h-4 w-4 text-[#02a1e8]" />
            <AlertDescription className="text-sm text-slate-700">
              <strong>Welcome to the CBAM Supplier Portal.</strong> Submit accurate emission data for your products, 
              track your compliance status, and communicate directly with your buyers regarding data requirements 
              per EU Regulation 2023/956.
            </AlertDescription>
          </Alert>

          {/* Quick Stats - Tesla Glassmorphism */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-white/60 backdrop-blur-xl border border-slate-900/10 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h3 className="text-3xl font-extralight text-slate-900">{verifiedCount}</h3>
                <p className="text-xs font-light text-slate-600 mt-1">Verified Submissions</p>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-xl border border-slate-900/10 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-slate-900">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h3 className="text-3xl font-extralight text-slate-900">{pendingCount}</h3>
                <p className="text-xs font-light text-slate-600 mt-1">Pending Review</p>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-xl border border-slate-900/10 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-slate-900">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h3 className="text-3xl font-extralight text-slate-900">{unreadMessages}</h3>
                <p className="text-xs font-light text-slate-600 mt-1">Unread Messages</p>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-xl border border-slate-900/10 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h3 className="text-3xl font-extralight text-slate-900">{complianceRate}%</h3>
                <p className="text-xs font-light text-slate-600 mt-1">Compliance Rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs - Tesla Style */}
          <Tabs defaultValue="upload" className="space-y-6">
            <TabsList className="bg-white/60 backdrop-blur-xl border border-slate-900/10 p-1 inline-flex h-auto rounded-xl">
              <TabsTrigger 
                value="upload"
                className="gap-2 rounded-lg px-6 py-3 text-sm font-light data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all"
              >
                <Upload className="w-4 h-4" />
                Submit Data
              </TabsTrigger>
              <TabsTrigger 
                value="history"
                className="gap-2 rounded-lg px-6 py-3 text-sm font-light data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all"
              >
                <History className="w-4 h-4" />
                History & Status
              </TabsTrigger>
              <TabsTrigger 
                value="communication"
                className="gap-2 rounded-lg px-6 py-3 text-sm font-light data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                Communication
                {unreadMessages > 0 && (
                  <Badge className="ml-1 bg-red-500 text-white h-5 px-1.5 text-xs">
                    {unreadMessages}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <CBAMSupplierDataUpload supplier={currentSupplier} companyId={buyerCompanyId} />
            </TabsContent>

            <TabsContent value="history">
              <CBAMSupplierHistory supplier={currentSupplier} companyId={buyerCompanyId} />
            </TabsContent>

            <TabsContent value="communication">
              <CBAMSupplierCommunication supplier={currentSupplier} companyId={buyerCompanyId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}