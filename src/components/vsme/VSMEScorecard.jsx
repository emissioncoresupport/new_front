import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function VSMEScorecard({ title, Icon, disclosures, total, color = 'green', onClick }) {
  const [showDetails, setShowDetails] = useState(false);
  
  const completed = disclosures.filter(d => d.status === 'completed').length;
  const inProgress = disclosures.filter(d => d.status === 'in_progress').length;
  const notStarted = disclosures.filter(d => d.status === 'not_started').length;
  const notApplicable = disclosures.filter(d => d.status === 'not_applicable').length;
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  const colorClasses = {
    green: {
      bg: 'from-[#86b027]/5 to-[#86b027]/10',
      border: 'border-[#86b027]/30 hover:border-[#86b027]/50',
      icon: 'bg-[#86b027]/10 text-[#86b027]',
      text: 'text-[#86b027]',
      shadow: 'shadow-[#86b027]/10'
    },
    blue: {
      bg: 'from-[#02a1e8]/5 to-[#02a1e8]/10',
      border: 'border-[#02a1e8]/30 hover:border-[#02a1e8]/50',
      icon: 'bg-[#02a1e8]/10 text-[#02a1e8]',
      text: 'text-[#02a1e8]',
      shadow: 'shadow-[#02a1e8]/10'
    },
    amber: {
      bg: 'from-amber-500/5 to-amber-500/10',
      border: 'border-amber-500/30 hover:border-amber-500/50',
      icon: 'bg-amber-500/10 text-amber-600',
      text: 'text-amber-600',
      shadow: 'shadow-amber-500/10'
    },
    rose: {
      bg: 'from-rose-500/5 to-rose-500/10',
      border: 'border-rose-500/30 hover:border-rose-500/50',
      icon: 'bg-rose-500/10 text-rose-600',
      text: 'text-rose-600',
      shadow: 'shadow-rose-500/10'
    },
    slate: {
      bg: 'from-slate-500/5 to-slate-500/10',
      border: 'border-slate-300 hover:border-slate-400',
      icon: 'bg-slate-100 text-slate-600',
      text: 'text-slate-600',
      shadow: 'shadow-slate-500/10'
    }
  };

  const colors = colorClasses[color] || colorClasses.slate;

  return (
    <>
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-2 bg-gradient-to-br",
          colors.bg,
          colors.border,
          `shadow-lg ${colors.shadow}`
        )}
        onClick={() => setShowDetails(true)}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={cn("p-3 rounded-xl", colors.icon)}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className={cn("text-3xl font-bold", colors.text)}>{completed}</p>
              <p className="text-xs text-slate-500">/ {total}</p>
            </div>
          </div>
          <h3 className="font-bold text-[#545454] mb-3 text-sm">{title}</h3>
          <Progress value={percentage} className="h-2 mb-3" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">{Math.round(percentage)}% Complete</span>
            {inProgress > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {inProgress} in progress
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="w-5 h-5" />
              {title} - Detailed Status
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-[#86b027]/10 p-3 rounded-lg text-center">
                <CheckCircle className="w-5 h-5 text-[#86b027] mx-auto mb-1" />
                <p className="text-xl font-bold text-[#86b027]">{completed}</p>
                <p className="text-xs text-slate-600">Completed</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-blue-600">{inProgress}</p>
                <p className="text-xs text-slate-600">In Progress</p>
              </div>
              <div className="bg-rose-50 p-3 rounded-lg text-center">
                <AlertCircle className="w-5 h-5 text-rose-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-rose-600">{notStarted}</p>
                <p className="text-xs text-slate-600">Not Started</p>
              </div>
              <div className="bg-slate-100 p-3 rounded-lg text-center">
                <XCircle className="w-5 h-5 text-slate-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-slate-600">{notApplicable}</p>
                <p className="text-xs text-slate-600">N/A</p>
              </div>
            </div>

            {/* Disclosure List */}
            <div className="space-y-2">
              <h4 className="font-bold text-[#545454] text-sm">Disclosures</h4>
              {disclosures.length > 0 ? (
                disclosures.map(disc => (
                  <div key={disc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3 flex-1">
                      <Badge className="bg-[#86b027]">{disc.disclosure_code}</Badge>
                      <span className="font-medium text-sm text-[#545454] flex-1">
                        {disc.disclosure_title}
                      </span>
                    </div>
                    <Badge className={
                      disc.status === 'completed' ? 'bg-[#86b027]/10 text-[#86b027]' :
                      disc.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      disc.status === 'not_applicable' ? 'bg-slate-100 text-slate-600' :
                      'bg-rose-100 text-rose-700'
                    }>
                      {disc.status === 'not_applicable' ? 'N/A' : disc.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No disclosures available</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}