import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, Clock, TrendingUp, Award } from "lucide-react";
import { cn } from "@/lib/utils";

export function calculateSupplierScore(supplier, tasks, mappings, evidenceDocs) {
  const scores = {
    dataCompleteness: 0,
    onboardingProgress: 0,
    mappingQuality: 0,
    complianceDocuments: 0,
    responseTime: 0
  };

  // 1. Data Completeness (30 points)
  const requiredFields = ['legal_name', 'country', 'city', 'address', 'vat_number', 'website', 'nace_code', 'tier'];
  const filledFields = requiredFields.filter(f => supplier[f] && supplier[f] !== 'unknown').length;
  scores.dataCompleteness = Math.round((filledFields / requiredFields.length) * 30);

  // 2. Onboarding Progress (25 points)
  const supplierTasks = tasks.filter(t => t.supplier_id === supplier.id);
  if (supplierTasks.length > 0) {
    const completedTasks = supplierTasks.filter(t => t.status === 'completed').length;
    scores.onboardingProgress = Math.round((completedTasks / supplierTasks.length) * 25);
  }

  // 3. Mapping Quality (20 points)
  const supplierMappings = mappings.filter(m => m.supplier_id === supplier.id);
  if (supplierMappings.length > 0) {
    const completeData = supplierMappings.filter(m => 
      m.unit_price && m.lead_time_days && m.annual_volume
    ).length;
    scores.mappingQuality = Math.round((completeData / supplierMappings.length) * 20);
  }

  // 4. Compliance Documents (15 points)
  const supplierDocs = evidenceDocs.filter(d => d.supplier_id === supplier.id);
  const verifiedDocs = supplierDocs.filter(d => d.validation_status === 'verified').length;
  if (supplierDocs.length > 0) {
    scores.complianceDocuments = Math.round((verifiedDocs / supplierDocs.length) * 15);
  } else if (supplierDocs.length === 0 && supplierTasks.length > 0) {
    scores.complianceDocuments = 0; // Expected but missing
  } else {
    scores.complianceDocuments = 5; // Neutral if not yet requested
  }

  // 5. Response Time (10 points)
  const overdueCount = supplierTasks.filter(t => 
    t.status !== 'completed' && new Date(t.due_date) < new Date()
  ).length;
  const avgResponseTime = supplierTasks.filter(t => t.completed_date && t.sent_date).length;
  if (overdueCount > 3) {
    scores.responseTime = 0;
  } else if (overdueCount > 0) {
    scores.responseTime = 5;
  } else {
    scores.responseTime = 10;
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  
  let rating = 'poor';
  if (totalScore >= 90) rating = 'excellent';
  else if (totalScore >= 75) rating = 'good';
  else if (totalScore >= 50) rating = 'fair';

  return {
    totalScore,
    rating,
    breakdown: scores
  };
}

export default function SupplierScoringCard({ supplier, tasks, mappings, evidenceDocs }) {
  const score = calculateSupplierScore(supplier, tasks, mappings, evidenceDocs);

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'excellent': return 'text-emerald-700 bg-emerald-100 border-emerald-200';
      case 'good': return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'fair': return 'text-amber-700 bg-amber-100 border-amber-200';
      default: return 'text-rose-700 bg-rose-100 border-rose-200';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-rose-600';
  };

  return (
    <Card className="border-slate-100 shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-[#545454] flex items-center gap-2">
            <Award className="w-5 h-5 text-[#86b027]" />
            Supplier Quality Score
          </CardTitle>
          <Badge className={cn("uppercase text-xs font-bold", getRatingColor(score.rating))}>
            {score.rating}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {/* Overall Score */}
        <div className="text-center">
          <div className={cn("text-5xl font-extrabold mb-2", getScoreColor(score.totalScore))}>
            {score.totalScore}
          </div>
          <p className="text-sm text-slate-500 font-medium">out of 100</p>
          <Progress value={score.totalScore} className="h-3 mt-3" />
        </div>

        {/* Score Breakdown */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">Data Completeness</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={(score.breakdown.dataCompleteness / 30) * 100} className="h-2 w-20" />
              <span className="text-sm font-bold text-[#545454] w-8">{score.breakdown.dataCompleteness}/30</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">Onboarding Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={(score.breakdown.onboardingProgress / 25) * 100} className="h-2 w-20" />
              <span className="text-sm font-bold text-[#545454] w-8">{score.breakdown.onboardingProgress}/25</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">Mapping Quality</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={(score.breakdown.mappingQuality / 20) * 100} className="h-2 w-20" />
              <span className="text-sm font-bold text-[#545454] w-8">{score.breakdown.mappingQuality}/20</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">Compliance Docs</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={(score.breakdown.complianceDocuments / 15) * 100} className="h-2 w-20" />
              <span className="text-sm font-bold text-[#545454] w-8">{score.breakdown.complianceDocuments}/15</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">Response Time</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={(score.breakdown.responseTime / 10) * 100} className="h-2 w-20" />
              <span className="text-sm font-bold text-[#545454] w-8">{score.breakdown.responseTime}/10</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}