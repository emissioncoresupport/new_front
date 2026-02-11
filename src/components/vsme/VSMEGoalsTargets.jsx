import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, Leaf, Users, Building2, AlertCircle } from "lucide-react";

const VSME_GOALS = [
  {
    category: 'environmental',
    icon: Leaf,
    color: 'text-[#86b027]',
    bg: 'bg-[#86b027]/10',
    goals: [
      {
        code: 'ENV-1',
        title: 'Carbon Emission Reduction',
        target: 'Reduce Scope 1+2 emissions by 20% by 2030',
        baseline: '2020 baseline',
        alignment: 'Paris Agreement, ESRS E1',
        progress: 0
      },
      {
        code: 'ENV-2',
        title: 'Renewable Energy',
        target: '50% renewable energy consumption by 2027',
        baseline: 'Current: 15%',
        alignment: 'EU Renewable Energy Directive',
        progress: 30
      },
      {
        code: 'ENV-3',
        title: 'Water Efficiency',
        target: '25% reduction in water intensity',
        baseline: 'Per unit of revenue',
        alignment: 'ESRS E3',
        progress: 0
      },
      {
        code: 'ENV-4',
        title: 'Circular Economy',
        target: '80% waste recycling rate by 2028',
        baseline: 'Current: 45%',
        alignment: 'EU Circular Economy Action Plan',
        progress: 56
      }
    ]
  },
  {
    category: 'social',
    icon: Users,
    color: 'text-[#02a1e8]',
    bg: 'bg-[#02a1e8]/10',
    goals: [
      {
        code: 'SOC-1',
        title: 'Gender Equality',
        target: '40% women in management by 2027',
        baseline: 'Current: 28%',
        alignment: 'ESRS S1, UN SDG 5',
        progress: 70
      },
      {
        code: 'SOC-2',
        title: 'Living Wage',
        target: '100% employees earning living wage',
        baseline: 'Above minimum wage',
        alignment: 'ESRS S1, GRI 202',
        progress: 100
      },
      {
        code: 'SOC-3',
        title: 'Health & Safety',
        target: 'Zero work-related fatalities',
        baseline: 'Continuous target',
        alignment: 'ESRS S1, ISO 45001',
        progress: 100
      },
      {
        code: 'SOC-4',
        title: 'Training & Development',
        target: '40 hours training per employee annually',
        baseline: 'Current: 22 hours',
        alignment: 'ESRS S1',
        progress: 55
      }
    ]
  },
  {
    category: 'governance',
    icon: Building2,
    color: 'text-slate-700',
    bg: 'bg-slate-100',
    goals: [
      {
        code: 'GOV-1',
        title: 'Board Diversity',
        target: '30% diverse board members by 2026',
        baseline: 'Gender, age, expertise',
        alignment: 'ESRS G1, EU Corporate Governance',
        progress: 0
      },
      {
        code: 'GOV-2',
        title: 'Anti-Corruption',
        target: '100% employees trained on ethics',
        baseline: 'Annual training',
        alignment: 'ESRS G1, UN Global Compact',
        progress: 85
      },
      {
        code: 'GOV-3',
        title: 'Transparency',
        target: 'Annual sustainability report (VSME)',
        baseline: 'EFRAG VSME Standard',
        alignment: 'VSME, ESRS alignment',
        progress: 60
      }
    ]
  }
];

