import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, Building2, FileText, TrendingUp, AlertCircle, 
  CheckCircle2, Clock, Euro, BarChart3, Globe
} from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import RepDashboardOverview from './RepDashboardOverview';

/**
 * CBAM Representative Dashboard
 * Multi-client portal for customs brokers & indirect representatives
 * Per Art. 32 Reg 2023/956 - Indirect representation model
 */

export default function CBAMRepresentativeDashboard() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const { data: clients = [] } = useQuery({
    queryKey: ['cbam-clients'],
    queryFn: () => base44.entities.CBAMClient.list()
  });
  
  const { data: allEntries = [] } = useQuery({
    queryKey: ['cbam-emission-entries'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });
  
  const { data: allReports = [] } = useQuery({
    queryKey: ['cbam-reports'],
    queryFn: () => base44.entities.CBAMReport.list()
  });
  
  // Aggregate client statistics
  const stats = {
    total_clients: clients.length,
    active_clients: clients.filter(c => c.status === 'active').length,
    total_entries: allEntries.length,
    pending_verifications: allEntries.filter(e => e.validation_status === 'pending').length,
    reports_due: allReports.filter(r => {
      const daysUntil = Math.ceil((new Date(r.submission_deadline) - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 15 && r.status !== 'submitted';
    }).length
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Building2 className="w-7 h-7 text-[#86b027]" />
              Representative Portal
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Multi-client CBAM compliance management
            </p>
          </div>
          <Button onClick={() => setShowOnboarding(true)} className="bg-[#86b027] hover:bg-[#769c22]">
            <Users className="w-4 h-4 mr-2" />
            Onboard Client
          </Button>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Clients</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total_clients}</p>
                </div>
                <Users className="w-8 h-8 text-slate-300" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Active</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{stats.active_clients}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Pending Verifications</p>
                  <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pending_verifications}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Reports Due</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{stats.reports_due}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-5">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="overview">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="clients">
              <Users className="w-4 h-4 mr-2" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="imports">
              <Globe className="w-4 h-4 mr-2" />
              Imports
            </TabsTrigger>
            <TabsTrigger value="reports">
              <FileText className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="calculations">
              <Euro className="w-4 h-4 mr-2" />
              Billing
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <RepDashboardOverview clients={clients} entries={allEntries} reports={allReports} />
          </TabsContent>
          
          <TabsContent value="clients">
            <div className="bg-white rounded-lg border p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <h3 className="font-medium text-slate-900">Client Management</h3>
              <p className="text-sm text-slate-500 mt-2">View and manage all CBAM clients</p>
            </div>
          </TabsContent>
          
          <TabsContent value="imports">
            <div className="bg-white rounded-lg border p-8 text-center">
              <Globe className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <h3 className="font-medium text-slate-900">Import Manager</h3>
              <p className="text-sm text-slate-500 mt-2">{allEntries.length} total import entries tracked</p>
            </div>
          </TabsContent>
          
          <TabsContent value="reports">
            <div className="bg-white rounded-lg border p-8 text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <h3 className="font-medium text-slate-900">Reports Dashboard</h3>
              <p className="text-sm text-slate-500 mt-2">{allReports.length} reports managed</p>
            </div>
          </TabsContent>
          
          <TabsContent value="calculations">
            <div className="bg-white rounded-lg border p-8 text-center">
              <Euro className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <h3 className="font-medium text-slate-900">Billing Calculations</h3>
              <p className="text-sm text-slate-500 mt-2">Track service fees and client costs</p>
            </div>
          </TabsContent>
        </Tabs>
        

      </div>
    </div>
  );
}