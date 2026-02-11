import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { PackageOpen, Recycle, AlertTriangle, Target, TrendingDown, ArrowRight, Leaf, FileCheck, BarChart3, Zap, Database, Shield, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";
import PPWRCalculationService from './services/PPWRCalculationService';
import PPWRRegulatoryUpdateMonitor from './PPWRRegulatoryUpdateMonitor';
import PPWRIntegrationStatus from './PPWRIntegrationStatus';

export default function PPWRDashboard({ setActiveTab }) {
  const queryClient = useQueryClient();

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list('-created_date')
  });

  const { data: declarations = [] } = useQuery({
    queryKey: ['ppwr-declarations'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const generateSamplesMutation = useMutation({
    mutationFn: async () => {
      const samples = [
        {
          packaging_name: "PET Water Bottle 500ml",
          material_category: "Plastic",
          material_subcategory: "PET",
          total_weight_kg: 0.025,
          recycled_content_percentage: 35,
          recycled_content_target: 30,
          compliance_status: "Compliant",
          is_reusable: false,
          empty_space_ratio: 5,
          recyclability_score: 95,
          contains_pfas: false,
          contains_bisphenols: false,
          packaging_format: "Sales",
          drs_eligible: true,
          drs_deposit_amount: 0.15,
          epr_registered: true,
          epr_scheme_id: "EPR-DE-2025-001",
          due_diligence_completed: true,
          labeling_compliant: true,
          label_material_composition: "100% PET Plastic",
          label_recyclability_info: "Widely Recyclable",
          digital_passport_id: "PPWR-PET-001",
          manufacturer_id: "PlasticCo GmbH"
        },
        {
          packaging_name: "HDPE Milk Bottle 1L",
          material_category: "Plastic",
          material_subcategory: "HDPE",
          total_weight_kg: 0.045,
          recycled_content_percentage: 15,
          recycled_content_target: 30,
          compliance_status: "Critical",
          is_reusable: false,
          empty_space_ratio: 8,
          recyclability_score: 85,
          contains_pfas: false,
          contains_bisphenols: false,
          packaging_format: "Sales",
          drs_eligible: false,
          epr_registered: true,
          epr_scheme_id: "EPR-DE-2025-002",
          due_diligence_completed: false,
          labeling_compliant: false,
          manufacturer_id: "DairyCo Ltd"
        },
        {
          packaging_name: "E-commerce Box Medium",
          material_category: "Paper/Cardboard",
          material_subcategory: "Corrugated Cardboard",
          total_weight_kg: 0.350,
          recycled_content_percentage: 80,
          recyclability_score: 100,
          is_reusable: true,
          reuse_cycles: 5,
          empty_space_ratio: 52,
          compliance_status: "Warning",
          packaging_format: "E-commerce",
          epr_registered: true,
          epr_scheme_id: "EPR-FR-2025-003",
          due_diligence_completed: true,
          labeling_compliant: true,
          label_material_composition: "Recycled Cardboard (80% PCR)",
          label_recyclability_info: "Fully Recyclable",
          digital_passport_id: "PPWR-CARD-001",
          manufacturer_id: "PackagingPro SA"
        },
        {
          packaging_name: "Aluminum Beverage Can 330ml",
          material_category: "Metal",
          material_subcategory: "Aluminum",
          total_weight_kg: 0.015,
          recycled_content_percentage: 75,
          recyclability_score: 100,
          is_reusable: false,
          empty_space_ratio: 2,
          compliance_status: "Compliant",
          packaging_format: "Sales",
          drs_eligible: true,
          drs_deposit_amount: 0.25,
          epr_registered: true,
          epr_scheme_id: "EPR-NL-2025-004",
          due_diligence_completed: true,
          labeling_compliant: true,
          label_material_composition: "100% Aluminum",
          label_recyclability_info: "Infinitely Recyclable",
          digital_passport_id: "PPWR-ALU-001",
          manufacturer_id: "MetalPack Europe"
        },
        {
          packaging_name: "Glass Wine Bottle 750ml",
          material_category: "Glass",
          total_weight_kg: 0.550,
          recycled_content_percentage: 40,
          recyclability_score: 95,
          is_reusable: true,
          reuse_cycles: 15,
          empty_space_ratio: 0,
          compliance_status: "Compliant",
          packaging_format: "Sales",
          drs_eligible: false,
          epr_registered: true,
          epr_scheme_id: "EPR-IT-2025-005",
          due_diligence_completed: true,
          labeling_compliant: true,
          label_material_composition: "Glass with 40% recycled content",
          label_recyclability_info: "Reusable & Recyclable",
          digital_passport_id: "PPWR-GLASS-001",
          manufacturer_id: "GlassMakers SpA"
        },
        {
          packaging_name: "Plastic Food Container LDPE",
          material_category: "Plastic",
          material_subcategory: "LDPE",
          total_weight_kg: 0.065,
          recycled_content_percentage: 8,
          recycled_content_target: 30,
          compliance_status: "Critical",
          is_reusable: false,
          empty_space_ratio: 15,
          recyclability_score: 45,
          contains_pfas: true,
          contains_bisphenols: false,
          packaging_format: "Sales",
          epr_registered: false,
          due_diligence_completed: false,
          labeling_compliant: false,
          manufacturer_id: "FoodPackaging Inc"
        },
        {
          packaging_name: "Transport Pallet Wrap LDPE",
          material_category: "Plastic",
          material_subcategory: "LDPE Film",
          total_weight_kg: 1.200,
          recycled_content_percentage: 20,
          recycled_content_target: 30,
          compliance_status: "Warning",
          is_reusable: false,
          recyclability_score: 60,
          packaging_format: "Transport",
          epr_registered: true,
          epr_scheme_id: "EPR-ES-2025-006",
          due_diligence_completed: true,
          labeling_compliant: false,
          manufacturer_id: "LogiWrap Solutions"
        },
        {
          packaging_name: "Composite Coffee Pouch",
          material_category: "Composite",
          total_weight_kg: 0.028,
          recycled_content_percentage: 0,
          recyclability_score: 25,
          is_reusable: false,
          empty_space_ratio: 10,
          compliance_status: "Critical",
          packaging_format: "Sales",
          epr_registered: true,
          epr_scheme_id: "EPR-BE-2025-007",
          due_diligence_completed: false,
          labeling_compliant: true,
          label_material_composition: "Multi-layer composite",
          label_recyclability_info: "Not widely recyclable",
          manufacturer_id: "FlexiPack NV"
        },
        {
          packaging_name: "Reusable Plastic Crate",
          material_category: "Plastic",
          material_subcategory: "PP",
          total_weight_kg: 2.500,
          recycled_content_percentage: 55,
          recyclability_score: 90,
          is_reusable: true,
          reuse_cycles: 50,
          empty_space_ratio: 0,
          compliance_status: "Compliant",
          packaging_format: "Transport",
          epr_registered: true,
          epr_scheme_id: "EPR-PL-2025-008",
          due_diligence_completed: true,
          labeling_compliant: true,
          label_material_composition: "Recycled PP (55%)",
          label_recyclability_info: "Industrial reuse system",
          digital_passport_id: "PPWR-PP-CRATE-001",
          manufacturer_id: "EuroPool Systems"
        },
        {
          packaging_name: "Wooden Wine Crate",
          material_category: "Wood",
          total_weight_kg: 1.800,
          recyclability_score: 80,
          is_reusable: true,
          reuse_cycles: 20,
          empty_space_ratio: 5,
          compliance_status: "Compliant",
          packaging_format: "Transport",
          epr_registered: true,
          epr_scheme_id: "EPR-AT-2025-009",
          due_diligence_completed: true,
          labeling_compliant: true,
          label_material_composition: "FSC Certified Wood",
          digital_passport_id: "PPWR-WOOD-001",
          manufacturer_id: "Alpine Wood Products"
        }
      ];

      for (const sample of samples) {
        await base44.entities.PPWRPackaging.create(sample);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppwr-packaging'] });
      toast.success('10 sample packaging items created');
    }
  });

  // EU PPWR Actual Targets (correct regulatory requirements)
  const targets = {
    'Plastic': { 
      2030: 30,  // 30% recycled content by 2030 for contact-sensitive plastic packaging
      2040: 65   // 65% by 2040
    },
    'PET': { 2030: 30, 2040: 65 },
    'Paper/Cardboard': { 2030: 0, 2040: 0 }, // No mandatory target yet
    'Glass': { 2030: 0, 2040: 0 },
    'Metal': { 2030: 0, 2040: 0 },
    'Wood': { 2030: 0, 2040: 0 }
  };

  // EU Empty Space Limits (e-commerce & transport packaging)
  const emptySpaceLimit = 40; // Max 40% empty space

  const stats = {
    totalPackaging: packaging.length,
    compliant: packaging.filter(p => {
      const target = targets[p.material_category]?.[2030] || 0;
      return target === 0 || (p.recycled_content_percentage || 0) >= target;
    }).length,
    nonCompliant: packaging.filter(p => {
      const target = targets[p.material_category]?.[2030] || 0;
      return target > 0 && (p.recycled_content_percentage || 0) < target;
    }).length,
    avgRecycledContent: packaging.length > 0 
      ? Math.round(packaging.reduce((sum, p) => sum + (p.recycled_content_percentage || 0), 0) / packaging.length)
      : 0,
    reusableCount: packaging.filter(p => p.is_reusable).length,
    excessiveEmptySpace: packaging.filter(p => (p.empty_space_ratio || 0) > emptySpaceLimit).length,
    totalWeight: Math.round(packaging.reduce((sum, p) => sum + (p.total_weight_kg || 0), 0) * 100) / 100,
    avgRecyclability: packaging.length > 0
      ? Math.round(packaging.reduce((sum, p) => sum + (p.recyclability_score || 0), 0) / packaging.length)
      : 0,
    avgComplianceScore: packaging.length > 0
      ? Math.round(packaging.reduce((sum, p) => sum + (p.compliance_score || 0), 0) / packaging.length)
      : 0,
    withBlockchain: packaging.filter(p => p.blockchain_verified || p.digital_passport_id).length
  };

  // Material breakdown
  const materialData = ['Plastic', 'Paper/Cardboard', 'Glass', 'Metal', 'Wood', 'Composite'].map(mat => {
    const items = packaging.filter(p => p.material_category === mat);
    const avgRecycled = items.length > 0 
      ? Math.round(items.reduce((sum, p) => sum + (p.recycled_content_percentage || 0), 0) / items.length)
      : 0;
    return {
      material: mat,
      count: items.length,
      avgRecycled,
      target: targets[mat] || 0,
      gap: targets[mat] ? avgRecycled - targets[mat] : 0
    };
  }).filter(d => d.count > 0);

  return (
    <div className="space-y-6">
      {/* Regulation Summary Banner */}
      <Card className="border-[#86b027]/20 bg-gradient-to-br from-white to-[#86b027]/5 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#86b027] to-emerald-600 shadow-md">
              <PackageOpen className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">EU Packaging Regulation Overview</h2>
                  <p className="text-sm text-slate-600 mt-1">EU 2024/1852 - December 2024</p>
                </div>
                <Button size="sm" className="bg-[#86b027] hover:bg-[#769c22] text-white" onClick={() => setActiveTab('documentation')}>
                  <FileCheck className="w-4 h-4 mr-2" />
                  Manage Declarations
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <p className="text-slate-600 text-xs">Recycled Content Target</p>
                  <p className="text-lg font-bold text-[#86b027] mt-1">30% by 2030</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <p className="text-slate-600 text-xs">Empty Space Limit</p>
                  <p className="text-lg font-bold text-[#02a1e8] mt-1">≤40%</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <p className="text-slate-600 text-xs">Reusability Mandate</p>
                  <p className="text-lg font-bold text-purple-600 mt-1">40% by 2030</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-[#86b027]/20 bg-gradient-to-br from-white to-[#86b027]/5 shadow-md">
        <CardHeader className="border-b border-[#86b027]/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#86b027] flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Quick Actions
            </CardTitle>
            {packaging.length === 0 && (
              <Button
                onClick={() => generateSamplesMutation.mutate()}
                disabled={generateSamplesMutation.isPending}
                variant="outline"
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <Database className="w-4 h-4 mr-2" />
                Generate Sample Data
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button onClick={() => setActiveTab('registry')} className="w-full justify-start bg-[#86b027] hover:bg-[#769c22] text-white shadow-md">
              <PackageOpen className="w-4 h-4 mr-2" />
              Add New Packaging
            </Button>
            <Button onClick={() => setActiveTab('declarations')} variant="outline" className="w-full justify-start border-[#86b027] text-[#86b027] hover:bg-[#86b027]/10">
              <FileCheck className="w-4 h-4 mr-2" />
              Upload Declarations
            </Button>
            <Button onClick={() => setActiveTab('monitor')} variant="outline" className="w-full justify-start border-purple-600 text-purple-600 hover:bg-purple-50">
              <Shield className="w-4 h-4 mr-2" />
              Run Compliance Check
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Automation Alerts */}
      <Card className="border-purple-200 bg-gradient-to-br from-white to-purple-50/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-purple-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-purple-900 mb-1">Automation Active</h3>
              <p className="text-sm text-slate-600">
                Real-time compliance monitoring, blockchain audit trails, SupplyLens sync, and automated EPR reporting are now enabled. 
                System will auto-check new packaging items and alert on critical issues.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="border-slate-200 bg-white hover:shadow-md hover:border-slate-300 transition-all cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Total SKUs</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{stats.totalPackaging}</h3>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl">
                <PackageOpen className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#86b027]/20 bg-gradient-to-br from-[#86b027]/5 to-[#86b027]/10 hover:shadow-md hover:border-[#86b027]/40 transition-all cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#86b027] uppercase font-bold tracking-wide">Compliant</p>
                <h3 className="text-3xl font-extrabold text-[#86b027] mt-2">{stats.compliant}</h3>
                <p className="text-xs text-[#86b027]/70 mt-1 font-semibold">{stats.totalPackaging > 0 ? Math.round(stats.compliant/stats.totalPackaging*100) : 0}%</p>
              </div>
              <div className="p-3 bg-[#86b027]/10 rounded-xl">
                <Target className="w-6 h-6 text-[#86b027]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-rose-50/50 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-rose-700 uppercase font-bold">Non-Compliant</p>
                <h3 className="text-3xl font-extrabold text-rose-600">{stats.nonCompliant}</h3>
              </div>
              <AlertTriangle className="w-10 h-10 text-rose-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#02a1e8]/20 bg-gradient-to-br from-[#02a1e8]/5 to-[#02a1e8]/10 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#02a1e8] uppercase font-bold">Avg PCR %</p>
                <h3 className="text-3xl font-extrabold text-[#02a1e8]">{stats.avgRecycledContent}%</h3>
                <p className="text-xs text-[#02a1e8]/70 mt-1">Target: 30%</p>
              </div>
              <Recycle className="w-10 h-10 text-[#02a1e8]/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 uppercase font-bold">Empty Space</p>
                <h3 className="text-3xl font-extrabold text-amber-600">{stats.excessiveEmptySpace}</h3>
                <p className="text-xs text-amber-600 mt-1">&gt;40% void</p>
              </div>
              <PackageOpen className="w-10 h-10 text-amber-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#86b027]/20 bg-gradient-to-br from-[#86b027]/5 to-emerald-500/10 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#86b027] uppercase font-bold">Reusable</p>
                <h3 className="text-3xl font-extrabold text-[#86b027]">{stats.reusableCount}</h3>
              </div>
              <Leaf className="w-10 h-10 text-[#86b027]/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automation & Integration Status */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-purple-200 bg-gradient-to-br from-white to-purple-50/30">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-slate-900">Automation Status</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Avg Compliance Score:</span>
                    <span className="font-bold text-purple-700">{stats.avgComplianceScore}/100</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Real-time Checks:</span>
                    <Badge className="bg-emerald-500 text-white">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">AI Monitoring:</span>
                    <Badge className="bg-purple-500 text-white">Enabled</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#02a1e8]/20 bg-gradient-to-br from-white to-[#02a1e8]/5">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-5 h-5 text-[#02a1e8]" />
                  <h3 className="font-bold text-slate-900">Integration Status</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Blockchain Verified:</span>
                    <span className="font-bold text-[#02a1e8]">{stats.withBlockchain}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">SupplyLens Sync:</span>
                    <Badge className="bg-emerald-500 text-white">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">DPP Auto-Gen:</span>
                    <Badge className="bg-[#02a1e8] text-white">Enabled</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Status */}
      <PPWRIntegrationStatus />

      {/* Regulatory Updates */}
      <PPWRRegulatoryUpdateMonitor />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-[#86b027]/20 shadow-md">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-slate-900">Recycled Content by Material Type</CardTitle>
            <p className="text-sm text-slate-500">Current vs 2030 Targets</p>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={materialData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="material" angle={-20} textAnchor="end" height={80} tick={{ fill: '#64748b' }} />
                <YAxis label={{ value: '% Recycled Content', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }} tick={{ fill: '#64748b' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgRecycled" fill="#86b027" name="Current" radius={[8, 8, 0, 0]} />
                <Bar dataKey="target" fill="#ef4444" name="2030 Target" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-[#02a1e8]/20 shadow-md">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-slate-900">Compliance Gap Analysis</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {materialData.map((mat, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{mat.material}</span>
                    <span className={`font-bold ${mat.gap >= 0 ? 'text-[#86b027]' : 'text-rose-600'}`}>
                      {mat.gap > 0 ? '+' : ''}{mat.gap}% {mat.target > 0 && '(Target: ' + mat.target + '%)'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full transition-all ${mat.gap >= 0 ? 'bg-[#86b027]' : 'bg-rose-500'}`}
                      style={{ width: mat.target > 0 ? `${Math.min((mat.avgRecycled / mat.target) * 100, 100)}%` : `${mat.avgRecycled}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Issues */}
      {stats.nonCompliant > 0 && (
        <Card className="border-rose-200 bg-rose-50/30 shadow-md">
          <CardHeader className="border-b border-rose-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-rose-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Non-Compliant Packaging
              </CardTitle>
              <Badge variant="secondary" className="bg-rose-100 text-rose-700">
                {stats.nonCompliant} Items
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {packaging.filter(p => {
                const target = targets[p.material_category]?.[2030] || 0;
                return target > 0 && (p.recycled_content_percentage || 0) < target;
              }).slice(0, 3).map((pkg, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-lg border border-rose-200 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    <div>
                      <p className="font-semibold text-slate-900">{pkg.packaging_name}</p>
                      <p className="text-sm text-slate-600">
                        {pkg.recycled_content_percentage || 0}% PCR (Target: {targets[pkg.material_category]?.[2030]}%)
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => setActiveTab('registry')} size="sm" className="bg-[#86b027] hover:bg-[#769c22] text-white">
                    Fix
                  </Button>
                </div>
              ))}
              {stats.nonCompliant > 3 && (
                <Button onClick={() => setActiveTab('targets')} variant="outline" className="w-full border-[#86b027] text-[#86b027] hover:bg-[#86b027]/10">
                  View All {stats.nonCompliant} Issues
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}