export default function VSMEGoalsTargets({ disclosures = [] }) {
  const [calculatedGoals, setCalculatedGoals] = useState(VSME_GOALS);

  useEffect(() => {
    // Calculate actual progress based on disclosure data
    const updatedGoals = VSME_GOALS.map(category => ({
      ...category,
      goals: category.goals.map(goal => {
        let progress = goal.progress;

        // Calculate progress based on actual disclosure data
        if (goal.code === 'ENV-1') {
          const b3 = disclosures.find(d => d.disclosure_code === 'B3');
          if (b3?.data_points?.scope1_emissions_tco2e && b3?.data_points?.scope2_emissions_tco2e) {
            progress = 15; // Has baseline data
          }
        } else if (goal.code === 'ENV-2') {
          const b3 = disclosures.find(d => d.disclosure_code === 'B3');
          if (b3?.data_points?.energy_consumption_kwh) {
            progress = 30;
          }
        } else if (goal.code === 'ENV-4') {
          const b7 = disclosures.find(d => d.disclosure_code === 'B7');
          if (b7?.data_points?.waste_recycled_percent) {
            progress = b7.data_points.waste_recycled_percent > 0 ? 
              (b7.data_points.waste_recycled_percent / 80) * 100 : 0;
          }
        } else if (goal.code === 'SOC-1') {
          const b8 = disclosures.find(d => d.disclosure_code === 'B8');
          if (b8?.data_points?.female_employees && b8?.data_points?.total_employees) {
            const femalePercent = (b8.data_points.female_employees / b8.data_points.total_employees) * 100;
            progress = (femalePercent / 40) * 100;
          }
        } else if (goal.code === 'SOC-3') {
          const b9 = disclosures.find(d => d.disclosure_code === 'B9');
          if (b9?.data_points?.fatalities === 0) {
            progress = 100;
          }
        } else if (goal.code === 'GOV-2') {
          const b11 = disclosures.find(d => d.disclosure_code === 'B11');
          if (b11?.status === 'completed') {
            progress = 85;
          }
        } else if (goal.code === 'GOV-3') {
          const completedDisclosures = disclosures.filter(d => d.status === 'completed').length;
          const totalDisclosures = disclosures.length;
          progress = totalDisclosures > 0 ? (completedDisclosures / totalDisclosures) * 100 : 0;
        }

        return { ...goal, progress: Math.min(100, Math.round(progress)) };
      })
    }));

    setCalculatedGoals(updatedGoals);
  }, [disclosures]);
  return (
    <div className="space-y-6">
      <Card className="bg-white/90 backdrop-blur-sm shadow-xl border border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-[#86b027]/10 to-[#86b027]/5 rounded-xl">
              <Target className="w-6 h-6 text-[#86b027]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#545454]">VSME Goals & Targets</h3>
              <p className="text-sm text-slate-600">Aligned with European standards (ESRS, SFDR, Paris Agreement)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {calculatedGoals.map(({ category, icon: Icon, color, bg, goals }) => (
        <Card key={category} className="bg-white/90 backdrop-blur-sm shadow-lg border border-slate-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className={`p-2 ${bg} rounded-lg`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <span className="capitalize">{category} Goals</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.map((goal) => (
              <Card key={goal.code} className="bg-gradient-to-r from-slate-50/50 to-white border border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${bg} ${color}`}>{goal.code}</Badge>
                        <h4 className="font-bold text-[#545454]">{goal.title}</h4>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">{goal.target}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline">{goal.baseline}</Badge>
                        <Badge variant="outline" className="text-[#02a1e8]">{goal.alignment}</Badge>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-[#86b027]">{goal.progress}%</p>
                      <p className="text-xs text-slate-500">Progress</p>
                    </div>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* European Standards Reference */}
      <Card className="bg-gradient-to-br from-blue-50/50 to-white/90 backdrop-blur-sm shadow-lg border-2 border-[#02a1e8]/20">
        <CardContent className="p-6">
          <h4 className="font-bold text-[#545454] mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#02a1e8]" />
            Alignment with European Standards
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-white/80 rounded-lg border border-slate-200">
              <p className="font-bold text-[#02a1e8] mb-1">ESRS</p>
              <p className="text-xs text-slate-600">European Sustainability Reporting Standards</p>
            </div>
            <div className="p-3 bg-white/80 rounded-lg border border-slate-200">
              <p className="font-bold text-[#02a1e8] mb-1">SFDR</p>
              <p className="text-xs text-slate-600">Sustainable Finance Disclosure Regulation</p>
            </div>
            <div className="p-3 bg-white/80 rounded-lg border border-slate-200">
              <p className="font-bold text-[#02a1e8] mb-1">Paris Agreement</p>
              <p className="text-xs text-slate-600">Climate targets and commitments</p>
            </div>
            <div className="p-3 bg-white/80 rounded-lg border border-slate-200">
              <p className="font-bold text-[#02a1e8] mb-1">EU Taxonomy</p>
              <p className="text-xs text-slate-600">Sustainable economic activities</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}