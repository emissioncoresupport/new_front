import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Factory, BarChart3, FileText, Database, Cloud, Target, RefreshCw } from "lucide-react";
import CCFDashboard from '@/components/ccf/CCFDashboard';
import CCFDataEntry from '@/components/ccf/CCFDataEntry';
import Scope3Manager from '@/components/ccf/Scope3Manager';
import GHGReports from '@/components/ccf/GHGReports';
import ScenarioPlanner from '@/components/ccf/ScenarioPlanner';
import FacilityManager from '@/components/ccf/FacilityManager';
import EmissionFactorHub from '@/components/ccf/EmissionFactorHub';
import CCFEvidenceVault from '@/components/ccf/CCFEvidenceVault';
import TaskManager from '@/components/ccf/TaskManager';
import SustainabilityGoals from '@/components/ccf/SustainabilityGoals';

export default function CCF() {
    const [year, setYear] = useState(new Date().getFullYear());

    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/30 to-white p-6 md:p-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest font-light mb-2">
              <Factory className="w-3.5 h-3.5" />
              Corporate Carbon Footprint
            </div>
            <h1 className="text-4xl font-light text-slate-900 tracking-tight">CCF Management</h1>
            <p className="text-slate-500 font-light mt-1">Monitor organization-wide GHG emissions across Scope 1, 2, and 3.</p>
          </div>
          <div className="flex items-center bg-white/50 backdrop-blur-sm rounded-lg border border-slate-200 p-1 shadow-sm">
            {[2023, 2024, 2025].map(y => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-4 py-2 text-sm rounded-md transition-colors font-light ${year === y ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'}`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="relative bg-white/50 backdrop-blur-sm rounded-lg border border-slate-200/60 shadow-sm overflow-hidden">
            <Tabs defaultValue="dashboard" className="space-y-0">
                <TabsList className="bg-white/50 backdrop-blur-md border-b border-slate-200/60 rounded-none h-auto p-0 w-full justify-start">
                    <TabsTrigger 
                        value="dashboard"
                        className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
                    >
                        <span className="relative z-10">Dashboard</span>
                    </TabsTrigger>
                    <TabsTrigger 
                        value="data"
                        className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
                    >
                        <span className="relative z-10">Activity Data</span>
                    </TabsTrigger>
                    <TabsTrigger 
                        value="factors"
                        className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
                    >
                        <span className="relative z-10">Factors</span>
                    </TabsTrigger>
                    <TabsTrigger 
                        value="facilities"
                        className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
                    >
                        <span className="relative z-10">Facilities</span>
                    </TabsTrigger>
                    <TabsTrigger 
                        value="scope3"
                        className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
                    >
                        <span className="relative z-10">Scope 3</span>
                    </TabsTrigger>
                    <TabsTrigger 
                        value="reports"
                        className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
                    >
                        <span className="relative z-10">Reports</span>
                    </TabsTrigger>
                    <TabsTrigger 
                        value="goals"
                        className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
                    >
                        <span className="relative z-10">Goals</span>
                    </TabsTrigger>
                    <TabsTrigger 
                        value="scenarios"
                        className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
                    >
                        <span className="relative z-10">Scenarios</span>
                    </TabsTrigger>
                    <TabsTrigger 
                        value="vault"
                          className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
                      >
                          <span className="relative z-10">Evidence</span>
                      </TabsTrigger>
                      <TabsTrigger 
                          value="tasks"
                          className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
                      >
                          <span className="relative z-10">Tasks</span>
                      </TabsTrigger>
                    </TabsList>

                <TabsContent value="dashboard" className="mt-0 p-6">
                    <CCFDashboard year={year} onYearChange={setYear} />
                </TabsContent>

                <TabsContent value="data" className="mt-0 p-6">
                    <CCFDataEntry />
                </TabsContent>

                <TabsContent value="factors" className="mt-0 p-6">
                    <EmissionFactorHub />
                </TabsContent>

                <TabsContent value="scope3" className="mt-0 p-6">
                    <Scope3Manager />
                </TabsContent>

                <TabsContent value="facilities" className="mt-0 p-6">
                    <FacilityManager />
                </TabsContent>

                <TabsContent value="reports" className="mt-0 p-6">
                    <GHGReports />
                </TabsContent>

                <TabsContent value="goals" className="mt-0 p-6">
                    <SustainabilityGoals />
                </TabsContent>

                <TabsContent value="scenarios" className="mt-0 p-6">
                    <ScenarioPlanner />
                </TabsContent>

                <TabsContent value="vault" className="mt-0 p-6">
                    <CCFEvidenceVault />
                </TabsContent>

                <TabsContent value="tasks" className="mt-0 p-6">
                    <TaskManager />
                </TabsContent>
              </Tabs>
              </div>
            </div>
        </div>
    );
}