import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Target, TrendingDown, Package, Recycle, AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PPWRCalculationService from './services/PPWRCalculationService';

export default function PPWRTargetsReduction({ setActiveTab }) {
  const [expandedSection, setExpandedSection] = useState('recycled-content');

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list('-created_date')
  });

  // EU PPWR Official Targets
  const targets = {
    recycledContent: {
      'Plastic': [
        { year: 2030, target: 30, scope: 'Contact-sensitive plastic packaging' },
        { year: 2040, target: 65, scope: 'Contact-sensitive plastic packaging' }
      ],
      'PET Bottles': [
        { year: 2025, target: 25, scope: 'PET bottles' },
        { year: 2030, target: 30, scope: 'PET bottles' }
      ]
    },
    reduction: {
      title: 'Packaging Waste Reduction',
      targets: [
        { year: 2030, reduction: 5, baseline: 2018 },
        { year: 2035, reduction: 10, baseline: 2018 },
        { year: 2040, reduction: 15, baseline: 2018 }
      ]
    },
    reusability: {
      title: 'Reusable Packaging Requirements',
      targets: [
        { category: 'Transport packaging', year: 2030, target: 40 },
        { category: 'Sales packaging for B2B', year: 2030, target: 50 },
        { category: 'E-commerce packaging', year: 2030, target: 20 }
      ]
    },
    emptySpace: {
      title: 'Empty Space Limits',
      limit: 40,
      scope: 'E-commerce and transport packaging'
    }
  };

  // Calculate current performance
  const calculateRecycledContentProgress = (material) => {
    const items = packaging.filter(p => p.material_category === material);
    if (items.length === 0) return 0;
    return Math.round(items.reduce((sum, p) => sum + (p.recycled_content_percentage || 0), 0) / items.length);
  };

  const calculateWeightReduction = () => {
    const totalWeight = packaging.reduce((sum, p) => sum + (p.total_weight_kg || 0), 0);
    const baseline = totalWeight * 1.05; // Assume 5% baseline increase
    const reduction = ((baseline - totalWeight) / baseline) * 100;
    return Math.max(0, reduction);
  };

  const reusablePercentage = packaging.length > 0 
    ? Math.round((packaging.filter(p => p.is_reusable).length / packaging.length) * 100)
    : 0;

  const excessiveEmptySpace = packaging.filter(p => (p.empty_space_ratio || 0) > 40).length;

  const recycledContentData = [
    { material: 'Plastic', current: calculateRecycledContentProgress('Plastic'), target2030: 30, target2040: 65 },
    { material: 'PET', current: calculateRecycledContentProgress('PET'), target2030: 30, target2040: 65 },
    { material: 'Paper', current: calculateRecycledContentProgress('Paper/Cardboard'), target2030: 0, target2040: 0 }
  ];

  const reductionTimeline = [
    { year: 2024, actual: 0, target: 0 },
    { year: 2030, actual: calculateWeightReduction(), target: 5 },
    { year: 2035, actual: 0, target: 10 },
    { year: 2040, actual: 0, target: 15 }
  ];

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-[#86b027]/20 bg-gradient-to-br from-[#86b027]/5 to-[#86b027]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#86b027] uppercase font-bold">Avg PCR</p>
                <h3 className="text-3xl font-extrabold text-[#86b027]">
                  {calculateRecycledContentProgress('Plastic')}%
                </h3>
                <p className="text-xs text-[#86b027]/70 mt-1">Target: 30% by 2030</p>
              </div>
              <Recycle className="w-10 h-10 text-[#86b027]/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#02a1e8]/20 bg-gradient-to-br from-[#02a1e8]/5 to-[#02a1e8]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#02a1e8] uppercase font-bold">Reduction</p>
                <h3 className="text-3xl font-extrabold text-[#02a1e8]">
                  {calculateWeightReduction().toFixed(1)}%
                </h3>
                <p className="text-xs text-[#02a1e8]/70 mt-1">Target: 5% by 2030</p>
              </div>
              <TrendingDown className="w-10 h-10 text-[#02a1e8]/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#86b027]/20 bg-gradient-to-br from-[#86b027]/5 to-emerald-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#86b027] uppercase font-bold">Reusable</p>
                <h3 className="text-3xl font-extrabold text-[#86b027]">
                  {reusablePercentage}%
                </h3>
                <p className="text-xs text-[#86b027]/70 mt-1">Target: 40% by 2030</p>
              </div>
              <Package className="w-10 h-10 text-[#86b027]/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 uppercase font-bold">Empty Space</p>
                <h3 className="text-3xl font-extrabold text-amber-600">{excessiveEmptySpace}</h3>
                <p className="text-xs text-amber-600 mt-1">&gt;40% void</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-amber-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recycled Content Targets */}
      <Card className="border-[#86b027]/20 shadow-md">
        <CardHeader 
          className="cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100"
          onClick={() => toggleSection('recycled-content')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Recycle className="w-5 h-5 text-[#86b027]" />
              Recycled Content Targets (Article 7)
            </CardTitle>
            {expandedSection === 'recycled-content' ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </div>
        </CardHeader>
        {expandedSection === 'recycled-content' && (
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-slate-900 mb-4">Official EU Targets</h4>
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-900">Contact-Sensitive Plastic</span>
                      <Badge className="bg-[#86b027] text-white">Mandatory</Badge>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span>By 2030:</span>
                        <span className="font-bold text-[#86b027]">30% recycled content</span>
                      </div>
                      <div className="flex justify-between">
                        <span>By 2040:</span>
                        <span className="font-bold text-[#86b027]">65% recycled content</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-900">PET Bottles</span>
                      <Badge className="bg-blue-600 text-white">Mandatory</Badge>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span>By 2025:</span>
                        <span className="font-bold text-blue-600">25% recycled content</span>
                      </div>
                      <div className="flex justify-between">
                        <span>By 2030:</span>
                        <span className="font-bold text-blue-600">30% recycled content</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-4">Your Current Performance</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={recycledContentData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="material" tick={{ fill: '#64748b' }} />
                    <YAxis tick={{ fill: '#64748b' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="current" fill="#86b027" name="Current %" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="target2030" fill="#fbbf24" name="2030 Target" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="target2040" fill="#ef4444" name="2040 Target" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="text-slate-700">
                <strong>Action Required:</strong> Increase recycled plastic content to meet 2030 targets. 
                Contact suppliers for certified recycled materials (PCR) and update packaging specifications.
              </p>
            </div>

            {/* Integrated Reduction Target Calculator */}
            {packaging.filter(p => p.baseline_2018_weight_kg).map(pkg => {
              const calc = PPWRCalculationService.calculateReductionTarget(pkg, pkg.baseline_2018_weight_kg);
              if (!calc.requires_baseline) {
                return (
                  <div key={pkg.id} className="p-3 bg-white border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{pkg.packaging_name}</p>
                        <p className="text-xs text-slate-500">{calc.message}</p>
                      </div>
                      <Badge className={calc.on_track ? 'bg-emerald-500' : 'bg-rose-500'}>
                        {calc.actual_reduction_percent.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </CardContent>
        )}
      </Card>

      {/* Reduction Targets */}
      <Card className="border-[#02a1e8]/20 shadow-md">
        <CardHeader 
          className="cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100"
          onClick={() => toggleSection('reduction')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-[#02a1e8]" />
              Packaging Waste Reduction (Article 5)
            </CardTitle>
            {expandedSection === 'reduction' ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </div>
        </CardHeader>
        {expandedSection === 'reduction' && (
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-slate-900 mb-4">Mandatory Reduction Timeline</h4>
                <div className="space-y-3">
                  {targets.reduction.targets.map((t, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-900">By {t.year}</span>
                        <Badge className="bg-[#02a1e8] text-white">{t.reduction}% Reduction</Badge>
                      </div>
                      <Progress value={(calculateWeightReduction() / t.reduction) * 100} className="h-2" />
                      <p className="text-xs text-slate-500 mt-2">
                        Current: {calculateWeightReduction().toFixed(1)}% | Target: {t.reduction}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-4">Reduction Trajectory</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={reductionTimeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{ fill: '#64748b' }} />
                    <YAxis tick={{ fill: '#64748b' }} label={{ value: '% Reduction', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="target" stroke="#ef4444" strokeWidth={2} name="Target Path" />
                    <Line type="monotone" dataKey="actual" stroke="#02a1e8" strokeWidth={3} name="Your Progress" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
              <p className="text-slate-700">
                <strong>Reduction Strategies:</strong> Optimize packaging design, reduce material weight, 
                eliminate unnecessary packaging layers, and transition to reusable formats.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Reusability Requirements */}
      <Card className="border-[#86b027]/20 shadow-md">
        <CardHeader 
          className="cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100"
          onClick={() => toggleSection('reusability')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-[#86b027]" />
              Reusable Packaging Requirements (Article 26)
            </CardTitle>
            {expandedSection === 'reusability' ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </div>
        </CardHeader>
        {expandedSection === 'reusability' && (
          <CardContent className="pt-6">
            <div className="space-y-4">
              {targets.reusability.targets.map((t, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-slate-900">{t.category}</p>
                      <p className="text-sm text-slate-600">Target: {t.target}% by {t.year}</p>
                    </div>
                    <Badge className={reusablePercentage >= t.target ? 'bg-[#86b027] text-white' : 'bg-amber-500 text-white'}>
                      {reusablePercentage >= t.target ? <CheckCircle2 className="w-3 h-3 mr-1 inline" /> : <Clock className="w-3 h-3 mr-1 inline" />}
                      {reusablePercentage >= t.target ? 'On Track' : 'Action Needed'}
                    </Badge>
                  </div>
                  <Progress value={(reusablePercentage / t.target) * 100} className="h-2" />
                  <p className="text-xs text-slate-500 mt-2">
                    Current: {reusablePercentage}% | Gap: {Math.max(0, t.target - reusablePercentage)}%
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm">
              <p className="text-slate-700">
                <strong>Reusability Design:</strong> Implement return systems, use durable materials designed for multiple cycles,
                and establish take-back schemes for transport and B2B packaging.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Empty Space Compliance */}
      <Card className="border-amber-200 shadow-md">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Empty Space Limits (Article 9)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium text-slate-900">Maximum Empty Space</p>
                <p className="text-sm text-slate-600">E-commerce and transport packaging</p>
              </div>
              <Badge className="bg-amber-600 text-white">40% Limit</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-700">Non-compliant items:</span>
                <span className="font-bold text-amber-600">{excessiveEmptySpace} SKUs</span>
              </div>
              {excessiveEmptySpace > 0 && (
                <Button 
                  onClick={() => setActiveTab('registry')} 
                  variant="outline" 
                  className="w-full mt-2 border-amber-400 text-amber-700 hover:bg-amber-50"
                >
                  Review & Fix Empty Space Issues
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Plan */}
      <Card className="border-[#86b027]/20 bg-gradient-to-br from-white to-[#86b027]/5 shadow-md">
        <CardHeader className="border-b border-[#86b027]/10">
          <CardTitle className="text-[#86b027]">Compliance Action Plan</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={() => setActiveTab('registry')} className="bg-[#86b027] hover:bg-[#769c22] text-white">
              Update Packaging Data
            </Button>
            <Button onClick={() => setActiveTab('declarations')} variant="outline" className="border-[#86b027] text-[#86b027] hover:bg-[#86b027]/10">
              Request Supplier Declarations
            </Button>
            <Button onClick={() => setActiveTab('analytics')} variant="outline" className="border-[#02a1e8] text-[#02a1e8] hover:bg-[#02a1e8]/10">
              Generate Compliance Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}