import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCode, Globe, Search, Calculator, Network, ShieldAlert } from "lucide-react";
import CBAMXMLGenerator from './CBAMXMLGenerator';
import CBAMNonEUPortal from './CBAMNonEUPortal';
import CBAMCNCodeClassifier from './CBAMCNCodeClassifier';
import CBAMEmbeddedCalculator from './CBAMEmbeddedCalculator';
import CBAMPrecursorMapper from './CBAMPrecursorMapper';
import CBAMPenaltyRiskAssessment from './CBAMPenaltyRiskAssessment';

export default function CBAMAdvancedFeatures({ selectedReportId }) {
  const [activeFeature, setActiveFeature] = useState('xml');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <button
          onClick={() => setActiveFeature('xml')}
          className={`p-6 rounded-xl border-2 transition-all ${
            activeFeature === 'xml'
              ? 'border-indigo-400 bg-indigo-50 shadow-lg'
              : 'border-slate-200 bg-white hover:border-indigo-200'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className={`p-3 rounded-full ${
              activeFeature === 'xml' ? 'bg-indigo-600' : 'bg-slate-100'
            }`}>
              <FileCode className={`w-6 h-6 ${
                activeFeature === 'xml' ? 'text-white' : 'text-slate-400'
              }`} />
            </div>
            <div className="text-sm font-bold text-slate-900">Automated XML Report</div>
          </div>
        </button>

        <button
          onClick={() => setActiveFeature('portal')}
          className={`p-6 rounded-xl border-2 transition-all ${
            activeFeature === 'portal'
              ? 'border-blue-400 bg-blue-50 shadow-lg'
              : 'border-slate-200 bg-white hover:border-blue-200'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className={`p-3 rounded-full ${
              activeFeature === 'portal' ? 'bg-blue-600' : 'bg-slate-100'
            }`}>
              <Globe className={`w-6 h-6 ${
                activeFeature === 'portal' ? 'text-white' : 'text-slate-400'
              }`} />
            </div>
            <div className="text-sm font-bold text-slate-900">Non-EU Portal</div>
          </div>
        </button>

        <button
          onClick={() => setActiveFeature('classifier')}
          className={`p-6 rounded-xl border-2 transition-all ${
            activeFeature === 'classifier'
              ? 'border-purple-400 bg-purple-50 shadow-lg'
              : 'border-slate-200 bg-white hover:border-purple-200'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className={`p-3 rounded-full ${
              activeFeature === 'classifier' ? 'bg-purple-600' : 'bg-slate-100'
            }`}>
              <Search className={`w-6 h-6 ${
                activeFeature === 'classifier' ? 'text-white' : 'text-slate-400'
              }`} />
            </div>
            <div className="text-sm font-bold text-slate-900">CN Classification</div>
          </div>
        </button>

        <button
          onClick={() => setActiveFeature('calculator')}
          className={`p-6 rounded-xl border-2 transition-all ${
            activeFeature === 'calculator'
              ? 'border-teal-400 bg-teal-50 shadow-lg'
              : 'border-slate-200 bg-white hover:border-teal-200'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className={`p-3 rounded-full ${
              activeFeature === 'calculator' ? 'bg-teal-600' : 'bg-slate-100'
            }`}>
              <Calculator className={`w-6 h-6 ${
                activeFeature === 'calculator' ? 'text-white' : 'text-slate-400'
              }`} />
            </div>
            <div className="text-sm font-bold text-slate-900">Emissions Calculator</div>
          </div>
        </button>

        <button
          onClick={() => setActiveFeature('precursor')}
          className={`p-6 rounded-xl border-2 transition-all ${
            activeFeature === 'precursor'
              ? 'border-orange-400 bg-orange-50 shadow-lg'
              : 'border-slate-200 bg-white hover:border-orange-200'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className={`p-3 rounded-full ${
              activeFeature === 'precursor' ? 'bg-orange-600' : 'bg-slate-100'
            }`}>
              <Network className={`w-6 h-6 ${
                activeFeature === 'precursor' ? 'text-white' : 'text-slate-400'
              }`} />
            </div>
            <div className="text-sm font-bold text-slate-900">Precursor Mapping</div>
          </div>
        </button>

        <button
          onClick={() => setActiveFeature('penalty')}
          className={`p-6 rounded-xl border-2 transition-all ${
            activeFeature === 'penalty'
              ? 'border-rose-400 bg-rose-50 shadow-lg'
              : 'border-slate-200 bg-white hover:border-rose-200'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className={`p-3 rounded-full ${
              activeFeature === 'penalty' ? 'bg-rose-600' : 'bg-slate-100'
            }`}>
              <ShieldAlert className={`w-6 h-6 ${
                activeFeature === 'penalty' ? 'text-white' : 'text-slate-400'
              }`} />
            </div>
            <div className="text-sm font-bold text-slate-900">Penalty Risk</div>
          </div>
        </button>
      </div>

      {/* Feature Content */}
      <div className="mt-6">
        {activeFeature === 'xml' && <CBAMXMLGenerator reportId={selectedReportId} />}
        {activeFeature === 'portal' && <CBAMNonEUPortal />}
        {activeFeature === 'classifier' && <CBAMCNCodeClassifier />}
        {activeFeature === 'calculator' && <CBAMEmbeddedCalculator />}
        {activeFeature === 'precursor' && <CBAMPrecursorMapper />}
        {activeFeature === 'penalty' && <CBAMPenaltyRiskAssessment />}
      </div>
    </div>
  );
}