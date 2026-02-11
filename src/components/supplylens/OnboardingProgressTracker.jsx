import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, Shield, Leaf, Package, FlaskConical, 
  CheckCircle, Clock, AlertTriangle 
} from "lucide-react";
import { cn } from "@/lib/utils";

const complianceModules = [
  { id: 'CBAM', label: 'CBAM', icon: Shield, color: 'text-blue-600 bg-blue-50' },
  { id: 'PFAS', label: 'PFAS', icon: FlaskConical, color: 'text-purple-600 bg-purple-50' },
  { id: 'EUDR', label: 'EUDR', icon: Leaf, color: 'text-green-600 bg-green-50' },
  { id: 'PPWR', label: 'PPWR', icon: Package, color: 'text-amber-600 bg-amber-50' }
];

export default function OnboardingProgressTracker({ suppliers, tasks }) {
  // Calculate overall progress
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'verified').length;
  const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Calculate compliance-specific progress
  const complianceProgress = complianceModules.map(module => {
    const moduleTasks = tasks.filter(t => t.compliance_module === module.id);
    const completed = moduleTasks.filter(t => t.status === 'completed' || t.status === 'verified').length;
    return {
      ...module,
      total: moduleTasks.length,
      completed,
      progress: moduleTasks.length > 0 ? (completed / moduleTasks.length) * 100 : 0
    };
  }).filter(m => m.total > 0);

  // Calculate supplier-level progress
  const supplierStats = suppliers.map(supplier => {
    const supplierTasks = tasks.filter(t => t.supplier_id === supplier.id);
    const completed = supplierTasks.filter(t => t.status === 'completed' || t.status === 'verified').length;
    const overdue = supplierTasks.filter(t => 
      t.status !== 'completed' && new Date(t.due_date) < new Date()
    ).length;
    
    return {
      supplier,
      total: supplierTasks.length,
      completed,
      overdue,
      progress: supplierTasks.length > 0 ? (completed / supplierTasks.length) * 100 : 0,
      status: overdue > 0 ? 'at-risk' : completed === supplierTasks.length ? 'completed' : 'on-track'
    };
  }).filter(s => s.total > 0);

  const atRiskSuppliers = supplierStats.filter(s => s.status === 'at-risk').length;
  const completedSuppliers = supplierStats.filter(s => s.status === 'completed').length;
  const onTrackSuppliers = supplierStats.filter(s => s.status === 'on-track').length;

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#86b027]" />
            Overall Onboarding Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">All Tasks</span>
                <span className="text-sm font-semibold text-slate-900">{completedTasks}/{totalTasks}</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-900">Completed</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">{completedSuppliers}</p>
              </div>

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-900">On Track</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{onTrackSuppliers}</p>
              </div>

              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-medium text-rose-900">At Risk</span>
                </div>
                <p className="text-2xl font-bold text-rose-600">{atRiskSuppliers}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Module Progress */}
      {complianceProgress.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Compliance Module Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {complianceProgress.map(module => {
                const Icon = module.icon;
                return (
                  <div key={module.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", module.color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{module.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">
                        {module.completed}/{module.total}
                      </span>
                    </div>
                    <Progress value={module.progress} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supplier-Level Progress */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Supplier-Level Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {supplierStats.map(stat => (
              <div 
                key={stat.supplier.id}
                className={cn(
                  "p-3 rounded-lg border",
                  stat.status === 'completed' ? "border-emerald-200 bg-emerald-50/30" :
                  stat.status === 'at-risk' ? "border-rose-200 bg-rose-50/30" :
                  "border-slate-200 bg-white"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">
                      {stat.supplier.legal_name}
                    </span>
                    <Badge 
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        stat.status === 'completed' ? "bg-emerald-100 text-emerald-700" :
                        stat.status === 'at-risk' ? "bg-rose-100 text-rose-700" :
                        "bg-blue-100 text-blue-700"
                      )}
                    >
                      {stat.status === 'completed' ? 'Complete' :
                       stat.status === 'at-risk' ? `${stat.overdue} Overdue` :
                       'On Track'}
                    </Badge>
                  </div>
                  <span className="text-xs text-slate-500">
                    {stat.completed}/{stat.total} tasks
                  </span>
                </div>
                <Progress value={stat.progress} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}