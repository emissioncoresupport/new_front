import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Target, TrendingUp } from "lucide-react";

const PHASES = [
  {
    phase: 1,
    title: 'Packaging Audit',
    timeline: 'Week 1-2',
    status: 'in_progress',
    tasks: [
      'Complete inventory and baseline assessment',
      'Material breakdown',
      'Current recyclability scores',
      'EPR cost baseline'
    ]
  },
  {
    phase: 2,
    title: 'Gap Analysis',
    timeline: 'Week 3-4',
    status: 'pending',
    tasks: [
      'Identify non-compliant packaging and prioritize actions',
      'Compliance gap report',
      'Risk assessment',
      'Cost-benefit analysis',
      'Action priority matrix'
    ]
  },
  {
    phase: 3,
    title: 'Optimization Projects',
    timeline: 'Week 5-12',
    status: 'pending',
    tasks: [
      'Implement redesigns and source recycled materials',
      'Redesigned packages',
      'PCR supplier contracts',
      'Recyclability improvements',
      'Material reductions'
    ]
  },
  {
    phase: 4,
    title: 'Ongoing Monitoring',
    timeline: 'Continuous',
    status: 'pending',
    tasks: [
      'Track performance and maintain compliance',
      'Quarterly reports',
      'EPR submissions',
      'Target tracking',
      'New product reviews'
    ]
  }
];

export default function PPWRImplementationRoadmap() {
  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-600" />
          Implementation Roadmap
        </CardTitle>
        <p className="text-sm text-slate-600">4-phase compliance implementation plan</p>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-0 left-8 h-full w-1 bg-gradient-to-b from-emerald-500 via-amber-500 to-slate-200" />

          <div className="space-y-6">
            {PHASES.map((phase, idx) => (
              <div key={phase.phase} className="relative pl-20">
                {/* Phase Number Circle */}
                <div className={`absolute left-0 top-0 w-16 h-16 rounded-full border-4 flex items-center justify-center font-black text-xl ${
                  phase.status === 'completed' ? 'bg-emerald-600 border-emerald-600 text-white' :
                  phase.status === 'in_progress' ? 'bg-white border-amber-500 text-amber-600' :
                  'bg-white border-slate-300 text-slate-400'
                }`}>
                  {phase.status === 'completed' ? (
                    <CheckCircle2 className="w-8 h-8" />
                  ) : (
                    phase.phase
                  )}
                </div>

                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-bold text-slate-900">{phase.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {phase.timeline}
                        </Badge>
                        <Badge className={
                          phase.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          phase.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }>
                          {phase.status === 'completed' ? 'Complete' :
                           phase.status === 'in_progress' ? 'In Progress' :
                           'Not Started'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    {phase.tasks.map((task, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="text-slate-400">•</span>
                        <span>{task}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}