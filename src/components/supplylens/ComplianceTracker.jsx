import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Clock, AlertTriangle, FileText, Leaf, Database } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ComplianceTracker({ supplier }) {
  // Fetch relevant compliance data
  const { data: onboardingTasks = [] } = useQuery({
    queryKey: ['onboarding-tasks', supplier.id],
    queryFn: () => base44.entities.OnboardingTask.filter({ supplier_id: supplier.id })
  });

  const { data: pfasAssessments = [] } = useQuery({
    queryKey: ['pfas-assessments'],
    queryFn: () => base44.entities.PFASAssessment.list()
  });

  const { data: eudrSubmissions = [] } = useQuery({
    queryKey: ['eudr-submissions'],
    queryFn: () => base44.entities.EUDRSupplierSubmission.list()
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ['supplier-sku-mappings'],
    queryFn: () => base44.entities.SupplierSKUMapping.list()
  });

  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  // Calculate compliance status for each framework

  // DPP Compliance (based on mapping completeness + data quality)
  const supplierMappings = mappings.filter(m => m.supplier_id === supplier.id);
  const dppCompliant = supplierMappings.length > 0 && 
    supplierMappings.every(m => m.unit_price && m.lead_time_days);
  const dppProgress = supplierMappings.length > 0 
    ? Math.round((supplierMappings.filter(m => m.unit_price && m.lead_time_days).length / supplierMappings.length) * 100)
    : 0;

  // EUDR Compliance (based on submissions + questionnaires)
  const eudrTasks = onboardingTasks.filter(t => 
    t.questionnaire_type === 'eudr' || t.verification_type === 'deforestation_satellite'
  );
  const eudrCompleted = eudrTasks.filter(t => t.status === 'completed').length;
  const eudrCompliant = supplier.eudr_relevant ? 
    (eudrTasks.length > 0 && eudrCompleted === eudrTasks.length) : null;
  const eudrProgress = eudrTasks.length > 0 
    ? Math.round((eudrCompleted / eudrTasks.length) * 100)
    : 0;

  // CSRD/PFAS Compliance (based on PFAS tasks + assessments)
  const pfasTasks = onboardingTasks.filter(t => 
    t.questionnaire_type === 'pfas' || t.verification_type === 'pfas_database'
  );
  const pfasCompleted = pfasTasks.filter(t => t.status === 'completed').length;
  const pfasCompliant = supplier.pfas_relevant ? 
    (pfasTasks.length > 0 && pfasCompleted === pfasTasks.length) : null;
  const pfasProgress = pfasTasks.length > 0 
    ? Math.round((pfasCompleted / pfasTasks.length) * 100)
    : 0;

  // CBAM Compliance
  const cbamCompliant = supplier.cbam_relevant ? 
    onboardingTasks.some(t => t.task_type === 'verification' && t.verification_type === 'emissions_registry' && t.status === 'completed')
    : null;

  const frameworks = [
    {
      name: 'DPP',
      icon: Database,
      description: 'Digital Product Passport',
      status: dppCompliant ? 'compliant' : supplierMappings.length > 0 ? 'in_progress' : 'not_started',
      progress: dppProgress,
      required: true,
      details: `${supplierMappings.length} products mapped`
    },
    {
      name: 'EUDR',
      icon: Leaf,
      description: 'Deforestation Regulation',
      status: eudrCompliant === null ? 'not_applicable' : eudrCompliant ? 'compliant' : eudrTasks.length > 0 ? 'in_progress' : 'not_started',
      progress: eudrProgress,
      required: supplier.eudr_relevant,
      details: `${eudrCompleted}/${eudrTasks.length} checks completed`
    },
    {
      name: 'CSRD/PFAS',
      icon: AlertTriangle,
      description: 'Substance Disclosure',
      status: pfasCompliant === null ? 'not_applicable' : pfasCompliant ? 'compliant' : pfasTasks.length > 0 ? 'in_progress' : 'not_started',
      progress: pfasProgress,
      required: supplier.pfas_relevant,
      details: `${pfasCompleted}/${pfasTasks.length} assessments done`
    },
    {
      name: 'CBAM',
      icon: FileText,
      description: 'Carbon Border Adjustment',
      status: cbamCompliant === null ? 'not_applicable' : cbamCompliant ? 'compliant' : 'not_started',
      progress: cbamCompliant ? 100 : 0,
      required: supplier.cbam_relevant,
      details: cbamCompliant ? 'Emissions verified' : 'Pending verification'
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'compliant': return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'in_progress': return <Clock className="w-5 h-5 text-amber-600" />;
      case 'not_started': return <XCircle className="w-5 h-5 text-rose-600" />;
      default: return <AlertTriangle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'compliant': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'in_progress': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'not_started': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'compliant': return 'Compliant';
      case 'in_progress': return 'In Progress';
      case 'not_started': return 'Not Started';
      default: return 'N/A';
    }
  };

  return (
    <Card className="border-slate-100 shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="text-lg font-bold text-[#545454] flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#02a1e8]" />
          Regulatory Compliance Status
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {frameworks.map((framework) => (
          <div 
            key={framework.name}
            className={cn(
              "p-4 rounded-xl border transition-all",
              framework.status === 'compliant' ? 'border-emerald-200 bg-emerald-50/30' :
              framework.status === 'in_progress' ? 'border-amber-200 bg-amber-50/30' :
              framework.status === 'not_started' ? 'border-rose-200 bg-rose-50/30' :
              'border-slate-200 bg-slate-50/30'
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  framework.status === 'compliant' ? 'bg-emerald-100' :
                  framework.status === 'in_progress' ? 'bg-amber-100' :
                  framework.status === 'not_started' ? 'bg-rose-100' :
                  'bg-slate-100'
                )}>
                  <framework.icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-[#545454]">{framework.name}</h4>
                    {framework.required && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">Required</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{framework.description}</p>
                  <p className="text-xs text-slate-600 mt-1">{framework.details}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {getStatusIcon(framework.status)}
                <Badge className={cn("text-xs", getStatusBadge(framework.status))}>
                  {getStatusLabel(framework.status)}
                </Badge>
              </div>
            </div>
            {framework.status === 'in_progress' && (
              <Progress value={framework.progress} className="h-2" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}