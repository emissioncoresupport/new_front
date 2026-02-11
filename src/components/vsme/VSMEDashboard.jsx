import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, CheckCircle, AlertCircle, Clock, TrendingUp, FileText, Users, Leaf, ChevronRight, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import VSMEScorecard from './VSMEScorecard';

function QuickBenchmark({ disclosures }) {
  const completedCount = disclosures.filter(d => d.status === 'completed').length;
  const totalCount = disclosures.length;
  const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  
  let performanceLevel = 'Getting Started';
  let color = 'text-slate-600';
  
  if (completionRate >= 80) {
    performanceLevel = 'Best-in-Class';
    color = 'text-[#86b027]';
  } else if (completionRate >= 60) {
    performanceLevel = 'Above Average';
    color = 'text-[#02a1e8]';
  } else if (completionRate >= 40) {
    performanceLevel = 'Average';
    color = 'text-amber-600';
  }

  return (
    <Card className="bg-white/95 backdrop-blur-sm shadow-lg border border-slate-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-600">ESG Performance</span>
          <TrendingUp className="w-5 h-5 text-[#86b027]" />
        </div>
        <p className={`text-2xl font-bold ${color} mb-1`}>{performanceLevel}</p>
        <p className="text-xs text-slate-500">{Math.round(completionRate)}% data completeness</p>
        <Progress value={completionRate} className="h-2 mt-3" />
      </CardContent>
    </Card>
  );
}

export default function VSMEDashboard({ report, disclosures, setActiveTab }) {
  const { data: allDisclosures = [] } = useQuery({
    queryKey: ['vsme-disclosures'],
    queryFn: () => base44.entities.VSMEDisclosure.list()
  });

  const basicDisclosures = allDisclosures.filter(d => d.module_type === 'basic');
  const comprehensiveDisclosures = allDisclosures.filter(d => d.module_type === 'comprehensive');

  const basicCompleted = basicDisclosures.filter(d => d.status === 'completed').length;
  const comprehensiveCompleted = comprehensiveDisclosures.filter(d => d.status === 'completed').length;

  const basicProgress = (basicCompleted / 11) * 100;
  const comprehensiveProgress = comprehensiveDisclosures.length > 0 ? (comprehensiveCompleted / 9) * 100 : 0;

  return (
    <div className="space-y-4 mt-16">
      {/* Header Card */}
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-[#86b027]/5 pointer-events-none"></div>
        <div className="relative p-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-light text-slate-900 mb-2">VSME Standard Reporting</h2>
              <p className="text-sm text-slate-500 font-light max-w-2xl">
                Voluntary Sustainability Reporting for SMEs - EFRAG compliant framework designed for non-listed companies to meet ESG data requirements.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <Badge className="bg-[#86b027] text-white font-light">EFRAG Approved</Badge>
                <Badge variant="outline" className="font-light border-slate-300">Voluntary Standard</Badge>
                <Badge variant="outline" className="font-light border-slate-300">Published Dec 2024</Badge>
              </div>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#86b027]/20 to-[#86b027]/5 backdrop-blur-md border border-white/60 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-[#86b027]" />
            </div>
          </div>
        </div>
      </div>

      {/* Module Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <VSMEScorecard
          title="Basic Module (B1-B11)"
          Icon={CheckCircle}
          disclosures={basicDisclosures}
          total={11}
          color="green"
        />
        <VSMEScorecard
          title="Comprehensive Module (C1-C9)"
          Icon={FileText}
          disclosures={comprehensiveDisclosures}
          total={9}
          color="blue"
        />
      </div>

      {/* Status & Performance Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative text-center py-6 px-5">
            <TrendingUp className="w-6 h-6 text-[#86b027] mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-4xl font-extralight text-slate-900 mb-2">{Math.round((allDisclosures.filter(d => d.status === 'completed').length / allDisclosures.length) * 100) || 0}%</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Performance</p>
          </div>
        </div>
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative text-center py-6 px-5">
            <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-4xl font-extralight text-slate-900 mb-2">{allDisclosures.filter(d => d.status === 'completed').length}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Completed</p>
          </div>
        </div>
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative text-center py-6 px-5">
            <Clock className="w-6 h-6 text-amber-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-4xl font-extralight text-slate-900 mb-2">{allDisclosures.filter(d => d.status === 'in_progress').length}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">In Progress</p>
          </div>
        </div>
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative text-center py-6 px-5">
            <AlertCircle className="w-6 h-6 text-rose-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-4xl font-extralight text-slate-900 mb-2">{allDisclosures.filter(d => d.status === 'not_started').length}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Not Started</p>
          </div>
        </div>
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-400/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative text-center py-6 px-5">
            <XCircle className="w-6 h-6 text-slate-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-4xl font-extralight text-slate-900 mb-2">{allDisclosures.filter(d => d.status === 'not_applicable').length}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">N/A</p>
          </div>
        </div>
      </div>

      {/* Category Scorecards */}
      <div>
        <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-4">Progress by Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { key: 'general', icon: Building2, color: 'blue' },
            { key: 'environmental', icon: Leaf, color: 'green' },
            { key: 'social', icon: Users, color: 'amber' },
            { key: 'governance', icon: FileText, color: 'slate' }
          ].map(({ key, icon, color }) => {
            const categoryDisclosures = allDisclosures.filter(d => d.disclosure_category === key);
            return (
              <VSMEScorecard
                key={key}
                title={key.charAt(0).toUpperCase() + key.slice(1)}
                Icon={icon}
                disclosures={categoryDisclosures}
                total={categoryDisclosures.length}
                color={color}
              />
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative p-6">
          <h3 className="text-xl font-extralight text-slate-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            className="bg-[#86b027] hover:bg-[#769c22] justify-start h-auto py-4"
            onClick={() => setActiveTab('basic')}
          >
            <div className="text-left">
              <div className="font-bold">Start Basic Module</div>
              <div className="text-xs opacity-90">11 mandatory disclosures</div>
            </div>
          </Button>
          <Button 
            variant="outline"
            className="border-[#02a1e8] text-[#02a1e8] hover:bg-[#02a1e8]/10 justify-start h-auto py-4"
            onClick={() => setActiveTab('gap-analysis')}
          >
            <div className="text-left">
              <div className="font-bold">Run Gap Analysis</div>
              <div className="text-xs opacity-70">Identify missing data</div>
            </div>
          </Button>
          <Button 
            variant="outline"
            className="justify-start h-auto py-4"
            onClick={() => setActiveTab('reports')}
          >
            <div className="text-left">
              <div className="font-light">Generate Report</div>
              <div className="text-xs opacity-70">Export VSME compliant report</div>
            </div>
          </Button>
          </div>
        </div>
      </div>

      {/* VSME Info */}
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#02a1e8]/5 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#02a1e8]/20 to-[#02a1e8]/5 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-[0_4px_16px_rgba(2,161,232,0.15)]">
              <TrendingUp className="w-6 h-6 text-[#02a1e8]" />
            </div>
            <div>
              <h3 className="font-light text-slate-900 mb-2 text-lg">Why VSME?</h3>
              <ul className="text-sm text-slate-600 font-light space-y-1">
                <li>• Meet data requests from larger businesses & financial institutions</li>
                <li>• Gain access to financing with aligned ESG reporting</li>
                <li>• Improve sustainability management & operational efficiency</li>
                <li>• Enhance transparency & stakeholder trust</li>
                <li>• Prepare for potential future mandatory reporting</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}