import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, List, Plus, FileText, BarChart3, Leaf, Database } from "lucide-react";
import LCADashboard from '@/components/lca/LCADashboard';
import LCAStudyList from '@/components/lca/LCAStudyList';
import LCAStudyDetail from '@/components/lca/LCAStudyDetail';
import LCAReports from '@/components/lca/LCAReports.jsx';
import LCADataManagement from '@/components/lca/LCADataManagement';

export default function LCAPage() {
  const [view, setView] = useState('dashboard');
  const [selectedStudyId, setSelectedStudyId] = useState(null);

  const handleStudyClick = (id) => {
    setSelectedStudyId(id);
    setView('detail');
  };

  const handleBack = () => {
    setSelectedStudyId(null);
    setView('studies');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/30 to-white p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest font-light mb-2">
            <Leaf className="w-3.5 h-3.5" />
            Life Cycle Assessment
          </div>
          <h1 className="text-4xl font-light text-slate-900 tracking-tight">LCA Management</h1>
          <p className="text-slate-500 font-light mt-1">ISO 14040/14044 compliant environmental impact analysis.</p>
        </div>
        <div className="bg-white/50 backdrop-blur-sm rounded-lg border border-slate-200 p-1 shadow-sm inline-flex">
          <button
            onClick={() => setView('dashboard')}
            className={`px-4 py-2 text-sm rounded-md transition-colors font-light ${view === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setView('studies')}
            className={`px-4 py-2 text-sm rounded-md transition-colors font-light ${view === 'studies' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'}`}
          >
            Studies
          </button>
          <button
            onClick={() => setView('data')}
            className={`px-4 py-2 text-sm rounded-md transition-colors font-light ${view === 'data' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'}`}
          >
            Data
          </button>
          <button
            onClick={() => setView('reports')}
            className={`px-4 py-2 text-sm rounded-md transition-colors font-light ${view === 'reports' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'}`}
          >
            Reports
          </button>
        </div>
      </div>

      <div className="relative z-10">

        {view === 'dashboard' && <LCADashboard onStudyClick={handleStudyClick} />}
        {view === 'studies' && <LCAStudyList onStudyClick={handleStudyClick} />}
        {view === 'data' && <LCADataManagement />}
        {view === 'detail' && selectedStudyId && (
          <LCAStudyDetail studyId={selectedStudyId} onBack={handleBack} />
        )}
        {view === 'reports' && <LCAReports />}
      </div>
    </div>
  );
}