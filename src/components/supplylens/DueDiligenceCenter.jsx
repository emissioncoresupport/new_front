import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  ShieldCheck, AlertTriangle, Sparkles, PlayCircle, CheckCircle2, 
  XCircle, Clock, Filter, Leaf, Droplets, Package, Factory, TrendingUp,
  FileText, Search, ArrowRight, BarChart3, Shield, Zap
} from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from '@/utils';
import { screenSupplierAgainstAllRisks, generateRiskReport, getModuleCompatibility } from './RiskScreeningEngine';

export default function DueDiligenceCenter({ suppliers, onViewSupplier }) {
  const [scanning, setScanning] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [filterModule, setFilterModule] = useState('all');
  const queryClient = useQueryClient();

  // Fetch assessments and data from compliance modules
  const { data: pfasAssessments = [] } = useQuery({
    queryKey: ['pfas-assessments'],
    queryFn: () => base44.entities.PFASAssessment.list()
  });

  const { data: eudrSubmissions = [] } = useQuery({
    queryKey: ['eudr-submissions'],
    queryFn: () => base44.entities.EUDRSupplierSubmission.list()
  });

  const { data: cbamInstallations = [] } = useQuery({
    queryKey: ['cbam-installations'],
    queryFn: () => base44.entities.CBAMInstallation.list()
  });

  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  const runFullDueDiligence = useMutation({
    mutationFn: async (supplier) => {
      // COMPREHENSIVE SCREENING AGAINST ALL RISK DATABASES
      const supplierSites = sites.filter(s => s.supplier_id === supplier.id);
      const screeningResults = await screenSupplierAgainstAllRisks(supplier, skus, supplierSites);
      
      // Generate alerts for all violations
      await generateRiskReport(supplier, screeningResults);
      
      // Check module compatibility
      const moduleCompatibility = getModuleCompatibility(supplier, skus);
      
      const results = {
        supplier_id: supplier.id,
        screening: screeningResults,
        modules: moduleCompatibility,
        pfas: { status: 'pending', risk: 0 },
        eudr: { status: 'pending', risk: 0 },
        ppwr: { status: 'pending', risk: 0 },
        cbam: { status: 'pending', risk: 0 }
      };

      // 1. PFAS Check - Check if supplier or products contain PFAS
      const supplierSKUs = skus.filter(sku => {
        // In real app, check SupplierSKUMapping
        return sku.description?.toLowerCase().includes(supplier.legal_name?.toLowerCase().substring(0, 5));
      });

      const pfasRisk = supplierSKUs.some(sku => sku.pfas_content) ? 100 : 
                       supplier.nace_code?.startsWith('C2') ? 60 : 20; // Manufacturing = higher risk

      results.pfas = {
        status: pfasRisk > 70 ? 'High Risk' : pfasRisk > 40 ? 'Medium Risk' : 'Low Risk',
        risk: pfasRisk,
        details: `${supplierSKUs.length} products analyzed`
      };

      // Check if assessment already exists
      const existingPFAS = pfasAssessments.find(a => a.entity_id === supplier.id);
      if (!existingPFAS) {
        await base44.entities.PFASAssessment.create({
          entity_type: 'Supplier',
          entity_id: supplier.id,
          name: supplier.legal_name,
          status: results.pfas.status === 'High Risk' ? 'Non-Compliant' : 
                  results.pfas.status === 'Medium Risk' ? 'Suspected' : 'Compliant',
          risk_score: pfasRisk,
          last_checked: new Date().toISOString()
        });
      }

      // 2. EUDR Check - Deforestation & Location Risk
      const highRiskCountries = ['Brazil', 'Indonesia', 'Malaysia', 'Congo', 'Paraguay'];
      const eudrRisk = highRiskCountries.includes(supplier.country) ? 90 :
                       supplier.country === 'China' ? 40 : 10;

      results.eudr = {
        status: eudrRisk > 70 ? 'High Risk' : eudrRisk > 30 ? 'Medium Risk' : 'Low Risk',
        risk: eudrRisk,
        details: `Location: ${supplier.country}`
      };

      // Mark as EUDR relevant if high risk
      if (eudrRisk > 50) {
        await base44.entities.Supplier.update(supplier.id, { eudr_relevant: true });
      }

      // 3. PPWR Check - Packaging compliance
      const ppwrRisk = supplier.nace_code?.startsWith('C17') ? 80 : // Paper/Packaging
                       supplier.nace_code?.startsWith('C22') ? 70 : // Plastics
                       30;

      results.ppwr = {
        status: ppwrRisk > 60 ? 'High Risk' : ppwrRisk > 40 ? 'Medium Risk' : 'Low Risk',
        risk: ppwrRisk,
        details: 'Packaging regulations'
      };

      if (ppwrRisk > 50) {
        await base44.entities.Supplier.update(supplier.id, { ppwr_relevant: true });
      }

      // 4. CBAM Check - Carbon Border Adjustment
      const cbamSectors = ['steel', 'aluminium', 'cement', 'iron', 'metal'];
      const isCBAMSector = cbamSectors.some(s => 
        supplier.legal_name?.toLowerCase().includes(s) || 
        supplier.nace_code?.startsWith('C24') // Basic metals
      );
      
      const cbamRisk = isCBAMSector ? 85 : 25;

      results.cbam = {
        status: cbamRisk > 70 ? 'High Impact' : cbamRisk > 40 ? 'Medium Impact' : 'Low Impact',
        risk: cbamRisk,
        details: isCBAMSector ? 'CBAM-regulated sector' : 'Non-CBAM sector'
      };

      if (cbamRisk > 50) {
        await base44.entities.Supplier.update(supplier.id, { cbam_relevant: true });
      }

      // Update overall risk score
      const avgRisk = (pfasRisk + eudrRisk + ppwrRisk + cbamRisk) / 4;
      await base44.entities.Supplier.update(supplier.id, {
        risk_score: Math.round(avgRisk),
        risk_level: avgRisk > 70 ? 'high' : avgRisk > 40 ? 'medium' : 'low',
        last_due_diligence: new Date().toISOString()
      });

      return results;
    },
    onSuccess: (results) => {
      toast.success(`Due diligence completed for ${selectedSupplier?.legal_name}`);
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['pfas-assessments'] });
    }
  });

  const handleRunDueDiligence = async (supplier) => {
    setSelectedSupplier(supplier);
    setScanning(true);
    try {
      await runFullDueDiligence.mutateAsync(supplier);
    } finally {
      setScanning(false);
    }
  };

  const handleBulkScan = async () => {
    setScanning(true);
    toast.loading("Running bulk due diligence scan...");
    
    for (const supplier of suppliers.slice(0, 10)) { // Limit to first 10 for demo
      await runFullDueDiligence.mutateAsync(supplier);
    }
    
    toast.dismiss();
    toast.success(`Scanned ${Math.min(suppliers.length, 10)} suppliers`);
    setScanning(false);
  };

  // Calculate statistics
  const stats = {
    total: suppliers.length,
    pfasRisk: suppliers.filter(s => s.pfas_relevant).length,
    eudrRisk: suppliers.filter(s => s.eudr_relevant).length,
    ppwrRisk: suppliers.filter(s => s.ppwr_relevant).length,
    cbamRisk: suppliers.filter(s => s.cbam_relevant).length,
    needsReview: suppliers.filter(s => 
      !s.last_due_diligence || 
      new Date(s.last_due_diligence) < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days old
    ).length
  };

  const filteredSuppliers = filterModule === 'all' ? suppliers :
    filterModule === 'pfas' ? suppliers.filter(s => s.pfas_relevant) :
    filterModule === 'eudr' ? suppliers.filter(s => s.eudr_relevant) :
    filterModule === 'ppwr' ? suppliers.filter(s => s.ppwr_relevant) :
    filterModule === 'cbam' ? suppliers.filter(s => s.cbam_relevant) :
    suppliers.filter(s => !s.last_due_diligence);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[#545454]">Due Diligence Center</h2>
          <p className="text-slate-500">Automated compliance screening across all regulatory frameworks</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleBulkScan}
            disabled={scanning}
            className="bg-gradient-to-r from-[#86b027] to-[#769c22] hover:from-[#769c22] hover:to-[#86b027] text-white shadow-lg shadow-[#86b027]/20"
          >
            {scanning ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Run Bulk Scan
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="border-slate-100 shadow-sm rounded-xl cursor-pointer hover:shadow-md transition-all" onClick={() => setFilterModule('pending')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-100 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Needs Review</p>
                <p className="text-2xl font-extrabold text-[#545454]">{stats.needsReview}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-xl cursor-pointer hover:shadow-md transition-all" onClick={() => setFilterModule('pfas')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-rose-100 text-rose-600">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">PFAS Risk</p>
                <p className="text-2xl font-extrabold text-[#545454]">{stats.pfasRisk}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-xl cursor-pointer hover:shadow-md transition-all" onClick={() => setFilterModule('eudr')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600">
                <Leaf className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">EUDR Risk</p>
                <p className="text-2xl font-extrabold text-[#545454]">{stats.eudrRisk}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-xl cursor-pointer hover:shadow-md transition-all" onClick={() => setFilterModule('ppwr')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-100 text-indigo-600">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">PPWR Risk</p>
                <p className="text-2xl font-extrabold text-[#545454]">{stats.ppwrRisk}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-xl cursor-pointer hover:shadow-md transition-all" onClick={() => setFilterModule('cbam')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#02a1e8]/10 text-[#02a1e8]">
                <Factory className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">CBAM Impact</p>
                <p className="text-2xl font-extrabold text-[#545454]">{stats.cbamRisk}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-xl cursor-pointer hover:shadow-md transition-all" onClick={() => setFilterModule('all')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#86b027]/10 text-[#86b027]">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Total</p>
                <p className="text-2xl font-extrabold text-[#545454]">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers Table with Compliance Status */}
      <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-white">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-bold text-[#545454]">
              Supplier Compliance Matrix
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {filteredSuppliers.length} suppliers
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-xs font-bold text-[#545454] uppercase tracking-wider">Supplier</th>
                  <th className="text-center p-4 text-xs font-bold text-[#545454] uppercase tracking-wider">PFAS</th>
                  <th className="text-center p-4 text-xs font-bold text-[#545454] uppercase tracking-wider">EUDR</th>
                  <th className="text-center p-4 text-xs font-bold text-[#545454] uppercase tracking-wider">PPWR</th>
                  <th className="text-center p-4 text-xs font-bold text-[#545454] uppercase tracking-wider">CBAM</th>
                  <th className="text-center p-4 text-xs font-bold text-[#545454] uppercase tracking-wider">Last Scan</th>
                  <th className="text-center p-4 text-xs font-bold text-[#545454] uppercase tracking-wider">Overall Risk</th>
                  <th className="text-right p-4 text-xs font-bold text-[#545454] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.slice(0, 20).map(supplier => {
                  const needsScan = !supplier.last_due_diligence || 
                    new Date(supplier.last_due_diligence) < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                  
                  return (
                    <tr key={supplier.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-[#545454]">{supplier.legal_name}</p>
                          <p className="text-xs text-slate-500">{supplier.country}</p>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {supplier.pfas_relevant ? (
                          <Badge className="bg-rose-100 text-rose-700">High</Badge>
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-[#86b027] mx-auto" />
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {supplier.eudr_relevant ? (
                          <Badge className="bg-amber-100 text-amber-700">Review</Badge>
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-[#86b027] mx-auto" />
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {supplier.ppwr_relevant ? (
                          <Badge className="bg-indigo-100 text-indigo-700">Action</Badge>
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-[#86b027] mx-auto" />
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {supplier.cbam_relevant ? (
                          <Badge className="bg-[#02a1e8]/10 text-[#02a1e8]">Relevant</Badge>
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-[#86b027] mx-auto" />
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {supplier.last_due_diligence ? (
                          <span className="text-xs text-slate-500">
                            {new Date(supplier.last_due_diligence).toLocaleDateString()}
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">Never</Badge>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            supplier.risk_level === 'high' ? 'bg-rose-500' :
                            supplier.risk_level === 'medium' ? 'bg-amber-500' :
                            'bg-[#86b027]'
                          }`} />
                          <span className="text-sm font-medium text-[#545454] capitalize">
                            {supplier.risk_level || 'unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {needsScan && (
                            <Button
                              size="sm"
                              onClick={() => handleRunDueDiligence(supplier)}
                              disabled={scanning}
                              className="bg-[#86b027] hover:bg-[#769c22] text-white h-8 text-xs"
                            >
                              <PlayCircle className="w-3 h-3 mr-1" />
                              Scan
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onViewSupplier(supplier)}
                            className="h-8 text-xs"
                          >
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-100 shadow-sm rounded-xl hover:shadow-md transition-all cursor-pointer group"
              onClick={() => window.location.href = createPageUrl('PFAS')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#545454]">PFAS Module</p>
                  <p className="text-xs text-slate-500">Detailed screening</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#86b027] transition-colors" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-xl hover:shadow-md transition-all cursor-pointer group"
              onClick={() => window.location.href = createPageUrl('EUDR')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#545454]">EUDR Module</p>
                  <p className="text-xs text-slate-500">Deforestation check</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#86b027] transition-colors" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-xl hover:shadow-md transition-all cursor-pointer group"
              onClick={() => window.location.href = createPageUrl('PCF')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#545454]">PPWR / DPP</p>
                  <p className="text-xs text-slate-500">Product passports</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#86b027] transition-colors" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-xl hover:shadow-md transition-all cursor-pointer group"
              onClick={() => window.location.href = createPageUrl('CBAM')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#02a1e8]/10 text-[#02a1e8] group-hover:bg-[#02a1e8] group-hover:text-white transition-colors">
                  <Factory className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#545454]">CBAM Module</p>
                  <p className="text-xs text-slate-500">Carbon border tax</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#86b027] transition-colors" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}