import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import PPWRRecyclabilityGrading from './PPWRRecyclabilityGrading';
import PPWREmptySpaceCalculator from './PPWREmptySpaceCalculator';
import PPWRPCRTracking from './PPWRPCRTracking';
import PPWRPlasticTaxDashboard from './PPWRPlasticTaxDashboard';
import PPWRComponentBreakdown from './PPWRComponentBreakdown';
import PPWRMaterialFlowAnalysis from './PPWRMaterialFlowAnalysis';
import PPWRReuseTracking from './PPWRReuseTracking';
import PPWRMassBalanceVerifier from './PPWRMassBalanceVerifier';
import PPWRCircularityDashboard from './PPWRCircularityDashboard';

const FEATURES = [
  { id: 'recyclability', title: 'Recyclability Performance Grading', component: PPWRRecyclabilityGrading },
  { id: 'empty_space', title: 'Empty Space Ratio Calculation', component: PPWREmptySpaceCalculator },
  { id: 'pcr', title: 'PCR Content Tracking', component: PPWRPCRTracking },
  { id: 'mass_balance', title: 'Mass Balance Verification', component: PPWRMassBalanceVerifier },
  { id: 'plastic_tax', title: 'Plastic Tax Calculation', component: PPWRPlasticTaxDashboard },
  { id: 'component', title: 'Packaging Component Breakdown', component: PPWRComponentBreakdown },
  { id: 'flow', title: 'Material Flow Analysis', component: PPWRMaterialFlowAnalysis },
  { id: 'circularity', title: 'Circular Economy Scoring', component: PPWRCircularityDashboard },
  { id: 'reuse', title: 'Reuse System Tracking', component: PPWRReuseTracking }
];

export default function PPWRAdvancedFeatures() {
  const [activeFeature, setActiveFeature] = useState('recyclability');

  const ActiveComponent = FEATURES.find(f => f.id === activeFeature)?.component;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {FEATURES.map((feature) => (
          <button
            key={feature.id}
            onClick={() => setActiveFeature(feature.id)}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              activeFeature === feature.id
                ? 'border-emerald-400 bg-emerald-50 shadow-lg'
                : 'border-slate-200 bg-white hover:border-emerald-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${
                activeFeature === feature.id ? 'bg-emerald-600' : 'bg-slate-100'
              }`}>
                <Sparkles className={`w-5 h-5 ${
                  activeFeature === feature.id ? 'text-white' : 'text-slate-400'
                }`} />
              </div>
              <div className="text-sm font-bold text-slate-900">
                {feature.title}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="min-h-[500px]">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}