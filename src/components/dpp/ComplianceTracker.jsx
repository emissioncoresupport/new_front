import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

export default function ComplianceTracker({ dppRecords, complianceStats }) {
  const regulations = [
    { 
      name: 'ESPR',
      fullName: 'EU Ecodesign for Sustainable Products',
      compliant: complianceStats.espr_compliant,
      total: complianceStats.total,
      color: 'emerald'
    },
    { 
      name: 'REACH',
      fullName: 'Registration, Evaluation, Authorization of Chemicals',
      compliant: complianceStats.reach_compliant,
      total: complianceStats.total,
      color: 'blue'
    },
    { 
      name: 'RoHS',
      fullName: 'Restriction of Hazardous Substances',
      compliant: complianceStats.rohs_compliant,
      total: complianceStats.total,
      color: 'purple'
    }
  ];

  const getComplianceLevel = (percentage) => {
    if (percentage >= 90) return { label: 'Excellent', color: 'emerald', icon: CheckCircle2 };
    if (percentage >= 70) return { label: 'Good', color: 'blue', icon: CheckCircle2 };
    if (percentage >= 50) return { label: 'Fair', color: 'amber', icon: AlertTriangle };
    return { label: 'Needs Attention', color: 'rose', icon: XCircle };
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <p className="text-xs text-slate-500 uppercase font-bold">ESPR Compliant</p>
            </div>
            <h3 className="text-2xl font-bold text-emerald-600">{complianceStats.espr_compliant}/{complianceStats.total}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-slate-500 uppercase font-bold">REACH Compliant</p>
            </div>
            <h3 className="text-2xl font-bold text-blue-600">{complianceStats.reach_compliant}/{complianceStats.total}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-slate-500 uppercase font-bold">RoHS Compliant</p>
            </div>
            <h3 className="text-2xl font-bold text-purple-600">{complianceStats.rohs_compliant}/{complianceStats.total}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <p className="text-xs text-slate-500 uppercase font-bold">Pending Review</p>
            </div>
            <h3 className="text-2xl font-bold text-amber-600">{complianceStats.pending}</h3>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Regulation Compliance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {regulations.map((reg, idx) => {
              const percentage = reg.total > 0 ? Math.round((reg.compliant / reg.total) * 100) : 0;
              const level = getComplianceLevel(percentage);
              const Icon = level.icon;
              
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900">{reg.name}</h4>
                      <p className="text-xs text-slate-500">{reg.fullName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-600">
                        {reg.compliant} / {reg.total}
                      </span>
                      <Badge variant="outline" className={`bg-${level.color}-50 text-${level.color}-700 border-${level.color}-200`}>
                        <Icon className="w-3 h-3 mr-1" />
                        {level.label}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <p className="text-xs text-right text-slate-500">{percentage}% compliant</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product-Level Compliance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dppRecords.slice(0, 10).map((dpp, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                <div className="flex-1">
                  <h5 className="font-medium text-sm">{dpp.general_info?.product_name || 'Product'}</h5>
                  <p className="text-xs text-slate-500">{dpp.category || 'N/A'}</p>
                </div>
                <div className="flex gap-2">
                  {['ESPR', 'REACH', 'RoHS'].map(reg => {
                    const isCompliant = dpp.compliance_declarations?.some(c => 
                      c.regulation === reg && c.status === 'Compliant'
                    );
                    return (
                      <Badge 
                        key={reg} 
                        variant={isCompliant ? 'default' : 'outline'}
                        className={`text-xs ${isCompliant ? 'bg-emerald-600' : 'text-slate-400'}`}
                      >
                        {reg}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}